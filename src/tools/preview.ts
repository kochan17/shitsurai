import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { renderToImage } from "../renderer/playwright.js";

const VIEWPORT_SIZES = {
  desktop: { width: 1280, height: 800 },
  mobile: { width: 390, height: 844 },
} as const;

export function registerPreview(server: McpServer): void {
  server.tool(
    "preview",
    "Render an HTML file to a PNG screenshot using Playwright",
    {
      html: z.string().describe("The HTML content to render"),
      viewport: z
        .enum(["desktop", "mobile"])
        .default("desktop")
        .describe("Target viewport size"),
    },
    async ({ html, viewport }) => {
      const { width, height } = VIEWPORT_SIZES[viewport];
      const imageBuffer = await renderToImage({
        html,
        viewportWidth: width,
        viewportHeight: height,
      });

      return {
        content: [
          {
            type: "image",
            data: imageBuffer.toString("base64"),
            mimeType: "image/png",
          },
        ],
      };
    }
  );
}
