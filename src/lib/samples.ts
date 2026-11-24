import { action, defineProfile, elevations, face, fill, ink, measures, rule, type SampleProfile } from "./sampleBuilders";

const SERIF = '"Fraunces Variable", "Iowan Old Style", Georgia, serif';
const BOOK = '"Source Serif 4", "Iowan Old Style", Georgia, serif';
const GROTESK = 'Geist, "Inter", "Helvetica Neue", Arial, sans-serif';
const HUMANIST = '"Avenir Next", "Nunito Sans", "Segoe UI", sans-serif';
const MONO = '"Geist Mono", "JetBrains Mono", ui-monospace, Menlo, monospace';

const halcyon = defineProfile({
  id: "halcyon-quarterly",
  label: "Halcyon Quarterly",
  descriptor: "Editorial longform on warm paper",
  url: "https://halcyon-quarterly.example/",
  title: "Halcyon Quarterly — Essays on craft, cities and slow technology",
  sampledNodes: 412,
  durationMs: 1840,
  samples: {
    colors: [
      fill("#f4efe6", 1.62), fill("#fbf8f1", 0.48), fill("#1d1a17", 0.21), fill("#e9e1d2", 0.09),
      fill("#1f4f4b", 0.06), fill("#e2b34a", 0.02),
      ink("#1d1a17", 31.4), ink("#6f665b", 9.8), ink("#f4efe6", 2.6), ink("#c8402a", 1.9),
      ink("#2f7d5c", 0.3), ink("#b3261e", 0.2),
      rule("#d8cebd", 14.5), rule("#1d1a17", 3), rule("#1d1a17", 2.5, 0.2),
      action("#c8402a", 7.4), action("#1f4f4b", 3.2), action("#1d1a17", 1.4), action("#e2b34a", 0.6),
    ],
    typography: [
      face("heading", SERIF, 76, 560, 1.02, 1.4, -0.025),
      face("heading", SERIF, 48, 540, 1.08, 3.2, -0.02),
      face("heading", SERIF, 32, 520, 1.16, 8.5, -0.012),
      face("heading", SERIF, 24, 520, 1.25, 12.2, -0.008),
      face("body", BOOK, 19, 400, 1.62, 46.8),
      face("body", BOOK, 16, 400, 1.55, 21.3),
      face("body", BOOK, 14, 400, 1.5, 9.4),
      face("control", MONO, 12, 500, 1.4, 17.6, 0.08),
      face("code", MONO, 14, 400, 1.6, 2.2),
    ],
    spacing: measures([[4, 7], [8, 26], [12, 19], [16, 44], [24, 38], [32, 22], [48, 17], [64, 9], [96, 6], [128, 3]]),
    radii: measures([[2, 31], [4, 12], [9999, 4]]),
    shadows: elevations([
      ["rgba(29, 26, 23, 0.1) 0px 1px 0px 0px", 11],
      ["rgba(29, 26, 23, 0.14) 0px 14px 32px -14px", 4],
    ]),
  },
});

const northwind = defineProfile({
  id: "northwind-ledger",
  label: "Northwind Ledger",
  descriptor: "Fintech dashboard with a confident blue",
  url: "https://northwind-ledger.example/",
  title: "Northwind Ledger — Treasury for teams that ship",
  sampledNodes: 688,
  durationMs: 2310,
  samples: {
    colors: [
      fill("#ffffff", 1.9), fill("#f4f6fa", 0.86), fill("#0b1f33", 0.24), fill("#e8f0ff", 0.11),
      fill("#e6f7f1", 0.04), fill("#fdf1dc", 0.03), fill("#fdeaea", 0.02), fill("#8a3ffc", 0.03),
      ink("#0b1f33", 38.2), ink("#55657a", 17.5), ink("#ffffff", 6.1), ink("#0a5cff", 4.4),
      ink("#0a8f6c", 1.2), ink("#b76e00", 0.7), ink("#d13438", 0.6),
      rule("#e2e8f0", 41), rule("#cbd5e1", 9.5), rule("#0a5cff", 2),
      action("#0a5cff", 15.3), action("#f4f6fa", 6.2), action("#0b1f33", 2.4), action("#00b386", 2.8),
      action("#8a3ffc", 1.6), action("#d13438", 0.5),
    ],
    typography: [
      face("heading", GROTESK, 60, 650, 1.05, 1.2, -0.03),
      face("heading", GROTESK, 40, 640, 1.1, 2.8, -0.025),
      face("heading", GROTESK, 28, 620, 1.2, 7.4, -0.018),
      face("heading", GROTESK, 20, 600, 1.3, 14.1, -0.01),
      face("body", GROTESK, 16, 400, 1.6, 61.7),
      face("body", GROTESK, 14, 400, 1.5, 48.2),
      face("body", GROTESK, 12, 500, 1.4, 28.9, 0.01),
      face("control", GROTESK, 14, 550, 1.2, 24.4),
      face("code", MONO, 13, 400, 1.55, 6.3),
    ],
    spacing: measures([[4, 31], [6, 12], [8, 64], [12, 58], [16, 71], [20, 26], [24, 49], [32, 30], [40, 11], [48, 14], [64, 8], [80, 4]]),
    radii: measures([[6, 22], [8, 47], [12, 26], [16, 6], [9999, 19]]),
    shadows: elevations([
      ["rgba(11, 31, 51, 0.06) 0px 1px 2px 0px", 34],
      ["rgba(11, 31, 51, 0.08) 0px 4px 12px -2px, rgba(11, 31, 51, 0.04) 0px 2px 4px -2px", 18],
      ["rgba(11, 31, 51, 0.16) 0px 24px 48px -12px", 5],
    ]),
  },
});

