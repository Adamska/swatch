export interface RateVerdict {
  allowed: boolean;
  retryAfterSeconds: number;
}

/** Sliding-window limiter held in process memory. Each serverless instance enforces its own window. */
export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>();

  return (key: string, now = Date.now()): RateVerdict => {
    const recent = (hits.get(key) ?? []).filter((timestamp) => now - timestamp < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return { allowed: false, retryAfterSeconds: Math.ceil((windowMs - (now - recent[0])) / 1000) };
    }
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 5000) {
      for (const [entry, stamps] of hits) {
        if (stamps.every((timestamp) => now - timestamp >= windowMs)) hits.delete(entry);
      }
    }
    return { allowed: true, retryAfterSeconds: 0 };
  };
}

export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "local";
}
