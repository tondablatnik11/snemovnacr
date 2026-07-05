// Embed worker — BullMQ worker pro queue "embed"
// Job typy: EmbedJobData { kind: "hlasovani"|"tisk"|"rec", id, text }

import { Worker } from "bullmq";
import { env } from "~/lib/env";
import { logger } from "~/lib/logger";
import { QUEUE_NAMES, type EmbedJobData } from "~/server/queue/client";
import { db } from "~/server/db";
import { hlasovani, tisk, rec } from "~/server/db/schema/psp";
import { sql, eq } from "drizzle-orm";
import { generateEmbeddings } from "./embeddings";

export function startEmbedWorker() {
  const worker = new Worker<EmbedJobData>(
    QUEUE_NAMES.EMBED,
    async (job) => {
      const { kind, id, text } = job.data;
      if (!text || text.trim().length === 0) {
        logger.debug({ id }, "skip empty text");
        return;
      }

      const vectors = await generateEmbeddings([text]);
      const vec = vectors[0];
      if (!vec || vec.length === 0) {
        logger.warn({ id, kind }, "empty embedding");
        return;
      }

      const vectorStr = `[${vec.join(",")}]`;
      if (kind === "hlasovani") {
        await db.execute(sql`UPDATE hlasovani SET embedding = ${vectorStr}::vector WHERE id = ${id}`);
      } else if (kind === "tisk") {
        await db.execute(sql`UPDATE tisk SET embedding = ${vectorStr}::vector WHERE id = ${id}`);
      } else if (kind === "rec") {
        await db.execute(sql`UPDATE rec SET embedding = ${vectorStr}::vector WHERE id = ${id}`);
      }

      logger.info({ id, kind, dim: vec.length }, "✓ Embedded");
    },
    {
      connection: { url: env.REDIS_URL, maxRetriesPerRequest: null },
      concurrency: 1, // serial kvůli rate-limitu NIM free
    }
  );

  worker.on("completed", (job) => logger.info({ id: job.id }, "✓ Embed: completed"));
  worker.on("failed", (job, err) => logger.error({ id: job?.id, err }, "× Embed: failed"));

  return worker;
}