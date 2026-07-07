// Health check endpoint — pro monitoring (UptimeRobot, BetterStack, Vercel, atd.)
// Ověřuje dostupnost DB a Redis. Vrací JSON se stavem komponent.

import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "~/server/db";
import { ioredisPing } from "~/server/queue/client";
import { getRequestContext, withContext } from "~/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CheckResult {
  ok: boolean;
  latency_ms?: number;
  error?: string;
}

export async function GET(req: Request) {
  const { requestId, headers } = getRequestContext(req);
  const log = withContext({ requestId, endpoint: "/api/health" });
  log.info("Health check requested");

  const checks: Record<string, CheckResult> = {};

  // DB check
  const dbStart = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    checks.database = { ok: true, latency_ms: Date.now() - dbStart };
  } catch (err) {
    checks.database = { ok: false, error: String(err) };
    log.error({ err: String(err) }, "Database health check failed");
  }

  // Redis check
  const redisStart = Date.now();
  try {
    await ioredisPing();
    checks.redis = { ok: true, latency_ms: Date.now() - redisStart };
  } catch (err) {
    checks.redis = { ok: false, error: String(err) };
    log.error({ err: String(err) }, "Redis health check failed");
  }

  const allOk = Object.values(checks).every((c) => c.ok);
  const status = allOk ? 200 : 503;

  log.info(
    {
      status: allOk ? "ok" : "degraded",
      dbLatencyMs: checks.database?.latency_ms,
      redisLatencyMs: checks.redis?.latency_ms,
    },
    "Health check completed"
  );

  return NextResponse.json(
    {
      status: allOk ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      requestId,
      checks,
    },
    { status, headers }
  );
}