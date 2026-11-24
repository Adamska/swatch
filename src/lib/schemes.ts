import type { DesignSystemTokens, SemanticColors } from "@/types/tokens";
import { contrastRatio, fromOklchInGamut, mixColors, pickReadable, toOklch } from "./color";
import { ensureContrast } from "./colorScale";

export type SchemeName = "light" | "dark";

export function schemeOf(colors: SemanticColors): SchemeName {
  return toOklch(colors.background).l < 0.5 ? "dark" : "light";
}

const shift = (hex: string, lightness: number, chromaScale = 1) => {
  const color = toOklch(hex);
  return fromOklchInGamut({ l: lightness, c: color.c * chromaScale, h: color.h });
};

/**
 * Synthesizes the opposite scheme in OKLCH. Neutrals mirror their lightness around the middle of the
 * range while keeping hue; brand and status roles keep hue and chroma and are lifted until they read on
 * the new ground.
 */
export function synthesizeOppositeScheme(colors: SemanticColors): SemanticColors {
  const toDark = schemeOf(colors) === "light";
  const background = shift(colors.background, toDark ? 0.17 : 0.985, 0.6);
  const surface = shift(colors.surface, toDark ? 0.215 : 0.955, 0.6);
  const foreground = shift(colors.foreground, toDark ? 0.95 : 0.2, 0.8);
  const muted = ensureContrast(shift(colors.muted, toDark ? 0.74 : 0.47, 0.8), background, 4.5);
  const border = mixColors(background, foreground, toDark ? 0.17 : 0.13);

  const lift = (hex: string, minimum: number) => {
    const color = toOklch(hex);
    const mirrored = fromOklchInGamut({ ...color, l: toDark ? Math.max(color.l, 0.68) : Math.min(color.l, 0.55) });
    return ensureContrast(mirrored, background, minimum);
  };

  const primary = lift(colors.primary, 3);
  return {
    background,
    surface,
    foreground,
    muted,
    border,
    primary,
    primaryForeground: pickReadable(primary, [background, foreground, "#ffffff", "#0b0c0f"]),
    secondary: lift(colors.secondary, 3),
    accent: lift(colors.accent, 3),
    success: lift(colors.success, 3),
    warning: lift(colors.warning, 3),
    danger: lift(colors.danger, 3),
  };
}

/** Accepts an extracted alternate scheme only when it really flips the ground. */
export function isDistinctScheme(base: SemanticColors, candidate: SemanticColors): boolean {
  const flip = Math.abs(toOklch(base.background).l - toOklch(candidate.background).l) > 0.35;
  return flip && contrastRatio(candidate.foreground, candidate.background) >= 4.5;
}

const alternateCache = new WeakMap<DesignSystemTokens, SemanticColors>();

export function resolveAltColors(tokens: DesignSystemTokens): SemanticColors {
  if (tokens.altColors) return tokens.altColors;
  let cached = alternateCache.get(tokens);
  if (!cached) {
    cached = synthesizeOppositeScheme(tokens.colors);
    alternateCache.set(tokens, cached);
  }
  return cached;
}
