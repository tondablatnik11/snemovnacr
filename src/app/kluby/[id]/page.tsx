import { notFound } from "next/navigation";
import Link from "next/link";
import { ScrollText } from "lucide-react";
import { getServerCaller } from "~/server/trpc/caller";
import { formatFullName } from "~/lib/format";
import { pspPhotoUrl } from "~/lib/constants";

export default async function KlubDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const caller = await getServerCaller();
  const klub = await caller.kluby.detail({ id: parseInt(id, 10) });
  if (!klub) notFound();

  return (
    <div className="container py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ScrollText className="h-7 w-7 text-primary" />
          {klub.nazev}
        </h1>
        <p className="text-muted-foreground mt-1">
          {klub.obdobiNazev}
          {klub.koaliceRole && (
            <>
              {" · "}
              <span className={klub.koaliceRole === "VLADA" ? "text-vote-pro font-medium" : klub.koaliceRole === "OPOZICE" ? "text-vote-proti font-medium" : ""}>
                {klub.koaliceRole === "VLADA" ? "Koalice" : klub.koaliceRole === "OPOZICE" ? "Opozice" : "Nezarazeno"}
              </span>
            </>
          )}
        </p>
      </header>

      <section>
        <h2 className="text-lg font-semibold mb-3">Členové ({klub.members.length})</h2>
        {klub.members.length === 0 ? (
          <div className="p-6 text-muted-foreground border border-dashed rounded-md text-sm">
            Žádní členové.
          </div>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {klub.members.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/poslanci/${m.id}`}
                  className="block p-2 rounded-md border border-border hover:border-primary/40 hover:bg-muted/30 transition-all"
                >
                  <div className="aspect-square mb-1.5 rounded bg-muted overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.fotoUrl ?? pspPhotoUrl(m.id, klub.idObdobi, true)}
                      alt={m.prijmeni}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="text-xs font-medium truncate">
                    {formatFullName({ titulPred: m.titulPred, jmeno: m.jmeno, prijmeni: m.prijmeni })}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}