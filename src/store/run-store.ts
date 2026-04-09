import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

function persistRun(runId: string, createdAt: string, options: SaveRunOptions): void {
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
  writeFileSync(
    join(runDir, "summary.json"),
    JSON.stringify({
      run_id: runId,
      prompt: options.prompt,
      viewport: options.viewport,
      mode: options.mode ?? null,
      url: options.url ?? null,
      created_at: createdAt,
    }, null, 2),
    "utf-8"
  );
  writeFileSync(
    join(process.cwd(), ".aidesigner", "latest.json"),
    JSON.stringify({ run_id: runId, created_at: createdAt }, null, 2),
    "utf-8"
  );
}

export function saveRun(options: SaveRunOptions): SaveRunResult {
  const now = new Date();
  const runId = generateRunId(options.prompt, now);
  const createdAt = now.toISOString();
  store.set(runId, { html: options.html, viewport: options.viewport, createdAt });
  try {
    persistRun(runId, createdAt, options);
  } catch {
    store.delete(runId);
    throw new Error(`Failed to persist run ${runId}`);
  }
  return { runId, createdAt };
}

export function getRun(runId: string): RunEntry | undefined {
  const mem = store.get(runId);
  if (mem !== undefined) return mem;

  const baseDir = join(process.cwd(), ".aidesigner", "runs");
  const runDir = join(baseDir, runId);
  if (!runDir.startsWith(baseDir + sep)) return undefined;

  const htmlPath = join(runDir, "design.html");
  const requestPath = join(runDir, "request.json");
  if (!existsSync(htmlPath)) return undefined;

  try {
    const html = readFileSync(htmlPath, "utf-8");
    let viewport: "desktop" | "mobile" = "desktop";
    let createdAt = new Date().toISOString();

    if (existsSync(requestPath)) {
      const raw: unknown = JSON.parse(readFileSync(requestPath, "utf-8"));
      if (typeof raw === "object" && raw !== null) {
        const req = raw as Record<string, unknown>;
        if (req["viewport"] === "mobile") viewport = "mobile";
      }
    }

    const summaryPath = join(runDir, "summary.json");
    if (existsSync(summaryPath)) {
      const raw: unknown = JSON.parse(readFileSync(summaryPath, "utf-8"));
      if (typeof raw === "object" && raw !== null) {
        const summary = raw as Record<string, unknown>;
        if (typeof summary["created_at"] === "string") createdAt = summary["created_at"];
      }
    }

    const entry: RunEntry = { html, viewport, createdAt };
    store.set(runId, entry);
    return entry;
  } catch {
    return undefined;
  }
}

export function savePreview(runId: string, png: Buffer): void {
  const baseDir = join(process.cwd(), ".aidesigner", "runs");
  const runDir = join(baseDir, runId);
  if (!runDir.startsWith(baseDir + sep)) {
    throw new Error(`Invalid runId: ${runId}`);
  }
  writeFileSync(join(runDir, "preview.png"), png);
}

export function saveAdoption(runId: string, guide: string): void {
  const baseDir = join(process.cwd(), ".aidesigner", "runs");
  const runDir = join(baseDir, runId);
  if (!runDir.startsWith(baseDir + sep)) {
    throw new Error(`Invalid runId: ${runId}`);
  }
  writeFileSync(
    join(runDir, "adoption.json"),
    JSON.stringify({ guide, created_at: new Date().toISOString() }, null, 2),
    "utf-8"
  );
}
