// tRPC context — dostává request + DB + auth

import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { auth } from "~/server/auth/config";
import { db } from "~/server/db";

export async function createContext(_opts: FetchCreateContextFnOptions) {
  const session = await auth();
  return {
    db,
    user: session?.user ?? null,
    requestId: crypto.randomUUID(),
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;