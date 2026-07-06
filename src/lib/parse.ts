// Sdílené parsovací helpers pro ETL loadery — původně duplikované v 5 souborech.
// Centralizace eliminuje bugy (nekonzistentní parseDateTime, různé formáty).

import { sql } from "drizzle-orm";

/** Prázdný string nebo "_null_" → null. Jinak vrátí oříznutou hodnotu. */
export function nullIfEmpty(v: string | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  const s = v.trim();
  return s === "" || s === "_null_" ? null : s;
}

/** nullIfEmpty + kontrola, že jde o platné celé číslo. */
export function nullIfInt(v: string | null | undefined): number | null {
  const s = nullIfEmpty(v);
  if (s === null) return null;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? null : n;
}

/**
 * Parsuje PSP datum ve formátu:
 *  - DD.MM.YYYY (běžné v UNL)
 *  - YYYY-MM-DD (ISO passthrough)
 *  - YYYY-MM-DD HH:MM:SS (datum + čas)
 *
 * Vrací YYYY-MM-DD (string, vhodné pro Drizzle `date` sloupce).
 */
export function parseDate(v: string | null | undefined): string | null {
  const s = nullIfEmpty(v);
  if (!s) return null;
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(s);
  if (m && m[1] && m[2] && m[3]) {
    return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return s;
}

/**
 * Parsuje PSP datum-čas. Vstupy:
 *  - "YYYY-MM-DD HH:MM:SS"
 *  - "YYYY-MM-DD HH:MM"
 *  - "YYYY-MM-DD"
 * Vrací Date nebo null.
 */
export function parseDateTime(v: string | null | undefined): Date | null {
  const s = nullIfEmpty(v);
  if (!s) return null;
  const dt = new Date(s.replace(" ", "T") + (s.length === 16 ? ":00" : ""));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/** Mapování kódu typu orgánu z PSP.UNL na Drizzle enum. */
export type OrganTypCode = "KLUB" | "VYBOR" | "KOMISE" | "DELEGACE" | "PODVYBOR" | "JINY";

export function inferOrganTyp(code: string | null | undefined): OrganTypCode {
  const map: Record<string, OrganTypCode> = {
    "1": "KLUB",
    "2": "VYBOR",
    "3": "PODVYBOR",
    "4": "KOMISE",
    "5": "DELEGACE",
  };
  return map[code ?? ""] ?? "JINY";
}

export type DruhTiskuCode =
  | "NAVRH_ZAKONA"
  | "DOPIS"
  | "ZPRAVA"
  | "USNESENI"
  | "ROZPOR"
  | "INTERPELACE"
  | "JINY";

export function inferDruhTisku(v: string | null | undefined): DruhTiskuCode {
  const map: Record<string, DruhTiskuCode> = {
    "1": "NAVRH_ZAKONA",
    "2": "DOPIS",
    "3": "ZPRAVA",
    "4": "USNESENI",
    "5": "ROZPOR",
    "6": "INTERPELACE",
  };
  return map[v ?? ""] ?? "JINY";
}

/**
 * Batch insert helper — rozdělí pole na dávky a provede upsert s ON CONFLICT.
 * Snižuje tlak na databázi a dává smysluplný progress reporting.
 */
export async function batchInsert<T>(
  rows: readonly T[],
  batchSize: number,
  insert: (slice: T[]) => Promise<unknown>
): Promise<{ inserted: number; batches: number }> {
  if (rows.length === 0) return { inserted: 0, batches: 0 };
  let batches = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    await insert(rows.slice(i, i + batchSize));
    batches++;
  }
  return { inserted: rows.length, batches };
}

/** Helper pro Drizzle `excluded.*` reference v `onConflictDoUpdate`. */
export { sql };