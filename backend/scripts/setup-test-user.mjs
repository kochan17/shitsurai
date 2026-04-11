#!/usr/bin/env node
import { execSync } from "node:child_process";
import { randomBytes, createHash } from "node:crypto";

const TOKEN = "shi_" + randomBytes(32).toString("hex");
const TOKEN_HASH = createHash("sha256").update(TOKEN).digest("hex");
const USER_ID = "test-" + randomBytes(8).toString("hex");

const SQL = `
INSERT INTO users (id, email, name, github_id) VALUES ('${USER_ID}', 'test@example.com', 'Test User', 'test-gh-${USER_ID}');
INSERT INTO credits (user_id, balance, monthly_allocation, resets_at) VALUES ('${USER_ID}', 100, 100, datetime('now', '+1 month'));
INSERT INTO api_tokens (token_hash, user_id, name) VALUES ('${TOKEN_HASH}', '${USER_ID}', 'test-cli');
`.trim();

try {
  execSync(`npx wrangler d1 execute shitsurai --local --command="${SQL.replace(/"/g, '\\"').replace(/\n/g, " ")}"`, {
    stdio: "inherit",
    cwd: process.cwd(),
  });
  console.log("\n==========================================");
  console.log("Test user created successfully!");
  console.log("==========================================");
  console.log(`User ID:  ${USER_ID}`);
  console.log(`Token:    ${TOKEN}`);
  console.log("==========================================");
  console.log("\nExport this token to use with curl:");
  console.log(`  export SHITSURAI_TEST_TOKEN='${TOKEN}'`);
  console.log("\nExample curl:");
  console.log(`  curl -X POST http://localhost:8787/api/v1/generateDesign \\`);
  console.log(`    -H "Authorization: Bearer ${TOKEN}" \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"prompt": "modern coffee shop landing", "repo_context": {"framework": "Next.js"}, "viewport": "desktop"}'`);
} catch (e) {
  console.error("Failed to create test user:", e.message);
  process.exit(1);
}
