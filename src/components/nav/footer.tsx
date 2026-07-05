export function Footer() {
  return (
    <footer className="border-t border-border py-6 text-sm text-muted-foreground">
      <div className="container flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <p>
          Data z <a className="underline hover:text-foreground" href="https://www.psp.cz/sqw/hp.sqw?k=1300">Open dat Poslanecké sněmovny</a>.
          Zpracováno k {new Date().toLocaleDateString("cs-CZ")}.
        </p>
        <p className="text-xs">
          Open-source civic-tech. Žádná politická vazba. Údaje mají pouze informativní charakter.
        </p>
      </div>
    </footer>
  );
}