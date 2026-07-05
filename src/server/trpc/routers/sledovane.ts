// tRPC router: sledování + notifikace
import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { sledovane, notifikace } from "~/server/db/schema/participace";
import { and, desc, eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const targetTypeSchema = z.enum(["HLASOVANI", "TISK", "POSLANEC", "KLUB", "REC", "PETICE"]);

export const sledovaneRouter = router({
  toggle: protectedProcedure
    .input(z.object({ targetType: targetTypeSchema, targetId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select()
        .from(sledovane)
        .where(
          and(
            eq(sledovane.idUser, ctx.user.id),
            eq(sledovane.targetType, input.targetType),
            eq(sledovane.targetId, input.targetId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await ctx.db
          .delete(sledovane)
          .where(
            and(
              eq(sledovane.idUser, ctx.user.id),
              eq(sledovane.targetType, input.targetType),
              eq(sledovane.targetId, input.targetId)
            )
          );
        return { watching: false };
      } else {
        await ctx.db.insert(sledovane).values({
          idUser: ctx.user.id,
          targetType: input.targetType,
          targetId: input.targetId,
          channels: { email: true, web: true },
        });
        return { watching: true };
      }
    }),

  isWatching: protectedProcedure
    .input(z.object({ targetType: targetTypeSchema, targetId: z.string() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({ id: sledovane.idUser })
        .from(sledovane)
        .where(
          and(
            eq(sledovane.idUser, ctx.user.id),
            eq(sledovane.targetType, input.targetType),
            eq(sledovane.targetId, input.targetId)
          )
        )
        .limit(1);
      return rows.length > 0;
    }),

  notifications: protectedProcedure
    .input(z.object({ unreadOnly: z.boolean().default(false), limit: z.number().int().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(notifikace)
        .where(
          and(
            eq(notifikace.idUser, ctx.user.id),
            input.unreadOnly ? sql`${notifikace.readAt} IS NULL` : sql`true`
          )
        )
        .orderBy(desc(notifikace.createdAt))
        .limit(input.limit);
    }),

  markRead: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(notifikace)
        .set({ readAt: new Date() })
        .where(and(eq(notifikace.id, input.id), eq(notifikace.idUser, ctx.user.id)));
      return { ok: true };
    }),
});