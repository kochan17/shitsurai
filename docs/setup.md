# shitsurai Setup Guide

Complete guide to deploy the shitsurai backend and go live.

## Prerequisites

- Cloudflare account (free)
- GitHub account (for OAuth)
- Stripe account (free)
- Anthropic API key

## Setup Order

1. [GitHub OAuth App](./github-oauth.md) - Create OAuth App for login
2. [Stripe Setup](./stripe.md) - Create products, prices, and webhook
3. [Cloudflare Deployment](./cloudflare.md) - Deploy backend to Workers
4. [Environment Variables](./environment.md) - Set all secrets
5. [Domain Setup](./domain.md) (optional) - Custom domain

## Quick Reference

| Component | Free Tier | Paid Starting |
|-----------|-----------|---------------|
| Cloudflare Workers | 100k req/day | $5/mo (10M req) |
| Cloudflare D1 | 5GB + 25M rows read/day | $5/mo |
| Cloudflare KV | 1GB + 100k read/day | $5/mo |
| GitHub OAuth | Unlimited | N/A |
| Stripe | Free | 2.9% + 30¢/tx |

## Estimated Cost (MVP)

**Free tier** covers up to ~1,000 active users easily. Beyond that, ~$15/month total for ~10k MAU.
