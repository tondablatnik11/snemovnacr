// tRPC router: poslanci
import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { poslanec, osoba, organ, volebniObdobi, zarazeni } from "~/server/db/schema/psp";
import { coalition } from "~/server/db/schema/psp";
import { and, desc, eq, ilike, or, sql, inArray } from "drizzle-orm";

export const poslanciRouter = router({
  list: publicProcedure
    .input(
      z.object({
        term: z.number().int().default(10),
        search: z.string().optional(),
        clubId: z.number().int().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(24),
      })
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.pageSize;

      // Najdi ID poslanců v daném období, případně klubu
      const baseWhere = and(
        eq(poslanec.idObdobi, input.term),
        input.clubId ? eq(zarazeni.idOf, input.clubId) : sql`true`
      );

      const rows = await ctx.db
        .select({
          id: poslanec.id,
          idOsoba: poslanec.idOsoba,
          jmeno: osoba.jmeno,
          prijmeni: osoba.prijmeni,
          titulPred: osoba.titulPred,
          titulZa: osoba.titulZa,
          region: poslanec.region,
          web: poslanec.web,
          fotoUrl: osoba.fotoUrl,
        })
        .from(poslanec)
        .innerJoin(osoba, eq(osoba.id, poslanec.idOsoba))
        .leftJoin(zarazeni, and(eq(zarazeni.idOsoba, poslanec.idOsoba), eq(zarazeni.clFunkce, 0)))
        .where(
          and(
            baseWhere,
            input.search
              ? or(
                  ilike(osoba.prijmeni, `%${input.search}%`),
                  ilike(osoba.jmeno, `%${input.search}%`)
                )
              : sql`true`
          )
        )
        .orderBy(desc(poslanec.idOsoba))
        .limit(input.pageSize)
        .offset(offset);

      return rows;
    }),

  detail: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [p] = await ctx.db
        .select({
          id: poslanec.id,
          idOsoba: poslanec.idOsoba,
          idObdobi: poslanec.idObdobi,
          obdobiNazev: volebniObdobi.nazev,
          jmeno: osoba.jmeno,
          prijmeni: osoba.prijmeni,
          titulPred: osoba.titulPred,
          titulZa: osoba.titulZa,
          narozeni: osoba.narozeni,
          pohlavi: osoba.pohlavi,
          fotoUrl: osoba.fotoUrl,
          region: poslanec.region,
          web: poslanec.web,
          email: poslanec.email,
        })
        .from(poslanec)
        .innerJoin(osoba, eq(osoba.id, poslanec.idOsoba))
        .innerJoin(volebniObdobi, eq(volebniObdobi.id, poslanec.idObdobi))
        .where(eq(poslanec.id, input.id))
        .limit(1);

      if (!p) return null;

      // Kluby (přes zarazeni → organ)
      const kluby = await ctx.db
        .select({
          idOrgan: organ.id,
          nazev: organ.nazev,
          zkratka: organ.zkratka,
          role: coalition.role,
        })
        .from(zarazeni)
        .innerJoin(organ, eq(organ.id, zarazeni.idOf))
        .leftJoin(
          coalition,
          and(eq(coalition.idObdobi, p.idObdobi), eq(coalition.idOrgan, organ.id))
        )
        .where(and(eq(zarazeni.idOsoba, p.idOsoba), eq(zarazeni.clFunkce, 0)));

      return { ...p, kluby };
    }),

  /** Hlasovací matice poslance — agregace posledních N hlasování */
  votingMatrix: publicProcedure
    .input(z.object({ id: z.number().int(), limit: z.number().int().min(10).max(200).default(50) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.execute(
        sql`SELECT h.id, h.datum, h.nazev, h.vysledek, hp.vysledek AS muj_hlas
            FROM hlasovani_poslanec hp
            INNER JOIN hlasovani h ON h.id = hp.id_hlasovani
            WHERE hp.id_poslanec = ${input.id}
            ORDER BY h.datum DESC NULLS LAST
            LIMIT ${input.limit}`
      );
    }),

  currentTerm: publicProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.db
      .select()
      .from(volebniObdobi)
      .where(eq(volebniObdobi.aktualni, true))
      .limit(1);
    return row ?? null;
  }),

  terms: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(volebniObdobi).orderBy(desc(volebniObdobi.id));
  }),
});