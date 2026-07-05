// Orchestrace ETL jobů — worker entry point
// Spouští se v `pnpm worker` nebo v docker-compose worker service

import { logger } from "~/lib/logger";
import { env } from "~/lib/env";
import { Worker } from "bullmq";
import {
  QUEUE_NAMES,
  type EtlJobData,
} from "~/server/queue/client";
import { downloadHlasovani, downloadPoslanci, downloadInterpelace, downloadSteno, downloadTisky } from "./psp-client";
import { loadPoslanci } from "./loader-poslanci";
import { loadHlasovani } from "./loader-hlasovani";
import { loadTisky } from "./loader-tisky";
import { loadInterpelace } from "./loader-interpelace";
import { loadSteno } from "./loader-steno";

export async function runEtlJob(data: EtlJobData) {
  const start = Date.now();
  logger.info({ data }, "→ ETL job start");

  try {
    if (data.kind === "all" || data.kind === "poslanci") {
      const snap = await downloadPoslanci();
      await loadPoslanci(snap);
    }

    if (data.kind === "all" || data.kind === "hlasovani") {
      const term = data.kind === "hlasovani" ? data.term : 10;
      const snap = await downloadHlasovani(term);
      await loadHlasovani(snap);
    }

    if (data.kind === "all" || data.kind === "tisky") {
      const snap = await downloadTisky();
      await loadTisky(snap);
    }

    if (data.kind === "all" || data.kind === "interpelace") {
      const snap = await downloadInterpelace();
      await loadInterpelace(snap);
    }

    if (data.kind === "all" || data.kind === "steno") {
      const term = data.kind === "steno" ? data.term : 10;
      const snap = await downloadSteno();
      await loadSteno(snap);
    }

    logger.info({ ms: Date.now() - start }, "✓ ETL job dokončen");
    return { ok: true };
  } catch (err) {
    logger.error({ err }, "× ETL job selhal");
    throw err;
  }
}

export function startEtlWorker() {
  const worker = new Worker<EtlJobData>(
    QUEUE_NAMES.ETL,
    async (job) => runEtlJob(job.data),
    {
      connection: { url: env.REDIS_URL, maxRetriesPerRequest: null },
      concurrency: 1,
    }
  );

  worker.on("completed", (job) => logger.info({ id: job.id }, "✓ Worker: completed"));
  worker.on("failed", (job, err) => logger.error({ id: job?.id, err }, "× Worker: failed"));
  worker.on("error", (err) => logger.error({ err }, "× Worker error"));

  logger.info("→ ETL worker started");
  return worker;
}