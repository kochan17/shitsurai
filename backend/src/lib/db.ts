import type { User, Subscription, Credits, ApiToken, PendingLogin, Run } from "../types.js";

export async function getUserById(db: D1Database, id: string): Promise<User | null> {
  const result = await db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<User>();
  return result ?? null;
}

export async function getUserByGithubId(db: D1Database, githubId: string): Promise<User | null> {
  const result = await db.prepare("SELECT * FROM users WHERE github_id = ?").bind(githubId).first<User>();
  return result ?? null;
}

export async function createUser(
  db: D1Database,
  user: { id: string; email: string; name: string | null; avatar_url: string | null; github_id: string }
): Promise<void> {
  await db
    .prepare("INSERT INTO users (id, email, name, avatar_url, github_id) VALUES (?, ?, ?, ?, ?)")
    .bind(user.id, user.email, user.name, user.avatar_url, user.github_id)
    .run();
}

export async function getSubscription(db: D1Database, userId: string): Promise<Subscription | null> {
  const result = await db
    .prepare("SELECT * FROM subscriptions WHERE user_id = ?")
    .bind(userId)
    .first<Subscription>();
  return result ?? null;
}

export async function upsertSubscription(db: D1Database, sub: Subscription): Promise<void> {
  await db
    .prepare(
      `INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET
         stripe_customer_id = excluded.stripe_customer_id,
         stripe_subscription_id = excluded.stripe_subscription_id,
         plan = excluded.plan,
         status = excluded.status,
         current_period_end = excluded.current_period_end,
         updated_at = datetime('now')`
    )
    .bind(sub.user_id, sub.stripe_customer_id, sub.stripe_subscription_id, sub.plan, sub.status, sub.current_period_end)
    .run();
}

export async function getCredits(db: D1Database, userId: string): Promise<Credits | null> {
  const result = await db.prepare("SELECT * FROM credits WHERE user_id = ?").bind(userId).first<Credits>();
  return result ?? null;
}

export async function createCredits(db: D1Database, userId: string, allocation: number): Promise<void> {
  await db
    .prepare(
      "INSERT INTO credits (user_id, balance, monthly_allocation, resets_at) VALUES (?, ?, ?, datetime('now', '+1 month'))"
    )
    .bind(userId, allocation, allocation)
    .run();
}

export async function deductCredit(db: D1Database, userId: string, amount: number): Promise<boolean> {
  const result = await db
    .prepare("UPDATE credits SET balance = balance - ?, updated_at = datetime('now') WHERE user_id = ? AND balance >= ?")
    .bind(amount, userId, amount)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function refundCredit(db: D1Database, userId: string, amount: number): Promise<void> {
  await db
    .prepare("UPDATE credits SET balance = balance + ?, updated_at = datetime('now') WHERE user_id = ?")
    .bind(amount, userId)
    .run();
}

export async function logUsage(
  db: D1Database,
  log: { id: string; user_id: string; tool: string; credits_used: number; metadata: string | null }
): Promise<void> {
  await db
    .prepare("INSERT INTO usage_logs (id, user_id, tool, credits_used, metadata) VALUES (?, ?, ?, ?, ?)")
    .bind(log.id, log.user_id, log.tool, log.credits_used, log.metadata)
    .run();
}

export async function createApiToken(db: D1Database, tokenHash: string, userId: string, name: string): Promise<void> {
  await db
    .prepare("INSERT INTO api_tokens (token_hash, user_id, name) VALUES (?, ?, ?)")
    .bind(tokenHash, userId, name)
    .run();
}

export async function getApiTokenByHash(db: D1Database, tokenHash: string): Promise<ApiToken | null> {
  const result = await db.prepare("SELECT * FROM api_tokens WHERE token_hash = ?").bind(tokenHash).first<ApiToken>();
  return result ?? null;
}

export async function touchApiToken(db: D1Database, tokenHash: string): Promise<void> {
  await db
    .prepare("UPDATE api_tokens SET last_used_at = datetime('now') WHERE token_hash = ?")
    .bind(tokenHash)
    .run();
}

export async function createPendingLogin(db: D1Database, login: { code: string; state: string }): Promise<void> {
  await db
    .prepare(
      "INSERT INTO pending_logins (code, state, expires_at) VALUES (?, ?, datetime('now', '+10 minutes'))"
    )
    .bind(login.code, login.state)
    .run();
}

export async function getPendingLogin(db: D1Database, code: string): Promise<PendingLogin | null> {
  const result = await db
    .prepare("SELECT * FROM pending_logins WHERE code = ? AND expires_at > datetime('now')")
    .bind(code)
    .first<PendingLogin>();
  return result ?? null;
}

export async function fulfillPendingLogin(db: D1Database, code: string, userId: string, token: string): Promise<void> {
  await db
    .prepare("UPDATE pending_logins SET user_id = ?, token = ? WHERE code = ?")
    .bind(userId, token, code)
    .run();
}

export async function deletePendingLogin(db: D1Database, code: string): Promise<void> {
  await db.prepare("DELETE FROM pending_logins WHERE code = ?").bind(code).run();
}

export async function claimPendingLogin(db: D1Database, code: string): Promise<PendingLogin | null> {
  const result = await db
    .prepare("DELETE FROM pending_logins WHERE code = ? AND token IS NOT NULL RETURNING *")
    .bind(code)
    .first<PendingLogin>();
  return result ?? null;
}

export async function saveRun(db: D1Database, run: Run): Promise<void> {
  await db
    .prepare(
      "INSERT INTO runs (id, user_id, html, viewport, prompt, mode, url, repo_context) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(run.id, run.user_id, run.html, run.viewport, run.prompt, run.mode, run.url, run.repo_context)
    .run();
}

export async function getRun(db: D1Database, id: string, userId: string): Promise<Run | null> {
  const result = await db
    .prepare("SELECT * FROM runs WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first<Run>();
  return result ?? null;
}
