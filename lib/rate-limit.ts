/**
 * Simple in-memory sliding-window rate limiter.
 *
 * NOTE: This resets on every Vercel cold start and isn't shared across serverless
 * instances. It's a soft floor against runaway clients in a single process.
 * For production, swap in Upstash Redis (see README → Production hardening).
 */

type Window = { timestamps: number[] };

const buckets = new Map<string, Window>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetMs: number;
}

export function rateLimit(
  key: string,
  limit = 10,
  windowMs = 60_000
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;

  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0];
    return {
      ok: false,
      remaining: 0,
      resetMs: Math.max(0, oldest + windowMs - now),
    };
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);

  return {
    ok: true,
    remaining: limit - bucket.timestamps.length,
    resetMs: windowMs,
  };
}
