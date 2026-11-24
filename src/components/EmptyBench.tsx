"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { resolveFontStack } from "@/lib/tokenStyle";
import { SAMPLE_PROFILES } from "@/lib/samples";
import { getSampleTokens, selectIsBusy, useTokenStore } from "@/store/useTokenStore";
import { RegistrationMark } from "./ui/RegistrationMark";

const STAGES = [
  ["01", "Inspect", "Headless Chromium opens the page and two internal pages with media and trackers blocked."],
  ["02", "Sample", "Computed styles, hover and focus states, the dark scheme and mobile type are recorded."],
  ["03", "Normalize", "Colors are clustered perceptually and scales are fitted to a grid in OKLCH."],
  ["04", "Export", "Tune any token, then export Tailwind, CSS variables, shadcn/ui or Design Tokens."],
] as const;
const CARD_OFFSETS = [-3, -2, -1, 1, 2, 3];
const CYCLE_MS = 2600;

function DriftingCard({ offset, cycle }: { offset: number; cycle: number }) {
  const profile = SAMPLE_PROFILES[(cycle + offset + SAMPLE_PROFILES.length * 4) % SAMPLE_PROFILES.length];
  const tokens = getSampleTokens(profile.id);
  if (!tokens) return null;
  const { colors, typography } = tokens;

  return (
    <span
      className="hidden h-[210px] w-[150px] shrink-0 flex-col overflow-hidden border border-hairline-strong transition-[transform,opacity] duration-700 ease-spotlight sm:flex"
      style={{
        transform: `translateY(${Math.abs(offset) * 14}px) rotate(${offset * 2.2}deg)`,
        opacity: 0.22 + 0.1 * (3 - Math.abs(offset)),
      }}
    >
      <span className="flex flex-1 flex-col justify-between p-3 transition-colors duration-700" style={{ backgroundColor: colors.background, color: colors.foreground }}>
        <span className="text-[34px] leading-none transition-colors duration-700" style={{ fontFamily: resolveFontStack(typography.families.display) }}>
          Aa
        </span>
        <span className="text-[10px] leading-tight opacity-70">{profile.label}</span>
      </span>
      <span className="flex h-9">
        {[colors.primary, colors.secondary, colors.accent, colors.foreground].map((hex, index) => (
          <span key={index} className="flex-1 transition-colors duration-700" style={{ backgroundColor: hex }} />
        ))}
      </span>
    </span>
  );
}

export function EmptyBench() {
  const loadSample = useTokenStore((state) => state.loadSample);
  const isBusy = useTokenStore(selectIsBusy);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setCycle((value) => value + 1), CYCLE_MS);
    return () => clearInterval(timer);
  }, []);

  const handleLoad = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    loadSample(SAMPLE_PROFILES[0].id, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  };

  return (
    <section className="plate mt-8">
      <div className="relative grid place-items-center overflow-hidden px-6 pb-16 pt-20 text-center">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center gap-6">
          {CARD_OFFSETS.map((offset) => (
            <DriftingCard key={offset} offset={offset} cycle={cycle} />
          ))}
        </div>
        <div className="relative border border-hairline bg-carbon/90 px-8 py-7 backdrop-blur-sm">
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
            tune, compare and export.
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
