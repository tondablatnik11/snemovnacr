import Link from "next/link";
import { Vote, Calendar } from "lucide-react";
import { getServerCaller } from "~/server/trpc/caller";
import { VOTE_CODE_CLASS, decodeVote } from "~/lib/vote-codes";
import { cn } from "~/lib/utils";

interface SearchParams {
  search?: string;
  page?: string;
}

export default async function HlasovaniPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const caller = await getServerCaller();
  const term = (await caller.poslanci.currentTerm())?.id ?? 10;
  const list = await caller.hlasovani.list({
    term,
    search: params.search || undefined,
    page: params.page ? parseInt(params.page, 10) : 1,
  });

  return (
    <div className="container py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Vote className="h-7 w-7 text-primary" />
          Hlasování
        </h1>
        <p className="text-muted-foreground mt-1">Aktuální období · timeline všech hlasování</p>
      </header>

      <form className="mb-6 flex gap-2">
        <input
          name="search"
          defaultValue={params.search ?? ""}
          placeholder="Hledat v názvech…"
          className="flex-1 px-3 py-2 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button className="px-4 py-2 rounded-md bg-primary text-primary-foreground">Hledat</button>
      </form>

      {list.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground border border-dashed rounded-md">
          Žádná hlasování. Spusťte <code className="px-1.5 py-0.5 rounded bg-muted">pnpm etl:run --dataset=hlasovani --term={term}</code>.
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((v) => {
            const total = (v.pro ?? 0) + (v.proti ?? 0) + (v.zdrzel ?? 0);
            const proPct = total > 0 ? (v.pro! / total) * 100 : 0;
            const protiPct = total > 0 ? (v.proti! / total) * 100 : 0;
            const zdrzelPct = total > 0 ? (v.zdrzel! / total) * 100 : 0;
            const verdict = decodeVote(v.vysledek ?? "");
            return (
              <li key={v.id}>
                <Link
                  href={`/hlasovani/${v.id}`}
                  className="block p-4 rounded-md border border-border hover:border-primary/40 hover:bg-muted/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h3 className="font-medium flex-1">{v.nazev}</h3>
                    <span className={cn("inline-block w-7 h-7 rounded text-center text-xs leading-7 font-bold flex-shrink-0", VOTE_CODE_CLASS[verdict.code])}>
                      {verdict.code}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {v.datum ? new Date(v.datum).toLocaleString("cs-CZ") : ""}
                    </span>
                    {v.schuzeCislo && <span>· {v.schuzeCislo}. schůze</span>}
                    <span>· Přihlášeno: {v.prihlaseno ?? "—"}</span>
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                    {proPct > 0 && <div className="bg-vote-pro" style={{ width: `${proPct}%` }} />}
                    {protiPct > 0 && <div className="bg-vote-proti" style={{ width: `${protiPct}%` }} />}
                    {zdrzelPct > 0 && <div className="bg-vote-zdrzel" style={{ width: `${zdrzelPct}%` }} />}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}