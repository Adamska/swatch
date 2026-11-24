"use client";

import { useMemo, useState } from "react";
import { toOklch, type Oklch } from "@/lib/color";
import { selectPalette, useTokenStore } from "@/store/useTokenStore";
import type { PaletteEntry } from "@/types/tokens";

interface Band extends PaletteEntry {
  lch: Oklch;
}

const SLOT_COUNT = 12;
const NEUTRAL_CHROMA = 0.035;
const HUE_RAIL = `linear-gradient(90deg, ${Array.from({ length: 13 }, (_, stop) => `oklch(0.74 0.13 ${stop * 30})`).join(", ")})`;
const HUE_TICKS = [0, 90, 180, 270, 360];

function orderBands(palette: PaletteEntry[]): Band[] {
  const bands = palette.map((entry) => ({ ...entry, lch: toOklch(entry.hex) }));
  const neutral = bands.filter((band) => band.lch.c < NEUTRAL_CHROMA).sort((a, b) => a.lch.l - b.lch.l);
  const chromatic = bands.filter((band) => band.lch.c >= NEUTRAL_CHROMA).sort((a, b) => a.lch.h - b.lch.h);
  return [...neutral, ...chromatic];
}

export function SpectrumBar() {
  const palette = useTokenStore(selectPalette);
  const [hovered, setHovered] = useState<number | null>(null);
  const bands = useMemo(() => orderBands(palette ?? []), [palette]);
  const dominant = useMemo(
    () => bands.reduce((best, band, index) => (band.share > (bands[best]?.share ?? 0) ? index : best), 0),
    [bands],
  );

  if (bands.length === 0) return null;
  const focused = bands[hovered ?? dominant] ?? bands[dominant];

  return (
    <div className="px-4 pb-5 pt-4">
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <p className="label">Chromatic spectrum</p>
        <p className="readout text-ink-dim">
          <span className="text-ink">{focused.hex}</span>
          <span className="mx-2 text-ink-faint">/</span>
          {(focused.share * 100).toFixed(1)}% weighted presence
          <span className="mx-2 text-ink-faint">/</span>
          {focused.usage}
        </p>
      </div>

      <div
        className="flex h-[76px] w-full overflow-hidden border border-hairline-strong"
        onMouseLeave={() => setHovered(null)}
      >
        {Array.from({ length: SLOT_COUNT }, (_, slot) => {
          const band = bands[slot];
          return (
            <button
              key={slot}
              type="button"
              tabIndex={band ? 0 : -1}
              aria-label={band ? `${band.hex}, ${(band.share * 100).toFixed(1)} percent` : undefined}
              aria-hidden={band ? undefined : true}
              onMouseEnter={() => band && setHovered(slot)}
              onFocus={() => band && setHovered(slot)}
              className="morph relative h-full min-w-0 basis-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-14px_18px_-14px_rgba(0,0,0,0.45)]"
              style={{
                flexGrow: band ? Math.max(Math.sqrt(band.share), 0.14) : 0,
                backgroundColor: band?.hex ?? "transparent",
              }}
            />
          );
        })}
      </div>

      <div className="relative mt-3 h-[7px]" style={{ background: HUE_RAIL }}>
        {Array.from({ length: SLOT_COUNT }, (_, slot) => {
          const band = bands[slot];
          const isChromatic = band !== undefined && band.lch.c >= NEUTRAL_CHROMA;
          return (
            <span
              key={slot}
              aria-hidden="true"
              className="morph absolute -top-[5px] h-[17px] w-[3px] -translate-x-1/2 border border-carbon"
              style={{
                left: `${((band?.lch.h ?? 0) / 360) * 100}%`,
                backgroundColor: band?.hex ?? "transparent",
                opacity: isChromatic ? 1 : 0,
              }}
            />
          );
        })}
      </div>
      <div className="relative mt-2 h-3">
        {HUE_TICKS.map((tick) => (
          <span
            key={tick}
            className="label absolute text-[9px] text-ink-faint"
            style={{ left: `${(tick / 360) * 100}%`, transform: `translateX(${tick === 0 ? "0" : tick === 360 ? "-100%" : "-50%"})` }}
          >
            {tick}°
          </span>
        ))}
      </div>
    </div>
  );
}
