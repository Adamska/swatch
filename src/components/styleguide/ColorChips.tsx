"use client";

import { memo } from "react";
import { useCopy } from "@/hooks/useCopy";
import { contrastGrade, contrastRatio, pickReadable } from "@/lib/color";
import { useTokenStore } from "@/store/useTokenStore";
import { SEMANTIC_COLOR_KEYS, type SemanticColorKey, type SemanticColors } from "@/types/tokens";

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

function partnerOf(key: SemanticColorKey, colors: SemanticColors): [label: string, hex: string] {
  if (key === "primaryForeground") return ["primary", colors.primary];
  if (key === "background" || key === "surface" || key === "border") return ["foreground", colors.foreground];
  return ["background", colors.background];
}

const ColorChip = memo(function ColorChip({ colorKey, order }: { colorKey: SemanticColorKey; order: number }) {
  const hex = useTokenStore((state) => state.tokens?.colors[colorKey]);
  const partnerHex = useTokenStore((state) => (state.tokens ? partnerOf(colorKey, state.tokens.colors)[1] : null));
  const partnerLabel = useTokenStore((state) => (state.tokens ? partnerOf(colorKey, state.tokens.colors)[0] : ""));
  const setColor = useTokenStore((state) => state.setColor);
  const { copied, copy } = useCopy();

  if (!hex || !partnerHex) return null;
  const [name, note] = CHIP_COPY[colorKey];
  const ratio = contrastRatio(hex, partnerHex);
  const grade = contrastGrade(ratio);
  const overlayInk = pickReadable(hex, ["#0b0c0f", "#f7f7f5"]);

  return (
    <li className="group border border-hairline-strong bg-carbon-raised shadow-[0_18px_28px_-22px_rgba(0,0,0,0.9)] transition-transform duration-150 ease-spotlight hover:-translate-y-0.5 has-[button:active]:translate-y-px has-[button:active]:scale-[0.985]">
      <button
        type="button"
        onClick={() => void copy(hex)}
        aria-label={`Copy ${name} ${hex}`}
        className="morph relative block aspect-[5/4] w-full cursor-copy"
        style={{ backgroundColor: hex, color: overlayInk }}
      >
        <span className="absolute left-2.5 top-2.5 h-[7px] w-[7px] rounded-full bg-current opacity-80" />
        <span className="label absolute right-2.5 top-2.5 text-[9px] text-current opacity-70">
          {String(order + 1).padStart(2, "0")}
        </span>
        <span
          className={`label absolute bottom-2.5 left-2.5 text-[9px] text-current transition-opacity ${
            copied ? "opacity-100" : "opacity-0 group-hover:opacity-80"
          }`}
        >
          {copied ? "Copied" : "Click to copy"}
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
          <span className="readout text-[11px] text-ink-dim" title={`Contrast against ${partnerLabel}`}>
            {ratio.toFixed(2)}:1
          </span>
          <span
            className={`label whitespace-nowrap border px-1.5 py-[3px] text-[9px] ${
              grade === "Fail" ? "border-hairline text-ink-faint" : "border-hairline-strong text-ink"
            }`}
          >
            {grade}
          </span>
        </div>
      </div>
    </li>
  );
});

export function ColorChips() {
  return (
    <div className="p-4">
      <p className="mb-4 max-w-prose text-[12.5px] text-ink-dim">
        Twelve semantic roles resolved from the sampled palette. Ratios are measured against the role each chip is
        normally paired with: text and brand roles against the background, grounds against the foreground.
      </p>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 2xl:grid-cols-4">
        {SEMANTIC_COLOR_KEYS.map((key, order) => (
          <ColorChip key={key} colorKey={key} order={order} />
        ))}
      </ul>
    </div>
  );
}
