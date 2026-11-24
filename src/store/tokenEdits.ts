import { resolveAltColors } from "@/lib/schemes";
import type { DesignSystemTokens, SemanticColorKey } from "@/types/tokens";

export type SchemeSlot = "base" | "alt";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const tidy = (value: number) => Math.round(value * 100) / 100;

export function withColor(tokens: DesignSystemTokens, slot: SchemeSlot, key: SemanticColorKey, hex: string): DesignSystemTokens {
  if (slot === "base") {
    if (tokens.colors[key] === hex) return tokens;
    return { ...tokens, colors: { ...tokens.colors, [key]: hex } };
  }
  const current = resolveAltColors(tokens);
  if (current[key] === hex) return tokens;
  return { ...tokens, altColors: { ...current, [key]: hex }, altSource: "edited" };
}

export function withTypeSize(tokens: DesignSystemTokens, index: number, sizePx: number): DesignSystemTokens {
  const next = clamp(Math.round(sizePx * 2) / 2, 6, 200);
  if (tokens.typography.steps[index]?.sizePx === next) return tokens;
  const steps = tokens.typography.steps.map((step, position) =>
    position === index ? { ...step, sizePx: next } : step,
  );
  return { ...tokens, typography: { ...tokens.typography, steps } };
}

export function withSpacing(tokens: DesignSystemTokens, index: number, px: number): DesignSystemTokens {
  const next = clamp(Math.round(px), 1, 320);
  if (tokens.spacing.steps[index]?.px === next) return tokens;
  const steps = tokens.spacing.steps.map((step, position) =>
    position === index ? { name: String(tidy(next / 4)), px: next } : step,
  );
  return { ...tokens, spacing: { ...tokens.spacing, steps } };
}

export function withRadius(tokens: DesignSystemTokens, index: number, px: number): DesignSystemTokens {
  const next = clamp(Math.round(px), 0, 64);
  if (tokens.radii[index]?.px === next) return tokens;
  const radii = tokens.radii.map((step, position) => (position === index ? { ...step, px: next } : step));
  return { ...tokens, radii };
}
