import Link from "next/link";
import { BarChart3, ArrowRight } from "lucide-react";
import { getServerCaller } from "~/server/trpc/caller";

export default async function AnalyzyPage() {
  const caller = await getServerCaller();
  const term = (await caller.poslanci.currentTerm())?.id ?? 10;

  let divergence: Array<{ poslanec_id: number; jmeno: string; prijmeni: string; titul_pred: string | null; total: number; souhlas: number; nesouhlas: number; divergence_pct: number }> = [];
  try {
    divergence = (await caller.hlasovani.divergence({ term, limit: 30 })) as unknown as typeof divergence;
  } catch {
    // DB prázdná
  }

  return (
    <div className="container py-8 space-y-8">
      <header>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="h-7 w-7 text-primary" />
          Analýzy
        </h1>
        <p className="text-muted-foreground mt-1">
          Hlasovací vzory, divergence od koalice, cross-party matice.
        </p>
      </header>

      <section>
        <h2 className="text-xl font-semibold mb-3">Top divergence — poslanci, kteří hlasují proti své koalici</h2>
        {divergence.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground border border-dashed rounded-md">
            Nedostatek dat. Načtěte hlasování a coalition mapping.
          </div>
        ) : (
          <ul className="divide-y divide-border border border-border rounded-md">
            {divergence.map((d) => (
              <li key={d.poslanec_id} className="flex items-center justify-between p-3 hover:bg-muted/30">
                <Link
                  href={`/poslanci/${d.poslanec_id}`}
                  className="flex items-center gap-3 flex-1 hover:text-primary"
                >
                  <span>
                    {d.titul_pred ? `${d.titul_pred} ` : ""}
                    {d.jmeno} {d.prijmeni}
                  </span>
                </Link>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-muted-foreground">
                    {d.souhlas}/{d.total} souhlasí
                  </div>
                  <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="bg-vote-proti h-full" style={{ width: `${Math.min(100, d.divergence_pct)}%` }} />
                  </div>
                  <div className="text-sm font-medium w-12 text-right">{d.divergence_pct}%</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}