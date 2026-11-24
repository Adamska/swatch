import { SEMANTIC_COLOR_KEYS, type DesignSystemTokens, type FontRole } from "@/types/tokens";

export type ExportFormat = "tailwind" | "css" | "json";

export const EXPORT_FORMATS: { id: ExportFormat; label: string; filename: string }[] = [
  { id: "tailwind", label: "Tailwind", filename: "tailwind.config.js" },
  { id: "css", label: "CSS variables", filename: "tokens.css" },
  { id: "json", label: "JSON", filename: "tokens.json" },
];

const FONT_KEYS: Record<FontRole, string> = { display: "display", body: "sans", mono: "mono" };

const trimNumber = (value: number) => String(Math.round(value * 10000) / 10000);
const toRem = (px: number) => (px === 0 ? "0" : px >= 9999 ? "9999px" : `${trimNumber(px / 16)}rem`);
const toKebab = (key: string) => key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
const quote = (value: string) => JSON.stringify(value);
const escapeKey = (name: string) => name.replace(/\./g, "\\.");

export function splitFontStack(stack: string): string[] {
  return stack
    .split(",")
    .map((family) => family.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

function block(entries: [key: string, value: string][], indent: string): string {
  return entries.map(([key, value]) => `${indent}${/^[a-zA-Z_$][\w$]*$/.test(key) ? key : quote(key)}: ${value},`).join("\n");
}

export function toTailwindConfig(tokens: DesignSystemTokens): string {
  const { colors, typography, spacing, radii, shadows } = tokens;
  const pad = "        ";

  const colorEntries: [string, string][] = SEMANTIC_COLOR_KEYS.filter(
    (key) => key !== "primary" && key !== "primaryForeground",
  ).map((key) => [toKebab(key), quote(colors[key])]);
  colorEntries.splice(5, 0, [
    "primary",
    `{ DEFAULT: ${quote(colors.primary)}, foreground: ${quote(colors.primaryForeground)} }`,
  ]);

  const fontFamilies = (Object.keys(FONT_KEYS) as FontRole[]).map((role): [string, string] => [
    FONT_KEYS[role],
    `[${splitFontStack(typography.families[role]).map(quote).join(", ")}]`,
  ]);
  const fontSizes = typography.steps.map((step): [string, string] => [
    step.name,
    `[${quote(toRem(step.sizePx))}, { lineHeight: ${quote(trimNumber(step.lineHeight))}, letterSpacing: ${quote(
      `${trimNumber(step.letterSpacingEm)}em`,
    )}, fontWeight: ${quote(String(step.weight))} }]`,
  ]);

  const sections: [string, [string, string][]][] = [
    ["colors", colorEntries],
    ["fontFamily", fontFamilies],
    ["fontSize", fontSizes],
    ["spacing", spacing.steps.map((step) => [step.name, quote(toRem(step.px))])],
    ["borderRadius", radii.map((step) => [step.name, quote(toRem(step.px))])],
    ["boxShadow", shadows.map((step) => [step.name, quote(step.value)])],
  ];
  const theme = sections
    .filter(([, entries]) => entries.length > 0)
    .map(([name, entries]) => `      ${name}: {\n${block(entries, pad)}\n      },`)
    .join("\n");

  return [
    `// ${tokens.meta.name} — extracted from ${tokens.meta.sourceUrl}`,
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

export function toCssVariables(tokens: DesignSystemTokens): string {
  const { colors, typography, spacing, radii, shadows } = tokens;
  const groups: string[][] = [
    SEMANTIC_COLOR_KEYS.map((key) => `--color-${toKebab(key)}: ${colors[key]};`),
    (Object.keys(FONT_KEYS) as FontRole[]).map((role) => `--font-${FONT_KEYS[role]}: ${typography.families[role]};`),
    typography.steps.flatMap((step) => [
      `--text-${step.name}: ${toRem(step.sizePx)};`,
      `--text-${step.name}--line-height: ${trimNumber(step.lineHeight)};`,
      `--text-${step.name}--letter-spacing: ${trimNumber(step.letterSpacingEm)}em;`,
      `--text-${step.name}--font-weight: ${step.weight};`,
    ]),
    spacing.steps.map((step) => `--spacing-${escapeKey(step.name)}: ${toRem(step.px)};`),
    radii.map((step) => `--radius-${step.name}: ${toRem(step.px)};`),
    shadows.map((step) => `--shadow-${step.name}: ${step.value};`),
  ];

  const body = groups
    .filter((group) => group.length > 0)
    .map((group) => group.map((line) => `  ${line}`).join("\n"))
    .join("\n\n");
  return `/* ${tokens.meta.name} — extracted from ${tokens.meta.sourceUrl} */\n:root {\n${body}\n}\n`;
}

export function toTokensJson(tokens: DesignSystemTokens): string {
  const { colors, typography, spacing, radii, shadows } = tokens;
  return `${JSON.stringify({ name: tokens.meta.name, source: tokens.meta.sourceUrl, colors, typography, spacing, radii, shadows }, null, 2)}\n`;
}

export function exportTokens(tokens: DesignSystemTokens, format: ExportFormat): string {
  if (format === "css") return toCssVariables(tokens);
  if (format === "json") return toTokensJson(tokens);
  return toTailwindConfig(tokens);
}
