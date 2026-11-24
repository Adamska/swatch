import { create } from "zustand";
import { findSampleProfile, SAMPLE_PROFILES } from "@/lib/samples";
import type { ExportFormat } from "@/lib/tailwindExporter";
import { normalizeDeterministic } from "@/lib/tokenNormalizer";
import {
  DesignSystemTokensSchema,
  type DesignSystemTokens,
  type Evidence,
  type ExtractionSource,
  type RawExtraction,
  type SemanticColorKey,
} from "@/types/tokens";
import { streamExtraction, type ProgressLine } from "./extractionClient";
import { withColor, withRadius, withSpacing, withTypeSize } from "./tokenEdits";

export type StudioStatus = "idle" | "extracting" | "normalizing" | "ready" | "error";
export type StyleguideTab = "color" | "type" | "measure";

export interface SpotlightOrigin {
  x: number;
  y: number;
}

interface TokenState {
  status: StudioStatus;
  error: string | null;
  notice: string | null;
  source: ExtractionSource | null;
  evidence: Evidence | null;
  progress: ProgressLine[];
  baseline: DesignSystemTokens | null;
  tokens: DesignSystemTokens | null;
  systemKey: number;
  isEdited: boolean;
  activeSampleId: string | null;
  activeTab: StyleguideTab;
  exportFormat: ExportFormat;
  spotlight: SpotlightOrigin;
  loadSample: (id: string, origin?: SpotlightOrigin) => void;
  inspect: (url: string, origin?: SpotlightOrigin) => Promise<void>;
  setColor: (key: SemanticColorKey, hex: string) => void;
  setTypeSize: (index: number, sizePx: number) => void;
  setSpacing: (index: number, px: number) => void;
  setRadius: (index: number, px: number) => void;
  resetEdits: () => void;
  setActiveTab: (tab: StyleguideTab) => void;
  setExportFormat: (format: ExportFormat) => void;
}

const sampleTokenCache = new Map<string, DesignSystemTokens>();
let activeRequest: AbortController | null = null;

export function getSampleTokens(id: string): DesignSystemTokens | null {
  const cached = sampleTokenCache.get(id);
  if (cached) return cached;
  const profile = findSampleProfile(id);
  if (!profile) return null;
  const tokens = normalizeDeterministic(profile.extraction);
  sampleTokenCache.set(id, tokens);
  return tokens;
}

async function postJson(path: string, body: unknown, signal: AbortSignal): Promise<Record<string, unknown>> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const detail = payload.error as { message?: string } | undefined;
    throw new Error(detail?.message ?? `Request failed with status ${response.status}.`);
  }
  return payload;
}

export const useTokenStore = create<TokenState>((set, get) => {
  const present = (tokens: DesignSystemTokens, source: ExtractionSource, origin?: SpotlightOrigin) =>
    set((state) => ({
      tokens,
      baseline: tokens,
      source,
      isEdited: false,
      error: null,
      systemKey: state.systemKey + 1,
      spotlight: origin ?? state.spotlight,
    }));

  const edit = (apply: (tokens: DesignSystemTokens) => DesignSystemTokens) =>
    set((state) => {
      if (!state.tokens) return state;
      const tokens = apply(state.tokens);
      return tokens === state.tokens ? state : { tokens, isEdited: true };
    });

  const refineWithModel = async (extraction: RawExtraction, signal: AbortSignal) => {
    const payload = await postJson("/api/normalize", { extraction }, signal);
    const refined = DesignSystemTokensSchema.safeParse(payload.tokens);
    const notice = typeof payload.fallbackReason === "string" ? payload.fallbackReason : null;
    if (refined.success && refined.data.meta.method === "ai" && !get().isEdited) {
      present(refined.data, extraction.source);
    }
    set({ notice });
  };

  return {
    status: "idle",
    error: null,
    notice: null,
    source: null,
    evidence: null,
    progress: [],
    baseline: null,
    tokens: null,
    systemKey: 0,
    isEdited: false,
    activeSampleId: null,
    activeTab: "color",
    exportFormat: "tailwind",
    spotlight: { x: 50, y: 30 },

    loadSample: (id, origin) => {
      const profile = findSampleProfile(id) ?? SAMPLE_PROFILES[0];
      const tokens = getSampleTokens(profile.id);
      if (!tokens) return;
      activeRequest?.abort();
      present(tokens, profile.extraction.source, origin);
      set({ status: "ready", notice: null, activeSampleId: profile.id, evidence: null, progress: [] });
    },

    inspect: async (url, origin) => {
      activeRequest?.abort();
      const request = new AbortController();
      activeRequest = request;
      set({ status: "extracting", error: null, notice: null, progress: [] });

      try {
        const { extraction, evidence } = await streamExtraction(url, request.signal, (line) =>
          set((state) => ({ progress: [...state.progress, line] })),
        );
        present(normalizeDeterministic(extraction), extraction.source, origin);
        set({ status: "normalizing", activeSampleId: null, evidence });
        await refineWithModel(extraction, request.signal).catch(() => undefined);
        if (!request.signal.aborted) set({ status: "ready" });
      } catch (error) {
        if (request.signal.aborted) return;
        const message = error instanceof Error ? error.message : "Extraction failed.";
        set({ status: get().tokens ? "ready" : "error", error: message });
      }
    },

    setColor: (key, hex) => edit((tokens) => withColor(tokens, key, hex)),
    setTypeSize: (index, sizePx) => edit((tokens) => withTypeSize(tokens, index, sizePx)),
    setSpacing: (index, px) => edit((tokens) => withSpacing(tokens, index, px)),
    setRadius: (index, px) => edit((tokens) => withRadius(tokens, index, px)),
    resetEdits: () => set((state) => (state.baseline ? { tokens: state.baseline, isEdited: false } : state)),
    setActiveTab: (activeTab) => set({ activeTab }),
    setExportFormat: (exportFormat) => set({ exportFormat }),
  };
});

export const selectTokens = (state: TokenState) => state.tokens;
export const selectColors = (state: TokenState) => state.tokens?.colors ?? null;
export const selectPalette = (state: TokenState) => state.tokens?.palette ?? null;
export const selectTypography = (state: TokenState) => state.tokens?.typography ?? null;
export const selectSpacing = (state: TokenState) => state.tokens?.spacing ?? null;
export const selectRadii = (state: TokenState) => state.tokens?.radii ?? null;
export const selectShadows = (state: TokenState) => state.tokens?.shadows ?? null;
export const selectMeta = (state: TokenState) => state.tokens?.meta ?? null;
export const selectIsBusy = (state: TokenState) =>
  state.status === "extracting" || state.status === "normalizing";
