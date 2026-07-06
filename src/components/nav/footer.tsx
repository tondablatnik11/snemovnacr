import Link from "next/link";
import { Github, Database, Mail } from "lucide-react";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="container py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <h3 className="font-semibold text-sm mb-2">Sněmovna ČR</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Open-source civic-tech nástroj pro transparentní sledování Poslanecké sněmovny.
              Údaje mají pouze informativní charakter.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-sm mb-2">Zdroje dat</h3>
            <ul className="space-y-1 text-xs">
              <li>
                <a
                  className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  href="https://www.psp.cz/sqw/hp.sqw?k=1300"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Database className="h-3 w-3" />
                  Open data PSP
                </a>
              </li>
              <li>
                <a
                  className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  href="https://github.com/snemovna-cr"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="h-3 w-3" />
                  GitHub repozitář
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-sm mb-2">O projektu</h3>
            <ul className="space-y-1 text-xs">
              <li>
                <Link href="/petice" className="text-muted-foreground hover:text-foreground transition-colors">
                  Petice
                </Link>
              </li>
              <li>
                <Link href="/ai" className="text-muted-foreground hover:text-foreground transition-colors">
                  AI asistent
                </Link>
              </li>
              <li>
                <a
                  href="mailto:info@snemovna-cr.cz"
                  className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="h-3 w-3" />
                  Kontakt
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="pt-6 border-t border-border flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-xs text-muted-foreground">
          <p>
            © {year} Sněmovna ČR. Data z <a className="underline hover:text-foreground" href="https://www.psp.cz/sqw/hp.sqw?k=1300" target="_blank" rel="noopener">Open dat Poslanecké sněmovny</a>.
            Zpracováno k {new Date().toLocaleDateString("cs-CZ")}.
          </p>
          <p>Open-source civic-tech. Žádná politická vazba.</p>
        </div>
      </div>
    </footer>
  );
}