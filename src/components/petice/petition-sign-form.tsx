"use client";

import { useState } from "react";
import { api } from "~/trpc/client";

export function PetitionSignForm({ peticeId }: { peticeId: string }) {
  const [jmeno, setJmeno] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sign = api.petice.sign.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: (e) => setError(e.message),
  });

  if (submitted) {
    return (
      <div className="p-6 rounded-md bg-vote-pro/10 border border-vote-pro/30 text-sm">
        ✓ Děkujeme! Váš podpis byl zaznamenán.
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        sign.mutate({ peticeId, jmeno, email, commentMd: comment || undefined });
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          required
          value={jmeno}
          onChange={(e) => setJmeno(e.target.value)}
          placeholder="Jméno a příjmení"
          className="px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-mail"
          className="px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Komentář (volitelně, max 500 znaků)"
        rows={3}
        maxLength={500}
        className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={sign.isPending}
        className="w-full px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {sign.isPending ? "Odesílám…" : "Podepsat petici"}
      </button>
    </form>
  );
}