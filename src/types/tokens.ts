import { z } from "zod";

export const HexColorSchema = z
  .string()
  .regex(/^#[0-9a-f]{6}$/, "Expected a lowercase six-digit hex color");

export const ColorUsageSchema = z.enum(["background", "text", "border", "accent"]);
export const TypeRoleSchema = z.enum(["heading", "body", "control", "code"]);

export const ColorSampleSchema = z.object({
  hex: HexColorSchema,
  alpha: z.number().min(0).max(1),
  usage: ColorUsageSchema,
  weight: z.number().nonnegative(),
});

export const TypeSampleSchema = z.object({
  family: z.string().min(1).max(240),
  sizePx: z.number().positive().max(400),
  weight: z.number().int().min(1).max(1000),
  lineHeight: z.number().positive().max(4),
  letterSpacingEm: z.number().min(-0.5).max(1),
  role: TypeRoleSchema,
  count: z.number().positive(),
});

export const MeasureSampleSchema = z.object({
  px: z.number().nonnegative().max(10000),
  count: z.number().positive(),
});

export const ShadowSampleSchema = z.object({
  value: z.string().min(1).max(400),
  count: z.number().positive(),
});

export const ExtractionSourceSchema = z.object({
  url: z.url(),
  title: z.string().max(200),
  capturedAt: z.iso.datetime(),
  durationMs: z.number().nonnegative(),
  sampledNodes: z.number().int().nonnegative(),
  origin: z.enum(["live", "sample"]),
});

export const RawExtractionSchema = z.object({
  source: ExtractionSourceSchema,
  colors: z.array(ColorSampleSchema).max(240),
  typography: z.array(TypeSampleSchema).max(120),
  spacing: z.array(MeasureSampleSchema).max(80),
  radii: z.array(MeasureSampleSchema).max(40),
  shadows: z.array(ShadowSampleSchema).max(24),
});

export type ColorUsage = z.infer<typeof ColorUsageSchema>;
export type TypeRole = z.infer<typeof TypeRoleSchema>;
export type ColorSample = z.infer<typeof ColorSampleSchema>;
export type TypeSample = z.infer<typeof TypeSampleSchema>;
export type MeasureSample = z.infer<typeof MeasureSampleSchema>;
export type ShadowSample = z.infer<typeof ShadowSampleSchema>;
export type ExtractionSource = z.infer<typeof ExtractionSourceSchema>;
export type RawExtraction = z.infer<typeof RawExtractionSchema>;

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

export const PaletteEntrySchema = z.object({
  hex: HexColorSchema,
  share: z.number().min(0).max(1),
  usage: ColorUsageSchema,
});

export const FontRoleSchema = z.enum(["display", "body", "mono"]);
const TokenNameSchema = z.string().regex(/^[a-z0-9][a-z0-9.-]{0,15}$/, "Expected a short kebab-case name");

export const TypeStepSchema = z.object({
  name: TokenNameSchema,
  sizePx: z.number().min(6).max(200),
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
  palette: z.array(PaletteEntrySchema).min(1).max(16),
  typography: TypographySchema,
  spacing: SpacingSchema,
  radii: z.array(MeasureStepSchema).min(1).max(7),
  shadows: z.array(ShadowStepSchema).max(5),
});

export type SemanticColorKey = (typeof SEMANTIC_COLOR_KEYS)[number];
export type SemanticColors = z.infer<typeof SemanticColorsSchema>;
export type PaletteEntry = z.infer<typeof PaletteEntrySchema>;
export type FontRole = z.infer<typeof FontRoleSchema>;
export type TypeStep = z.infer<typeof TypeStepSchema>;
export type Typography = z.infer<typeof TypographySchema>;
export type MeasureStep = z.infer<typeof MeasureStepSchema>;
export type Spacing = z.infer<typeof SpacingSchema>;
export type ShadowStep = z.infer<typeof ShadowStepSchema>;
export type DesignSystemTokens = z.infer<typeof DesignSystemTokensSchema>;

const DraftMeasureSchema = z.object({ name: z.string(), px: z.number() });

export const AiTokenDraftSchema = z.object({
  name: z.string().describe("Short human name for the design system, at most four words"),
  colors: z.object({
    background: z.string(),
    surface: z.string(),
    foreground: z.string(),
    muted: z.string(),
    border: z.string(),
    primary: z.string(),
    primaryForeground: z.string(),
    secondary: z.string(),
    accent: z.string(),
    success: z.string(),
    warning: z.string(),
    danger: z.string(),
  }),
  typography: z.object({
    families: z.object({ display: z.string(), body: z.string(), mono: z.string() }),
    steps: z.array(
      z.object({
        name: z.string(),
        sizePx: z.number(),
        lineHeight: z.number(),
        weight: z.number(),
        letterSpacingEm: z.number(),
        family: FontRoleSchema,
      }),
    ),
  }),
  spacing: z.object({ baseUnitPx: z.number(), steps: z.array(DraftMeasureSchema) }),
  radii: z.array(DraftMeasureSchema),
  shadows: z.array(z.object({ name: z.string(), value: z.string() })),
});

export type AiTokenDraft = z.infer<typeof AiTokenDraftSchema>;
