"use client";

import { contrastRatio, pickReadable } from "@/lib/color";
import { partnerOf } from "@/lib/colorPairs";
import { buildTonalScale } from "@/lib/colorScale";
import { resolveFontStack } from "@/lib/tokenStyle";
import { selectActiveColors, useTokenStore } from "@/store/useTokenStore";
import { SEMANTIC_COLOR_KEYS } from "@/types/tokens";

const SCALE_ROLES = ["primary", "secondary", "accent", "muted"] as const;

/** A single landscape sheet rendered only for print, so the browser's print dialog produces the PDF. */
export function SpecimenPoster() {
  const tokens = useTokenStore((state) => state.tokens);
  const source = useTokenStore((state) => state.source);
  const colors = useTokenStore(selectActiveColors);
  if (!tokens || !source || !colors) return null;

  const steps = [...tokens.typography.steps].sort((a, b) => b.sizePx - a.sizePx).slice(0, 7);
  const date = new Date(source.capturedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <article className="specimen-poster flex-col" aria-hidden="true">
      <header className="flex items-end justify-between border-b border-white/20 pb-[6mm]">
        <div>
          <p className="font-mono text-[8pt] uppercase tracking-[0.2em] text-[#ff6a3d]">Swatch · design system specimen</p>
          <h1 className="mt-[2mm] font-display text-[44pt] leading-none tracking-[-0.02em]">{tokens.meta.name}</h1>
        </div>
        <div className="text-right font-mono text-[8pt] leading-relaxed text-white/60">
          <p>{source.url}</p>
          <p>Captured {date}</p>
          <p>{tokens.meta.method === "ai" ? `Synthesized with ${tokens.meta.model}` : "Perceptual clustering"}</p>
        </div>
      </header>

      <div className="mt-[8mm] grid flex-1 grid-cols-[1.15fr_1fr] gap-[12mm]">
        <section>
          <p className="font-mono text-[7.5pt] uppercase tracking-[0.18em] text-white/55">Color roles</p>
          <div className="mt-[3mm] grid grid-cols-6 gap-[2mm]">
            {SEMANTIC_COLOR_KEYS.map((key) => (
              <div key={key} className="border border-white/20">
                <div
                  className="h-[30mm] p-[2mm] font-mono text-[7pt]"
                  style={{ backgroundColor: colors[key], color: pickReadable(colors[key], ["#0b0c0f", "#f7f7f5"]) }}
                >
                  {contrastRatio(colors[key], partnerOf(key, colors).hex).toFixed(1)}:1
                </div>
                <p className="truncate px-[1.5mm] pt-[1mm] text-[7pt]">{key.replace(/([A-Z])/g, " $1")}</p>
                <p className="px-[1.5mm] pb-[1mm] font-mono text-[6.5pt] uppercase text-white/60">{colors[key]}</p>
              </div>
            ))}
          </div>
          <p className="mt-[6mm] font-mono text-[7.5pt] uppercase tracking-[0.18em] text-white/55">Tonal scales</p>
          <div className="mt-[3mm] grid gap-[2.5mm]">
            {SCALE_ROLES.map((role) => (
              <div key={role} className="grid grid-cols-[18mm_1fr] items-center">
                <span className="font-mono text-[7pt] uppercase text-white/55">{role === "muted" ? "neutral" : role}</span>
                <div className="grid grid-cols-11">
                  {buildTonalScale(colors[role]).map((tile) => (
                    <span key={tile.stop} className="h-[14mm]" style={{ backgroundColor: tile.hex }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <p className="font-mono text-[7.5pt] uppercase tracking-[0.18em] text-white/55">Type scale</p>
          <div className="mt-[2mm] grid">
            {steps.map((step) => (
              <div key={step.name} className="grid grid-cols-[18mm_1fr] items-baseline border-b border-white/10 py-[2mm]">
                <span className="font-mono text-[7pt] text-white/60">
                  {step.name} · {step.sizePx}
                </span>
                <span
                  className="truncate"
                  style={{
                    fontFamily: resolveFontStack(tokens.typography.families[step.family]),
                    fontSize: `${Math.min(step.sizePx, 64) * 0.9}pt`,
                    fontWeight: step.weight,
                    letterSpacing: `${step.letterSpacingEm}em`,
                    lineHeight: 1.1,
                  }}
                >
                  Hamburgefonstiv
                </span>
              </div>
            ))}
          </div>
          <p className="mt-[5mm] font-mono text-[7.5pt] uppercase tracking-[0.18em] text-white/55">Spacing · radii</p>
          <div className="mt-[3mm] flex items-end gap-[1.5mm]">
            {tokens.spacing.steps.map((step) => (
              <span key={step.name} className="w-[4mm] bg-white/70" style={{ height: `${Math.min(step.px, 128) * 0.32}mm` }} title={step.name} />
            ))}
            <span className="mx-[3mm] h-[12mm] w-px bg-white/20" />
            {tokens.radii.map((step) => (
              <span key={step.name} className="h-[18mm] w-[22mm] border border-white/70" style={{ borderRadius: step.px >= 999 ? 9999 : step.px }} />
            ))}
          </div>
        </section>
      </div>
      <footer className="mt-[8mm] flex h-[9mm] overflow-hidden border border-white/20">
        {tokens.palette.map((entry) => (
          <span key={entry.hex} style={{ backgroundColor: entry.hex, flexGrow: Math.max(entry.share, 0.02) }} />
        ))}
      </footer>
    </article>
  );
}
