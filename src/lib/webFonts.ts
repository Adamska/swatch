export type FaceStatus = "bundled" | "available" | "loading" | "fallback";

const GENERIC = new Set([
  "serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "ui-serif", "ui-sans-serif", "ui-monospace",
  "ui-rounded", "-apple-system", "blinkmacsystemfont", "math", "emoji", "fangsong",
]);
const BUNDLED = /^(geist|geist mono|fraunces|fraunces variable)$/i;
const PROBE_TEXT = "mmmmmmmmmmlli1WQ@";

const requested = new Map<string, "loading" | "loaded" | "missing">();
const listeners = new Set<() => void>();
let version = 0;

const notify = () => {
  version += 1;
  for (const listener of listeners) listener();
};

export function leadFace(stack: string): string {
  return stack.split(",")[0]?.trim().replace(/^["']|["']$/g, "") ?? "";
}

function titleCase(name: string): string {
  if (name !== name.toLowerCase()) return name;
  return name.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

let probe: CanvasRenderingContext2D | null = null;

/** Detects whether a face renders differently from generic fallbacks, which covers local and loaded faces. */
export function isFaceAvailable(name: string): boolean {
  probe ??= document.createElement("canvas").getContext("2d");
  const context = probe;
  if (!context) return false;
  return ["monospace", "serif"].some((fallback) => {
    context.font = `72px ${fallback}`;
    const base = context.measureText(PROBE_TEXT).width;
    context.font = `72px "${name}", ${fallback}`;
    return context.measureText(PROBE_TEXT).width !== base;
  });
}

/** Requests a family from Google Fonts once. Unknown families answer 400 and are marked missing. */
export function requestGoogleFace(stack: string, weights: number[]) {
  const raw = leadFace(stack);
  const name = titleCase(raw);
  if (!name || GENERIC.has(name.toLowerCase()) || BUNDLED.test(name) || requested.has(name)) return;
  if (isFaceAvailable(raw) || isFaceAvailable(name)) return;

  const axis = [...new Set(weights.map((weight) => Math.round(weight / 100) * 100))].sort((a, b) => a - b).join(";");
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replace(/%20/g, "+")}:wght@${axis || "400"}&display=swap`;
  link.dataset.swatchFace = name;
  requested.set(name, "loading");
  link.onload = () => {
    void document.fonts.load(`400 16px "${name}"`).finally(() => {
      requested.set(name, "loaded");
      notify();
    });
  };
  link.onerror = () => {
    requested.set(name, "missing");
    link.remove();
    notify();
  };
  document.head.appendChild(link);
  notify();
}

export function faceStatus(stack: string): FaceStatus {
  const raw = leadFace(stack);
  if (BUNDLED.test(raw)) return "bundled";
  const state = requested.get(titleCase(raw));
  if (state === "loading") return "loading";
  return isFaceAvailable(raw) || isFaceAvailable(titleCase(raw)) ? "available" : "fallback";
}

export const webFontEvents = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    document.fonts?.addEventListener("loadingdone", listener);
    return () => {
      listeners.delete(listener);
      document.fonts?.removeEventListener("loadingdone", listener);
    };
  },
  getSnapshot: () => version,
  getServerSnapshot: () => 0,
};

export function wasRequested(stack: string): boolean {
  return requested.get(titleCase(leadFace(stack))) === "loaded";
}
