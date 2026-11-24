import { ImageResponse } from "next/og";
import { pickReadable } from "@/lib/color";
import { buildTonalScale } from "@/lib/colorScale";
import { decodeShare } from "@/lib/shareCodec";
import { SEMANTIC_COLOR_KEYS } from "@/types/tokens";

export const runtime = "nodejs";

const SIZE = { width: 1200, height: 630 };
const CARBON = "#07080b";
const INK = "#e9e6df";
const SIGNAL = "#ff6a3d";

export async function GET(request: Request) {
  const payload = await decodeShare(new URL(request.url).searchParams.get("s"));
  if (!payload) return new Response("Unknown specimen", { status: 404 });

  const { tokens, source } = payload;
  const { colors } = tokens;
  const host = new URL(source.url).hostname.replace(/^www\./, "");
  const display = tokens.typography.steps.at(-1);

  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: CARBON, color: INK, padding: 56, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 20, letterSpacing: 4, textTransform: "uppercase" }}>
          <span style={{ color: SIGNAL }}>Swatch specimen</span>
          <span style={{ color: "#8b8a84" }}>{host}</span>
        </div>
        <div style={{ display: "flex", marginTop: 34, fontSize: 92, lineHeight: 1, letterSpacing: -3 }}>{tokens.meta.name}</div>
        <div style={{ display: "flex", marginTop: 14, fontSize: 24, color: "#a3a199" }}>
          {`${tokens.typography.steps.length} type steps · ${tokens.spacing.steps.length} spacing steps · ${display ? `${display.sizePx}px display` : ""}`}
        </div>
        <div style={{ display: "flex", marginTop: "auto", gap: 10 }}>
          {SEMANTIC_COLOR_KEYS.map((key) => (
            <div key={key} style={{ display: "flex", flexDirection: "column", flex: 1, border: "1px solid rgba(255,255,255,0.2)" }}>
              <div style={{ display: "flex", height: 120, background: colors[key], color: pickReadable(colors[key], ["#0b0c0f", "#f7f7f5"]), padding: 10, fontSize: 15 }}>
                {colors[key]}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", marginTop: 12, height: 26 }}>
          {buildTonalScale(colors.primary).map((tile) => (
            <div key={tile.stop} style={{ display: "flex", flex: 1, background: tile.hex }} />
          ))}
        </div>
      </div>
    ),
    { ...SIZE, headers: { "cache-control": "public, max-age=86400, immutable" } },
  );
}
