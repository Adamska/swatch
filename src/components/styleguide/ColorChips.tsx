"use client";

import { memo, useState, type CSSProperties, type DragEvent } from "react";
import { useCopy } from "@/hooks/useCopy";
import { contrastGrade, contrastRatio, pickReadable } from "@/lib/color";
import { isLiftable, partnerOf } from "@/lib/colorPairs";
import { selectActiveColors, useTokenStore } from "@/store/useTokenStore";
import { focusHandlers, useViewStore } from "@/store/useViewStore";
import { SEMANTIC_COLOR_KEYS, type SemanticColorKey } from "@/types/tokens";
import { PALETTE_MIME, PaletteTray } from "./PaletteTray";
import { TonalScales } from "./TonalScales";

const CHIP_COPY: Record<SemanticColorKey, [name: string, note: string]> = {
  background: ["Background", "Page ground"],
  surface: ["Surface", "Raised panels"],
  foreground: ["Foreground", "Primary text"],
  muted: ["Muted", "Secondary text"],
  border: ["Border", "Hairlines"],
  primary: ["Primary", "Brand action"],
  primaryForeground: ["On primary", "Label on action"],
  secondary: ["Secondary", "Supporting tone"],
  accent: ["Accent", "Highlights"],
  success: ["Success", "Positive state"],
  warning: ["Warning", "Caution state"],
  danger: ["Danger", "Destructive state"],
};

const ColorChip = memo(function ColorChip({ colorKey, order }: { colorKey: SemanticColorKey; order: number }) {
  const colors = useTokenStore(selectActiveColors);
  const setColor = useTokenStore((state) => state.setColor);
  const liftContrast = useTokenStore((state) => state.liftContrast);
  const armedHex = useViewStore((state) => state.armedHex);
  const isDragging = useViewStore((state) => state.isDragging);
  const [isOver, setIsOver] = useState(false);
  const { copied, copy } = useCopy();
  if (!colors) return null;

  const hex = colors[colorKey];
  const partner = partnerOf(colorKey, colors);
  const [name, note] = CHIP_COPY[colorKey];
  const ratio = contrastRatio(hex, partner.hex);
  const grade = contrastGrade(ratio);
  const overlayInk = pickReadable(hex, ["#0b0c0f", "#f7f7f5"]);
  const canLift = isLiftable(colorKey) && ratio < partner.minimum;
  const isTarget = isDragging || armedHex !== null;

  const assign = (value: string) => {
    setColor(colorKey, value);
    useViewStore.getState().setArmedHex(null);
  };
  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setIsOver(false);
    const dropped = event.dataTransfer.getData(PALETTE_MIME);
    if (/^#[0-9a-f]{6}$/.test(dropped)) assign(dropped);
  };

  return (
    <li
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes(PALETTE_MIME)) return;
        event.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={handleDrop}
      style={{ "--i": order } as CSSProperties}
      className={`develop group relative border bg-carbon-raised shadow-[0_18px_28px_-22px_rgba(0,0,0,0.9)] transition-[transform,border-color] duration-150 ease-spotlight hover:-translate-y-0.5 has-[button:active]:translate-y-px has-[button:active]:scale-[0.985] ${
        isOver ? "border-signal" : isTarget ? "border-dashed border-signal/60" : "border-hairline-strong"
      }`}
    >
      <button
        type="button"
        onClick={() => (armedHex ? assign(armedHex) : void copy(hex))}
        aria-label={armedHex ? `Assign ${armedHex} to ${name}` : `Copy ${name} ${hex}`}
        {...focusHandlers({ kind: "color", value: hex, label: name })}
        className={`morph relative block aspect-[5/4] w-full ${armedHex ? "cursor-alias" : "cursor-copy"}`}
        style={{ backgroundColor: hex, color: overlayInk }}
      >
        {isOver ? <span aria-hidden="true" className="drop-hatch absolute inset-0" /> : null}
        <span className="absolute left-2.5 top-2.5 h-[7px] w-[7px] rounded-full bg-current opacity-80" />
        <span className="label absolute right-2.5 top-2.5 text-[9px] text-current opacity-70">
          {String(order + 1).padStart(2, "0")}
        </span>
        <span
          className={`label absolute bottom-2.5 left-2.5 text-[9px] text-current transition-opacity ${
            copied || armedHex ? "opacity-100" : "opacity-0 group-hover:opacity-80"
          }`}
        >
          {armedHex ? `Assign ${armedHex}` : copied ? "Copied" : "Click to copy"}
        </span>
      </button>

      <div className="border-t border-hairline px-3 pb-3 pt-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-[13px] font-medium text-ink">{name}</p>
          <label className="label cursor-pointer border-b border-hairline-strong text-[9px] hover:border-signal hover:text-ink">
            Tune
            <input
              type="color"
              value={hex}
              onChange={(event) => setColor(colorKey, event.target.value.toLowerCase())}
              aria-label={`Tune ${name}`}
              className="sr-only"
            />
          </label>
        </div>
        <p className="readout mt-0.5 uppercase text-ink-dim">{hex}</p>
        <p className="mt-0.5 truncate text-[11.5px] text-ink-faint">{note}</p>
        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-hairline pt-2">
          <span className="readout text-[11px] text-ink-dim" title={`Contrast against ${partner.label}`}>
            {ratio.toFixed(2)}:1
          </span>
          {canLift ? (
            <button
              type="button"
              onClick={() => liftContrast(colorKey)}
              title={`Shift lightness until ${name} reaches 4.5:1 against ${partner.label}`}
              className="label whitespace-nowrap border border-signal/70 px-1.5 py-[3px] text-[9px] text-signal transition-colors hover:bg-signal hover:text-carbon"
            >
              Lift to AA
            </button>
          ) : (
            <span
              className={`label whitespace-nowrap border px-1.5 py-[3px] text-[9px] ${
                grade === "Fail" ? "border-hairline text-ink-faint" : "border-hairline-strong text-ink"
              }`}
            >
              {grade}
            </span>
          )}
        </div>
      </div>
    </li>
  );
});

export function ColorChips() {
  const systemKey = useTokenStore((state) => state.systemKey);
  const colors = useTokenStore(selectActiveColors);
  const liftAllContrast = useTokenStore((state) => state.liftAllContrast);
  const failing = colors
    ? SEMANTIC_COLOR_KEYS.filter((key) => {
        const partner = partnerOf(key, colors);
        return isLiftable(key) && contrastRatio(colors[key], partner.hex) < partner.minimum;
      }).length
    : 0;

  return (
    <div>
      <PaletteTray />
      <div className="p-4">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-prose text-[12.5px] text-ink-dim">
            Twelve semantic roles resolved from the sampled palette. Ratios are measured against the role each chip
            is normally paired with: text and brand roles against the background, grounds against the foreground.
          </p>
          {failing > 0 ? (
            <button type="button" onClick={liftAllContrast} className="bracket-button shrink-0 text-[10.5px] text-signal">
              Lift {failing} to AA
            </button>
          ) : null}
        </div>
        <ul key={systemKey} className="grid grid-cols-2 gap-4 sm:grid-cols-3 2xl:grid-cols-4">
          {SEMANTIC_COLOR_KEYS.map((key, order) => (
            <ColorChip key={key} colorKey={key} order={order} />
          ))}
        </ul>
      </div>
      <TonalScales />
    </div>
  );
}
