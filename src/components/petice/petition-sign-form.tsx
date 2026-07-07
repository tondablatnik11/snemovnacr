"use client";

import { useState } from "react";
import { Save, CheckCircle2, Mail } from "lucide-react";
import { toast } from "sonner";
import { api } from "~/trpc/client";

export function PetitionSignForm({ peticeId }: { peticeId: string }) {
  const [jmeno, setJmeno] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const sign = api.petice.sign.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Podpis zaznamenán", {
        description: "Děkujeme za vaši podporu této petice.",
      });
    },
    onError: (e) => {
      toast.error("Nepodařilo se odeslat podpis", {
        description: e.message,
      });
    },
  });

  if (submitted) {
    return (
      <div className="p-6 rounded-md bg-vote-pro/10 border border-vote-pro/30 text-sm space-y-2">
        <div className="flex items-center gap-2 font-medium text-vote-pro">
          <CheckCircle2 className="h-4 w-4" />
          Děkujeme! Váš podpis byl zaznamenán.
        </div>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Pokud jste se přihlásili, podpis je ověřen automaticky. V opačném případě
          vám může přijít potvrzovací e-mail.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        sign.mutate({
          peticeId,
          jmeno: jmeno.trim(),
          email: email.trim(),
          commentMd: comment.trim() || undefined,
        });
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="jmeno" className="text-xs font-medium text-muted-foreground">
            Jméno a příjmení
          </label>
          <input
            id="jmeno"
            required
            minLength={2}
            maxLength={80}
            value={jmeno}
            onChange={(e) => setJmeno(e.target.value)}
            placeholder="Jan Novák"
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-medium text-muted-foreground">
            E-mail
          </label>
          <input
            id="email"
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jan@example.cz"
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="comment" className="text-xs font-medium text-muted-foreground">
          Komentář <span className="text-muted-foreground/70">(volitelně, max 500 znaků)</span>
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Proč tuto petici podporuji…"
          rows={3}
          maxLength={500}
          className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none transition-colors"
        />
        {comment.length > 400 && (
          <div className="text-xs text-muted-foreground text-right">
            {comment.length}/500
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Mail className="h-3 w-3" />
        Podpisem souhlasíte s použitím e-mailu pouze pro účely této petice.
      </p>
      <button
        type="submit"
        disabled={sign.isPending}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        <Save className="h-4 w-4" />
        {sign.isPending ? "Odesílám…" : "Podepsat petici"}
      </button>
    </form>
  );
}