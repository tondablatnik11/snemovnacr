"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw, Home } from "lucide-react";

/**
 * Globální chybový boundary pro Next.js App Router.
 * Loguje chybu do console (v produkci je zobrazeno jen `digest`).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[App Error]", {
      name: error.name,
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <div className="container py-16 max-w-2xl">
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <h1 className="text-2xl font-bold text-destructive">Něco se pokazilo</h1>
            <p className="text-muted-foreground mt-2">
              Při načítání stránky došlo k chybě. Zkuste to prosím znovu.
            </p>
          </div>
        </div>

        {error.digest && (
          <div className="text-xs text-muted-foreground space-y-1 bg-background/50 p-3 rounded border border-border">
            <div className="font-medium">ID chyby</div>
            <div className="font-mono text-foreground">{error.digest}</div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm transition-colors"
          >
            <RotateCw className="h-4 w-4" />
            Zkusit znovu
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-background hover:bg-muted text-sm transition-colors"
          >
            <Home className="h-4 w-4" />
            Domů
          </Link>
        </div>
      </div>
    </div>
  );
}