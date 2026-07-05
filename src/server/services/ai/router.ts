// Intent router — klasifikuje dotaz, aby mohl UI přesměrovat
// nebo pre-filtrovat RAG.

import { generateObject } from "ai";
import { z } from "zod";
import { routerModel } from "./nvidia";
import { ROUTER_PROMPT } from "./prompts";
import { logger } from "~/lib/logger";

const IntentSchema = z.object({
  intent: z.enum(["HLASOVANI", "POSLANEC", "TISK", "OBECNE", "CHAT", "PARTICIPACE"]),
  confidence: z.number().min(0).max(1),
  entities: z.array(z.string()).default([]),
  query: z.string(),
});

export type Intent = z.infer<typeof IntentSchema>;

export async function classifyIntent(question: string): Promise<Intent> {
  const prompt = ROUTER_PROMPT.replace("{question}", question);

  try {
    const { object } = await generateObject({
      model: routerModel,
      prompt,
      schema: IntentSchema,
      temperature: 0.1,
      maxTokens: 200,
    });
    return object;
  } catch (err) {
    logger.warn({ err: String(err) }, "× Intent router selhal, default OBECNE");
    return { intent: "OBECNE", confidence: 0.5, entities: [], query: question };
  }
}