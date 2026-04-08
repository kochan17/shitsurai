import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { generateText } from "../llm/client.js";
import { ADOPT_SYSTEM_PROMPT, buildAdoptPrompt } from "../prompts/adopt.js";

export function registerAdopt(server: McpServer): void {
  server.tool(
    "adopt",
    "Convert an HTML prototype into framework-specific component code with an integration guide",
    {
      html: z.string().describe("The HTML prototype to convert"),
      framework: z
        .enum(["react", "vue", "nextjs", "svelte"])
        .describe("Target framework"),
      repo_context: z
        .string()
        .optional()
        .describe("Optional context about the repository structure"),
    },
    async ({ html, framework, repo_context }) => {
      const userPrompt = buildAdoptPrompt(html, framework, repo_context);
      const guide = await generateText(ADOPT_SYSTEM_PROMPT, userPrompt);

      return {
        content: [{ type: "text", text: guide }],
      };
    }
  );
}
