export interface Oklch {
  l: number;
  c: number;
  h: number;
}

type Triple = [number, number, number];

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function normalizeHex(input: string): string | null {
  const value = input.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(value)) return value;
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(value);
  return short ? `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}` : null;
}

function hexToRgb(hex: string): Triple {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgbToHex([r, g, b]: Triple): string {
  const channel = (value: number) =>
    Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

const toLinear = (channel: number) => {
  const unit = channel / 255;
  return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
};

const toGamma = (linear: number) => {
  const unit = clamp01(linear);
  return 255 * (unit <= 0.0031308 ? unit * 12.92 : 1.055 * unit ** (1 / 2.4) - 0.055);
};

function toOklab(hex: string): Triple {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToLinear([lightness, a, b]: Triple): Triple {
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function fromOklab(lab: Triple): string {
  return rgbToHex(oklabToLinear(lab).map(toGamma) as Triple);
}

const polarToLab = ({ l, c, h }: Oklch): Triple => {
  const radians = (h * Math.PI) / 180;
  return [clamp01(l), c * Math.cos(radians), c * Math.sin(radians)];
};

export function isInGamut(color: Oklch): boolean {
  return oklabToLinear(polarToLab(color)).every((channel) => channel >= -0.0005 && channel <= 1.0005);
}

export function fromOklchInGamut(color: Oklch): string {
  if (isInGamut(color)) return fromOklch(color);
  let low = 0;
  let high = color.c;
  for (let step = 0; step < 14; step += 1) {
    const mid = (low + high) / 2;
    if (isInGamut({ ...color, c: mid })) low = mid;
    else high = mid;
  }
  return fromOklch({ ...color, c: low });
}

export function hexToRgbUnit(hex: string): Triple {
  return hexToRgb(hex).map((channel) => channel / 255) as Triple;
}

export function toOklch(hex: string): Oklch {
  const [l, a, b] = toOklab(hex);
  const hue = (Math.atan2(b, a) * 180) / Math.PI;
  return { l, c: Math.hypot(a, b), h: hue < 0 ? hue + 360 : hue };
}

export function fromOklch(color: Oklch): string {
  return fromOklab(polarToLab(color));
}

export function deltaE(first: string, second: string): number {
  const a = toOklab(first);
  const b = toOklab(second);
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

export function hueDistance(first: number, second: number): number {
  const delta = Math.abs(first - second) % 360;
  return delta > 180 ? 360 - delta : delta;
}

export function mixColors(from: string, to: string, amount: number): string {
  const a = toOklab(from);
  const b = toOklab(to);
  const t = clamp01(amount);
  return fromOklab([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
}

export function compositeOver(hex: string, alpha: number, backdrop: string): string {
  if (alpha >= 0.995) return hex;
  const top = hexToRgb(hex);
  const base = hexToRgb(backdrop);
  return rgbToHex([0, 1, 2].map((i) => top[i] * alpha + base[i] * (1 - alpha)) as Triple);
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(first: string, second: string): number {
  const a = relativeLuminance(first);
  const b = relativeLuminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export type ContrastGrade = "AAA" | "AA" | "AA Large" | "Fail";

export function contrastGrade(ratio: number): ContrastGrade {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA Large";
  return "Fail";
}

export function pickReadable(surface: string, candidates: string[], minimum = 4.5): string {
  const passing = candidates.find((candidate) => contrastRatio(surface, candidate) >= minimum);
  if (passing) return passing;
  return candidates.reduce((best, candidate) =>
    contrastRatio(surface, candidate) > contrastRatio(surface, best) ? candidate : best,
  );
}
