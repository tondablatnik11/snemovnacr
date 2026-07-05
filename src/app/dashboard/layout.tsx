// Dashboard layout
import Link from "next/link";
import { User, Bell, Eye, ScrollText } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Přehled", icon: User },
  { href: "/dashboard/sledovane", label: "Sledované", icon: Eye },
  { href: "/dashboard/notifikace", label: "Notifikace", icon: Bell },
  { href: "/dashboard/petice", label: "Moje petice", icon: ScrollText },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container py-8 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
      <aside className="space-y-1">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </aside>
      <div>{children}</div>
    </div>
  );
}