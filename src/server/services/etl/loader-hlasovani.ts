// Loader: hlasování + hlasování_poslanec + omluvy
// UNL sloupce z https://www.psp.cz/sqw/hp.sqw?k=1302
// Největší tabulka — batch insert s ON CONFLICT DO NOTHING

import { db } from "~/server/db";
import { hlasovani, hlasovaniPoslanec, omluva, schuze, bodSchuze } from "~/server/db/schema/psp";
import { logger } from "~/lib/logger";
import type { DownloadedZip } from "./psp-client";

const BATCH = 5_000;

export async function loadHlasovani(snapshot: DownloadedZip) {
  const files = snapshot.files;
  logger.info("→ Load hlasování: start");

  // ----- Schůze -----
  const schuzeRows = files["schuze.unl"] ?? [];
  if (schuzeRows.length > 0) {
    await db
      .insert(schuze)
      .values(
        schuzeRows.map((r) => ({
          id: parseInt(r[0] ?? "0", 10),
          idObdobi: parseInt(r[1] ?? "0", 10),
          cislo: parseInt(r[2] ?? "0", 10),
          nazev: emptyToNull(r[3]),
          datumOd: parseDate(r[4]),
          datumDo: parseDate(r[5]),
          stav: emptyToNull(r[6]),
        }))
      )
      .onConflictDoUpdate({
        target: schuze.id,
        set: {
          nazev: sql`excluded.nazev`,
          stav: sql`excluded.stav`,
        },
      });
    logger.info({ count: schuzeRows.length }, "✓ Schůze");
  }

  // ----- Body schůze -----
  const bodRows = files["bod_schuze.unl"] ?? files["bodu.unl"] ?? [];
  if (bodRows.length > 0) {
    await db
      .insert(bodSchuze)
      .values(
        bodRows.map((r) => ({
          id: parseInt(r[0] ?? "0", 10),
          idSchuze: parseInt(r[1] ?? "0", 10),
          poradi: parseInt(r[2] ?? "0", 10),
          idTisk: nullIfInt(r[3]),
          nazev: emptyToNull(r[4]),
          typBodu: emptyToNull(r[5]),
          stav: emptyToNull(r[6]),
        }))
      )
      .onConflictDoNothing();
  }

  // ----- Hlasování -----
  // Schéma hl_hlasovani: id_hlasovani|id_obdobi|id_schuze|id_bod|datum|cas|druh_hlasovani|vysledek|pro|proti|zdrzel|prihlaseno|kvorum|nazev|popis|id_tisk
  const hlasRows = files["hl_hlasovani.unl"] ?? [];
  if (hlasRows.length > 0) {
    for (let i = 0; i < hlasRows.length; i += BATCH) {
      const slice = hlasRows.slice(i, i + BATCH);
      await db
        .insert(hlasovani)
        .values(
          slice.map((r) => ({
            id: parseInt(r[0] ?? "0", 10),
            idObdobi: parseInt(r[1] ?? "0", 10),
            idSchuze: nullIfInt(r[2]),
            idBod: nullIfInt(r[3]),
            datum: parseDateTime(r[4]),
            cas: emptyToNull(r[5]),
            druhHlasovani: emptyToNull(r[6])?.[0] ?? null,
            vysledek: emptyToNull(r[7])?.[0] ?? null,
            pro: nullIfInt(r[8]),
            proti: nullIfInt(r[9]),
            zdrzel: nullIfInt(r[10]),
            prihlaseno: nullIfInt(r[11]),
            kvorum: nullIfInt(r[12]),
            nazev: (r[13] ?? "").trim() || "(bez názvu)",
            popis: emptyToNull(r[14]),
            idTisk: nullIfInt(r[15]),
            // embedding: filled by separate embedding job
          }))
        )
        .onConflictDoUpdate({
          target: hlasovani.id,
          set: {
            pro: sql`excluded.pro`,
            proti: sql`excluded.proti`,
            zdrzel: sql`excluded.zdrzel`,
            prihlaseno: sql`excluded.prihlaseno`,
            kvorum: sql`excluded.kvorum`,
            vysledek: sql`excluded.vysledek`,
          },
        });
    }
    logger.info({ count: hlasRows.length }, "✓ Hlasování");
  }

  // ----- Hlasování poslanec (per-deputy vote — BIG table) -----
  // Schéma hl_poslanec: id_hlasovani|id_poslanec|vysledek
  const hpRows = files["hl_poslanec.unl"] ?? [];
  if (hpRows.length > 0) {
    for (let i = 0; i < hpRows.length; i += BATCH) {
      const slice = hpRows.slice(i, i + BATCH);
      await db
        .insert(hlasovaniPoslanec)
        .values(
          slice.map((r) => ({
            id: 0, // serial; Drizzle assigns from sequence
            idHlasovani: parseInt(r[0] ?? "0", 10),
            idPoslanec: parseInt(r[1] ?? "0", 10),
            vysledek: (r[2] ?? "").charAt(0) ?? "@",
          }))
        )
        .onConflictDoNothing();
    }
    logger.info({ count: hpRows.length }, "✓ Hlasování_poslanec");
  }

  // ----- Omluvy -----
  // Schéma: id_poslanec|od|do|duvod
  const omluvyRows = files["omluvy.unl"] ?? [];
  if (omluvyRows.length > 0) {
    for (let i = 0; i < omluvyRows.length; i += BATCH) {
      const slice = omluvyRows.slice(i, i + BATCH);
      await db
        .insert(omluva)
        .values(
          slice.map((r) => ({
            id: 0,
            idPoslanec: parseInt(r[0] ?? "0", 10),
            od: parseDateTime(r[1]) ?? new Date(),
            do: parseDateTime(r[2]) ?? new Date(),
            duvod: emptyToNull(r[3]),
          }))
        )
        .onConflictDoNothing();
    }
    logger.info({ count: omluvyRows.length }, "✓ Omluvy");
  }

  logger.info("✓ Load hlasování: hotovo");
}

// ====== helpers ======
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
  // PSP datetime format: "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DD HH:MM"
  const dt = new Date(s.replace(" ", "T") + (s.length === 16 ? ":00" : ""));
  return Number.isNaN(dt.getTime()) ? null : dt;
}