import { Hono } from "hono";
import type { HonoEnv } from "../types.js";
import { generateRandomId, generateToken, hashToken } from "../lib/crypto.js";
import {
  createPendingLogin,
  getPendingLogin,
  fulfillPendingLogin,
  claimPendingLogin,
  getUserByGithubId,
  createUser,
  createApiToken,
  getCredits,
  createCredits,
} from "../lib/db.js";

const auth = new Hono<HonoEnv>();

interface GitHubTokenResponse {
  access_token?: string;
  error?: string;
}

interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

auth.post("/cli/start", async (c) => {
  const code = generateRandomId(24);
  const state = generateRandomId(24);
  await createPendingLogin(c.env.DB, { code, state });

  const authUrl = `${c.env.BASE_URL}/auth/github/start?code=${code}&state=${state}`;

  return c.json({
    code,
    state,
    auth_url: authUrl,
  });
});

auth.get("/cli/poll", async (c) => {
  const code = c.req.query("code");
  if (code === undefined) {
    return c.json({ error: "code is required" }, 400);
  }

  const claimed = await claimPendingLogin(c.env.DB, code);
  if (claimed !== null && claimed.token !== null && claimed.user_id !== null) {
    return c.json({
      status: "complete",
      token: claimed.token,
      user_id: claimed.user_id,
    });
  }

  const pending = await getPendingLogin(c.env.DB, code);
  if (pending === null) {
    return c.json({ error: "invalid or expired code" }, 404);
  }

  return c.json({ status: "pending" });
});

auth.get("/github/start", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");

  if (code === undefined || state === undefined) {
    return c.text("Missing code or state", 400);
  }

  const pending = await getPendingLogin(c.env.DB, code);
  if (pending === null || pending.state !== state) {
    return c.text("Invalid code or state", 400);
  }

  const ghAuthUrl = new URL("https://github.com/login/oauth/authorize");
  ghAuthUrl.searchParams.set("client_id", c.env.GITHUB_CLIENT_ID);
  ghAuthUrl.searchParams.set("redirect_uri", `${c.env.BASE_URL}/auth/github/callback`);
  ghAuthUrl.searchParams.set("scope", "read:user user:email");
  ghAuthUrl.searchParams.set("state", `${code}:${state}`);

  return c.redirect(ghAuthUrl.toString());
});

auth.get("/github/callback", async (c) => {
  const ghCode = c.req.query("code");
  const stateParam = c.req.query("state");

  if (ghCode === undefined || stateParam === undefined) {
    return c.text("Missing code or state", 400);
  }

  const [ourCode, ourState] = stateParam.split(":");
  if (ourCode === undefined || ourState === undefined) {
    return c.text("Invalid state format", 400);
  }

  const pending = await getPendingLogin(c.env.DB, ourCode);
  if (pending === null || pending.state !== ourState) {
    return c.text("Invalid or expired login session", 400);
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: c.env.GITHUB_CLIENT_ID,
      client_secret: c.env.GITHUB_CLIENT_SECRET,
      code: ghCode,
      redirect_uri: `${c.env.BASE_URL}/auth/github/callback`,
    }),
  });

  if (!tokenRes.ok) {
    return c.text(`Failed to exchange code: ${tokenRes.status}`, 500);
  }

  const tokenData = (await tokenRes.json()) as GitHubTokenResponse;
  if (tokenData.access_token === undefined) {
    return c.text(`GitHub OAuth error: ${tokenData.error ?? "unknown"}`, 500);
  }

  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      "Authorization": `Bearer ${tokenData.access_token}`,
      "User-Agent": "shitsurai",
      "Accept": "application/vnd.github+json",
    },
  });

  if (!userRes.ok) {
    return c.text(`Failed to fetch GitHub user: ${userRes.status}`, 500);
  }

  const ghUser = (await userRes.json()) as GitHubUser;

  let email = ghUser.email;
  if (email === null) {
    const emailRes = await fetch("https://api.github.com/user/emails", {
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
        "User-Agent": "shitsurai",
        "Accept": "application/vnd.github+json",
      },
    });
    if (emailRes.ok) {
      const emails = (await emailRes.json()) as GitHubEmail[];
      const primary = emails.find((e) => e.primary && e.verified);
      if (primary !== undefined) {
        email = primary.email;
      }
    }
  }

  if (email === null) {
    return c.text("No verified email found on GitHub account", 400);
  }

  const githubId = String(ghUser.id);
  let user = await getUserByGithubId(c.env.DB, githubId);
  if (user === null) {
    const userId = generateRandomId(16);
    await createUser(c.env.DB, {
      id: userId,
      email,
      name: ghUser.name,
      avatar_url: ghUser.avatar_url,
      github_id: githubId,
    });
    await createCredits(c.env.DB, userId, 5);
    user = {
      id: userId,
      email,
      name: ghUser.name,
      avatar_url: ghUser.avatar_url,
      github_id: githubId,
      created_at: new Date().toISOString(),
    };
  } else {
    const existingCredits = await getCredits(c.env.DB, user.id);
    if (existingCredits === null) {
      await createCredits(c.env.DB, user.id, 5);
    }
  }

  const apiToken = generateToken();
  const tokenHashValue = await hashToken(apiToken);
  await createApiToken(c.env.DB, tokenHashValue, user.id, "cli");

  await fulfillPendingLogin(c.env.DB, ourCode, user.id, apiToken);

  return c.html(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>shitsurai — Login complete</title>
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
    <h1>Login complete</h1>
    <p>You can close this tab and return to your terminal.</p>
  </div>
</body>
</html>`);
});

export { auth as authRoutes };
