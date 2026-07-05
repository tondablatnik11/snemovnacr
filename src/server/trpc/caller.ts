// Server caller — pro RSC (Server Components)

import "server-only";
import { appRouter } from "./routers/_app";
import { createContext } from "./context";

// Vytvoří server-side caller, který se volá z React Server Components.
export async function getServerCaller() {
  const ctx = await createContext({} as never);
  return appRouter.createCaller(ctx);
}