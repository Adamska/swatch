import type { DesignSystemTokens } from "@/types/tokens";

export interface HistoryState {
  past: DesignSystemTokens[];
  future: DesignSystemTokens[];
}

const LIMIT = 80;
const COALESCE_MS = 700;
let lastEdit = { key: "", at: 0 };

/**
 * Records `previous` as an undo step unless the edit continues the same gesture, such as one slider
 * drag, so a single undo reverts the whole gesture.
 */
export function recordEdit(history: HistoryState, previous: DesignSystemTokens, key: string, now = Date.now()): HistoryState {
  const continues = key === lastEdit.key && now - lastEdit.at < COALESCE_MS;
  lastEdit = { key, at: now };
  if (continues) return { past: history.past, future: [] };
  return { past: [...history.past, previous].slice(-LIMIT), future: [] };
}

export function breakGesture() {
  lastEdit = { key: "", at: 0 };
}

export const EMPTY_HISTORY: HistoryState = { past: [], future: [] };
