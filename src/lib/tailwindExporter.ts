import type { DesignSystemTokens } from "@/types/tokens";
import { toDesignTokens } from "./exporters/dtcg";
import { toShadcnTheme } from "./exporters/shadcn";
import { toTailwindConfig } from "./exporters/tailwindConfig";
import { toCssVariables, toTailwindTheme } from "./exporters/themeCss";

export type ExportFormat = "tailwind" | "theme" | "css" | "shadcn" | "dtcg";

export interface ExportFormatInfo {
  id: ExportFormat;
  label: string;
  filename: string;
  mime: string;
}

export const EXPORT_FORMATS: ExportFormatInfo[] = [
  { id: "tailwind", label: "Tailwind v3", filename: "tailwind.config.js", mime: "text/javascript" },
  { id: "theme", label: "Tailwind v4", filename: "theme.css", mime: "text/css" },
  { id: "css", label: "CSS variables", filename: "tokens.css", mime: "text/css" },
  { id: "shadcn", label: "shadcn/ui", filename: "shadcn-theme.css", mime: "text/css" },
  { id: "dtcg", label: "Design Tokens", filename: "tokens.json", mime: "application/json" },
];

const RENDERERS: Record<ExportFormat, (tokens: DesignSystemTokens) => string> = {
  tailwind: toTailwindConfig,
  theme: toTailwindTheme,
  css: toCssVariables,
  shadcn: toShadcnTheme,
  dtcg: toDesignTokens,
};

export { toCssVariables, toDesignTokens, toShadcnTheme, toTailwindConfig, toTailwindTheme };

export function exportTokens(tokens: DesignSystemTokens, format: ExportFormat): string {
  return RENDERERS[format](tokens);
}
