"use client";

import { useState, type FormEvent, type MouseEvent } from "react";
import { SAMPLE_PROFILES } from "@/lib/samples";
import { getSampleTokens, selectIsBusy, useTokenStore, type SpotlightOrigin } from "@/store/useTokenStore";
import { CaptureLog } from "./CaptureLog";
import { RecentCaptures } from "./RecentCaptures";

const STATUS_COPY = {
  idle: "Enter a public URL, or put a sample profile on the bench.",
  extracting: "Headless Chromium is inspecting the page",
  normalizing: "Clustering colors and fitting scales",
  ready: "Specimen ready. Tune any token and the bench follows.",
  error: "Extraction failed.",
} as const;

function originOf(element: HTMLElement): SpotlightOrigin {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

export function UrlInputBar() {
  const [url, setUrl] = useState("");
  const status = useTokenStore((state) => state.status);
  const error = useTokenStore((state) => state.error);
  const notice = useTokenStore((state) => state.notice);
  const activeSampleId = useTokenStore((state) => state.activeSampleId);
  const isBusy = useTokenStore(selectIsBusy);
  const inspect = useTokenStore((state) => state.inspect);
  const loadSample = useTokenStore((state) => state.loadSample);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const target = url.trim();
    if (!target || isBusy) return;
    void inspect(target, originOf(event.currentTarget));
  };

  const loadNextSample = (event: MouseEvent<HTMLButtonElement>) => {
    const current = SAMPLE_PROFILES.findIndex((profile) => profile.id === activeSampleId);
    const next = SAMPLE_PROFILES[(current + 1) % SAMPLE_PROFILES.length];
    loadSample(next.id, originOf(event.currentTarget));
  };

  return (
    <section aria-label="Extraction target" className="mt-8">
      <form onSubmit={handleSubmit} className="plate relative flex items-stretch transition-colors duration-300 focus-within:border-hairline-strong">
        <label htmlFor="target-url" className="label hidden items-center border-r border-hairline px-5 sm:flex">
          Target
        </label>
        <input
          id="target-url"
          type="text"
          inputMode="url"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://example.com"
          className="min-w-0 flex-1 bg-transparent px-5 py-[18px] font-mono text-[15px] text-ink outline-none placeholder:text-ink-faint"
        />
        <button type="submit" disabled={isBusy || !url.trim()} className="bracket-button border-l border-hairline px-6">
          {isBusy ? "Inspecting" : "Inspect"}
        </button>
        {isBusy ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px overflow-hidden bg-hairline"
          >
            <span className="block h-full w-1/4 animate-[scan_1.4s_linear_infinite] bg-signal" />
          </span>
        ) : null}
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <button type="button" onClick={loadNextSample} className="bracket-button">
          Load Sample Extraction
        </button>
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {SAMPLE_PROFILES.map((profile) => {
            const preview = getSampleTokens(profile.id)?.colors;
            const isActive = profile.id === activeSampleId;
            return (
              <li key={profile.id}>
                <button
                  type="button"
                  title={profile.descriptor}
                  aria-pressed={isActive}
                  onClick={(event) => loadSample(profile.id, originOf(event.currentTarget))}
                  className={`group flex items-center gap-2 border-b pb-1 text-[12.5px] transition-colors ${
                    isActive ? "border-signal text-ink" : "border-transparent text-ink-dim hover:text-ink"
                  }`}
                >
                  {preview ? (
                    <span className="flex h-3 w-[22px] overflow-hidden border border-hairline-strong">
                      <span className="flex-1" style={{ background: preview.background }} />
                      <span className="flex-1" style={{ background: preview.primary }} />
                      <span className="flex-1" style={{ background: preview.secondary }} />
                    </span>
                  ) : null}
                  {profile.label}
                </button>
              </li>
            );
          })}
        </ul>
        <p
          role="status"
          aria-live="polite"
          className={`readout ml-auto max-w-full text-right ${error ? "text-signal" : "text-ink-dim"}`}
        >
          {error ?? notice ?? STATUS_COPY[status]}
          {isBusy && !error ? <span className="animate-pulse"> ...</span> : null}
        </p>
      </div>
      <RecentCaptures />
      <CaptureLog />
    </section>
  );
}
