import { redis } from "@/lib/redis";

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSec: number };

/**
 * Fixed-window rate limit per IP (or custom key). Fails open if Redis is
 * unavailable so local dev without Redis still works.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  if (process.env.RATE_LIMIT_DISABLED === "true") {
    return { ok: true, remaining: limit };
  }
  const bucket = `rl:${key}:${Math.floor(Date.now() / (windowSec * 1000))}`;
  try {
    const count = await redis.incr(bucket);
    if (count === 1) await redis.expire(bucket, windowSec);
    if (count > limit) {
      const ttl = await redis.ttl(bucket);
      return { ok: false, retryAfterSec: Math.max(1, ttl) };
    }
    return { ok: true, remaining: Math.max(0, limit - count) };
  } catch {
    return { ok: true, remaining: limit };
  }
}

export function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() ?? "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function rateLimitResponse(retryAfterSec: number): Response {
  return new Response(JSON.stringify({ error: "Too many requests" }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(retryAfterSec),
    },
  });
}

export async function enforceRateLimit(
  req: Request,
  namespace: string,
  limit: number,
  windowSec: number,
): Promise<Response | null> {
  const ip = clientIp(req);
  const result = await rateLimit(`${namespace}:${ip}`, limit, windowSec);
  if (!result.ok) return rateLimitResponse(result.retryAfterSec);
  return null;
}
