"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

interface Measure {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  padLeft: number;
  radius: number;
  type: string | null;
}

const MORPH_TRACKING_MS = 900;
const round = (value: number) => Math.round(value * 10) / 10;

function measure(stage: HTMLElement): Measure[] {
  const origin = stage.getBoundingClientRect();
  return [...stage.querySelectorAll<HTMLElement>("[data-redline]")].map((element, index) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const isText = element.dataset.redline === "Heading";
    return {
      id: `${element.dataset.redline}-${index}`,
      label: element.dataset.redline ?? "",
      x: rect.left - origin.left,
      y: rect.top - origin.top,
      width: rect.width,
      height: rect.height,
      padLeft: parseFloat(style.paddingLeft),
      radius: parseFloat(style.borderTopLeftRadius),
      type: isText ? `${round(parseFloat(style.fontSize))} / ${round(parseFloat(style.lineHeight))}` : null,
    };
  });
}

/** Draws drafting-style dimension lines over every `[data-redline]` element on the stage. */
export function Redlines({ stage, revision }: { stage: RefObject<HTMLElement | null>; revision: unknown }) {
  const [measures, setMeasures] = useState<Measure[]>([]);

  useLayoutEffect(() => {
    const element = stage.current;
    if (!element) return;
    let frame = 0;
    const startedAt = performance.now();
    const track = () => {
      setMeasures(measure(element));
      if (performance.now() - startedAt < MORPH_TRACKING_MS) frame = requestAnimationFrame(track);
    };
    track();
    const observer = new ResizeObserver(() => setMeasures(measure(element)));
    observer.observe(element);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [stage, revision]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 font-mono text-[10px] text-signal">
      {measures.map((item) => (
        <div key={item.id} className="absolute" style={{ left: item.x, top: item.y, width: item.width, height: item.height }}>
          <div className="absolute inset-0 border border-dashed border-signal/70" style={{ borderRadius: item.radius }} />
          <span className="absolute -top-[15px] left-0 whitespace-nowrap bg-signal px-1 text-[9px] leading-[13px] text-carbon">
            {item.label}
            {item.type ? ` ${item.type}` : ` ${Math.round(item.width)}×${round(item.height)}`}
            {item.type === null && item.radius > 0 ? ` r${round(item.radius)}` : ""}
          </span>
          {item.padLeft > 2 ? (
            <span className="absolute left-0 top-1/2 flex -translate-y-1/2 items-center" style={{ width: item.padLeft }}>
              <span className="h-[5px] w-full border-x border-signal bg-[linear-gradient(var(--color-signal),var(--color-signal))_center/100%_1px_no-repeat]" />
              <span className="absolute left-1/2 top-2 -translate-x-1/2 bg-carbon px-0.5 text-[9px] leading-[12px]">{round(item.padLeft)}</span>
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
