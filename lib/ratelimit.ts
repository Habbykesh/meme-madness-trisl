import { redis } from "./redis";

/**
 * Sliding-window rate limiter built directly on Redis, since Railway
 * Redis is a plain TCP instance (Upstash's @upstash/ratelimit package
 * only works with Upstash's REST-based Redis).
 *
 * Uses a sorted set per key: each request adds a timestamp, old entries
 * outside the window get trimmed, and the remaining count decides
 * pass/fail. Same sliding-window behavior as before, just hand-rolled.
 */
export async function checkRateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<{ success: boolean }> {
  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, windowStart); // drop entries older than the window
  pipeline.zadd(key, now, `${now}-${Math.random()}`); // record this request
  pipeline.zcard(key); // count requests currently in the window
  pipeline.expire(key, windowSeconds); // let the key self-clean if traffic stops

  const results = await pipeline.exec();
  const count = (results?.[2]?.[1] as number) ?? 0;

  return { success: count <= limit };
}

// Prediction placement: burst of 5, sustained ~1/sec.
export const predictionRateLimit = (userId: string) => checkRateLimit(`predict:${userId}`, 5, 5);

// Magic link requests: 3 per 10 min per email/IP — protects the free
// Resend quota and stops someone's inbox getting spammed.
export const magicLinkRateLimit = (identifier: string) => checkRateLimit(`magiclink:${identifier}`, 3, 600);
