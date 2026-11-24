import type { ExportFormat } from "@/lib/tailwindExporter";
import type { SharePayload } from "@/lib/shareCodec";
import type { DesignSystemTokens, Evidence, ExtractionSource, SemanticColorKey } from "@/types/tokens";
import type { ProgressLine } from "./extractionClient";
import type { SchemeSlot } from "./tokenEdits";

export type StudioStatus = "idle" | "extracting" | "normalizing" | "ready" | "error";
export type StyleguideTab = "color" | "type" | "measure" | "compare";

export interface SpotlightOrigin {
  x: number;
  y: number;
}

export interface PinnedSystem {
  tokens: DesignSystemTokens;
  source: ExtractionSource;
}

export interface TokenState {
  status: StudioStatus;
  error: string | null;
  notice: string | null;
  progress: ProgressLine[];
  source: ExtractionSource | null;
  evidence: Evidence | null;
  baseline: DesignSystemTokens | null;
  tokens: DesignSystemTokens | null;
  systemKey: number;
  isEdited: boolean;
  activeSampleId: string | null;
  activeTab: StyleguideTab;
  exportFormat: ExportFormat;
  spotlight: SpotlightOrigin;
  scheme: SchemeSlot;
  past: DesignSystemTokens[];
  future: DesignSystemTokens[];
  reference: PinnedSystem | null;
  loadSample: (id: string, origin?: SpotlightOrigin) => void;
  inspect: (url: string, origin?: SpotlightOrigin) => Promise<void>;
  restore: (payload: Pick<SharePayload, "tokens" | "source">, origin?: SpotlightOrigin) => void;
  setColor: (key: SemanticColorKey, hex: string) => void;
  liftContrast: (key: SemanticColorKey) => void;
  liftAllContrast: () => void;
  setTypeSize: (index: number, sizePx: number) => void;
  setSpacing: (index: number, px: number) => void;
  setRadius: (index: number, px: number) => void;
  resetEdits: () => void;
  undo: () => void;
  redo: () => void;
  setScheme: (scheme: SchemeSlot) => void;
  pinReference: () => void;
  clearReference: () => void;
  setActiveTab: (tab: StyleguideTab) => void;
  setExportFormat: (format: ExportFormat) => void;
}

