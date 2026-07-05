// Admin layout
import Link from "next/link";
import { Cog, FileSpreadsheet, Users } from "lucide-react";

const links = [
  { href: "/admin", label: "Přehled" },
  { href: "/admin/etl", label: "ETL status", icon: FileSpreadsheet },
  { href: "/admin/coalition", label: "Coalition", icon: Cog },
  { href: "/admin/users", label: "Users", icon: Users },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container py-8 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
      <aside className="space-y-1">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            {Icon && <Icon className="h-4 w-4" />}
            {label}
          </Link>
        ))}
      </aside>
      <div>{children}</div>
    </div>
  );
}