// AI chat — streaming s Vercel AI SDK 5 + NVIDIA NIM

import { streamText, type UIMessage, convertToModelMessages } from "ai";
import { chatModel } from "./nvidia";
import { retrieve, formatSourcesForPrompt } from "./rag";
import { SYSTEM_PROMPT } from "./prompts";
import { logger } from "~/lib/logger";

export interface ChatParams {
  messages: UIMessage[];
  skipRag?: boolean;
}

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
      logger.warn({ err: String(err) }, "RAG retrieve selhal, pokračuji bez kontextu");
    }
  }

  const systemMessage = SYSTEM_PROMPT
    .replace("{context}", sources || "(žádný kontext)")
    .replace("{question}", question);

  const result = streamText({
    model: chatModel,
    system: systemMessage,
    messages: convertToModelMessages(messages),
    temperature: 0.2,
    maxOutputTokens: 1500,
    topP: 0.95,
    onError: (err) => logger.error({ err }, "streamText error"),
  });

  return result;
}