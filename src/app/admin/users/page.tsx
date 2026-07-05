// Admin users page
import { redirect } from "next/navigation";
import { getOptionalUser } from "~/server/auth/perms";
import { db } from "~/server/db";
import { users } from "~/server/db/schema/auth";
import { desc } from "drizzle-orm";

export default async function AdminUsersPage() {
  const user = await getOptionalUser();
  if (!user) redirect("/auth/signin?from=/admin/users");
  const role = (user as { role?: string }).role ?? "user";
  if (role !== "admin") redirect("/");

  let list: Array<{ id: string; email: string; name: string | null; role: "user" | "curator" | "admin"; createdAt: Date }> = [];
  try {
    list = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(50);
  } catch {
    // ignore
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Uživatelé</h1>
      {list.length === 0 ? (
        <p className="text-muted-foreground">Žádní uživatelé.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr className="text-left">
              <th className="py-2 px-2">Email</th>
              <th className="py-2 px-2">Jméno</th>
              <th className="py-2 px-2">Role</th>
              <th className="py-2 px-2">Reg.</th>
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id} className="border-b border-border">
                <td className="py-2 px-2">{u.email}</td>
                <td className="py-2 px-2">{u.name ?? "—"}</td>
                <td className="py-2 px-2">
                  <span className="px-2 py-0.5 rounded bg-muted text-xs">{u.role}</span>
                </td>
                <td className="py-2 px-2 text-muted-foreground text-xs">
                  {new Date(u.createdAt).toLocaleDateString("cs-CZ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}