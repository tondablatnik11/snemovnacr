import { notFound } from "next/navigation";
import Link from "next/link";
import { Vote, ExternalLink } from "lucide-react";
import { getServerCaller } from "~/server/trpc/caller";
import { VOTE_CODE_CLASS, decodeVote } from "~/lib/vote-codes";
import { pspHlasovaniDetailUrl } from "~/lib/constants";
import { cn } from "~/lib/utils";

export default async function HlasovaniDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const caller = await getServerCaller();
  const detail = await caller.hlasovani.detail({ id: parseInt(id, 10) });
  if (!detail) notFound();

  const verdict = decodeVote(detail.vysledek ?? "");
  const total = (detail.pro ?? 0) + (detail.proti ?? 0) + (detail.zdrzel ?? 0);
  const yesPct = total > 0 ? ((detail.pro ?? 0) / total) * 100 : 0;
  const noPct = total > 0 ? ((detail.proti ?? 0) / total) * 100 : 0;
  const absPct = total > 0 ? ((detail.zdrzel ?? 0) / total) * 100 : 0;

  const hlasy = (Array.isArray(detail.hlasovani) ? detail.hlasovani : []) as Array<{
    poslanec_id: number;
    jmeno: string;
    prijmeni: string;
    titul_pred: string | null;
    vysledek: string;
    klub: string | null;
    klub_id: number | null;
    koalice_role: string | null;
  }>;

  const byKlub = new Map<string, typeof hlasy>();
  for (const h of hlasy) {
    const k = h.klub ?? "—";
    if (!byKlub.has(k)) byKlub.set(k, []);
    byKlub.get(k)!.push(h);
  }

  return (
    <div className="container py-8 space-y-8">
      <header>
        <div className="flex items-start justify-between gap-4 mb-3">
          <h1 className="text-2xl md:text-3xl font-bold flex-1">{detail.nazev}</h1>
          <span className={cn("inline-block w-10 h-10 rounded text-center text-sm leading-10 font-bold flex-shrink-0", VOTE_CODE_CLASS[verdict.code])}>
            {verdict.code}
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          {detail.datum ? new Date(detail.datum).toLocaleString("cs-CZ") : ""}
          {detail.idSchuze && <> · <Link href={`/schuze/${detail.idSchuze}`} className="hover:text-foreground">{detail.idSchuze}. schůze</Link></>}
          <a href={pspHlasovaniDetailUrl(detail.id)} target="_blank" rel="noopener" className="ml-2 inline-flex items-center gap-1 hover:text-foreground">
            <ExternalLink className="h-3 w-3" /> psp.cz
          </a>
        </div>
      </header>

      <section>
        <div className="flex h-8 rounded-md overflow-hidden border border-border">
          {yesPct > 0 && (
            <div className="bg-vote-pro flex items-center justify-center text-white text-sm font-medium" style={{ width: `${yesPct}%` }}>
              {detail.pro}
            </div>
          )}
          {noPct > 0 && (
            <div className="bg-vote-proti flex items-center justify-center text-white text-sm font-medium" style={{ width: `${noPct}%` }}>
              {detail.proti}
            </div>
          )}
          {absPct > 0 && (
            <div className="bg-vote-zdrzel flex items-center justify-center text-black text-sm font-medium" style={{ width: `${absPct}%` }}>
              {detail.zdrzel}
            </div>
          )}
        </div>
      </section>

      {Array.from(byKlub.entries()).map(([klub, members]) => {
        const stats = members.reduce(
          (acc, m) => {
            const v = m.vysledek;
            if (v === "A") acc.pro++;
            else if (v === "B" || v === "N") acc.proti++;
            else if (v === "C") acc.zdrzel++;
            else acc.absent++;
            return acc;
          },
          { pro: 0, proti: 0, zdrzel: 0, absent: 0 }
        );
        return (
          <section key={klub}>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              {klub}
              <span className="text-xs text-muted-foreground font-normal">
                pro {stats.pro} · proti {stats.proti} · zdržel {stats.zdrzel} · {stats.absent}
              </span>
            </h3>
            <ul className="flex flex-wrap gap-2">
              {members.map((m) => {
                const v = decodeVote(m.vysledek);
                return (
                  <li key={m.poslanec_id}>
                    <Link
                      href={`/poslanci/${m.poslanec_id}`}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-border hover:bg-muted text-sm"
                    >
                      <span className={cn("inline-block w-5 h-5 rounded text-center text-xs leading-5 font-bold", VOTE_CODE_CLASS[v.code])}>
                        {v.code}
                      </span>
                      <span>{m.titul_pred ? `${m.titul_pred} ` : ""}{m.jmeno} {m.prijmeni}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}