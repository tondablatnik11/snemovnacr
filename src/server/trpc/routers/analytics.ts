// tRPC router: analytika — divergence, cross-party matrix, kontroverzní hlasování.
// Všechny dotazy jsou veřejné (publicProcedure) — analytika je součást otevřených dat.

import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { sql } from "drizzle-orm";
import { crossPartyAgreement } from "~/server/services/analytics/coalition-metrics";
import { findContestedVotes } from "~/server/services/analytics/alerts";
import type { DivergenceRowRaw, KlubVoteRow } from "~/server/db/types";

export const analyticsRouter = router({
  /**
   * Cross-party matrix: pro každou dvojici klubů vrací % hlasování,
   * ve kterých hlasovaly stejně. data jsou typově bezpečná.
   */
  crossPartyMatrix: publicProcedure
    .input(z.object({ term: z.number().int().default(10) }))
    .query(async ({ input }) => {
      return crossPartyAgreement(input.term);
    }),

  /**
   * Divergence: poslanci, kteří hlasovali opačně než koalice.
   * Přesunuto sem z hlasovani.divergence pro lepší organizaci.
   */
  divergence: publicProcedure
    .input(z.object({ term: z.number().int().default(10), limit: z.number().int().min(1).max(100).default(20) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.execute<DivergenceRowRaw>(sql`
        WITH koalice_votes AS (
          SELECT hp.id_hlasovani, hp.vysledek
          FROM hlasovani_poslanec hp
          INNER JOIN poslanec p ON p.id = hp.id_poslanec
          INNER JOIN zarazeni z ON z.id_osoba = p.id_osoba AND z.cl_funkce = 0
          INNER JOIN coalition c ON c.id_obdobi = p.id_obdobi AND c.id_organ = z.id_of
          WHERE c.role = 'VLADA' AND p.id_obdobi = ${input.term}
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
                 COUNT(*) AS total,
                 SUM(CASE WHEN hp.vysledek = m.koalice_vysledek THEN 1 ELSE 0 END) AS souhlas,
                 SUM(CASE WHEN hp.vysledek <> m.koalice_vysledek AND hp.vysledek IN ('A','B','N','C') THEN 1 ELSE 0 END) AS nesouhlas
          FROM hlasovani_poslanec hp
          INNER JOIN poslanec p ON p.id = hp.id_poslanec AND p.id_obdobi = ${input.term}
          INNER JOIN osoba o ON o.id = p.id_osoba
          INNER JOIN majority m ON m.id_hlasovani = hp.id_hlasovani
          GROUP BY p.id, o.jmeno, o.prijmeni, o.titul_pred
          HAVING COUNT(*) >= 50
        )
        SELECT poslanec_id, jmeno, prijmeni, titul_pred,
               total, souhlas, nesouhlas,
               ROUND(100.0 * nesouhlas / NULLIF(souhlas + nesouhlas, 0), 2) AS divergence_pct
        FROM per_poslanec
        ORDER BY divergence_pct DESC NULLS LAST
        LIMIT ${input.limit}
      `);
    }),

  /**
   * Kontroverzní hlasování: úzká výhra + vysoký rozptyl v koalici.
   */
  contestedVotes: publicProcedure
    .input(z.object({ daysBack: z.number().int().min(1).max(365).default(30), limit: z.number().int().min(1).max(50).default(10) }))
    .query(async ({ input }) => {
      const since = new Date();
      since.setDate(since.getDate() - input.daysBack);
      return findContestedVotes(since, input.limit);
    }),

  /**
   * Attendance: % přihlášených hlasování pro daného poslance.
   */
  attendance: publicProcedure
    .input(z.object({ poslanecId: z.number().int(), term: z.number().int().default(10) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.execute<{
        total: number;
        present: number;
        absent: number;
        abstain: number;
        attendance_pct: number | null;
      }>(sql`
        WITH all_votes AS (
          SELECT COUNT(*)::int AS total
          FROM hlasovani WHERE id_obdobi = ${input.term}
        ),
        per_poslanec AS (
          SELECT
            COUNT(*)::int AS present,
            SUM(CASE WHEN hp.vysledek IN ('F','@','M','W') THEN 1 ELSE 0 END)::int AS absent,
            SUM(CASE WHEN hp.vysledek IN ('C','K') THEN 1 ELSE 0 END)::int AS abstain
          FROM hlasovani_poslanec hp
          INNER JOIN hlasovani h ON h.id = hp.id_hlasovani
          WHERE hp.id_poslanec = ${input.poslanecId} AND h.id_obdobi = ${input.term}
        )
        SELECT all_votes.total, pp.present, pp.absent, pp.abstain,
          ROUND(100.0 * pp.present / NULLIF(all_votes.total, 0), 2) AS attendance_pct
        FROM all_votes, per_poslanec pp
      `);
      return rows[0] ?? null;
    }),

  /**
   * Attendance leaderboard — top N poslanců podle účasti v daném období.
   * Vrací data připravená pro Recharts vizualizaci.
   */
  attendanceLeaderboard: publicProcedure
    .input(z.object({ term: z.number().int().default(10), limit: z.number().int().min(1).max(100).default(20) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.execute<{
        poslanec_id: number;
        jmeno: string;
        prijmeni: string;
        titul_pred: string | null;
        total: number;
        present: number;
        absent: number;
        abstain: number;
        attendance_pct: number | null;
      }>(sql`
        WITH all_votes AS (
          SELECT COUNT(*)::int AS total
          FROM hlasovani WHERE id_obdobi = ${input.term}
        ),
        per_poslanec AS (
          SELECT
            p.id AS poslanec_id,
            o.jmeno, o.prijmeni, o.titul_pred,
            COUNT(*)::int AS present,
            SUM(CASE WHEN hp.vysledek IN ('F','@','M','W') THEN 1 ELSE 0 END)::int AS absent,
            SUM(CASE WHEN hp.vysledek IN ('C','K') THEN 1 ELSE 0 END)::int AS abstain
          FROM hlasovani_poslanec hp
          INNER JOIN hlasovani h ON h.id = hp.id_hlasovani
          INNER JOIN poslanec p ON p.id = hp.id_poslanec AND p.id_obdobi = ${input.term}
          INNER JOIN osoba o ON o.id = p.id_osoba
          GROUP BY p.id, o.jmeno, o.prijmeni, o.titul_pred
          HAVING COUNT(*) >= 50
        )
        SELECT poslanec_id, jmeno, prijmeni, titul_pred, all_votes.total, present, absent, abstain,
          ROUND(100.0 * present / NULLIF(all_votes.total, 0), 2) AS attendance_pct
        FROM per_poslanec, all_votes
        ORDER BY attendance_pct DESC NULLS LAST
        LIMIT ${input.limit}
      `);
    }),

  /**
   * Měsíční trend hlasování — počet hlasování za posledních N měsíců.
   * Data pro sparkline / area chart na analytics stránce.
   */
  monthlyVotesTrend: publicProcedure
    .input(z.object({ term: z.number().int().default(10), months: z.number().int().min(1).max(24).default(12) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.execute<{ mesic: string; pocet: number }>(sql`
        SELECT
          TO_CHAR(datum, 'YYYY-MM') AS mesic,
          COUNT(*)::int AS pocet
        FROM hlasovani
        WHERE id_obdobi = ${input.term}
          AND datum >= CURRENT_DATE - INTERVAL '${sql.raw(String(input.months))} months'
        GROUP BY TO_CHAR(datum, 'YYYY-MM')
        ORDER BY mesic
      `);
      return rows;
    }),
});