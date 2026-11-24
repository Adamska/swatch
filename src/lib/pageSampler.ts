import type {
  ColorSample,
  ColorUsage,
  MeasureSample,
  ShadowSample,
  TypeRole,
  TypeSample,
} from "@/types/tokens";

export interface SamplerConfig {
  maxNodes: number;
  perGroup: number;
  walkDepth: number;
  walkFanout: number;
}

export interface SampledDocument {
  title: string;
  sampledNodes: number;
  colors: ColorSample[];
  typography: TypeSample[];
  spacing: MeasureSample[];
  radii: MeasureSample[];
  shadows: ShadowSample[];
}

/**
 * Runs inside the inspected page. Playwright serializes this function, so it must stay
 * synchronous and self-contained: no imports, no closures over module scope.
 */
export function sampleDocument(config: SamplerConfig): SampledDocument {
  type Role = TypeRole | "landmark" | "link" | "surface";
  type Rgba = { hex: string; alpha: number };

  const GROUPS: [Role, string][] = [
    ["landmark", "html, body, header, nav, main, footer, aside, section, article"],
    ["control", "button, [role=button], [role=tab], input, select, textarea, summary, a[class*=btn i], a[class*=button i]"],
    ["heading", "h1, h2, h3, h4, h5, h6, [role=heading]"],
    ["code", "code, pre, kbd, samp"],
    ["link", "a[href]"],
    ["body", "p, li, blockquote, figcaption, dt, dd, td, th, label, small"],
    ["surface", "[class*=card i], [class*=panel i], [class*=tile i], [class*=hero i], [class*=banner i], [class*=badge i], [class*=chip i], [class*=tag i], [class*=modal i]"],
  ];
  const SKIPPED_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "IFRAME", "SVG", "svg", "LINK", "META"]);
  const ACTION_TAGS = new Set(["BUTTON", "A", "SUMMARY"]);
  const FIELD_TAGS = new Set(["INPUT", "SELECT", "TEXTAREA"]);

  const viewportArea = Math.max(1, window.innerWidth * window.innerHeight);
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const painter = canvas.getContext("2d", { willReadFrequently: true });
  const colorCache = new Map<string, Rgba | null>();
  const toHex = (r: number, g: number, b: number) =>
    `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;

  const resolveColor = (value: string): Rgba | null => {
    const cached = colorCache.get(value);
    if (cached !== undefined) return cached;
    let resolved: Rgba | null = null;
    const legacy = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(value);
    if (legacy) {
      const rawAlpha = legacy[4];
      const alpha = rawAlpha === undefined ? 1 : rawAlpha.endsWith("%") ? parseFloat(rawAlpha) / 100 : parseFloat(rawAlpha);
      resolved = { hex: toHex(Number(legacy[1]), Number(legacy[2]), Number(legacy[3])), alpha };
    } else if (painter && value && value !== "transparent") {
      painter.clearRect(0, 0, 1, 1);
      painter.fillStyle = "#000000";
      painter.fillStyle = value;
      painter.fillRect(0, 0, 1, 1);
      const pixel = painter.getImageData(0, 0, 1, 1).data;
      resolved = { hex: toHex(pixel[0], pixel[1], pixel[2]), alpha: pixel[3] / 255 };
    }
    colorCache.set(value, resolved);
    return resolved;
  };

  const colors = new Map<string, ColorSample>();
  const addColor = (value: string, usage: ColorUsage, weight: number) => {
    const color = resolveColor(value);
    if (!color || color.alpha < 0.08 || weight <= 0) return;
    const alpha = Math.round(color.alpha * 20) / 20;
    const key = `${usage}|${color.hex}|${alpha}`;
    const existing = colors.get(key);
    if (existing) existing.weight += weight;
    else colors.set(key, { hex: color.hex, alpha, usage, weight });
  };

  const typography = new Map<string, TypeSample>();
  const spacing = new Map<number, MeasureSample>();
  const radii = new Map<number, MeasureSample>();
  const shadows = new Map<string, ShadowSample>();
  const bumpMeasure = (bucket: Map<number, MeasureSample>, px: number) => {
    const existing = bucket.get(px);
    if (existing) existing.count += 1;
    else bucket.set(px, { px, count: 1 });
  };

  const picked = new Map<Element, Role>();
  for (const [role, selector] of GROUPS) {
    const matches = document.querySelectorAll(selector);
    const stride = Math.max(1, Math.ceil(matches.length / config.perGroup));
    for (let index = 0; index < matches.length && picked.size < config.maxNodes; index += stride) {
      if (!picked.has(matches[index])) picked.set(matches[index], role);
    }
  }

  let frontier: Element[] = document.body ? [document.body] : [];
  for (let depth = 0; depth < config.walkDepth && picked.size < config.maxNodes; depth += 1) {
    const next: Element[] = [];
    for (const parent of frontier) {
      const children = parent.children;
      const stride = Math.max(1, Math.ceil(children.length / config.walkFanout));
      for (let index = 0; index < children.length; index += stride) {
        const child = children[index];
        if (SKIPPED_TAGS.has(child.tagName)) continue;
        if (!picked.has(child) && picked.size < config.maxNodes) picked.set(child, "surface");
        if (next.length < config.maxNodes) next.push(child);
      }
    }
    frontier = next;
  }

  let sampledNodes = 0;
  let hasCanvasFill = false;
  for (const [element, role] of picked) {
    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) continue;
    const rect = element.getBoundingClientRect();
    const isRoot = element === document.documentElement || element === document.body;
    if (!isRoot && (rect.width < 2 || rect.height < 2)) continue;
    sampledNodes += 1;

    const area = isRoot ? 1 : Math.min(1, (rect.width * rect.height) / viewportArea);
    const isField = FIELD_TAGS.has(element.tagName);
    const isAction = role === "control" && !isField && (ACTION_TAGS.has(element.tagName) || element.hasAttribute("role"));
    const fillUsage: ColorUsage = isAction ? "accent" : "background";
    const fill = resolveColor(style.backgroundColor);
    if (isRoot && fill && fill.alpha >= 0.9) hasCanvasFill = true;
    addColor(style.backgroundColor, fillUsage, isAction ? 1 : area);
    if (style.backgroundImage.includes("gradient(")) {
      const stops = style.backgroundImage.match(/rgba?\([^)]*\)/g) ?? [];
      for (const stop of stops.slice(0, 3)) addColor(stop, fillUsage, isAction ? 0.6 : area * 0.5);
    }

    let textLength = isField ? 8 : 0;
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) textLength += (node.nodeValue ?? "").trim().length;
    }
    const sizePx = parseFloat(style.fontSize);
    if (textLength > 0 && sizePx > 0) {
      addColor(style.color, "text", Math.min(textLength, 240) / 60);
      if (role === "link") addColor(style.color, "accent", 0.35);
      const lineHeight = style.lineHeight === "normal" ? 1.2 : parseFloat(style.lineHeight) / sizePx;
      const tracking = style.letterSpacing === "normal" ? 0 : parseFloat(style.letterSpacing) / sizePx;
      const typeRole: TypeRole = role === "heading" || role === "control" || role === "code" ? role : "body";
      const sample: TypeSample = {
        family: style.fontFamily.slice(0, 240),
        sizePx: Math.round(sizePx * 2) / 2,
        weight: Math.min(1000, Math.max(1, Math.round(Number(style.fontWeight)) || 400)),
        lineHeight: Math.min(4, Math.max(0.5, Math.round(lineHeight * 100) / 100)),
        letterSpacingEm: Math.min(1, Math.max(-0.5, Math.round(tracking * 1000) / 1000)),
        role: typeRole,
        count: 1 + Math.min(textLength, 400) / 400,
      };
      const key = [sample.family, sample.sizePx, sample.weight, sample.lineHeight, sample.letterSpacingEm, typeRole].join("|");
      const existing = typography.get(key);
      if (existing) existing.count += sample.count;
      else typography.set(key, sample);
    }

    for (const edge of ["Top", "Bottom"] as const) {
      if (parseFloat(style[`border${edge}Width`]) > 0 && style[`border${edge}Style`] !== "none") {
        addColor(style[`border${edge}Color`], "border", 0.5);
      }
    }

    if (!isRoot) {
      const gaps = [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft, style.marginTop, style.marginBottom, style.rowGap, style.columnGap];
      for (const gap of gaps) {
        const px = Math.round(parseFloat(gap) * 2) / 2;
        if (px >= 2 && px <= 200) bumpMeasure(spacing, px);
      }
    }

    const cornerValue = style.borderTopLeftRadius;
    const corner = parseFloat(cornerValue);
    if (corner > 0) {
      const isPill = cornerValue.includes("%") ? corner >= 50 : corner >= 8 && corner >= Math.min(rect.width, rect.height) / 2;
      bumpMeasure(radii, isPill ? 9999 : Math.round(corner * 2) / 2);
    }

    if (style.boxShadow && style.boxShadow !== "none") {
      const value = style.boxShadow.slice(0, 400);
      const existing = shadows.get(value);
      if (existing) existing.count += 1;
      else shadows.set(value, { value, count: 1 });
    }
  }
  if (!hasCanvasFill) addColor("rgb(255, 255, 255)", "background", 1);

  const round = (value: number) => Math.round(value * 1000) / 1000;
  const byCount = <T extends { count: number }>(bucket: Map<unknown, T>, limit: number) =>
    Array.from(bucket.values()).sort((a, b) => b.count - a.count).slice(0, limit);

  return {
    title: document.title.trim().slice(0, 200),
    sampledNodes,
    colors: Array.from(colors.values())
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 240)
      .map((color) => ({ ...color, weight: round(color.weight) })),
    typography: byCount(typography, 120).map((sample) => ({ ...sample, count: round(sample.count) })),
    spacing: byCount(spacing, 80),
    radii: byCount(radii, 40),
    shadows: byCount(shadows, 24),
  };
}
