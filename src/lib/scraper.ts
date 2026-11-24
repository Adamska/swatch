import type { BrowserContext } from "playwright";
import { RawExtractionSchema, type Evidence, type RawExtraction, type StateSample } from "@/types/extraction";
import { buildUserAgent, getBrowser, withSlot } from "./browserPool";
import { ExtractionError } from "./extractionError";
import {
  captureEvidence,
  PRIMARY_SAMPLER,
  sampleDarkScheme,
  sampleMobileType,
  sampleSubpages,
} from "./extractionPasses";
import { sampleDocument, type SampledDocument } from "./pageSampler";
import { blockedError, guardContext, type ContextGuard } from "./requestGuard";
import { mergeDocuments } from "./sampleMerge";
import { probeStates } from "./stateProbe";
import { createHostGuard, parsePublicUrl, resolvePublicTarget } from "./urlGuard";

export const EXTRACTION_BUDGET = {
  totalMs: 25_000,
  navigationMs: 10_000,
  loadMs: 3_500,
  settleMs: 900,
  optionalUntilMs: 15_000,
} as const;

export const EXTRACTION_PHASES = ["resolve", "launch", "navigate", "sample", "capture", "states", "scheme", "viewport", "pages"] as const;
export type ExtractionPhase = (typeof EXTRACTION_PHASES)[number];

export interface ExtractionProgress {
  phase: ExtractionPhase;
  detail: string;
  elapsedMs: number;
}

export interface ExtractionResult {
  extraction: RawExtraction;
  evidence: Evidence | null;
}

type Reporter = (phase: ExtractionPhase, detail: string) => void;

async function optional<T>(work: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await work();
  } catch {
    return fallback;
  }
}

async function inspect(context: BrowserContext, guard: ContextGuard, target: URL, report: Reporter, startedAt: number) {
  const page = await context.newPage();
  guard.watchPage(page);
  const hasTime = () => performance.now() - startedAt < EXTRACTION_BUDGET.optionalUntilMs;

  const response = await page.goto(target.href, { waitUntil: "domcontentloaded", timeout: EXTRACTION_BUDGET.navigationMs });
  if (!response) throw new ExtractionError("navigation_failed", "The page did not return a document.");
  if (response.status() >= 400) {
    throw new ExtractionError("upstream_status", `The target responded with HTTP ${response.status()}.`);
  }
  await page.waitForLoadState("load", { timeout: EXTRACTION_BUDGET.loadMs }).catch(() => undefined);
  await page.waitForLoadState("networkidle", { timeout: EXTRACTION_BUDGET.settleMs }).catch(() => undefined);
  guard.assertClean();
  report("navigate", `HTTP ${response.status()} from ${new URL(page.url()).hostname}`);

  const primary = await page.evaluate(sampleDocument, PRIMARY_SAMPLER);
  report("sample", `${primary.sampledNodes} nodes, ${primary.colors.length} color samples`);
  const subpages = sampleSubpages(context, page, guard);

  const evidence = await optional<Evidence | null>(() => captureEvidence(page), null);
  report("capture", evidence ? `${evidence.anchors.length} anchors over ${evidence.height} px` : "Capture skipped");

  const states = hasTime() ? await optional<StateSample[]>(() => probeStates(page), []) : [];
  report("states", `${states.length} controls hovered and focused`);

  const darkColors = hasTime() ? await optional<SampledDocument["colors"] | null>(() => sampleDarkScheme(page), null) : null;
  report("scheme", darkColors ? `${darkColors.length} colors under prefers-color-scheme: dark` : "Dark pass skipped");

  const mobileTypography = hasTime() ? await optional<SampledDocument["typography"] | null>(() => sampleMobileType(page), null) : null;
  report("viewport", mobileTypography ? `${mobileTypography.length} type samples at 390 px` : "Mobile pass skipped");

  const extra = await optional(() => subpages, { urls: [] as string[], documents: [] as SampledDocument[] });
  report("pages", extra.urls.length > 0 ? extra.urls.map((url) => new URL(url).pathname).join("  ") : "No internal pages followed");
  guard.assertClean();

  return {
    merged: mergeDocuments(primary, extra.documents),
    finalUrl: page.url(),
    pages: extra.urls,
    evidence,
    states,
    darkColors,
    mobileTypography,
  };
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

const CONTEXT_OPTIONS = {
  viewport: { width: 1440, height: 900 },
  locale: "en-US",
  serviceWorkers: "block",
  reducedMotion: "reduce",
  acceptDownloads: false,
  bypassCSP: true,
} as const;

export function extractStyles(
  inputUrl: string,
  onProgress: (event: ExtractionProgress) => void = () => {},
): Promise<ExtractionResult> {
  return withSlot(async () => {
    const startedAt = performance.now();
    const report: Reporter = (phase, detail) =>
      onProgress({ phase, detail, elapsedMs: Math.round(performance.now() - startedAt) });
    let context: BrowserContext | undefined;
    let contextGuard: ContextGuard | undefined;

    const run = async (): Promise<ExtractionResult> => {
      const hosts = createHostGuard();
      const hostname = parsePublicUrl(inputUrl).hostname;
      await hosts.assertPublicHost(hostname);
      report("resolve", `${hostname} resolves to a public address`);
      const browser = await getBrowser();
      report("launch", `Chromium ${browser.version().split(".")[0]} ready`);
      const userAgent = buildUserAgent(browser);
      const target = await resolvePublicTarget(inputUrl, hosts, userAgent);

      context = await browser.newContext({ ...CONTEXT_OPTIONS, userAgent });
      contextGuard = await guardContext(context, hosts);
      const result = await inspect(context, contextGuard, target, report, startedAt).catch((error: unknown) => {
        if (contextGuard?.isViolated()) throw blockedError();
        if (error instanceof ExtractionError) throw error;
        const message = error instanceof Error ? error.message : "";
        if (/timeout/i.test(message)) throw new ExtractionError("timeout", "The page took too long to respond.");
        throw new ExtractionError("navigation_failed", "The page could not be loaded.");
      });
      const { title, sampledNodes, ...samples } = result.merged;

      const extraction = RawExtractionSchema.parse({
        source: {
          url: result.finalUrl,
          title: title || target.hostname,
          capturedAt: new Date().toISOString(),
          durationMs: Math.round(performance.now() - startedAt),
          sampledNodes,
          origin: "live",
          pages: [result.finalUrl, ...result.pages],
        },
        ...samples,
        darkColors: result.darkColors,
        mobileTypography: result.mobileTypography,
        states: result.states,
      });
      return { extraction, evidence: result.evidence };
    };

    try {
      return await withDeadline(run(), EXTRACTION_BUDGET.totalMs, () => void context?.close().catch(() => undefined));
    } finally {
      await context?.close().catch(() => undefined);
    }
  });
}
