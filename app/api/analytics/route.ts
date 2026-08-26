import { Redis } from "@upstash/redis";

export const runtime = "edge";

const EVENTS = new Set([
  "engagement_30s",
  "view_opened",
  "agent_opened",
  "agent_question_sent",
  "demo_reset",
  "primary_click",
]);
const VIEWS = new Set([
  "home",
  "reconciliation",
  "resolution",
  "debt",
  "consortia",
  "consortium",
  "documents",
  "evidence",
  "agent",
  "settings",
]);
const TARGETS = new Set(["agent_deep_link"]);

function redisClient() {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ??
    process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ??
    process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      event?: unknown;
      properties?: { view?: unknown; target?: unknown };
    };
    if (typeof body.event !== "string" || !EVENTS.has(body.event)) {
      return new Response(null, { status: 400 });
    }
    const redis = redisClient();
    if (!redis) return new Response(null, { status: 503 });

    let dimension = "";
    if (
      body.event === "view_opened" &&
      typeof body.properties?.view === "string" &&
      VIEWS.has(body.properties.view)
    ) {
      dimension = `:${body.properties.view}`;
    } else if (
      body.event === "primary_click" &&
      typeof body.properties?.target === "string" &&
      TARGETS.has(body.properties.target)
    ) {
      dimension = `:${body.properties.target}`;
    }
    const day = new Date().toISOString().slice(0, 10);
    const key = `concilia:showroom:analytics:${day}:${body.event}${dimension}`;
    await redis.incr(key);
    await redis.expire(key, 60 * 60 * 24 * 90);
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 400 });
  }
}
