// Coalition metrics — divergence, agreement, attendance

import { db } from "~/server/db";
import { hlasovaniPoslanec, poslanec, osoba, zarazeni, organ, coalition } from "~/server/db/schema/psp";
import { and, eq, sql } from "drizzle-orm";

export interface DivergenceRow {
  poslanecId: number;
  jmeno: string;
  prijmeni: string;
  titulPred: string | null;
  klubNazev: string | null;
  koaliceRole: "VLADA" | "OPOZICE" | "NEZARAZENO" | null;
  total: number;
  souhlas: number;
  nesouhlas: number;
  zdrzel: number;
  absent: number;
  divergencePct: number;
}

/**
 * Vypočítá pro každého poslance v daném období:
 * - jak často hlasuje PRO/PROTI když koalice PRO/PROTI (= divergence)
 * - attendance (% přihlášených hlasování)
 */
export async function computeDivergence(term: number, limit = 30): Promise<DivergenceRow[]> {
  const rows = await db.execute(sql`
    WITH koalice_votes AS (
      SELECT hp.id_hlasovani, hp.vysledek
      FROM hlasovani_poslanec hp
      INNER JOIN poslanec p ON p.id = hp.id_poslanec
      INNER JOIN zarazeni z ON z.id_osoba = p.id_osoba AND z.cl_funkce = 0
      INNER JOIN coalition c ON c.id_obdobi = p.id_obdobi AND c.id_organ = z.id_of
      WHERE c.role = 'VLADA' AND p.id_obdobi = ${term}
        AND hp.vysledek IN ('A','B','N','C')
      GROUP BY hp.id_hlasovani, hp.vysledek
    ),
    majority AS (
      SELECT id_hlasovani,
        CASE
          WHEN SUM(CASE WHEN vysledek='A' THEN 1 ELSE 0 END) >
               SUM(CASE WHEN vysledek IN ('B','N') THEN 1 ELSE 0 END) THEN 'A'
          ELSE 'B'
        END AS koalice_vysledek
      FROM koalice_votes
      GROUP BY id_hlasovani
    ),
    per_poslanec AS (
      SELECT p.id AS poslanec_id,
             o.jmeno, o.prijmeni, o.titul_pred,
             org.nazev AS klub_nazev,
             coal.role AS koalice_role,
             COUNT(*) AS total,
             SUM(CASE WHEN hp.vysledek = m.koalice_vysledek THEN 1 ELSE 0 END) AS souhlas,
             SUM(CASE WHEN hp.vysledek <> m.koalice_vysledek AND hp.vysledek IN ('A','B','N','C') THEN 1 ELSE 0 END) AS nesouhlas,
             SUM(CASE WHEN hp.vysledek = 'C' THEN 1 ELSE 0 END) AS zdrzel,
             SUM(CASE WHEN hp.vysledek NOT IN ('A','B','N','C') THEN 1 ELSE 0 END) AS absent
      FROM hlasovani_poslanec hp
      INNER JOIN poslanec p ON p.id = hp.id_poslanec AND p.id_obdobi = ${term}
      INNER JOIN osoba o ON o.id = p.id_osoba
      LEFT JOIN zarazeni z ON z.id_osoba = p.id_osoba AND z.cl_funkce = 0
      LEFT JOIN organ org ON org.id = z.id_of
      LEFT JOIN coalition coal ON coal.id_obdobi = p.id_obdobi AND coal.id_organ = org.id
      INNER JOIN majority m ON m.id_hlasovani = hp.id_hlasovani
      GROUP BY p.id, o.jmeno, o.prijmeni, o.titul_pred, org.nazev, coal.role
      HAVING COUNT(*) >= 50
    )
    SELECT poslanec_id, jmeno, prijmeni, titul_pred,
           klub_nazev, koalice_role,
           total, souhlas, nesouhlas, zdrzel, absent,
           ROUND(100.0 * nesouhlas / NULLIF(souhlas + nesouhlas, 0), 2) AS divergence_pct
    FROM per_poslanec
    ORDER BY divergence_pct DESC NULLS LAST
    LIMIT ${limit}
  `);

  return (rows as unknown as Array<{
    poslanec_id: number;
    jmeno: string;
    prijmeni: string;
    titul_pred: string | null;
    klub_nazev: string | null;
    koalice_role: string | null;
    total: number;
    souhlas: number;
    nesouhlas: number;
    zdrzel: number;
    absent: number;
    divergence_pct: number;
  }>).map((r) => ({
    poslanecId: r.poslanec_id,
    jmeno: r.jmeno,
    prijmeni: r.prijmeni,
    titulPred: r.titul_pred,
    klubNazev: r.klub_nazev,
    koaliceRole: r.koalice_role as "VLADA" | "OPOZICE" | "NEZARAZENO" | null,
    total: r.total,
    souhlas: r.souhlas,
    nesouhlas: r.nesouhlas,
    zdrzel: r.zdrzel,
    absent: r.absent,
    divergencePct: r.divergence_pct,
  }));
}

