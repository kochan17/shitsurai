CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  github_id TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_github_id ON users(github_id);

-- OAuth用の一時的なpending sessions (CLIログインフロー)
CREATE TABLE pending_logins (
  code TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  user_id TEXT,
  token TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

-- 長期APIトークン (CLIがBearerで使用)
CREATE TABLE api_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT DEFAULT 'cli',
  last_used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_api_tokens_user_id ON api_tokens(user_id);

CREATE TABLE subscriptions (
  user_id TEXT PRIMARY KEY,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  current_period_end TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE credits (
  user_id TEXT PRIMARY KEY,
  balance INTEGER NOT NULL DEFAULT 5,
  monthly_allocation INTEGER NOT NULL DEFAULT 5,
  resets_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE usage_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tool TEXT NOT NULL,
  credits_used INTEGER NOT NULL,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at);

CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  html TEXT NOT NULL,
  viewport TEXT NOT NULL,
  prompt TEXT,
  mode TEXT,
  url TEXT,
  repo_context TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_runs_user_id ON runs(user_id);
CREATE INDEX idx_runs_created_at ON runs(created_at);
