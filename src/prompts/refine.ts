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

export function buildRefinePrompt(
  html: string,
  feedback: string,
  viewportWidth: number
): string {
  const viewportInstruction =
    viewportWidth <= 390
      ? `Target mobile viewport: ${viewportWidth}px wide.`
      : `Target desktop viewport: ${viewportWidth}px wide.`;

  return `## Current HTML
${html}

## Feedback / Changes Requested
${feedback}

## Viewport
${viewportInstruction}

Refine the HTML based on the feedback above. Return the complete updated HTML file.`;
}
