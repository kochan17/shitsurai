import { Hono } from "hono";
import type { HonoEnv, User } from "../types.js";
import { authMiddleware } from "../middleware/auth.js";

const me = new Hono<HonoEnv>();

me.get("/", authMiddleware, (c) => {
  const user = c.get("user") as User;
  return c.json({
    user_id: user.id,
    email: user.email,
    name: user.name,
  });
});

export { me as meRoutes };
