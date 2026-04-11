#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";
import { platform } from "node:os";
import { scanRepo } from "./scanner/repo-scanner.js";
import { saveAuth, loadAuth, clearAuth, getBaseUrl } from "./auth/token-store.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type CliArgs = Record<string, string | true>;

function parseArgs(argv: string[]): { command: string; args: CliArgs } {
  const command = argv[2] ?? "help";
  const args: CliArgs = {};
  for (let i = 3; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) continue;
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return { command, args };
}

function cmdInit(args: CliArgs): void {
  const host = typeof args["host"] === "string" ? args["host"] : "claude";
  const projectDir = process.cwd();

  const aidesignerDir = join(projectDir, ".aidesigner");
  mkdirSync(aidesignerDir, { recursive: true });
  writeFileSync(join(aidesignerDir, ".gitkeep"), "", "utf-8");

  if (host === "claude") {
    const mcpConfigPath = join(projectDir, ".mcp.json");
    if (!existsSync(mcpConfigPath)) {
      const distIndexPath = join(__dirname, "index.js");
      const config = {
        mcpServers: {
          shitsurai: {
            command: "node",
            args: [distIndexPath],
            env: {
              ANTHROPIC_API_KEY: "sk-ant-YOUR_KEY_HERE",
            },
          },
        },
      };
      writeFileSync(mcpConfigPath, JSON.stringify(config, null, 2), "utf-8");
      console.log(`Created ${mcpConfigPath}`);
    } else {
      console.log(`.mcp.json already exists, skipping`);
    }
  }

  if (host === "claude") {
    const skillSrc = join(__dirname, "..", ".claude", "skills", "shitsurai", "SKILL.md");
    const skillDest = join(projectDir, ".claude", "skills", "shitsurai", "SKILL.md");
    const skillDestDir = dirname(skillDest);
    if (existsSync(skillSrc)) {
      mkdirSync(skillDestDir, { recursive: true });
      const content = readFileSync(skillSrc, "utf-8");
      writeFileSync(skillDest, content, "utf-8");
      console.log(`Installed skill to ${skillDest}`);
    }
  }

  const gitignorePath = join(projectDir, ".gitignore");
  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, "utf-8");
    if (!content.includes(".aidesigner/")) {
      writeFileSync(gitignorePath, content.trimEnd() + "\n.aidesigner/*\n!.aidesigner/.gitkeep\n", "utf-8");
      console.log("Updated .gitignore");
    }
  }

  console.log("shitsurai initialized successfully");
}

async function cmdDoctor(): Promise<void> {
  const projectDir = process.cwd();
  let ok = true;

  if (process.env["ANTHROPIC_API_KEY"]) {
    console.log("✓ ANTHROPIC_API_KEY is set");
  } else {
    console.log("✗ ANTHROPIC_API_KEY is not set");
    ok = false;
  }

  const mcpPath = join(projectDir, ".mcp.json");
  if (existsSync(mcpPath)) {
    console.log("✓ .mcp.json exists");
  } else {
    console.log("✗ .mcp.json not found");
    ok = false;
  }

  const aiDir = join(projectDir, ".aidesigner");
  if (existsSync(aiDir)) {
    console.log("✓ .aidesigner/ directory exists");
  } else {
    console.log("✗ .aidesigner/ directory not found");
    ok = false;
  }

  try {
    await import("playwright");
    console.log("✓ Playwright is installed");
  } catch {
    console.log("✗ Playwright is not installed (run: npx playwright install chromium)");
    ok = false;
  }

  const ctx = await scanRepo(projectDir);
  if (ctx.framework) {
    console.log(`✓ Framework detected: ${ctx.framework}`);
  } else {
    console.log("△ No framework detected");
  }
  if (ctx.tokens) {
    console.log(`✓ Tokens: ${ctx.tokens}`);
  }

  console.log(ok ? "\nAll checks passed" : "\nSome checks failed");
}

