---
name: shitsurai
description: Self-hosted UI design generation and prototyping workflow using shitsurai MCP server
---

# shitsurai — UI Design Workflow

Use the shitsurai MCP server tools to generate, preview, refine, and adopt UI designs.

## Available Tools

| Tool | Purpose |
|------|---------|
| `generate_design` | Generate a new HTML/CSS design from a text prompt |
| `refine_design` | Refine a previous design with natural language feedback |
| `preview` | Render HTML to a PNG screenshot |
| `adopt` | Convert HTML prototype to framework-specific code |

## Workflow

### Step 1: Gather Repository Context

Before generating a design, scan the project to build `repo_context`:

1. Read `package.json` to identify the framework (Next.js, React, Vue, Svelte)
2. Check for Tailwind CSS (`tailwindcss` in dependencies or `tailwind.config.*`)
3. Check for component libraries (Radix UI, shadcn/ui, MUI, Chakra UI)
4. Identify route structure (`app/` or `pages/` directory)
5. Extract CSS custom properties from global stylesheets

Build the `repo_context` object:
```json
{
  "framework": "Next.js",
  "tokens": "Tailwind CSS, shadcn/ui, tokens: --color-primary, --color-secondary",
  "root": "/, /about, /dashboard, /settings"
}
```

### Step 2: Generate Design

Call `generate_design` with:
- `prompt`: Clear description of the UI to generate
- `repo_context`: The scanned repository context (required)
- `viewport`: "desktop" (default) or "mobile"
- `mode` + `url` (optional): Use "inspire", "clone", or "enhance" with a reference URL

The response includes `html`, `run_id`, `viewport`, and `created_at`.

### Step 3: Preview

Call `preview` with the generated HTML to render a PNG screenshot. Show the image to the user for visual feedback.

### Step 4: Iterate with Refinement

If the user wants changes, call `refine_design` with:
- `run_id_or_html`: The `run_id` from the previous generation
- `feedback`: The user's change requests
- `repo_context`: Same repository context

Preview again after each refinement.

### Step 5: Adopt to Framework

When the user is satisfied, call `adopt` to convert the HTML prototype into framework-specific component code:
- `html`: The final HTML
- `framework`: "react", "vue", "nextjs", or "svelte"
- `repo_context`: Repository context for integration guidance

## Reference Modes

When the user provides a URL for reference:
- **inspire**: Use the URL as visual inspiration, creating something new with a similar feel
- **clone**: Closely replicate the URL's layout, spacing, and visual treatment
- **enhance**: Improve the URL's existing design while keeping the content

## Tips

- Always preview after generation and refinement to show the user what was created
- Use the `run_id` from previous generations to maintain context across refinements
- When adopting, match the framework detected in `repo_context`
- For mobile designs, set viewport to "mobile" for proper responsive preview
- Generated designs are saved to `.aidesigner/runs/{run_id}/` for reference
