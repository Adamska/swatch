"use client";

import { memo } from "react";
import { pickReadable } from "@/lib/color";
import { selectActiveColors, selectRadii, selectShadows, useTokenStore } from "@/store/useTokenStore";
import { focusHandlers } from "@/store/useViewStore";
import type { MeasureStep } from "@/types/tokens";

const RadiusSpecimen = memo(function RadiusSpecimen({ step, index }: { step: MeasureStep; index: number }) {
  const setRadius = useTokenStore((state) => state.setRadius);
  const isPill = step.px >= 999;

  return (
    <li
      className="bg-carbon px-4 py-4"
      {...focusHandlers({ kind: "radius", value: String(step.px), label: `Radius ${step.name} · ${isPill ? "full" : `${step.px} px`}` })}
    >
      <div className="flex items-baseline justify-between">
        <span className="label text-signal">{step.name}</span>
        <span className="readout text-ink">{isPill ? "full" : `${step.px} px`}</span>
      </div>
      <div className="relative mt-4 h-[72px]">
        <div
          className="morph absolute left-0 top-0 h-[72px] w-[104px] border border-ink bg-ink/[0.06]"
          style={{ borderRadius: isPill ? 9999 : step.px }}
        />
        <span
          aria-hidden="true"
          className="morph absolute left-0 top-0 border-b border-r border-dashed border-signal/80"
          style={{ width: isPill ? 36 : Math.min(step.px, 52), height: isPill ? 36 : Math.min(step.px, 36) }}
        />
      </div>
      {isPill ? (
        <p className="mt-3 text-[11.5px] text-ink-faint">Observed on pills and avatars.</p>
      ) : (
        <input
          type="range"
          min={0}
          max={48}
          step={1}
          value={step.px}
          onChange={(event) => setRadius(index, Number(event.target.value))}
          aria-label={`Radius ${step.name} in pixels`}
          className="fine-range mt-3 w-full"
        />
      )}
    </li>
  );
});

export function RadiiShadows() {
  const radii = useTokenStore(selectRadii);
  const shadows = useTokenStore(selectShadows);
  const colors = useTokenStore(selectActiveColors);
  const background = colors?.background;
  const surface = colors?.surface;
  const border = colors?.border;
  if (!radii || !shadows) return null;
  const captionInk = pickReadable(background ?? "#07080b", ["#0b0c0f", "#f7f7f5"]);

  return (
    <>
      <section aria-label="Corner radii" className="border-t border-hairline">
        <p className="label px-4 py-3">Corner radii</p>
        <ul className="grid grid-cols-2 gap-px border-t border-hairline bg-hairline sm:grid-cols-3">
          {radii.map((step, index) => (
            <RadiusSpecimen key={step.name} step={step} index={index} />
          ))}
        </ul>
      </section>

      <section aria-label="Elevation" className="border-t border-hairline">
        <p className="label px-4 py-3">Elevation</p>
        {shadows.length === 0 ? (
          <p className="border-t border-hairline px-4 py-5 text-[12.5px] text-ink-dim">
            No box shadows were captured. This system relies on borders and tone for depth.
          </p>
        ) : (
          <ul className="morph grid gap-px border-t border-hairline sm:grid-cols-3" style={{ backgroundColor: background, color: captionInk }}>
            {shadows.map((shadow) => (
              <li key={shadow.name} className="px-5 pb-4 pt-7">
                <div
                  className="morph h-16 border"
                  style={{ backgroundColor: surface, borderColor: border, boxShadow: shadow.value, borderRadius: 6 }}
                />
                <p className="label mt-5 text-current">{shadow.name}</p>
                <p className="readout mt-1 line-clamp-2 text-[10.5px] opacity-70" title={shadow.value}>
                  {shadow.value}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
