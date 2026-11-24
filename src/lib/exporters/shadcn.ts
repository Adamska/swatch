import { contrastRatio } from "@/lib/color";
import { scaleRecord } from "@/lib/colorScale";
import { pickRadius } from "@/lib/tokenStyle";
import type { DesignSystemTokens, SemanticColors } from "@/types/tokens";
import { banner, schemePair, toOklchCss, toRem } from "./shared";

type Variables = [name: string, hex: string][];

/** A soft tinted fill and its readable ink, the way shadcn/ui uses secondary and accent. */
function tint(hex: string, isDark: boolean): [fill: string, ink: string] {
  const scale = scaleRecord(hex);
  const fill = isDark ? scale[900] : scale[100];
  const ink = isDark ? scale[100] : scale[900];
  return contrastRatio(fill, ink) >= 4.5 ? [fill, ink] : [fill, isDark ? "#ffffff" : "#000000"];
}

function schemeVariables(colors: SemanticColors, ring: string, isDark: boolean): Variables {
  const [secondary, secondaryInk] = tint(colors.secondary, isDark);
  const [accent, accentInk] = tint(colors.accent, isDark);
  return [
    ["background", colors.background],
    ["foreground", colors.foreground],
    ["card", colors.surface],
    ["card-foreground", colors.foreground],
    ["popover", colors.background],
    ["popover-foreground", colors.foreground],
    ["primary", colors.primary],
    ["primary-foreground", colors.primaryForeground],
    ["secondary", secondary],
    ["secondary-foreground", secondaryInk],
    ["muted", colors.surface],
    ["muted-foreground", colors.muted],
    ["accent", accent],
    ["accent-foreground", accentInk],
    ["destructive", colors.danger],
    ["border", colors.border],
    ["input", colors.border],
    ["ring", ring],
    ["chart-1", colors.primary],
    ["chart-2", colors.secondary],
    ["chart-3", colors.accent],
    ["chart-4", colors.success],
    ["chart-5", colors.warning],
    ["sidebar", colors.surface],
    ["sidebar-foreground", colors.foreground],
    ["sidebar-primary", colors.primary],
    ["sidebar-primary-foreground", colors.primaryForeground],
    ["sidebar-accent", accent],
    ["sidebar-accent-foreground", accentInk],
    ["sidebar-border", colors.border],
    ["sidebar-ring", ring],
  ];
}

const render = (variables: Variables) => variables.map(([name, hex]) => `  --${name}: ${toOklchCss(hex)};`).join("\n");

export function toShadcnTheme(tokens: DesignSystemTokens): string {
  const pair = schemePair(tokens);
  const lightRing = pair.base === "light" ? tokens.states.focusRing : pair.light.primary;
  const darkRing = pair.base === "dark" ? tokens.states.focusRing : pair.dark.primary;
  return [
    `/* ${banner(tokens)}`,
    `   shadcn/ui theme. Replace the :root and .dark blocks in your globals.css. */`,
    ``,
    `:root {`,
    `  --radius: ${toRem(pickRadius(tokens.radii, "control"))};`,
    render(schemeVariables(pair.light, lightRing, false)),
    `}`,
    ``,
    `.dark {`,
    render(schemeVariables(pair.dark, darkRing, true)),
    `}`,
    ``,
  ].join("\n");
}
