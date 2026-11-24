"use client";

import { useMemo, useRef } from "react";
import { toStageVariables } from "@/lib/tokenStyle";
import { selectActiveColors, selectTokens, useTokenStore } from "@/store/useTokenStore";
import { useViewStore, type StageView } from "@/store/useViewStore";
import { Redlines } from "./styleguide/Redlines";
import { SourceCapture } from "./styleguide/SourceCapture";
import { StageContent } from "./styleguide/StageContent";
import styles from "./styleguide/stage.module.css";
import { Plate } from "./ui/Plate";

const VIEWS: { id: StageView; label: string }[] = [
  { id: "stage", label: "Stage" },
  { id: "source", label: "Source" },
];

export function ComponentSandbox() {
  const tokens = useTokenStore(selectTokens);
  const colors = useTokenStore(selectActiveColors);
  const hasEvidence = useTokenStore((state) => state.evidence !== null);
  const view = useViewStore((state) => state.stageView);
  const setView = useViewStore((state) => state.setStageView);
  const redlines = useViewStore((state) => state.redlines);
  const stage = useRef<HTMLDivElement>(null);
  const variables = useMemo(() => (tokens && colors ? toStageVariables(tokens, colors) : null), [tokens, colors]);
  if (!tokens || !variables) return null;

  return (
    <Plate
      index="02"
      title={view === "stage" ? "Live component stage" : "Source capture"}
      meta={
        <div role="tablist" aria-label="Stage view" className="flex gap-4">
          {VIEWS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={view === entry.id}
              onClick={() => setView(entry.id)}
              className={`label relative transition-colors ${view === entry.id ? "text-ink" : "text-ink-faint hover:text-ink"}`}
            >
              {entry.label}
              {entry.id === "source" && hasEvidence ? (
                <span className="absolute -right-2 -top-0.5 h-1 w-1 rounded-full bg-signal" />
              ) : null}
            </button>
          ))}
        </div>
      }
    >
      {view === "stage" ? (
        <div ref={stage} className={`relative ${styles.stage}`} style={variables}>
          <StageContent systemName={tokens.meta.name} />
          {redlines ? <Redlines stage={stage} revision={variables} /> : null}
        </div>
      ) : (
        <SourceCapture />
      )}
    </Plate>
  );
}
