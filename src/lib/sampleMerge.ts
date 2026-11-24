import type { SampledDocument } from "./pageSampler";

const round = (value: number) => Math.round(value * 1000) / 1000;

/**
 * Sums items that share a key, scaling each document's contribution by its factor.
 * `measure` names the numeric field that carries the weight.
 */
function mergeWeighted<T, K extends keyof T>(
  sources: [items: T[], factor: number][],
  key: (item: T) => string,
  measure: K,
  limit: number,
): T[] {
  const totals = new Map<string, T>();
  for (const [items, factor] of sources) {
    for (const item of items) {
      const id = key(item);
      const weight = (item[measure] as number) * factor;
      const existing = totals.get(id);
      totals.set(id, { ...(existing ?? item), [measure]: ((existing?.[measure] as number | undefined) ?? 0) + weight });
    }
  }
  return [...totals.values()]
    .sort((a, b) => (b[measure] as number) - (a[measure] as number))
    .slice(0, limit)
    .map((item) => ({ ...item, [measure]: round(item[measure] as number) }));
}

/** Folds secondary pages into the primary sample at a reduced weight so the entry page stays dominant. */
export function mergeDocuments(primary: SampledDocument, extras: SampledDocument[], extraWeight = 0.5): SampledDocument {
  if (extras.length === 0) return primary;
  const documents: [SampledDocument, number][] = [[primary, 1], ...extras.map((doc): [SampledDocument, number] => [doc, extraWeight])];
  const pick = <T>(select: (doc: SampledDocument) => T[]) =>
    documents.map(([doc, factor]): [T[], number] => [select(doc), factor]);

  return {
    title: primary.title,
    sampledNodes: documents.reduce((sum, [doc]) => sum + doc.sampledNodes, 0),
    colors: mergeWeighted(pick((doc) => doc.colors), (c) => `${c.usage}|${c.hex}|${c.alpha}`, "weight", 240),
    typography: mergeWeighted(
      pick((doc) => doc.typography),
      (t) => [t.family, t.sizePx, t.weight, t.lineHeight, t.letterSpacingEm, t.role].join("|"),
      "count",
      120,
    ),
    spacing: mergeWeighted(pick((doc) => doc.spacing), (m) => String(m.px), "count", 80),
    radii: mergeWeighted(pick((doc) => doc.radii), (m) => String(m.px), "count", 40),
    shadows: mergeWeighted(pick((doc) => doc.shadows), (s) => s.value, "count", 24),
  };
}
