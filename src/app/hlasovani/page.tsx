import Link from "next/link";
import { Vote, Search } from "lucide-react";
import type { Metadata } from "next";
import { getServerCaller } from "~/server/trpc/caller";
import { VOTE_CODE_CLASS, decodeVote } from "~/lib/vote-codes";
import { cn } from "~/lib/utils";
import { EmptyState } from "~/components/ui/empty-state";
import { Pagination } from "~/components/ui/pagination";

export const metadata: Metadata = {
  title: "Hlasování",
  description:
    "Kompletní timeline hlasování Poslanecké sněmovny s divergencí od koalice a vizualizací výsledků.",
};

interface SearchParams {
  search?: string;
  from?: string;
  to?: string;
  page?: string;
  [key: string]: string | undefined;
}

export default async function HlasovaniPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const caller = await getServerCaller();
  const term = (await caller.poslanci.currentTerm())?.id ?? 10;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const pageSize = 30;

  const list = await caller.hlasovani.list({
    term,
    search: params.search || undefined,
    from: params.from || undefined,
    to: params.to || undefined,
    page,
    pageSize,
  });

  const hasFilters = Boolean(params.search || params.from || params.to);

  return (
    <div className="container py-8 space-y-6">
      <header>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Vote className="h-7 w-7 text-primary" />
          Hlasování
        </h1>
        <p className="text-muted-foreground mt-1">
          {term}. volební období ·{" "}
          {list.length > 0 ? `stránka ${page} · ${list.length} hlasování` : "žádná hlasování"}
        </p>
      </header>

      <form className="flex gap-2 flex-wrap" role="search">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            name="search"
            defaultValue={params.search ?? ""}
            placeholder="Hledat v názvech…"
            className="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          />
        </div>
        <input
          type="date"
          name="from"
          defaultValue={params.from ?? ""}
          aria-label="Od data"
          className="px-3 py-2 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
        />
        <input
          type="date"
          name="to"
          defaultValue={params.to ?? ""}
          aria-label="Do data"
          className="px-3 py-2 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
        />
        <button className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm transition-colors">
          Hledat
        </button>
        {hasFilters && (
          <Link
            href="/hlasovani"
            className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Vyčistit filtry
          </Link>
        )}
      </form>

      {list.length === 0 ? (
        <EmptyState
          icon={Vote}
          title={hasFilters ? "Žádná hlasování neodpovídají filtru" : "Žádná hlasování"}
          description={
            hasFilters
              ? "Zkuste rozšířit vyhledávání nebo odstranit datumové filtry."
              : `Spusťte pnpm etl:run --dataset=hlasovani --term=${term} pro načtení dat.`
          }
          action={
            hasFilters ? { label: "Vyčistit filtry", href: "/hlasovani" } : undefined
          }
        />
      ) : (
        <>
          <ul className="space-y-2">
            {list.map((v) => {
              const pro = v.pro ?? 0;
              const proti = v.proti ?? 0;
              const zdrzel = v.zdrzel ?? 0;
              const total = pro + proti + zdrzel;
              const proPct = total > 0 ? (pro / total) * 100 : 0;
              const protiPct = total > 0 ? (proti / total) * 100 : 0;
              const zdrzelPct = total > 0 ? (zdrzel / total) * 100 : 0;
              const verdict = decodeVote(v.vysledek ?? "");
              return (
                <li key={v.id}>
                  <Link
                    href={`/hlasovani/${v.id}`}
                    className="block p-4 rounded-md border border-border hover:border-primary/40 hover:bg-muted/30 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <h3 className="font-medium flex-1">{v.nazev}</h3>
                      <span
                        className={cn(
                          "inline-flex items-center justify-center w-7 h-7 rounded text-xs leading-7 font-bold flex-shrink-0",
                          VOTE_CODE_CLASS[verdict.code]
                        )}
                        title={verdict.label}
                      >
                        {verdict.code}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                      <span>
                        {v.datum ? new Date(v.datum).toLocaleString("cs-CZ") : "—"}
                      </span>
                      {v.schuzeCislo && <span>· {v.schuzeCislo}. schůze</span>}
                      <span>· Přihlášeno: {v.prihlaseno ?? "—"}</span>
                    </div>
                    <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                      {proPct > 0 && (
                        <div className="bg-vote-pro" style={{ width: `${proPct}%` }} />
                      )}
                      {protiPct > 0 && (
                        <div className="bg-vote-proti" style={{ width: `${protiPct}%` }} />
                      )}
                      {zdrzelPct > 0 && (
                        <div className="bg-vote-zdrzel" style={{ width: `${zdrzelPct}%` }} />
                      )}
                    </div>
                    <div className="flex justify-between mt-1.5 text-xs text-muted-foreground tabular-nums">
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full bg-vote-pro" />
                        Pro {pro}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full bg-vote-proti" />
                        Proti {proti}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full bg-vote-zdrzel" />
                        Zdržel {zdrzel}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          <Pagination
            currentPage={page}
            basePath="/hlasovani"
            searchParams={params}
            hasNext={list.length === pageSize}
          />
        </>
      )}
    </div>
  );
}