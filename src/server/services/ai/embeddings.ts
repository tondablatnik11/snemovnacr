// Sdílené wrappery pro embeddings — batching + retry s exponenciálním backoffem.
// Free NIM rate-limit: 5 RPM / 5k TPM → batch po 5 a pauza 12s.

import { nvidiaEmbed } from "./nvidia";
import { logger } from "~/lib/logger";

const BATCH_SIZE = 5;
const RATE_LIMIT_PAUSE_MS = 13_000; // > 12s = 5 RPM
const RETRY_PAUSE_MS = 30_000;
const MAX_RETRIES = 3;

export interface EmbedProgress {
  total: number;
  done: number;
  failed: number;
}

/**
 * Generuje embeddingy pro pole textů s rate-limitingem a retry logikou.
 * Prázdné texty přeskočí (vrací prázdné pole).
 * Při chybě jednoho batch-e zkusí 3x s backoffem.
 */
export async function generateEmbeddings(
  texts: string[],
  onProgress?: (p: EmbedProgress) => void
): Promise<number[][]> {
  const out: number[][] = new Array(texts.length);
  let done = 0;
  let failed = 0;

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const slice = texts.slice(i, i + BATCH_SIZE);
    const indices = slice
      .map((t, j) => ({ t, idx: i + j }))
      .filter(({ t }) => t && t.trim().length > 0);

    if (indices.length === 0) {
      for (let j = 0; j < slice.length; j++) out[i + j] = [];
      continue;
    }

    let success = false;
    for (let attempt = 1; attempt <= MAX_RETRIES && !success; attempt++) {
      try {
        const vectors = await nvidiaEmbed(indices.map(({ t }) => t));
        let k = 0;
        for (let j = 0; j < slice.length; j++) {
          out[i + j] = slice[j] && slice[j]!.trim().length > 0 ? vectors[k++]! : [];
        }
        done += slice.length;
        success = true;
        onProgress?.({ total: texts.length, done, failed });
      } catch (err) {
        const isLast = attempt === MAX_RETRIES;
        logger.warn(
          { err: String(err), batch: i, attempt, willRetry: !isLast },
          "× Embed batch selhal"
        );
        if (isLast) {
          for (let j = 0; j < slice.length; j++) out[i + j] = [];
          failed += slice.length;
          onProgress?.({ total: texts.length, done, failed });
        } else {
          await new Promise((r) => setTimeout(r, RETRY_PAUSE_MS));
        }
      }
    }

    // Throttling mezi batch-i (pokud nejsme na konci)
    if (i + BATCH_SIZE < texts.length) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_PAUSE_MS));
    }
  }

  if (failed > 0) {
    logger.warn({ done, failed, total: texts.length }, "Embedding dokončen s chybami");
  }
  return out;
}