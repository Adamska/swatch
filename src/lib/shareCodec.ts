import { z } from "zod";
import { DesignSystemTokensSchema, ExtractionSourceSchema } from "@/types/tokens";

export const SharePayloadSchema = z.object({
  v: z.literal(1),
  tokens: DesignSystemTokensSchema,
  source: ExtractionSourceSchema,
});

export type SharePayload = z.infer<typeof SharePayloadSchema>;

const MAX_ENCODED_LENGTH = 12_000;

async function pipe(bytes: Uint8Array, transform: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(transform);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function encodeShare(payload: Omit<SharePayload, "v">): Promise<string> {
  const json = JSON.stringify({ v: 1, ...payload });
  return toBase64Url(await pipe(new TextEncoder().encode(json), new CompressionStream("deflate-raw")));
}

export async function decodeShare(value: string | null | undefined): Promise<SharePayload | null> {
  if (!value || value.length > MAX_ENCODED_LENGTH || !/^[\w-]+$/.test(value)) return null;
  try {
    const bytes = await pipe(fromBase64Url(value), new DecompressionStream("deflate-raw"));
    const parsed = SharePayloadSchema.safeParse(JSON.parse(new TextDecoder().decode(bytes)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
