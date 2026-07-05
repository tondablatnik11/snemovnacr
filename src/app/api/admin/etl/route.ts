// Admin API: spustí ETL job z Vercelu (obchází lokální firewall a používá
// Vercel DATABASE_URL, který je ověřeně funkční).
//
// POST /api/admin/etl
// Authorization: Bearer $CRON_SECRET
// Body: { "dataset": "poslanci|hlasovani|tisky|interpelace|steno|all", "term": 10 }
//
// POZNÁMKA: Tento endpoint běží na Vercel serverless (max 60-300s timeout).
// Pro velké datasety (hlasovani, steno) je lepší worker (Railway/Fly.io),
// ale pro bootstrapping databáze to stačí.

import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minut pro velké datasety

function authorized(req: Request): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

const schema = z.object({
  dataset: z.enum(["all", "poslanci", "hlasovani", "tisky", "interpelace", "steno"]),
  term: z.number().int().min(1).max(10).default(10),
});

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Lazy import — stáhne ETL moduly jen když je potřeba (zmenší edge bundle)
  const { runEtlJob } = await import("~/server/services/etl/jobs");
  const { logger } = await import("~/lib/logger");

  const data =
    parsed.data.dataset === "all"
      ? { kind: "all" as const }
      : ({ kind: parsed.data.dataset, term: parsed.data.term } as never);

  logger.info({ data }, "→ ETL přes Vercel admin endpoint");
  const startTime = Date.now();

  try {
    await runEtlJob(data as never);
    const ms = Date.now() - startTime;
    return NextResponse.json({
      ok: true,
      dataset: parsed.data.dataset,
      term: parsed.data.term,
      duration_ms: ms,
    });
  } catch (err) {
    const ms = Date.now() - startTime;
    logger.error({ err: String(err), duration_ms: ms }, "× ETL selhal");
    return NextResponse.json(
      {
        ok: false,
        error: String(err),
        duration_ms: ms,
      },
      { status: 500 }
    );
  }
}