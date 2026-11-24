import type { InteractionStates, SemanticColors, StateSample } from "@/types/tokens";
import { deltaE, fromOklchInGamut, toOklch } from "./color";

export function synthesizeHover(primary: string, background: string): string {
  const color = toOklch(primary);
  const groundIsLight = toOklch(background).l >= 0.5;
  const direction = color.l > 0.72 || !groundIsLight ? -1 : -0.8;
  return fromOklchInGamut({ ...color, l: Math.min(0.98, Math.max(0.05, color.l + direction * 0.07)) });
}

export function deriveStates(samples: StateSample[], colors: SemanticColors): InteractionStates {
  const nearest = samples
    .filter((sample) => sample.hoverFill && sample.hoverFill !== sample.restFill)
    .map((sample) => ({ sample, distance: deltaE(sample.restFill, colors.primary) }))
    .sort((a, b) => a.distance - b.distance)[0];
  const primaryHover =
    nearest && nearest.distance < 0.05 && nearest.sample.hoverFill
      ? nearest.sample.hoverFill
      : synthesizeHover(colors.primary, colors.background);

  const rings = samples.map((sample) => sample.focusRing).filter((ring): ring is string => ring !== null);
  const focusRing = rings.find((ring) => toOklch(ring).c > 0.04) ?? rings[0] ?? colors.primary;
  return { primaryHover, focusRing };
}
