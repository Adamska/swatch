import { z } from "zod";
import { ColorUsageSchema, HexColorSchema } from "./extraction";

export * from "./extraction";

export const SEMANTIC_COLOR_KEYS = [
  "background",
  "surface",
  "foreground",
  "muted",
  "border",
  "primary",
  "primaryForeground",
  "secondary",
  "accent",
  "success",
  "warning",
  "danger",
] as const;

export const SemanticColorsSchema = z.object({
  background: HexColorSchema,
  surface: HexColorSchema,
  foreground: HexColorSchema,
  muted: HexColorSchema,
  border: HexColorSchema,
  primary: HexColorSchema,
  primaryForeground: HexColorSchema,
  secondary: HexColorSchema,
  accent: HexColorSchema,
  success: HexColorSchema,
  warning: HexColorSchema,
  danger: HexColorSchema,
});

export const InteractionStatesSchema = z.object({
  primaryHover: HexColorSchema,
  focusRing: HexColorSchema,
});

export const PaletteEntrySchema = z.object({
  hex: HexColorSchema,
  share: z.number().min(0).max(1),
  usage: ColorUsageSchema,
});

export const FontRoleSchema = z.enum(["display", "body", "mono"]);
export const TokenNameSchema = z.string().regex(/^[a-z0-9][a-z0-9.-]{0,15}$/, "Expected a short kebab-case name");

export const TypeStepSchema = z.object({
  name: TokenNameSchema,
  sizePx: z.number().min(6).max(200),
  fluidMinPx: z.number().min(6).max(200).nullable(),
  lineHeight: z.number().min(0.8).max(3),
  weight: z.number().int().min(100).max(900),
  letterSpacingEm: z.number().min(-0.2).max(0.5),
  family: FontRoleSchema,
});

export const TypographySchema = z.object({
  families: z.object({
    display: z.string().min(1).max(240),
    body: z.string().min(1).max(240),
    mono: z.string().min(1).max(240),
  }),
  steps: z.array(TypeStepSchema).min(3).max(12),
});

export const MeasureStepSchema = z.object({
  name: TokenNameSchema,
  px: z.number().min(0).max(9999),
});

export const SpacingSchema = z.object({
  baseUnitPx: z.number().min(1).max(16),
  steps: z.array(MeasureStepSchema).min(4).max(16),
});

export const ShadowStepSchema = z.object({
  name: TokenNameSchema,
  value: z.string().min(1).max(400),
});

export const DesignSystemTokensSchema = z.object({
  meta: z.object({
    name: z.string().min(1).max(60),
    sourceUrl: z.url(),
    method: z.enum(["deterministic", "ai"]),
    model: z.string().max(80).nullable(),
    generatedAt: z.iso.datetime(),
  }),
  colors: SemanticColorsSchema,
  altColors: SemanticColorsSchema.nullable(),
  altSource: z.enum(["extracted", "synthesized", "edited"]),
  states: InteractionStatesSchema,
  palette: z.array(PaletteEntrySchema).min(1).max(16),
  typography: TypographySchema,
  spacing: SpacingSchema,
  radii: z.array(MeasureStepSchema).min(1).max(7),
  shadows: z.array(ShadowStepSchema).max(5),
});

export type SemanticColorKey = (typeof SEMANTIC_COLOR_KEYS)[number];
export type SemanticColors = z.infer<typeof SemanticColorsSchema>;
export type InteractionStates = z.infer<typeof InteractionStatesSchema>;
export type PaletteEntry = z.infer<typeof PaletteEntrySchema>;
export type FontRole = z.infer<typeof FontRoleSchema>;
export type TypeStep = z.infer<typeof TypeStepSchema>;
export type Typography = z.infer<typeof TypographySchema>;
export type MeasureStep = z.infer<typeof MeasureStepSchema>;
export type Spacing = z.infer<typeof SpacingSchema>;
export type ShadowStep = z.infer<typeof ShadowStepSchema>;
export type DesignSystemTokens = z.infer<typeof DesignSystemTokensSchema>;
