import type { Context, Next } from "hono";
import type { HonoEnv } from "../types.js";
import { hashToken } from "../lib/crypto.js";
import { getApiTokenByHash, getUserById, touchApiToken } from "../lib/db.js";

export async function authMiddleware(c: Context<HonoEnv>, next: Next): Promise<Response | void> {
  const authHeader = c.req.header("Authorization");
  if (authHeader === undefined || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized: missing Bearer token" }, 401);
  }

  const token = authHeader.slice(7).trim();
  if (token.length === 0) {
    return c.json({ error: "Unauthorized: empty token" }, 401);
  }

  const tokenHash = await hashToken(token);
  const apiToken = await getApiTokenByHash(c.env.DB, tokenHash);
  if (apiToken === null) {
    return c.json({ error: "Unauthorized: invalid token" }, 401);
  }

  const user = await getUserById(c.env.DB, apiToken.user_id);
  if (user === null) {
    return c.json({ error: "Unauthorized: user not found" }, 401);
  }

  await touchApiToken(c.env.DB, tokenHash);

  c.set("user", user);
  await next();
  return undefined;
}
