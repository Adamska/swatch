import { NextResponse } from "next/server";
import { z } from "zod";
import { isAiConfigured, synthesizeTokens } from "@/lib/aiNormalizer";
import { normalizeDeterministic } from "@/lib/tokenNormalizer";
import { RawExtractionSchema } from "@/types/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const NormalizeRequestSchema = z.object({
  extraction: RawExtractionSchema,
  mode: z.enum(["auto", "deterministic"]).default("auto"),
});

export async function POST(request: Request) {
  const payload: unknown = await request.json().catch(() => null);
  const parsed = NormalizeRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Provide a valid extraction payload." } },
      { status: 400 },
    );
  }

  const { extraction, mode } = parsed.data;
  const baseline = normalizeDeterministic(extraction);
  const headers = { "cache-control": "no-store" };
  if (mode === "deterministic" || !isAiConfigured()) {
    return NextResponse.json({ tokens: baseline, fallbackReason: null }, { headers });
  }

  try {
    const tokens = await synthesizeTokens(extraction, baseline);
    return NextResponse.json({ tokens, fallbackReason: null }, { headers });
  } catch (error) {
    console.error("ai normalization failed, serving deterministic tokens", error);
    return NextResponse.json(
      { tokens: baseline, fallbackReason: "The model request failed, so tokens were clustered locally." },
      { headers },
    );
  }
}
