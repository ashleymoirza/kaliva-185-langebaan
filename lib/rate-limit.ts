/**
 * Lightweight in-process sliding-window rate limiter.
 * Good enough for a single Node instance (Contabo + Nginx, or one Vercel region).
 * For horizontal scaling, swap the Map for Redis / Upstash.
 */
type Bucket = { count: number; reset: number };
const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

export function rateLimit(key: string, limit = 20, windowMs = 60_000): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.reset < now) {
    const reset = now + windowMs;
    buckets.set(key, { count: 1, reset });
    return { success: true, remaining: limit - 1, reset };
  }
  bucket.count += 1;
  if (bucket.count > limit) return { success: false, remaining: 0, reset: bucket.reset };
  return { success: true, remaining: limit - bucket.count, reset: bucket.reset };
}

/** Best-effort client IP behind a trusted proxy (Nginx sets X-Forwarded-For). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/** 429 response helper with standard headers. */
export function tooMany(reset: number): Response {
  return new Response(JSON.stringify({ error: "Too many requests. Please slow down." }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(Math.max(1, Math.ceil((reset - Date.now()) / 1000))),
    },
  });
}
