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

interface RepoContext {
  framework?: string;
  tokens?: string;
  root?: string;
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

  const contextLines: string[] = [];
  if (repoContext.framework !== undefined) contextLines.push(`- Framework: ${repoContext.framework}`);
  if (repoContext.tokens !== undefined) contextLines.push(`- Design Tokens: ${repoContext.tokens}`);
  if (repoContext.root !== undefined) contextLines.push(`- Root: ${repoContext.root}`);
  const contextSection = contextLines.length > 0
    ? `\n\n## Repository Context\n${contextLines.join("\n")}`
    : "";

  const referenceSection = referenceContext
    ? `\n\n## Reference\n${referenceContext}`
    : "";

  return `## Design Request
${prompt}

## Viewport
${viewportInstruction}${contextSection}${referenceSection}

Generate a complete HTML file for this UI.`;
}
