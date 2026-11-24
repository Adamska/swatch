import { useEffect, useSyncExternalStore } from "react";
import { faceStatus, requestGoogleFace, webFontEvents, wasRequested, type FaceStatus } from "@/lib/webFonts";
import type { Typography } from "@/types/tokens";

export function useWebFonts(typography: Typography | null) {
  useEffect(() => {
    if (!typography) return;
    for (const role of ["display", "body", "mono"] as const) {
      const weights = typography.steps.filter((step) => step.family === role).map((step) => step.weight);
      requestGoogleFace(typography.families[role], weights.length > 0 ? weights : [400]);
    }
  }, [typography]);
}

export function useFaceStatus(stack: string): { status: FaceStatus; viaGoogle: boolean } {
  useSyncExternalStore(webFontEvents.subscribe, webFontEvents.getSnapshot, webFontEvents.getServerSnapshot);
  if (typeof document === "undefined") return { status: "loading", viaGoogle: false };
  return { status: faceStatus(stack), viaGoogle: wasRequested(stack) };
}
