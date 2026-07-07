import { notFound } from "next/navigation";
import Link from "next/link";
import { Users, ExternalLink, Mail, Globe, MapPin, Bell } from "lucide-react";
import type { Metadata } from "next";
import { getServerCaller } from "~/server/trpc/caller";
import { formatDate, formatFullName } from "~/lib/format";
import { decodeVote, VOTE_CODE_CLASS } from "~/lib/vote-codes";
import { pspPhotoUrl, pspPoslanecUrl } from "~/lib/constants";
import { WatchToggle } from "~/components/sledovane/watch-toggle";
import { getOptionalUser } from "~/server/auth/perms";
import { env } from "~/lib/env";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const caller = await getServerCaller();
  const detail = await caller.poslanci.detail({ id: parseInt(id, 10) });
  if (!detail) return { title: "Poslanec nenalezen" };

  const name = formatFullName(detail);
  const baseUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return {
    title: `${name} — ${detail.obdobiNazev}`,
    description: `Profil poslance ${name} (${detail.obdobiNazev}). Hlasovací historie, kluby, kontakt.`,
    openGraph: {
      title: `${name} · Sněmovna ČR`,
      description: `Profil poslance ${name} — hlasovací historie a kluby.`,
      type: "profile",
      images: [`${baseUrl}/api/og/poslanci/${id}`],
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} · Sněmovna ČR`,
      images: [`${baseUrl}/api/og/poslanci/${id}`],
    },
  };
}

export default async function PoslanecDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const caller = await getServerCaller();
  const detail = await caller.poslanci.detail({ id: parseInt(id, 10) });
  if (!detail) notFound();

  const [matrix, attendance, user] = await Promise.all([
    caller.hlasovani.votingMatrix({ id: detail.id, limit: 30 }).catch(() => []),
    caller.analytics.attendance({ poslanecId: detail.id }).catch(() => null),
    getOptionalUser(),
  ]);

  const term = detail.idObdobi;

  return (
    <div className="container py-8 space-y-8">
      <header className="flex flex-col md:flex-row gap-6">
        <div className="w-32 h-32 md:w-48 md:h-48 rounded-md overflow-hidden bg-muted flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={detail.fotoUrl ?? pspPhotoUrl(detail.idOsoba, term)}
            alt={detail.prijmeni}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{formatFullName(detail)}</h1>
              <p className="text-muted-foreground">{detail.obdobiNazev}</p>
            </div>
            {user && (
              <WatchToggle
                targetType="POSLANEC"
                targetId={String(detail.id)}
              />
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            {detail.kluby.map((k) => (
              <Link
                key={k.idOrgan}
                href={`/kluby/${k.idOrgan}`}
                className="px-2.5 py-1 text-xs rounded-md bg-muted hover:bg-muted/70 border border-border transition-colors"
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
              <a
                href={detail.web}
                target="_blank"
                rel="noopener"
                className="flex items-center gap-1 hover:text-foreground"
              >
                <Globe className="h-3.5 w-3.5" /> web
              </a>
            )}
            <a
              href={pspPoslanecUrl(detail.id, term)}
              target="_blank"
              rel="noopener"
              className="flex items-center gap-1 hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" /> psp.cz
            </a>
          </div>
        </div>
      </header>

      {attendance && attendance.total > 0 && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <AttendanceTile
            label="Účast"
            value={`${attendance.attendance_pct ?? 0}%`}
            sub={`${attendance.present}/${attendance.total} hlasování`}
            tone="pro"
          />
          <AttendanceTile
            label="Omluven/nepřítomen"
            value={String(attendance.absent)}
            sub={`${((attendance.absent / attendance.total) * 100).toFixed(1)}%`}
            tone="muted"
          />
          <AttendanceTile
            label="Zdržel se"
            value={String(attendance.abstain)}
            sub={`${((attendance.abstain / attendance.total) * 100).toFixed(1)}%`}
            tone="zdrzel"
          />
          <AttendanceTile
            label="Celkem hlasování"
            value={String(attendance.total)}
            sub={`v ${term}. volebním období`}
            tone="muted"
          />
        </section>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Poslední hlasování
        </h2>
        {matrix.length === 0 ? (
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
                {matrix.map((row) => {
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
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded text-center text-xs leading-6 font-bold ${VOTE_CODE_CLASS[row.vysledek ?? ""] ?? "bg-muted"}`}
                        >
                          {row.vysledek}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded text-center text-xs leading-6 font-bold ${VOTE_CODE_CLASS[v.code] ?? "bg-muted"}`}
                          title={v.label}
                        >
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

function AttendanceTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "pro" | "proti" | "zdrzel" | "muted";
}) {
  const toneClass = {
    pro: "text-vote-pro",
    proti: "text-vote-proti",
    zdrzel: "text-vote-zdrzel",
    muted: "text-foreground",
  }[tone];

  return (
    <div className="p-3 rounded-lg border border-border bg-card">
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-bold mt-1 tabular-nums ${toneClass}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}