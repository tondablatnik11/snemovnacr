// Request tracing + response time middleware helper pro Next.js API routes.

import { NextResponse } from "next/server";

/**
 * Wrappí Next.js route handler a přidává:
 *  - X-Request-Id header (UUID)
 *  - X-Response-Time hlavičku (v ms)
 *  - logging přes console (v produkci přes pino)
 *
 * Použití:
 *   export const GET = withTracing(async (req) => { ... })
 */
export function withTracing<T = unknown>(
  handler: (req: Request, ctx: T) => Promise<Response> | Response
): (req: Request, ctx: T) => Promise<Response> {
  return async (req: Request, ctx: T) => {
    const start = Date.now();
    const requestId = crypto.randomUUID();

    // Přidáme request id do Response
    const response = await handler(req, ctx);
    const ms = Date.now() - start;

    // Pokud handler vrátil Response, enrichíme ho
    if (response instanceof Response) {
      response.headers.set("X-Request-Id", requestId);
      response.headers.set("X-Response-Time", `${ms}ms`);
      return response;
    }

    // Pokud handler vrátil NextResponse
    const nextRes = NextResponse.next();
    nextRes.headers.set("X-Request-Id", requestId);
    nextRes.headers.set("X-Response-Time", `${ms}ms`);
    return nextRes;
  };
}

/**
 * In-memory cache pro API endpointy, které jsou nákladné ale read-only.
 * Cache invaliduje po `ttlMs` nebo při explicitním `invalidate()`.
 */
const cacheStore = new Map<string, { value: unknown; expiresAt: number }>();

export function cache<T>(
  key: string,
  factory: () => Promise<T>,
  ttlMs = 60_000
): Promise<T> {
  const existing = cacheStore.get(key);
  if (existing && existing.expiresAt > Date.now()) {
    return Promise.resolve(existing.value as T);
  }
  return factory().then((value) => {
    cacheStore.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
  });
}

export function invalidateCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    cacheStore.clear();
    return;
  }
  for (const key of cacheStore.keys()) {
    if (key.startsWith(keyPrefix)) cacheStore.delete(key);
  }
}