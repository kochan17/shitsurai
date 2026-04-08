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

export function buildGeneratePrompt(
  prompt: string,
  repoContext: string | undefined,
  viewportWidth: number
): string {
  const viewportInstruction =
    viewportWidth <= 390
      ? `Target mobile viewport: ${viewportWidth}px wide. Use responsive mobile-first layout.`
      : `Target desktop viewport: ${viewportWidth}px wide. Use full-width desktop layout.`;

  const contextSection = repoContext
    ? `\n\n## Repository Context\n${repoContext}`
    : "";

  return `## Design Request
${prompt}

## Viewport
${viewportInstruction}${contextSection}

Generate a complete HTML file for this UI.`;
}
