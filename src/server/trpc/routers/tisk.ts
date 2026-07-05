// tRPC router: sněmovní tisky (návrhy zákonů)
import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { tisk, tiskHist, predkladatel, osoba, organ } from "~/server/db/schema/psp";
import { and, desc, eq, sql, ilike } from "drizzle-orm";

export const tiskRouter = router({
  list: publicProcedure
    .input(
      z.object({
        term: z.number().int().default(10),
        search: z.string().optional(),
        druh: z.enum(["NAVRH_ZAKONA", "DOPIS", "ZPRAVA", "USNESENI", "ROZPOR", "INTERPELACE", "JINY"]).optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.pageSize;
      const where = and(
        eq(tisk.idObdobi, input.term),
        input.druh ? eq(tisk.druh, input.druh) : sql`true`,
        input.search ? ilike(tisk.nazev, `%${input.search}%`) : sql`true`
      );
      return ctx.db
        .select()
        .from(tisk)
        .where(where)
        .orderBy(desc(tisk.datumDoruceni))
        .limit(input.pageSize)
        .offset(offset);
    }),

  detail: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [t] = await ctx.db
        .select()
        .from(tisk)
        .where(eq(tisk.id, input.id))
        .limit(1);
      if (!t) return null;

      const hist = await ctx.db
        .select()
        .from(tiskHist)
        .where(eq(tiskHist.idTisk, input.id))
        .orderBy(tiskHist.datum);

      const predkladatele = await ctx.db
        .select({
          id: predkladatel.id,
          idOsoba: predkladatel.idOsoba,
          idOrgan: predkladatel.idOrgan,
          osobaJmeno: osoba.jmeno,
          osobaPrijmeni: osoba.prijmeni,
          organNazev: organ.nazev,
        })
        .from(predkladatel)
        .leftJoin(osoba, eq(osoba.id, predkladatel.idOsoba))
        .leftJoin(organ, eq(organ.id, predkladatel.idOrgan))
        .where(eq(predkladatel.idTisk, input.id));

      return { ...t, hist, predkladatele };
    }),

  search: publicProcedure
    .input(z.object({ q: z.string().min(2), limit: z.number().int().min(1).max(30).default(10) }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({ id: tisk.id, cislo: tisk.cislo, cisloZa: tisk.cisloZa, nazev: tisk.nazev, datumDoruceni: tisk.datumDoruceni })
        .from(tisk)
        .where(ilike(tisk.nazev, `%${input.q}%`))
        .orderBy(desc(tisk.datumDoruceni))
        .limit(input.limit);
    }),
});