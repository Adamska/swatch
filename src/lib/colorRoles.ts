import type { ColorSample, ColorUsage, PaletteEntry, SemanticColors } from "@/types/tokens";
import {
  compositeOver,
  contrastRatio,
  deltaE,
  fromOklch,
  hueDistance,
  mixColors,
  pickReadable,
  toOklch,
  type Oklch,
} from "./color";

interface ColorCluster {
  hex: string;
  share: number;
  usage: ColorUsage;
  lch: Oklch;
}

type ClusterMap = Record<ColorUsage, ColorCluster[]>;
type HueRange = [from: number, to: number, center: number, maxLightness: number];

const USAGES: ColorUsage[] = ["background", "text", "accent", "border"];
const CLUSTER_DISTANCE = 0.012;
const PALETTE_DISTANCE = 0.03;
const MIN_CHROMA = 0.045;
const BRAND_BOOST: Record<ColorUsage, number> = { accent: 3, background: 2, text: 0.25, border: 0.15 };
const PALETTE_BOOST: Record<ColorUsage, number> = { background: 0.4, text: 0.25, accent: 0.25, border: 0.1 };
const STATUS_HUES: Record<"success" | "warning" | "danger", HueRange> = {
  success: [125, 175, 152, 0.78],
  warning: [55, 105, 78, 0.88],
  danger: [8, 40, 27, 0.78],
};

const inRange = (hue: number, [from, to]: HueRange) => hue >= from && hue <= to;
const isNear = (hex: string, others: string[], distance: number) =>
  others.some((other) => deltaE(hex, other) < distance);

function clusterByUsage(samples: ColorSample[]): ClusterMap {
  const opaque = samples
    .filter((sample) => sample.usage === "background" && sample.alpha >= 0.9)
    .sort((a, b) => b.weight - a.weight);
  const canvas = opaque[0]?.hex ?? "#ffffff";
  const clusters: ClusterMap = { background: [], text: [], accent: [], border: [] };

  for (const sample of [...samples].sort((a, b) => b.weight - a.weight)) {
    const hex = compositeOver(sample.hex, sample.alpha, canvas);
    const group = clusters[sample.usage];
    const match = group.find((cluster) => deltaE(cluster.hex, hex) < CLUSTER_DISTANCE);
    if (match) match.share += sample.weight;
    else group.push({ hex, share: sample.weight, usage: sample.usage, lch: toOklch(hex) });
  }

  for (const usage of USAGES) {
    const total = clusters[usage].reduce((sum, cluster) => sum + cluster.share, 0) || 1;
    for (const cluster of clusters[usage]) cluster.share /= total;
    clusters[usage].sort((a, b) => b.share - a.share);
  }
  return clusters;
}

function mergeAcrossUsages(clusters: ClusterMap, boost: Record<ColorUsage, number>): ColorCluster[] {
  const merged: ColorCluster[] = [];
  const weighted = USAGES.flatMap((usage) =>
    clusters[usage].map((cluster) => ({ ...cluster, share: cluster.share * boost[usage] })),
  ).sort((a, b) => b.share - a.share);

  for (const cluster of weighted) {
    const match = merged.find((entry) => deltaE(entry.hex, cluster.hex) < PALETTE_DISTANCE);
    if (match) match.share += cluster.share;
    else merged.push({ ...cluster });
  }
  return merged.sort((a, b) => b.share - a.share);
}

function pickNeutrals(clusters: ClusterMap) {
  const background = clusters.background[0]?.hex ?? "#ffffff";
  const leadShare = clusters.text[0]?.share ?? 0;
  const readable = clusters.text
    .filter((cluster) => cluster.share >= leadShare * 0.05)
    .map((cluster) => ({ ...cluster, contrast: contrastRatio(cluster.hex, background) }));

  const strongest = [...readable].sort(
    (a, b) => b.share * b.contrast ** 2 - a.share * a.contrast ** 2,
  )[0];
  const foreground =
    strongest && strongest.contrast >= 3 ? strongest.hex : pickReadable(background, ["#0b0c0f", "#f7f7f5"]);
  const foregroundContrast = contrastRatio(foreground, background);

  const muted =
    readable.find(
      (cluster) =>
        cluster.hex !== foreground &&
        cluster.lch.c < 0.08 &&
        cluster.contrast >= 2.5 &&
        cluster.contrast <= foregroundContrast - 1,
    )?.hex ?? mixColors(foreground, background, 0.42);

  const surface =
    clusters.background.slice(1).find((cluster) => {
      const distance = deltaE(cluster.hex, background);
      return distance > 0.008 && distance < 0.12 && cluster.lch.c < 0.06;
    })?.hex ?? mixColors(background, foreground, 0.045);

  const subtle = clusters.border.filter(
    (cluster) => contrastRatio(cluster.hex, background) < 3 && deltaE(cluster.hex, background) > 0.012,
  );
  const border =
    (subtle.find((cluster) => cluster.lch.c < 0.05) ?? subtle[0])?.hex ?? mixColors(background, foreground, 0.14);

  return { background, surface, foreground, muted, border };
}

