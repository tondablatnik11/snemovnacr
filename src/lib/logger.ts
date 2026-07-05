import pino from "pino";
import { env } from "~/lib/env";

export const logger = pino({
  level: env.LOG_LEVEL,
  base: { app: "snemovna" },
  ...(process.env.NODE_ENV !== "production"
    ? { transport: { target: "pino-pretty", options: { colorize: true } } }
    : {}),
});