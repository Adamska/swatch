import { describe, expect, it } from "vitest";
import { createRateLimiter } from "@/lib/rateLimit";
import { SAMPLE_PROFILES } from "@/lib/samples";
import { decodeShare, encodeShare } from "@/lib/shareCodec";
import { normalizeDeterministic } from "@/lib/tokenNormalizer";
import { createTtlCache } from "@/lib/ttlCache";
import { breakGesture, EMPTY_HISTORY, recordEdit } from "@/store/history";

describe("share codec", () => {
  it("round trips a system through a compact URL-safe string", async () => {
    const { extraction } = SAMPLE_PROFILES[1];
    const tokens = normalizeDeterministic(extraction);
    const encoded = await encodeShare({ tokens, source: extraction.source });
    expect(encoded).toMatch(/^[\w-]+$/);
    expect(encoded.length).toBeLessThan(2500);
    expect(await decodeShare(encoded)).toEqual({ v: 1, tokens, source: extraction.source });
  });

  it.each([null, "", "not base64!", "AAAA", "x".repeat(20_000)])("rejects %s", async (value) => {
    expect(await decodeShare(value)).toBeNull();
  });
});

describe("rate limiter", () => {
  it("allows a burst, then reports when the window frees up", () => {
    const limit = createRateLimiter(2, 60_000);
    expect(limit("a", 0).allowed).toBe(true);
    expect(limit("a", 1_000).allowed).toBe(true);
    expect(limit("a", 2_000)).toEqual({ allowed: false, retryAfterSeconds: 58 });
    expect(limit("b", 2_000).allowed).toBe(true);
    expect(limit("a", 61_000).allowed).toBe(true);
  });
});

describe("ttl cache", () => {
  it("expires entries and evicts the least recently used", () => {
    const cache = createTtlCache<number>(2, 1_000);
    cache.set("a", 1, 0);
    cache.set("b", 2, 0);
    expect(cache.get("a", 10)).toBe(1);
    cache.set("c", 3, 20);
    expect(cache.get("b", 30)).toBeUndefined();
    expect(cache.get("a", 30)).toBe(1);
    expect(cache.get("c", 2_000)).toBeUndefined();
  });
});

describe("undo history", () => {
  const [first, second, third] = SAMPLE_PROFILES.map((profile) => normalizeDeterministic(profile.extraction));

  it("coalesces one gesture into a single undo step", () => {
    breakGesture();
    let history = recordEdit(EMPTY_HISTORY, first, "type:2", 0);
    history = recordEdit(history, second, "type:2", 200);
    history = recordEdit(history, third, "type:2", 400);
    expect(history.past).toEqual([first]);
  });

  it("starts a new step after a pause or on a different control", () => {
    breakGesture();
    let history = recordEdit(EMPTY_HISTORY, first, "type:2", 0);
    history = recordEdit(history, second, "type:2", 2_000);
    history = recordEdit(history, third, "space:1", 2_100);
    expect(history.past).toEqual([first, second, third]);
  });
});
