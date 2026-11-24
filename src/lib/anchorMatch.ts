import type { Anchor } from "@/types/tokens";
import { deltaE } from "./color";

export interface FocusQuery {
  kind: Anchor["kind"];
  value: string;
}

function matches(anchor: Anchor, query: FocusQuery): boolean {
  if (anchor.kind !== query.kind) return false;
  if (query.kind === "color") return deltaE(anchor.key, query.value) < 0.035;
  const target = Number(query.value);
  const value = Number(anchor.key);
  if (query.kind === "type") return Math.abs(value - target) <= Math.max(0.5, target * 0.03);
  if (query.kind === "radius" && (target >= 999 || value >= 999)) return target >= 999 && value >= 999;
  return Math.abs(value - target) <= 1;
}

export function matchRects(anchors: Anchor[], query: FocusQuery | null): Anchor["rects"] {
  if (!query) return [];
  return anchors.filter((anchor) => matches(anchor, query)).flatMap((anchor) => anchor.rects);
}
