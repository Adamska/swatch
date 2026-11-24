import type { SampledDocument } from "./pageSampler";

type Keyed<T> = (item: T) => string;

function mergeInto<T>(target: Map<string, T>, items: T[], key: Keyed<T>, scale: (item: T, factor: number) => T, add: (a: T, b: T) => T, factor: number) {
  for (const item of items) {
    const id = key(item);
    const scaled = scale(item, factor);
    const existing = target.get(id);
    target.set(id, existing ? add(existing, scaled) : scaled);
  }
}

const round = (value: number) => Math.round(value * 1000) / 1000;

/** Folds secondary pages into the primary sample at a reduced weight so the entry page stays dominant. */
export function mergeDocuments(primary: SampledDocument, extras: SampledDocument[], extraWeight = 0.5): SampledDocument {
  if (extras.length === 0) return primary;
  const documents: [SampledDocument, number][] = [[primary, 1], ...extras.map((doc): [SampledDocument, number] => [doc, extraWeight])];

  const colors = new Map<string, SampledDocument["colors"][number]>();
  const typography = new Map<string, SampledDocument["typography"][number]>();
  const spacing = new Map<string, SampledDocument["spacing"][number]>();
  const radii = new Map<string, SampledDocument["radii"][number]>();
  const shadows = new Map<string, SampledDocument["shadows"][number]>();

  for (const [doc, factor] of documents) {
    mergeInto(colors, doc.colors, (c) => `${c.usage}|${c.hex}|${c.alpha}`, (c, f) => ({ ...c, weight: c.weight * f }), (a, b) => ({ ...a, weight: a.weight + b.weight }), factor);
    mergeInto(typography, doc.typography, (t) => [t.family, t.sizePx, t.weight, t.lineHeight, t.letterSpacingEm, t.role].join("|"), (t, f) => ({ ...t, count: t.count * f }), (a, b) => ({ ...a, count: a.count + b.count }), factor);
    mergeInto(spacing, doc.spacing, (m) => String(m.px), (m, f) => ({ ...m, count: m.count * f }), (a, b) => ({ ...a, count: a.count + b.count }), factor);
    mergeInto(radii, doc.radii, (m) => String(m.px), (m, f) => ({ ...m, count: m.count * f }), (a, b) => ({ ...a, count: a.count + b.count }), factor);
    mergeInto(shadows, doc.shadows, (s) => s.value, (s, f) => ({ ...s, count: s.count * f }), (a, b) => ({ ...a, count: a.count + b.count }), factor);
  }

  const top = <T extends { count: number }>(bucket: Map<string, T>, limit: number) =>
    [...bucket.values()].sort((a, b) => b.count - a.count).slice(0, limit).map((item) => ({ ...item, count: round(item.count) }));

  return {
    title: primary.title,
    sampledNodes: documents.reduce((sum, [doc]) => sum + doc.sampledNodes, 0),
    colors: [...colors.values()].sort((a, b) => b.weight - a.weight).slice(0, 240).map((c) => ({ ...c, weight: round(c.weight) })),
    typography: top(typography, 120),
    spacing: top(spacing, 80),
    radii: top(radii, 40),
    shadows: top(shadows, 24),
  };
}
