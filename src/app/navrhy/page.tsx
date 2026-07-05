import Link from "next/link";
import { FileText, ExternalLink } from "lucide-react";
import { getServerCaller } from "~/server/trpc/caller";
import { formatTiskId } from "~/lib/format";
import { pspTiskUrl } from "~/lib/constants";

interface SearchParams {
  search?: string;
}

export default async function NavrhyPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const caller = await getServerCaller();
  const term = (await caller.poslanci.currentTerm())?.id ?? 10;
  const list = await caller.tisk.list({
    term,
    search: params.search || undefined,
    pageSize: 50,
  });

  return (
    <div className="container py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-7 w-7 text-primary" />
          Návrhy zákonů
        </h1>
        <p className="text-muted-foreground mt-1">Sněmovní tisky {term}. volebního období</p>
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
          Žádné tisky. Spusťte <code className="px-1.5 py-0.5 rounded bg-muted">pnpm etl:run --dataset=tisky</code>.
        </div>
      ) : (
        <ul className="divide-y divide-border border border-border rounded-md">
          {list.map((t) => (
            <li key={t.id}>
              <Link
                href={`/navrhy/${t.id}`}
                className="flex items-start justify-between gap-4 p-4 hover:bg-muted/40"
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
                  className="text-muted-foreground hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}