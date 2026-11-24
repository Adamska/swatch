"use client";

import { pickReadable } from "@/lib/color";
import { selectPalette, useTokenStore } from "@/store/useTokenStore";
import { focusHandlers, useViewStore } from "@/store/useViewStore";

export const PALETTE_MIME = "application/x-swatch-color";

export function PaletteTray() {
  const palette = useTokenStore(selectPalette);
  const armedHex = useViewStore((state) => state.armedHex);
  const setArmedHex = useViewStore((state) => state.setArmedHex);
  const setDragging = useViewStore((state) => state.setDragging);
  if (!palette) return null;

  return (
    <div className="border-b border-hairline px-4 pb-4 pt-3">
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-2">
        <p className="label">Sampled palette</p>
        <p className="text-[11.5px] text-ink-faint">
          {armedHex ? (
            <>
              <span className="readout text-signal">{armedHex}</span> armed. Pick a role below, or press Escape.
            </>
          ) : (
            "Drag a sample onto a role, or select it and choose the role."
          )}
        </p>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {palette.map((entry) => {
          const isArmed = entry.hex === armedHex;
          return (
            <li key={entry.hex}>
              <button
                type="button"
                draggable
                aria-pressed={isArmed}
                aria-label={`${entry.hex}, ${(entry.share * 100).toFixed(1)} percent ${entry.usage}`}
                onClick={() => setArmedHex(isArmed ? null : entry.hex)}
                onDragStart={(event) => {
                  event.dataTransfer.setData(PALETTE_MIME, entry.hex);
                  event.dataTransfer.setData("text/plain", entry.hex);
                  event.dataTransfer.effectAllowed = "copy";
                  setDragging(true);
                }}
                onDragEnd={() => setDragging(false)}
                {...focusHandlers({ kind: "color", value: entry.hex, label: entry.hex })}
                className={`group relative flex h-11 w-[58px] cursor-grab flex-col justify-end border px-1.5 pb-1 text-left transition-transform duration-150 ease-spotlight active:cursor-grabbing active:scale-95 ${
                  isArmed ? "-translate-y-1 border-signal shadow-[0_6px_0_-3px_var(--color-signal)]" : "border-hairline-strong hover:-translate-y-0.5"
                }`}
                style={{ backgroundColor: entry.hex, color: pickReadable(entry.hex, ["#0b0c0f", "#f7f7f5"]) }}
              >
                <span className="readout text-[9.5px] leading-none opacity-80">{entry.hex.slice(1)}</span>
                <span className="absolute right-1 top-1 h-1 w-1 rounded-full bg-current opacity-60" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
