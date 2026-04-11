import type { Context, Next } from "hono";
import type { HonoEnv, User } from "../types.js";

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 30;

interface RateLimitEntry {
  count: number;
  reset_at: number;
}

export async function rateLimitMiddleware(c: Context<HonoEnv>, next: Next): Promise<Response | void> {
  const user = c.get("user") as User | undefined;
  if (user === undefined) {
    await next();
    return undefined;
  }

  const key = `ratelimit:${user.id}`;
  const now = Math.floor(Date.now() / 1000);

  const existing = await c.env.KV.get<RateLimitEntry>(key, "json");

  let entry: RateLimitEntry;
  if (existing === null || existing.reset_at < now) {
    entry = { count: 1, reset_at: now + WINDOW_SECONDS };
  } else {
    entry = { count: existing.count + 1, reset_at: existing.reset_at };
  }

  if (entry.count > MAX_REQUESTS) {
    const retryAfter = entry.reset_at - now;
    c.header("Retry-After", String(retryAfter));
    c.header("X-RateLimit-Limit", String(MAX_REQUESTS));
    c.header("X-RateLimit-Remaining", "0");
    c.header("X-RateLimit-Reset", String(entry.reset_at));
    return c.json({ error: "Rate limit exceeded" }, 429);
  }

  await c.env.KV.put(key, JSON.stringify(entry), { expirationTtl: WINDOW_SECONDS });

  c.header("X-RateLimit-Limit", String(MAX_REQUESTS));
  c.header("X-RateLimit-Remaining", String(MAX_REQUESTS - entry.count));
  c.header("X-RateLimit-Reset", String(entry.reset_at));

  await next();
  return undefined;
}
