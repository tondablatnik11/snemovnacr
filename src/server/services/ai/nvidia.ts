// NVIDIA NIM provider — OpenAI-compatible chat/embeddings
// Endpoint: https://integrate.api.nvidia.com/v1
// Modely:
//   - meta/llama-3.3-70b-instruct  (hlavní chat)
//   - meta/llama-3.1-8b-instruct    (router)
//   - nvidia/nv-embed-v2            (embeddings 4096 dim)
//   - snowflake/arctic-embed-l      (rychlé embeddings 1024 dim)

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { env } from "~/lib/env";
import { logger } from "~/lib/logger";

// OpenAI-compatible provider nad NVIDIA NIM
export const nvidia = createOpenAICompatible({
  name: "nvidia",
  baseURL: env.NVIDIA_BASE_URL,
  apiKey: env.NVIDIA_API_KEY ?? "no-key",
  headers: {
    "Accept": "application/json",
  },
});

// Předkonfigurované model handlery
export const chatModel = nvidia.chatModel(env.NVIDIA_CHAT_MODEL);
export const routerModel = nvidia.chatModel(env.NVIDIA_ROUTER_MODEL);

// Embeddings — voláme přímo přes fetch, protože Vercel AI SDK nemá standardní
// openai-compatible embeddings provider (je to trochu jiné schéma).

const EMBED_URL = `${env.NVIDIA_BASE_URL}/embeddings`;

export interface EmbeddingResponse {
  data: { embedding: number[]; index: number }[];
  model: string;
  usage: { prompt_tokens: number; total_tokens: number };
}

/**
 * Generuje embeddingy pro pole textů. NV-Embed-v2 vrací 4096 dimenzí.
 */
export async function nvidiaEmbed(texts: string[]): Promise<number[][]> {
  if (!env.NVIDIA_API_KEY) {
    throw new Error("NVIDIA_API_KEY není nastavený — doplňte ho v .env.local");
  }

  const res = await fetch(EMBED_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.NVIDIA_API_KEY}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      model: env.NVIDIA_EMBED_MODEL,
      input: texts,
      encoding_format: "float",
      input_type: "passage", // 'passage' | 'query'
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    logger.error({ status: res.status, body: text.slice(0, 500) }, "× NVIDIA embeddings failed");
    throw new Error(`NVIDIA embeddings ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as EmbeddingResponse;
  return json.data.map((d) => d.embedding);
}

export async function nvidiaEmbedQuery(text: string): Promise<number[]> {
  if (!env.NVIDIA_API_KEY) {
    throw new Error("NVIDIA_API_KEY není nastavený");
  }
  const res = await fetch(EMBED_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.NVIDIA_API_KEY}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      model: env.NVIDIA_EMBED_MODEL,
      input: [text],
      encoding_format: "float",
      input_type: "query",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NVIDIA embed query ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as EmbeddingResponse;
  return json.data[0]?.embedding ?? [];
}