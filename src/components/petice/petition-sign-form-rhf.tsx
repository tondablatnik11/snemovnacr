"use client";

// Petition sign form s react-hook-form + zod resolver.
// Lepší UX: validace onChange, méně re-renderů, typová bezpečnost.

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, CheckCircle2, Mail, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "~/trpc/client";

/** Zod schema pro formulář — single source of truth pro validaci i typy. */
const signSchema = z.object({
  jmeno: z.string()
    .trim()
    .min(2, "Jméno musí mít alespoň 2 znaky")
    .max(80, "Jméno může mít maximálně 80 znaků"),
  email: z.string()
    .trim()
    .email("Neplatná e-mailová adresa")
    .max(120, "E-mail je příliš dlouhý"),
  comment: z.string()
    .max(500, "Komentář může mít maximálně 500 znaků")
    .optional()
    .or(z.literal("")),
 同意: z.literal(true, {
    errorMap: () => ({ message: "Pro odeslání musíte souhlasit se zpracováním e-mailu" }),
  }),
});

type SignInput = z.infer<typeof signSchema>;

export function PetitionSignFormRHF({ peticeId }: { peticeId: string }) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, isValid },
  } = useForm<SignInput>({
    resolver: zodResolver(signSchema),
    mode: "onBlur", // validuje při opuštění pole — dobrý UX kompromis
    defaultValues: {
      jmeno: "",
      email: "",
      comment: "",
      同意: false as unknown as true, // hack pro typy — false na startu
    },
  });

  const comment = watch("comment") ?? "";

  const sign = api.petice.sign.useMutation({
    onSuccess: () => {
      toast.success("Podpis zaznamenán", {
        description: "Děkujeme za vaši podporu této petice.",
      });
      reset();
    },
    onError: (e) => {
      toast.error("Nepodařilo se odeslat podpis", {
        description: e.message,
      });
    },
  });

  async function onSubmit(values: SignInput) {
    sign.mutate({
      peticeId,
      jmeno: values.jmeno,
      email: values.email,
      commentMd: values.comment || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Jméno a příjmení" htmlFor="jmeno" error={errors.jmeno?.message}>
          <input
            id="jmeno"
            type="text"
            autoComplete="name"
            {...register("jmeno")}
            placeholder="Jan Novák"
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </Field>
        <Field label="E-mail" htmlFor="email" error={errors.email?.message}>
          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register("email")}
            placeholder="jan@example.cz"
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </Field>
      </div>

      <Field
        label="Komentář"
        htmlFor="comment"
        error={errors.comment?.message}
        hint={comment.length > 0 ? `${comment.length}/500` : undefined}
      >
        <textarea
          id="comment"
          rows={3}
          maxLength={500}
          {...register("comment")}
          placeholder="Proč tuto petici podporuji…"
          className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none transition-colors"
        />
      </Field>

      <Field error={errors.同意?.message}>
        <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            {...register("同意")}
            className="mt-0.5 rounded border-border text-primary focus:ring-2 focus:ring-ring"
          />
          <span className="flex items-center gap-1">
            <Mail className="h-3 w-3" />
            Souhlasím se zpracováním e-mailu pro účely této petice.
          </span>
        </label>
      </Field>

      <button
        type="submit"
        disabled={isSubmitting || !isValid}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Odesílám…
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            Podepsat petici
          </>
        )}
      </button>
    </form>
  );
}

/** Helper komponenta — label + input + error message. */
function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
          {label}
        </label>
      )}
      {children}
      {hint && !error && (
        <div className="text-xs text-muted-foreground text-right">{hint}</div>
      )}
      {error && (
        <div className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </div>
      )}
    </div>
  );
}