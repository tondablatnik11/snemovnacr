// Loader: sněmovní tisky + historie procedury + předkladatelé
// https://www.psp.cz/sqw/hp.sqw?k=1303

import { db } from "~/server/db";
import { tisk, tiskHist, predkladatel } from "~/server/db/schema/psp";
import { logger } from "~/lib/logger";
import type { DownloadedZip } from "./psp-client";

const BATCH = 2_000;

export async function loadTisky(snapshot: DownloadedZip) {
  const files = snapshot.files;
  logger.info("→ Load tisky: start");

  // tisky.unl: id_tisk|cislo|cislo_za|id_obdobi|id_druh|druh|...|nazev|datum_doruceni|rozeslano|...
  const tiskRows = files["tisky.unl"] ?? [];
  if (tiskRows.length > 0) {
    for (let i = 0; i < tiskRows.length; i += BATCH) {
      const slice = tiskRows.slice(i, i + BATCH);
      await db
        .insert(tisk)
        .values(
          slice.map((r) => ({
            id: parseInt(r[0] ?? "0", 10),
            cislo: parseInt(r[1] ?? "0", 10),
            cisloZa: parseInt(r[2] ?? "0", 10),
            idObdobi: parseInt(r[3] ?? "0", 10),
            idDruh: nullIfInt(r[4]),
            druh: inferDruh(r[5]),
            idTypZakon: nullIfInt(r[6]),
            idTypStavu: nullIfInt(r[7]),
            nazev: (r[8] ?? "").trim() || "(bez názvu)",
            datumDoruceni: parseDate(r[9]),
            rozeslano: parseDate(r[10]),
            vazby: emptyToNull(r[11]),
          }))
        )
        .onConflictDoUpdate({
          target: tisk.id,
          set: {
            nazev: sql`excluded.nazev`,
            vazby: sql`excluded.vazby`,
          },
        });
    }
    logger.info({ count: tiskRows.length }, "✓ Tisky");
  }

  // hist.unl: id_hist|id_tisk|datum|id_akce|id_stav|pozn
  const histRows = files["hist.unl"] ?? [];
  if (histRows.length > 0) {
    for (let i = 0; i < histRows.length; i += BATCH) {
      const slice = histRows.slice(i, i + BATCH);
      await db
        .insert(tiskHist)
        .values(
          slice.map((r) => ({
            id: parseInt(r[0] ?? "0", 10),
            idTisk: parseInt(r[1] ?? "0", 10),
            datum: parseDateTime(r[2]),
            idAkce: nullIfInt(r[3]),
            idStav: nullIfInt(r[4]),
            pozn: emptyToNull(r[5]),
          }))
        )
        .onConflictDoNothing();
    }
    logger.info({ count: histRows.length }, "✓ Tisk hist");
  }

  // predkladatel.unl: id|id_tisk|id_osoba|id_organ|typ
  const predklRows = files["predkladatel.unl"] ?? [];
  if (predklRows.length > 0) {
    for (let i = 0; i < predklRows.length; i += BATCH) {
      const slice = predklRows.slice(i, i + BATCH);
      await db
        .insert(predkladatel)
        .values(
          slice.map((r) => ({
            id: parseInt(r[0] ?? "0", 10),
            idTisk: parseInt(r[1] ?? "0", 10),
            idOsoba: nullIfInt(r[2]),
            idOrgan: nullIfInt(r[3]),
            typ: emptyToNull(r[4]),
          }))
        )
        .onConflictDoNothing();
    }
    logger.info({ count: predklRows.length }, "✓ Předkladatelé");
  }

  logger.info("✓ Load tisky: hotovo");
}

import { sql } from "drizzle-orm";

function emptyToNull(v: string | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  const s = v.trim();
  return s === "" || s === "_null_" ? null : s;
}

function nullIfInt(v: string | null | undefined): number | null {
  const s = emptyToNull(v);
  if (s === null) return null;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? null : n;
}

function parseDate(v: string | null | undefined): string | null {
  const s = emptyToNull(v);
  if (!s) return null;
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(s);
  if (m && m[1] && m[2] && m[3]) {
    return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return s;
}

function parseDateTime(v: string | null | undefined): Date | null {
  const s = emptyToNull(v);
  if (!s) return null;
  const dt = new Date(s.replace(" ", "T") + (s.length === 16 ? ":00" : ""));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function inferDruh(v: string | null | undefined) {
  const map: Record<string, "NAVRH_ZAKONA" | "DOPIS" | "ZPRAVA" | "USNESENI" | "ROZPOR" | "INTERPELACE" | "JINY"> = {
    "1": "NAVRH_ZAKONA",
    "2": "DOPIS",
    "3": "ZPRAVA",
    "4": "USNESENI",
    "5": "ROZPOR",
    "6": "INTERPELACE",
  };
  return (map[v ?? ""] ?? "JINY") as "NAVRH_ZAKONA" | "DOPIS" | "ZPRAVA" | "USNESENI" | "ROZPOR" | "INTERPELACE" | "JINY";
}