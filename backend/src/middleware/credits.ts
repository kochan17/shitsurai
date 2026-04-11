import type { Context, Next } from "hono";
import type { HonoEnv, User } from "../types.js";
import { deductCredit, refundCredit, getCredits, createCredits, logUsage } from "../lib/db.js";
import { generateRandomId } from "../lib/crypto.js";

interface BodyWithMode {
  mode?: unknown;
  url?: unknown;
}

function calculateCreditsNeeded(body: unknown): number {
  if (typeof body !== "object" || body === null) return 1;
  const b = body as BodyWithMode;
  if (typeof b.mode === "string" && typeof b.url === "string") return 2;
  return 1;
}

export function creditsMiddleware(tool: string): (c: Context<HonoEnv>, next: Next) => Promise<Response | void> {
  return async (c, next) => {
    const user = c.get("user") as User | undefined;
    if (user === undefined) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    let credits = await getCredits(c.env.DB, user.id);
    if (credits === null) {
      await createCredits(c.env.DB, user.id, 5);
      credits = await getCredits(c.env.DB, user.id);
    }
    if (credits === null) {
      return c.json({ error: "Failed to initialize credits" }, 500);
    }

    const body = c.get("body") as unknown;
    const creditsNeeded = calculateCreditsNeeded(body);

    if (credits.balance < creditsNeeded) {
      return c.json(
        {
          error: "Insufficient credits",
          balance: credits.balance,
          needed: creditsNeeded,
          upgrade_url: `${c.env.BASE_URL}/api/v1/stripe/checkout`,
        },
        402
      );
    }

    const deducted = await deductCredit(c.env.DB, user.id, creditsNeeded);
    if (!deducted) {
      return c.json({ error: "Failed to deduct credits" }, 500);
    }

    c.set("creditsReserved", creditsNeeded);

    let shouldRefund = false;
    try {
      await next();
      if (c.res.status >= 500) {
        shouldRefund = true;
      }
    } catch (e: unknown) {
      shouldRefund = true;
      throw e;
    } finally {
      if (shouldRefund) {
        await refundCredit(c.env.DB, user.id, creditsNeeded);
      } else {
        await logUsage(c.env.DB, {
          id: generateRandomId(),
          user_id: user.id,
          tool,
          credits_used: creditsNeeded,
          metadata: null,
        });
      }
    }

    return undefined;
  };
}
