// Analýzy: divergence, cross-party matrix, kontroverzní hlasování, attendance.
import Link from "next/link";
import { BarChart3, AlertTriangle, Vote, Users } from "lucide-react";
import { getServerCaller } from "~/server/trpc/caller";
import { CrossPartyMatrix, type CrossPartyMatrixData } from "~/components/analytics/cross-party-matrix";
import { formatDateShort } from "~/lib/format";

export const dynamic = "force-dynamic";

export default async function AnalyzyPage() {
  const caller = await getServerCaller();
  const term = (await caller.poslanci.currentTerm())?.id ?? 10;

  const [divergence, matrix, contested] = await Promise.all([
    caller.analytics.divergence({ term, limit: 20 }).catch(() => []),
    caller.analytics.crossPartyMatrix({ term }).catch(() => null),
    caller.analytics.contestedVotes({ daysBack: 90, limit: 5 }).catch(() => []),
  ]);

  return (
    <div className="container py-8 space-y-12">
      <header>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="h-7 w-7 text-primary" />
          Analýzy
        </h1>
        <p className="text-muted-foreground mt-1">
          Hlasovací vzory, divergence od koalice, cross-party matice a kontroverzní hlasování.
        </p>
      </header>

      {/* Sekce 1: Cross-party heatmapa */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Shoda mezi kluby
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Jak často hlasují kluby stejně. Vyšší procento = vyšší shoda.
          </p>
        </div>
        {matrix ? (
          <CrossPartyMatrix data={matrix as CrossPartyMatrixData} />
        ) : (
          <EmptyState message="Cross-party matice se nepodařilo spočítat. Načtěte data o hlasování a coalition mapping." />
        )}
      </section>

      {/* Sekce 2: Top divergence */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Vote className="h-5 w-5 text-primary" />
            Top divergence — poslanci, kteří hlasují proti své koalici
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Poslanci vládních klubů s nejvyšším podílem hlasování proti většině koalice.
          </p>
        </div>
        {divergence.length === 0 ? (
          <EmptyState message="Nedostatek dat. Načtěte hlasování a coalition mapping." />
        ) : (
          <ul className="divide-y divide-border border border-border rounded-md bg-card">
            {divergence.map((d) => (
              <li key={d.poslanec_id} className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">
                <Link
                  href={`/poslanci/${d.poslanec_id}`}
                  className="flex items-center gap-3 flex-1 hover:text-primary"
                >
                  <span className="font-medium">
                    {d.titul_pred ? `${d.titul_pred} ` : ""}
                    {d.jmeno} {d.prijmeni}
                  </span>
                </Link>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-muted-foreground hidden sm:block">
                    {d.souhlas}/{d.total} souhlasí
                  </div>
                  <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="bg-vote-proti h-full transition-all"
                      style={{ width: `${Math.min(100, d.divergence_pct ?? 0)}%` }}
                    />
                  </div>
                  <div className="text-sm font-medium w-12 text-right tabular-nums">
                    {(d.divergence_pct ?? 0).toFixed(1)}%
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Sekce 3: Kontroverzní hlasování */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-vote-proti" />
            Kontroverzní hlasování (posledních 90 dní)
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Úzká výhra/prohra + vysoký rozptyl v koalici — hlasování, kde se koalice rozcházela.
          </p>
        </div>
        {contested.length === 0 ? (
          <EmptyState message="Žádná kontroverzní hlasování za posledních 90 dní." />
        ) : (
          <ul className="divide-y divide-border border border-border rounded-md bg-card">
            {contested.map((v) => (
              <li key={v.hlasovaniId} className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">
                <Link
                  href={`/hlasovani/${v.hlasovaniId}`}
                  className="flex items-center gap-3 flex-1 hover:text-primary"
                >
                  <span className="font-medium flex-1 truncate">{v.nazev}</span>
                </Link>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{formatDateShort(v.datum)}</span>
                  <span className="font-mono">
                    {v.pro}/{v.proti}/{v.zdrzel}
                  </span>
                  {v.koaliceRozptyl > 1 && (
                    <span
                      className="px-1.5 py-0.5 rounded bg-vote-proti/10 text-vote-proti font-medium"
                      title="Počet odlišných koaličních hlasů"
                    >
                      rozptyl {v.koaliceRozptyl}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="p-12 text-center text-muted-foreground border border-dashed rounded-md bg-card">
      {message}
    </div>
  );
}