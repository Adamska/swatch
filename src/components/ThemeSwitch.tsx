"use client";

import { useSyncExternalStore } from "react";
import { applyTheme, readTheme, subscribeTheme, type Theme } from "@/lib/theme";

const OPTIONS: { id: Theme; label: string }[] = [
  { id: "dark", label: "Darkroom" },
  { id: "light", label: "Paper" },
];

export function ThemeSwitch() {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => null);

  return (
    <div role="group" aria-label="Interface theme" className="flex items-center gap-3 print:hidden">
      <span className="label text-[9.5px] text-ink-faint">Bench</span>
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={theme === option.id}
          onClick={() => applyTheme(option.id)}
          className={`text-[12.5px] transition-colors ${
            theme === option.id
              ? "text-ink underline decoration-signal decoration-2 underline-offset-[6px]"
              : "text-ink-dim hover:text-ink"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
