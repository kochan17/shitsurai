import { Hono } from "hono";
import { cors } from "hono/cors";
import type { HonoEnv } from "./types.js";
import { authRoutes } from "./routes/auth.js";
import { designRoutes } from "./routes/design.js";
import { meRoutes } from "./routes/me.js";
import { creditsRoutes } from "./routes/credits.js";
import { stripeRoutes } from "./routes/stripe.js";

const app = new Hono<HonoEnv>();

const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:8787",
  "https://shitsurai.dev",
  "https://app.shitsurai.dev",
]);

app.use("*", cors({
  origin: (origin) => (ALLOWED_ORIGINS.has(origin) ? origin : null),
  credentials: true,
}));

app.get("/", (c) => c.json({ name: "shitsurai-backend", version: "0.1.0" }));
app.get("/health", (c) => c.json({ ok: true }));

app.route("/auth", authRoutes);
app.route("/api/v1", designRoutes);
app.route("/api/v1/me", meRoutes);
app.route("/api/v1/credits", creditsRoutes);
app.route("/api/v1/stripe", stripeRoutes);
app.route("/stripe", stripeRoutes);

export default app;
