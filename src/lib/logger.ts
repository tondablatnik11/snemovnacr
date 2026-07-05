import pino from "pino";
import { env } from "~/lib/env";

// `pino` vyžaduje vždy definovaný level. env.LOG_LEVEL je optional (emptyStringAsUndefined
// v t3-oss), protože v buildu je fallback na "info" v schema, ale v runtime může
// být undefined kvůli type — použijeme bezpečný fallback.
const logLevel = env.LOG_LEVEL ?? "info";

export const logger = pino({
  level: logLevel,
  base: { app: "snemovna" },
  ...(process.env.NODE_ENV !== "production"
    ? { transport: { target: "pino-pretty", options: { colorize: true } } }
    : {}),
});