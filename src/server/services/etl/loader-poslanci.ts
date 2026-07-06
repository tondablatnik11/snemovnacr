// Loader: poslanci + osoby + organy + zarazeni + funkce
// UNL sloupce jsou zdokumentované na https://www.psp.cz/sqw/hp.sqw?k=1301

import { db } from "~/server/db";
import {
  osoba,
  poslanec,
  organ,
  zarazeni,
  funkce,
  typOrganu,
  volebniObdobi,
} from "~/server/db/schema/psp";
import {
  sql,
  nullIfEmpty,
  nullIfInt,
  parseDate,
  inferOrganTyp,
  batchInsert,
} from "~/lib/parse";
import { logger } from "~/lib/logger";
import type { DownloadedZip } from "./psp-client";

const ORG_TYPE_NAMES: Record<string, string> = {
  "0": "neurčeno",
  "1": "klub",
  "2": "výbor",
  "3": "podvýbor",
  "4": "komise",
  "5": "delegace",
  "6": "jiný orgán",
};

// Mapování id_obdobi → roky (dle README: term 1 → 1993, term 10 → 2025)
const OBDOBI_YEARS: Record<number, number> = {
  1: 1993, 2: 1996, 3: 1998, 4: 2002, 5: 2006,
  6: 2010, 7: 2013, 8: 2017, 9: 2021, 10: 2025,
};

export async function loadPoslanci(snapshot: DownloadedZip) {
  const files = snapshot.files;
  logger.info("→ Load poslanci: start");

  await loadVolebniObdobi(files);
  await loadOsoby(files);
  await loadTypyOrganu(files);
  await loadOrgany(files);
  await loadFunkce(files);
  await loadPoslanciTable(files);
  await loadZarazeni(files);

  logger.info("✓ Load poslanci: hotovo");
}

// ===== Sekce =====

async function loadVolebniObdobi(files: Record<string, ReturnType<typeof JSON.parse>[]>) {
  // Parsujeme jen poslanec.unl, kde formát je: id_poslanec|id_osoba|id_obdobi|...
  const poslanecRowsForObdobi = (files["poslanec.unl"] ?? []) as string[][];
  const obdobiFromFiles = new Set<number>();
  for (const row of poslanecRowsForObdobi) {
    const obdobi = parseInt(row[2] ?? "", 10);
    if (!Number.isNaN(obdobi) && obdobi > 0 && obdobi <= 20) {
      obdobiFromFiles.add(obdobi);
    }
  }
  // Hardcoded fallback pro případ že poslanec.unl ještě nemá žádné řádky.
  for (const id of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) obdobiFromFiles.add(id);

  const obdobiRows = [...obdobiFromFiles]
    .sort((a, b) => a - b)
    .map((id) => ({
      id,
      cislo: id,
      nazev: `${id}. volební období`,
      datumOd: `${OBDOBI_YEARS[id] ?? 1990 + id * 4}-01-01`,
      datumDo: null as string | null,
      aktualni: id === 10,
    }));

  if (obdobiRows.length === 0) return;

  try {
    await db
      .insert(volebniObdobi)
      .values(obdobiRows)
      .onConflictDoUpdate({
        target: volebniObdobi.id,
        set: { aktualni: sql`excluded.aktualni` },
      });
    logger.info({ count: obdobiRows.length }, "✓ Volební období");
  } catch (err) {
    logger.error(
      { err: String(err), sample: obdobiRows[0] },
      "× Volební období selhala"
    );
    throw err;
  }
}

async function loadOsoby(files: Record<string, unknown>) {
  const f = files as Record<string, string[][]>;
  const rows = f["osoby.unl"] ?? f["osoba.unl"] ?? [];
  if (rows.length === 0) return;

  await db
    .insert(osoba)
    .values(
      rows.map((r) => ({
        id: parseInt(r[0] ?? "0", 10),
        jmeno: (r[1] ?? "").trim(),
        prijmeni: (r[2] ?? "").trim(),
        titulPred: nullIfEmpty(r[3]),
        titulZa: nullIfEmpty(r[4]),
        narozeni: parseDate(r[5]),
        pohlavi: nullIfEmpty(r[6])?.[0] ?? null,
        fotoUrl: nullIfEmpty(r[7]),
      }))
    )
    .onConflictDoUpdate({
      target: osoba.id,
      set: {
        jmeno: sql`excluded.jmeno`,
        prijmeni: sql`excluded.prijmeni`,
        titulPred: sql`excluded.titul_pred`,
        titulZa: sql`excluded.titul_za`,
      },
    });
  logger.info({ count: rows.length }, "✓ Osoby");
}

