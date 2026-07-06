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
      <div className="container flex h-14 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold group">
          <Gavel className="h-5 w-5 text-primary group-hover:rotate-[-8deg] transition-transform" />
          <span className="hidden sm:inline">Sněmovna ČR</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1" aria-label="Hlavní navigace">
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
            className="hidden sm:inline-flex text-sm px-3 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            Přihlásit
          </Link>
          <Link
            href="/petice"
            className="text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Petice
          </Link>
        </div>
      </div>
      {/* Mobile horizontální scroll navigace */}
      <nav className="md:hidden border-t border-border overflow-x-auto" aria-label="Hlavní navigace">
        <div className="container flex items-center gap-1 py-2 min-w-max">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md hover:bg-muted text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}