// Loader: hlasování + hlasování_poslanec + omluvy
// UNL sloupce z https://www.psp.cz/sqw/hp.sqw?k=1302
// Největší tabulka — batch insert s ON CONFLICT DO NOTHING

import { db } from "~/server/db";
import { hlasovani, hlasovaniPoslanec, omluva, schuze, bodSchuze } from "~/server/db/schema/psp";
import {
  sql,
  nullIfEmpty,
  nullIfInt,
  parseDate,
  parseDateTime,
  batchInsert,
} from "~/lib/parse";
import { logger } from "~/lib/logger";
import type { DownloadedZip } from "./psp-client";

const BATCH = 5_000;

export async function loadHlasovani(snapshot: DownloadedZip) {
  const files = snapshot.files as Record<string, string[][]>;
  logger.info("→ Load hlasování: start");

  await loadSchuze(files);
  await loadBodySchuze(files);
  await loadHlasovaniTable(files);
  await loadHlasovaniPoslanec(files);
  await loadOmluvy(files);

  logger.info("✓ Load hlasování: hotovo");
}

async function loadSchuze(files: Record<string, string[][]>) {
  const rows = files["schuze.unl"] ?? [];
  if (rows.length === 0) return;

  await db
    .insert(schuze)
    .values(
      rows.map((r) => ({
        id: parseInt(r[0] ?? "0", 10),
        idObdobi: parseInt(r[1] ?? "0", 10),
        cislo: parseInt(r[2] ?? "0", 10),
        nazev: nullIfEmpty(r[3]),
        datumOd: parseDate(r[4]),
        datumDo: parseDate(r[5]),
        stav: nullIfEmpty(r[6]),
      }))
    )
    .onConflictDoUpdate({
      target: schuze.id,
      set: {
        nazev: sql`excluded.nazev`,
        stav: sql`excluded.stav`,
      },
    });
  logger.info({ count: rows.length }, "✓ Schůze");
}

async function loadBodySchuze(files: Record<string, string[][]>) {
  const rows = files["bod_schuze.unl"] ?? files["bodu.unl"] ?? [];
  if (rows.length === 0) return;

  await db
    .insert(bodSchuze)
    .values(
      rows.map((r) => ({
        id: parseInt(r[0] ?? "0", 10),
        idSchuze: parseInt(r[1] ?? "0", 10),
        poradi: parseInt(r[2] ?? "0", 10),
        idTisk: nullIfInt(r[3]),
        nazev: nullIfEmpty(r[4]),
        typBodu: nullIfEmpty(r[5]),
        stav: nullIfEmpty(r[6]),
      }))
    )
    .onConflictDoNothing();
}

async function loadHlasovaniTable(files: Record<string, string[][]>) {
  // Schéma hl_hlasovani: id_hlasovani|id_obdobi|id_schuze|id_bod|datum|cas|druh_hlasovani|vysledek|pro|proti|zdrzel|prihlaseno|kvorum|nazev|popis|id_tisk
  const rows = files["hl_hlasovani.unl"] ?? [];
  if (rows.length === 0) return;

  await batchInsert(rows, BATCH, async (slice) => {
    await db
      .insert(hlasovani)
      .values(
        slice.map((r) => ({
          id: parseInt(r[0] ?? "0", 10),
          idObdobi: parseInt(r[1] ?? "0", 10),
          idSchuze: nullIfInt(r[2]),
          idBod: nullIfInt(r[3]),
          datum: parseDateTime(r[4]),
          cas: nullIfEmpty(r[5]),
          druhHlasovani: nullIfEmpty(r[6])?.[0] ?? null,
          vysledek: nullIfEmpty(r[7])?.[0] ?? null,
          pro: nullIfInt(r[8]),
          proti: nullIfInt(r[9]),
          zdrzel: nullIfInt(r[10]),
          prihlaseno: nullIfInt(r[11]),
          kvorum: nullIfInt(r[12]),
          nazev: (r[13] ?? "").trim() || "(bez názvu)",
          popis: nullIfEmpty(r[14]),
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
  });
  logger.info({ count: rows.length }, "✓ Hlasování");
}

async function loadHlasovaniPoslanec(files: Record<string, string[][]>) {
  // Schéma hl_poslanec: id_hlasovani|id_poslanec|vysledek
  const rows = files["hl_poslanec.unl"] ?? [];
  if (rows.length === 0) return;

  await batchInsert(rows, BATCH, async (slice) => {
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
  });
  logger.info({ count: rows.length }, "✓ Hlasování_poslanec");
}

async function loadOmluvy(files: Record<string, string[][]>) {
  // Schéma: id_poslanec|od|do|duvod
  const rows = files["omluvy.unl"] ?? [];
  if (rows.length === 0) return;

  await batchInsert(rows, BATCH, async (slice) => {
    await db
      .insert(omluva)
      .values(
        slice.map((r) => ({
          id: 0,
          idPoslanec: parseInt(r[0] ?? "0", 10),
          od: parseDateTime(r[1]) ?? new Date(),
          doDo: parseDateTime(r[2]) ?? new Date(),
          duvod: nullIfEmpty(r[3]),
        }))
      )
      .onConflictDoNothing();
  });
  logger.info({ count: rows.length }, "✓ Omluvy");
}