import Link from "next/link";
import { ScrollText } from "lucide-react";
import { getServerCaller } from "~/server/trpc/caller";

export default async function KlubyPage() {
  const caller = await getServerCaller();
  const term = (await caller.poslanci.currentTerm())?.id ?? 10;
  const kluby = await caller.kluby.list({ term });

  const vlada = kluby.filter((k) => k.koaliceRole === "VLADA");
  const opozice = kluby.filter((k) => k.koaliceRole === "OPOZICE");
  const ostatni = kluby.filter((k) => !k.koaliceRole || k.koaliceRole === "NEZARAZENO");

  return (
    <div className="container py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ScrollText className="h-7 w-7 text-primary" />
          Poslanecké kluby
        </h1>
        <p className="text-muted-foreground mt-1">{term}. volební období</p>
      </header>

      {[
        { title: "Koalice", data: vlada, accent: "bg-vote-pro" },
        { title: "Opozice", data: opozice, accent: "bg-vote-proti" },
        { title: "Nezarazeno", data: ostatni, accent: "bg-muted" },
      ].map(({ title, data, accent }) =>
        data.length > 0 ? (
          <section key={title} className="mb-8">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full ${accent}`} />
              {title}
            </h2>
            <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {data.map((k) => (
                <li key={k.id}>
                  <Link
                    href={`/kluby/${k.id}`}
                    className="block p-4 rounded-md border border-border hover:border-primary/40 hover:bg-muted/30 transition-all"
                  >
                    <div className="font-semibold">{k.nazev}</div>
                    {k.zkratka && <div className="text-xs text-muted-foreground">{k.zkratka}</div>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null
      )}
    </div>
  );
}