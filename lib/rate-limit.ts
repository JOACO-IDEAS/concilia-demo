import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type RateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: "limit" | "unavailable" };

let limiters:
  | { perIp: Ratelimit; perSession: Ratelimit }
  | undefined;

function getLimiters() {
  if (limiters) return limiters;
  // Accept both Upstash's conventional names and the names injected by the
  // Vercel Marketplace integration for this isolated showroom resource.
  const url =
    process.env.UPSTASH_REDIS_REST_URL ??
    process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ??
    process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
  if (!url || !token) return null;

  const redis = new Redis({ url, token });
  limiters = {
    perIp: new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(30, "1 h"),
      prefix: "concilia:showroom:ip",
      analytics: false,
    }),
    perSession: new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(20, "24 h"),
      prefix: "concilia:showroom:session",
      analytics: false,
    }),
  };
  return limiters;
}

export async function consumeAgentQuota(ip: string, sessionId: string): Promise<RateLimitResult> {
  const active = getLimiters();
  if (!active) return { allowed: false, reason: "unavailable" };
  try {
    const [ipResult, sessionResult] = await Promise.all([
      active.perIp.limit(ip),
      active.perSession.limit(sessionId),
    ]);
    return ipResult.success && sessionResult.success
      ? { allowed: true }
      : { allowed: false, reason: "limit" };
  } catch {
    return { allowed: false, reason: "unavailable" };
  }
}
