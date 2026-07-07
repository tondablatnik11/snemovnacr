import Link from "next/link";
import { FileText, Search } from "lucide-react";
import type { Metadata } from "next";
import { getServerCaller } from "~/server/trpc/caller";
import { formatTiskId } from "~/lib/format";
import { pspTiskUrl } from "~/lib/constants";
import { EmptyState } from "~/components/ui/empty-state";
import { Pagination } from "~/components/ui/pagination";

export const metadata: Metadata = {
  title: "Návrhy zákonů",
  description:
    "Sněmovní tisky (návrhy zákonů) s procedurou od doručení po vyhlášení ve Sbírce zákonů.",
};

interface SearchParams {
  search?: string;
  druh?: string;
  page?: string;
  [key: string]: string | undefined;
}

const DRUHY = [
  { value: "NAVRH_ZAKONA", label: "Návrh zákona" },
  { value: "DOPIS", label: "Dopis" },
  { value: "ZPRAVA", label: "Zpráva" },
  { value: "USNESENI", label: "Usnesení" },
  { value: "ROZPOR", label: "Rozpor" },
  { value: "INTERPELACE", label: "Interpelace" },
] as const;

export default async function NavrhyPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const caller = await getServerCaller();
  const term = (await caller.poslanci.currentTerm())?.id ?? 10;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const pageSize = 30;

  const druh = (params.druh ?? "") as
    | (typeof DRUHY)[number]["value"]
    | ""
    | undefined;

  const list = await caller.tisk.list({
    term,
    search: params.search || undefined,
    druh: druh || undefined,
    page,
    pageSize,
  });

  const hasFilters = Boolean(params.search || params.druh);

  return (
    <div className="container py-8 space-y-6">
      <header>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-7 w-7 text-primary" />
          Návrhy zákonů
        </h1>
        <p className="text-muted-foreground mt-1">
          Sněmovní tisky {term}. volebního období ·{" "}
          {list.length > 0 ? `stránka ${page}` : "žádné tisky"}
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
        <select
          name="druh"
          defaultValue={params.druh ?? ""}
          className="px-3 py-2 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          aria-label="Filtr podle druhu"
        >
          <option value="">Všechny druhy</option>
          {DRUHY.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        <button className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm transition-colors">
          Hledat
        </button>
        {hasFilters && (
          <Link
            href="/navrhy"
            className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Vyčistit filtry
          </Link>
        )}
      </form>

      {list.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={hasFilters ? "Žádné tisky neodpovídají filtru" : "Žádné tisky"}
          description={
            hasFilters
              ? "Zkuste rozšířit vyhledávání nebo vybrat jiný druh."
              : "Spusťte pnpm etl:run --dataset=tisky pro načtení dat."
          }
          action={hasFilters ? { label: "Vyčistit filtry", href: "/navrhy" } : undefined}
        />
      ) : (
        <>
          <ul className="divide-y divide-border border border-border rounded-md">
            {list.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/navrhy/${t.id}`}
                  className="flex items-start justify-between gap-4 p-4 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground mb-1">
                      Tisk č. {formatTiskId(t.cislo, t.cisloZa)}
                      {t.druh && <span className="ml-2">· {t.druh.replace("_", " ")}</span>}
                    </div>
                    <div className="font-medium">{t.nazev}</div>
                    {t.datumDoruceni && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Doručeno {new Date(t.datumDoruceni).toLocaleDateString("cs-CZ")}
                      </div>
                    )}
                  </div>
                  <a
                    href={pspTiskUrl(t.id, term)}
                    target="_blank"
                    rel="noopener"
                    className="text-muted-foreground hover:text-foreground flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Otevřít na psp.cz"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </Link>
              </li>
            ))}
          </ul>

          <Pagination
            currentPage={page}
            basePath="/navrhy"
            searchParams={params}
            hasNext={list.length === pageSize}
          />
        </>
      )}
    </div>
  );
}