// Fixed-window, in-memory rate limiter for Route Handlers.
//
// Limits are tracked per server instance, so on serverless or multi-instance hosting this is
// a best-effort first line of defence. Pair it with your host's rate limiting / WAF, or swap
// the Map for a shared store (e.g. Redis) when traffic warrants it.

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();
const MAX_TRACKED_KEYS = 10_000;

export type RateLimitResult = { limited: boolean; retryAfterSeconds: number };

export function checkRateLimit(key: string, { limit, windowMs }: { limit: number; windowMs: number }): RateLimitResult {
  const now = Date.now();

  if (windows.size >= MAX_TRACKED_KEYS) {
    for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);
  }

  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, retryAfterSeconds: 0 };
  }

  current.count += 1;
  return {
    limited: current.count > limit,
    retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000),
  };
}

/** Best-effort client IP. x-forwarded-for is only trustworthy behind a proxy that sets it (e.g. Vercel). */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}
