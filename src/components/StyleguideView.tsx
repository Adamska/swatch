"use client";

import { useTokenStore, type StyleguideTab } from "@/store/useTokenStore";
import { ColorChips } from "./styleguide/ColorChips";
import { CompareSheet } from "./styleguide/CompareSheet";
import { RadiiShadows } from "./styleguide/RadiiShadows";
import { TypeSpecimenRack } from "./styleguide/TypeSpecimenRack";
import { VernierRuler } from "./styleguide/VernierRuler";
import { Plate } from "./ui/Plate";

const TABS: { id: StyleguideTab; label: string }[] = [
  { id: "color", label: "Color" },
  { id: "type", label: "Typography" },
  { id: "measure", label: "Measure" },
  { id: "compare", label: "Compare" },
];

export function StyleguideView() {
  const activeTab = useTokenStore((state) => state.activeTab);
  const setActiveTab = useTokenStore((state) => state.setActiveTab);
  const isEdited = useTokenStore((state) => state.isEdited);
  const resetEdits = useTokenStore((state) => state.resetEdits);
  const hasReference = useTokenStore((state) => state.reference !== null);

  return (
    <Plate
      index="01"
      title="Specimens"
      meta={
        isEdited ? (
          <button type="button" onClick={resetEdits} className="bracket-button text-[10.5px]">
            Reset edits
          </button>
        ) : (
          <span className="text-ink-faint">As extracted</span>
        )
      }
    >
      <div role="tablist" aria-label="Styleguide sections" className="flex overflow-x-auto border-b border-hairline">
        {TABS.map((tab, position) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`label relative flex-1 shrink-0 whitespace-nowrap border-r border-hairline px-4 py-3.5 text-left transition-colors last:border-r-0 sm:flex-none sm:pr-8 ${
                isActive ? "bg-tint/[0.035] text-ink" : "text-ink-dim hover:text-ink"
              }`}
            >
              <span className={isActive ? "text-signal" : "text-ink-faint"}>{String.fromCharCode(65 + position)}</span>
              <span className="ml-2.5">{tab.label}</span>
              {tab.id === "compare" && hasReference ? <span className="ml-2 inline-block h-1 w-1 rounded-full bg-signal align-middle" /> : null}
              <span
                aria-hidden="true"
                className={`absolute inset-x-0 -bottom-px h-px origin-left bg-signal transition-transform duration-500 ease-spotlight ${
                  isActive ? "scale-x-100" : "scale-x-0"
                }`}
              />
            </button>
          );
        })}
      </div>

      <div key={activeTab} role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`} className="rise">
        {activeTab === "color" ? <ColorChips /> : null}
        {activeTab === "type" ? <TypeSpecimenRack /> : null}
        {activeTab === "measure" ? (
          <>
            <VernierRuler />
            <RadiiShadows />
          </>
        ) : null}
        {activeTab === "compare" ? <CompareSheet /> : null}
      </div>
    </Plate>
  );
}
