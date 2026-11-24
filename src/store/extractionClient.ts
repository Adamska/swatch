import { EvidenceSchema, RawExtractionSchema, type Evidence, type RawExtraction } from "@/types/extraction";

export interface ProgressLine {
  phase: string;
  detail: string;
  elapsedMs: number;
}

export interface StreamedExtraction {
  extraction: RawExtraction;
  evidence: Evidence | null;
}

type StreamEvent =
  | ({ type: "progress" } & ProgressLine)
  | { type: "result"; extraction: unknown; evidence: unknown }
  | { type: "error"; code: string; message: string };

async function readError(response: Response): Promise<Error> {
  const payload = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
  return new Error(payload.error?.message ?? `Request failed with status ${response.status}.`);
}

/** Posts to the extract route and replays its NDJSON progress events until the result arrives. */
export async function streamExtraction(
  url: string,
  signal: AbortSignal,
  onProgress: (line: ProgressLine) => void,
): Promise<StreamedExtraction> {
  const response = await fetch("/api/extract", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url }),
    signal,
  });
  if (!response.ok || !response.body) throw await readError(response);

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (value) buffer += value;
    const lines = buffer.split("\n");
    buffer = done ? "" : (lines.pop() ?? "");

    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as StreamEvent;
      if (event.type === "progress") {
        onProgress({ phase: event.phase, detail: event.detail, elapsedMs: event.elapsedMs });
      } else if (event.type === "error") {
        throw new Error(event.message);
      } else {
        const evidence = EvidenceSchema.nullable().safeParse(event.evidence);
        return {
          extraction: RawExtractionSchema.parse(event.extraction),
          evidence: evidence.success ? evidence.data : null,
        };
      }
    }
    if (done) throw new Error("The extraction stream ended without a result.");
  }
}