const kiln = defineProfile({
  id: "kiln-and-clay",
  label: "Kiln & Clay",
  descriptor: "Ceramics studio shop in earthen tones",
  url: "https://kilnandclay.example/",
  title: "Kiln & Clay — Small-batch stoneware, thrown by hand",
  sampledNodes: 356,
  durationMs: 1620,
  samples: {
    colors: [
      fill("#efe6da", 1.7), fill("#f8f2e9", 0.52), fill("#3b2a20", 0.18), fill("#dcc9b2", 0.14),
      fill("#7d8c6a", 0.07), fill("#d9a441", 0.03),
      ink("#3b2a20", 27.6), ink("#7a6657", 11.2), ink("#f8f2e9", 4.3), ink("#b5542f", 2.2),
      ink("#55703f", 0.4), ink("#a8321f", 0.3),
      rule("#dcc9b2", 16.5), rule("#3b2a20", 2, 0.25),
      action("#b5542f", 9.6), action("#7d8c6a", 4.4), action("#3b2a20", 1.5), action("#d9a441", 1.1),
    ],
    typography: [
      face("heading", SERIF, 64, 420, 1.04, 1.3, -0.02),
      face("heading", SERIF, 42, 420, 1.1, 2.6, -0.015),
      face("heading", SERIF, 28, 440, 1.2, 6.8, -0.01),
      face("heading", HUMANIST, 20, 600, 1.3, 9.9),
      face("body", HUMANIST, 17, 400, 1.65, 33.4),
      face("body", HUMANIST, 15, 400, 1.55, 24.7),
      face("body", HUMANIST, 13, 500, 1.4, 12.5, 0.02),
      face("control", HUMANIST, 15, 600, 1.2, 11.3, 0.01),
    ],
    spacing: measures([[6, 9], [10, 14], [12, 21], [16, 36], [20, 27], [28, 18], [40, 15], [56, 9], [72, 6], [112, 3]]),
    radii: measures([[10, 12], [18, 24], [28, 9], [9999, 21]]),
    shadows: elevations([
      ["rgba(59, 42, 32, 0.08) 0px 2px 6px 0px", 14],
      ["rgba(59, 42, 32, 0.14) 0px 18px 40px -16px", 7],
    ]),
  },
});

const graphite = defineProfile({
  id: "graphite-shell",
  label: "Graphite Shell",
  descriptor: "Developer terminal in phosphor on graphite",
  url: "https://graphite-shell.example/",
  title: "Graphite Shell — A terminal that keeps up with you",
  sampledNodes: 531,
  durationMs: 2050,
  samples: {
    colors: [
      fill("#0b0d11", 1.85), fill("#12161d", 0.74), fill("#1a2029", 0.28), fill("#b4f461", 0.03),
      fill("#56d4ff", 0.02, 0.15),
      ink("#e6edf3", 29.8), ink("#8b98a9", 15.4), ink("#b4f461", 5.2), ink("#56d4ff", 2.9),
      ink("#0b0d11", 2.1), ink("#ffb454", 0.8), ink("#ff6b6b", 0.6),
      rule("#232a36", 37), rule("#b4f461", 2.5), rule("#ffffff", 6, 0.1),
      action("#b4f461", 11.2), action("#1a2029", 5.8), action("#56d4ff", 2.3), action("#ff6b6b", 0.4),
    ],
    typography: [
      face("heading", MONO, 56, 600, 1.05, 1.1, -0.04),
      face("heading", MONO, 36, 600, 1.12, 2.4, -0.03),
      face("heading", MONO, 24, 600, 1.25, 6.6, -0.02),
      face("heading", GROTESK, 18, 600, 1.35, 9.2, -0.005),
      face("body", GROTESK, 16, 400, 1.6, 28.6),
      face("body", GROTESK, 14, 400, 1.55, 31.9),
      face("code", MONO, 13, 400, 1.6, 44.3),
      face("control", MONO, 12, 500, 1.3, 19.7, 0.06),
    ],
    spacing: measures([[2, 8], [4, 29], [8, 57], [12, 34], [16, 48], [24, 31], [32, 17], [48, 10], [64, 6], [96, 3]]),
    radii: measures([[2, 18], [4, 39], [6, 11]]),
    shadows: elevations([
      ["rgba(0, 0, 0, 0.4) 0px 1px 2px 0px", 16],
      ["rgba(180, 244, 97, 0.18) 0px 0px 0px 1px, rgba(180, 244, 97, 0.22) 0px 0px 24px -4px", 6],
      ["rgba(0, 0, 0, 0.6) 0px 24px 60px -20px", 4],
    ]),
  },
});

export const SAMPLE_PROFILES: readonly SampleProfile[] = [halcyon, northwind, kiln, graphite];

export function findSampleProfile(id: string): SampleProfile | undefined {
  return SAMPLE_PROFILES.find((profile) => profile.id === id);
}
