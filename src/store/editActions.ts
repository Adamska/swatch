import { contrastRatio } from "@/lib/color";
import { isLiftable, partnerOf } from "@/lib/colorPairs";
import { ensureContrast } from "@/lib/colorScale";
import { resolveAltColors } from "@/lib/schemes";
import { SEMANTIC_COLOR_KEYS, type DesignSystemTokens, type SemanticColorKey } from "@/types/tokens";
import { breakGesture, recordEdit } from "./history";
import type { TokenState } from "./storeTypes";
import { withColor, withRadius, withSpacing, withTypeSize, type SchemeSlot } from "./tokenEdits";

type SetState = (partial: Partial<TokenState> | ((state: TokenState) => Partial<TokenState> | TokenState)) => void;
type GetState = () => TokenState;

export function activeColorsOf(tokens: DesignSystemTokens, scheme: SchemeSlot) {
  return scheme === "alt" ? resolveAltColors(tokens) : tokens.colors;
}

export function createEditActions(set: SetState, get: GetState) {
  const edit = (key: string, apply: (tokens: DesignSystemTokens) => DesignSystemTokens) =>
    set((state) => {
      if (!state.tokens) return state;
      const tokens = apply(state.tokens);
      if (tokens === state.tokens) return state;
      return { tokens, isEdited: true, ...recordEdit(state, state.tokens, key) };
    });

  const lift = (tokens: DesignSystemTokens, scheme: SchemeSlot, key: SemanticColorKey) => {
    const colors = activeColorsOf(tokens, scheme);
    const partner = partnerOf(key, colors);
    return withColor(tokens, scheme, key, ensureContrast(colors[key], partner.hex, partner.minimum));
  };

  return {
    setColor: (key, hex) =>
      edit(`color:${get().scheme}:${key}`, (tokens) => withColor(tokens, get().scheme, key, hex)),
    liftContrast: (key) => {
      breakGesture();
      edit(`lift:${key}`, (tokens) => lift(tokens, get().scheme, key));
    },
    liftAllContrast: () => {
      breakGesture();
      edit("lift:all", (tokens) =>
        SEMANTIC_COLOR_KEYS.reduce((next, key) => {
          const colors = activeColorsOf(next, get().scheme);
          const partner = partnerOf(key, colors);
          const failing = isLiftable(key) && contrastRatio(colors[key], partner.hex) < partner.minimum;
          return failing ? lift(next, get().scheme, key) : next;
        }, tokens),
      );
    },
    setTypeSize: (index, sizePx) => edit(`type:${index}`, (tokens) => withTypeSize(tokens, index, sizePx)),
    setSpacing: (index, px) => edit(`space:${index}`, (tokens) => withSpacing(tokens, index, px)),
    setRadius: (index, px) => edit(`radius:${index}`, (tokens) => withRadius(tokens, index, px)),
    resetEdits: () => {
      breakGesture();
      set((state) =>
        state.baseline && state.tokens && state.isEdited
          ? { tokens: state.baseline, isEdited: false, past: [...state.past, state.tokens], future: [] }
          : state,
      );
    },
    undo: () => {
      breakGesture();
      set((state) => {
        const previous = state.past[state.past.length - 1];
        if (!previous || !state.tokens) return state;
        return {
          tokens: previous,
          past: state.past.slice(0, -1),
          future: [state.tokens, ...state.future],
          isEdited: previous !== state.baseline,
        };
      });
    },
    redo: () => {
      breakGesture();
      set((state) => {
        const next = state.future[0];
        if (!next || !state.tokens) return state;
        return {
          tokens: next,
          past: [...state.past, state.tokens],
          future: state.future.slice(1),
          isEdited: next !== state.baseline,
        };
      });
    },
  } satisfies Partial<TokenState>;
}
