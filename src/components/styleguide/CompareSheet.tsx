"use client";

import { useMemo } from "react";
import { deltaE } from "@/lib/color";
import { useTokenStore } from "@/store/useTokenStore";
import { SEMANTIC_COLOR_KEYS, type DesignSystemTokens } from "@/types/tokens";

const host = (url: string) => new URL(url).hostname.replace(/^www\./, "");
const perceptual = (a: string, b: string) => Math.round(deltaE(a, b) * 1000) / 10;

function verdict(distance: number): string {
  if (distance < 2) return "Identical to the eye";
  if (distance < 6) return "Close relatives";
  if (distance < 14) return "Same family";
  return "Distinct";
}

function compare(reference: DesignSystemTokens, current: DesignSystemTokens) {
  const colors = SEMANTIC_COLOR_KEYS.map((key) => ({
    key,
    a: reference.colors[key],
    b: current.colors[key],
    distance: perceptual(reference.colors[key], current.colors[key]),
  }));
  const names = [...new Set([...reference.typography.steps, ...current.typography.steps].map((step) => step.name))];
  const type = names
    .map((name) => ({
      name,
      a: reference.typography.steps.find((step) => step.name === name)?.sizePx ?? null,
      b: current.typography.steps.find((step) => step.name === name)?.sizePx ?? null,
    }))
    .sort((x, y) => (x.b ?? x.a ?? 0) - (y.b ?? y.a ?? 0));
  const mean = colors.reduce((sum, entry) => sum + entry.distance, 0) / colors.length;
  return { colors, type, mean };
}

export function CompareSheet() {
  const reference = useTokenStore((state) => state.reference);
  const tokens = useTokenStore((state) => state.tokens);
  const source = useTokenStore((state) => state.source);
  const pinReference = useTokenStore((state) => state.pinReference);
  const clearReference = useTokenStore((state) => state.clearReference);
  const restore = useTokenStore((state) => state.restore);
  const result = useMemo(() => (reference && tokens ? compare(reference.tokens, tokens) : null), [reference, tokens]);

  if (!reference || !tokens || !source || !result) {
    return (
      <div className="grid place-items-center px-6 py-16 text-center">
        <div className="max-w-md">
          <p className="label text-signal">No reference pinned</p>
          <p className="mt-3 text-[13px] text-ink-dim">
            Pin the system on the bench as a reference, then inspect another site or load another sample. This sheet
            measures every role and step between the two.
          </p>
          <button type="button" onClick={pinReference} className="bracket-button mt-6 text-[11px]">
            Pin current system
          </button>
        </div>
      </div>
    );
  }

  const isSame = reference.tokens === tokens;
  const maxType = Math.max(...result.type.flatMap((row) => [row.a ?? 0, row.b ?? 0]), 1);

  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-4 border-b border-hairline px-4 py-4">
        <div className="min-w-0">
          <p className="label text-ink-faint">A · reference</p>
          <p className="mt-1 truncate font-display text-[24px] leading-tight">{reference.tokens.meta.name}</p>
          <p className="readout truncate text-[11px] text-ink-dim">{host(reference.source.url)}</p>
        </div>
        <div className="pb-1 text-center">
          <p className="readout text-[22px] text-signal">{isSame ? "—" : result.mean.toFixed(1)}</p>
          <p className="label text-[9px]">Mean ΔE</p>
        </div>
        <div className="min-w-0 text-right">
          <p className="label text-ink-faint">B · on the bench</p>
          <p className="mt-1 truncate font-display text-[24px] leading-tight">{tokens.meta.name}</p>
          <p className="readout truncate text-[11px] text-ink-dim">{host(source.url)}</p>
        </div>
      </div>
      {isSame ? (
        <p className="border-b border-hairline px-4 py-3 text-[12.5px] text-ink-dim">
          The reference is the system on the bench. Inspect a URL or load a sample to compare against it.
        </p>
      ) : null}

      <p className="label px-4 pb-2 pt-4">Color roles · ΔE OKLab × 100</p>
      <ul>
        {result.colors.map((row) => (
          <li key={row.key} className="grid grid-cols-[96px_28px_28px_minmax(0,1fr)_44px] items-center gap-3 border-t border-hairline px-4 py-1.5">
            <span className="truncate text-[12px] text-ink-dim">{row.key.replace(/([A-Z])/g, " $1").toLowerCase()}</span>
            <span className="h-5 border border-hairline-strong" style={{ backgroundColor: row.a }} title={row.a} />
            <span className="h-5 border border-hairline-strong" style={{ backgroundColor: row.b }} title={row.b} />
            <span className="relative h-[3px] bg-hairline" title={verdict(row.distance)}>
              <span className="morph absolute inset-y-0 left-0 bg-signal" style={{ width: `${Math.min(100, row.distance * 2.5)}%` }} />
            </span>
            <span className="readout text-right text-[11px] text-ink">{row.distance.toFixed(1)}</span>
          </li>
        ))}
      </ul>

      <p className="label border-t border-hairline px-4 pb-2 pt-4">Type scale · px</p>
      <ul>
        {result.type.map((row) => (
          <li key={row.name} className="grid grid-cols-[48px_minmax(0,1fr)_92px] items-center gap-3 border-t border-hairline px-4 py-1.5">
            <span className="label text-signal">{row.name}</span>
            <span className="grid gap-[3px]">
              <span className="morph h-[3px] bg-ink/40" style={{ width: `${((row.a ?? 0) / maxType) * 100}%` }} />
              <span className="morph h-[3px] bg-ink" style={{ width: `${((row.b ?? 0) / maxType) * 100}%` }} />
            </span>
            <span className="readout text-right text-[11px] text-ink-dim">
              {row.a ?? "—"} <span className="text-ink-faint">→</span> <span className="text-ink">{row.b ?? "—"}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-2 gap-px border-t border-hairline bg-hairline sm:grid-cols-4">
        {[
          ["Base unit", `${reference.tokens.spacing.baseUnitPx} → ${tokens.spacing.baseUnitPx} px`],
          ["Spacing steps", `${reference.tokens.spacing.steps.length} → ${tokens.spacing.steps.length}`],
          ["Radii", `${reference.tokens.radii.map((step) => (step.px >= 999 ? "full" : step.px)).join(" ")} → ${tokens.radii.map((step) => (step.px >= 999 ? "full" : step.px)).join(" ")}`],
          ["Elevations", `${reference.tokens.shadows.length} → ${tokens.shadows.length}`],
        ].map(([label, value]) => (
          <div key={label} className="bg-carbon px-4 py-3">
            <p className="label text-[9.5px]">{label}</p>
            <p className="readout mt-1 truncate text-[11.5px] text-ink">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap justify-end gap-6 border-t border-hairline px-4 py-3">
        <button type="button" onClick={() => restore(reference)} disabled={isSame} className="bracket-button text-[10.5px]">
          Put A on the bench
        </button>
        <button type="button" onClick={pinReference} disabled={isSame} className="bracket-button text-[10.5px]">
          Pin B instead
        </button>
        <button type="button" onClick={clearReference} className="bracket-button text-[10.5px]">
          Clear reference
        </button>
      </div>
    </div>
  );
}
