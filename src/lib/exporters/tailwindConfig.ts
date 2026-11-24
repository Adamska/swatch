import { SEMANTIC_COLOR_KEYS, type DesignSystemTokens, type TypeStep } from "@/types/tokens";
import {
  banner,
  FONT_KEYS,
  FONT_ROLES,
  fontSizeValue,
  quote,
  SCALE_ROLES,
  scalesOf,
  splitFontStack,
  toKebab,
  toRem,
  trimNumber,
  type ScaleRole,
} from "./shared";

type Entry = [key: string, value: string];

const keyOf = (key: string) => (/^[a-zA-Z_$][\w$]*$/.test(key) ? key : quote(key));
const object = (entries: Entry[]) => `{ ${entries.map(([key, value]) => `${keyOf(key)}: ${value}`).join(", ")} }`;
const block = (entries: Entry[], indent: string) => entries.map(([key, value]) => `${indent}${keyOf(key)}: ${value},`).join("\n");

export function toTailwindConfig(tokens: DesignSystemTokens): string {
  const { colors, states, typography, spacing, radii, shadows } = tokens;
  const scales = scalesOf(colors);
  const scaleEntries = (role: ScaleRole): Entry[] => Object.entries(scales[role]).map(([stop, hex]) => [stop, quote(hex)]);
  const scaled = new Set<string>(SCALE_ROLES);

  const primary: Entry[] = [
    ["DEFAULT", quote(colors.primary)],
    ["foreground", quote(colors.primaryForeground)],
    ["hover", quote(states.primaryHover)],
    ...scaleEntries("primary"),
  ];
  const colorEntries: Entry[] = SEMANTIC_COLOR_KEYS.filter((key) => key !== "primaryForeground").map((key) => {
    if (key === "primary") return ["primary", object(primary)];
    if (scaled.has(key)) return [key, object([["DEFAULT", quote(colors[key])], ...scaleEntries(key as ScaleRole)])];
    return [toKebab(key), quote(colors[key])];
  });
  const fontSize = (step: TypeStep): string => {
    const metrics: Entry[] = [
      ["lineHeight", quote(trimNumber(step.lineHeight))],
      ["letterSpacing", quote(`${trimNumber(step.letterSpacingEm)}em`)],
      ["fontWeight", quote(String(step.weight))],
    ];
    return `[${quote(fontSizeValue(step))}, ${object(metrics)}]`;
  };
  colorEntries.push(["ring", quote(states.focusRing)], ["neutral", object(scaleEntries("neutral"))]);

  const fontFamilies = FONT_ROLES.map((role): Entry => [
    FONT_KEYS[role],
    `[${splitFontStack(typography.families[role]).map(quote).join(", ")}]`,
  ]);

  const sections: [string, Entry[]][] = [
    ["colors", colorEntries],
    ["fontFamily", fontFamilies],
    ["fontSize", typography.steps.map((step) => [step.name, fontSize(step)])],
    ["spacing", spacing.steps.map((step) => [step.name, quote(toRem(step.px))])],
    ["borderRadius", radii.map((step) => [step.name, quote(toRem(step.px))])],
    ["boxShadow", shadows.map((step) => [step.name, quote(step.value)])],
  ];
  const theme = sections
    .filter(([, entries]) => entries.length > 0)
    .map(([name, entries]) => `      ${name}: {\n${block(entries, "        ")}\n      },`)
    .join("\n");

  return [
    `// ${banner(tokens)}`,
    `// Alternate color scheme values ship in the CSS variables and Tailwind v4 exports.`,
    `/** @type {import('tailwindcss').Config} */`,
    `module.exports = {`,
    `  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],`,
    `  theme: {`,
    `    extend: {`,
    theme,
    `    },`,
    `  },`,
    `  plugins: [],`,
    `};`,
    ``,
  ].join("\n");
}
