import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { db } from "~/server/db";
import { schuze, bodSchuze, hlasovani } from "~/server/db/schema/psp";
import { eq, asc } from "drizzle-orm";

export default async function SchuzeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let s;
  let body: Array<{ id: number; poradi: number; nazev: string | null }> = [];
  try {
    const [sRow] = await db.select().from(schuze).where(eq(schuze.id, parseInt(id, 10))).limit(1);
    s = sRow;
    if (s) {
      body = await db
        .select({
          id: bodSchuze.id,
          poradi: bodSchuze.poradi,
          nazev: bodSchuze.nazev,
        })
        .from(bodSchuze)
        .where(eq(bodSchuze.idSchuze, s.id))
        .orderBy(asc(bodSchuze.poradi));
    }
  } catch {
    notFound();
  }
  if (!s) notFound();

  return (
    <div className="container py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Calendar className="h-7 w-7 text-primary" />
          {s.cislo}. schůze
        </h1>
        <p className="text-muted-foreground mt-1">
          {s.datumOd ? new Date(s.datumOd).toLocaleDateString("cs-CZ") : ""}
          {s.datumDo && <> – {new Date(s.datumDo).toLocaleDateString("cs-CZ")}</>}
        </p>
      </header>

      <section>
        <h2 className="text-lg font-semibold mb-3">Program ({body.length} bodů)</h2>
        {body.length === 0 ? (
          <div className="p-6 text-muted-foreground border border-dashed rounded-md text-sm">Program nedostupný.</div>
        ) : (
          <ol className="space-y-1">
            {body.map((b) => (
              <li key={b.id} className="flex gap-3 p-2 hover:bg-muted/30 rounded">
                <span className="text-xs text-muted-foreground w-8 text-right pt-0.5">{b.poradi}.</span>
                <span>{b.nazev ?? "(bez názvu)"}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}