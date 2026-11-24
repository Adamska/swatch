import { describe, expect, it } from "vitest";
import type { SampledDocument } from "@/lib/pageSampler";
import { mergeDocuments } from "@/lib/sampleMerge";

const document = (overrides: Partial<SampledDocument>): SampledDocument => ({
  title: "Entry",
  sampledNodes: 10,
  colors: [],
  typography: [],
  spacing: [],
  radii: [],
  shadows: [],
  ...overrides,
});

describe("mergeDocuments", () => {
  it("returns the entry page untouched when there is nothing to merge", () => {
    const entry = document({ spacing: [{ px: 8, count: 3 }] });
    expect(mergeDocuments(entry, [])).toBe(entry);
  });

  it("adds secondary pages at half weight and reorders by the merged weight", () => {
    const entry = document({
      colors: [{ hex: "#ffffff", alpha: 1, usage: "background", weight: 2 }],
      spacing: [{ px: 8, count: 4 }, { px: 16, count: 3 }],
    });
    const subpage = document({
      title: "Pricing",
      sampledNodes: 6,
      colors: [
        { hex: "#ffffff", alpha: 1, usage: "background", weight: 1 },
        { hex: "#0a5cff", alpha: 1, usage: "accent", weight: 6 },
      ],
      spacing: [{ px: 16, count: 4 }],
    });
    const merged = mergeDocuments(entry, [subpage]);

    expect(merged.title).toBe("Entry");
    expect(merged.sampledNodes).toBe(16);
    expect(merged.colors).toEqual([
      { hex: "#0a5cff", alpha: 1, usage: "accent", weight: 3 },
      { hex: "#ffffff", alpha: 1, usage: "background", weight: 2.5 },
    ]);
    expect(merged.spacing).toEqual([
      { px: 16, count: 5 },
      { px: 8, count: 4 },
    ]);
  });
});
