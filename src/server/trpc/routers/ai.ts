// tRPC router: AI
import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { classifyIntent } from "~/server/services/ai/router";
import { SUGGESTED_QUESTIONS } from "~/server/services/ai/prompts";

export const aiRouter = router({
  classify: publicProcedure
    .input(z.object({ question: z.string().min(3) }))
    .mutation(async ({ input }) => {
      return classifyIntent(input.question);
    }),

  suggestedQuestions: publicProcedure.query(() => SUGGESTED_QUESTIONS),
});