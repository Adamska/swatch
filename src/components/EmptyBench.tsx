"use client";

import type { MouseEvent } from "react";
import { SAMPLE_PROFILES } from "@/lib/samples";
import { selectIsBusy, useTokenStore } from "@/store/useTokenStore";
import { RegistrationMark } from "./ui/RegistrationMark";

const STAGES = [
  ["01", "Inspect", "Headless Chromium opens the page with media, fonts and trackers blocked."],
  ["02", "Sample", "Computed styles are read from landmarks, type, surfaces and controls."],
  ["03", "Normalize", "Colors are clustered perceptually and scales are fitted to a grid."],
  ["04", "Export", "Tune any token, then copy a Tailwind config or CSS variables."],
] as const;

export function EmptyBench() {
  const loadSample = useTokenStore((state) => state.loadSample);
  const isBusy = useTokenStore(selectIsBusy);

  const handleLoad = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    loadSample(SAMPLE_PROFILES[0].id, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  };

  return (
    <section className="plate mt-8">
      <div className="relative grid place-items-center overflow-hidden px-6 pb-16 pt-20 text-center">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center gap-7 opacity-70">
          {[-3, -2, -1, 0, 1, 2, 3].map((offset) => (
            <span
              key={offset}
              className="hidden h-[220px] w-[160px] shrink-0 border border-dashed border-hairline-strong sm:block"
              style={{ transform: `translateY(${Math.abs(offset) * 12}px) rotate(${offset * 2}deg)` }}
            />
          ))}
        </div>
        <div className="relative bg-carbon/85 px-8 py-6">
          <RegistrationMark size={42} className={`mx-auto text-signal ${isBusy ? "animate-spin [animation-duration:2.4s]" : ""}`} />
          <p className="label mt-6 text-signal">{isBusy ? "Specimen incoming" : "Bench is clear"}</p>
          <h2
            className="mx-auto mt-3 max-w-xl font-display text-[clamp(30px,4.6vw,52px)] leading-[1.04] tracking-[-0.02em]"
            style={{ fontVariationSettings: '"opsz" 144, "SOFT" 60' }}
          >
            Put a website under the lens.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[14px] text-ink-dim">
            Swatch reads the styles a page actually computes and resolves them into a design system you can inspect,
            tune and export.
          </p>
          <button type="button" onClick={handleLoad} disabled={isBusy} className="bracket-button mt-8 text-[12.5px]">
            Load Sample Extraction
          </button>
        </div>
      </div>

      <ol className="grid gap-px border-t border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
        {STAGES.map(([index, title, detail]) => (
          <li key={index} className="bg-carbon px-5 py-5">
            <p className="label">
              <span className="text-signal">{index}</span>
              <span className="ml-2.5 text-ink">{title}</span>
            </p>
            <p className="mt-2 text-[12.5px] text-ink-dim">{detail}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
