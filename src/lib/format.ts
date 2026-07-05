// CZ locale formatters

export const czDate = new Intl.DateTimeFormat("cs-CZ", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export const czDateShort = new Intl.DateTimeFormat("cs-CZ", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export const czTime = new Intl.DateTimeFormat("cs-CZ", {
  hour: "2-digit",
  minute: "2-digit",
});

export const czRelative = new Intl.RelativeTimeFormat("cs-CZ", { numeric: "auto" });

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return czDate.format(dt);
}

export function formatDateShort(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return czDateShort.format(dt);
}

export function formatTime(d: Date | string | null | undefined): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  return czTime.format(dt);
}

export function formatNumber(n: number | null | undefined, opts?: Intl.NumberFormatOptions): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("cs-CZ", opts).format(n);
}

export function formatFullName(opts: {
  titulPred?: string | null;
  jmeno: string;
  prijmeni: string;
  titulZa?: string | null;
}): string {
  const parts = [
    opts.titulPred?.trim(),
    `${opts.jmeno} ${opts.prijmeni}`.trim(),
    opts.titulZa?.trim(),
  ].filter(Boolean);
  return parts.join(", ");
}

export function formatTiskId(cislo: number, cisloZa: number): string {
  if (!cisloZa || cisloZa <= 0) return `${cislo}`;
  return `${cislo}/${cisloZa}`;
}

export function formatRelative(iso: Date | string): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const diffMs = d.getTime() - Date.now();
  const diffSec = Math.round(diffMs / 1000);
  const absSec = Math.abs(diffSec);
  if (absSec < 60) return czRelative.format(diffSec, "second");
  if (absSec < 3600) return czRelative.format(Math.round(diffSec / 60), "minute");
  if (absSec < 86400) return czRelative.format(Math.round(diffSec / 3600), "hour");
  return czRelative.format(Math.round(diffSec / 86400), "day");
}