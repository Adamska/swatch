"use client";

import { useMemo } from "react";
import { contrastGrade, contrastRatio, toOklch } from "@/lib/color";
import { selectActiveColors, selectPalette, useTokenStore } from "@/store/useTokenStore";
import type { SemanticColorKey } from "@/types/tokens";

const WEDGE_STEPS = 21;
const WEDGE = Array.from({ length: WEDGE_STEPS }, (_, step) => `oklch(${(step / (WEDGE_STEPS - 1)).toFixed(3)} 0 0)`);
const NEEDLE_SLOTS = 12;

export function CalibrationStrip() {
  const palette = useTokenStore(selectPalette);
  const colors = useTokenStore(selectActiveColors);
  const liftContrast = useTokenStore((state) => state.liftContrast);

  const needles = useMemo(
    () => (palette ?? []).map((entry) => ({ hex: entry.hex, lightness: toOklch(entry.hex).l })),
    [palette],
  );
  const pairs = useMemo(() => {
    if (!colors) return [];
    const definitions: [label: string, key: SemanticColorKey, ground: string][] = [
      ["Foreground on background", "foreground", colors.background],
      ["Muted on background", "muted", colors.background],
      ["Primary on background", "primary", colors.background],
      ["Label on primary", "primaryForeground", colors.primary],
    ];
    return definitions.map(([label, key, ground]) => {
      const ink = colors[key];
      const ratio = contrastRatio(ink, ground);
      return { label, key, ink, ground, ratio, grade: contrastGrade(ratio) };
    });
  }, [colors]);
  const anchors = useMemo(() => {
    if (!colors) return [];
    const roles: [tag: string, hex: string][] = [
      ["BG", colors.background],
      ["FG", colors.foreground],
      ["PRI", colors.primary],
    ];
    return roles.map(([tag, hex]) => ({ tag, lightness: toOklch(hex).l }));
  }, [colors]);

  if (!colors) return null;

  return (
    <div className="grid gap-x-10 gap-y-6 border-t border-hairline px-4 pb-5 pt-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div>
        <p className="label mb-5">Luminance calibration wedge</p>
        <div className="relative">
          {Array.from({ length: NEEDLE_SLOTS }, (_, slot) => {
            const needle = needles[slot];
            return (
              <span
                key={slot}
                aria-hidden="true"
                className="morph absolute -top-3 flex h-[38px] w-px -translate-x-1/2 flex-col items-center bg-ink/70 mix-blend-difference"
                style={{ left: `${(needle?.lightness ?? 0) * 100}%`, opacity: needle ? 1 : 0 }}
              >
                <span
                  className="morph -mt-1 block h-2 w-2 shrink-0 rotate-45 border border-carbon"
                  style={{ backgroundColor: needle?.hex ?? "transparent" }}
                />
              </span>
            );
          })}
          <div className="flex h-[26px] border border-hairline-strong">
            {WEDGE.map((shade) => (
              <span key={shade} className="flex-1" style={{ background: shade }} />
            ))}
          </div>
          <div className="relative mt-1.5 h-7">
            {anchors.map((anchor, index) => (
              <span
                key={anchor.tag}
                className="morph label absolute flex -translate-x-1/2 flex-col items-center gap-0.5 text-[9px] text-ink"
                style={{ left: `${anchor.lightness * 100}%`, top: index === 2 ? 12 : 0 }}
              >
                <span className="block h-1.5 w-px bg-signal" />
                {anchor.tag}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-1 flex justify-between">
          <span className="label text-[9px] text-ink-faint">L 0</span>
          <span className="label text-[9px] text-ink-faint">L 50</span>
          <span className="label text-[9px] text-ink-faint">L 100</span>
        </div>
      </div>

      <div>
        <p className="label mb-3">Contrast checks · WCAG 2.2</p>
        <ul className="divide-y divide-hairline border-y border-hairline">
          {pairs.map((pair) => (
            <li key={pair.label} className="flex items-center gap-3 py-[7px]">
              <span
                className="grid h-6 w-9 shrink-0 place-items-center border border-hairline-strong text-[11px] font-semibold"
                style={{ backgroundColor: pair.ground, color: pair.ink }}
              >
                Aa
              </span>
              <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-dim">{pair.label}</span>
              {pair.ratio < 4.5 ? (
                <button
                  type="button"
                  onClick={() => liftContrast(pair.key)}
                  className="label whitespace-nowrap text-[9.5px] text-signal underline-offset-4 hover:underline"
                >
                  Lift
                </button>
              ) : null}
              <span className="readout text-ink">{pair.ratio.toFixed(2)}:1</span>
              <span
                className={`label w-[76px] whitespace-nowrap border px-1.5 py-1 text-center text-[9.5px] ${
                  pair.grade === "Fail" ? "border-signal text-signal" : "border-hairline-strong text-ink"
                }`}
              >
                {pair.grade}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
