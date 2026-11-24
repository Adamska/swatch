"use client";

import { useDeferredValue, useMemo } from "react";
import { useCopy } from "@/hooks/useCopy";
import { highlightCode, type CodeSegmentKind } from "@/lib/highlight";
import { EXPORT_FORMATS, exportTokens, type ExportFormatInfo } from "@/lib/tailwindExporter";
import { selectTokens, useTokenStore } from "@/store/useTokenStore";
import { Plate } from "./ui/Plate";

const SEGMENT_CLASS: Record<CodeSegmentKind, string> = {
  plain: "text-ink-dim",
  comment: "text-ink-faint italic",
  string: "text-ink",
  number: "text-signal",
  key: "text-[#9fb4c7]",
  variable: "text-[#9fb4c7]",
};

function download(format: ExportFormatInfo, contents: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: `${format.mime};charset=utf-8` }));
  const link = document.createElement("a");
  link.href = url;
  link.download = format.filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function TailwindCodePanel() {
  const tokens = useTokenStore(selectTokens);
  const format = useTokenStore((state) => state.exportFormat);
  const setFormat = useTokenStore((state) => state.setExportFormat);
  const deferredTokens = useDeferredValue(tokens);
  const { copied, copy } = useCopy();

  const lines = useMemo(
    () => (deferredTokens ? highlightCode(exportTokens(deferredTokens, format)) : []),
    [deferredTokens, format],
  );
  if (!tokens) return null;

  const active = EXPORT_FORMATS.find((entry) => entry.id === format) ?? EXPORT_FORMATS[0];

  return (
    <Plate
      index="03"
      title="Export"
      meta={
        <>
          <button
            type="button"
            onClick={() => download(active, exportTokens(tokens, format))}
            className="bracket-button text-[10.5px]"
          >
            Download
          </button>
          <button
            type="button"
            onClick={() => void copy(exportTokens(tokens, format))}
            className={`bracket-button text-[10.5px] ${copied ? "text-signal" : ""}`}
          >
            {copied ? "Copied" : `Copy ${active.filename}`}
          </button>
        </>
      }
    >
      <div role="tablist" aria-label="Export format" className="flex overflow-x-auto border-b border-hairline">
        {EXPORT_FORMATS.map((entry) => {
          const isActive = entry.id === format;
          return (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setFormat(entry.id)}
              className={`label shrink-0 whitespace-nowrap border-r border-hairline px-4 py-3 transition-colors ${
                isActive ? "bg-white/[0.035] text-ink shadow-[inset_0_-1px_0_var(--color-signal)]" : "text-ink-dim hover:text-ink"
              }`}
            >
              {entry.label}
            </button>
          );
        })}
        <span className="readout ml-auto hidden items-center px-4 text-[11px] text-ink-faint sm:flex">
          {lines.length} lines
        </span>
      </div>

      <pre
        tabIndex={0}
        aria-label={`${active.filename} source`}
        className="max-h-[380px] overflow-auto py-3 font-mono text-[12px] leading-[1.7] [counter-reset:line]"
      >
        <code>
          {lines.map((segments, lineIndex) => (
            <span
              key={lineIndex}
              className="block whitespace-pre pr-4 [counter-increment:line] before:mr-4 before:inline-block before:w-9 before:select-none before:text-right before:text-ink-faint/70 before:content-[counter(line)]"
            >
              {segments.map((segment, segmentIndex) => (
                <span key={segmentIndex} className={SEGMENT_CLASS[segment.kind]}>
                  {segment.swatch ? (
                    <span
                      aria-hidden="true"
                      className="mr-1.5 inline-block h-2.5 w-2.5 translate-y-px border border-hairline-strong"
                      style={{ backgroundColor: segment.swatch }}
                    />
                  ) : null}
                  {segment.text}
                </span>
              ))}
            </span>
          ))}
        </code>
      </pre>
    </Plate>
  );
}
