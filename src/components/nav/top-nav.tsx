import Link from "next/link";
import { Gavel, Vote, Users, FileText, MessageSquare, BarChart3, ScrollText } from "lucide-react";

const links = [
  { href: "/poslanci", label: "Poslanci", icon: Users },
  { href: "/hlasovani", label: "Hlasování", icon: Vote },
  { href: "/navrhy", label: "Návrhy zákonů", icon: FileText },
  { href: "/kluby", label: "Kluby", icon: ScrollText },
  { href: "/analyzy", label: "Analýzy", icon: BarChart3 },
  { href: "/ai", label: "AI asistent", icon: MessageSquare },
];

export function TopNav() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Gavel className="h-5 w-5 text-primary" />
          <span>Sněmovna ČR</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/auth/signin"
            className="text-sm px-3 py-1.5 rounded-md hover:bg-muted text-muted-foreground"
          >
            Přihlásit
          </Link>
        </div>
      </div>
    </header>
  );
}