function pickBrand(clusters: ClusterMap, neutrals: ReturnType<typeof pickNeutrals>) {
  const reserved = Object.values(neutrals);
  const ranked = mergeAcrossUsages(clusters, BRAND_BOOST)
    .filter((cluster) => cluster.lch.c >= MIN_CHROMA && !isNear(cluster.hex, reserved, 0.04))
    .map((cluster) => ({ ...cluster, share: (cluster.share * cluster.lch.c) / 0.15 }))
    .sort((a, b) => b.share - a.share);

  const lead = ranked[0];
  if (!lead) {
    return {
      primary: neutrals.foreground,
      secondary: neutrals.muted,
      accent: mixColors(neutrals.foreground, neutrals.background, 0.25),
    };
  }

  const isDark = toOklch(neutrals.background).l < 0.5;
  const supporting = ranked.filter((cluster) => !inRange(cluster.lch.h, STATUS_HUES.danger));
  const second = supporting.find((cluster) => hueDistance(cluster.lch.h, lead.lch.h) >= 30);
  const third = supporting.find(
    (cluster) =>
      hueDistance(cluster.lch.h, lead.lch.h) >= 25 &&
      (!second || hueDistance(cluster.lch.h, second.lch.h) >= 25),
  );
  const shifted = (degrees: number): string =>
    fromOklch({ l: lead.lch.l + (isDark ? -0.08 : 0.1), c: lead.lch.c * 0.8, h: (lead.lch.h + degrees + 360) % 360 });

  return {
    primary: lead.hex,
    secondary: second?.hex ?? mixColors(lead.hex, neutrals.foreground, 0.5),
    accent: third?.hex ?? shifted(second && hueDistance(second.lch.h, lead.lch.h + 40) < 25 ? -40 : 40),
  };
}

function pickStatus(clusters: ClusterMap, taken: string[], background: string) {
  const isDark = toOklch(background).l < 0.5;
  const pool = mergeAcrossUsages(clusters, { background: 1, text: 1, border: 1, accent: 0.5 }).filter(
    (cluster) => cluster.lch.c >= 0.075 && cluster.lch.l > 0.4,
  );
  const resolve = (range: HueRange): string =>
    pool.find(
      (cluster) => inRange(cluster.lch.h, range) && cluster.lch.l <= range[3] && !isNear(cluster.hex, taken, 0.02),
    )?.hex ?? fromOklch({ l: range[3] - (isDark ? 0.04 : 0.2), c: 0.15, h: range[2] });

  return {
    success: resolve(STATUS_HUES.success),
    warning: resolve(STATUS_HUES.warning),
    danger: resolve(STATUS_HUES.danger),
  };
}

function buildPalette(clusters: ClusterMap): PaletteEntry[] {
  const top = mergeAcrossUsages(clusters, PALETTE_BOOST).slice(0, 12);
  const total = top.reduce((sum, cluster) => sum + cluster.share, 0) || 1;
  return top.map((cluster) => ({
    hex: cluster.hex,
    share: Math.round((cluster.share / total) * 10000) / 10000,
    usage: cluster.usage,
  }));
}

export function deriveColors(samples: ColorSample[]): { colors: SemanticColors; palette: PaletteEntry[] } {
  const clusters = clusterByUsage(samples);
  const neutrals = pickNeutrals(clusters);
  const brand = pickBrand(clusters, neutrals);
  const status = pickStatus(clusters, Object.values(brand), neutrals.background);
  const primaryForeground = pickReadable(brand.primary, [
    neutrals.background,
    neutrals.foreground,
    "#ffffff",
    "#0b0c0f",
  ]);
  const palette = buildPalette(clusters);

  return {
    colors: { ...neutrals, ...brand, primaryForeground, ...status },
    palette: palette.length > 0 ? palette : [{ hex: neutrals.background, share: 1, usage: "background" }],
  };
}
