// Health check endpoint — pro monitoring (UptimeRobot, BetterStack, Vercel, atd.)
// Ověřuje dostupnost DB a Redis. Vrací JSON se stavem komponent.

import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "~/server/db";
import { ioredisPing } from "~/server/queue/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CheckResult {
  ok: boolean;
  latency_ms?: number;
  error?: string;
}

export async function GET() {
  const checks: Record<string, CheckResult> = {};

  // DB check
  const dbStart = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    checks.database = { ok: true, latency_ms: Date.now() - dbStart };
  } catch (err) {
    checks.database = { ok: false, error: String(err) };
  }

  // Redis check
  const redisStart = Date.now();
  try {
    await ioredisPing();
    checks.redis = { ok: true, latency_ms: Date.now() - redisStart };
  } catch (err) {
    checks.redis = { ok: false, error: String(err) };
  }

  const allOk = Object.values(checks).every((c) => c.ok);
  return NextResponse.json(
    {
      status: allOk ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allOk ? 200 : 503 }
  );
}