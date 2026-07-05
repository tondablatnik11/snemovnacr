import { redirect } from "next/navigation";
import { getOptionalUser } from "~/server/auth/perms";

export default async function DashboardPage() {
  const user = await getOptionalUser();
  if (!user) redirect("/auth/signin?from=/dashboard");
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-4">Můj dashboard</h1>
      <p className="text-muted-foreground">Přihlášen jako {user.email}.</p>
    </div>
  );
}