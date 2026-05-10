// Best-effort in-process rate limit. On Vercel each serverless instance has
// its own counter, so this is leaky by design — sufficient as a first line of
// defence. Phase 1+: swap for Upstash Redis-backed limiter for accuracy.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

const sweep = () => {
  const now = Date.now();
  for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
};

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  if (buckets.size > 5000) sweep();
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}
