interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionRequest {
  systemPrompt: string;
  userPrompt: string;
}

interface OpenRouterChoice {
  message?: {
    content?: string;
  };
}

interface OpenRouterResponse {
  id: string;
  choices: OpenRouterChoice[];
}

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

async function callOpenRouter(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://shitsurai.dev",
      "X-Title": "shitsurai",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 8192,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter error (${response.status}): ${text}`);
  }

  const data = (await response.json()) as OpenRouterResponse;
  const content = data.choices[0]?.message?.content;
  if (content === undefined || content === null) {
    throw new Error("Unexpected response format from OpenRouter");
  }

  return content;
}

export async function generateHTML(
  apiKey: string,
  model: string,
  options: CompletionRequest
): Promise<string> {
  const text = await callOpenRouter(apiKey, model, options.systemPrompt, options.userPrompt);
  return extractHtml(text);
}

export async function generateText(
  apiKey: string,
  model: string,
  options: CompletionRequest
): Promise<string> {
  const text = await callOpenRouter(apiKey, model, options.systemPrompt, options.userPrompt);
  return text.trim();
}
