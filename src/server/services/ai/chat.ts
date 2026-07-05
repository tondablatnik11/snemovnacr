// AI chat — streaming s přímým fetch na NVIDIA NIM + Vercel AI SDK 5 (UI Messages)
// Používáme streamUI z AI SDK 5 pro manuální streaming v UI Message formátu.

import { streamText, type UIMessage, convertToModelMessages, createUIMessageStream } from "ai";
import { openai } from "@ai-sdk/openai";
import { env } from "~/lib/env";
import { retrieve, formatSourcesForPrompt } from "./rag";
import { SYSTEM_PROMPT } from "./prompts";
import { logger } from "~/lib/logger";

export interface ChatParams {
  messages: UIMessage[];
  skipRag?: boolean;
}

/**
 * AI chat — implementujeme streaming přes AI SDK 5 createUIMessageStream.
 * Pro volání NVIDIA NIM používáme OpenAI provider (openai package), který
 * podporuje custom baseURL — kompatibilní s NVIDIA OpenAI-compatible API.
 *
 * Tím obcházíme @ai-sdk/openai-compatible (který má V3) a jsme kompatibilní
 * s ai@5.0.86 (LanguageModelV2).
 */
export async function chatStream({ messages, skipRag }: ChatParams) {
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const question =
    lastUserMsg?.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("") ?? "";

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

  // OpenAI provider s custom baseURL — funguje s NVIDIA NIM OpenAI-compatible API
  const nvidiaOpenAI = openai({
    baseURL: env.NVIDIA_BASE_URL,
    apiKey: env.NVIDIA_API_KEY ?? "no-key",
  });

  const result = streamText({
    model: nvidiaOpenAI.chatModel(env.NVIDIA_CHAT_MODEL),
    system: systemMessage,
    messages: convertToModelMessages(messages),
    temperature: 0.2,
    maxOutputTokens: 1500,
    topP: 0.95,
    onError: (err) => logger.error({ err }, "streamText error"),
  });

  return result;
}