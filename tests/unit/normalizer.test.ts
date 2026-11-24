import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/color";
import { SAMPLE_PROFILES } from "@/lib/samples";
import { normalizeDeterministic } from "@/lib/tokenNormalizer";
import { DesignSystemTokensSchema } from "@/types/tokens";
import { FIXTURE_NAMES, loadFixture } from "./fixtures";

/** Values observed in the captures taken on 2026-11-24, kept as regression anchors. */
const EXPECTED: Record<(typeof FIXTURE_NAMES)[number], { name: string; primary: string; base: number }> = {
  stripe: { name: "Stripe", primary: "#533afd", base: 16 },
  github: { name: "GitHub", primary: "#08872b", base: 16 },
  tailwindcss: { name: "Tailwind CSS", primary: "#00a6f4", base: 14 },
  linear: { name: "Linear", primary: "#e4f222", base: 15 },
};

describe("normalizeDeterministic on live captures", () => {
  it.each(FIXTURE_NAMES)("resolves %s into a valid, readable system", (name) => {
    const tokens = normalizeDeterministic(loadFixture(name));
    expect(DesignSystemTokensSchema.safeParse(tokens).success).toBe(true);
    expect(tokens.meta.name).toBe(EXPECTED[name].name);
    expect(tokens.colors.primary).toBe(EXPECTED[name].primary);
    expect(tokens.typography.steps.find((step) => step.name === "base")?.sizePx).toBe(EXPECTED[name].base);
    expect(contrastRatio(tokens.colors.foreground, tokens.colors.background)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(tokens.colors.primaryForeground, tokens.colors.primary)).toBeGreaterThanOrEqual(3);
    const sizes = tokens.typography.steps.map((step) => step.sizePx);
    expect(sizes).toEqual([...sizes].sort((a, b) => a - b));
  });

  it("uses an observed hover state when the probe found one for the primary control", () => {
    expect(normalizeDeterministic(loadFixture("stripe")).states.primaryHover).toBe("#4032c8");
  });

  it("is deterministic for authored samples", () => {
    for (const profile of SAMPLE_PROFILES) {
      const first = normalizeDeterministic(profile.extraction);
      const second = normalizeDeterministic(profile.extraction);
      expect({ ...second, meta: { ...second.meta, generatedAt: "" } }).toEqual({ ...first, meta: { ...first.meta, generatedAt: "" } });
    }
  });

  it("accepts an extracted dark scheme only when it flips the ground", () => {
    const northwind = SAMPLE_PROFILES.find((profile) => profile.id === "northwind-ledger");
    expect(northwind && normalizeDeterministic(northwind.extraction).altSource).toBe("extracted");
  });
});
