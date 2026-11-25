"use client";

import { useMemo, useRef, useState } from "react";
import { pickReadable, toOklch, type Oklch } from "@/lib/color";
import { selectPalette, useTokenStore } from "@/store/useTokenStore";
import { useViewStore } from "@/store/useViewStore";
import type { PaletteEntry } from "@/types/tokens";
import { PALETTE_MIME } from "./styleguide/PaletteTray";

interface Band extends PaletteEntry {
  lch: Oklch;
  grow: number;
}

const SLOT_COUNT = 12;
const NEUTRAL_CHROMA = 0.035;
const LOUPE_SIZE = 92;
const LOUPE_ZOOM = 5;
const HUE_RAIL = `linear-gradient(90deg, ${Array.from({ length: 13 }, (_, stop) => `oklch(0.74 0.13 ${stop * 30})`).join(", ")})`;
const HUE_TICKS = [0, 90, 180, 270, 360];

function orderBands(palette: PaletteEntry[]): Band[] {
  const bands = palette.map((entry) => ({ ...entry, lch: toOklch(entry.hex), grow: Math.max(Math.sqrt(entry.share), 0.14) }));
  const neutral = bands.filter((band) => band.lch.c < NEUTRAL_CHROMA).sort((a, b) => a.lch.l - b.lch.l);
  const chromatic = bands.filter((band) => band.lch.c >= NEUTRAL_CHROMA).sort((a, b) => a.lch.h - b.lch.h);
  return [...neutral, ...chromatic];
}

function hardStops(bands: Band[]): { gradient: string; edges: number[] } {
  const total = bands.reduce((sum, band) => sum + band.grow, 0) || 1;
  let cursor = 0;
  const edges: number[] = [];
  const stops = bands.map((band) => {
    const start = (cursor / total) * 100;
    cursor += band.grow;
    const end = (cursor / total) * 100;
    edges.push(end);
    return `${band.hex} ${start}% ${end}%`;
  });
  return { gradient: `linear-gradient(90deg, ${stops.join(", ")})`, edges };
}

export function SpectrumBar() {
  const palette = useTokenStore(selectPalette);
  const setDragging = useViewStore((state) => state.setDragging);
  const [hovered, setHovered] = useState<number | null>(null);
  const [loupe, setLoupe] = useState<{ x: number; width: number } | null>(null);
  const strip = useRef<HTMLDivElement>(null);
  const bands = useMemo(() => orderBands(palette ?? []), [palette]);
  const { gradient, edges } = useMemo(() => hardStops(bands), [bands]);
  const dominant = useMemo(
    () => bands.reduce((best, band, index) => (band.share > (bands[best]?.share ?? 0) ? index : best), 0),
    [bands],
  );

  if (bands.length === 0) return null;
  const focused = bands[hovered ?? dominant] ?? bands[dominant];

  const trackPointer = (clientX: number) => {
    const rect = strip.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.min(rect.width, Math.max(0, clientX - rect.left));
    setLoupe({ x, width: rect.width });
    const fraction = (x / rect.width) * 100;
    setHovered(Math.min(bands.length - 1, edges.findIndex((edge) => fraction <= edge)));
  };

  return (
    <div className="px-4 pb-5 pt-4">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
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
        ref={strip}
        className="relative flex h-[76px] w-full cursor-crosshair border border-hairline-strong"
        onMouseMove={(event) => trackPointer(event.clientX)}
        onMouseLeave={() => {
          setHovered(null);
          setLoupe(null);
        }}
      >
        {Array.from({ length: SLOT_COUNT }, (_, slot) => {
          const band = bands[slot];
          return (
            <button
              key={slot}
              type="button"
              draggable={Boolean(band)}
              tabIndex={band ? 0 : -1}
              aria-label={band ? `${band.hex}, ${(band.share * 100).toFixed(1)} percent. Drag onto a role.` : undefined}
              aria-hidden={band ? undefined : true}
              onFocus={() => band && setHovered(slot)}
              onDragStart={(event) => {
                if (!band) return;
                event.dataTransfer.setData(PALETTE_MIME, band.hex);
                event.dataTransfer.effectAllowed = "copy";
                setLoupe(null);
                setDragging(true);
              }}
              onDragEnd={() => setDragging(false)}
              className="morph relative h-full min-w-0 basis-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-14px_18px_-14px_rgba(0,0,0,0.45)]"
              style={{ flexGrow: band?.grow ?? 0, backgroundColor: band?.hex ?? "transparent" }}
            />
          );
        })}
        {loupe ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-[calc(100%+10px)] z-20 overflow-hidden rounded-full border border-hairline-strong shadow-[0_0_0_4px_var(--color-carbon),0_0_0_5px_var(--color-hairline-strong),0_18px_40px_-10px_var(--color-shade)]"
            style={{
              left: loupe.x - LOUPE_SIZE / 2,
              width: LOUPE_SIZE,
              height: LOUPE_SIZE,
              backgroundImage: gradient,
              backgroundSize: `${loupe.width * LOUPE_ZOOM}px 100%`,
              backgroundPosition: `${LOUPE_SIZE / 2 - loupe.x * LOUPE_ZOOM}px 0`,
              backgroundRepeat: "no-repeat",
            }}
          >
            <span className="absolute inset-y-0 left-1/2 w-px bg-white/70 mix-blend-difference" />
            <span
              className="readout absolute bottom-3 left-1/2 -translate-x-1/2 text-[9.5px]"
              style={{ color: pickReadable(focused.hex, ["#0b0c0f", "#f7f7f5"]) }}
            >
              {focused.hex}
            </span>
          </div>
        ) : null}
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
                transform: `translateX(-50%) scaleY(${slot === hovered ? 1.5 : 1})`,
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
