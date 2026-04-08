# shitsurai

Self-hosted design generation MCP server. Generates UI HTML via Claude API and returns preview images via Playwright.

## Requirements

- Node.js >= 20.10.0
- `ANTHROPIC_API_KEY` environment variable

## Installation

```bash
npm install
npm run build
```

Install Playwright browsers (first time only):

```bash
npx playwright install chromium
```

## Claude Code Configuration

Add to your Claude Code MCP config (`~/.claude/claude_desktop_config.json` or project `.mcp.json`):

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

### Optional Environment Variables

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | (required) | Anthropic API key |
| `SHITSURAI_MODEL` | `claude-sonnet-4-20250514` | Override Claude model |

## Tools

### `generate_ui`

Generate a UI component as a complete HTML file.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `prompt` | string | yes | Description of the UI to generate |
| `repo_context` | string | no | Context about the repository or design system |
| `viewport` | `desktop` \| `mobile` | no (default: `desktop`) | Target viewport size |

Returns the complete HTML as text.

---

### `refine_ui`

Refine an existing HTML UI based on feedback.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `html` | string | yes | The existing HTML to refine |
| `feedback` | string | yes | Feedback or change requests to apply |
| `viewport` | `desktop` \| `mobile` | no (default: `desktop`) | Target viewport size |

Returns the refined HTML as text.

---

### `preview`

Render an HTML file to a PNG screenshot.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `html` | string | yes | HTML content to render |
| `viewport` | `desktop` \| `mobile` | no (default: `desktop`) | Viewport size (desktop: 1280x800, mobile: 390x844) |

Returns a base64-encoded PNG image.

---

### `adopt`

Convert an HTML prototype into framework-specific component code with an integration guide.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `html` | string | yes | HTML prototype to convert |
| `framework` | `react` \| `vue` \| `nextjs` \| `svelte` | yes | Target framework |
| `repo_context` | string | no | Context about the repository structure |

Returns a Markdown guide with component code and integration steps.

## Typical Workflow

1. **generate_ui** — describe the UI you want
2. **preview** — render it to see how it looks
3. **refine_ui** — iterate with feedback
4. **adopt** — convert to your framework when satisfied
