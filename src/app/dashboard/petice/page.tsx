// User dashboard: my petitions
import { redirect } from "next/navigation";
import Link from "next/link";
import { ScrollText } from "lucide-react";
import { getOptionalUser } from "~/server/auth/perms";
import { db } from "~/server/db";
import { petice } from "~/server/db/schema/participace";
import { eq, desc } from "drizzle-orm";

export default async function MyPetitionsPage() {
  const user = await getOptionalUser();
  if (!user) redirect("/auth/signin?from=/dashboard/petice");

  let list: Array<{ id: string; slug: string; title: string; stav: "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED"; datumOd: Date }> = [];
  try {
    list = await db
      .select()
      .from(petice)
      .where(eq(petice.createdById, user.id ?? ""))
      .orderBy(desc(petice.datumOd));
  } catch {
    // ignore
  }

  return (
    <div>
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-4">
        <ScrollText className="h-6 w-6" />
        Moje petice
      </h1>
      {list.length === 0 ? (
        <p className="text-muted-foreground">Zatím jste nevytvořili žádnou petici.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((p) => (
            <li key={p.id} className="p-3 rounded border border-border hover:bg-muted/30">
              <Link href={`/petice/${p.slug}`} className="block">
                <div className="font-medium">{p.title}</div>
                <div className="text-xs text-muted-foreground">
                  {p.stav} · {new Date(p.datumOd).toLocaleDateString("cs-CZ")}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}