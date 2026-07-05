// Worker entry: pnpm worker
// Spouští BullMQ workery pro ETL a Embed frontu

import "dotenv/config";
import { logger } from "~/lib/logger";
import { startEtlWorker } from "~/server/services/etl/jobs";
import { startEmbedWorker } from "~/server/services/ai/embed-worker";

logger.info("=== Spouštím worker ===");

const etl = startEtlWorker();
const embed = startEmbedWorker();

async function shutdown() {
  logger.info("→ Ukončuji workery…");
  await etl.close();
  await embed.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);