import { Hono } from "hono";
import type { HonoEnv, User, Run } from "../types.js";
import { generateHTML, generateText } from "../lib/llm.js";
import {
  GENERATE_SYSTEM_PROMPT,
  REFINE_SYSTEM_PROMPT,
  ADOPT_SYSTEM_PROMPT,
  buildGeneratePrompt,
  buildRefinePrompt,
  buildAdoptPrompt,
} from "../lib/prompts.js";
import { saveRun, getRun } from "../lib/db.js";
import { generateRandomId } from "../lib/crypto.js";
import { authMiddleware } from "../middleware/auth.js";
import { bodyMiddleware } from "../middleware/body.js";
import { creditsMiddleware } from "../middleware/credits.js";
import { rateLimitMiddleware } from "../middleware/rate-limit.js";

const design = new Hono<HonoEnv>();

const VIEWPORT_WIDTH = {
  desktop: 1440,
  mobile: 390,
} as const;

interface RepoContext {
  framework?: string;
  tokens?: string;
  root?: string;
}

interface GenerateDesignBody {
  prompt?: string;
  repo_context?: RepoContext;
  viewport?: "desktop" | "mobile";
  mode?: "inspire" | "clone" | "enhance";
  url?: string;
}

interface RefineDesignBody {
  run_id_or_html?: string;
  feedback?: string;
  repo_context?: RepoContext;
  viewport?: "desktop" | "mobile";
  mode?: "inspire" | "clone" | "enhance";
  url?: string;
}

interface AdoptBody {
  html?: string;
  framework?: "react" | "vue" | "nextjs" | "svelte";
  repo_context?: RepoContext;
}

function isValidBody(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRepoContext(value: unknown): value is RepoContext {
  return typeof value === "object" && value !== null;
}

function generateRunId(prompt: string): string {
  const now = new Date();
  const ts = now.toISOString().replace(/:/g, "-").replace(/\.\d+Z$/, "");
  const slug =
    prompt
      .toLowerCase()
      .slice(0, 30)
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+$/, "") || "design";
  const suffix = generateRandomId(4);
  return `${ts}-${slug}-${suffix}`;
}

function isRunIdPattern(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-[a-z0-9-]+$/.test(value.trim());
}

async function scrapeUrl(url: string): Promise<{ html: string; title: string }> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (shitsurai-scraper/0.1)" },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch URL: ${res.status}`);
  }
  const html = await res.text();
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch?.[1] ?? "";
  return { html, title };
}

