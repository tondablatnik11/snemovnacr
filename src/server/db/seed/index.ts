import "dotenv/config";
import { seedCoalition } from "./coalition";
import { logger } from "~/lib/logger";

async function main() {
  console.log("=== Seed ===");
  await seedCoalition();
  console.log("✓ Seed hotový.");
  process.exit(0);
}

main().catch((err) => {
  logger.error({ err }, "Seed selhal");
  process.exit(1);
});