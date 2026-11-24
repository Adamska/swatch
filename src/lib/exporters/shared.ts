import { toOklch } from "@/lib/color";
import { scaleRecord, SCALE_STOPS, type ScaleStop } from "@/lib/colorScale";
import { fluidClamp } from "@/lib/fluidType";
import { resolveAltColors, schemeOf, type SchemeName } from "@/lib/schemes";
import type { DesignSystemTokens, FontRole, SemanticColors, TypeStep } from "@/types/tokens";

export const FONT_KEYS: Record<FontRole, string> = { display: "display", body: "sans", mono: "mono" };
export const FONT_ROLES = Object.keys(FONT_KEYS) as FontRole[];
export const SCALE_ROLES = ["primary", "secondary", "accent", "success", "warning", "danger"] as const;
export type ScaleRole = (typeof SCALE_ROLES)[number] | "neutral";

export const trimNumber = (value: number) => String(Math.round(value * 10000) / 10000);
export const toRem = (px: number) => (px === 0 ? "0" : px >= 9999 ? "9999px" : `${trimNumber(px / 16)}rem`);
export const toKebab = (key: string) => key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
export const quote = (value: string) => JSON.stringify(value);

export function splitFontStack(stack: string): string[] {
  return stack
    .split(",")
    .map((family) => family.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

export function toOklchCss(hex: string): string {
  const { l, c, h } = toOklch(hex);
  const round = (value: number, digits: number) => Number(value.toFixed(digits));
  return c < 0.0005 ? `oklch(${round(l, 3)} 0 0)` : `oklch(${round(l, 3)} ${round(c, 3)} ${round(h, 1)})`;
}

export function fontSizeValue(step: TypeStep): string {
  return fluidClamp(step) ?? toRem(step.sizePx);
}

export interface SchemePair {
  base: SchemeName;
  alternate: SchemeName;
  baseColors: SemanticColors;
  altColors: SemanticColors;
  light: SemanticColors;
  dark: SemanticColors;
}

export function schemePair(tokens: DesignSystemTokens): SchemePair {
  const base = schemeOf(tokens.colors);
  const altColors = resolveAltColors(tokens);
  const isLight = base === "light";
  return {
    base,
    alternate: isLight ? "dark" : "light",
    baseColors: tokens.colors,
    altColors,
    light: isLight ? tokens.colors : altColors,
    dark: isLight ? altColors : tokens.colors,
  };
}

export function scalesOf(colors: SemanticColors): Record<ScaleRole, Record<ScaleStop, string>> {
  const entries = SCALE_ROLES.map((role) => [role, scaleRecord(colors[role])] as const);
  return { ...Object.fromEntries(entries), neutral: scaleRecord(colors.muted) } as Record<ScaleRole, Record<ScaleStop, string>>;
}

export { SCALE_STOPS };

export function banner(tokens: DesignSystemTokens): string {
  return `${tokens.meta.name} — extracted from ${tokens.meta.sourceUrl}`;
}
