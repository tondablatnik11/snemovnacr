import { notFound } from "next/navigation";
import Link from "next/link";
import { Users, ExternalLink, Mail, Globe, MapPin } from "lucide-react";
import { getServerCaller } from "~/server/trpc/caller";
import { formatDate } from "~/lib/format";
import { formatFullName } from "~/lib/format";
import { decodeVote, VOTE_CODE_CLASS } from "~/lib/vote-codes";
import { pspPhotoUrl, pspPoslanecUrl } from "~/lib/constants";

export default async function PoslanecDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const caller = await getServerCaller();
  const detail = await caller.poslanci.detail({ id: parseInt(id, 10) });
  if (!detail) notFound();

  const matrix = await caller.poslanci.votingMatrix({ id: detail.id, limit: 30 });
  const term = detail.idObdobi;

  return (
    <div className="container py-8">
      <header className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="w-32 h-32 md:w-48 md:h-48 rounded-md overflow-hidden bg-muted flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={detail.fotoUrl ?? pspPhotoUrl(detail.idOsoba, term)}
            alt={detail.prijmeni}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 space-y-2">
          <h1 className="text-3xl font-bold">{formatFullName(detail)}</h1>
          <p className="text-muted-foreground">{detail.obdobiNazev}</p>

          <div className="flex flex-wrap gap-2 mt-2">
            {detail.kluby.map((k) => (
              <Link
                key={k.idOrgan}
                href={`/kluby/${k.idOrgan}`}
                className="px-2.5 py-1 text-xs rounded-md bg-muted hover:bg-muted/70 border border-border"
              >
                {k.nazev}
                {k.role === "VLADA" && <span className="ml-1 text-vote-pro">•</span>}
                {k.role === "OPOZICE" && <span className="ml-1 text-vote-proti">•</span>}
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-2">
            {detail.narozeni && (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                Nar. {formatDate(detail.narozeni)}
              </span>
            )}
            {detail.region && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {detail.region}
              </span>
            )}
            {detail.email && (
              <a href={`mailto:${detail.email}`} className="flex items-center gap-1 hover:text-foreground">
                <Mail className="h-3.5 w-3.5" /> {detail.email}
              </a>
            )}
            {detail.web && (
              <a href={detail.web} target="_blank" rel="noopener" className="flex items-center gap-1 hover:text-foreground">
                <Globe className="h-3.5 w-3.5" /> web
              </a>
            )}
            <a href={pspPoslanecUrl(detail.id, term)} target="_blank" rel="noopener" className="flex items-center gap-1 hover:text-foreground">
              <ExternalLink className="h-3.5 w-3.5" /> psp.cz
            </a>
          </div>
        </div>
      </header>

      <section>
        <h2 className="text-xl font-semibold mb-3">Poslední hlasování</h2>
        {!matrix || (Array.isArray(matrix) && matrix.length === 0) ? (
          <div className="p-6 text-muted-foreground border border-dashed rounded-md text-sm">
            Žádná hlasování k zobrazení.
          </div>
        ) : (
          <div className="overflow-x-auto scroll-x border border-border rounded-md">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-3 py-2 font-medium">Datum</th>
                  <th className="px-3 py-2 font-medium">Téma</th>
                  <th className="px-3 py-2 font-medium">Výsledek</th>
                  <th className="px-3 py-2 font-medium">Jeho hlas</th>
                </tr>
              </thead>
              <tbody>
                {(matrix as unknown as Array<{ id: number; datum: Date | null; nazev: string; vysledek: string; muj_hlas: string }>).map((row) => {
                  const v = decodeVote(row.muj_hlas);
                  return (
                    <tr key={row.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                        {row.datum ? new Date(row.datum).toLocaleDateString("cs-CZ") : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <Link href={`/hlasovani/${row.id}`} className="hover:text-primary">
                          {row.nazev}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-block w-6 h-6 rounded text-center text-xs leading-6 font-bold ${VOTE_CODE_CLASS[row.vysledek] ?? "bg-muted"}`}>
                          {row.vysledek}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-block w-6 h-6 rounded text-center text-xs leading-6 font-bold ${VOTE_CODE_CLASS[v.code] ?? "bg-muted"}`}>
                          {v.code}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}