// Vercel Cron: denní ETL — hlasování (všechna období)
// Spouští se v 03:00 UTC

import { NextResponse } from "next/server";
import { getQueue, QUEUE_NAMES, type EtlJobData } from "~/server/queue/client";
import { env } from "~/lib/env";

function authorized(req: Request): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${env.CRON_SECRET}`;
}

async function handle(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const queue = getQueue(QUEUE_NAMES.ETL);
  // Paralelně pro všechna aktuální období (1..10)
  for (const term of [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]) {
    const job: EtlJobData = { kind: "hlasovani", term };
    await queue.add(`etl-hlasovani-${term}`, job, {
      removeOnComplete: 100,
      attempts: 2,
      backoff: { type: "exponential", delay: 120_000 },
    });
  }

  return NextResponse.json({ ok: true, queued: 10 });
}

export const GET = handle;
export const POST = handle;