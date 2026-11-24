"use client";

import { useTokenStore } from "@/store/useTokenStore";

const PHASE_LABELS: Record<string, string> = {
  cache: "Cache",
  resolve: "Resolve",
  launch: "Launch",
  navigate: "Navigate",
  sample: "Sample",
  capture: "Capture",
  states: "States",
  scheme: "Scheme",
  viewport: "Viewport",
  pages: "Pages",
};

export function CaptureLog() {
  const status = useTokenStore((state) => state.status);
  const progress = useTokenStore((state) => state.progress);
  if (status !== "extracting" && status !== "normalizing") return null;

  const lines = status === "normalizing" ? [...progress, { phase: "normalize", detail: "Clustering colors and fitting scales", elapsedMs: progress.at(-1)?.elapsedMs ?? 0 }] : progress;

  return (
    <ol aria-live="polite" className="plate mt-3 grid gap-px overflow-hidden bg-hairline font-mono text-[11.5px]">
      {lines.map((line, index) => {
        const isCurrent = index === lines.length - 1;
        return (
          <li key={`${line.phase}-${index}`} className="rise grid grid-cols-[28px_88px_minmax(0,1fr)_64px] items-center gap-3 bg-carbon px-4 py-1.5">
            <span className="text-ink-faint">{String(index + 1).padStart(2, "0")}</span>
            <span className={`uppercase tracking-[0.12em] ${isCurrent ? "text-signal" : "text-ink-dim"}`}>
              {PHASE_LABELS[line.phase] ?? line.phase}
            </span>
            <span className="truncate text-ink">{line.detail}</span>
            <span className="text-right tabular-nums text-ink-faint">{(line.elapsedMs / 1000).toFixed(2)} s</span>
          </li>
        );
      })}
      {status === "extracting" ? (
        <li className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-3 bg-carbon px-4 py-1.5">
          <span className="text-ink-faint">{String(lines.length + 1).padStart(2, "0")}</span>
          <span className="flex items-center gap-2 text-ink-dim">
            <span className="inline-block h-3 w-[7px] animate-pulse bg-signal" />
            {lines.length === 0 ? "Checking the address" : "Working"}
          </span>
        </li>
      ) : null}
    </ol>
  );
}
