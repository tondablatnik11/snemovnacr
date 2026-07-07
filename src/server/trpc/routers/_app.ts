// tRPC root router
import { router } from "../trpc";
import { poslanciRouter } from "./poslanci";
import { hlasovaniRouter } from "./hlasovani";
import { tiskRouter } from "./tisk";
import { klubyRouter } from "./kluby";
import { aiRouter } from "./ai";
import { peticeRouter } from "./petice";
import { sledovaneRouter } from "./sledovane";
import { analyticsRouter } from "./analytics";

export const appRouter = router({
  poslanci: poslanciRouter,
  hlasovani: hlasovaniRouter,
  tisk: tiskRouter,
  kluby: klubyRouter,
  ai: aiRouter,
  petice: peticeRouter,
  sledovane: sledovaneRouter,
  analytics: analyticsRouter,
});

export type AppRouter = typeof appRouter;