import type { CSSProperties } from "react";
import type { DesignSystemTokens, MeasureStep, ShadowStep, TypeStep } from "@/types/tokens";
import { SEMANTIC_COLOR_KEYS } from "@/types/tokens";

type RadiusRole = "control" | "container" | "pill";

const BUNDLED_FACES: [pattern: RegExp, stack: string][] = [
  [/^["']?geist mono/i, "var(--font-geist-mono)"],
  [/^["']?geist/i, "var(--font-geist-sans)"],
  [/^["']?fraunces/i, '"Fraunces Variable"'],
];

export function resolveFontStack(stack: string): string {
  const bundled = BUNDLED_FACES.find(([pattern]) => pattern.test(stack.trim()));
  return bundled ? `${bundled[1]}, ${stack}` : stack;
}

export function leadFamily(stack: string): string {
  return stack.split(",")[0]?.trim().replace(/^["']|["']$/g, "") || "System";
}

export function pickRadius(radii: MeasureStep[], role: RadiusRole): number {
  const finite = radii.filter((step) => step.px < 999).sort((a, b) => a.px - b.px);
  const hasPill = radii.some((step) => step.px >= 999);
  if (role === "pill") return hasPill ? 9999 : (finite[0]?.px ?? 0);
  if (role === "container") return finite[finite.length - 1]?.px ?? 0;
  return finite[Math.floor((finite.length - 1) / 2)]?.px ?? 0;
}

export function pickShadow(shadows: ShadowStep[], level: "low" | "high"): string {
  if (shadows.length === 0) return "none";
  return (level === "low" ? shadows[0] : shadows[shadows.length - 1]).value;
}

export function pickSpace(steps: MeasureStep[], targetPx: number): number {
  return steps.reduce(
    (best, step) => (Math.abs(step.px - targetPx) < Math.abs(best - targetPx) ? step.px : best),
    steps[0]?.px ?? targetPx,
  );
}

export function pickStageType(steps: TypeStep[]) {
  const ordered = [...steps].sort((a, b) => a.sizePx - b.sizePx);
  const baseIndex = Math.max(0, ordered.findIndex((step) => step.name === "base"));
  const base = ordered[baseIndex];
  const small = ordered[baseIndex - 1] ?? base;
  const larger = ordered.slice(baseIndex + 1);
  const title = larger.find((step) => step.sizePx >= base.sizePx * 1.15) ?? base;
  const heading = [...larger].reverse().find((step) => step.sizePx <= 34) ?? title;
  return { small, base, title, heading };
}

function typeVariables(prefix: string, step: TypeStep, tokens: DesignSystemTokens): Record<string, string> {
  return {
    [`--sg-${prefix}-size`]: `${step.sizePx}px`,
    [`--sg-${prefix}-leading`]: String(step.lineHeight),
    [`--sg-${prefix}-weight`]: String(step.weight),
    [`--sg-${prefix}-tracking`]: `${step.letterSpacingEm}em`,
    [`--sg-${prefix}-family`]: resolveFontStack(tokens.typography.families[step.family]),
  };
}

export function toStageVariables(tokens: DesignSystemTokens): CSSProperties {
  const { colors, typography, spacing, radii, shadows } = tokens;
  const type = pickStageType(typography.steps);
  const variables: Record<string, string> = {
    "--sg-font-body": resolveFontStack(typography.families.body),
    "--sg-font-display": resolveFontStack(typography.families.display),
    "--sg-font-mono": resolveFontStack(typography.families.mono),
    "--sg-radius-control": `${pickRadius(radii, "control")}px`,
    "--sg-radius-container": `${pickRadius(radii, "container")}px`,
    "--sg-radius-pill": `${pickRadius(radii, "pill")}px`,
    "--sg-shadow-low": pickShadow(shadows, "low"),
    "--sg-shadow-high": pickShadow(shadows, "high"),
    "--sg-space-xs": `${pickSpace(spacing.steps, 6)}px`,
    "--sg-space-sm": `${pickSpace(spacing.steps, 10)}px`,
    "--sg-space-md": `${pickSpace(spacing.steps, 16)}px`,
    "--sg-space-lg": `${pickSpace(spacing.steps, 24)}px`,
    ...typeVariables("small", type.small, tokens),
    ...typeVariables("base", type.base, tokens),
    ...typeVariables("title", type.title, tokens),
    ...typeVariables("heading", type.heading, tokens),
  };
  for (const key of SEMANTIC_COLOR_KEYS) {
    variables[`--sg-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`] = colors[key];
  }
  return variables as CSSProperties;
}
