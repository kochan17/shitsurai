export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  BASE_URL: string;
  OPENROUTER_API_KEY: string;
  OPENROUTER_MODEL: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PRO_PRICE_ID: string;
  STRIPE_TEAM_PRICE_ID: string;
  JWT_SECRET: string;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  github_id: string | null;
  created_at: string;
}

export interface ApiToken {
  token_hash: string;
  user_id: string;
  name: string | null;
  last_used_at: string | null;
  created_at: string;
}

export interface Subscription {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: "free" | "pro" | "team";
  status: "active" | "canceled" | "past_due" | "incomplete";
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface Credits {
  user_id: string;
  balance: number;
  monthly_allocation: number;
  resets_at: string | null;
  updated_at: string;
}

export interface PendingLogin {
  code: string;
  state: string;
  user_id: string | null;
  token: string | null;
  created_at: string;
  expires_at: string;
}

export interface Run {
  id: string;
  user_id: string;
  html: string;
  viewport: "desktop" | "mobile";
  prompt: string | null;
  mode: string | null;
  url: string | null;
  repo_context: string | null;
  created_at: string;
}

export type HonoEnv = {
  Bindings: Env;
  Variables: {
    user?: User;
    body?: unknown;
    creditsReserved?: number;
  };
};
