import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "~/server/trpc/routers/_app";
import { createContext } from "~/server/trpc/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext({} as never),
    onError: ({ error, path }) => {
      if (process.env.NODE_ENV !== "production") {
        console.error(`tRPC error on ${path ?? "<unknown>"}:`, error);
      }
    },
  });

export { handler as GET, handler as POST };