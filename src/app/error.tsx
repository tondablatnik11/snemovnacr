"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log chyby do konzole pro debugging (na Vercelu jde do Functions Logs)
    console.error("[App Error]", error);
  }, [error]);

  return (
    <div className="container py-16 max-w-2xl">
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-destructive">Něco se pokazilo</h1>
          <p className="text-muted-foreground mt-2">
            Při načítání stránky došlo k chybě. Zkuste to prosím znovu.
          </p>
        </div>

        {error.digest && (
          <div className="text-xs text-muted-foreground">
            <span className="font-mono">ID chyby: {error.digest}</span>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={reset}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm"
          >
            Zkusit znovu
          </button>
          <a
            href="/"
            className="px-4 py-2 rounded-md border border-border hover:bg-muted text-sm"
          >
            Domů
          </a>
        </div>
      </div>
    </div>
  );
}