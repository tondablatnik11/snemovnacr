import { MessageSquare } from "lucide-react";
import { ChatWindow } from "~/components/ai/chat-window";
import { SuggestedQuestions } from "~/components/ai/suggested-questions";
import { getServerCaller } from "~/server/trpc/caller";

export default async function AiPage() {
  const caller = await getServerCaller();
  const questions = await caller.ai.suggestedQuestions();

  return (
    <div className="container max-w-3xl py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MessageSquare className="h-7 w-7 text-primary" />
          AI asistent
        </h1>
        <p className="text-muted-foreground mt-1">
          Ptejte se v češtině. Odpovědi vycházejí z oficiálních dat Sněmovny s citacemi.
        </p>
      </header>

      <SuggestedQuestions questions={questions} />
      <ChatWindow />
    </div>
  );
}