async function cmdGenerate(args: CliArgs): Promise<void> {
  const prompt = typeof args["prompt"] === "string" ? args["prompt"] : undefined;
  if (prompt === undefined) {
    console.error("Usage: shitsurai generate --prompt \"...\"");
    process.exit(1);
  }

  const VIEWPORTS = ["desktop", "mobile"] as const;
  const MODES = ["inspire", "clone", "enhance"] as const;

  const rawViewport = typeof args["viewport"] === "string" ? args["viewport"] : "desktop";
  if (!(VIEWPORTS as readonly string[]).includes(rawViewport)) {
    console.error(`Invalid viewport: ${rawViewport}. Must be "desktop" or "mobile".`);
    process.exit(1);
  }
  const viewport = rawViewport as "desktop" | "mobile";

  const rawMode = typeof args["mode"] === "string" ? args["mode"] : undefined;
  if (rawMode !== undefined && !(MODES as readonly string[]).includes(rawMode)) {
    console.error(`Invalid mode: ${rawMode}. Must be "inspire", "clone", or "enhance".`);
    process.exit(1);
  }
  const mode = rawMode as "inspire" | "clone" | "enhance" | undefined;
  const url = typeof args["url"] === "string" ? args["url"] : undefined;

  const { generateHTML } = await import("./llm/client.js");
  const { GENERATE_SYSTEM_PROMPT, buildGeneratePrompt } = await import("./prompts/generate.js");
  const { saveRun } = await import("./store/run-store.js");
  const { scanRepo: scan } = await import("./scanner/repo-scanner.js");

  const projectDir = process.cwd();
  const repoContext = await scan(projectDir);
  const viewportWidth = viewport === "mobile" ? 390 : 1440;

  let referenceContext: string | undefined;
  if (mode !== undefined && url !== undefined) {
    const { scrapeUrl } = await import("./scraper/url-scraper.js");
    const scraped = await scrapeUrl(url);
    referenceContext = `Mode: ${mode}\nURL: ${url}\nTitle: ${scraped.title}\n\nPage HTML (excerpt):\n${scraped.html.slice(0, 10000)}`;
  }

  const userPrompt = buildGeneratePrompt(prompt, repoContext, viewportWidth, referenceContext);
  console.log("Generating design...");
  const html = await generateHTML(GENERATE_SYSTEM_PROMPT, userPrompt);

  const { runId, createdAt } = saveRun({ html, viewport, prompt, repoContext, mode, url });
  console.log(JSON.stringify({ run_id: runId, viewport, created_at: createdAt }, null, 2));
}

async function cmdRefine(args: CliArgs): Promise<void> {
  const id = typeof args["id"] === "string" ? args["id"] : undefined;
  const prompt = typeof args["prompt"] === "string" ? args["prompt"] : undefined;
  if (id === undefined || prompt === undefined) {
    console.error("Usage: shitsurai refine --id <run-id> --prompt \"...\"");
    process.exit(1);
  }

  const { getRun, saveRun } = await import("./store/run-store.js");
  const { generateHTML } = await import("./llm/client.js");
  const { REFINE_SYSTEM_PROMPT, buildRefinePrompt } = await import("./prompts/refine.js");
  const { scanRepo: scan } = await import("./scanner/repo-scanner.js");

  const entry = getRun(id);
  if (entry === undefined) {
    console.error(`Run not found: ${id}`);
    process.exit(1);
  }

  const repoContext = await scan(process.cwd());
  const viewport = entry.viewport;
  const viewportWidth = viewport === "mobile" ? 390 : 1440;
  const userPrompt = buildRefinePrompt(entry.html, prompt, viewportWidth, repoContext);

  console.log("Refining design...");
  const refinedHtml = await generateHTML(REFINE_SYSTEM_PROMPT, userPrompt);

  const { runId, createdAt } = saveRun({ html: refinedHtml, viewport, prompt });
  console.log(JSON.stringify({ run_id: runId, viewport, created_at: createdAt }, null, 2));
}

async function cmdPreview(args: CliArgs): Promise<void> {
  const id = typeof args["id"] === "string" ? args["id"] : undefined;
  if (id === undefined) {
    console.error("Usage: shitsurai preview --id <run-id>");
    process.exit(1);
  }

  const { getRun, savePreview } = await import("./store/run-store.js");
  const { renderToImage } = await import("./renderer/playwright.js");

  const entry = getRun(id);
  if (entry === undefined) {
    console.error(`Run not found: ${id}`);
    process.exit(1);
  }

  const width = entry.viewport === "mobile" ? 390 : 1440;
  const height = entry.viewport === "mobile" ? 844 : 900;

  console.log("Rendering preview...");
  const png = await renderToImage({ html: entry.html, viewportWidth: width, viewportHeight: height });
  savePreview(id, png);
  console.log(`Preview saved to .aidesigner/runs/${id}/preview.png`);
}

async function cmdAdopt(args: CliArgs): Promise<void> {
  const id = typeof args["id"] === "string" ? args["id"] : undefined;
  if (id === undefined) {
    console.error("Usage: shitsurai adopt --id <run-id>");
    process.exit(1);
  }

  const framework = typeof args["framework"] === "string" ? args["framework"] : undefined;

  const { getRun, saveAdoption } = await import("./store/run-store.js");
  const { generateText } = await import("./llm/client.js");
  const { ADOPT_SYSTEM_PROMPT, buildAdoptPrompt } = await import("./prompts/adopt.js");
  const { scanRepo: scan } = await import("./scanner/repo-scanner.js");

  const entry = getRun(id);
  if (entry === undefined) {
    console.error(`Run not found: ${id}`);
    process.exit(1);
  }

  const repoContext = await scan(process.cwd());
  const fw = framework ?? repoContext.framework?.toLowerCase() ?? "react";
  const userPrompt = buildAdoptPrompt(entry.html, fw, repoContext);

  console.log(`Generating adoption guide for ${fw}...`);
  const guide = await generateText(ADOPT_SYSTEM_PROMPT, userPrompt);
  saveAdoption(id, guide);
  console.log(guide);
}

const DEFAULT_BASE_URL = "https://shitsurai-backend.workers.dev";

