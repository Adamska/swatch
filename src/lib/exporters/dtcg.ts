import { hexToRgbUnit, normalizeHex } from "@/lib/color";
import { SEMANTIC_COLOR_KEYS, type DesignSystemTokens, type SemanticColors } from "@/types/tokens";
import { FONT_KEYS, FONT_ROLES, scalesOf, schemePair, splitFontStack } from "./shared";

type Group = { [key: string]: Group | Token };
interface Token {
  $type: string;
  $value: unknown;
}

const round = (value: number) => Math.round(value * 10000) / 10000;
const safeName = (name: string) => name.replace(/\./g, "_");

function colorValue(hex: string, alpha = 1) {
  const value: Record<string, unknown> = { colorSpace: "srgb", components: hexToRgbUnit(hex).map(round), hex };
  if (alpha < 1) value.alpha = round(alpha);
  return value;
}

const color = (hex: string): Token => ({ $type: "color", $value: colorValue(hex) });
const dimension = (value: number, unit: "px" | "rem" | "em"): { value: number; unit: string } => ({ value: round(value), unit });

function parseCssColor(input: string): { hex: string; alpha: number } | null {
  const rgb = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/.exec(input);
  if (rgb) {
    const hex = `#${[rgb[1], rgb[2], rgb[3]].map((channel) => Math.round(Number(channel)).toString(16).padStart(2, "0")).join("")}`;
    return { hex, alpha: rgb[4] === undefined ? 1 : Number(rgb[4]) };
  }
  const hex = normalizeHex(/#[0-9a-f]{3,6}\b/i.exec(input)?.[0] ?? "");
  return hex ? { hex, alpha: 1 } : null;
}

/** Splits a computed box-shadow into DTCG shadow layers. Layers without a parsable color are skipped. */
export function parseShadow(value: string) {
  const layers = value.split(/,(?![^(]*\))/);
  return layers.flatMap((layer) => {
    const parsed = parseCssColor(layer);
    if (!parsed) return [];
    const [offsetX = 0, offsetY = 0, blur = 0, spread = 0] = (layer.replace(/\([^)]*\)/g, "").match(/-?[\d.]+px/g) ?? []).map(parseFloat);
    return [
      {
        color: colorValue(parsed.hex, parsed.alpha),
        offsetX: dimension(offsetX, "px"),
        offsetY: dimension(offsetY, "px"),
        blur: dimension(blur, "px"),
        spread: dimension(spread, "px"),
        inset: /\binset\b/.test(layer),
      },
    ];
  });
}

const colorGroup = (colors: SemanticColors): Group =>
  Object.fromEntries(SEMANTIC_COLOR_KEYS.map((key) => [key, color(colors[key])]));

export function toDesignTokens(tokens: DesignSystemTokens): string {
  const pair = schemePair(tokens);
  const scales: Group = Object.fromEntries(
    Object.entries(scalesOf(tokens.colors)).map(([role, stops]) => [
      role,
      Object.fromEntries(Object.entries(stops).map(([stop, hex]) => [stop, color(hex)])),
    ]),
  );

  const document: Group = {
    color: { ...colorGroup(tokens.colors), "primary-hover": color(tokens.states.primaryHover), ring: color(tokens.states.focusRing) },
    [`color-${pair.alternate}`]: colorGroup(pair.altColors),
    scale: scales,
    font: Object.fromEntries(
      FONT_ROLES.map((role) => [FONT_KEYS[role], { $type: "fontFamily", $value: splitFontStack(tokens.typography.families[role]) }]),
    ),
    typography: Object.fromEntries(
      tokens.typography.steps.map((step) => [
        step.name,
        {
          $type: "typography",
          $value: {
            fontFamily: `{font.${FONT_KEYS[step.family]}}`,
            fontSize: dimension(step.sizePx / 16, "rem"),
            fontWeight: step.weight,
            letterSpacing: dimension(step.letterSpacingEm, "em"),
            lineHeight: step.lineHeight,
          },
        },
      ]),
    ),
    spacing: Object.fromEntries(
      tokens.spacing.steps.map((step) => [safeName(step.name), { $type: "dimension", $value: dimension(step.px, "px") }]),
    ),
    radius: Object.fromEntries(tokens.radii.map((step) => [step.name, { $type: "dimension", $value: dimension(step.px, "px") }])),
    shadow: Object.fromEntries(tokens.shadows.map((step) => [step.name, { $type: "shadow", $value: parseShadow(step.value) }])),
  };
  return `${JSON.stringify({ $description: `${tokens.meta.name} — extracted from ${tokens.meta.sourceUrl}`, ...document }, null, 2)}\n`;
}
