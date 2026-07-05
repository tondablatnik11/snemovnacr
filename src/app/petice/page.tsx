import Link from "next/link";
import { FileSignature, ArrowRight } from "lucide-react";
import { getServerCaller } from "~/server/trpc/caller";

export default async function PeticePage() {
  const caller = await getServerCaller();
  const petice = await caller.petice.list({ stav: "ACTIVE" });

  return (
    <div className="container py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileSignature className="h-7 w-7 text-primary" />
          Petice
        </h1>
        <p className="text-muted-foreground mt-1">
          Občanské petice adresované poslancům a Sněmovně.
        </p>
      </header>

      {petice.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground border border-dashed rounded-md">
          Zatím žádné aktivní petice.
        </div>
      ) : (
        <ul className="space-y-3">
          {petice.map((p) => {
            const progress = Math.min(100, ((p.signatures ?? 0) / p.cilovyPocet) * 100);
            return (
              <li key={p.id}>
                <Link
                  href={`/petice/${p.slug}`}
                  className="block p-5 rounded-md border border-border hover:border-primary/40 hover:bg-muted/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h3 className="font-semibold flex-1">{p.title}</h3>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {p.signatures ?? 0} z {p.cilovyPocet} podpisů
                      </span>
                      <span className="font-medium">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="bg-primary h-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}