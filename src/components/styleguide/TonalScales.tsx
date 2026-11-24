"use client";

import { memo } from "react";
import { contrastRatio, pickReadable } from "@/lib/color";
import { buildTonalScale } from "@/lib/colorScale";
import { selectActiveColors, useTokenStore } from "@/store/useTokenStore";
import { focusHandlers } from "@/store/useViewStore";

const ROLES = [
  ["primary", "Primary"],
  ["secondary", "Secondary"],
  ["accent", "Accent"],
  ["success", "Success"],
  ["warning", "Warning"],
  ["danger", "Danger"],
  ["muted", "Neutral"],
] as const;

const ScaleRow = memo(function ScaleRow({ label, hex, ground }: { label: string; hex: string; ground: string }) {
  const tiles = buildTonalScale(hex);
  const firstReadable = tiles.findIndex((tile) => contrastRatio(tile.hex, ground) >= 4.5);

  return (
    <li className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-3 border-t border-hairline px-4 py-2.5">
      <span className="label text-ink">{label}</span>
      <div className="relative grid grid-cols-11">
        {tiles.map((tile, index) => (
          <span
            key={tile.stop}
            {...focusHandlers({ kind: "color", value: tile.hex, label: `${label} ${tile.stop}` })}
            title={`${label} ${tile.stop} ${tile.hex}`}
            className="morph relative flex h-9 items-end justify-center pb-1"
            style={{ backgroundColor: tile.hex, color: pickReadable(tile.hex, ["#0b0c0f", "#f7f7f5"]) }}
          >
            <span className="readout text-[8.5px] opacity-75">{tile.stop}</span>
            {tile.isSource ? (
              <span className="absolute -top-[5px] left-1/2 h-0 w-0 -translate-x-1/2 border-x-[4px] border-t-[5px] border-x-transparent border-t-signal" />
            ) : null}
            {index === firstReadable && index > 0 ? (
              <span className="absolute -left-px inset-y-0 w-px bg-signal" title="Text on the page ground reaches 4.5:1 from here" />
            ) : null}
          </span>
        ))}
      </div>
    </li>
  );
});

export function TonalScales() {
  const colors = useTokenStore(selectActiveColors);
  if (!colors) return null;

  return (
    <section aria-label="Tonal scales" className="border-t border-hairline">
      <div className="flex flex-wrap items-baseline justify-between gap-3 px-4 py-3">
        <p className="label">Tonal scales · OKLCH 50 to 950</p>
        <p className="flex items-center gap-4 text-[11px] text-ink-faint">
          <span className="flex items-center gap-1.5">
            <span className="h-0 w-0 border-x-[4px] border-t-[5px] border-x-transparent border-t-signal" /> Extracted value
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-px bg-signal" /> AA text on background from here
          </span>
        </p>
      </div>
      <ul>
        {ROLES.map(([key, label]) => (
          <ScaleRow key={key} label={label} hex={colors[key]} ground={colors.background} />
        ))}
      </ul>
    </section>
  );
}
