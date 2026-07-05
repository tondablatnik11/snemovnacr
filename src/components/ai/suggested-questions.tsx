"use client";

import { Lightbulb } from "lucide-react";

export function SuggestedQuestions({ questions }: { questions: string[] }) {
  return (
    <div className="mb-4 space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lightbulb className="h-3.5 w-3.5" />
        Navrhované dotazy
      </div>
      <div className="flex flex-wrap gap-2">
        {questions.map((q) => (
          <button
            key={q}
            type="button"
            className="px-3 py-1.5 text-xs rounded-full border border-border bg-muted/50 hover:bg-muted transition-colors text-left"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}