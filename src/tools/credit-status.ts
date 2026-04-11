import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { isHostedMode } from "../auth/token-store.js";
import { hostedCreditStatus } from "../llm/hosted-client.js";

export function registerCreditStatus(server: McpServer): void {
  server.tool(
    "get_credit_status",
    "Check credit balance, monthly usage, and subscription status",
    {},
    async () => {
      if (!isHostedMode()) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "get_credit_status is only available in hosted mode. Set SHITSURAI_BASE_URL or run: shitsurai login" }) }],
          isError: true,
        };
      }

      try {
        const result = await hostedCreditStatus();
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
