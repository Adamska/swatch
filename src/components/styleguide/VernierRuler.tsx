"use client";

import { memo } from "react";
import { selectSpacing, useTokenStore } from "@/store/useTokenStore";
import { focusHandlers } from "@/store/useViewStore";
import type { MeasureStep } from "@/types/tokens";

const TRACK_PX = 320;
const MAIN_SCALE =
  "repeating-linear-gradient(90deg, color-mix(in oklab, var(--color-tint) 42%, transparent) 0 1px, transparent 1px 16px) 0 0 / 100% 9px no-repeat, repeating-linear-gradient(90deg, color-mix(in oklab, var(--color-tint) 20%, transparent) 0 1px, transparent 1px 4px) 0 0 / 100% 5px no-repeat";
const VERNIER_SCALE = "repeating-linear-gradient(90deg, var(--color-signal) 0 1px, transparent 1px 3.6px)";
const MAJOR_TICKS = Array.from({ length: TRACK_PX / 32 + 1 }, (_, tick) => tick * 32);
const trim = (value: number) => String(Math.round(value * 1000) / 1000);

const CaliperRow = memo(function CaliperRow({ step, index }: { step: MeasureStep; index: number }) {
  const setSpacing = useTokenStore((state) => state.setSpacing);
  const reading = Math.min(step.px, TRACK_PX);

  return (
    <li
      className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-x-4 border-t border-hairline px-4 py-2.5 sm:grid-cols-[52px_minmax(0,1fr)_132px]"
      {...focusHandlers({ kind: "space", value: String(step.px), label: `Spacing ${step.name} · ${trim(step.px)} px` })}
    >
      <span className="readout text-signal">{step.name}</span>
      <div className="relative h-8 max-w-full" style={{ width: TRACK_PX }}>
        <div className="absolute inset-0 border-l border-ink" style={{ background: MAIN_SCALE }} />
        <div
          className="morph absolute inset-y-0 left-0 border-r border-ink bg-ink/[0.07]"
          style={{ width: reading }}
        >
          <span className="absolute -right-px bottom-0 h-full w-[3px] translate-x-full bg-ink" />
          <span
            className="absolute bottom-0 left-full ml-[3px] h-[7px] w-[37px]"
            style={{ background: VERNIER_SCALE }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={TRACK_PX}
          step={1}
          value={reading}
          onChange={(event) => setSpacing(index, Number(event.target.value))}
          aria-label={`Spacing ${step.name} in pixels`}
          className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
        />
      </div>
      <span className="readout col-span-2 mt-1 text-ink-dim sm:col-span-1 sm:mt-0 sm:text-right">
        <span className="text-ink">{trim(step.px)} px</span> · {trim(step.px / 16)} rem
      </span>
    </li>
  );
});

export function VernierRuler() {
  const spacing = useTokenStore(selectSpacing);
  if (!spacing) return null;

  return (
    <section aria-label="Spacing scale">
      <div className="flex flex-wrap items-baseline justify-between gap-3 px-4 py-3">
        <p className="label">Spacing · vernier scale 1:1</p>
        <p className="readout text-ink-dim">
          Base unit <span className="text-ink">{spacing.baseUnitPx} px</span> · half step{" "}
          <span className="text-ink">{spacing.baseUnitPx / 2} px</span>
        </p>
      </div>
      <div className="grid grid-cols-[52px_minmax(0,1fr)] gap-x-4 px-4 pb-1.5 sm:grid-cols-[52px_minmax(0,1fr)_132px]">
        <span className="label text-[9px] text-ink-faint">Key</span>
        <div className="relative h-3 max-w-full" style={{ width: TRACK_PX }}>
          {MAJOR_TICKS.map((tick) => (
            <span
              key={tick}
              className="label absolute top-0 -translate-x-1/2 text-[9px] text-ink-faint"
              style={{ left: `${(tick / TRACK_PX) * 100}%` }}
            >
              {tick}
            </span>
          ))}
        </div>
      </div>
      <ol>
        {spacing.steps.map((step, index) => (
          <CaliperRow key={index} step={step} index={index} />
        ))}
      </ol>
      <p className="border-t border-hairline px-4 py-3 text-[11.5px] text-ink-faint">
        Drag along a track to slide its jaw. Keys follow the Tailwind convention of pixels divided by four.
      </p>
    </section>
  );
}
