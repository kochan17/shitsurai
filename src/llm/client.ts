import Anthropic from "@anthropic-ai/sdk";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

const anthropic = new Anthropic({
  apiKey: process.env["ANTHROPIC_API_KEY"],
});

function extractHtml(text: string): string {
  const fenceMatch = text.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) {
    return fenceMatch[1].trim();
  }

  const doctypeMatch = text.match(/(<!DOCTYPE[\s\S]*<\/html>)/i);
  if (doctypeMatch?.[1]) {
    return doctypeMatch[1].trim();
  }

  return text.trim();
}

export async function generateHTML(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const model = process.env["SHITSURAI_MODEL"] ?? DEFAULT_MODEL;

  const message = await anthropic.messages.create({
    model,
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const firstBlock = message.content[0];
  if (!firstBlock || firstBlock.type !== "text") {
    throw new Error("Unexpected response format from Claude API");
  }

  return extractHtml(firstBlock.text);
}

export async function generateText(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const model = process.env["SHITSURAI_MODEL"] ?? DEFAULT_MODEL;

  const message = await anthropic.messages.create({
    model,
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const firstBlock = message.content[0];
  if (!firstBlock || firstBlock.type !== "text") {
    throw new Error("Unexpected response format from Claude API");
  }

  return firstBlock.text.trim();
}
