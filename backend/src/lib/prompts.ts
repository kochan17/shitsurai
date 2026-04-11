export const GENERATE_SYSTEM_PROMPT = `You are an expert UI system designer specializing in clean, accessible, and modern web interfaces.

## Design Constraints
- **Spacing**: Use 8px grid system (0.5rem increments)
- **Contrast**: Minimum 4.5:1 contrast ratio for text (WCAG AA)
- **Layout**: 12-column grid system
- **Typography**: Clear hierarchy with consistent scale

## Technology
- Use Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
- No external images unless placeholder services (placehold.co)
- Self-contained single HTML file

## Output Requirements
- Output a COMPLETE, valid HTML file starting with <!DOCTYPE html> and ending with </html>
- Include all styles inline or via Tailwind classes
- Include Tailwind CDN script in <head>
- The UI must be fully functional and visually polished
- Do NOT include markdown fences or explanations — output raw HTML only`;

export const REFINE_SYSTEM_PROMPT = `You are an expert UI system designer refining existing HTML interfaces.

## Refinement Rules
- Make ONLY the changes requested in the feedback
- Preserve all existing structure, styles, and content unless explicitly asked to change
- Maintain the same design language and Tailwind class patterns
- Keep the 8px grid system and 4.5:1 contrast ratio
- Output the COMPLETE refined HTML file — do NOT output diffs or partial code

## Output Requirements
- Output a COMPLETE, valid HTML file starting with <!DOCTYPE html> and ending with </html>
- Do NOT include markdown fences or explanations — output raw HTML only`;

export const ADOPT_SYSTEM_PROMPT = `You are an expert frontend engineer helping integrate HTML prototypes into production codebases.

## Your Task
Convert an HTML prototype into framework-specific component code and provide a clear integration guide.

## Output Format
Provide a Markdown document with:
1. **Component Code** — framework-specific component(s) with syntax-highlighted code blocks
2. **File Placement** — where to put each file in the project structure
3. **Dependencies** — any packages to install
4. **Integration Steps** — numbered steps to wire the component into the app
5. **Notes** — any caveats, accessibility considerations, or customization tips

Be concise and practical. Assume the developer is experienced with the target framework.`;

interface RepoContext {
  framework?: string;
  tokens?: string;
  root?: string;
}

function formatRepoContext(ctx: RepoContext): string {
  const lines: string[] = [];
  if (ctx.framework !== undefined) lines.push(`- Framework: ${ctx.framework}`);
  if (ctx.tokens !== undefined) lines.push(`- Design Tokens: ${ctx.tokens}`);
  if (ctx.root !== undefined) lines.push(`- Root: ${ctx.root}`);
  return lines.length > 0 ? `\n\n## Repository Context\n${lines.join("\n")}` : "";
}

export function buildGeneratePrompt(
  prompt: string,
  repoContext: RepoContext,
  viewportWidth: number,
  referenceContext?: string
): string {
  const viewportInstruction =
    viewportWidth <= 390
      ? `Target mobile viewport: ${viewportWidth}px wide. Use responsive mobile-first layout.`
      : `Target desktop viewport: ${viewportWidth}px wide. Use full-width desktop layout.`;

  const contextSection = formatRepoContext(repoContext);
  const referenceSection =
    referenceContext !== undefined ? `\n\n## Reference\n${referenceContext}` : "";

  return `## Design Request
${prompt}

## Viewport
${viewportInstruction}${contextSection}${referenceSection}

Generate a complete HTML file for this UI.`;
}

export function buildRefinePrompt(
  html: string,
  feedback: string,
  viewportWidth: number,
  repoContext: RepoContext,
  referenceContext?: string
): string {
  const viewportInstruction =
    viewportWidth <= 390
      ? `Target mobile viewport: ${viewportWidth}px wide.`
      : `Target desktop viewport: ${viewportWidth}px wide.`;

  const contextSection = formatRepoContext(repoContext);
  const referenceSection =
    referenceContext !== undefined ? `\n\n## Reference\n${referenceContext}` : "";

  return `## Current HTML
${html}

## Feedback / Changes Requested
${feedback}

## Viewport
${viewportInstruction}${contextSection}${referenceSection}

Refine the HTML based on the feedback above. Return the complete updated HTML file.`;
}

export function buildAdoptPrompt(
  html: string,
  framework: string,
  repoContext: RepoContext
): string {
  const contextSection = formatRepoContext(repoContext);

  return `## HTML Prototype
${html}

## Target Framework
${framework}${contextSection}

Convert this HTML prototype to ${framework} and provide a complete integration guide.`;
}
