import { create } from "zustand";
import { rememberCapture } from "@/lib/recentCaptures";
import { findSampleProfile, SAMPLE_PROFILES } from "@/lib/samples";
import { normalizeDeterministic } from "@/lib/tokenNormalizer";
import {
  DesignSystemTokensSchema,
  type DesignSystemTokens,
  type ExtractionSource,
  type RawExtraction,
} from "@/types/tokens";
import { activeColorsOf, createEditActions } from "./editActions";
import { streamExtraction } from "./extractionClient";
import { breakGesture, EMPTY_HISTORY } from "./history";
import type { SpotlightOrigin, TokenState } from "./storeTypes";

export type { PinnedSystem, SpotlightOrigin, StudioStatus, StyleguideTab } from "./storeTypes";
export { activeColorsOf };

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

export const useTokenStore = create<TokenState>((set, get) => {
  const present = (tokens: DesignSystemTokens, source: ExtractionSource, origin?: SpotlightOrigin) => {
    breakGesture();
    set((state) => ({
      tokens,
      baseline: tokens,
      source,
      isEdited: false,
      error: null,
      scheme: "base",
      ...EMPTY_HISTORY,
      systemKey: state.systemKey + 1,
      spotlight: origin ?? state.spotlight,
    }));
  };

  const refineWithModel = async (extraction: RawExtraction, signal: AbortSignal) => {
    const response = await fetch("/api/normalize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ extraction }),
      signal,
    });
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const refined = DesignSystemTokensSchema.safeParse(payload.tokens);
    if (refined.success && refined.data.meta.method === "ai" && !get().isEdited) {
      present(refined.data, extraction.source);
    }
    set({ notice: typeof payload.fallbackReason === "string" ? payload.fallbackReason : null });
  };

  return {
    status: "idle",
    error: null,
    notice: null,
    progress: [],
    source: null,
    evidence: null,
    baseline: null,
    tokens: null,
    systemKey: 0,
    isEdited: false,
    activeSampleId: null,
    activeTab: "color",
    exportFormat: "tailwind",
    spotlight: { x: 50, y: 30 },
    scheme: "base",
    ...EMPTY_HISTORY,
    reference: null,

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
        if (request.signal.aborted) return;
        set({ status: "ready" });
        const { tokens, source } = get();
        if (tokens && source) void rememberCapture(tokens, source).catch(() => undefined);
      } catch (error) {
        if (request.signal.aborted) return;
        const message = error instanceof Error ? error.message : "Extraction failed.";
        set({ status: get().tokens ? "ready" : "error", error: message });
      }
    },

    restore: ({ tokens, source }, origin) => {
      activeRequest?.abort();
      present(tokens, source, origin);
      set({ status: "ready", notice: null, activeSampleId: null, evidence: null, progress: [] });
    },

    ...createEditActions(set, get),
    setScheme: (scheme) => set({ scheme }),
    pinReference: () => {
      const { tokens, source } = get();
      if (tokens && source) set({ reference: { tokens, source }, activeTab: "compare" });
    },
    clearReference: () =>
      set((state) => ({ reference: null, activeTab: state.activeTab === "compare" ? "color" : state.activeTab })),
    setActiveTab: (activeTab) => set({ activeTab }),
    setExportFormat: (exportFormat) => set({ exportFormat }),
  };
});

export const selectTokens = (state: TokenState) => state.tokens;
export const selectActiveColors = (state: TokenState) =>
  state.tokens ? activeColorsOf(state.tokens, state.scheme) : null;
export const selectPalette = (state: TokenState) => state.tokens?.palette ?? null;
export const selectTypography = (state: TokenState) => state.tokens?.typography ?? null;
export const selectSpacing = (state: TokenState) => state.tokens?.spacing ?? null;
export const selectRadii = (state: TokenState) => state.tokens?.radii ?? null;
export const selectShadows = (state: TokenState) => state.tokens?.shadows ?? null;
export const selectMeta = (state: TokenState) => state.tokens?.meta ?? null;
export const selectIsBusy = (state: TokenState) => state.status === "extracting" || state.status === "normalizing";
