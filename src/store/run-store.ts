interface RunEntry {
  html: string;
  viewport: "desktop" | "mobile";
  createdAt: string;
}

const store = new Map<string, RunEntry>();

export function saveRun(html: string, viewport: "desktop" | "mobile"): string {
  const runId = crypto.randomUUID();
  store.set(runId, {
    html,
    viewport,
    createdAt: new Date().toISOString(),
  });
  return runId;
}

export function getRun(runId: string): RunEntry | undefined {
  return store.get(runId);
}
