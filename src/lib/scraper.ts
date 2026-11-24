import { chromium, type Browser, type BrowserContext, type Route } from "playwright";
import { RawExtractionSchema, type RawExtraction } from "@/types/tokens";
import { ExtractionError } from "./extractionError";
import { sampleDocument, type SamplerConfig } from "./pageSampler";
import { BLOCKED_RESOURCE_TYPES, isTrackerHost } from "./resourcePolicy";
import { createHostGuard, isBlockedAddress, parsePublicUrl, resolvePublicTarget, type HostGuard } from "./urlGuard";

export const EXTRACTION_BUDGET = {
  totalMs: 20_000,
  navigationMs: 10_000,
  loadMs: 3_500,
  settleMs: 900,
  maxConcurrent: 3,
} as const;

const SAMPLER_CONFIG: SamplerConfig = { maxNodes: 900, perGroup: 90, walkDepth: 7, walkFanout: 10 };
const VIEWPORT = { width: 1440, height: 900 };
const LAUNCH_ARGS = ["--disable-gpu", "--disable-dev-shm-usage", "--disable-extensions", "--mute-audio", "--no-first-run"];

const globalStore = globalThis as typeof globalThis & { __swatchBrowser?: Promise<Browser> };
let activeExtractions = 0;

function getBrowser(): Promise<Browser> {
  if (!globalStore.__swatchBrowser) {
    globalStore.__swatchBrowser = chromium
      .launch({ headless: true, args: LAUNCH_ARGS })
      .then((browser) => {
        browser.on("disconnected", () => {
          globalStore.__swatchBrowser = undefined;
        });
        return browser;
      })
      .catch((error: unknown) => {
        globalStore.__swatchBrowser = undefined;
        const detail = error instanceof Error ? error.message.split("\n")[0] : "unknown error";
        throw new ExtractionError("browser_unavailable", `Headless Chromium failed to start: ${detail}`);
      });
  }
  return globalStore.__swatchBrowser;
}

function buildUserAgent(browser: Browser): string {
  const major = browser.version().split(".")[0];
  return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36 SwatchInspector/0.1`;
}

function createRouteHandler(guard: HostGuard, onViolation: () => void) {
  return async (route: Route): Promise<void> => {
    const request = route.request();
    if (BLOCKED_RESOURCE_TYPES.has(request.resourceType())) return route.abort("blockedbyclient");

    let url: URL;
    try {
      url = new URL(request.url());
    } catch {
      return route.abort("blockedbyclient");
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") return route.abort("blockedbyclient");
    if (!request.isNavigationRequest() && isTrackerHost(url.hostname)) return route.abort("blockedbyclient");

    try {
      await guard.assertPublicHost(url.hostname);
    } catch {
      if (request.isNavigationRequest()) onViolation();
      return route.abort("blockedbyclient");
    }
    return route.continue();
  };
}

async function inspect(context: BrowserContext, target: URL, guard: HostGuard) {
  let violated = false;
  const flagViolation = () => {
    violated = true;
    void context.close().catch(() => undefined);
  };
  const blocked = () =>
    new ExtractionError("blocked_target", "The page tried to reach a private or reserved network address.");

  await context.route("**/*", createRouteHandler(guard, flagViolation));
  await context.routeWebSocket(/.*/, (socket) => void socket.close());

  const page = await context.newPage();
  page.on("dialog", (dialog) => void dialog.dismiss().catch(() => undefined));
  page.on("request", (request) => {
    if (!request.redirectedFrom()) return;
    guard.assertPublicHost(new URL(request.url()).hostname).catch(flagViolation);
  });
  page.on("response", (response) => {
    void response
      .serverAddr()
      .then((server) => {
        if (server && isBlockedAddress(server.ipAddress)) flagViolation();
      })
      .catch(() => undefined);
  });

  try {
    const response = await page.goto(target.href, {
      waitUntil: "domcontentloaded",
      timeout: EXTRACTION_BUDGET.navigationMs,
    });
    if (!response) throw new ExtractionError("navigation_failed", "The page did not return a document.");
    if (response.status() >= 400) {
      throw new ExtractionError("upstream_status", `The target responded with HTTP ${response.status()}.`);
    }

    await page.waitForLoadState("load", { timeout: EXTRACTION_BUDGET.loadMs }).catch(() => undefined);
    await page.waitForLoadState("networkidle", { timeout: EXTRACTION_BUDGET.settleMs }).catch(() => undefined);
    if (violated) throw blocked();

    const sampled = await page.evaluate(sampleDocument, SAMPLER_CONFIG);
    if (violated) throw blocked();
    return { sampled, finalUrl: page.url() };
  } catch (error) {
    if (violated) throw blocked();
    if (error instanceof ExtractionError) throw error;
    const message = error instanceof Error ? error.message : "";
    if (/timeout/i.test(message)) {
      throw new ExtractionError("timeout", "The page took too long to respond.");
    }
    throw new ExtractionError("navigation_failed", "The page could not be loaded.");
  }
}

function withDeadline<T>(work: Promise<T>, ms: number, onExpire: () => void): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      onExpire();
      reject(new ExtractionError("timeout", "Extraction exceeded its time budget."));
    }, ms);
  });
  return Promise.race([work, deadline]).finally(() => clearTimeout(timer));
}

export async function extractStyles(inputUrl: string): Promise<RawExtraction> {
  if (activeExtractions >= EXTRACTION_BUDGET.maxConcurrent) {
    throw new ExtractionError("busy", "Too many inspections are running. Try again in a moment.");
  }
  activeExtractions += 1;
  const startedAt = performance.now();
  let context: BrowserContext | undefined;

  try {
    const run = async () => {
      const guard = createHostGuard();
      await guard.assertPublicHost(parsePublicUrl(inputUrl).hostname);
      const browser = await getBrowser();
      const userAgent = buildUserAgent(browser);
      const target = await resolvePublicTarget(inputUrl, guard, userAgent);

      context = await browser.newContext({
        viewport: VIEWPORT,
        userAgent,
        locale: "en-US",
        serviceWorkers: "block",
        reducedMotion: "reduce",
        acceptDownloads: false,
      });
      const { sampled, finalUrl } = await inspect(context, target, guard);
      const { title, sampledNodes, ...samples } = sampled;

      return RawExtractionSchema.parse({
        source: {
          url: finalUrl,
          title: title || target.hostname,
          capturedAt: new Date().toISOString(),
          durationMs: Math.round(performance.now() - startedAt),
          sampledNodes,
          origin: "live",
        },
        ...samples,
      });
    };

    return await withDeadline(run(), EXTRACTION_BUDGET.totalMs, () => {
      void context?.close().catch(() => undefined);
    });
  } finally {
    activeExtractions -= 1;
    await context?.close().catch(() => undefined);
  }
}
