import { z } from "zod";
import type { DesignSystemTokens, ExtractionSource } from "@/types/tokens";
import { encodeShare } from "./shareCodec";

const STORAGE_KEY = "swatch.recent.v1";
const LIMIT = 10;

const RecentCaptureSchema = z.object({
  id: z.string(),
  host: z.string(),
  name: z.string(),
  capturedAt: z.string(),
  swatches: z.array(z.string()).max(5),
  payload: z.string(),
});

export type RecentCapture = z.infer<typeof RecentCaptureSchema>;

const EMPTY: RecentCapture[] = [];
let snapshot: RecentCapture[] | null = null;
const listeners = new Set<() => void>();

function read(): RecentCapture[] {
  try {
    const parsed = z.array(RecentCaptureSchema).safeParse(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

function write(entries: RecentCapture[]) {
  snapshot = entries;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    snapshot = entries;
  }
  for (const listener of listeners) listener();
}

export const recentCaptures = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): RecentCapture[] {
    snapshot ??= read();
    return snapshot;
  },
  getServerSnapshot(): RecentCapture[] {
    return EMPTY;
  },
  clear() {
    write([]);
  },
};

export async function rememberCapture(tokens: DesignSystemTokens, source: ExtractionSource): Promise<void> {
  const host = new URL(source.url).hostname.replace(/^www\./, "");
  const entry: RecentCapture = {
    id: `${host}-${source.capturedAt}`,
    host,
    name: tokens.meta.name,
    capturedAt: source.capturedAt,
    swatches: [tokens.colors.background, tokens.colors.foreground, tokens.colors.primary, tokens.colors.secondary, tokens.colors.accent],
    payload: await encodeShare({ tokens, source }),
  };
  const others = recentCaptures.getSnapshot().filter((item) => item.host !== host);
  write([entry, ...others].slice(0, LIMIT));
}
