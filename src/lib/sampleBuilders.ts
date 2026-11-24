import type {
  ColorSample,
  MeasureSample,
  RawExtraction,
  ShadowSample,
  StateSample,
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

export const hover = (restFill: string, hoverFill: string, focusRing: string | null = null): StateSample => ({
  restFill,
  hoverFill,
  focusRing,
});

/** Authored profiles have no mobile pass, so headings are compressed the way responsive sites usually do. */
function compressForMobile(typography: TypeSample[]): TypeSample[] {
  return typography.map((sample) =>
    sample.role === "heading" && sample.sizePx > 24
      ? { ...sample, sizePx: Math.round((sample.sizePx * 0.56 + 9) * 2) / 2 }
      : sample,
  );
}

type AuthoredSamples = Omit<RawExtraction, "source" | "darkColors" | "mobileTypography" | "states"> &
  Partial<Pick<RawExtraction, "darkColors" | "states">>;

export function defineProfile(
  profile: Omit<SampleProfile, "extraction"> & {
    url: string;
    title: string;
    sampledNodes: number;
    durationMs: number;
    samples: AuthoredSamples;
  },
): SampleProfile {
  const { url, title, sampledNodes, durationMs, samples, ...identity } = profile;
  const { darkColors = null, states = [], ...measured } = samples;
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
        pages: [url],
      },
      ...measured,
      darkColors,
      mobileTypography: compressForMobile(measured.typography),
      states,
    },
  };
}
