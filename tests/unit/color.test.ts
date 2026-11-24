import { describe, expect, it } from "vitest";
import { contrastRatio, fromOklchInGamut, hueDistance, toOklch } from "@/lib/color";
import { buildTonalScale, ensureContrast, SCALE_STOPS } from "@/lib/colorScale";
import { fluidClamp } from "@/lib/fluidType";
import { synthesizeOppositeScheme } from "@/lib/schemes";
import { normalizeDeterministic } from "@/lib/tokenNormalizer";
import { SAMPLE_PROFILES } from "@/lib/samples";

describe("contrast", () => {
  it("matches the WCAG extremes", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
  });

  it.each([
    ["#e2b34a", "#f4efe6"],
    ["#ff80d2", "#ffffff"],
    ["#232a36", "#0b0d11"],
    ["#ffff00", "#ffffff"],
  ])("lifts %s on %s to AA while keeping its hue", (ink, ground) => {
    const lifted = ensureContrast(ink, ground, 4.5);
    expect(contrastRatio(lifted, ground)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(lifted, ground)).toBeLessThan(5.2);
    if (toOklch(ink).c > 0.05) expect(hueDistance(toOklch(lifted).h, toOklch(ink).h)).toBeLessThan(12);
  });

  it("leaves passing colors untouched", () => {
    expect(ensureContrast("#0b1f33", "#ffffff")).toBe("#0b1f33");
  });
});

describe("tonal scales", () => {
  it.each(["#0a5cff", "#c8402a", "#b4f461", "#55657a", "#000000", "#ffffff"])("keeps %s verbatim and orders lightness", (hex) => {
    const tiles = buildTonalScale(hex);
    expect(tiles.map((tile) => tile.stop)).toEqual([...SCALE_STOPS]);
    expect(tiles.filter((tile) => tile.isSource).map((tile) => tile.hex)).toEqual([hex]);
    const lightness = tiles.map((tile) => toOklch(tile.hex).l);
    for (let index = 1; index < lightness.length; index += 1) expect(lightness[index]).toBeLessThan(lightness[index - 1] + 0.005);
    for (const tile of tiles) expect(tile.hex).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("clips chroma into the sRGB gamut instead of clamping channels", () => {
    expect(fromOklchInGamut({ l: 0.9, c: 0.4, h: 140 })).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("schemes and fluid type", () => {
  it.each(SAMPLE_PROFILES.map((profile) => [profile.id, profile] as const))("synthesizes a readable opposite scheme for %s", (_, profile) => {
    const alternate = synthesizeOppositeScheme(normalizeDeterministic(profile.extraction).colors);
    expect(contrastRatio(alternate.foreground, alternate.background)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(alternate.muted, alternate.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(alternate.primary, alternate.background)).toBeGreaterThanOrEqual(3);
  });

  it("builds a clamp between the mobile and desktop sizes", () => {
    const step = { name: "3xl", sizePx: 48, fluidMinPx: 32, lineHeight: 1.1, weight: 600, letterSpacingEm: 0, family: "display" as const };
    expect(fluidClamp(step)).toBe("clamp(2rem, 1.629rem + 1.52vw, 3rem)");
    expect(fluidClamp({ ...step, fluidMinPx: null })).toBeNull();
  });
});
