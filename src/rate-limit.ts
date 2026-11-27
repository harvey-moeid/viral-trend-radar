export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export interface RateLimiter {
  check(key: string, now?: number): RateLimitResult;
}

/**
 * Best-effort fixed-window limiter held in Worker isolate memory.
 *
 * Counters are per isolate and are lost when the isolate is recycled, so this
 * is a safety net for the YouTube quota, not a strict global guarantee.
 * A strict limit would need a Cloudflare Rate Limiting binding or D1/KV state,
 * which changes deployment configuration and is out of scope for this change.
 */
export function createRateLimiter(limit: number, windowMs: number, maxKeys = 1000): RateLimiter {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return {
    check(key, now = Date.now()) {
      if (buckets.size >= maxKeys) {
        for (const [bucketKey, bucket] of buckets) {
          if (bucket.resetAt <= now) buckets.delete(bucketKey);
        }
        if (buckets.size >= maxKeys) {
          // Still full of active windows: drop the oldest entry to stay bounded.
          const oldest = buckets.keys().next().value;
          if (oldest !== undefined) buckets.delete(oldest);
        }
      }

      const current = buckets.get(key);
      if (!current || current.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true };
      }
      if (current.count >= limit) {
        return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
      }
      current.count += 1;
      return { allowed: true };
    },
  };
}
