import type { Config } from "drizzle-kit";
import { env } from "~/lib/env";

export default {
  schema: "./src/server/db/schema/*",
  out: "./src/server/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
} satisfies Config;