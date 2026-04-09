import { mkdirSync, writeFileSync } from "node:fs";
import { join, sep } from "node:path";

interface RunEntry {
  html: string;
  viewport: "desktop" | "mobile";
  createdAt: string;
}

interface RepoContext {
  framework?: string;
  tokens?: string;
  root?: string;
}

interface SaveRunOptions {
  html: string;
  viewport: "desktop" | "mobile";
  prompt: string;
  repoContext?: RepoContext;
  mode?: string;
  url?: string;
}

interface SaveRunResult {
  runId: string;
  createdAt: string;
}

const store = new Map<string, RunEntry>();

let counter = 0;

function generateRunId(prompt: string, now: Date): string {
  const ts = now.toISOString().replace(/:/g, "-").replace(/\.\d+Z$/, "");
  const slug =
    prompt
      .toLowerCase()
      .slice(0, 30)
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+$/, "") || "design";
  const suffix = counter++;
  return `${ts}-${slug}-${suffix}`;
}

function persistRun(runId: string, options: SaveRunOptions): void {
  const baseDir = join(process.cwd(), ".aidesigner", "runs");
  const runDir = join(baseDir, runId);
  if (!runDir.startsWith(baseDir + sep)) {
    throw new Error(`Invalid runId: ${runId}`);
  }
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, "design.html"), options.html, "utf-8");
  writeFileSync(
    join(runDir, "request.json"),
    JSON.stringify(
      {
        prompt: options.prompt,
        viewport: options.viewport,
        ...(options.mode !== undefined ? { mode: options.mode } : {}),
        ...(options.url !== undefined ? { url: options.url } : {}),
      },
      null,
      2
    ),
    "utf-8"
  );
  if (options.repoContext !== undefined) {
    writeFileSync(
      join(runDir, "repo-context.json"),
      JSON.stringify(options.repoContext, null, 2),
      "utf-8"
    );
  }
}

export function saveRun(options: SaveRunOptions): SaveRunResult {
  const now = new Date();
  const runId = generateRunId(options.prompt, now);
  const createdAt = now.toISOString();
  store.set(runId, { html: options.html, viewport: options.viewport, createdAt });
  try {
    persistRun(runId, options);
  } catch {
    store.delete(runId);
    throw new Error(`Failed to persist run ${runId}`);
  }
  return { runId, createdAt };
}

export function getRun(runId: string): RunEntry | undefined {
  return store.get(runId);
}
