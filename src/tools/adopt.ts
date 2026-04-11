import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { generateText } from "../llm/client.js";
import { hostedAdopt } from "../llm/hosted-client.js";
import { isHostedMode } from "../auth/token-store.js";
import { ADOPT_SYSTEM_PROMPT, buildAdoptPrompt } from "../prompts/adopt.js";

const repoContextSchema = z
  .object({
    framework: z.string().optional(),
    tokens: z.string().optional(),
    root: z.string().optional(),
  })
  .describe("Repository summary: framework, tokens, root");

export function registerAdopt(server: McpServer): void {
  server.tool(
    "adopt",
    "Convert an HTML prototype into framework-specific component code with an integration guide",
    {
      html: z.string().describe("The HTML prototype to convert"),
      framework: z
        .enum(["react", "vue", "nextjs", "svelte"])
        .describe("Target framework"),
      repo_context: repoContextSchema,
    },
    async ({ html, framework, repo_context }) => {
      if (isHostedMode()) {
        try {
          const result = await hostedAdopt({ html, framework, repo_context });
          return {
            content: [{ type: "text", text: result.guide }],
          };
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : "Unknown error";
          return {
            content: [{ type: "text", text: JSON.stringify({ error: message }) }],
            isError: true,
          };
        }
      }

      const userPrompt = buildAdoptPrompt(html, framework, repo_context);
      const guide = await generateText(ADOPT_SYSTEM_PROMPT, userPrompt);

      return {
        content: [{ type: "text", text: guide }],
      };
    }
  );
}
