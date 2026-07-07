// Admin UI: ETL status + manual trigger
import { redirect } from "next/navigation";
import { getOptionalUser } from "~/server/auth/perms";
import { db } from "~/server/db";
import { sql } from "drizzle-orm";
import type { TableStatRow } from "~/server/db/types";

export const dynamic = "force-dynamic";

export default async function AdminEtlPage() {
  const user = await getOptionalUser();
  if (!user) redirect("/auth/signin?from=/admin/etl");
  const role = (user as { role?: string }).role ?? "user";
  if (role !== "admin" && role !== "curator") redirect("/");

  let stats: TableStatRow[] = [];
  try {
    const result = await db.execute<TableStatRow>(sql`
      SELECT 'osoba' AS table_name, COUNT(*)::int AS row_count FROM osoba
      UNION ALL SELECT 'poslanec', COUNT(*)::int FROM poslanec
      UNION ALL SELECT 'organ', COUNT(*)::int FROM organ
      UNION ALL SELECT 'hlasovani', COUNT(*)::int FROM hlasovani
      UNION ALL SELECT 'hlasovani_poslanec', COUNT(*)::int FROM hlasovani_poslanec
      UNION ALL SELECT 'tisk', COUNT(*)::int FROM tisk
      UNION ALL SELECT 'interpelace', COUNT(*)::int FROM interpelace
      UNION ALL SELECT 'rec', COUNT(*)::int FROM rec
    `);
    stats = result;
  } catch {
    // DB nedostupná
  }

  return (
    <div className="container py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">ETL status</h1>
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Počty řádků v DB</h2>
        {stats.length === 0 ? (
          <div className="p-6 text-muted-foreground border border-dashed rounded-md text-sm">
            DB nedostupná. Spusťte <code className="px-1.5 py-0.5 rounded bg-muted">docker compose up -d</code>.
          </div>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {stats.map((s) => (
              <li key={s.table_name} className="p-3 rounded border border-border bg-card">
                <div className="text-xs text-muted-foreground">{s.table_name}</div>
                <div className="text-2xl font-bold tabular-nums">
                  {s.row_count.toLocaleString("cs-CZ")}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Manuální ETL</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Trigger přes terminál (spouští se worker):
        </p>
        <pre className="text-xs bg-muted p-4 rounded overflow-x-auto">{`pnpm etl:run --dataset=poslanci
pnpm etl:run --dataset=hlasovani --term=10
pnpm etl:run --dataset=tisky
pnpm etl:run --dataset=interpelace
pnpm etl:run --dataset=steno
pnpm etl:embed`}</pre>
      </section>
    </div>
  );
}