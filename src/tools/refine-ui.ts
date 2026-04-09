import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { generateHTML } from "../llm/client.js";
import { REFINE_SYSTEM_PROMPT, buildRefinePrompt } from "../prompts/refine.js";
import { scrapeUrl } from "../scraper/url-scraper.js";
import { getRun, saveRun } from "../store/run-store.js";

const VIEWPORT_WIDTH = {
  desktop: 1440,
  mobile: 390,
} as const;

const RUN_ID_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-[a-z0-9-]+$/;

function isRunId(value: string): boolean {
  return RUN_ID_PATTERN.test(value.trim());
}

const repoContextSchema = z
  .object({
    framework: z.string().optional(),
    tokens: z.string().optional(),
    root: z.string().optional(),
  })
  .describe("Repository summary: framework, tokens, root");

export function registerRefineDesign(server: McpServer): void {
  server.tool(
    "refine_design",
    "Refine a previous design iteration with natural language feedback",
    {
      run_id_or_html: z.string().describe("Previous run_id or raw HTML to refine"),
      feedback: z.string().describe("Feedback or change requests to apply"),
      viewport: z
        .enum(["desktop", "mobile"])
        .default("desktop")
        .describe("Target viewport size"),
      repo_context: repoContextSchema,
      mode: z.enum(["inspire", "clone", "enhance"]).optional().describe("Reference mode"),
      url: z.string().url().optional().describe("Reference URL (used when mode is specified)"),
    },
    async ({ run_id_or_html, feedback, viewport, repo_context, mode, url }) => {
      if (mode !== undefined && url === undefined) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "url is required when mode is specified" }) }],
          isError: true,
        };
      }

      let html: string;
      if (isRunId(run_id_or_html)) {
        const entry = getRun(run_id_or_html);
        if (entry === undefined) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: `run_id not found: ${run_id_or_html}` }) }],
            isError: true,
          };
        }
        html = entry.html;
      } else {
        html = run_id_or_html;
      }

      let referenceContext: string | undefined;
      if (mode !== undefined && url !== undefined) {
        try {
          const scraped = await scrapeUrl(url);
          referenceContext = `Mode: ${mode}\nURL: ${url}\nTitle: ${scraped.title}\n\nPage HTML (excerpt):\n${scraped.html.slice(0, 10000)}`;
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : "Unknown scraping error";
          return {
            content: [{ type: "text", text: JSON.stringify({ error: `Failed to scrape URL: ${message}` }) }],
            isError: true,
          };
        }
      }

      const viewportWidth = VIEWPORT_WIDTH[viewport];
      const userPrompt = buildRefinePrompt(html, feedback, viewportWidth, repo_context, referenceContext);
      const refinedHtml = await generateHTML(REFINE_SYSTEM_PROMPT, userPrompt);

      const { runId: run_id, createdAt: created_at } = saveRun({ html: refinedHtml, viewport, prompt: feedback, repoContext: repo_context, mode, url });

      return {
        content: [{ type: "text", text: JSON.stringify({ html: refinedHtml, run_id, viewport, created_at }, null, 2) }],
      };
    }
  );
}
