import { contrastRatio, fromOklchInGamut, toOklch } from "./color";

export const SCALE_STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type ScaleStop = (typeof SCALE_STOPS)[number];

export interface ScaleTile {
  stop: ScaleStop;
  hex: string;
  isSource: boolean;
}

const STOP_LIGHTNESS = [0.975, 0.94, 0.885, 0.805, 0.715, 0.63, 0.545, 0.465, 0.385, 0.305, 0.225];
const CHROMA_PROFILE = [0.12, 0.24, 0.45, 0.7, 0.9, 1, 0.98, 0.9, 0.78, 0.64, 0.5];

const scaleCache = new Map<string, ScaleTile[]>();

/**
 * Builds an eleven-stop tonal ramp at fixed perceptual lightness. The source color replaces the stop
 * nearest to its own lightness, so the extracted value always appears verbatim in the scale.
 */
export function buildTonalScale(hex: string): ScaleTile[] {
  const cached = scaleCache.get(hex);
  if (cached) return cached;

  const source = toOklch(hex);
  const anchor = STOP_LIGHTNESS.reduce(
    (best, lightness, index) =>
      Math.abs(lightness - source.l) < Math.abs(STOP_LIGHTNESS[best] - source.l) ? index : best,
    0,
  );
  const peakChroma = source.c / Math.max(CHROMA_PROFILE[anchor], 0.12);
  const offset = source.l - STOP_LIGHTNESS[anchor];

  const tiles = SCALE_STOPS.map((stop, index): ScaleTile => {
    if (index === anchor) return { stop, hex, isSource: true };
    const fade = Math.max(0, 1 - Math.abs(index - anchor) / 4);
    return {
      stop,
      hex: fromOklchInGamut({
        l: STOP_LIGHTNESS[index] + offset * fade,
        c: peakChroma * CHROMA_PROFILE[index],
        h: source.h,
      }),
      isSource: false,
    };
  });

  if (scaleCache.size > 200) scaleCache.clear();
  scaleCache.set(hex, tiles);
  return tiles;
}

export function scaleRecord(hex: string): Record<ScaleStop, string> {
  return Object.fromEntries(buildTonalScale(hex).map((tile) => [tile.stop, tile.hex])) as Record<ScaleStop, string>;
}

/**
 * Moves only the perceptual lightness of `ink` until it reaches `target` contrast against `ground`,
 * keeping hue and as much chroma as the sRGB gamut allows. Returns the passing color closest to the original.
 */
export function ensureContrast(ink: string, ground: string, target = 4.5): string {
  if (contrastRatio(ink, ground) >= target) return ink;
  const color = toOklch(ink);
  const groundIsLight = toOklch(ground).l >= 0.6;
  const limit = groundIsLight ? 0 : 1;
  const extreme = fromOklchInGamut({ ...color, l: limit });
  if (contrastRatio(extreme, ground) < target) return groundIsLight ? "#000000" : "#ffffff";

  let near = color.l;
  let far = limit;
  for (let step = 0; step < 18; step += 1) {
    const mid = (near + far) / 2;
    if (contrastRatio(fromOklchInGamut({ ...color, l: mid }), ground) >= target) far = mid;
    else near = mid;
  }
  return fromOklchInGamut({ ...color, l: far });
}
