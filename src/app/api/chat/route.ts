import { type UIMessage } from "ai";
import { chatStream } from "~/server/services/ai/chat";
import { rateLimit, getClientIp } from "~/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * AI chat endpoint s rate limiting (10 dotazů / minutu / IP).
 *
 * Request body: { messages: UIMessage[] }
 * Response: AI-UI-Message streaming protocol s data parts (sources)
 */
export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = rateLimit(`chat:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({
        error: "Příliš mnoho dotazů. Zkuste to prosím později.",
        retryAfter: rl.retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(rl.retryAfter ?? 60),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  const body = (await req.json()) as { messages: UIMessage[] };
  return chatStream({ messages: body.messages });
}