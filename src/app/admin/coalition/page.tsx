// Admin UI: coalition mapping (kurátorované)
import { redirect } from "next/navigation";
import { getOptionalUser } from "~/server/auth/perms";
import { db } from "~/server/db";
import { organ, coalition, volebniObdobi } from "~/server/db/schema/psp";
import { eq, and } from "drizzle-orm";
import { CoalitionEditor } from "~/components/admin/coalition-editor";

export default async function AdminCoalitionPage() {
  const user = await getOptionalUser();
  if (!user) redirect("/auth/signin?from=/admin/coalition");
  const role = (user as { role?: string }).role ?? "user";
  if (role !== "admin" && role !== "curator") redirect("/");

  let kluby: Array<{ id: number; nazev: string; idObdobi: number; obdobiNazev: string | null; role: "VLADA" | "OPOZICE" | "NEZARAZENO" | null }> = [];
  try {
    const rows = await db
      .select({
        id: organ.id,
        nazev: organ.nazev,
        idObdobi: organ.idObdobi,
        obdobiNazev: volebniObdobi.nazev,
        role: coalition.role,
      })
      .from(organ)
      .leftJoin(volebniObdobi, eq(volebniObdobi.id, organ.idObdobi))
      .leftJoin(coalition, and(eq(coalition.idOrgan, organ.id), eq(coalition.idObdobi, organ.idObdobi)))
      .where(eq(organ.idObdobi, 10));
    kluby = rows.map((r) => ({ ...r, role: r.role as "VLADA" | "OPOZICE" | "NEZARAZENO" | null }));
  } catch {
    // DB prázdná
  }

  return (
    <div className="container py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Coalition mapping</h1>
      <p className="text-muted-foreground mb-6">
        Přiřazení koalice vs opozice pro 10. volební období. Slouží k výpočtu divergence v analytice.
      </p>
      <CoalitionEditor initial={kluby} />
    </div>
  );
}