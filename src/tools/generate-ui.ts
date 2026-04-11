import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { generateHTML } from "../llm/client.js";
import { hostedGenerateDesign } from "../llm/hosted-client.js";
import { isHostedMode } from "../auth/token-store.js";
import { GENERATE_SYSTEM_PROMPT, buildGeneratePrompt } from "../prompts/generate.js";
import { scrapeUrl } from "../scraper/url-scraper.js";
import { saveRun } from "../store/run-store.js";

const VIEWPORT_WIDTH = {
  desktop: 1440,
  mobile: 390,
} as const;

const repoContextSchema = z
  .object({
    framework: z.string().optional(),
    tokens: z.string().optional(),
    root: z.string().optional(),
  })
  .describe("Repository summary: framework, tokens, root");

export function registerGenerateDesign(server: McpServer): void {
  server.tool(
    "generate_design",
    "Generate a new HTML/CSS design from a text prompt",
    {
      prompt: z.string().describe("Description of the UI to generate"),
      repo_context: repoContextSchema,
      viewport: z
        .enum(["desktop", "mobile"])
        .default("desktop")
        .describe("Target viewport size"),
      mode: z.enum(["inspire", "clone", "enhance"]).optional().describe("Reference mode"),
      url: z.string().url().optional().describe("Reference URL (used when mode is specified)"),
    },
    async ({ prompt, repo_context, viewport, mode, url }) => {
      if (mode !== undefined && url === undefined) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "url is required when mode is specified" }) }],
          isError: true,
        };
      }

      if (isHostedMode()) {
        try {
          const result = await hostedGenerateDesign({ prompt, repo_context, viewport, mode, url });
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : "Unknown error";
          return {
            content: [{ type: "text", text: JSON.stringify({ error: message }) }],
            isError: true,
          };
        }
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
      const userPrompt = buildGeneratePrompt(prompt, repo_context, viewportWidth, referenceContext);
      const html = await generateHTML(GENERATE_SYSTEM_PROMPT, userPrompt);

      const { runId: run_id, createdAt: created_at } = saveRun({ html, viewport, prompt, repoContext: repo_context, mode, url });

      return {
        content: [{ type: "text", text: JSON.stringify({ html, run_id, viewport, created_at }, null, 2) }],
      };
    }
  );
}
