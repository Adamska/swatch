"use client";

import { memo, useRef, useState } from "react";
import { useFontMetrics } from "@/hooks/useFontMetrics";
import { useFaceStatus } from "@/hooks/useWebFonts";
import { focusHandlers } from "@/store/useViewStore";
import { leadFamily, resolveFontStack } from "@/lib/tokenStyle";
import { selectTypography, useTokenStore } from "@/store/useTokenStore";
import type { FontRole, TypeStep } from "@/types/tokens";

const SPECIMEN_TEXT: Record<FontRole, string> = {
  display: "Hamburgefonstiv Qualities",
  body: "Sphinx of black quartz, judge my vow at 0123456789",
  mono: "const scale = [12, 14, 16, 20, 28];",
};
const FONT_ROLES: FontRole[] = ["display", "body", "mono"];
const trim = (value: number) => String(Math.round(value * 1000) / 1000);

const STATUS_COPY = {
  bundled: "Bundled face",
  available: "Installed locally",
  loading: "Requesting face",
  fallback: "Not available, using fallback",
} as const;

function FaceCard({ role, stack, optical }: { role: FontRole; stack: string; optical: boolean }) {
  const { status, viaGoogle } = useFaceStatus(stack);
  const label = viaGoogle && status === "available" ? "Loaded from Google Fonts" : STATUS_COPY[status];
  return (
    <div className="bg-carbon px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <p className="label">{role}</p>
        <span
          title={label}
          className={`h-1.5 w-1.5 rounded-full ${status === "fallback" ? "bg-signal" : status === "loading" ? "animate-pulse bg-ink-faint" : "bg-[#7fd18b]"}`}
        />
      </div>
      <p className="mt-2 text-[52px] leading-none text-ink" style={{ fontFamily: resolveFontStack(stack), fontOpticalSizing: optical ? "auto" : "none" }}>
        Ag
      </p>
      <p className="mt-3 truncate text-[13px] text-ink">{leadFamily(stack)}</p>
      <p className={`mt-0.5 text-[11px] ${status === "fallback" ? "text-signal" : "text-ink-faint"}`}>{label}</p>
      <p className="readout mt-1 truncate text-[10.5px] text-ink-faint" title={stack}>
        {stack}
      </p>
    </div>
  );
}

interface SpecimenRowProps {
  step: TypeStep;
  index: number;
  stack: string;
  optical: boolean;
}

const SpecimenRow = memo(function SpecimenRow({ step, index, stack, optical }: SpecimenRowProps) {
  const setTypeSize = useTokenStore((state) => state.setTypeSize);
  const line = useRef<HTMLParagraphElement>(null);
  const metrics = useFontMetrics(line, stack, step.weight);
  const baseline = metrics ? (step.lineHeight - (metrics.ascent + metrics.descent)) / 2 + metrics.ascent : null;
  const guides =
    metrics && baseline !== null
      ? [
          { tag: "cap", offset: baseline - metrics.capHeight, tone: "border-white/30" },
          { tag: "x", offset: baseline - metrics.xHeight, tone: "border-dashed border-white/30" },
          { tag: "base", offset: baseline, tone: "border-signal/70" },
        ]
      : [];

  return (
    <li
      className="grid grid-cols-[150px_minmax(0,1fr)] border-t border-hairline"
      {...focusHandlers({ kind: "type", value: String(step.sizePx), label: `Type ${step.name} · ${trim(step.sizePx)} px` })}
    >
      <div className="border-r border-hairline px-3 py-3">
        <p className="label text-signal">{step.name}</p>
        <p className="readout mt-1.5 whitespace-nowrap text-ink">
          {trim(step.sizePx)} px<span className="text-ink-faint"> · {trim(step.sizePx / 16)} rem</span>
        </p>
        <p className="readout mt-0.5 text-[11px] text-ink-dim">
          LH {trim(step.lineHeight)} · W {step.weight}
        </p>
        <p className="readout text-[11px] text-ink-dim">LS {trim(step.letterSpacingEm)} em</p>
        {step.fluidMinPx !== null ? (
          <p className="readout mt-0.5 text-[11px] text-signal" title="Measured at a 390 px viewport, interpolated to 1440 px">
            Fluid {trim(step.fluidMinPx)} → {trim(step.sizePx)}
          </p>
        ) : null}
        <input
          type="range"
          min={8}
          max={120}
          step={0.5}
          value={step.sizePx}
          onChange={(event) => setTypeSize(index, Number(event.target.value))}
          aria-label={`Size of ${step.name}`}
          className="fine-range mt-2 w-full"
        />
      </div>
      <div className="relative flex items-center overflow-hidden px-4 py-3 [mask-image:linear-gradient(90deg,#000_82%,transparent)]">
        <div className="relative w-full" style={{ fontSize: step.sizePx, lineHeight: step.lineHeight }}>
          {guides.map((guide) => (
            <span
              key={guide.tag}
              aria-hidden="true"
              className={`pointer-events-none absolute inset-x-0 border-t ${guide.tone}`}
              style={{ top: `${guide.offset}em` }}
            />
          ))}
          <p
            ref={line}
            className="relative whitespace-nowrap text-ink"
            style={{
              fontFamily: resolveFontStack(stack),
              fontWeight: step.weight,
              letterSpacing: `${step.letterSpacingEm}em`,
              fontOpticalSizing: optical ? "auto" : "none",
            }}
          >
            {SPECIMEN_TEXT[step.family]}
          </p>
        </div>
      </div>
    </li>
  );
});

export function TypeSpecimenRack() {
  const typography = useTokenStore(selectTypography);
  const [optical, setOptical] = useState(true);
  if (!typography) return null;

  const rows = typography.steps.map((step, index) => ({ step, index })).reverse();

  return (
    <div>
      <div className="grid gap-px bg-hairline sm:grid-cols-3">
        {FONT_ROLES.map((role) => (
          <FaceCard key={role} role={role} stack={typography.families[role]} optical={optical} />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-hairline px-4 py-3">
        <p className="label flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="block w-4 border-t border-white/30" /> Cap height
          </span>
          <span className="flex items-center gap-1.5">
            <span className="block w-4 border-t border-dashed border-white/30" /> x-height
          </span>
          <span className="flex items-center gap-1.5">
            <span className="block w-4 border-t border-signal/70" /> Baseline
          </span>
        </p>
        <button
          type="button"
          aria-pressed={optical}
          onClick={() => setOptical((current) => !current)}
          className="bracket-button ml-auto text-[10.5px]"
        >
          Optical sizing {optical ? "auto" : "off"}
        </button>
      </div>

      <ol>
        {rows.map(({ step, index }) => (
          <SpecimenRow key={step.name} step={step} index={index} stack={typography.families[step.family]} optical={optical} />
        ))}
      </ol>
      <p className="border-t border-hairline px-4 py-3 text-[11.5px] text-ink-faint">
        Specimens render with the extracted stack. Faces published on Google Fonts are requested automatically; others
        fall back to the next family in the stack. Guides are measured from whichever face the browser resolves.
      </p>
    </div>
  );
}
