import type { Context, Next } from "hono";
import type { HonoEnv } from "../types.js";

export async function bodyMiddleware(c: Context<HonoEnv>, next: Next): Promise<Response | void> {
  if (c.req.method === "POST" || c.req.method === "PUT" || c.req.method === "PATCH") {
    try {
      const body: unknown = await c.req.json();
      c.set("body", body);
    } catch {
      c.set("body", null);
    }
  }
  await next();
  return undefined;
}
