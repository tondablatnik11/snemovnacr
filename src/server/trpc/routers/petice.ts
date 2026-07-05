// tRPC router: petice
import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { petice, podpis } from "~/server/db/schema/participace";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { slugify } from "~/lib/utils";

export const peticeRouter = router({
  list: publicProcedure
    .input(z.object({ stav: z.enum(["DRAFT", "ACTIVE", "CLOSED", "ARCHIVED"]).optional(), page: z.number().int().min(1).default(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          id: petice.id,
          slug: petice.slug,
          title: petice.title,
          cilovyPocet: petice.cilovyPocet,
          datumOd: petice.datumOd,
          datumDo: petice.datumDo,
          stav: petice.stav,
          signatures: sql<number>`(SELECT COUNT(*) FROM podpis WHERE id_petice = ${petice.id} AND verified = true)`,
        })
        .from(petice)
        .where(input.stav ? eq(petice.stav, input.stav) : sql`true`)
        .orderBy(desc(petice.datumOd))
        .limit(20)
        .offset((input.page - 1) * 20);
    }),

  detail: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const [p] = await ctx.db
        .select()
        .from(petice)
        .where(eq(petice.slug, input.slug))
        .limit(1);
      if (!p) return null;
      const [{ count }] = await ctx.db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(podpis)
        .where(and(eq(podpis.idPetice, p.id), eq(podpis.verified, true)));
      return { ...p, signatureCount: count };
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(10).max(200),
        bodyMd: z.string().min(50).max(20_000),
        cilovyPoslanecId: z.number().int().optional(),
        cilovyTiskId: z.number().int().optional(),
        cilovyPocet: z.number().int().min(10).default(1000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const slug = slugify(input.title);
      const [created] = await ctx.db
        .insert(petice)
        .values({
          slug,
          title: input.title,
          bodyMd: input.bodyMd,
          cilovyPoslanecId: input.cilovyPoslanecId,
          cilovyTiskId: input.cilovyTiskId,
          cilovyPocet: input.cilovyPocet,
          createdById: ctx.user.id,
          stav: "ACTIVE",
        })
        .returning();
      return created;
    }),

  sign: publicProcedure
    .input(
      z.object({
        peticeId: z.string().uuid(),
        jmeno: z.string().min(2).max(80),
        email: z.string().email(),
        commentMd: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id ?? null;
      const inserted = await ctx.db
        .insert(podpis)
        .values({
          idPetice: input.peticeId,
          idUser: userId,
          jmeno: input.jmeno,
          email: input.email,
          commentMd: input.commentMd,
          anonymousId: userId ? null : crypto.randomUUID(),
          verified: userId ? true : false, // auto-verify pro přihlášené
        })
        .onConflictDoNothing()
        .returning();
      if (inserted.length === 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Už jsi podepsal/a." });
      }
      return inserted[0]!;
    }),
});