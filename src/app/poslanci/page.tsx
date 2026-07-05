import Link from "next/link";
import { Users } from "lucide-react";
import { getServerCaller } from "~/server/trpc/caller";
import { formatFullName } from "~/lib/format";
import { pspPhotoUrl } from "~/lib/constants";

interface SearchParams {
  search?: string;
  klub?: string;
  page?: string;
}

export default async function PoslanciPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const caller = await getServerCaller();
  const term = (await caller.poslanci.currentTerm())?.id ?? 10;
  const list = await caller.poslanci.list({
    term,
    search: params.search || undefined,
    clubId: params.klub ? parseInt(params.klub, 10) : undefined,
    page: params.page ? parseInt(params.page, 10) : 1,
    pageSize: 60,
  });

  return (
    <div className="container py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" />
            Poslanci
          </h1>
          <p className="text-muted-foreground mt-1">Aktuální období · {list.length} poslanců</p>
        </div>
      </header>

      <form className="mb-6 flex gap-2">
        <input
          name="search"
          defaultValue={params.search ?? ""}
          placeholder="Hledat jméno…"
          className="flex-1 px-3 py-2 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
          Hledat
        </button>
      </form>

      {list.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground border border-dashed rounded-md">
          Žádní poslanci. Spusťte <code className="px-1.5 py-0.5 rounded bg-muted">pnpm etl:run --dataset=poslanci</code> pro načtení dat.
        </div>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {list.map((p) => (
            <li key={p.id}>
              <Link
                href={`/poslanci/${p.id}`}
                className="block p-3 rounded-md border border-border hover:border-primary/40 hover:bg-muted/50 transition-all"
              >
                <div className="aspect-square mb-2 rounded-md bg-muted overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.fotoUrl ?? pspPhotoUrl(p.idOsoba, term, true)}
                    alt={p.prijmeni}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="text-sm font-medium truncate">
                  {formatFullName({ titulPred: p.titulPred, jmeno: p.jmeno, prijmeni: p.prijmeni, titulZa: p.titulZa })}
                </div>
                {p.region && <div className="text-xs text-muted-foreground truncate">{p.region}</div>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}