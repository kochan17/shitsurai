import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "node:http";
import { registerGenerateDesign } from "./tools/generate-ui.js";
import { registerRefineDesign } from "./tools/refine-ui.js";
import { registerPreview } from "./tools/preview.js";
import { registerAdopt } from "./tools/adopt.js";

export async function startServer(): Promise<void> {
  const server = new McpServer({
    name: "shitsurai",
    version: "0.1.0",
  });

  registerGenerateDesign(server);
  registerRefineDesign(server);
  registerPreview(server);
  registerAdopt(server);

  const transportMode = process.env["SHITSURAI_TRANSPORT"];

  if (transportMode === "http") {
    const rawPort = parseInt(process.env["SHITSURAI_PORT"] ?? "3100", 10);
    const port = Number.isNaN(rawPort) ? 3100 : rawPort;
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);

    const httpServer = createServer(async (req, res) => {
      await transport.handleRequest(req, res);
    });

    httpServer.listen(port, () => {
      console.error(`shitsurai MCP server listening on http://localhost:${port}`);
    });
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }
}
