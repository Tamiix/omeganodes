// Ad-hoc in-memory sliding-window rate limiter, scoped to a single edge-function isolate.
// Not perfectly accurate across cold starts or parallel instances, but cheap and effective
// against trivial spam/burst abuse. For stronger guarantees, move to a Redis-backed counter.

type Bucket = { hits: number[] };
const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  /** Max requests allowed within `windowMs`. */
  limit: number;
  /** Sliding window size in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function clientKey(req: Request, scope: string): string {
  const ip =
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
    'unknown';
  return `${scope}:${ip}`;
}

export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const windowStart = now - opts.windowMs;
  const bucket = buckets.get(key) ?? { hits: [] };
  // drop old hits
  bucket.hits = bucket.hits.filter((t) => t > windowStart);

  if (bucket.hits.length >= opts.limit) {
    const oldest = bucket.hits[0];
    const retryAfterMs = Math.max(0, opts.windowMs - (now - oldest));
    buckets.set(key, bucket);
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);

  // light periodic cleanup
  if (buckets.size > 5000 && Math.random() < 0.01) {
    for (const [k, b] of buckets) {
      b.hits = b.hits.filter((t) => t > windowStart);
      if (b.hits.length === 0) buckets.delete(k);
    }
  }

  return { allowed: true, remaining: opts.limit - bucket.hits.length, retryAfterSeconds: 0 };
}

export function rateLimitResponse(result: RateLimitResult, corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please slow down.' }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': String(result.retryAfterSeconds || 60),
      },
    },
  );
}
