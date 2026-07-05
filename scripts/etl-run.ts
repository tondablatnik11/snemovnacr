// Manuální spuštění ETL — pro testy a bootstrapping
// pnpm etl:run [--dataset=poslanci|hlasovani|tisky|interpelace|steno|all] [--term=10]

import "dotenv/config";
import { runEtlJob } from "~/server/services/etl/jobs";
import { logger } from "~/lib/logger";

async function main() {
  const args = process.argv.slice(2);
  const datasetArg = args.find((a) => a.startsWith("--dataset="))?.split("=")[1] ?? "all";
  const term = parseInt(args.find((a) => a.startsWith("--term="))?.split("=")[1] ?? "10", 10);

  const valid = ["all", "poslanci", "hlasovani", "tisky", "interpelace", "steno"];
  if (!valid.includes(datasetArg)) {
    console.error(`× Neplatný dataset: ${datasetArg}. Povolené: ${valid.join(", ")}`);
    process.exit(1);
  }

  const data = datasetArg === "all" ? { kind: "all" as const } : { kind: datasetArg, term } as never;
  logger.info({ datasetArg, term }, "→ Manuální ETL");

  await runEtlJob(data as never);
  process.exit(0);
}

main().catch((err) => {
  logger.error({ err }, "× ETL selhal");
  process.exit(1);
});