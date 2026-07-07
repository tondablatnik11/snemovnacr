// Helpery pro psaní typově bezpečných tRPC procedur.
// Eliminuje opakující se boilerplate u SQL dotazů a stránkování.

import { z } from "zod";

/** Stránkovací schéma — page musí být >= 1, pageSize 1..200. */
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(200).default(20),
});

/** Vypočítá SQL offset z page+pageSize. */
export function offsetFrom(input: { page: number; pageSize: number }): number {
  return (input.page - 1) * input.pageSize;
}

/** Helper pro konstrukci where klauzule — pokud je podmínka `false`, vrátí `sql\`true\`` (no-op). */
export const TRUE = (): ReturnType<typeof import("drizzle-orm").sql> => {
  // Lazy import pro případné kolize s testy
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { sql } = require("drizzle-orm") as typeof import("drizzle-orm");
  return sql`true`;
};

/** České locale formátovače — centralizované importy pro UI. */
export const DEFAULT_TERM = 10;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 200;

/** Sdílený search schéma pro všechny list endpointy. */
export const searchSchema = z.object({
  search: z.string().optional(),
  term: z.number().int().min(1).max(20).default(DEFAULT_TERM),
});

export const termSchema = z.object({
  term: z.number().int().min(1).max(20).default(DEFAULT_TERM),
});

/** Cache klíč pro tRPC queries — stabilní hash z vstupních parametrů. */
export function buildCacheKey(name: string, input: unknown): string {
  try {
    return `${name}:${JSON.stringify(input)}`;
  } catch {
    return `${name}:${String(input)}`;
  }
}