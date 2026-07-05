import Link from "next/link";
import { ArrowRight, Vote, Users, FileText, MessageSquare, BarChart3, ScrollText } from "lucide-react";
import { getServerCaller } from "~/server/trpc/caller";

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
  let recentVotes: { id: number; nazev: string; datum: Date | null }[] = [];
  try {
    currentTerm = await caller.poslanci.currentTerm();
    recentVotes = await caller.hlasovani.list({ term: currentTerm?.id ?? 10, pageSize: 5 });
  } catch {
    // DB nedostupná — zobrazíme placeholder
  }

  return (
    <div className="container py-10 space-y-12">
      <section className="space-y-4 max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          Transparentní <span className="text-primary">Sněmovna</span> pro všechny občany.
        </h1>
        <p className="text-lg text-muted-foreground">
          Sledujte hlasování, čtěte návrhy zákonů, ptejte se AI a podepisujte petice. Vše z otevřených dat
          Poslanecké sněmovny — bez reklam, bez politického zaujetí.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/poslanci" className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
            Procházet poslance <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/ai" className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border hover:bg-muted">
            Vyzkoušet AI
          </Link>
        </div>
        {currentTerm && (
          <p className="text-xs text-muted-foreground pt-2">
            Aktuální období: <strong>{currentTerm.nazev}</strong> · Poslední aktualizace: {new Date().toLocaleString("cs-CZ")}
          </p>
        )}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map(({ href, title, desc, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group p-6 rounded-lg border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{title}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{desc}</p>
          </Link>
        ))}
      </section>

      {recentVotes.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Poslední hlasování</h2>
            <Link href="/hlasovani" className="text-sm text-primary hover:underline">
              Všechna hlasování →
            </Link>
          </div>
          <ul className="space-y-2">
            {recentVotes.map((v) => (
              <li key={v.id}>
                <Link
                  href={`/hlasovani/${v.id}`}
                  className="flex items-center justify-between p-3 rounded-md border border-border hover:bg-muted/50"
                >
                  <span className="flex-1 truncate">{v.nazev}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {v.datum ? new Date(v.datum).toLocaleDateString("cs-CZ") : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}