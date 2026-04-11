import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { isHostedMode } from "../auth/token-store.js";
import { hostedWhoami } from "../llm/hosted-client.js";

export function registerWhoami(server: McpServer): void {
  server.tool(
    "whoami",
    "Return connected account information and authorization scopes",
    {},
    async () => {
      if (!isHostedMode()) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "whoami is only available in hosted mode. Set SHITSURAI_BASE_URL or run: shitsurai login" }) }],
          isError: true,
        };
      }

      try {
        const result = await hostedWhoami();
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
  );
}
