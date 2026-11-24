"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { useMorphWindow } from "@/hooks/useMorphWindow";
import { useWebFonts } from "@/hooks/useWebFonts";
import type { SharePayload } from "@/lib/shareCodec";
import { selectTypography, useTokenStore } from "@/store/useTokenStore";
import { useViewStore } from "@/store/useViewStore";
import { BenchToolbar } from "./BenchToolbar";
import { CalibrationStrip } from "./CalibrationStrip";
import { ComponentSandbox } from "./ComponentSandbox";
import { EmptyBench } from "./EmptyBench";
import { Masthead } from "./Masthead";
import { SpecimenPoster } from "./SpecimenPoster";
import { SpectrumBar } from "./SpectrumBar";
import { StyleguideView } from "./StyleguideView";
import { TailwindCodePanel } from "./TailwindCodePanel";
import { Plate } from "./ui/Plate";
import { UrlInputBar } from "./UrlInputBar";
import { visionFilter, VisionFilters } from "./VisionFilters";

const IDLE_GLOW = "#3b3f4a";

function Workbench() {
  const systemName = useTokenStore((state) => state.tokens?.meta.name ?? "");
  const paletteSize = useTokenStore((state) => state.tokens?.palette.length ?? 0);
  const vision = useViewStore((state) => state.vision);

  return (
    <div className="bench-reveal mt-10 grid grid-cols-1 gap-10" style={{ filter: visionFilter(vision) }}>
      <Plate index="00" title="Spectral readout" meta={<span>{systemName} · {paletteSize} clusters</span>}>
        <SpectrumBar />
        <CalibrationStrip />
      </Plate>
      <div className="grid items-start gap-10 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
        <StyleguideView />
        <div className="grid min-w-0 grid-cols-1 gap-10 xl:sticky xl:top-6">
          <ComponentSandbox />
          <TailwindCodePanel />
        </div>
      </div>
    </div>
  );
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || (target.tagName === "INPUT" && (target as HTMLInputElement).type !== "range") || target.tagName === "TEXTAREA";
}

function useBenchShortcuts() {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") useViewStore.getState().setArmedHex(null);
      const modifier = event.metaKey || event.ctrlKey;
      if (!modifier || isEditable(event.target)) return;
      const key = event.key.toLowerCase();
      const { undo, redo } = useTokenStore.getState();
      if (key === "z" && !event.shiftKey) undo();
      else if ((key === "z" && event.shiftKey) || key === "y") redo();
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);
}

export function Studio({ initialShare = null }: { initialShare?: SharePayload | null }) {
  const systemKey = useTokenStore((state) => state.systemKey);
  const hasTokens = useTokenStore((state) => state.tokens !== null);
  const glow = useTokenStore((state) => state.tokens?.colors.primary ?? IDLE_GLOW);
  const spotlight = useTokenStore((state) => state.spotlight);
  const typography = useTokenStore(selectTypography);
  const isMorphing = useMorphWindow(systemKey);
  const hydrated = useRef(false);

  useBenchShortcuts();
  useWebFonts(typography);
  useEffect(() => {
    if (hydrated.current || !initialShare) return;
    hydrated.current = true;
    useTokenStore.getState().restore(initialShare, { x: window.innerWidth / 2, y: 200 });
  }, [initialShare]);

  const origin = { "--spot-x": `${spotlight.x}px`, "--spot-y": `${spotlight.y}px` } as CSSProperties;
  const ground = { "--glow": glow } as CSSProperties;

  return (
    <div className="darkroom" data-morphing={isMorphing} style={origin}>
      <VisionFilters />
      <div aria-hidden="true" className="darkroom-ground" style={ground} />
      <div className="studio-frame mx-auto max-w-[1520px] px-5 pb-16 pt-9 sm:px-9">
        <Masthead />
        <UrlInputBar />
        {hasTokens ? <BenchToolbar /> : null}
        <main>{hasTokens ? <Workbench /> : <EmptyBench />}</main>
        <footer className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-5">
          <p className="label text-ink-faint">Swatch · MIT License</p>
          <p className="label text-ink-faint">Extraction runs server side · private and loopback addresses are refused</p>
        </footer>
      </div>
      {systemKey > 0 ? <div key={systemKey} aria-hidden="true" className="spotlight-sweep" style={ground} /> : null}
      <SpecimenPoster />
    </div>
  );
}