async function loadTypyOrganu(files: Record<string, unknown>) {
  const f = files as Record<string, string[][]>;
  const rows = f["typ_organu.unl"] ?? [];
  if (rows.length === 0) return;

  await db
    .insert(typOrganu)
    .values(
      rows.map((r) => ({
        id: parseInt(r[0] ?? "0", 10),
        typ: inferOrganTyp(r[1]),
        nazev: r[2] ?? ORG_TYPE_NAMES[r[1] ?? ""] ?? "neznámý",
        popis: nullIfEmpty(r[3]),
      }))
    )
    .onConflictDoUpdate({
      target: typOrganu.id,
      set: { nazev: sql`excluded.nazev` },
    });
}

async function loadOrgany(files: Record<string, unknown>) {
  const f = files as Record<string, string[][]>;
  const rows = f["organy.unl"] ?? [];
  if (rows.length === 0) return;

  await db
    .insert(organ)
    .values(
      rows.map((r) => ({
        id: parseInt(r[0] ?? "0", 10),
        idTyp: parseInt(r[1] ?? "0", 10),
        idObdobi: parseInt(r[2] ?? "0", 10),
        nazev: (r[3] ?? "").trim(),
        zkratka: nullIfEmpty(r[4]),
        clOrganBase: nullIfInt(r[5]),
        priorita: parseInt(r[6] ?? "0", 10),
      }))
    )
    .onConflictDoUpdate({
      target: organ.id,
      set: {
        nazev: sql`excluded.nazev`,
        zkratka: sql`excluded.zkratka`,
      },
    });
  logger.info({ count: rows.length }, "✓ Organy");
}

async function loadFunkce(files: Record<string, unknown>) {
  const f = files as Record<string, string[][]>;
  const rows = f["funkce.unl"] ?? [];
  if (rows.length === 0) return;

  await db
    .insert(funkce)
    .values(
      rows.map((r) => ({
        id: parseInt(r[0] ?? "0", 10),
        idOrgan: parseInt(r[1] ?? "0", 10),
        nazev: r[2] ?? "",
      }))
    )
    .onConflictDoNothing();
}

async function loadPoslanciTable(files: Record<string, unknown>) {
  const f = files as Record<string, string[][]>;
  const rows = f["poslanec.unl"] ?? [];
  if (rows.length === 0) return;

  await db
    .insert(poslanec)
    .values(
      rows.map((r) => ({
        id: parseInt(r[0] ?? "0", 10),
        idOsoba: parseInt(r[1] ?? "0", 10),
        idObdobi: parseInt(r[2] ?? "0", 10),
        idKandidatka: nullIfInt(r[3]),
        region: nullIfEmpty(r[4]),
        web: nullIfEmpty(r[5]),
        email: nullIfEmpty(r[6]),
        telefon: nullIfEmpty(r[7]),
      }))
    )
    .onConflictDoUpdate({
      target: poslanec.id,
      set: {
        web: sql`excluded.web`,
        email: sql`excluded.email`,
      },
    });
  logger.info({ count: rows.length }, "✓ Poslanci");
}

async function loadZarazeni(files: Record<string, unknown>) {
  const f = files as Record<string, string[][]>;
  const rows = f["zarazeni.unl"] ?? [];
  if (rows.length === 0) return;

  await batchInsert(rows, 5_000, async (slice) => {
    await db
      .insert(zarazeni)
      .values(
        slice.map((r) => ({
          id: parseInt(r[0] ?? "0", 10),
          idOsoba: parseInt(r[1] ?? "0", 10),
          clFunkce: parseInt(r[2] ?? "0", 10),
          idOf: parseInt(r[3] ?? "0", 10),
          odO: parseDate(r[4]),
          doO: parseDate(r[5]),
          odF: parseDate(r[6]),
          doF: parseDate(r[7]),
        }))
      )
      .onConflictDoNothing();
  });
  logger.info({ count: rows.length }, "✓ Zařazení");
}