function openBrowser(url: string): void {
  const cmd = platform() === "darwin" ? "open" : platform() === "win32" ? "start" : "xdg-open";
  exec(`${cmd} "${url}"`, (err) => {
    if (err) {
      console.log(`Please open: ${url}`);
    }
  });
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface StartLoginResponse {
  code: string;
  state: string;
  auth_url: string;
}

interface PollResponse {
  status: "pending" | "complete";
  token?: string;
  user_id?: string;
  email?: string;
}

async function cmdLogin(args: CliArgs): Promise<void> {
  const baseUrlArg = typeof args["base-url"] === "string" ? args["base-url"] : undefined;
  const baseUrl = baseUrlArg ?? getBaseUrl() ?? DEFAULT_BASE_URL;

  console.log(`Starting login flow against ${baseUrl}...`);

  const startRes = await fetch(`${baseUrl}/auth/cli/start`, { method: "POST" });
  if (!startRes.ok) {
    console.error(`Failed to start login: ${startRes.status}`);
    process.exit(1);
  }
  const startData = (await startRes.json()) as StartLoginResponse;

  console.log(`Opening browser for authentication...`);
  console.log(`If the browser does not open, visit: ${startData.auth_url}`);
  openBrowser(startData.auth_url);

  console.log(`Waiting for login to complete...`);

  const maxAttempts = 60;
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(2000);
    const pollRes = await fetch(`${baseUrl}/auth/cli/poll?code=${encodeURIComponent(startData.code)}`);
    if (!pollRes.ok) {
      continue;
    }
    const pollData = (await pollRes.json()) as PollResponse;
    if (pollData.status === "complete" && pollData.token !== undefined) {
      saveAuth({
        token: pollData.token,
        user_id: pollData.user_id,
        email: pollData.email,
        baseUrl,
      });
      console.log(`✓ Logged in as ${pollData.email ?? pollData.user_id ?? "user"}`);
      return;
    }
  }

  console.error("Login timed out after 2 minutes");
  process.exit(1);
}

function cmdLogout(): void {
  const auth = loadAuth();
  if (auth === undefined) {
    console.log("Not logged in");
    return;
  }
  clearAuth();
  console.log("Logged out");
}

async function cmdSubscribe(args: CliArgs): Promise<void> {
  const auth = loadAuth();
  if (auth === undefined) {
    console.error("Not logged in. Run: shitsurai login");
    process.exit(1);
  }

  const plan = typeof args["plan"] === "string" ? args["plan"] : "pro";
  if (plan !== "pro" && plan !== "team") {
    console.error(`Invalid plan: ${plan}. Must be "pro" or "team".`);
    process.exit(1);
  }

  const baseUrl = auth.baseUrl ?? DEFAULT_BASE_URL;

  const res = await fetch(`${baseUrl}/api/v1/stripe/checkout`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${auth.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ plan }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Failed to create checkout: ${res.status} ${text}`);
    process.exit(1);
  }

  const data = (await res.json()) as { url: string };
  console.log(`Opening Stripe Checkout...`);
  console.log(`If the browser does not open, visit: ${data.url}`);
  openBrowser(data.url);
}

function cmdHelp(): void {
  console.log(`shitsurai — Self-hosted design generation MCP server

Commands:
  init [--host claude]              Initialize shitsurai for a project
  doctor                            Verify configuration and connection
  generate --prompt "..."           Generate a new design
    [--viewport desktop|mobile]
    [--mode inspire|clone|enhance]
    [--url "..."]
  refine --id <run-id> --prompt "..." Refine an existing design
  preview --id <run-id>             Render a PNG preview
  adopt --id <run-id>               Generate framework adoption guide
    [--framework react|vue|nextjs|svelte]
  login [--base-url <url>]          Log in via browser (OAuth)
  logout                            Log out and remove stored token
  subscribe [--plan pro|team]       Open Stripe checkout to subscribe

Environment:
  ANTHROPIC_API_KEY                 Required for LLM calls
  SHITSURAI_MODEL                   Override Claude model (default: claude-sonnet-4-20250514)
  SHITSURAI_TRANSPORT               "http" for HTTP server, default: stdio
  SHITSURAI_PORT                    HTTP port (default: 3100)`);
}

async function main(): Promise<void> {
  const { command, args } = parseArgs(process.argv);

  switch (command) {
    case "init":
      cmdInit(args);
      break;
    case "doctor":
      await cmdDoctor();
      break;
    case "generate":
      await cmdGenerate(args);
      break;
    case "refine":
      await cmdRefine(args);
      break;
    case "preview":
      await cmdPreview(args);
      break;
    case "adopt":
      await cmdAdopt(args);
      break;
    case "login":
      await cmdLogin(args);
      break;
    case "logout":
      cmdLogout();
      break;
    case "subscribe":
      await cmdSubscribe(args);
      break;
    case "help":
    case "--help":
    case "-h":
      cmdHelp();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      cmdHelp();
      process.exit(1);
  }
}

main().catch((err: unknown) => {
  if (err instanceof Error) {
    console.error("Error:", err.message);
  } else {
    console.error("Error:", err);
  }
  process.exit(1);
});
