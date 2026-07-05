import { redirect } from "next/navigation";
import { getOptionalUser } from "~/server/auth/perms";

export default async function AdminPage() {
  const user = await getOptionalUser();
  if (!user) redirect("/auth/signin?from=/admin");
  const role = (user as { role?: string }).role ?? "user";
  if (role !== "admin" && role !== "curator") redirect("/");
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-4">Admin</h1>
      <ul className="space-y-2">
        <li><a href="/admin/etl" className="text-primary hover:underline">→ ETL status</a></li>
        <li><a href="/admin/coalition" className="text-primary hover:underline">→ Coalition mapping</a></li>
        <li><a href="/admin/users" className="text-primary hover:underline">→ Users</a></li>
      </ul>
    </div>
  );
}