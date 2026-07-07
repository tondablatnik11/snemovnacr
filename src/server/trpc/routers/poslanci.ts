// tRPC router: poslanci — typově bezpečné, žádné `as unknown as`.
import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { poslanec, osoba, organ, volebniObdobi, zarazeni, coalition } from "~/server/db/schema/psp";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { paginationSchema, offsetFrom } from "../helpers";

export const poslanciRouter = router({
  list: publicProcedure
    .input(
      paginationSchema.extend({
        term: z.number().int().default(10),
        search: z.string().optional(),
        clubId: z.number().int().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const offset = offsetFrom(input);

      return ctx.db
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
        .leftJoin(
          zarazeni,
          and(eq(zarazeni.idOsoba, poslanec.idOsoba), eq(zarazeni.clFunkce, 0))
        )
        .where(
          and(
            eq(poslanec.idObdobi, input.term),
            input.clubId ? eq(zarazeni.idOf, input.clubId) : sql`true`,
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