"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <div className="container max-w-md py-12">
      <h1 className="text-2xl font-bold mb-6">Přihlášení</h1>

      <div className="space-y-3">
        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="w-full px-4 py-2 rounded-md border border-border bg-background hover:bg-muted"
        >
          Pokračovat přes Google
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-2 text-muted-foreground">nebo</span>
          </div>
        </div>

        {!sent ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              signIn("resend", { email, callbackUrl: "/dashboard" });
              setSent(true);
            }}
            className="space-y-2"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-mail"
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              className="w-full px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Poslat magic link
            </button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground text-center p-4 border border-border rounded-md">
            Magic link byl odeslán na {email}. Zkontrolujte doručenou poštu.
          </p>
        )}
      </div>
    </div>
  );
}