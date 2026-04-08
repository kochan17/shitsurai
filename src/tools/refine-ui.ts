import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { generateHTML } from "../llm/client.js";
import { REFINE_SYSTEM_PROMPT, buildRefinePrompt } from "../prompts/refine.js";

const VIEWPORT_WIDTH = {
  desktop: 1280,
  mobile: 390,
} as const;

export function registerRefineUi(server: McpServer): void {
  server.tool(
    "refine_ui",
    "Refine an existing HTML UI based on feedback",
    {
      html: z.string().describe("The existing HTML to refine"),
      feedback: z.string().describe("Feedback or change requests to apply"),
      viewport: z
        .enum(["desktop", "mobile"])
        .default("desktop")
        .describe("Target viewport size"),
    },
    async ({ html, feedback, viewport }) => {
      const viewportWidth = VIEWPORT_WIDTH[viewport];
      const userPrompt = buildRefinePrompt(html, feedback, viewportWidth);
      const refinedHtml = await generateHTML(REFINE_SYSTEM_PROMPT, userPrompt);

      return {
        content: [{ type: "text", text: refinedHtml }],
      };
    }
  );
}
