// Loader: sněmovní tisky + historie procedury + předkladatelé
// https://www.psp.cz/sqw/hp.sqw?k=1303

import { db } from "~/server/db";
import { tisk, tiskHist, predkladatel } from "~/server/db/schema/psp";
import {
  sql,
  nullIfEmpty,
  nullIfInt,
  parseDate,
  parseDateTime,
  inferDruhTisku,
  batchInsert,
} from "~/lib/parse";
import { logger } from "~/lib/logger";
import type { DownloadedZip } from "./psp-client";

const BATCH = 2_000;

export async function loadTisky(snapshot: DownloadedZip) {
  const files = snapshot.files as Record<string, string[][]>;
  logger.info("→ Load tisky: start");

  await loadTiskyTable(files);
  await loadTiskHist(files);
  await loadPredkladatele(files);

  logger.info("✓ Load tisky: hotovo");
}

async function loadTiskyTable(files: Record<string, string[][]>) {
  // tisky.unl: id_tisk|cislo|cislo_za|id_obdobi|id_druh|druh|...|nazev|datum_doruceni|rozeslano|...
  const rows = files["tisky.unl"] ?? [];
  if (rows.length === 0) return;

  await batchInsert(rows, BATCH, async (slice) => {
    await db
      .insert(tisk)
      .values(
        slice.map((r) => ({
          id: parseInt(r[0] ?? "0", 10),
          cislo: parseInt(r[1] ?? "0", 10),
          cisloZa: parseInt(r[2] ?? "0", 10),
          idObdobi: parseInt(r[3] ?? "0", 10),
          idDruh: nullIfInt(r[4]),
          druh: inferDruhTisku(r[5]),
          idTypZakon: nullIfInt(r[6]),
          idTypStavu: nullIfInt(r[7]),
          nazev: (r[8] ?? "").trim() || "(bez názvu)",
          datumDoruceni: parseDate(r[9]),
          rozeslano: parseDate(r[10]),
          vazby: nullIfEmpty(r[11]),
        }))
      )
      .onConflictDoUpdate({
        target: tisk.id,
        set: {
          nazev: sql`excluded.nazev`,
          vazby: sql`excluded.vazby`,
        },
      });
  });
  logger.info({ count: rows.length }, "✓ Tisky");
}

async function loadTiskHist(files: Record<string, string[][]>) {
  // hist.unl: id_hist|id_tisk|datum|id_akce|id_stav|pozn
  const rows = files["hist.unl"] ?? [];
  if (rows.length === 0) return;

  await batchInsert(rows, BATCH, async (slice) => {
    await db
      .insert(tiskHist)
      .values(
        slice.map((r) => ({
          id: parseInt(r[0] ?? "0", 10),
          idTisk: parseInt(r[1] ?? "0", 10),
          datum: parseDateTime(r[2]),
          idAkce: nullIfInt(r[3]),
          idStav: nullIfInt(r[4]),
          pozn: nullIfEmpty(r[5]),
        }))
      )
      .onConflictDoNothing();
  });
  logger.info({ count: rows.length }, "✓ Tisk hist");
}

async function loadPredkladatele(files: Record<string, string[][]>) {
  // predkladatel.unl: id|id_tisk|id_osoba|id_organ|typ
  const rows = files["predkladatel.unl"] ?? [];
  if (rows.length === 0) return;

  await batchInsert(rows, BATCH, async (slice) => {
    await db
      .insert(predkladatel)
      .values(
        slice.map((r) => ({
          id: parseInt(r[0] ?? "0", 10),
          idTisk: parseInt(r[1] ?? "0", 10),
          idOsoba: nullIfInt(r[2]),
          idOrgan: nullIfInt(r[3]),
          typ: nullIfEmpty(r[4]),
        }))
      )
      .onConflictDoNothing();
  });
  logger.info({ count: rows.length }, "✓ Předkladatelé");
}