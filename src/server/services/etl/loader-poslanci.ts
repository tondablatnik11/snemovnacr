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
  coalition,
} from "~/server/db/schema/psp";
import { logger } from "~/lib/logger";
import type { DownloadedZip } from "./psp-client";

// Spojení českých identifikátorů typu orgánu (z PSP.UNL)
const ORG_TYPE_NAMES: Record<string, string> = {
  "0": "neurčeno",
  "1": "klub",
  "2": "výbor",
  "3": "podvýbor",
  "4": "komise",
  "5": "delegace",
  "6": "jiný orgán",
};

export async function loadPoslanci(snapshot: DownloadedZip) {
  const files = snapshot.files;
  logger.info("→ Load poslanci: start");

  // ----- 1) volebniObdobi (z odvozených dat — POUZE z poslanec.unl) -----
  // Dříve jsme iterovali VŠECHNY soubory a brali row[0], což způsobilo že
  // id_obdobi bylo smíchané s id_osoba (např. 7109). Nyní parsujeme jen
  // poslanec.unl, kde formát je: id_poslanec|id_osoba|id_obdobi|...
  const obdobiFromFiles = new Set<number>();
  const poslanecRowsForObdobi = files["poslanec.unl"] ?? [];
  for (const row of poslanecRowsForObdobi) {
    const obdobi = parseInt(row[2] ?? "", 10);
    if (!Number.isNaN(obdobi) && obdobi > 0 && obdobi <= 20) obdobiFromFiles.add(obdobi);
  }
  // Hardcoded fallback (10 období 1993–2025) pro případ že poslanec.unl
  // ještě nemá žádné řádky.
  const defaultObdobi = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  for (const id of defaultObdobi) obdobiFromFiles.add(id);

  // Mapování id_obdobi → roky (dle README: term 1 → 1993, term 10 → 2025)
  const OBDOBI_YEARS: Record<number, number> = {
    1: 1993, 2: 1996, 3: 1998, 4: 2002, 5: 2006,
    6: 2010, 7: 2013, 8: 2017, 9: 2021, 10: 2025,
  };

  const obdobiRows = [...obdobiFromFiles].sort((a, b) => a - b).map((id) => ({
    id,
    cislo: id,
    nazev: `${id}. volební období`,
    datumOd: `${OBDOBI_YEARS[id] ?? 1990 + id * 4}-01-01`,
    datumDo: null as string | null,
    aktualni: id === 10,
  }));

  if (obdobiRows.length > 0) {
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

  // ----- 2) osoba (lidé — unikátní) -----
  // Typicky soubor "osoby.unl" se sloupci: id_osoba|jmeno|prijmeni|titul_pred|titul_za|narozeni|pohlavi|...
  const osobyRows = files["osoby.unl"] ?? files["osoba.unl"] ?? [];
  if (osobyRows.length > 0) {
    await db
      .insert(osoba)
      .values(
        osobyRows.map((r) => ({
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
    logger.info({ count: osobyRows.length }, "✓ Osoby");
  }

  // ----- 3) typ_organu (slovník) -----
  const typRows = files["typ_organu.unl"] ?? [];
  if (typRows.length > 0) {
    await db
      .insert(typOrganu)
      .values(
        typRows.map((r) => ({
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

  // ----- 4) organy (kluby, výbory…) -----
  const organRows = files["organy.unl"] ?? [];
  if (organRows.length > 0) {
    await db
      .insert(organ)
      .values(
        organRows.map((r) => ({
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
    logger.info({ count: organRows.length }, "✓ Organy");
  }

  // ----- 5) funkce (předseda, místopředseda, …) -----
  const funkceRows = files["funkce.unl"] ?? [];
  if (funkceRows.length > 0) {
    await db
      .insert(funkce)
      .values(
        funkceRows.map((r) => ({
          id: parseInt(r[0] ?? "0", 10),
          idOrgan: parseInt(r[1] ?? "0", 10),
          nazev: r[2] ?? "",
        }))
      )
      .onConflictDoNothing();
  }

  // ----- 6) poslanec (mandát) -----
  const poslanecRows = files["poslanec.unl"] ?? [];
  if (poslanecRows.length > 0) {
    await db
      .insert(poslanec)
      .values(
        poslanecRows.map((r) => ({
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
    logger.info({ count: poslanecRows.length }, "✓ Poslanci");
  }

  // ----- 7) zařazení (členství/funkce v orgánu) -----
  const zarazeniRows = files["zarazeni.unl"] ?? [];
  if (zarazeniRows.length > 0) {
    await db
      .insert(zarazeni)
      .values(
        zarazeniRows.map((r) => ({
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
    logger.info({ count: zarazeniRows.length }, "✓ Zařazení");
  }

  // ----- 8) PKG (regionální GPS kanceláře — minoritní) -----
  // přeskočeno pro MVP

  // ----- 9) Osoba extra (senátní cross-link) -----
  // přeskočeno pro MVP

  logger.info("✓ Load poslanci: hotovo");
}

// ====== helpers ======

import { sql } from "drizzle-orm";

function nullIfEmpty(v: string | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  const s = v.trim();
  return s === "" || s === "_null_" ? null : s;
}

function nullIfInt(v: string | null | undefined): number | null {
  const s = nullIfEmpty(v);
  if (s === null) return null;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? null : n;
}

function parseDate(v: string | null | undefined): string | null {
  const s = nullIfEmpty(v);
  if (!s) return null;
  // DD.MM.YYYY → YYYY-MM-DD
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(s);
  if (m && m[1] && m[2] && m[3]) {
    return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return s; // ISO passthrough
}

function inferOrganTyp(code: string | null | undefined) {
  const map: Record<string, "KLUB" | "VYBOR" | "KOMISE" | "DELEGACE" | "PODVYBOR" | "JINY"> = {
    "1": "KLUB",
    "2": "VYBOR",
    "3": "PODVYBOR",
    "4": "KOMISE",
    "5": "DELEGACE",
  };
  return (map[code ?? ""] ?? "JINY") as "KLUB" | "VYBOR" | "KOMISE" | "DELEGACE" | "PODVYBOR" | "JINY";
}