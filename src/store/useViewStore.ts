import { create } from "zustand";
import type { AnchorKind } from "@/types/tokens";

export type VisionMode = "normal" | "protanopia" | "deuteranopia" | "tritanopia" | "achromatopsia";
export type StageView = "stage" | "source";

export interface FocusedToken {
  kind: AnchorKind;
  value: string;
  label: string;
}

interface ViewState {
  vision: VisionMode;
  redlines: boolean;
  stageView: StageView;
  focus: FocusedToken | null;
  armedHex: string | null;
  isDragging: boolean;
  setVision: (vision: VisionMode) => void;
  toggleRedlines: () => void;
  setStageView: (view: StageView) => void;
  setFocus: (focus: FocusedToken | null) => void;
  setArmedHex: (hex: string | null) => void;
  setDragging: (isDragging: boolean) => void;
}

export const useViewStore = create<ViewState>((set) => ({
  vision: "normal",
  redlines: false,
  stageView: "stage",
  focus: null,
  armedHex: null,
  isDragging: false,
  setVision: (vision) => set({ vision }),
  toggleRedlines: () => set((state) => ({ redlines: !state.redlines })),
  setStageView: (stageView) => set({ stageView }),
  setFocus: (focus) => set((state) => (state.focus?.value === focus?.value && state.focus?.kind === focus?.kind ? state : { focus })),
  setArmedHex: (armedHex) => set({ armedHex }),
  setDragging: (isDragging) => set({ isDragging }),
}));

/** Spread onto any specimen so hovering or focusing it locates its source on the captured page. */
export function focusHandlers(focus: FocusedToken) {
  const { setFocus } = useViewStore.getState();
  return {
    onMouseEnter: () => setFocus(focus),
    onMouseLeave: () => setFocus(null),
    onFocus: () => setFocus(focus),
    onBlur: () => setFocus(null),
  };
}
