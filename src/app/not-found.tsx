import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container py-16 max-w-2xl text-center">
      <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
      <p className="text-xl mt-4">Stránka nenalezena</p>
      <p className="text-muted-foreground mt-2">
        Hledaná stránka neexistuje nebo byla přesunuta.
      </p>
      <Link
        href="/"
        className="inline-block mt-6 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
      >
        Zpět na úvod
      </Link>
    </div>
  );
}