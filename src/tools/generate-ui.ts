import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { generateHTML } from "../llm/client.js";
import { GENERATE_SYSTEM_PROMPT, buildGeneratePrompt } from "../prompts/generate.js";

const VIEWPORT_WIDTH = {
  desktop: 1280,
  mobile: 390,
} as const;

export function registerGenerateUi(server: McpServer): void {
  server.tool(
    "generate_ui",
    "Generate a UI component as a complete HTML file using Claude",
    {
      prompt: z.string().describe("Description of the UI to generate"),
      repo_context: z
        .string()
        .optional()
        .describe("Optional context about the repository or design system"),
      viewport: z
        .enum(["desktop", "mobile"])
        .default("desktop")
        .describe("Target viewport size"),
    },
    async ({ prompt, repo_context, viewport }) => {
      const viewportWidth = VIEWPORT_WIDTH[viewport];
      const userPrompt = buildGeneratePrompt(prompt, repo_context, viewportWidth);
      const html = await generateHTML(GENERATE_SYSTEM_PROMPT, userPrompt);

      return {
        content: [{ type: "text", text: html }],
      };
    }
  );
}
