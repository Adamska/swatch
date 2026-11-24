"use client";

import { useState } from "react";
import { schemeOf } from "@/lib/schemes";
import { encodeShare } from "@/lib/shareCodec";
import { useTokenStore } from "@/store/useTokenStore";
import { useViewStore, type VisionMode } from "@/store/useViewStore";

const VISION_OPTIONS: { id: VisionMode; label: string }[] = [
  { id: "normal", label: "Typical vision" },
  { id: "protanopia", label: "Protanopia" },
  { id: "deuteranopia", label: "Deuteranopia" },
  { id: "tritanopia", label: "Tritanopia" },
  { id: "achromatopsia", label: "Achromatopsia" },
];

const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-r border-hairline px-4 py-2.5 last:border-r-0">
      <span className="label text-[9.5px] text-ink-faint">{label}</span>
      <div className="flex items-center gap-3">{children}</div>
    </div>
  );
}

export function BenchToolbar() {
  const tokens = useTokenStore((state) => state.tokens);
  const source = useTokenStore((state) => state.source);
  const scheme = useTokenStore((state) => state.scheme);
  const setScheme = useTokenStore((state) => state.setScheme);
  const canUndo = useTokenStore((state) => state.past.length > 0);
  const canRedo = useTokenStore((state) => state.future.length > 0);
  const undo = useTokenStore((state) => state.undo);
  const redo = useTokenStore((state) => state.redo);
  const hasReference = useTokenStore((state) => state.reference !== null);
  const pinReference = useTokenStore((state) => state.pinReference);
  const vision = useViewStore((state) => state.vision);
  const setVision = useViewStore((state) => state.setVision);
  const redlines = useViewStore((state) => state.redlines);
  const toggleRedlines = useViewStore((state) => state.toggleRedlines);
  const [shareState, setShareState] = useState<"idle" | "copied" | "failed">("idle");
  if (!tokens || !source) return null;

  const base = schemeOf(tokens.colors);
  const alternate = base === "light" ? "dark" : "light";
  const altNote = tokens.altSource === "extracted" ? "extracted" : tokens.altSource === "edited" ? "tuned" : "synthesized";
  const modifier = isMac() ? "⌘" : "Ctrl ";

  const share = async () => {
    try {
      const url = new URL(window.location.href);
      url.search = `?s=${await encodeShare({ tokens, source })}`;
      url.hash = "";
      await navigator.clipboard.writeText(url.href);
      window.history.replaceState(null, "", url);
      setShareState("copied");
    } catch {
      setShareState("failed");
    }
    setTimeout(() => setShareState("idle"), 1800);
  };

  return (
    <div className="plate mt-6 flex flex-wrap items-stretch print:hidden">
      <Group label="Scheme">
        {(["base", "alt"] as const).map((slot) => (
          <button
            key={slot}
            type="button"
            aria-pressed={scheme === slot}
            onClick={() => setScheme(slot)}
            className={`text-[12.5px] transition-colors ${scheme === slot ? "text-ink underline decoration-signal decoration-2 underline-offset-[6px]" : "text-ink-dim hover:text-ink"}`}
          >
            {capitalize(slot === "base" ? base : alternate)}
            <span className="ml-1.5 text-[10.5px] text-ink-faint">{slot === "base" ? "extracted" : altNote}</span>
          </button>
        ))}
      </Group>
      <Group label="Vision">
        <select
          value={vision}
          onChange={(event) => setVision(event.target.value as VisionMode)}
          aria-label="Simulate color vision"
          className="cursor-pointer border-b border-hairline-strong bg-transparent pb-0.5 text-[12.5px] text-ink outline-none"
        >
          {VISION_OPTIONS.map((option) => (
            <option key={option.id} value={option.id} className="bg-carbon">
              {option.label}
            </option>
          ))}
        </select>
      </Group>
      <Group label="Overlay">
        <button type="button" aria-pressed={redlines} onClick={toggleRedlines} className={`bracket-button text-[10.5px] ${redlines ? "text-signal" : ""}`}>
          Redlines
        </button>
      </Group>
      <Group label="History">
        <button type="button" onClick={undo} disabled={!canUndo} title={`${modifier}Z`} className="bracket-button text-[10.5px]">
          Undo
        </button>
        <button type="button" onClick={redo} disabled={!canRedo} title={`${modifier}Shift Z`} className="bracket-button text-[10.5px]">
          Redo
        </button>
      </Group>
      <div className="ml-auto flex flex-wrap items-center gap-5 px-4 py-2.5">
        <button type="button" onClick={pinReference} className="bracket-button text-[10.5px]">
          {hasReference ? "Re-pin reference" : "Pin as reference"}
        </button>
        <button type="button" onClick={() => void share()} className={`bracket-button text-[10.5px] ${shareState === "copied" ? "text-signal" : ""}`}>
          {shareState === "copied" ? "Link copied" : shareState === "failed" ? "Copy failed" : "Share link"}
        </button>
        <button type="button" onClick={() => window.print()} className="bracket-button text-[10.5px]">
          Print specimen
        </button>
      </div>
    </div>
  );
}
