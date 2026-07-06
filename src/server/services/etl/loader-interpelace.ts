// Loader: ústní interpelace
// ui.unl: id|id_obdobi|id_poslanec|id_minister|tema|datum|stav|id_vysledek|text|odpoved

import { db } from "~/server/db";
import { interpelace } from "~/server/db/schema/psp";
import {
  sql,
  nullIfEmpty,
  nullIfInt,
  parseDate,
  batchInsert,
} from "~/lib/parse";
import { logger } from "~/lib/logger";
import type { DownloadedZip } from "./psp-client";

const BATCH = 1_000;

export async function loadInterpelace(snapshot: DownloadedZip) {
  const files = snapshot.files as Record<string, string[][]>;
  const rows = files["ui.unl"] ?? [];
  if (rows.length === 0) {
    logger.warn("× UI.unl nenalezen — interpelace přeskočeny.");
    return;
  }

  await batchInsert(rows, BATCH, async (slice) => {
    await db
      .insert(interpelace)
      .values(
        slice.map((r) => ({
          id: parseInt(r[0] ?? "0", 10),
          idObdobi: parseInt(r[1] ?? "0", 10),
          idOsoba: parseInt(r[2] ?? "0", 10),
          idMinister: nullIfInt(r[3]),
          tema: (r[4] ?? "").trim() || "(bez tématu)",
          datum: parseDate(r[5]),
          stav: nullIfEmpty(r[6]),
          odpoved: nullIfEmpty(r[8]),
          text: nullIfEmpty(r[7]),
        }))
      )
      .onConflictDoUpdate({
        target: interpelace.id,
        set: {
          stav: sql`excluded.stav`,
          odpoved: sql`excluded.odpoved`,
        },
      });
  });
  logger.info({ count: rows.length }, "✓ Interpelace");
}