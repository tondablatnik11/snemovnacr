import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { env } from "~/lib/env";

const client = postgres(env.DATABASE_URL, { max: 1 });
const db = drizzle(client);

async function main() {
  console.log("→ Spouštím migrace…");
  await migrate(db, { migrationsFolder: "./src/server/db/migrations" });
  console.log("✓ Migrace hotové.");
  await client.end();
}

main().catch((err) => {
  console.error("× Migrace selhaly:", err);
  process.exit(1);
});