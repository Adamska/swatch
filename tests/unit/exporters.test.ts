import { describe, expect, it } from "vitest";
import { parseShadow } from "@/lib/exporters/dtcg";
import { SAMPLE_PROFILES } from "@/lib/samples";
import { EXPORT_FORMATS, exportTokens } from "@/lib/tailwindExporter";
import { normalizeDeterministic } from "@/lib/tokenNormalizer";

const systems = SAMPLE_PROFILES.map((profile) => [profile.id, normalizeDeterministic(profile.extraction)] as const);

function evaluateConfig(source: string): { theme: { extend: Record<string, Record<string, unknown>> } } {
  const container = { exports: {} as unknown };
  new Function("module", source)(container);
  return container.exports as { theme: { extend: Record<string, Record<string, unknown>> } };
}

describe("exporters", () => {
  it.each(systems)("emits a loadable Tailwind v3 config for %s", (_, tokens) => {
    const config = evaluateConfig(exportTokens(tokens, "tailwind"));
    const primary = config.theme.extend.colors.primary as Record<string, string>;
    expect(primary.DEFAULT).toBe(tokens.colors.primary);
    expect(primary.hover).toBe(tokens.states.primaryHover);
    expect(Object.keys(primary)).toEqual(expect.arrayContaining(["50", "500", "950"]));
    expect(Object.keys(config.theme.extend.fontSize)).toEqual(tokens.typography.steps.map((step) => step.name));
  });

  it.each(systems)("writes both schemes for shadcn/ui and Tailwind v4 for %s", (_, tokens) => {
    const shadcn = exportTokens(tokens, "shadcn");
    expect(shadcn.match(/^ {2}--[\w-]+: oklch\([^)]*\);$/gm)?.length).toBe(62);
    expect(shadcn).toContain(":root {");
    expect(shadcn).toContain(".dark {");

    const theme = exportTokens(tokens, "theme");
    expect(theme).toMatch(/@custom-variant (dark|light) /);
    expect(theme).toContain(`--color-primary: ${tokens.colors.primary};`);
    expect(theme).toContain("--color-primary-500:");
  });

  it.each(systems)("produces W3C design tokens JSON for %s", (_, tokens) => {
    const document = JSON.parse(exportTokens(tokens, "dtcg")) as Record<string, Record<string, { $type: string; $value: { hex?: string } }>>;
    expect(document.color.primary).toMatchObject({ $type: "color", $value: { colorSpace: "srgb", hex: tokens.colors.primary } });
    for (const key of Object.keys(document.spacing)) expect(key).not.toContain(".");
  });

  it("registers a filename and renderer for every format", () => {
    const [, tokens] = systems[0];
    for (const format of EXPORT_FORMATS) {
      expect(format.filename).toMatch(/\.(js|css|json)$/);
      expect(exportTokens(tokens, format.id).length).toBeGreaterThan(200);
    }
  });

  it("parses multi-layer computed shadows", () => {
    const layers = parseShadow("rgba(11, 31, 51, 0.08) 0px 4px 12px -2px, rgba(11, 31, 51, 0.04) 0px 2px 4px -2px inset");
    expect(layers).toHaveLength(2);
    expect(layers[0]).toMatchObject({ offsetY: { value: 4, unit: "px" }, blur: { value: 12 }, spread: { value: -2 }, inset: false });
    expect(layers[0].color).toMatchObject({ hex: "#0b1f33", alpha: 0.08 });
    expect(layers[1].inset).toBe(true);
  });
});
