import Link from "next/link";
import { Users, Search } from "lucide-react";
import type { Metadata } from "next";
import { getServerCaller } from "~/server/trpc/caller";
import { formatFullName } from "~/lib/format";
import { pspPhotoUrl } from "~/lib/constants";
import { EmptyState } from "~/components/ui/empty-state";
import { Pagination } from "~/components/ui/pagination";

export const metadata: Metadata = {
  title: "Poslanci",
  description:
    "Seznam všech poslanců aktuálního volebního období — profily, hlasovací historie, kontakty.",
};

interface SearchParams {
  search?: string;
  klub?: string;
  page?: string;
  [key: string]: string | undefined;
}

export default async function PoslanciPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const caller = await getServerCaller();

  // Paralelně načteme term, kluby (pro filtr) a poslance
  const [termData, kluby] = await Promise.all([
    caller.poslanci.currentTerm(),
    caller.poslanci
      .currentTerm()
      .then((t) => caller.kluby.list({ term: t?.id ?? 10 }).catch(() => [])),
  ]);

  const term = termData?.id ?? 10;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const pageSize = 60;

  const list = await caller.poslanci.list({
    term,
    search: params.search || undefined,
    clubId: params.klub ? parseInt(params.klub, 10) : undefined,
    page,
    pageSize,
  });

  return (
    <div className="container py-8 space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" />
            Poslanci
          </h1>
          <p className="text-muted-foreground mt-1">
            {term}. volební období · {list.length > 0 ? `stránka ${page}` : "žádní poslanci"}
          </p>
        </div>
      </header>

      <form className="flex gap-2 flex-wrap" role="search">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            name="search"
            defaultValue={params.search ?? ""}
            placeholder="Hledat jméno…"
            className="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          />
        </div>
        <select
          name="klub"
          defaultValue={params.klub ?? ""}
          className="px-3 py-2 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          aria-label="Filtr podle klubu"
        >
          <option value="">Všechny kluby</option>
          {kluby.map((k) => (
            <option key={k.id} value={k.id}>
              {k.nazev}
            </option>
          ))}
        </select>
        <button className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm transition-colors">
          Hledat
        </button>
        {(params.search || params.klub) && (
          <Link
            href="/poslanci"
            className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Vyčistit filtry
          </Link>
        )}
      </form>

      {list.length === 0 ? (
        <EmptyState
          icon={Users}
          title={params.search || params.klub ? "Žádní poslanci neodpovídají filtru" : "Žádní poslanci"}
          description={
            params.search || params.klub
              ? "Zkuste změnit vyhledávací dotaz nebo filtr."
              : `Spusťte pnpm etl:run --dataset=poslanci pro načtení dat.`
          }
          action={
            params.search || params.klub
              ? { label: "Vyčistit filtry", href: "/poslanci" }
              : undefined
          }
        />
      ) : (
        <>
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {list.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/poslanci/${p.id}`}
                  className="block p-3 rounded-md border border-border hover:border-primary/40 hover:bg-muted/50 transition-all group"
                >
                  <div className="aspect-square mb-2 rounded-md bg-muted overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.fotoUrl ?? pspPhotoUrl(p.idOsoba, term, true)}
                      alt={p.prijmeni}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                  </div>
                  <div className="text-sm font-medium truncate">
                    {formatFullName({
                      titulPred: p.titulPred,
                      jmeno: p.jmeno,
                      prijmeni: p.prijmeni,
                      titulZa: p.titulZa,
                    })}
                  </div>
                  {p.region && (
                    <div className="text-xs text-muted-foreground truncate">{p.region}</div>
                  )}
                </Link>
              </li>
            ))}
          </ul>

          <Pagination
            currentPage={page}
            basePath="/poslanci"
            searchParams={params}
            hasNext={list.length === pageSize}
          />
        </>
      )}
    </div>
  );
}