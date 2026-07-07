"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";

type Role = "VLADA" | "OPOZICE" | "NEZARAZENO";

interface Klub {
  id: number;
  nazev: string;
  idObdobi: number;
  obdobiNazev: string | null;
  role: Role | null;
}

export function CoalitionEditor({ initial }: { initial: Klub[] }) {
  const [kluby, setKluby] = useState<Klub[]>(initial);

  async function save() {
    const promise = fetch("/api/admin/coalition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates: kluby.map((k) => ({ idOrgan: k.id, role: k.role })) }),
    }).then(async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    });

    toast.promise(promise, {
      loading: "Ukládám změny…",
      success: "Coalition mapping uložen",
      error: (err) => `Uložení selhalo: ${err.message ?? err}`,
    });
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-border border border-border rounded-md bg-card">
        {kluby.map((k, i) => (
          <li key={k.id} className="p-4 flex items-center justify-between">
            <span className="font-medium">{k.nazev}</span>
            <select
              value={k.role ?? ""}
              onChange={(e) => {
                const next = [...kluby];
                next[i] = { ...k, role: (e.target.value as Role) || null };
                setKluby(next);
              }}
              className="px-3 py-1.5 rounded-md border border-border bg-background text-sm"
            >
              <option value="">— nezadáno —</option>
              <option value="VLADA">Koalice</option>
              <option value="OPOZICE">Opozice</option>
              <option value="NEZARAZENO">Nezarazeno</option>
            </select>
          </li>
        ))}
      </ul>
      <button
        onClick={save}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
      >
        <Save className="h-4 w-4" />
        Uložit změny
      </button>
    </div>
  );
}