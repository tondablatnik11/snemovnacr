// tRPC router: kluby (poslanecké kluby)
import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { organ, coalition, volebniObdobi, zarazeni, poslanec, osoba } from "~/server/db/schema/psp";
import { and, desc, eq, sql } from "drizzle-orm";

export const klubyRouter = router({
  list: publicProcedure
    .input(z.object({ term: z.number().int().default(10) }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          id: organ.id,
          nazev: organ.nazev,
          zkratka: organ.zkratka,
          koaliceRole: coalition.role,
        })
        .from(organ)
        .leftJoin(
          coalition,
          and(eq(coalition.idObdobi, organ.idObdobi), eq(coalition.idOrgan, organ.id))
        )
        .where(and(eq(organ.idObdobi, input.term), sql`organ.id_typ = 1`)) // typ 1 = klub
        .orderBy(organ.nazev);
    }),

  detail: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [org] = await ctx.db
        .select({
          id: organ.id,
          nazev: organ.nazev,
          zkratka: organ.zkratka,
          idObdobi: organ.idObdobi,
          obdobiNazev: volebniObdobi.nazev,
          koaliceRole: coalition.role,
        })
        .from(organ)
        .innerJoin(volebniObdobi, eq(volebniObdobi.id, organ.idObdobi))
        .leftJoin(
          coalition,
          and(eq(coalition.idObdobi, organ.idObdobi), eq(coalition.idOrgan, organ.id))
        )
        .where(eq(organ.id, input.id))
        .limit(1);

      if (!org) return null;

      const members = await ctx.db
        .select({
          id: poslanec.id,
          jmeno: osoba.jmeno,
          prijmeni: osoba.prijmeni,
          titulPred: osoba.titulPred,
          fotoUrl: osoba.fotoUrl,
        })
        .from(zarazeni)
        .innerJoin(poslanec, eq(poslanec.idOsoba, zarazeni.idOsoba))
        .innerJoin(osoba, eq(osoba.id, zarazeni.idOsoba))
        .where(and(eq(zarazeni.idOf, input.id), eq(zarazeni.clFunkce, 0)))
        .orderBy(osoba.prijmeni);

      return { ...org, members };
    }),
});