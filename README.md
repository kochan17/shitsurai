# shitsurai

Self-hosted design generation MCP server — an open-source clone of [AIDesigner](https://www.aidesigner.ai). Generates UI HTML via Claude API and returns preview images via Playwright.

## Quick Start

```bash
# Install dependencies
npm install
npm run build
npx playwright install chromium

# Initialize in your project
npx shitsurai init
```

## Requirements

- Node.js >= 20.10.0
- `ANTHROPIC_API_KEY` environment variable

## Setup

### Option 1: CLI Init (Recommended)

Run in your project directory:

```bash
npx shitsurai init
```

This will:
- Create `.aidesigner/` directory
- Generate `.mcp.json` with MCP server config
- Install companion skill (`.claude/skills/shitsurai/SKILL.md`)
- Update `.gitignore`

### Option 2: Manual Configuration

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "shitsurai": {
      "command": "node",
      "args": ["/path/to/shitsurai/dist/index.js"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-..."
      }
    }
  }
}
```

## MCP Tools

### `generate_design`

Generate a new HTML/CSS design from a text prompt.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | yes | Description of the UI to generate |
| `repo_context` | object | yes | Repository summary: `{ framework?, tokens?, root? }` |
| `viewport` | `"desktop"` \| `"mobile"` | no (default: `"desktop"`) | Target viewport (desktop: 1440px, mobile: 390px) |
| `mode` | `"inspire"` \| `"clone"` \| `"enhance"` | no | Reference mode (requires `url`) |
| `url` | string | no | Reference URL for mode |

Returns: `{ html, run_id, viewport, created_at }`

### `refine_design`

Refine a previous design iteration with natural language feedback.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `run_id_or_html` | string | yes | Previous `run_id` or raw HTML |
| `feedback` | string | yes | Change requests to apply |
| `repo_context` | object | yes | Repository summary |
| `viewport` | `"desktop"` \| `"mobile"` | no (default: `"desktop"`) | Target viewport |
| `mode` | `"inspire"` \| `"clone"` \| `"enhance"` | no | Reference mode |
| `url` | string | no | Reference URL |

Returns: `{ html, run_id, viewport, created_at }`

### `preview`

Render HTML to a PNG screenshot.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `html` | string | yes | HTML content to render |
| `viewport` | `"desktop"` \| `"mobile"` | no (default: `"desktop"`) | Viewport (desktop: 1440x900, mobile: 390x844) |

Returns: Base64-encoded PNG image.

### `adopt`

Convert an HTML prototype into framework-specific component code.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `html` | string | yes | HTML prototype to convert |
| `framework` | `"react"` \| `"vue"` \| `"nextjs"` \| `"svelte"` | yes | Target framework |
| `repo_context` | object | yes | Repository summary |

Returns: Markdown guide with component code and integration steps.

## Reference Modes

When providing a URL, choose a mode:

| Mode | Description |
|------|-------------|
| **inspire** | Use the URL as visual inspiration for a new design |
| **clone** | Replicate the URL's layout, spacing, and visual treatment |
| **enhance** | Improve the URL's existing design |

## CLI Commands

```bash
shitsurai init [--host claude]              # Initialize for a project
shitsurai doctor                            # Verify configuration
shitsurai generate --prompt "..."           # Generate a new design
  [--viewport desktop|mobile]
  [--mode inspire|clone|enhance]
  [--url "..."]
shitsurai refine --id <run-id> --prompt "..." # Refine existing design
shitsurai preview --id <run-id>             # Render PNG preview
shitsurai adopt --id <run-id>               # Generate adoption guide
  [--framework react|vue|nextjs|svelte]
```

## Workflow

1. **generate_design** — Describe the UI you want
2. **preview** — Render it to see how it looks
3. **refine_design** — Iterate with feedback (using `run_id`)
4. **adopt** — Convert to your framework when satisfied

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | (required) | Anthropic API key |
| `SHITSURAI_MODEL` | `claude-sonnet-4-20250514` | Override Claude model |
| `SHITSURAI_TRANSPORT` | `stdio` | Set to `http` for HTTP server mode |
| `SHITSURAI_PORT` | `3100` | HTTP server port |

## HTTP Transport

For remote MCP server mode:

```bash
SHITSURAI_TRANSPORT=http SHITSURAI_PORT=3100 node dist/index.js
```

Then configure your MCP client:

```json
{
  "mcpServers": {
    "shitsurai": {
      "type": "http",
      "url": "http://localhost:3100"
    }
  }
}
```

## Artifact Storage

Generated designs are saved to `.aidesigner/runs/{run_id}/`:

```
.aidesigner/
├── latest.json              # Points to the latest run
└── runs/
    └── 2026-04-10T12-30-45-dashboard-0/
        ├── design.html      # Generated HTML
        ├── request.json     # Request parameters
        ├── repo-context.json # Repository context
        ├── summary.json     # Run summary
        ├── preview.png      # Preview screenshot
        └── adoption.json    # Framework adoption guide
```
