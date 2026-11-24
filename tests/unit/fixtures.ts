import { readFileSync } from "node:fs";
import { RawExtractionSchema, type RawExtraction } from "@/types/tokens";

export const FIXTURE_NAMES = ["stripe", "github", "tailwindcss", "linear"] as const;

export function loadFixture(name: (typeof FIXTURE_NAMES)[number]): RawExtraction {
  const raw: unknown = JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), "utf8"));
  return RawExtractionSchema.parse(raw);
}
