// Pagination komponenta — používá se na list stránkách.
// Zachovává searchParams v URL při stránkování.

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "~/lib/utils";

interface PaginationProps {
  currentPage: number;
  basePath: string;
  searchParams?: Record<string, string | undefined> | { [key: string]: string | undefined };
  hasNext: boolean;
  /** Zobrazit čísla stránek (max 5 viditelných) */
  showNumbers?: boolean;
  /** label pro "předchozí/další" — CS default */
  labels?: { prev: string; next: string };
}

export function Pagination({
  currentPage,
  basePath,
  searchParams = {},
  hasNext,
  showNumbers = true,
  labels = { prev: "Předchozí", next: "Další" },
}: PaginationProps) {
  const buildHref = (page: number) => {
    const params = new URLSearchParams();
    Object.entries(searchParams as Record<string, string | undefined>).forEach(([k, v]) => {
      if (v && k !== "page") params.set(k, v);
    });
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const hasPrev = currentPage > 1;
  // Generujeme okno stránek: currentPage ± 2
  const pages: number[] = [];
  for (let i = Math.max(1, currentPage - 2); i <= currentPage + 2; i++) {
    pages.push(i);
  }

  return (
    <nav
      aria-label="Stránkování"
      className="flex items-center justify-center gap-2 mt-6"
    >
      {hasPrev && (
        <Link
          href={buildHref(currentPage - 1)}
          rel="prev"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border bg-background hover:bg-muted text-sm transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{labels.prev}</span>
        </Link>
      )}

      {showNumbers && (
        <div className="flex items-center gap-1">
          {pages.map((p) => (
            <Link
              key={p}
              href={buildHref(p)}
              aria-current={p === currentPage ? "page" : undefined}
              className={cn(
                "min-w-[2rem] h-8 px-2 inline-flex items-center justify-center rounded-md text-sm transition-colors",
                p === currentPage
                  ? "bg-primary text-primary-foreground font-medium"
                  : "border border-border bg-background hover:bg-muted"
              )}
            >
              {p}
            </Link>
          ))}
        </div>
      )}

      {hasNext && (
        <Link
          href={buildHref(currentPage + 1)}
          rel="next"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border bg-background hover:bg-muted text-sm transition-colors"
        >
          <span className="hidden sm:inline">{labels.next}</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </nav>
  );
}