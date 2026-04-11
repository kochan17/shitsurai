import { Hono } from "hono";
import type { HonoEnv, User } from "../types.js";
import { authMiddleware } from "../middleware/auth.js";
import { getCredits, createCredits, getSubscription } from "../lib/db.js";

const credits = new Hono<HonoEnv>();

credits.get("/", authMiddleware, async (c) => {
  const user = c.get("user") as User;

  let creditsData = await getCredits(c.env.DB, user.id);
  if (creditsData === null) {
    await createCredits(c.env.DB, user.id, 5);
    creditsData = await getCredits(c.env.DB, user.id);
  }
  if (creditsData === null) {
    return c.json({ error: "Failed to fetch credits" }, 500);
  }

  const subscription = await getSubscription(c.env.DB, user.id);

  return c.json({
    balance: creditsData.balance,
    monthly_allocation: creditsData.monthly_allocation,
    resets_at: creditsData.resets_at,
    plan: subscription?.plan ?? "free",
    subscription_status: subscription?.status ?? "active",
  });
});

export { credits as creditsRoutes };
