// Sdílené wrappery pro embeddings — batching + retry
// Free NIM rate-limit: 5 RPM / 5k TPM → batch po 5 a pauza 12s

import { nvidiaEmbed } from "./nvidia";
import { logger } from "~/lib/logger";

const BATCH_SIZE = 5;
const RATE_LIMIT_PAUSE_MS = 13_000; // > 12s = 5 RPM

export interface EmbedProgress {
  total: number;
  done: number;
}

export async function generateEmbeddings(
  texts: string[],
  onProgress?: (p: EmbedProgress) => void
): Promise<number[][]> {
  const out: number[][] = new Array(texts.length);
  let done = 0;

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const slice = texts.slice(i, i + BATCH_SIZE);
    const validSlice = slice.filter((t) => t && t.trim().length > 0);
    if (validSlice.length === 0) {
      for (let j = 0; j < slice.length; j++) out[i + j] = [];
      continue;
    }

    try {
      const vectors = await nvidiaEmbed(validSlice);
      let k = 0;
      for (let j = 0; j < slice.length; j++) {
        out[i + j] = slice[j] && slice[j]!.trim().length > 0 ? vectors[k++]! : [];
      }
      done += slice.length;
      onProgress?.({ total: texts.length, done });

      if (i + BATCH_SIZE < texts.length) {
        await new Promise((r) => setTimeout(r, RATE_LIMIT_PAUSE_MS));
      }
    } catch (err) {
      logger.warn({ err: String(err), batch: i }, "× Embed batch selhal, retry za 30s");
      await new Promise((r) => setTimeout(r, 30_000));
      try {
        const vectors = await nvidiaEmbed(validSlice);
        let k = 0;
        for (let j = 0; j < slice.length; j++) {
          out[i + j] = slice[j] && slice[j]!.trim().length > 0 ? vectors[k++]! : [];
        }
        done += slice.length;
        onProgress?.({ total: texts.length, done });
      } catch (err2) {
        logger.error({ err: err2 }, "× Embed retry selhal");
        for (let j = 0; j < slice.length; j++) out[i + j] = [];
      }
    }
  }

  return out;
}