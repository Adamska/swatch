import type { BrowserContext, Page } from "playwright";
import type { Evidence } from "@/types/extraction";
import { collectAnchors } from "./anchorSampler";
import { sampleDocument, type SampledDocument, type SamplerConfig } from "./pageSampler";
import type { ContextGuard } from "./requestGuard";

export const PRIMARY_SAMPLER: SamplerConfig = { maxNodes: 900, perGroup: 90, walkDepth: 7, walkFanout: 10 };
const SECONDARY_SAMPLER: SamplerConfig = { maxNodes: 500, perGroup: 50, walkDepth: 6, walkFanout: 8 };
const CAPTURE = { width: 1440, maxHeight: 1800, quality: 55 } as const;
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;
const SUBPAGE_LIMIT = 2;
const SUBPAGE_TIMEOUT_MS = 7000;

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const WITHHELD_MEDIA = "img,video,picture,canvas,iframe,object,embed{visibility:hidden!important}";

export async function captureEvidence(page: Page): Promise<Evidence> {
  await page.addStyleTag({ content: WITHHELD_MEDIA });
  await page.evaluate(() => window.scrollTo(0, 0));
  const documentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const height = Math.max(400, Math.min(CAPTURE.maxHeight, documentHeight));
  const anchors = await page.evaluate(collectAnchors, {
    captureHeight: height,
    maxElements: 2400,
    maxRects: 6,
    maxAnchors: 400,
  });
  const image = await page.screenshot({
    type: "jpeg",
    quality: CAPTURE.quality,
    fullPage: true,
    clip: { x: 0, y: 0, width: CAPTURE.width, height },
    animations: "disabled",
    caret: "hide",
    timeout: 4000,
  });
  return {
    image: `data:image/jpeg;base64,${image.toString("base64")}`,
    width: CAPTURE.width,
    height,
    anchors,
  };
}

export async function sampleDarkScheme(page: Page): Promise<SampledDocument["colors"]> {
  await page.emulateMedia({ colorScheme: "dark" });
  await pause(300);
  const sampled = await page.evaluate(sampleDocument, SECONDARY_SAMPLER);
  await page.emulateMedia({ colorScheme: "light" });
  return sampled.colors;
}

export async function sampleMobileType(page: Page): Promise<SampledDocument["typography"]> {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await pause(250);
  const sampled = await page.evaluate(sampleDocument, SECONDARY_SAMPLER);
  return sampled.typography;
}

/** In-page: picks same-origin navigation targets, preferring links inside header and nav landmarks. */
function discoverLinks(limit: number): string[] {
  const here = new URL(location.href);
  const seen = new Set([here.pathname.replace(/\/$/, "")]);
  const picked: string[] = [];
  const anchors = [
    ...document.querySelectorAll("header a[href], nav a[href]"),
    ...document.querySelectorAll("main a[href], a[href]"),
  ];
  for (const anchor of anchors) {
    if (picked.length >= limit) break;
    let url: URL;
    try {
      url = new URL((anchor as HTMLAnchorElement).href, here);
    } catch {
      continue;
    }
    const path = url.pathname.replace(/\/$/, "");
    const isDocument = !/\.[a-z0-9]{2,5}$/i.test(path) || /\.html?$/i.test(path);
    if (url.origin !== here.origin || !isDocument || seen.has(path) || /login|signin|sign-in|logout|cart|account/i.test(path)) continue;
    seen.add(path);
    url.hash = "";
    picked.push(url.href);
  }
  return picked;
}

export async function sampleSubpages(
  context: BrowserContext,
  entry: Page,
  guard: ContextGuard,
): Promise<{ urls: string[]; documents: SampledDocument[] }> {
  const urls = await entry.evaluate(discoverLinks, SUBPAGE_LIMIT).catch(() => [] as string[]);
  const results = await Promise.allSettled(
    urls.map(async (url) => {
      const page = await context.newPage();
      guard.watchPage(page);
      try {
        const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: SUBPAGE_TIMEOUT_MS });
        if (!response || response.status() >= 400) throw new Error("unavailable");
        await page.waitForLoadState("load", { timeout: 2000 }).catch(() => undefined);
        return { url: page.url(), document: await page.evaluate(sampleDocument, SECONDARY_SAMPLER) };
      } finally {
        await page.close().catch(() => undefined);
      }
    }),
  );
  const fulfilled = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
  return { urls: fulfilled.map((entry) => entry.url), documents: fulfilled.map((entry) => entry.document) };
}
