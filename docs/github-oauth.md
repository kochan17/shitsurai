# GitHub OAuth App Setup

## Create OAuth App

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: shitsurai
   - **Homepage URL**: `https://shitsurai.dev` (or your deployed URL)
   - **Authorization callback URL**: `https://shitsurai-backend.<your-subdomain>.workers.dev/auth/github/callback`
4. Click "Register application"
5. Copy the **Client ID**
6. Click "Generate a new client secret", copy the **Client Secret**

## Set Secrets in Cloudflare

```bash
cd backend
npx wrangler secret put GITHUB_CLIENT_ID
# Paste Client ID

npx wrangler secret put GITHUB_CLIENT_SECRET
# Paste Client Secret
```

## Update Callback URL if BASE_URL Changes

If you change your backend URL (e.g., custom domain), update the callback URL in the GitHub OAuth App settings to match.
