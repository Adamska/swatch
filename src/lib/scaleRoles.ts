import type {
  FontRole,
  MeasureSample,
  MeasureStep,
  ShadowSample,
  ShadowStep,
  Spacing,
  TypeSample,
  TypeStep,
  Typography,
} from "@/types/tokens";

const DEFAULT_SANS = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const DEFAULT_MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const SMALLER_NAMES = ["sm", "xs"];
const LARGER_NAMES = ["lg", "xl", "2xl", "3xl", "4xl", "5xl"];
const RADIUS_NAMES: Record<number, string[]> = {
  1: ["md"],
  2: ["sm", "lg"],
  3: ["sm", "md", "lg"],
  4: ["sm", "md", "lg", "xl"],
};
const SHADOW_NAMES: Record<number, string[]> = { 1: ["md"], 2: ["sm", "lg"], 3: ["sm", "md", "lg"] };

const roundTo = (value: number, step: number) => Math.round(value / step) * step;
const tidy = (value: number) => Math.round(value * 1000) / 1000;

function heaviest<T>(items: T[], key: (item: T) => string | number, weight: (item: T) => number): T | undefined {
  const totals = new Map<string | number, { item: T; total: number }>();
  for (const item of items) {
    const entry = totals.get(key(item));
    if (entry) entry.total += weight(item);
    else totals.set(key(item), { item, total: weight(item) });
  }
  return [...totals.values()].sort((a, b) => b.total - a.total)[0]?.item;
}

function summarizeStep(name: string, samples: TypeSample[], sizePx: number): TypeStep {
  const total = samples.reduce((sum, sample) => sum + sample.count, 0) || 1;
  const average = (pick: (sample: TypeSample) => number) =>
    samples.reduce((sum, sample) => sum + pick(sample) * sample.count, 0) / total;
  const dominant = heaviest(samples, (sample) => sample.role, (sample) => sample.count);
  const weight = heaviest(samples, (sample) => sample.weight, (sample) => sample.count)?.weight ?? 400;
  const family: FontRole = dominant?.role === "heading" ? "display" : dominant?.role === "code" ? "mono" : "body";

  return {
    name,
    sizePx,
    fluidMinPx: null,
    lineHeight: tidy(Math.min(3, Math.max(0.8, roundTo(average((sample) => sample.lineHeight), 0.05)))),
    weight: Math.min(900, Math.max(100, roundTo(weight, 10))),
    letterSpacingEm: tidy(Math.min(0.5, Math.max(-0.2, roundTo(average((sample) => sample.letterSpacingEm), 0.005)))),
    family,
  };
}

export function deriveTypography(samples: TypeSample[]): Typography {
  const familyFor = (roles: TypeSample["role"][]) =>
    heaviest(samples.filter((sample) => roles.includes(sample.role)), (sample) => sample.family, (sample) => sample.count)?.family;
  const body = familyFor(["body", "control"]) ?? familyFor(["heading"]) ?? DEFAULT_SANS;
  const families = { display: familyFor(["heading"]) ?? body, body, mono: familyFor(["code"]) ?? DEFAULT_MONO };

  const prose = samples.filter((sample) => sample.role !== "code");
  const groups: { sizePx: number; count: number; samples: TypeSample[] }[] = [];
  for (const sample of [...(prose.length > 0 ? prose : samples)].sort((a, b) => a.sizePx - b.sizePx)) {
    const last = groups[groups.length - 1];
    if (last && sample.sizePx / last.sizePx <= 1.06) {
      if (sample.count > Math.max(...last.samples.map((member) => member.count))) last.sizePx = sample.sizePx;
      last.count += sample.count;
      last.samples.push(sample);
    } else {
      groups.push({ sizePx: sample.sizePx, count: sample.count, samples: [sample] });
    }
  }

  const bodyCount = (group: (typeof groups)[number]) =>
    group.samples.reduce((sum, sample) => sum + (sample.role === "body" ? sample.count : 0), 0);
  const readable = groups.filter((group) => group.sizePx >= 14 && group.sizePx <= 22 && bodyCount(group) > 0);
  const baseScore = (group: (typeof groups)[number]) => (bodyCount(group) || group.count / 100) / (1 + Math.abs(group.sizePx - 16) / 4);
  const base = [...(readable.length > 0 ? readable : groups)].sort((a, b) => baseScore(b) - baseScore(a))[0];
  if (!base) {
    const synthetic = (name: string, sizePx: number, lineHeight: number, weight: number): TypeStep =>
      ({ name, sizePx, fluidMinPx: null, lineHeight, weight, letterSpacingEm: 0, family: sizePx > 20 ? "display" : "body" });
    return { families, steps: [synthetic("sm", 14, 1.5, 400), synthetic("base", 16, 1.6, 400), synthetic("lg", 20, 1.4, 500), synthetic("xl", 28, 1.2, 600)] };
  }

  const keepHeaviest = (pool: typeof groups, limit: number) =>
    [...pool].sort((a, b) => b.count - a.count).slice(0, limit).sort((a, b) => a.sizePx - b.sizePx);
  const smaller = keepHeaviest(groups.filter((group) => group.sizePx < base.sizePx), SMALLER_NAMES.length).reverse();
  const larger = keepHeaviest(groups.filter((group) => group.sizePx > base.sizePx), LARGER_NAMES.length);

  const steps = [
    ...smaller.map((group, index) => summarizeStep(SMALLER_NAMES[index], group.samples, group.sizePx)).reverse(),
    summarizeStep("base", base.samples, base.sizePx),
    ...larger.map((group, index) => summarizeStep(LARGER_NAMES[index], group.samples, group.sizePx)),
  ];
  for (let index = larger.length; steps.length < 3; index += 1) {
    const previous = steps[steps.length - 1];
    steps.push({ ...previous, name: LARGER_NAMES[index], sizePx: roundTo(previous.sizePx * 1.25, 0.5), family: "display" });
  }
  return { families, steps };
}

