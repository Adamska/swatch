import { SEMANTIC_COLOR_KEYS, type DesignSystemTokens, type SemanticColors } from "@/types/tokens";
import {
  banner,
  FONT_KEYS,
  FONT_ROLES,
  fontSizeValue,
  scalesOf,
  schemePair,
  toKebab,
  toRem,
  trimNumber,
} from "./shared";

const indent = (lines: string[]) => lines.map((line) => `  ${line}`).join("\n");
const colorLines = (colors: SemanticColors) => SEMANTIC_COLOR_KEYS.map((key) => `--color-${toKebab(key)}: ${colors[key]};`);

function themeGroups(tokens: DesignSystemTokens, options: { spacingList: boolean }): string[][] {
  const { colors, states, typography, spacing, radii, shadows } = tokens;
  const scales = Object.entries(scalesOf(colors)).flatMap(([role, stops]) =>
    Object.entries(stops).map(([stop, hex]) => `--color-${role}-${stop}: ${hex};`),
  );
  return [
    [...colorLines(colors), `--color-primary-hover: ${states.primaryHover};`, `--color-ring: ${states.focusRing};`],
    scales,
    FONT_ROLES.map((role) => `--font-${FONT_KEYS[role]}: ${typography.families[role]};`),
    typography.steps.flatMap((step) => [
      `--text-${step.name}: ${fontSizeValue(step)};`,
      `--text-${step.name}--line-height: ${trimNumber(step.lineHeight)};`,
      `--text-${step.name}--letter-spacing: ${trimNumber(step.letterSpacingEm)}em;`,
      `--text-${step.name}--font-weight: ${step.weight};`,
    ]),
    options.spacingList
      ? spacing.steps.map((step) => `--spacing-${step.name.replace(/\./g, "\\.")}: ${toRem(step.px)};`)
      : [`--spacing: 0.25rem;`],
    radii.map((step) => `--radius-${step.name}: ${toRem(step.px)};`),
    shadows.map((step) => `--shadow-${step.name}: ${step.value};`),
  ];
}

const joinGroups = (groups: string[][]) =>
  groups
    .filter((group) => group.length > 0)
    .map(indent)
    .join("\n\n");

export function toTailwindTheme(tokens: DesignSystemTokens): string {
  const pair = schemePair(tokens);
  const variant = pair.alternate;
  return [
    `/* ${banner(tokens)} */`,
    `@import "tailwindcss";`,
    ``,
    `@custom-variant ${variant} (&:where(.${variant}, .${variant} *));`,
    ``,
    `@theme {`,
    joinGroups(themeGroups(tokens, { spacingList: false })),
    `}`,
    ``,
    `.${variant} {`,
    indent(colorLines(pair.altColors)),
    `}`,
    ``,
  ].join("\n");
}

export function toCssVariables(tokens: DesignSystemTokens): string {
  const pair = schemePair(tokens);
  return [
    `/* ${banner(tokens)} */`,
    `:root {`,
    `  color-scheme: ${pair.base};`,
    joinGroups(themeGroups(tokens, { spacingList: true })),
    `}`,
    ``,
    `[data-theme="${pair.alternate}"] {`,
    `  color-scheme: ${pair.alternate};`,
    indent(colorLines(pair.altColors)),
    `}`,
    ``,
  ].join("\n");
}
