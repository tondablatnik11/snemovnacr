// AI chat — streaming s NVIDIA NIM + Vercel AI SDK 6 (LanguageModelV3)
// Používáme @ai-sdk/openai-compatible (V3), který je nyní kompatibilní s ai@6.x.

import { streamText, type UIMessage, convertToModelMessages } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { env } from "~/lib/env";
import { retrieve, formatSourcesForPrompt } from "./rag";
import { SYSTEM_PROMPT } from "./prompts";
import { logger } from "~/lib/logger";

export interface ChatParams {
  messages: UIMessage[];
  skipRag?: boolean;
}

/**
 * Extrahuje text z poslední user zprávy (AI SDK 6 ukládá obsah v `parts`).
 */
function extractLastUserText(messages: UIMessage[]): string {
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUserMsg) return "";
  return lastUserMsg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

/**
 * AI chat — streaming přes AI SDK 6 createOpenAICompatible + NVIDIA NIM.
 * Pipeline: extract dotaz → RAG retrieval → compose prompt → streamText.
 */
export async function chatStream({ messages, skipRag }: ChatParams) {
  const question = extractLastUserText(messages);

  let sources = "";
  if (!skipRag && question) {
    try {
      const rag = await retrieve(question);
      sources = formatSourcesForPrompt(rag.sources);
    } catch (err) {
      logger.warn({ err: String(err) }, "RAG retrieve selhal");
    }
  }

  const systemMessage = SYSTEM_PROMPT
    .replace("{context}", sources || "(žádný kontext)")
    .replace("{question}", question);

  const nvidia = createOpenAICompatible({
    name: "nvidia",
    baseURL: env.NVIDIA_BASE_URL,
    apiKey: env.NVIDIA_API_KEY ?? "no-key",
  });

  const result = streamText({
    model: nvidia.chatModel(env.NVIDIA_CHAT_MODEL),
    system: systemMessage,
    messages: await convertToModelMessages(messages),
    temperature: 0.2,
    maxOutputTokens: 1500,
    topP: 0.95,
    onError: (err) => logger.error({ err }, "streamText error"),
  });

  return result;
}