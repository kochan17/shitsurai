# Cloudflare Deployment Guide

## Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/sign-up) (free)
- `wrangler` CLI (installed via `npm install` in `backend/`)

## 1. Install Wrangler

```bash
cd backend
npm install
```

## 2. Login to Cloudflare

```bash
npx wrangler login
```

Opens browser for authentication. Required once per machine.

## 3. Create D1 Database

```bash
npx wrangler d1 create shitsurai
```

Output will include:
```
[[d1_databases]]
binding = "DB"
database_name = "shitsurai"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**Copy the `database_id`** and paste it into `backend/wrangler.toml`, replacing `REPLACE_WITH_DATABASE_ID`.

## 4. Create KV Namespace

```bash
npx wrangler kv:namespace create SHITSURAI_KV
```

Output will include:
```
[[kv_namespaces]]
binding = "KV"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

**Copy the `id`** and paste it into `backend/wrangler.toml`, replacing `REPLACE_WITH_KV_ID`.

## 5. Run Database Migrations

```bash
npx wrangler d1 migrations apply shitsurai --remote
```

Applies `migrations/0001_initial.sql` to the remote D1 database.

## 6. Set Secrets

Run each of these and paste the value when prompted:

```bash
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put STRIPE_PRO_PRICE_ID
npx wrangler secret put STRIPE_TEAM_PRICE_ID
npx wrangler secret put JWT_SECRET
```

See [GitHub OAuth](./github-oauth.md) and [Stripe Setup](./stripe.md) for how to obtain these values.

`JWT_SECRET` should be a random 64+ character string. Generate one with:
```bash
openssl rand -hex 64
```

## 7. Deploy

```bash
npm run deploy
```

Your backend will be available at `https://shitsurai-backend.<your-subdomain>.workers.dev`.

## 8. Update BASE_URL

Edit `backend/wrangler.toml` and update the `BASE_URL` to match your deployed URL:

```toml
[vars]
BASE_URL = "https://shitsurai-backend.<your-subdomain>.workers.dev"
```

Redeploy:
```bash
npm run deploy
```

## 9. Test

```bash
curl https://shitsurai-backend.<your-subdomain>.workers.dev/health
# {"ok":true}
```

## Local Development

Run the backend locally:
```bash
cd backend
npm run dev
```

Apply migrations to local D1:
```bash
npm run db:migrate:local
```
