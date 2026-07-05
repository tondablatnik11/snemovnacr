// tRPC router: hlasování
import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { hlasovani, hlasovaniPoslanec, poslanec, osoba, volebniObdobi, schuze, coalition } from "~/server/db/schema/psp";
import { and, desc, eq, sql, gte, lte } from "drizzle-orm";

export const hlasovaniRouter = router({
  list: publicProcedure
    .input(
      z.object({
        term: z.number().int().default(10),
        from: z.string().optional(),
        to: z.string().optional(),
        search: z.string().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.pageSize;
      const where = and(
        eq(hlasovani.idObdobi, input.term),
        input.from ? gte(hlasovani.datum, new Date(input.from)) : sql`true`,
        input.to ? lte(hlasovani.datum, new Date(input.to)) : sql`true`,
        input.search ? sql`h.nazev ILIKE ${`%${input.search}%`}` : sql`true`
      );

      const rows = await ctx.db
        .select({
          id: hlasovani.id,
          nazev: hlasovani.nazev,
          datum: hlasovani.datum,
          vysledek: hlasovani.vysledek,
          pro: hlasovani.pro,
          proti: hlasovani.proti,
          zdrzel: hlasovani.zdrzel,
          prihlaseno: hlasovani.prihlaseno,
          idSchuze: hlasovani.idSchuze,
          schuzeCislo: schuze.cislo,
        })
        .from(hlasovani)
        .leftJoin(schuze, eq(schuze.id, hlasovani.idSchuze))
        .where(where)
        .orderBy(desc(hlasovani.datum))
        .limit(input.pageSize)
        .offset(offset);

      return rows;
    }),

  detail: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [h] = await ctx.db
        .select()
        .from(hlasovani)
        .where(eq(hlasovani.id, input.id))
        .limit(1);
      if (!h) return null;

      // Všichni poslanci + jak hlasovali (včetně klubu a koaliční role)
      const rows = await ctx.db.execute(sql`
        SELECT
          p.id AS poslanec_id,
          o.jmeno, o.prijmeni, o.titul_pred, o.titul_za,
          hp.vysledek,
          org.nazev AS klub,
          org.id AS klub_id,
          coal.role AS koalice_role
        FROM hlasovani_poslanec hp
        INNER JOIN poslanec p ON p.id = hp.id_poslanec
        INNER JOIN osoba o ON o.id = p.id_osoba
        LEFT JOIN zarazeni z ON z.id_osoba = p.id_osoba AND z.cl_funkce = 0
        LEFT JOIN organ org ON org.id = z.id_of
        LEFT JOIN coalition coal
          ON coal.id_obdobi = p.id_obdobi AND coal.id_organ = org.id
        WHERE hp.id_hlasovani = ${input.id}
        ORDER BY org.nazev, o.prijmeni, o.jmeno
      `);

      return { ...h, hlasovani: rows };
    }),

  /** Divergence: poslanci, kteří hlasovali opačně než koalice */
  divergence: publicProcedure
    .input(z.object({ term: z.number().int().default(10), limit: z.number().int().min(1).max(100).default(20) }))
    .query(async ({ ctx, input }) => {
      // Počítá: pro každého poslance X hlasování: poměr (kolikrát hlasoval PRO když koalice PRO) atd.
      return ctx.db.execute(sql`
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
});