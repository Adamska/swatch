import { chromium, type Browser } from "playwright";
import { ExtractionError } from "./extractionError";

const LAUNCH_ARGS = ["--disable-gpu", "--disable-dev-shm-usage", "--disable-extensions", "--mute-audio", "--no-first-run"];
const MAX_CONCURRENT = 3;
/** Single-process mode tears the browser down when the first context closes, which breaks reuse. */
const SERVERLESS_EXCLUDED_ARGS = new Set(["--single-process"]);

const globalStore = globalThis as typeof globalThis & {
  __swatchBrowser?: Promise<Browser>;
  __swatchActive?: number;
};

export function runsServerless(): boolean {
  const mode = process.env.SWATCH_CHROMIUM?.trim();
  if (mode === "serverless") return true;
  if (mode === "bundled") return false;
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

async function launch(): Promise<Browser> {
  if (!runsServerless()) return chromium.launch({ headless: true, args: LAUNCH_ARGS });
  const { default: serverless } = await import("@sparticuz/chromium");
  return chromium.launch({
    headless: true,
    args: [...serverless.args.filter((arg) => !SERVERLESS_EXCLUDED_ARGS.has(arg)), ...LAUNCH_ARGS],
    executablePath: await serverless.executablePath(),
  });
}

export async function getBrowser(): Promise<Browser> {
  const cached = await globalStore.__swatchBrowser?.catch(() => undefined);
  if (cached && !cached.isConnected()) globalStore.__swatchBrowser = undefined;
  if (!globalStore.__swatchBrowser) {
    globalStore.__swatchBrowser = launch()
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

export function buildUserAgent(browser: Browser): string {
  const major = browser.version().split(".")[0];
  return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36 SwatchInspector/0.2`;
}

export async function withSlot<T>(work: () => Promise<T>): Promise<T> {
  const active = globalStore.__swatchActive ?? 0;
  if (active >= MAX_CONCURRENT) {
    throw new ExtractionError("busy", "Too many inspections are running. Try again in a moment.");
  }
  globalStore.__swatchActive = active + 1;
  try {
    return await work();
  } finally {
    globalStore.__swatchActive = (globalStore.__swatchActive ?? 1) - 1;
  }
}
