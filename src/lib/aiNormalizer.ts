import { openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { AiTokenDraftSchema } from "@/types/aiDraft";
import type { DesignSystemTokens, RawExtraction } from "@/types/tokens";
import { reconcileDraft, summarizeForModel } from "./tokenNormalizer";

const DEFAULT_MODEL = "gpt-5.4-mini";
const SYNTHESIS_TIMEOUT_MS = 20_000;

const INSTRUCTIONS = `You are a design systems lead normalizing computed styles sampled from a live web page into a coherent token set.

You receive weighted observations (colors by usage, type samples, spacing, radii, shadows) and a deterministic baseline produced by perceptual clustering. Improve on the baseline only where the observations justify it.

Rules:
- Every color is a lowercase six-digit hex value. Prefer colors that were actually observed; derive a value only when a role has no observed candidate.
- background and foreground must reach a contrast ratio of at least 4.5. primaryForeground must be readable on primary.
- primary is the dominant brand or call-to-action color. secondary and accent must be visibly distinct from primary.
- success, warning and danger are green, amber and red family colors that suit the palette.
- Type steps are ordered by size with names from xs, sm, base, lg, xl, 2xl, 3xl, 4xl, 5xl. Exactly one step is named base and it matches body copy.
- Spacing step names follow the Tailwind convention of pixels divided by four. Keep between 4 and 12 steps on a consistent grid.
- Radii names come from none, sm, md, lg, xl, full. Shadow names come from sm, md, lg and values are valid CSS box-shadow strings.
- Font family values are complete CSS font-family stacks taken from the observations.
- Never invent values that contradict the observations.`;

export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export async function synthesizeTokens(
  raw: RawExtraction,
  baseline: DesignSystemTokens,
): Promise<DesignSystemTokens> {
  const model = process.env.SWATCH_OPENAI_MODEL?.trim() || DEFAULT_MODEL;
  const { output } = await generateText({
    model: openai(model),
    output: Output.object({ schema: AiTokenDraftSchema }),
    instructions: INSTRUCTIONS,
    prompt: JSON.stringify(summarizeForModel(raw, baseline)),
    maxRetries: 1,
    timeout: SYNTHESIS_TIMEOUT_MS,
  });
  return reconcileDraft(output, baseline, model);
}
