import Link from "next/link";
import { Calendar } from "lucide-react";
import { db } from "~/server/db";
import { schuze, volebniObdobi } from "~/server/db/schema/psp";
import { eq, desc } from "drizzle-orm";

export default async function SchuzePage() {
  let rows: { id: number; cislo: number; datumOd: string | null; obdobi: string | null }[] = [];
  try {
    rows = await db
      .select({
        id: schuze.id,
        cislo: schuze.cislo,
        datumOd: schuze.datumOd,
        obdobi: volebniObdobi.nazev,
      })
      .from(schuze)
      .innerJoin(volebniObdobi, eq(volebniObdobi.id, schuze.idObdobi))
      .orderBy(desc(schuze.datumOd))
      .limit(40);
  } catch {
    // DB nedostupná
  }

  return (
    <div className="container py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Calendar className="h-7 w-7 text-primary" />
          Schůze Sněmovny
        </h1>
        <p className="text-muted-foreground mt-1">Posledních {rows.length} schůzí</p>
      </header>

      {rows.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground border border-dashed rounded-md">
          Žádné schůze. Spusťte ETL.
        </div>
      ) : (
        <ul className="divide-y divide-border border border-border rounded-md">
          {rows.map((s) => (
            <li key={s.id}>
              <Link href={`/schuze/${s.id}`} className="flex items-center justify-between p-4 hover:bg-muted/30">
                <div>
                  <div className="font-medium">{s.cislo}. schůze</div>
                  <div className="text-xs text-muted-foreground">{s.obdobi}</div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {s.datumOd ? new Date(s.datumOd).toLocaleDateString("cs-CZ") : "—"}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}