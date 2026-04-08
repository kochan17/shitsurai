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

export function buildAdoptPrompt(
  html: string,
  framework: string,
  repoContext: string | undefined
): string {
  const contextSection = repoContext
    ? `\n\n## Repository Context\n${repoContext}`
    : "";

  return `## HTML Prototype
${html}

## Target Framework
${framework}${contextSection}

Convert this HTML prototype to ${framework} and provide a complete integration guide.`;
}