design.post(
  "/generateDesign",
  authMiddleware,
  bodyMiddleware,
  rateLimitMiddleware,
  creditsMiddleware("generate_design"),
  async (c) => {
    const body = c.get("body") as unknown;
    if (!isValidBody(body)) {
      return c.json({ error: "Invalid request body" }, 400);
    }
    const req = body as GenerateDesignBody;

    if (typeof req.prompt !== "string" || req.prompt.length === 0) {
      return c.json({ error: "prompt is required" }, 400);
    }
    if (!isRepoContext(req.repo_context)) {
      return c.json({ error: "repo_context is required" }, 400);
    }
    const viewport = req.viewport ?? "desktop";
    if (viewport !== "desktop" && viewport !== "mobile") {
      return c.json({ error: "Invalid viewport" }, 400);
    }
    if (req.mode !== undefined && req.url === undefined) {
      return c.json({ error: "url is required when mode is specified" }, 400);
    }

    let referenceContext: string | undefined;
    if (req.mode !== undefined && req.url !== undefined) {
      try {
        const scraped = await scrapeUrl(req.url);
        referenceContext = `Mode: ${req.mode}\nURL: ${req.url}\nTitle: ${scraped.title}\n\nPage HTML (excerpt):\n${scraped.html.slice(0, 10000)}`;
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Unknown scraping error";
        return c.json({ error: `Failed to scrape URL: ${message}` }, 500);
      }
    }

    const viewportWidth = VIEWPORT_WIDTH[viewport];
    const userPrompt = buildGeneratePrompt(req.prompt, req.repo_context, viewportWidth, referenceContext);

    let html: string;
    try {
      html = await generateHTML(c.env.OPENROUTER_API_KEY, c.env.OPENROUTER_MODEL, {
        systemPrompt: GENERATE_SYSTEM_PROMPT,
        userPrompt,
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown LLM error";
      return c.json({ error: `LLM error: ${message}` }, 500);
    }

    const user = c.get("user") as User;
    const runId = generateRunId(req.prompt);
    const createdAt = new Date().toISOString();

    const run: Run = {
      id: runId,
      user_id: user.id,
      html,
      viewport,
      prompt: req.prompt,
      mode: req.mode ?? null,
      url: req.url ?? null,
      repo_context: JSON.stringify(req.repo_context),
      created_at: createdAt,
    };

    await saveRun(c.env.DB, run);

    return c.json({
      html,
      run_id: runId,
      viewport,
      created_at: createdAt,
    });
  }
);

design.post(
  "/refineDesign",
  authMiddleware,
  bodyMiddleware,
  rateLimitMiddleware,
  creditsMiddleware("refine_design"),
  async (c) => {
    const body = c.get("body") as unknown;
    if (!isValidBody(body)) {
      return c.json({ error: "Invalid request body" }, 400);
    }
    const req = body as RefineDesignBody;

    if (typeof req.run_id_or_html !== "string" || req.run_id_or_html.length === 0) {
      return c.json({ error: "run_id_or_html is required" }, 400);
    }
    if (typeof req.feedback !== "string" || req.feedback.length === 0) {
      return c.json({ error: "feedback is required" }, 400);
    }
    if (!isRepoContext(req.repo_context)) {
      return c.json({ error: "repo_context is required" }, 400);
    }
    const viewport = req.viewport ?? "desktop";
    if (viewport !== "desktop" && viewport !== "mobile") {
      return c.json({ error: "Invalid viewport" }, 400);
    }
    if (req.mode !== undefined && req.url === undefined) {
      return c.json({ error: "url is required when mode is specified" }, 400);
    }

    const user = c.get("user") as User;

    let html: string;
    if (isRunIdPattern(req.run_id_or_html)) {
      const existing = await getRun(c.env.DB, req.run_id_or_html, user.id);
      if (existing === null) {
        return c.json({ error: `run_id not found: ${req.run_id_or_html}` }, 404);
      }
      html = existing.html;
    } else {
      html = req.run_id_or_html;
    }

    let referenceContext: string | undefined;
    if (req.mode !== undefined && req.url !== undefined) {
      try {
        const scraped = await scrapeUrl(req.url);
        referenceContext = `Mode: ${req.mode}\nURL: ${req.url}\nTitle: ${scraped.title}\n\nPage HTML (excerpt):\n${scraped.html.slice(0, 10000)}`;
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Unknown scraping error";
        return c.json({ error: `Failed to scrape URL: ${message}` }, 500);
      }
    }

    const viewportWidth = VIEWPORT_WIDTH[viewport];
    const userPrompt = buildRefinePrompt(html, req.feedback, viewportWidth, req.repo_context, referenceContext);

    let refinedHtml: string;
    try {
      refinedHtml = await generateHTML(c.env.OPENROUTER_API_KEY, c.env.OPENROUTER_MODEL, {
        systemPrompt: REFINE_SYSTEM_PROMPT,
        userPrompt,
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown LLM error";
      return c.json({ error: `LLM error: ${message}` }, 500);
    }

    const runId = generateRunId(req.feedback);
    const createdAt = new Date().toISOString();

    const run: Run = {
      id: runId,
      user_id: user.id,
      html: refinedHtml,
      viewport,
      prompt: req.feedback,
      mode: req.mode ?? null,
      url: req.url ?? null,
      repo_context: JSON.stringify(req.repo_context),
      created_at: createdAt,
    };

    await saveRun(c.env.DB, run);

    return c.json({
      html: refinedHtml,
      run_id: runId,
      viewport,
      created_at: createdAt,
    });
  }
);

design.post(
  "/adopt",
  authMiddleware,
  bodyMiddleware,
  rateLimitMiddleware,
  creditsMiddleware("adopt"),
  async (c) => {
    const body = c.get("body") as unknown;
    if (!isValidBody(body)) {
      return c.json({ error: "Invalid request body" }, 400);
    }
    const req = body as AdoptBody;

    if (typeof req.html !== "string" || req.html.length === 0) {
      return c.json({ error: "html is required" }, 400);
    }
    if (req.framework === undefined) {
      return c.json({ error: "framework is required" }, 400);
    }
    if (!isRepoContext(req.repo_context)) {
      return c.json({ error: "repo_context is required" }, 400);
    }

    const userPrompt = buildAdoptPrompt(req.html, req.framework, req.repo_context);

    let guide: string;
    try {
      guide = await generateText(c.env.OPENROUTER_API_KEY, c.env.OPENROUTER_MODEL, {
        systemPrompt: ADOPT_SYSTEM_PROMPT,
        userPrompt,
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown LLM error";
      return c.json({ error: `LLM error: ${message}` }, 500);
    }

    return c.json({
      guide,
      created_at: new Date().toISOString(),
    });
  }
);

export { design as designRoutes };
