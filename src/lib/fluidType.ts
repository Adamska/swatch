import type { TypeSample, TypeStep } from "@/types/tokens";

export const FLUID_RANGE = { minViewportPx: 390, maxViewportPx: 1440 } as const;

/**
 * Pairs display steps with mobile heading sizes by rank. Only steps above `base` become fluid, and a
 * pairing is kept only when the mobile size is meaningfully smaller.
 */
export function applyFluidType(steps: TypeStep[], mobile: TypeSample[] | null): TypeStep[] {
  if (!mobile || mobile.length === 0) return steps;
  const baseIndex = steps.findIndex((step) => step.name === "base");
  const baseSize = steps[baseIndex]?.sizePx ?? 16;

  const mobileSizes = [
    ...new Set(
      mobile
        .filter((sample) => sample.role === "heading" && sample.sizePx > baseSize)
        .map((sample) => sample.sizePx),
    ),
  ].sort((a, b) => b - a);
  const largeSteps = steps
    .map((step, index) => ({ step, index }))
    .filter(({ index }) => index > baseIndex)
    .sort((a, b) => b.step.sizePx - a.step.sizePx);

  const fluid = new Map<number, number>();
  largeSteps.forEach(({ step, index }, rank) => {
    const candidate = mobileSizes[rank];
    if (candidate && candidate <= step.sizePx * 0.92 && candidate >= baseSize) fluid.set(index, candidate);
  });
  return steps.map((step, index) => ({ ...step, fluidMinPx: fluid.get(index) ?? null }));
}

const rem = (px: number) => Math.round((px / 16) * 1000) / 1000;

export function fluidClamp(step: TypeStep): string | null {
  if (step.fluidMinPx === null || step.fluidMinPx >= step.sizePx) return null;
  const { minViewportPx, maxViewportPx } = FLUID_RANGE;
  const slope = (step.sizePx - step.fluidMinPx) / (maxViewportPx - minViewportPx);
  const intercept = step.fluidMinPx - slope * minViewportPx;
  return `clamp(${rem(step.fluidMinPx)}rem, ${rem(intercept)}rem + ${Math.round(slope * 10000) / 100}vw, ${rem(step.sizePx)}rem)`;
}
