# Stripe Setup Guide

## 1. Create Stripe Account

Sign up at https://dashboard.stripe.com/register

## 2. Create Products

In Stripe Dashboard -> Products -> Add product

### Pro Plan
- **Name**: shitsurai Pro
- **Description**: 300 credits per month
- **Pricing**: $19.00/month recurring
- Save -> Copy the **Price ID** (starts with `price_`)

### Team Plan
- **Name**: shitsurai Team
- **Description**: 1000 credits per month
- **Pricing**: $49.00/month recurring
- Save -> Copy the **Price ID**

## 3. Set Secrets in Cloudflare

```bash
cd backend
npx wrangler secret put STRIPE_SECRET_KEY
# Paste sk_test_... or sk_live_...

npx wrangler secret put STRIPE_PRO_PRICE_ID
# Paste price_...

npx wrangler secret put STRIPE_TEAM_PRICE_ID
# Paste price_...
```

## 4. Create Webhook Endpoint

1. Stripe Dashboard -> Developers -> Webhooks -> Add endpoint
2. **Endpoint URL**: `https://shitsurai-backend.<your-subdomain>.workers.dev/api/v1/stripe/webhook`
3. **Events to send**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Click "Add endpoint"
5. Copy the **Signing secret** (starts with `whsec_`)

## 5. Set Webhook Secret

```bash
npx wrangler secret put STRIPE_WEBHOOK_SECRET
# Paste whsec_...
```

## Testing

Use Stripe's test mode:
- Card: `4242 4242 4242 4242`
- Any future expiry, any CVC

## Going Live

1. Toggle Stripe Dashboard to "Live mode"
2. Recreate products/prices in live mode
3. Update `STRIPE_SECRET_KEY`, `STRIPE_PRO_PRICE_ID`, `STRIPE_TEAM_PRICE_ID` with live values
4. Create new webhook endpoint in live mode
5. Update `STRIPE_WEBHOOK_SECRET`
