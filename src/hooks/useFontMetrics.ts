import { useEffect, useState, type RefObject } from "react";

export interface FontMetrics {
  ascent: number;
  descent: number;
  capHeight: number;
  xHeight: number;
}

const PROBE_SIZE = 200;
const cache = new Map<string, FontMetrics>();
let probe: CanvasRenderingContext2D | null = null;

function measure(font: string): FontMetrics | null {
  const cached = cache.get(font);
  if (cached) return cached;
  probe ??= document.createElement("canvas").getContext("2d");
  if (!probe) return null;

  probe.font = font;
  const capital = probe.measureText("H");
  const lowercase = probe.measureText("x");
  const metrics: FontMetrics = {
    ascent: capital.fontBoundingBoxAscent / PROBE_SIZE,
    descent: capital.fontBoundingBoxDescent / PROBE_SIZE,
    capHeight: capital.actualBoundingBoxAscent / PROBE_SIZE,
    xHeight: lowercase.actualBoundingBoxAscent / PROBE_SIZE,
  };
  cache.set(font, metrics);
  return metrics;
}

export function useFontMetrics(target: RefObject<HTMLElement | null>, family: string, weight: number): FontMetrics | null {
  const [metrics, setMetrics] = useState<FontMetrics | null>(null);

  useEffect(() => {
    let cancelled = false;
    const read = () => {
      const element = target.current;
      if (cancelled || !element) return;
      const style = getComputedStyle(element);
      setMetrics(measure(`${style.fontStyle} ${weight} ${PROBE_SIZE}px ${style.fontFamily}`));
    };

    void document.fonts.ready.then(read);
    const invalidate = () => {
      cache.clear();
      read();
    };
    document.fonts.addEventListener("loadingdone", invalidate);
    return () => {
      cancelled = true;
      document.fonts.removeEventListener("loadingdone", invalidate);
    };
  }, [target, family, weight]);

  return metrics;
}
