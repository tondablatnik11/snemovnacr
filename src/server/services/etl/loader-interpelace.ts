// Loader: ústní interpelace

import { db } from "~/server/db";
import { interpelace } from "~/server/db/schema/psp";
import { logger } from "~/lib/logger";
import type { DownloadedZip } from "./psp-client";

export async function loadInterpelace(snapshot: DownloadedZip) {
  const files = snapshot.files;
  // ui.unl: id|id_obdobi|id_poslanec|id_minister|tema|datum|stav|id_vysledek|text|odpoved
  const rows = files["ui.unl"] ?? [];
  if (rows.length === 0) {
    logger.warn("× UI.unl nenalezen — interpelace přeskočeny.");
    return;
  }

  const BATCH = 1_000;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
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
          stav: emptyToNull(r[6]),
          odpoved: emptyToNull(r[8]),
          text: emptyToNull(r[7]),
        }))
      )
      .onConflictDoUpdate({
        target: interpelace.id,
        set: {
          stav: sql`excluded.stav`,
          odpoved: sql`excluded.odpoved`,
        },
      });
  }
  logger.info({ count: rows.length }, "✓ Interpelace");
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