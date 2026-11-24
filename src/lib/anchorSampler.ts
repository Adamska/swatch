import type { Anchor } from "@/types/extraction";

export interface AnchorConfig {
  captureHeight: number;
  maxElements: number;
  maxRects: number;
  maxAnchors: number;
}

/**
 * Runs inside the inspected page and records where each raw value appears within the captured area.
 * Self-contained for the same reason as the sampler: Playwright serializes it.
 */
export function collectAnchors(config: AnchorConfig): Anchor[] {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const painter = canvas.getContext("2d", { willReadFrequently: true });
  const cache = new Map<string, string | null>();
  const toHex = (value: string): string | null => {
    const cached = cache.get(value);
    if (cached !== undefined) return cached;
    let hex: string | null = null;
    if (painter && value && value !== "transparent") {
      painter.clearRect(0, 0, 1, 1);
      painter.fillStyle = "#000000";
      painter.fillStyle = value;
      painter.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = painter.getImageData(0, 0, 1, 1).data;
      if (a >= 20) hex = `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
    }
    cache.set(value, hex);
    return hex;
  };

  const anchors = new Map<string, Anchor>();
  const record = (kind: Anchor["kind"], key: string, rect: DOMRect) => {
    const id = `${kind}|${key}`;
    let anchor = anchors.get(id);
    if (!anchor) {
      if (anchors.size >= config.maxAnchors) return;
      anchor = { kind, key, rects: [] };
      anchors.set(id, anchor);
    }
    if (anchor.rects.length >= config.maxRects) return;
    const box: [number, number, number, number] = [
      Math.round(rect.left),
      Math.round(rect.top + window.scrollY),
      Math.round(rect.width),
      Math.round(rect.height),
    ];
    const overlaps = anchor.rects.some(([x, y]) => Math.abs(x - box[0]) < 8 && Math.abs(y - box[1]) < 8);
    if (!overlaps) anchor.rects.push(box);
  };
  const half = (value: string) => String(Math.round(parseFloat(value) * 2) / 2);

  const all = document.querySelectorAll("body *");
  const stride = Math.max(1, Math.ceil(all.length / config.maxElements));
  for (let index = 0; index < all.length; index += stride) {
    const element = all[index];
    const rect = element.getBoundingClientRect();
    const top = rect.top + window.scrollY;
    if (rect.width < 4 || rect.height < 4 || top >= config.captureHeight || top + rect.height <= 0) continue;
    const style = getComputedStyle(element);
    if (style.visibility === "hidden" || Number(style.opacity) === 0) continue;

    const fill = toHex(style.backgroundColor);
    if (fill) record("color", fill, rect);
    if (parseFloat(style.borderTopWidth) > 0 && style.borderTopStyle !== "none") {
      const edge = toHex(style.borderTopColor);
      if (edge) record("color", edge, rect);
    }

    let hasText = false;
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && (node.nodeValue ?? "").trim().length > 0) {
        hasText = true;
        break;
      }
    }
    if (hasText) {
      const ink = toHex(style.color);
      if (ink) record("color", ink, rect);
      record("type", half(style.fontSize), rect);
    }

    for (const gap of [style.paddingTop, style.paddingLeft, style.rowGap, style.columnGap]) {
      const px = parseFloat(gap);
      if (px >= 2 && px <= 200) record("space", half(gap), rect);
    }

    const corner = parseFloat(style.borderTopLeftRadius);
    if (corner > 0) {
      const isPill = style.borderTopLeftRadius.includes("%") ? corner >= 50 : corner >= Math.min(rect.width, rect.height) / 2;
      record("radius", isPill ? "9999" : half(style.borderTopLeftRadius), rect);
    }
  }
  return [...anchors.values()];
}
