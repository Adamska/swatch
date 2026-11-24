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