export function deriveSpacing(samples: MeasureSample[]): Spacing {
  const total = samples.reduce((sum, sample) => sum + sample.count, 0) || 1;
  const gridFit = (unit: number) =>
    samples.reduce((sum, { px, count }) => sum + (Math.abs(px - roundTo(px, unit)) <= 0.5 ? count : 0), 0) / total;
  const baseUnitPx = gridFit(5) > gridFit(4) + 0.15 ? 5 : 4;
  const halfStep = baseUnitPx / 2;

  const snapped = new Map<number, number>();
  for (const { px, count } of samples) {
    const value = Math.max(halfStep, roundTo(px, halfStep));
    snapped.set(value, (snapped.get(value) ?? 0) + count);
  }
  for (const multiple of [1, 2, 4, 6, 8]) {
    if (snapped.size >= 4) break;
    if (!snapped.has(baseUnitPx * multiple)) snapped.set(baseUnitPx * multiple, 0);
  }

  const steps = [...snapped.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([px]) => ({ name: String(tidy(px / 4)), px }))
    .sort((a, b) => a.px - b.px);
  return { baseUnitPx, steps };
}

export function deriveRadii(samples: MeasureSample[]): MeasureStep[] {
  const total = samples.reduce((sum, sample) => sum + sample.count, 0) || 1;
  const pills = samples.filter((sample) => sample.px >= 999).reduce((sum, sample) => sum + sample.count, 0);
  const merged: MeasureSample[] = [];
  for (const sample of samples.filter((entry) => entry.px > 0 && entry.px < 999).sort((a, b) => b.count - a.count)) {
    const match = merged.find((entry) => Math.abs(entry.px - sample.px) <= 1);
    if (match) match.count += sample.count;
    else merged.push({ ...sample });
  }

  const kept = merged.slice(0, 4).sort((a, b) => a.px - b.px);
  const steps: MeasureStep[] = kept.map((entry, index) => ({ name: RADIUS_NAMES[kept.length][index], px: entry.px }));
  if (steps.length === 0) steps.push({ name: "none", px: 0 });
  if (pills / total >= 0.05) steps.push({ name: "full", px: 9999 });
  return steps;
}

function shadowDepth(value: string): number {
  const layers = value.replace(/\([^)]*\)/g, "").split(",");
  return Math.max(
    ...layers.map((layer) => {
      if (layer.includes("inset")) return 0;
      const [, offsetY = 0, blur = 0] = (layer.match(/-?[\d.]+px/g) ?? []).map(parseFloat);
      return Math.abs(offsetY) + blur;
    }),
  );
}

export function deriveShadows(samples: ShadowSample[]): ShadowStep[] {
  const kept = samples
    .map((sample) => ({ ...sample, depth: shadowDepth(sample.value) }))
    .filter((sample) => sample.depth > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .sort((a, b) => a.depth - b.depth);
  return kept.map((sample, index) => ({ name: SHADOW_NAMES[kept.length][index], value: sample.value }));
}
