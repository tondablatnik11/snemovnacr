"use client";

import { useState } from "react";
import { Save } from "lucide-react";

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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/admin/coalition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: kluby.map((k) => ({ idOrgan: k.id, role: k.role })) }),
      });
      setSaved(true);
    } catch {
      alert("Uložení selhalo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-border border border-border rounded-md">
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
        disabled={saving}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {saving ? "Ukládám…" : "Uložit změny"}
      </button>
      {saved && <p className="text-sm text-vote-pro">✓ Uloženo.</p>}
    </div>
  );
}