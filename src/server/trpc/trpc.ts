// tRPC init + middlewares

import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const middleware = t.middleware;
export const publicProcedure = t.procedure;

const loggerMiddleware = middleware(async ({ path, type, next }) => {
  const start = Date.now();
  const result = await next();
  const ms = Date.now() - start;
  if (result.ok) {
    console.log(`tRPC ${type} ${path} — ${ms}ms`);
  } else {
    console.error(`tRPC ${type} ${path} — error ${ms}ms`, result.error);
  }
  return result;
});

export const loggedProcedure = t.procedure.use(loggerMiddleware);

const authedMiddleware = middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const protectedProcedure = loggedProcedure.use(authedMiddleware);

const roleMiddleware = (allowed: ("user" | "curator" | "admin")[]) =>
  middleware(async ({ ctx, next }) => {
    if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
    const role = (ctx.user as { role?: string }).role ?? "user";
    if (!allowed.includes(role as "user" | "curator" | "admin")) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  });

export const curatorProcedure = loggedProcedure.use(roleMiddleware(["curator", "admin"]));
export const adminProcedure = loggedProcedure.use(roleMiddleware(["admin"]));