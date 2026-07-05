// Sdílený DB init. Importuje se jak z Next.js RSC, tak z ETL/worker skriptů.
// "server-only" je Next.js marker, který v CLI skriptech (`tsx scripts/*.ts`)
// vyhazuje chybu — proto ho načítáme podmíněně: pouze v Next.js runtime.

const isCliRun =
  typeof process !== "undefined" &&
  process.argv[1] !== undefined &&
  /\.tsx?$/.test(process.argv[1]) &&
  !process.argv[1].includes(".next");

if (!isCliRun) {
  await import("server-only");
}

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "~/lib/env";
import { logger } from "~/lib/logger";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __pgClient: ReturnType<typeof postgres> | undefined;
}

const isProd = process.env.NODE_ENV === "production";

const client =
  globalThis.__pgClient ??
  postgres(env.DATABASE_URL, {
    max: isProd ? 10 : 4,
    idle_timeout: 20,
    connect_timeout: 10,
    // PgBouncer transaction mode (Supabase pooler port 6543) nepodporuje
    // prepared statements, které postgres-js posílá defaultně. Bez tohoto
    // flagu dostáváme ECONNREFUSED nebo "prepared statement does not exist".
    no_prepare: true,
    onnotice: (n) => logger.debug({ notice: n }, "pg notice"),
  });

if (!isProd) globalThis.__pgClient = client;

export const db = drizzle(client, { schema, logger: !isProd });
export type DB = typeof db;
export { schema };
export * as tables from "./schema";