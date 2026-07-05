// AI chat — streaming s Vercel AI SDK + NVIDIA NIM

import { streamText, type Message } from "ai";
import { chatModel } from "./nvidia";
import { retrieve, formatSourcesForPrompt } from "./rag";
import { SYSTEM_PROMPT } from "./prompts";
import { logger } from "~/lib/logger";

export interface ChatParams {
  messages: Message[];
  /** Volitelné — přeskočí RAG retrieval a jde rovnou do LLM */
  skipRag?: boolean;
}

export async function chatStream({ messages, skipRag }: ChatParams) {
  const lastUserMsg = messages.filter((m) => m.role === "user").slice(-1)[0];
  const question = typeof lastUserMsg?.content === "string" ? lastUserMsg.content : "";

  let sources = "";
  if (!skipRag && question) {
    try {
      const rag = await retrieve(question);
      sources = formatSourcesForPrompt(rag.sources);
    } catch (err) {
      logger.warn({ err: String(err) }, "× RAG retrieve selhal, pokračuji bez kontextu");
    }
  }

  const systemMessage = SYSTEM_PROMPT
    .replace("{context}", sources || "(žádný kontext)")
    .replace("{question}", question);

  const result = streamText({
    model: chatModel,
    system: systemMessage,
    messages,
    temperature: 0.2,
    maxTokens: 1500,
    topP: 0.95,
    onError: (err) => logger.error({ err }, "× streamText error"),
  });

  return result;
}