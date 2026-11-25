"use client";

import { selectMeta, useTokenStore } from "@/store/useTokenStore";
import { ThemeSwitch } from "./ThemeSwitch";
import { RegistrationMark } from "./ui/RegistrationMark";

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="label text-ink-faint">{label}</dt>
      <dd className="readout mt-1 truncate text-ink">{value}</dd>
    </div>
  );
}

export function Masthead() {
  const source = useTokenStore((state) => state.source);
  const meta = useTokenStore(selectMeta);
  const isEdited = useTokenStore((state) => state.isEdited);

  const method = !meta ? "Standing by" : meta.method === "ai" ? (meta.model ?? "Structured model") : "Perceptual clustering";

  return (
    <header className="flex flex-wrap items-end justify-between gap-x-12 gap-y-5 border-b border-hairline pb-6">
      <div className="flex items-center gap-4">
        <RegistrationMark size={34} className="text-signal" />
        <div>
          <h1
            className="font-display text-[38px] leading-none tracking-[-0.025em]"
            style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "WONK" 1' }}
          >
            Swatch
          </h1>
          <p className="label mt-2">Optical specimen bench for design tokens</p>
        </div>
      </div>

      <div className="flex flex-col items-start gap-5 sm:items-end">
        <ThemeSwitch />
        <dl className="grid grid-cols-2 gap-x-10 gap-y-3 sm:grid-cols-4">
          <Readout label="Source" value={source ? new URL(source.url).hostname : "No specimen"} />
          <Readout label="Nodes sampled" value={source ? String(source.sampledNodes) : "—"} />
          <Readout label="Capture" value={source ? `${(source.durationMs / 1000).toFixed(2)} s` : "—"} />
          <Readout label={isEdited ? "Method · tuned" : "Method"} value={method} />
        </dl>
      </div>
    </header>
  );
}
