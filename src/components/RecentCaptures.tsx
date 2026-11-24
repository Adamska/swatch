"use client";

import { useSyncExternalStore } from "react";
import { recentCaptures } from "@/lib/recentCaptures";
import { decodeShare } from "@/lib/shareCodec";
import { useTokenStore } from "@/store/useTokenStore";

export function RecentCaptures() {
  const entries = useSyncExternalStore(recentCaptures.subscribe, recentCaptures.getSnapshot, recentCaptures.getServerSnapshot);
  const restore = useTokenStore((state) => state.restore);
  const currentUrl = useTokenStore((state) => state.source?.url);
  if (entries.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
      <span className="label text-ink-faint">Recent</span>
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {entries.map((entry) => {
          const isActive = currentUrl ? new URL(currentUrl).hostname.replace(/^www\./, "") === entry.host : false;
          return (
            <li key={entry.id}>
              <button
                type="button"
                title={`${entry.name}, captured ${new Date(entry.capturedAt).toLocaleString()}`}
                onClick={async (event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  const payload = await decodeShare(entry.payload);
                  if (payload) restore(payload, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
                }}
                className={`flex items-center gap-2 border-b pb-0.5 font-mono text-[11.5px] transition-colors ${
                  isActive ? "border-signal text-ink" : "border-transparent text-ink-dim hover:text-ink"
                }`}
              >
                <span className="flex h-2.5 w-[25px] overflow-hidden border border-hairline-strong">
                  {entry.swatches.map((hex, index) => (
                    <span key={index} className="flex-1" style={{ backgroundColor: hex }} />
                  ))}
                </span>
                {entry.host}
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button" onClick={() => recentCaptures.clear()} className="label text-[9.5px] text-ink-faint hover:text-signal">
        Clear
      </button>
    </div>
  );
}
