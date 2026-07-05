// Vercel Cron: embed nové řádky (hlasování, tisky, projevy)
// Spouští se v 04:00 UTC

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { getQueue, QUEUE_NAMES, type EmbedJobData } from "~/server/queue/client";
import { db } from "~/server/db";
import { hlasovani, tisk, rec } from "~/server/db/schema/psp";
import { isNull } from "drizzle-orm";
import { env } from "~/lib/env";

function authorized(req: Request): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${env.CRON_SECRET}`;
}

async function handle(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const queue = getQueue(QUEUE_NAMES.EMBED);

  // Hlasování bez embeddingu — max 500 na cyklus (rate-limit NIM)
  const hlasBezEmbed = await db
    .select({ id: hlasovani.id, text: hlasovani.nazev })
    .from(hlasovani)
    .where(isNull(hlasovani.embedding))
    .limit(500);

  const tiskBezEmbed = await db
    .select({ id: tisk.id, text: tisk.nazev })
    .from(tisk)
    .where(isNull(tisk.embedding))
    .limit(500);

  const recBezEmbed = await db
    .select({ id: rec.id, text: rec.recText })
    .from(rec)
    .where(isNull(rec.embedding))
    .limit(500);

  for (const h of hlasBezEmbed) {
    const job: EmbedJobData = { kind: "hlasovani", id: h.id, text: h.text };
    await queue.add("embed-h", job, { removeOnComplete: 1000, attempts: 5 });
  }
  for (const t of tiskBezEmbed) {
    const job: EmbedJobData = { kind: "tisk", id: t.id, text: t.text };
    await queue.add("embed-t", job, { removeOnComplete: 1000, attempts: 5 });
  }
  for (const r of recBezEmbed) {
    if (!r.text) continue;
    const job: EmbedJobData = { kind: "rec", id: r.id, text: r.text };
    await queue.add("embed-r", job, { removeOnComplete: 1000, attempts: 5 });
  }

  return NextResponse.json({
    ok: true,
    queued: {
      hlasovani: hlasBezEmbed.length,
      tisky: tiskBezEmbed.length,
      rec: recBezEmbed.length,
    },
  });
}

export const GET = handle;
export const POST = handle;