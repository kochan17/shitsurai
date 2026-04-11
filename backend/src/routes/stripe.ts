import { Hono } from "hono";
import Stripe from "stripe";
import type { HonoEnv, User } from "../types.js";
import { authMiddleware } from "../middleware/auth.js";
import { getSubscription, upsertSubscription, getCredits, createCredits } from "../lib/db.js";

const stripeRoutes = new Hono<HonoEnv>();

const PLAN_CREDITS = {
  free: 5,
  pro: 300,
  team: 1000,
} as const;

interface CheckoutBody {
  plan?: "pro" | "team";
}

function getStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, {
    apiVersion: "2025-02-24.acacia",
    httpClient: Stripe.createFetchHttpClient(),
  });
}

stripeRoutes.post("/checkout", authMiddleware, async (c) => {
  const user = c.get("user") as User;
  const body = (await c.req.json().catch(() => ({}))) as CheckoutBody;
  const plan = body.plan ?? "pro";
  if (plan !== "pro" && plan !== "team") {
    return c.json({ error: "Invalid plan" }, 400);
  }

  const priceId = plan === "pro" ? c.env.STRIPE_PRO_PRICE_ID : c.env.STRIPE_TEAM_PRICE_ID;

  const stripe = getStripeClient(c.env.STRIPE_SECRET_KEY);

  let customerId: string | undefined;
  const existingSub = await getSubscription(c.env.DB, user.id);
  if (existingSub?.stripe_customer_id !== null && existingSub?.stripe_customer_id !== undefined) {
    customerId = existingSub.stripe_customer_id;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${c.env.BASE_URL}/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${c.env.BASE_URL}/stripe/cancel`,
    client_reference_id: user.id,
    customer: customerId,
    customer_email: customerId === undefined ? user.email : undefined,
    metadata: {
      user_id: user.id,
      plan,
    },
  });

  if (session.url === null) {
    return c.json({ error: "Failed to create checkout session" }, 500);
  }

  return c.json({ url: session.url });
});

stripeRoutes.post("/webhook", async (c) => {
  const stripe = getStripeClient(c.env.STRIPE_SECRET_KEY);
  const signature = c.req.header("stripe-signature");
  if (signature === undefined) {
    return c.json({ error: "Missing stripe-signature header" }, 400);
  }

  const rawBody = await c.req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      c.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return c.json({ error: `Webhook signature verification failed: ${message}` }, 400);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id;
    const planRaw = session.metadata?.["plan"];
    if (userId !== null && (planRaw === "pro" || planRaw === "team")) {
      const customerId = typeof session.customer === "string" ? session.customer : null;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;

      let currentPeriodEnd: string | null = null;
      if (subscriptionId !== null) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        currentPeriodEnd = new Date(sub.current_period_end * 1000).toISOString();
      }

      await upsertSubscription(c.env.DB, {
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        plan: planRaw,
        status: "active",
        current_period_end: currentPeriodEnd,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const allocation = PLAN_CREDITS[planRaw];
      const existingCredits = await getCredits(c.env.DB, userId);
      if (existingCredits === null) {
        await createCredits(c.env.DB, userId, allocation);
      } else {
        await c.env.DB
          .prepare(
            "UPDATE credits SET balance = ?, monthly_allocation = ?, resets_at = datetime('now', '+1 month'), updated_at = datetime('now') WHERE user_id = ?"
          )
          .bind(allocation, allocation, userId)
          .run();
      }
    }
  } else if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = typeof sub.customer === "string" ? sub.customer : null;
    if (customerId !== null) {
      const existing = await c.env.DB
        .prepare("SELECT user_id FROM subscriptions WHERE stripe_customer_id = ?")
        .bind(customerId)
        .first<{ user_id: string }>();
      if (existing !== null) {
        const status =
          sub.status === "active"
            ? "active"
            : sub.status === "canceled"
              ? "canceled"
              : sub.status === "past_due"
                ? "past_due"
                : "incomplete";
        await c.env.DB
          .prepare(
            "UPDATE subscriptions SET status = ?, current_period_end = ?, updated_at = datetime('now') WHERE user_id = ?"
          )
          .bind(status, new Date(sub.current_period_end * 1000).toISOString(), existing.user_id)
          .run();
      }
    }
  } else if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
    if (customerId !== null) {
      const existing = await c.env.DB
        .prepare("SELECT user_id, plan FROM subscriptions WHERE stripe_customer_id = ?")
        .bind(customerId)
        .first<{ user_id: string; plan: "free" | "pro" | "team" }>();
      if (existing !== null) {
        const allocation = PLAN_CREDITS[existing.plan];
        await c.env.DB
          .prepare(
            "UPDATE credits SET balance = ?, monthly_allocation = ?, resets_at = datetime('now', '+1 month'), updated_at = datetime('now') WHERE user_id = ?"
          )
          .bind(allocation, allocation, existing.user_id)
          .run();
      }
    }
  }

  return c.json({ received: true });
});

stripeRoutes.get("/success", (c) => {
  return c.html(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>shitsurai — Subscription complete</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0a0a0a; color: #fafafa; }
    .card { text-align: center; padding: 48px; border-radius: 12px; background: #171717; max-width: 400px; }
    h1 { margin: 0 0 16px; font-size: 24px; }
    p { margin: 0; color: #a3a3a3; }
    .check { font-size: 64px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="check">✓</div>
    <h1>Subscription active</h1>
    <p>Thanks for subscribing! You can close this tab.</p>
  </div>
</body>
</html>`);
});

stripeRoutes.get("/cancel", (c) => {
  return c.html(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>shitsurai — Cancelled</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0a0a0a; color: #fafafa; }
    .card { text-align: center; padding: 48px; border-radius: 12px; background: #171717; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Cancelled</h1>
    <p>Checkout was cancelled.</p>
  </div>
</body>
</html>`);
});

export { stripeRoutes };
