import { streamText, type UIMessage } from "ai";
import { chatStream } from "~/server/services/ai/chat";

/**
 * AI SDK 5 chat endpoint.
 * Request body: { messages: UIMessage[] }
 * Response: AI-UI-Message streaming protocol
 */
export async function POST(req: Request) {
  const body = (await req.json()) as { messages: UIMessage[] };
  const result = await chatStream({ messages: body.messages });
  return result.toUIMessageStreamResponse();
}