// User dashboard: notifications inbox
import { redirect } from "next/navigation";
import Link from "next/link";
import { Bell } from "lucide-react";
import { getOptionalUser } from "~/server/auth/perms";
import { db } from "~/server/db";
import { notifikace } from "~/server/db/schema/participace";
import { eq, desc } from "drizzle-orm";
import { formatRelative } from "~/lib/format";

export default async function NotificationsPage() {
  const user = await getOptionalUser();
  if (!user) redirect("/auth/signin?from=/dashboard/notifikace");

  let items: Array<{ id: string; typ: string; ref: unknown; createdAt: Date; readAt: Date | null }> = [];
  try {
    items = await db
      .select()
      .from(notifikace)
      .where(eq(notifikace.idUser, user.id ?? ""))
      .orderBy(desc(notifikace.createdAt))
      .limit(50);
  } catch {
    // ignore
  }

  return (
    <div className="container py-8 max-w-2xl">
      <h1 className="text-3xl font-bold flex items-center gap-2 mb-6">
        <Bell className="h-7 w-7 text-primary" />
        Notifikace
      </h1>
      {items.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground border border-dashed rounded-md">
          Žádné notifikace. Sledujte nějaký cíl a notifikace se zobrazí zde.
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => {
            const ref = (n.ref ?? {}) as { targetType?: string; targetId?: string; nazev?: string };
            const targetUrl = ref.targetType === "HLASOVANI"
              ? `/hlasovani/${ref.targetId}`
              : ref.targetType === "TISK"
                ? `/navrhy/${ref.targetId}`
                : "#";
            return (
              <li
                key={n.id}
                className={`p-3 rounded border border-border ${n.readAt ? "bg-card" : "bg-primary/5 border-primary/30"}`}
              >
                <Link href={targetUrl} className="block hover:text-primary">
                  <div className="text-sm font-medium">{ref.nazev ?? n.typ}</div>
                  <div className="text-xs text-muted-foreground">
                    {n.typ} · {formatRelative(n.createdAt)}
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