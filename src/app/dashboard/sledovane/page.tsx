// User dashboard: watched items
import { redirect } from "next/navigation";
import Link from "next/link";
import { Eye } from "lucide-react";
import { getOptionalUser } from "~/server/auth/perms";

export default async function SledovanePage() {
  const user = await getOptionalUser();
  if (!user) redirect("/auth/signin?from=/dashboard/sledovane");

  return (
    <div className="container py-8 max-w-2xl">
      <h1 className="text-3xl font-bold flex items-center gap-2 mb-6">
        <Eye className="h-7 w-7 text-primary" />
        Sledované
      </h1>
      <p className="text-muted-foreground">
        Sledované položky můžete spravovat přímo z detailů — tlačítko „Sledovat".
      </p>
    </div>
  );
}