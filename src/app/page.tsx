import Link from "next/link";
import { ArrowRight, Vote, Users, FileText, MessageSquare, BarChart3, ScrollText, ChevronRight, Calendar } from "lucide-react";
import { getServerCaller } from "~/server/trpc/caller";
import { formatDateShort } from "~/lib/format";
import { cn } from "~/lib/utils";
import { VOTE_CODE_CLASS, decodeVote } from "~/lib/vote-codes";

const features = [
  { href: "/poslanci", title: "Poslanci", desc: "Profily, hlasovací historie, foto a kontakt na všech 200 poslanců aktuálního období.", icon: Users },
  { href: "/hlasovani", title: "Hlasování", desc: "Kompletní timeline hlasování s divergencí od koalice a vizualizací.", icon: Vote },
  { href: "/navrhy", title: "Návrhy zákonů", desc: "Sněmovní tisky s procedurou od doručení po vyhlášení ve Sbírce zákonů.", icon: FileText },
  { href: "/kluby", title: "Kluby", desc: "Poslanecké kluby včetně koaličního/opozičního statusu.", icon: ScrollText },
  { href: "/analyzy", title: "Analýzy", desc: "Cross-party matice hlasování, divergence, alerting.", icon: BarChart3 },
  { href: "/ai", title: "AI asistent", desc: "Ptejte se v přirozeném jazyce — odpovědi s citacemi z oficiálních dat.", icon: MessageSquare },
];

export default async function HomePage() {
  const caller = await getServerCaller();
  let currentTerm: { id: number; nazev: string } | null = null;
  let recentVotes: { id: number; nazev: string; datum: Date | null; vysledek: string | null; pro: number | null; proti: number | null; zdrzel: number | null }[] = [];
  let stats: { poslanci: number; hlasovani: number; tisky: number; kluby: number } | null = null;
  try {
    currentTerm = await caller.poslanci.currentTerm();
    const term = currentTerm?.id ?? 10;
    recentVotes = await caller.hlasovani.list({ term, pageSize: 6 });

    // Načteme základní statistiky pro hero (best-effort, failnout může když je DB prázdná)
    const termStats = await caller.poslanci.list({ term, pageSize: 1, page: 1 });
    const kluby = await caller.kluby.list({ term });
    const tiskCount = await caller.tisk.list({ term, pageSize: 1 });
    stats = {
      poslanci: termStats.length > 0 ? 200 : 0, // placeholder — server-side count vyžaduje novou proceduru
      hlasovani: recentVotes.length,
      tisky: tiskCount.length,
      kluby: kluby.length,
    };
  } catch {
    // DB nedostupná — zobrazíme placeholder
  }

  return (
    <div className="container py-10 space-y-16">
      <section className="space-y-6 max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-xs font-medium text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Civic-tech pro transparentní politiku
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
          Transparentní <span className="text-primary">Sněmovna</span> pro všechny občany.
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Sledujte hlasování, čtěte návrhy zákonů, ptejte se AI a podepisujte petice. Vše z otevřených dat
          Poslanecké sněmovny — bez reklam, bez politického zaujetí.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/poslanci"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors shadow-sm"
          >
            Procházet poslance <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/ai"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-border bg-background hover:bg-muted font-medium transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            Vyzkoušet AI
          </Link>
        </div>
        {currentTerm && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
            <Calendar className="h-3 w-3" />
            <span>Aktuální období: <strong className="text-foreground">{currentTerm.nazev}</strong></span>
            <span>·</span>
            <span>Aktualizace: {new Date().toLocaleString("cs-CZ", { dateStyle: "medium", timeStyle: "short" })}</span>
          </div>
        )}
      </section>

      {stats && (stats.hlasovani > 0 || stats.kluby > 0) && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatTile label="Hlasování" value={stats.hlasovani} href="/hlasovani" />
          <StatTile label="Poslanci" value="200" href="/poslanci" />
          <StatTile label="Kluby" value={stats.kluby} href="/kluby" />
          <StatTile label="Návrhy zákonů" value={stats.tisky} href="/navrhy" />
        </section>
      )}

      <section>
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Co zde najdete</h2>
            <p className="text-sm text-muted-foreground mt-1">Šest modulů, jeden cíl — otevřená politika.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(({ href, title, desc, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group p-6 rounded-lg border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Icon className="h-5 w-5" />
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-semibold text-base mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {recentVotes.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Poslední hlasování</h2>
              <p className="text-sm text-muted-foreground mt-1">Timeline aktuálního volebního období.</p>
            </div>
            <Link href="/hlasovani" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
              Všechna hlasování <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <ul className="space-y-2">
            {recentVotes.map((v) => {
              const verdict = decodeVote(v.vysledek ?? "");
              const total = (v.pro ?? 0) + (v.proti ?? 0) + (v.zdrzel ?? 0);
              const proPct = total > 0 ? ((v.pro ?? 0) / total) * 100 : 0;
              const protiPct = total > 0 ? ((v.proti ?? 0) / total) * 100 : 0;
              const zdrzelPct = total > 0 ? ((v.zdrzel ?? 0) / total) * 100 : 0;
              return (
                <li key={v.id}>
                  <Link
                    href={`/hlasovani/${v.id}`}
                    className="block p-4 rounded-md border border-border hover:border-primary/40 hover:bg-muted/30 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <span className="font-medium flex-1">{v.nazev}</span>
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
                      <span>{formatDateShort(v.datum)}</span>
                    </div>
                    <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
                      {proPct > 0 && <div className="bg-vote-pro" style={{ width: `${proPct}%` }} />}
                      {protiPct > 0 && <div className="bg-vote-proti" style={{ width: `${protiPct}%` }} />}
                      {zdrzelPct > 0 && <div className="bg-vote-zdrzel" style={{ width: `${zdrzelPct}%` }} />}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function StatTile({ label, value, href }: { label: string; value: number | string; href: string }) {
  return (
    <Link
      href={href}
      className="block p-4 rounded-lg border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all"
    >
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold mt-1 tabular-nums">
        {typeof value === "number" ? value.toLocaleString("cs-CZ") : value}
      </div>
    </Link>
  );
}