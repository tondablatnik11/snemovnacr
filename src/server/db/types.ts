// Sdílené typy pro SQL row výsledky z raw SQL dotazů.
// Eliminuje `as unknown as` antipattern v tRPC routerech a stránkách.

export interface HlasovaniRow {
  id: number;
  idObdobi: number;
  idSchuze: number | null;
  idBod: number | null;
  datum: Date | null;
  cas: string | null;
  druhHlasovani: string | null;
  vysledek: string | null;
  pro: number | null;
  proti: number | null;
  zdrzel: number | null;
  prihlaseno: number | null;
  kvorum: number | null;
  nazev: string;
  popis: string | null;
  idTisk: number | null;
  [key: string]: unknown;
}

export interface HlasovaniListRow {
  id: number;
  nazev: string;
  datum: Date | null;
  vysledek: string | null;
  pro: number | null;
  proti: number | null;
  zdrzel: number | null;
  prihlaseno: number | null;
  idSchuze: number | null;
  schuzeCislo: number | null;
  [key: string]: unknown;
}

/** Řádek pro detail hlasování — poslanec + jeho hlas + klub + koaliční role. */
export interface HlasovaniDetailRow {
  poslanec_id: number;
  jmeno: string;
  prijmeni: string;
  titul_pred: string | null;
  vysledek: string;
  klub: string | null;
  klub_id: number | null;
  koalice_role: string | null;
  [key: string]: unknown;
}

/** Řádek divergence poslance — agregace hlasování. */
export interface DivergenceRowRaw {
  poslanec_id: number;
  jmeno: string;
  prijmeni: string;
  titul_pred: string | null;
  total: number;
  souhlas: number;
  nesouhlas: number;
  divergence_pct: number | null;
  [key: string]: unknown;
}

/** Normalizovaná divergence (camelCase) pro UI/API konzumenty. */
export interface DivergenceRow {
  poslanecId: number;
  jmeno: string;
  prijmeni: string;
  titulPred: string | null;
  total: number;
  souhlas: number;
  nesouhlas: number;
  divergencePct: number;
}

/** Řádek voting matrix (poslanec → hlasování). */
export interface VotingMatrixRow {
  id: number;
  datum: Date | null;
  nazev: string;
  vysledek: string | null;
  muj_hlas: string;
  [key: string]: unknown;
}

/** Cross-party klub data. */
export interface KlubVoteRow {
  klub_id: number;
  klub_nazev: string;
  id_hlasovani: number;
  klub_vysledek: "A" | "B";
  [key: string]: unknown;
}

/** Attendance data pro jednoho poslance. */
export interface AttendanceRow {
  total: number;
  present: number;
  absent: number;
  abstain: number;
  attendance_pct: number | null;
  [key: string]: unknown;
}

/** Raw kontroverzní hlasování (z SQL). */
export interface ContestedVoteRaw {
  id: number;
  nazev: string;
  datum: Date | string;
  pro: number;
  proti: number;
  zdrzel: number;
  koalice_rozptyl: number;
  [key: string]: unknown;
}

/** Row count pro admin dashboard. */
export interface TableStatRow {
  table_name: string;
  row_count: number;
  [key: string]: unknown;
}

/** Helper pro bezpečný přístup k hodnotám z raw SQL row. */
export function asNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

export function asString(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  return String(v);
}

export function asDate(v: unknown): Date | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}