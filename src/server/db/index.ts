import "server-only";
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
    onnotice: (n) => logger.debug({ notice: n }, "pg notice"),
  });

if (!isProd) globalThis.__pgClient = client;

export const db = drizzle(client, { schema, logger: !isProd });
export type DB = typeof db;
export { schema };
export * as tables from "./schema";