// Loader: stenoprotokoly (metadata + projevy)
// UNL steno.zip obsahuje jen metadata, ne plný text.
// Plné texty se stahují přes scraper-steno.

import { db } from "~/server/db";
import { steno, rec } from "~/server/db/schema/psp";
import { logger } from "~/lib/logger";
import type { DownloadedZip } from "./psp-client";

const BATCH = 1_000;

export async function loadSteno(snapshot: DownloadedZip) {
  const files = snapshot.files;
  // steno.unl: id|id_obdobi|id_schuze|id_bod|datum|cas_od|cas_do
  const stenoRows = files["steno.unl"] ?? [];
  if (stenoRows.length > 0) {
    for (let i = 0; i < stenoRows.length; i += BATCH) {
      const slice = stenoRows.slice(i, i + BATCH);
      await db
        .insert(steno)
        .values(
          slice.map((r) => ({
            id: parseInt(r[0] ?? "0", 10),
            idObdobi: parseInt(r[1] ?? "0", 10),
            idSchuze: nullIfInt(r[2]),
            idBod: nullIfInt(r[3]),
            datum: parseDate(r[4]),
            casOd: emptyToNull(r[5]),
            casDo: emptyToNull(r[6]),
          }))
        )
        .onConflictDoNothing();
    }
    logger.info({ count: stenoRows.length }, "✓ Steno");
  }

  // rec.unl: id_rec|id_steno|id_osoba|druh|...
  const recRows = files["rec.unl"] ?? [];
  if (recRows.length > 0) {
    for (let i = 0; i < recRows.length; i += BATCH) {
      const slice = recRows.slice(i, i + BATCH);
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
    }
    logger.info({ count: recRows.length }, "✓ Rec (metadata)");
  }
}

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