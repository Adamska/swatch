import {
  DesignSystemTokensSchema,
  MeasureStepSchema,
  SEMANTIC_COLOR_KEYS,
  SemanticColorsSchema,
  ShadowStepSchema,
  SpacingSchema,
  TypographySchema,
  type DesignSystemTokens,
  type RawExtraction,
  type TypeStep,
} from "@/types/tokens";
import type { AiTokenDraft } from "@/types/aiDraft";
import { z } from "zod";
import { normalizeHex } from "./color";
import { deriveColors } from "./colorRoles";
import { applyFluidType } from "./fluidType";
import { deriveRadii, deriveShadows, deriveSpacing, deriveTypography } from "./scaleRoles";
import { isDistinctScheme } from "./schemes";
import { deriveStates } from "./stateRoles";

const TITLE_SEPARATORS = /\s+[—–|·:-]\s+|:\s+/;

function deriveName(raw: RawExtraction): string {
  const lead = raw.source.title.split(TITLE_SEPARATORS)[0]?.trim();
  if (lead && lead.length <= 40) return lead;
  return new URL(raw.source.url).hostname.replace(/^www\./, "");
}

export function normalizeDeterministic(raw: RawExtraction): DesignSystemTokens {
  const { colors, palette } = deriveColors(raw.colors);
  const alternate = raw.darkColors && raw.darkColors.length > 0 ? deriveColors(raw.darkColors).colors : null;
  const altColors = alternate && isDistinctScheme(colors, alternate) ? alternate : null;
  const typography = deriveTypography(raw.typography);

  return DesignSystemTokensSchema.parse({
    meta: {
      name: deriveName(raw),
      sourceUrl: raw.source.url,
      method: "deterministic",
      model: null,
      generatedAt: new Date().toISOString(),
    },
    colors,
    altColors,
    altSource: altColors ? "extracted" : "synthesized",
    states: deriveStates(raw.states, colors),
    palette,
    typography: { ...typography, steps: applyFluidType(typography.steps, raw.mobileTypography) },
    spacing: deriveSpacing(raw.spacing),
    radii: deriveRadii(raw.radii),
    shadows: deriveShadows(raw.shadows),
  });
}

export function summarizeForModel(raw: RawExtraction, baseline: DesignSystemTokens) {
  const top = <T>(items: T[], limit: number) => items.slice(0, limit);
  return {
    source: { url: raw.source.url, title: raw.source.title },
    observed: {
      colors: top(raw.colors, 60),
      typography: top(raw.typography, 30),
      spacing: top(raw.spacing, 24),
      radii: top(raw.radii, 12),
      shadows: top(raw.shadows, 8),
    },
    baseline: {
      name: baseline.meta.name,
      colors: baseline.colors,
      typography: baseline.typography,
      spacing: baseline.spacing,
      radii: baseline.radii,
      shadows: baseline.shadows,
    },
  };
}

const slug = (name: string) => name.trim().toLowerCase().replace(/[^a-z0-9.-]+/g, "-").slice(0, 16);

function accept<Schema extends z.ZodType>(schema: Schema, candidate: unknown, fallback: z.infer<Schema>): z.infer<Schema> {
  const parsed = schema.safeParse(candidate);
  return parsed.success ? parsed.data : fallback;
}

/**
 * Model output is treated as a proposal. Every section is repaired, validated against the
 * strict schema on its own, and replaced by the deterministic baseline when it does not hold.
 */
export function reconcileDraft(
  draft: AiTokenDraft,
  baseline: DesignSystemTokens,
  model: string,
): DesignSystemTokens {
  const colors = Object.fromEntries(
    SEMANTIC_COLOR_KEYS.map((key) => [key, normalizeHex(draft.colors[key]) ?? baseline.colors[key]]),
  );
  const fluidFor = (sizePx: number) =>
    baseline.typography.steps.find((step: TypeStep) => Math.abs(step.sizePx - sizePx) <= 0.5)?.fluidMinPx ?? null;
  const typography = {
    families: draft.typography.families,
    steps: draft.typography.steps
      .map((step) => ({ ...step, name: slug(step.name), weight: Math.round(step.weight), fluidMinPx: fluidFor(step.sizePx) }))
      .sort((a, b) => a.sizePx - b.sizePx),
  };
  const byPx = <T extends { name: string; px: number }>(steps: T[]) =>
    steps.map((step) => ({ ...step, name: slug(step.name) })).sort((a, b) => a.px - b.px);
  const name = draft.name.trim().slice(0, 60);

  return DesignSystemTokensSchema.parse({
    meta: { ...baseline.meta, name: name || baseline.meta.name, method: "ai", model, generatedAt: new Date().toISOString() },
    colors: accept(SemanticColorsSchema, colors, baseline.colors),
    altColors: baseline.altColors,
    altSource: baseline.altSource,
    states: baseline.states,
    palette: baseline.palette,
    typography: accept(TypographySchema, typography, baseline.typography),
    spacing: accept(SpacingSchema, { ...draft.spacing, steps: byPx(draft.spacing.steps) }, baseline.spacing),
    radii: accept(z.array(MeasureStepSchema).min(1).max(7), byPx(draft.radii), baseline.radii),
    shadows: accept(
      z.array(ShadowStepSchema).max(5),
      draft.shadows.map((shadow) => ({ ...shadow, name: slug(shadow.name) })),
      baseline.shadows,
    ),
  });
}