/**
 * Cross-party matrix: pro každou dvojici klubů — jak často hlasují stejně
 * Vrací hranovou matici 0–1 (1 = úplná shoda)
 */
export interface CrossPartyMatrix {
  kluby: string[];
  // symetrická matice kluby.length × kluby.length
  matrix: number[][];
  totalHlasovani: number;
}

export async function crossPartyAgreement(term: number): Promise<CrossPartyMatrix> {
  const rows = await db.execute(sql`
    WITH per_klub AS (
      SELECT hp.id_hlasovani, org.id AS klub_id, org.nazev AS klub_nazev, hp.vysledek
      FROM hlasovani_poslanec hp
      INNER JOIN poslanec p ON p.id = hp.id_poslanec AND p.id_obdobi = ${term}
      LEFT JOIN zarazeni z ON z.id_osoba = p.id_osoba AND z.cl_funkce = 0
      LEFT JOIN organ org ON org.id = z.id_of
      WHERE hp.vysledek IN ('A','B','N')
    )
    SELECT klub_id, klub_nazev, id_hlasovani,
      CASE WHEN SUM(CASE WHEN vysledek='A' THEN 1 ELSE 0 END) > SUM(CASE WHEN vysledek IN ('B','N') THEN 1 ELSE 0 END) THEN 'A' ELSE 'B' END AS klub_vysledek
    FROM per_klub
    GROUP BY klub_id, klub_nazev, id_hlasovani
    HAVING klub_id IS NOT NULL
  `);

  const data = rows as unknown as Array<{ klub_id: number; klub_nazev: string; id_hlasovani: number; klub_vysledek: string }>;

  const klubMap = new Map<number, string>();
  for (const r of data) klubMap.set(r.klub_id, r.klub_nazev);
  const kluby = [...klubMap.values()];

  // seskup po hlasováních
  const byVote = new Map<number, Map<number, string>>();
  for (const r of data) {
    if (!byVote.has(r.id_hlasovani)) byVote.set(r.id_hlasovani, new Map());
    byVote.get(r.id_hlasovani)!.set(r.klub_id, r.klub_vysledek);
  }

  // matice shody
  const matrix: number[][] = kluby.map(() => kluby.map(() => 0));
  const ids = [...klubMap.keys()];
  for (const vote of byVote.values()) {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i; j < ids.length; j++) {
        const a = vote.get(ids[i]!);
        const b = vote.get(ids[j]!);
        if (a && b && a === b) {
          matrix[i]![j]! += 1;
          if (i !== j) matrix[j]![i]! += 1;
        }
      }
    }
  }

  // normalizuj na %
  const total = byVote.size || 1;
  for (let i = 0; i < kluby.length; i++) {
    for (let j = 0; j < kluby.length; j++) {
      matrix[i]![j]! = Math.round((matrix[i]![j]! / total) * 1000) / 10;
    }
  }

  return { kluby, matrix, totalHlasovani: total };
}