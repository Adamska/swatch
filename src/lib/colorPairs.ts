import type { SemanticColorKey, SemanticColors } from "@/types/tokens";

export interface ColorPair {
  label: string;
  hex: string;
  minimum: number;
}

const GROUND_ROLES: ReadonlySet<SemanticColorKey> = new Set(["background", "surface", "border"]);

/** The color each role is normally read against, and the contrast that pairing should reach. */
export function partnerOf(key: SemanticColorKey, colors: SemanticColors): ColorPair {
  if (key === "primaryForeground") return { label: "primary", hex: colors.primary, minimum: 4.5 };
  if (GROUND_ROLES.has(key)) return { label: "foreground", hex: colors.foreground, minimum: 4.5 };
  return { label: "background", hex: colors.background, minimum: 4.5 };
}

/** Roles where lifting contrast is meaningful. Grounds are judged by the text that sits on them. */
export function isLiftable(key: SemanticColorKey): boolean {
  return !GROUND_ROLES.has(key);
}
