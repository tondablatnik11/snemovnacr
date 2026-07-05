import { notFound } from "next/navigation";
import Link from "next/link";
import { FileText, ExternalLink, Users } from "lucide-react";
import { getServerCaller } from "~/server/trpc/caller";
import { formatTiskId } from "~/lib/format";
import { pspTiskUrl } from "~/lib/constants";

export default async function TiskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const caller = await getServerCaller();
  const t = await caller.tisk.detail({ id: parseInt(id, 10) });
  if (!t) notFound();

  return (
    <div className="container py-8 space-y-8">
      <header>
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <div className="text-sm text-muted-foreground mb-1">
              Tisk č. {formatTiskId(t.cislo, t.cisloZa)}
              {t.druh && <> · {t.druh.replace("_", " ")}</>}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">{t.nazev}</h1>
          </div>
          <a
            href={pspTiskUrl(t.id, t.idObdobi)}
            target="_blank"
            rel="noopener"
            className="text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-5 w-5" />
          </a>
        </div>
        <div className="text-sm text-muted-foreground">
          {t.datumDoruceni && <>Doručeno {new Date(t.datumDoruceni).toLocaleDateString("cs-CZ")}</>}
        </div>
      </header>

      {t.predkladatele.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Předkladatelé
          </h2>
          <ul className="flex flex-wrap gap-2">
            {t.predkladatele.map((p) => (
              <li key={p.id}>
                {p.osobaPrijmeni ? (
                  <Link
                    href={`/poslanci?search=${encodeURIComponent(p.osobaPrijmeni!)}`}
                    className="px-2 py-1 rounded border border-border hover:bg-muted text-sm"
                  >
                    {p.osobaJmeno} {p.osobaPrijmeni}
                  </Link>
                ) : p.organNazev ? (
                  <Link
                    href={`/kluby/${p.idOrgan}`}
                    className="px-2 py-1 rounded border border-border hover:bg-muted text-sm"
                  >
                    {p.organNazev}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      {t.hist.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Procedura
          </h2>
          <ol className="space-y-1 border-l-2 border-border pl-4 ml-2">
            {t.hist.map((h) => (
              <li key={h.id} className="relative">
                <span className="absolute -left-[1.45rem] top-1.5 h-3 w-3 rounded-full bg-border" />
                <div className="text-sm">
                  <span className="text-muted-foreground">{h.datum ? new Date(h.datum).toLocaleDateString("cs-CZ") : ""}</span>
                  {h.pozn && <span className="ml-2">{h.pozn}</span>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}