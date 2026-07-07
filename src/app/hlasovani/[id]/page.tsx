import { notFound } from "next/navigation";
import Link from "next/link";
import { Vote, ExternalLink, Bell } from "lucide-react";
import type { Metadata } from "next";
import { getServerCaller } from "~/server/trpc/caller";
import { VOTE_CODE_CLASS, decodeVote } from "~/lib/vote-codes";
import { pspHlasovaniDetailUrl } from "~/lib/constants";
import { cn } from "~/lib/utils";
import { WatchToggle } from "~/components/sledovane/watch-toggle";
import { getOptionalUser } from "~/server/auth/perms";
import { env } from "~/lib/env";
import type { HlasovaniDetailRow } from "~/server/db/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const caller = await getServerCaller();
  const detail = await caller.hlasovani.detail({ id: parseInt(id, 10) });
  if (!detail) return { title: "Hlasování nenalezeno" };

  const baseUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const pro = detail.pro ?? 0;
  const proti = detail.proti ?? 0;
  return {
    title: detail.nazev.length > 60 ? detail.nazev.slice(0, 57) + "…" : detail.nazev,
    description: `Výsledek hlasování: ${pro} pro, ${proti} proti. ${detail.datum ? new Date(detail.datum).toLocaleDateString("cs-CZ") : ""}`,
    openGraph: {
      title: `${detail.nazev.slice(0, 60)} · Sněmovna ČR`,
      description: `${pro} pro · ${proti} proti${detail.zdrzel ? ` · ${detail.zdrzel} zdržel` : ""}`,
      type: "article",
      images: [`${baseUrl}/api/og/hlasovani/${id}`],
    },
    twitter: {
      card: "summary_large_image",
      images: [`${baseUrl}/api/og/hlasovani/${id}`],
    },
  };
}

export default async function HlasovaniDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const caller = await getServerCaller();
  const detail = await caller.hlasovani.detail({ id: parseInt(id, 10) });
  if (!detail) notFound();

  const user = await getOptionalUser();

  const verdict = decodeVote(detail.vysledek ?? "");
  const pro = detail.pro ?? 0;
  const proti = detail.proti ?? 0;
  const zdrzel = detail.zdrzel ?? 0;
  const total = pro + proti + zdrzel;
  const yesPct = total > 0 ? (pro / total) * 100 : 0;
  const noPct = total > 0 ? (proti / total) * 100 : 0;
  const absPct = total > 0 ? (zdrzel / total) * 100 : 0;

  const hlasy = (Array.isArray(detail.hlasovani) ? detail.hlasovani : []) as HlasovaniDetailRow[];

  const byKlub = new Map<string, HlasovaniDetailRow[]>();
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
          <div className="flex items-center gap-2 flex-shrink-0">
            {user && <WatchToggle targetType="HLASOVANI" targetId={String(detail.id)} />}
            <span
              className={cn(
                "inline-flex items-center justify-center w-10 h-10 rounded text-sm leading-10 font-bold",
                VOTE_CODE_CLASS[verdict.code]
              )}
              title={verdict.label}
            >
              {verdict.code}
            </span>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {detail.datum ? new Date(detail.datum).toLocaleString("cs-CZ") : ""}
          {detail.idSchuze && (
            <>
              {" · "}
              <Link href={`/schuze/${detail.idSchuze}`} className="hover:text-foreground">
                {detail.idSchuze}. schůze
              </Link>
            </>
          )}
          <a
            href={pspHlasovaniDetailUrl(detail.id)}
            target="_blank"
            rel="noopener"
            className="ml-2 inline-flex items-center gap-1 hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3" /> psp.cz
          </a>
        </div>
      </header>

      <section aria-label="Výsledek hlasování">
        <div
          className="flex h-8 rounded-md overflow-hidden border border-border"
          role="img"
          aria-label={`Pro ${pro}, proti ${proti}, zdržel ${zdrzel}`}
        >
          {yesPct > 0 && (
            <div
              className="bg-vote-pro flex items-center justify-center text-white text-sm font-medium"
              style={{ width: `${yesPct}%` }}
            >
              {pro}
            </div>
          )}
          {noPct > 0 && (
            <div
              className="bg-vote-proti flex items-center justify-center text-white text-sm font-medium"
              style={{ width: `${noPct}%` }}
            >
              {proti}
            </div>
          )}
          {absPct > 0 && (
            <div
              className="bg-vote-zdrzel flex items-center justify-center text-black text-sm font-medium"
              style={{ width: `${absPct}%` }}
            >
              {zdrzel}
            </div>
          )}
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-vote-pro" />
            Pro ({pro})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-vote-proti" />
            Proti ({proti})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-vote-zdrzel" />
            Zdržel se ({zdrzel})
          </span>
        </div>
      </section>

      {hlasy.length > 0 ? (
        Array.from(byKlub.entries()).map(([klub, members]) => {
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
              <h3 className="font-semibold mb-2 flex items-center gap-2 flex-wrap">
                <Link href={`/kluby/${members[0]?.klub_id ?? ""}`} className="hover:text-primary">
                  {klub}
                </Link>
                <span className="text-xs text-muted-foreground font-normal">
                  pro {stats.pro} · proti {stats.proti} · zdržel {stats.zdrzel} ·{" "}
                  {stats.absent > 0 && `${stats.absent} omluv/absencí`}
                </span>
              </h3>
              <ul className="flex flex-wrap gap-2">
                {members.map((m) => {
                  const v = decodeVote(m.vysledek);
                  return (
                    <li key={m.poslanec_id}>
                      <Link
                        href={`/poslanci/${m.poslanec_id}`}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-border hover:bg-muted text-sm transition-colors"
                      >
                        <span
                          className={cn(
                            "inline-flex items-center justify-center w-5 h-5 rounded text-center text-xs leading-5 font-bold",
                            VOTE_CODE_CLASS[v.code]
                          )}
                          title={v.label}
                        >
                          {v.code}
                        </span>
                        <span>
                          {m.titul_pred ? `${m.titul_pred} ` : ""}
                          {m.jmeno} {m.prijmeni}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      ) : (
        <div className="p-6 text-center text-muted-foreground border border-dashed rounded-md text-sm">
          Žádní poslanci k zobrazení. Data o hlasování ještě nebyla načtena.
        </div>
      )}
    </div>
  );
}