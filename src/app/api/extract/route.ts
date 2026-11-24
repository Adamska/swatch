import { NextResponse } from "next/server";
import { z } from "zod";
import { ExtractionError } from "@/lib/extractionError";
import { extractStyles } from "@/lib/scraper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const ExtractRequestSchema = z.object({
  url: z.string().trim().min(1).max(2048),
});

function failure(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const payload: unknown = await request.json().catch(() => null);
  const parsed = ExtractRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return failure("invalid_request", "Provide a JSON body with a url string.", 400);
  }

  try {
    const extraction = await extractStyles(parsed.data.url);
    return NextResponse.json({ extraction }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof ExtractionError) {
      return failure(error.code, error.message, error.status);
    }
    if (error instanceof z.ZodError) {
      return failure("invalid_extraction", "The page produced an unreadable style sample.", 502);
    }
    console.error("extract route failed", error);
    return failure("internal_error", "Extraction failed unexpectedly.", 500);
  }
}
