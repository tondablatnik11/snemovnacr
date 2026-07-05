// Vercel Cron: denní ETL — poslanci (lehký, často se mění přes složení slibu)
// Spouští se v 02:00 UTC

import { NextResponse } from "next/server";
import { getQueue, QUEUE_NAMES, type EtlJobData } from "~/server/queue/client";
import { env } from "~/lib/env";

function authorized(req: Request): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${env.CRON_SECRET}`;
}

async function handle(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const job: EtlJobData = { kind: "poslanci" };
  const queue = getQueue(QUEUE_NAMES.ETL);
  await queue.add("etl-poslanci", job, {
    repeat: { pattern: undefined }, // one-shot
    removeOnComplete: 100,
    attempts: 3,
    backoff: { type: "exponential", delay: 60_000 },
  });

  return NextResponse.json({ ok: true, job });
}

export const GET = handle;
export const POST = handle;