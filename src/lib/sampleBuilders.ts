import type {
  ColorSample,
  MeasureSample,
  RawExtraction,
  ShadowSample,
  TypeRole,
  TypeSample,
} from "@/types/tokens";

export interface SampleProfile {
  id: string;
  label: string;
  descriptor: string;
  extraction: RawExtraction;
}

export const fill = (hex: string, weight: number, alpha = 1): ColorSample => ({
  hex,
  alpha,
  usage: "background",
  weight,
});

export const ink = (hex: string, weight: number): ColorSample => ({
  hex,
  alpha: 1,
  usage: "text",
  weight,
});

export const rule = (hex: string, weight: number, alpha = 1): ColorSample => ({
  hex,
  alpha,
  usage: "border",
  weight,
});

export const action = (hex: string, weight: number): ColorSample => ({
  hex,
  alpha: 1,
  usage: "accent",
  weight,
});

export const face = (
  role: TypeRole,
  family: string,
  sizePx: number,
  weight: number,
  lineHeight: number,
  count: number,
  letterSpacingEm = 0,
): TypeSample => ({ family, sizePx, weight, lineHeight, letterSpacingEm, role, count });

export const measures = (pairs: [px: number, count: number][]): MeasureSample[] =>
  pairs.map(([px, count]) => ({ px, count }));

export const elevations = (pairs: [value: string, count: number][]): ShadowSample[] =>
  pairs.map(([value, count]) => ({ value, count }));

export function defineProfile(
  profile: Omit<SampleProfile, "extraction"> & {
    url: string;
    title: string;
    sampledNodes: number;
    durationMs: number;
    samples: Omit<RawExtraction, "source">;
  },
): SampleProfile {
  const { url, title, sampledNodes, durationMs, samples, ...identity } = profile;
  return {
    ...identity,
    extraction: {
      source: {
        url,
        title,
        capturedAt: "2026-11-02T09:30:00.000Z",
        durationMs,
        sampledNodes,
        origin: "sample",
      },
      ...samples,
    },
  };
}
