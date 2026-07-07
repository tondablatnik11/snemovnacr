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

/**
 * Vytvoří child logger s kontextovými fields (requestId, userId, atd.).
 * Child logger dědí konfiguraci z rodiče a přidává vlastní metadata.
 *
 * Použití v API route:
 *   const log = withRequest(req);
 *   log.info({ endpoint: "/api/chat" }, "Request received");
 */
export function withContext(context: Record<string, unknown>) {
  return logger.child(context);
}

/**
 * Extrahuje request ID z headeru nebo generuje nový.
 * Vrací i sadu hlaviček, které by měla odpověď obsahovat pro tracing.
 */
export function getRequestContext(req: Request): {
  requestId: string;
  headers: Record<string, string>;
} {
  const existing = req.headers.get("x-request-id");
  const requestId = existing ?? crypto.randomUUID();
  return {
    requestId,
    headers: {
      "X-Request-Id": requestId,
    },
  };
}