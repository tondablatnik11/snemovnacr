import { ChatRequest } from "ai";
import { chatStream } from "~/server/services/ai/chat";

// Volá se z useChat() v client komponentě
export async function POST(req: Request) {
  const body = (await req.json()) as ChatRequest;
  const result = await chatStream({ messages: body.messages });
  return result.toDataStreamResponse();
}