// Loader: stenoprotokoly (metadata + projevy)
// UNL steno.zip obsahuje jen metadata, ne plný text.
// Plné texty se stahují přes scraper-steno.

import { db } from "~/server/db";
import { steno, rec } from "~/server/db/schema/psp";
import {
  nullIfEmpty,
  nullIfInt,
  parseDate,
  batchInsert,
} from "~/lib/parse";
import { logger } from "~/lib/logger";
import type { DownloadedZip } from "./psp-client";

const BATCH = 1_000;

export async function loadSteno(snapshot: DownloadedZip) {
  const files = snapshot.files as Record<string, string[][]>;

  // steno.unl: id|id_obdobi|id_schuze|id_bod|datum|cas_od|cas_do
  const stenoRows = files["steno.unl"] ?? [];
  if (stenoRows.length > 0) {
    await batchInsert(stenoRows, BATCH, async (slice) => {
      await db
        .insert(steno)
        .values(
          slice.map((r) => ({
            id: parseInt(r[0] ?? "0", 10),
            idObdobi: parseInt(r[1] ?? "0", 10),
            idSchuze: nullIfInt(r[2]),
            idBod: nullIfInt(r[3]),
            datum: parseDate(r[4]),
            casOd: nullIfEmpty(r[5]),
            casDo: nullIfEmpty(r[6]),
          }))
        )
        .onConflictDoNothing();
    });
    logger.info({ count: stenoRows.length }, "✓ Steno");
  }

  // rec.unl: id_rec|id_steno|id_osoba|druh|...
  const recRows = files["rec.unl"] ?? [];
  if (recRows.length > 0) {
    await batchInsert(recRows, BATCH, async (slice) => {
      await db
        .insert(rec)
        .values(
          slice.map((r) => ({
            id: parseInt(r[0] ?? "0", 10),
            idSteno: parseInt(r[1] ?? "0", 10),
            idOsoba: nullIfInt(r[2]),
            druh: nullIfInt(r[3]),
            recText: null, // doplní scraper
          }))
        )
        .onConflictDoNothing();
    });
    logger.info({ count: recRows.length }, "✓ Rec (metadata)");
  }
}