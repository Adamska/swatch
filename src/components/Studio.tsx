"use client";

import type { CSSProperties } from "react";
import { useMorphWindow } from "@/hooks/useMorphWindow";
import { useTokenStore } from "@/store/useTokenStore";
import { CalibrationStrip } from "./CalibrationStrip";
import { ComponentSandbox } from "./ComponentSandbox";
import { EmptyBench } from "./EmptyBench";
import { Masthead } from "./Masthead";
import { SpectrumBar } from "./SpectrumBar";
import { StyleguideView } from "./StyleguideView";
import { TailwindCodePanel } from "./TailwindCodePanel";
import { Plate } from "./ui/Plate";
import { UrlInputBar } from "./UrlInputBar";

const IDLE_GLOW = "#3b3f4a";

function Workbench() {
  const systemName = useTokenStore((state) => state.tokens?.meta.name ?? "");
  const paletteSize = useTokenStore((state) => state.tokens?.palette.length ?? 0);

  return (
    <div className="bench-reveal mt-10 grid grid-cols-1 gap-10">
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

export function Studio() {
  const systemKey = useTokenStore((state) => state.systemKey);
  const hasTokens = useTokenStore((state) => state.tokens !== null);
  const glow = useTokenStore((state) => state.tokens?.colors.primary ?? IDLE_GLOW);
  const spotlight = useTokenStore((state) => state.spotlight);
  const isMorphing = useMorphWindow(systemKey);

  const origin = { "--spot-x": `${spotlight.x}px`, "--spot-y": `${spotlight.y}px` } as CSSProperties;
  const ground = { "--glow": glow } as CSSProperties;

  return (
    <div className="darkroom" data-morphing={isMorphing} style={origin}>
      <div aria-hidden="true" className="darkroom-ground" style={ground} />
      <div className="mx-auto max-w-[1520px] px-5 pb-16 pt-9 sm:px-9">
        <Masthead />
        <UrlInputBar />
        <main>{hasTokens ? <Workbench /> : <EmptyBench />}</main>
        <footer className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-5">
          <p className="label text-ink-faint">Swatch · MIT License</p>
          <p className="label text-ink-faint">
            Extraction runs server side · private and loopback addresses are refused
          </p>
        </footer>
      </div>
      {systemKey > 0 ? <div key={systemKey} aria-hidden="true" className="spotlight-sweep" style={ground} /> : null}
    </div>
  );
}
