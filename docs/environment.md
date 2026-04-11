# Environment Variables Reference

## Backend (Cloudflare Workers)

All secrets are set via `wrangler secret put <NAME>`.

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | ✓ | Your Anthropic Claude API key (sk-ant-...) |
| `GITHUB_CLIENT_ID` | ✓ | GitHub OAuth App Client ID |
| `GITHUB_CLIENT_SECRET` | ✓ | GitHub OAuth App Client Secret |
| `STRIPE_SECRET_KEY` | ✓ | Stripe secret key (sk_test_... or sk_live_...) |
| `STRIPE_WEBHOOK_SECRET` | ✓ | Stripe webhook signing secret (whsec_...) |
| `STRIPE_PRO_PRICE_ID` | ✓ | Stripe Price ID for Pro plan (price_...) |
| `STRIPE_TEAM_PRICE_ID` | ✓ | Stripe Price ID for Team plan (price_...) |
| `JWT_SECRET` | ✓ | Random string for signing session tokens (64+ chars) |
| `BASE_URL` | ✓ | Backend URL (set in wrangler.toml `[vars]`, not secret) |

## CLI (user side)

| Variable | Required | Description |
|----------|----------|-------------|
| `SHITSURAI_BASE_URL` | - | Backend URL override (default: from auth.json) |
| `SHITSURAI_API_KEY` | - | Bearer token override (default: from auth.json) |
| `ANTHROPIC_API_KEY` | - | Claude API key (self-hosted mode only) |
| `SHITSURAI_MODEL` | - | Claude model (self-hosted mode only) |
| `SHITSURAI_TRANSPORT` | - | "http" for HTTP MCP, default: stdio |
| `SHITSURAI_PORT` | - | HTTP port (default: 3100) |

Users typically don't set these manually -- `shitsurai login` stores them in `~/.shitsurai/auth.json`.
