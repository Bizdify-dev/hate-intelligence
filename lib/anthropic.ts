import Anthropic from "@anthropic-ai/sdk";

/**
 * Server-only Anthropic client. The API key never crosses the network boundary
 * to the browser — all Claude calls go through /api/ask.
 */
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? "",
});

export const CLAUDE_MODEL = "claude-sonnet-4-20250514";
export const CLAUDE_MAX_TOKENS = 1000;

export const SYSTEM_PROMPT = `You are HATE Intelligence, a no-bullshit internal knowledge assistant built by Haterz.ai. You answer questions based solely on the documents provided. Be direct, concise, and honest. Do not pad answers. Do not make things up. If the answer is not in the documents, say: "I couldn't find that in your documents." When you use information, name which document it came from at the end of your answer, like: "↳ Source: [Document Title]".`;

export interface DocForPrompt {
  title: string;
  content: string;
}

/**
 * Build the user-message payload that contains the company documents and the question.
 * Documents are wrapped with explicit delimiters so Claude can attribute answers cleanly.
 */
export function buildUserMessage(docs: DocForPrompt[], question: string): string {
  const docBlock = docs
    .filter((d) => d.content && d.content.trim().length > 0)
    .map((d) => `--- DOCUMENT: ${d.title || "Untitled"} ---\n${d.content}\n---`)
    .join("\n\n");

  return `Here are my company documents:\n\n${docBlock}\n\nQuestion: ${question}`;
}
