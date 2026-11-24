import { NextResponse } from "next/server";
import { z } from "zod";
import { ExtractionError } from "@/lib/extractionError";
import { clientKey, createRateLimiter } from "@/lib/rateLimit";
import { extractStyles, type ExtractionResult } from "@/lib/scraper";
import { createTtlCache } from "@/lib/ttlCache";
import { parsePublicUrl } from "@/lib/urlGuard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ExtractRequestSchema = z.object({ url: z.string().trim().min(1).max(2048) });

const globalStore = globalThis as typeof globalThis & {
  __swatchCache?: ReturnType<typeof createTtlCache<ExtractionResult>>;
  __swatchLimiter?: ReturnType<typeof createRateLimiter>;
};
const cache = (globalStore.__swatchCache ??= createTtlCache<ExtractionResult>(16, 10 * 60_000));
const limit = (globalStore.__swatchLimiter ??= createRateLimiter(8, 60_000));

function failure(code: string, message: string, status: number, headers?: HeadersInit) {
  return NextResponse.json({ error: { code, message } }, { status, headers });
}

export async function POST(request: Request) {
  const payload: unknown = await request.json().catch(() => null);
  const parsed = ExtractRequestSchema.safeParse(payload);
  if (!parsed.success) return failure("invalid_request", "Provide a JSON body with a url string.", 400);

  let cacheKey: string;
  try {
    cacheKey = parsePublicUrl(parsed.data.url).href;
  } catch (error) {
    if (error instanceof ExtractionError) return failure(error.code, error.message, error.status);
    throw error;
  }

  const cached = cache.get(cacheKey);
  if (!cached) {
    const verdict = limit(clientKey(request.headers));
    if (!verdict.allowed) {
      return failure("rate_limited", `Too many inspections. Try again in ${verdict.retryAfterSeconds} s.`, 429, {
        "retry-after": String(verdict.retryAfterSeconds),
      });
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          return;
        }
      };
      try {
        if (cached) {
          send({ type: "progress", phase: "cache", detail: "Served from a capture made in the last ten minutes", elapsedMs: 0 });
          send({ type: "result", ...cached });
          return;
        }
        const result = await extractStyles(parsed.data.url, (progress) => send({ type: "progress", ...progress }));
        cache.set(cacheKey, result);
        send({ type: "result", ...result });
      } catch (error) {
        if (error instanceof ExtractionError) {
          send({ type: "error", code: error.code, message: error.message });
        } else {
          console.error("extract route failed", error);
          send({ type: "error", code: "internal_error", message: "Extraction failed unexpectedly." });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      "x-accel-buffering": "no",
    },
  });
}
