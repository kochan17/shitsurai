#!/usr/bin/env node
import { startServer } from "./server.js";

if (!process.env["ANTHROPIC_API_KEY"]) {
  console.error("Error: ANTHROPIC_API_KEY environment variable is required");
  process.exit(1);
}

startServer().catch((err: unknown) => {
  if (err instanceof Error) {
    console.error("Fatal error:", err.message);
  } else {
    console.error("Fatal error:", err);
  }
  process.exit(1);
});
