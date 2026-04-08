import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerGenerateUi } from "./tools/generate-ui.js";
import { registerRefineUi } from "./tools/refine-ui.js";
import { registerPreview } from "./tools/preview.js";
import { registerAdopt } from "./tools/adopt.js";

export async function startServer(): Promise<void> {
  const server = new McpServer({
    name: "shitsurai",
    version: "0.1.0",
  });

  registerGenerateUi(server);
  registerRefineUi(server);
  registerPreview(server);
  registerAdopt(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
