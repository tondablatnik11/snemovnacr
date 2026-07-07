// AI chat — streaming s NVIDIA NIM + Vercel AI SDK 6 (LanguageModelV3).
// Pipeline: extract dotaz → RAG retrieval → compose prompt → streamText.
// Sources z RAG jsou vloženy do streamu jako data parts (typ "data-sources"),
// aby je klient mohl zobrazit po dokončení.

import { streamText, type UIMessage, convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { env } from "~/lib/env";
import { retrieve, formatSourcesForPrompt, type RagSource } from "./rag";
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
 *
 * Vrátí Response object s UI Message Stream, který obsahuje:
 *  - textový stream s odpovědí
 *  - data parts "sources" s RAG výsledky (typicky před textem)
 *  - volitelně "intent" s klasifikací dotazu
 */
export async function chatStream({ messages, skipRag }: ChatParams) {
  const question = extractLastUserText(messages);

  let sources: RagSource[] = [];
  if (!skipRag && question) {
    try {
      const rag = await retrieve(question);
      sources = rag.sources;
    } catch (err) {
      logger.warn({ err: String(err) }, "RAG retrieve selhal");
    }
  }

  const contextText = sources.length > 0 ? formatSourcesForPrompt(sources) : "(žádný kontext)";
  const systemMessage = SYSTEM_PROMPT
    .replace("{context}", contextText)
    .replace("{question}", question);

  const nvidia = createOpenAICompatible({
    name: "nvidia",
    baseURL: env.NVIDIA_BASE_URL,
    apiKey: env.NVIDIA_API_KEY ?? "no-key",
  });

  // Vytvoříme UI message stream s vloženými RAG sources
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      // Pošleme sources jako data part PŘED textem, aby klient mohl
      // zobrazit "Zdroje" hned při zahájení streamu
      if (sources.length > 0) {
        writer.write({
          type: "data-sources",
          data: sources.map((s, i) => ({
            index: i + 1,
            kind: s.kind,
            id: s.id,
            title: s.title,
            snippet: s.snippet.slice(0, 200),
            score: s.score,
            url: buildSourceUrl(s),
          })),
        });
      }

      // Stream text z NVIDIA NIM
      const result = streamText({
        model: nvidia.chatModel(env.NVIDIA_CHAT_MODEL),
        system: systemMessage,
        messages: await convertToModelMessages(messages),
        temperature: 0.2,
        maxOutputTokens: 1500,
        topP: 0.95,
        onError: (err) => logger.error({ err }, "streamText error"),
      });

      writer.merge(result.toUIMessageStream({ sendStart: false }));
    },
  });

  return createUIMessageStreamResponse({ stream });
}

/**
 * Sestaví URL pro daný RAG source (pro zobrazení "Otevřít detail" odkazu).
 */
function buildSourceUrl(source: RagSource): string {
  switch (source.kind) {
    case "HLASOVANI":
      return `/hlasovani/${source.id}`;
    case "TISK":
      return `/navrhy/${source.id}`;
    case "REC":
    case "INTERPELACE":
      return `/analyzy#${source.kind.toLowerCase()}-${source.id}`;
    default:
      return "#";
  }
}