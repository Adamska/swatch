"use client";

import { useEffect, useMemo, useRef } from "react";
import { matchRects } from "@/lib/anchorMatch";
import { useTokenStore } from "@/store/useTokenStore";
import { useViewStore } from "@/store/useViewStore";

export function SourceCapture() {
  const evidence = useTokenStore((state) => state.evidence);
  const sourceUrl = useTokenStore((state) => state.source?.url ?? "");
  const focus = useViewStore((state) => state.focus);
  const viewport = useRef<HTMLDivElement>(null);
  const rects = useMemo(() => (evidence ? matchRects(evidence.anchors, focus) : []), [evidence, focus]);

  useEffect(() => {
    const frame = viewport.current;
    if (!frame || !evidence || rects.length === 0) return;
    const scale = frame.clientWidth / evidence.width;
    const top = Math.min(...rects.map(([, y]) => y)) * scale;
    if (top < frame.scrollTop || top > frame.scrollTop + frame.clientHeight - 60) {
      frame.scrollTo({ top: Math.max(0, top - 48), behavior: "smooth" });
    }
  }, [rects, evidence]);

  if (!evidence) {
    return (
      <div className="grid min-h-[360px] place-items-center px-8 py-12 text-center">
        <div className="max-w-sm">
          <p className="label text-signal">No source capture</p>
          <p className="mt-3 text-[13px] text-ink-dim">
            Captures are recorded during live inspections. Sample profiles are authored offline, so there is no page
            to point back to. Inspect a URL, then hover any specimen to see where it was found.
          </p>
        </div>
      </div>
    );
  }

  const status = !focus
    ? "Hover any chip, type row, spacing or radius to locate it"
    : rects.length === 0
      ? `${focus.label} is not visible in the captured area`
      : `${focus.label} · ${rects.length} region${rects.length === 1 ? "" : "s"}`;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-2.5">
        <p className={`readout truncate text-[11.5px] ${rects.length > 0 ? "text-ink" : "text-ink-dim"}`}>{status}</p>
        <p className="label shrink-0 text-[9.5px] text-ink-faint">Media and webfonts withheld</p>
      </div>
      <div ref={viewport} className="relative max-h-[560px] overflow-y-auto bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element -- capture is a data URL produced at runtime */}
        <img src={evidence.image} alt={`Structural capture of ${sourceUrl}`} className="block w-full" draggable={false} />
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${evidence.width} ${evidence.height}`}
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          <defs>
            <mask id="source-spotlight">
              <rect width={evidence.width} height={evidence.height} fill="white" />
              {rects.map(([x, y, width, height], index) => (
                <rect key={index} x={x - 4} y={y - 4} width={width + 8} height={height + 8} fill="black" />
              ))}
            </mask>
          </defs>
          <rect
            width={evidence.width}
            height={evidence.height}
            fill="#07080b"
            mask="url(#source-spotlight)"
            className="transition-opacity duration-300"
            opacity={rects.length > 0 ? 0.62 : 0}
          />
          {rects.map(([x, y, width, height], index) => (
            <g key={index}>
              <rect x={x - 4} y={y - 4} width={width + 8} height={height + 8} fill="none" stroke="#ff6a3d" strokeWidth={3} />
              <path d={`M${x - 14} ${y - 4}h8M${x - 4} ${y - 14}v8`} stroke="#ff6a3d" strokeWidth={3} />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
