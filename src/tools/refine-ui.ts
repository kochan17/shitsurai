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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRunId(value: string): boolean {
  return UUID_REGEX.test(value);
}

const repoContextSchema = z.object({
  framework: z.string().optional(),
  tokens: z.string().optional(),
  root: z.string().optional(),
}).optional();

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

      const run_id = saveRun(refinedHtml, viewport);
      const created_at = new Date().toISOString();

      return {
        content: [{ type: "text", text: JSON.stringify({ html: refinedHtml, run_id, created_at }, null, 2) }],
      };
    }
  );
}
