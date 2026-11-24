export type CodeSegmentKind = "plain" | "comment" | "string" | "number" | "key" | "variable";

export interface CodeSegment {
  text: string;
  kind: CodeSegmentKind;
  swatch?: string;
}

const PATTERN =
  /(\/\/.*$|\/\*.*?\*\/)|("(?:[^"\\]|\\.)*")|(#[0-9a-f]{6}\b)|(--[\w-]+(?:\\\.\d+)?)|(-?\b\d+(?:\.\d+)?(?:px|rem|em)?\b)|([A-Za-z_$][\w$]*(?=\s*:))/g;
const KINDS: CodeSegmentKind[] = ["comment", "string", "string", "variable", "number", "key"];
const HEX = /#[0-9a-f]{6}\b/;

function highlightLine(line: string): CodeSegment[] {
  const segments: CodeSegment[] = [];
  let cursor = 0;

  for (const match of line.matchAll(PATTERN)) {
    const start = match.index;
    if (start > cursor) segments.push({ text: line.slice(cursor, start), kind: "plain" });
    const group = match.slice(1).findIndex((value) => value !== undefined);
    const kind = KINDS[group] ?? "plain";
    const swatch = kind === "string" ? HEX.exec(match[0])?.[0] : undefined;
    segments.push({ text: match[0], kind, swatch });
    cursor = start + match[0].length;
  }
  if (cursor < line.length) segments.push({ text: line.slice(cursor), kind: "plain" });
  return segments;
}

export function highlightCode(code: string): CodeSegment[][] {
  return code.replace(/\n$/, "").split("\n").map(highlightLine);
}
