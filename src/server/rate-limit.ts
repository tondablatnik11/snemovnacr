// Rate limiter — sliding window v paměti.
// V produkci na Vercel by měl být Redis-based (Upstash Rate Limit),
// ale pro single-instance vývojové prostředí je in-memory dostačující.

interface Bucket {
  /** Počet requestů v aktuálním okně */
  count: number;
  /** Začátek okna v ms */
  windowStart: number;
}

const store = new Map<string, Bucket>();

/**
 * Kontroluje, zda klient může provést další request.
 * Vrací { allowed: boolean, retryAfter?: number }.
 *
 * @param key — unikátní identifikátor (např. IP + path)
 * @param limit — max requestů za okno
 * @param windowMs — délka okna v ms
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfter?: number } {
  const now = Date.now();
  const existing = store.get(key);

  // Pokud existující bucket je mrtvý (starší než window), vytvoříme nový
  if (!existing || now - existing.windowStart >= windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1 };
  }

  // Stejné okno — pokud je limit překročen, odmítneme
  if (existing.count >= limit) {
    const retryAfter = Math.ceil((existing.windowStart + windowMs - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count };
}

/**
 * Pravidelně čistí staré buckety (prevence memory leak).
 * Spouští se jednou za hodinu v single-instance nasazení.
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  const maxAge = 60 * 60 * 1000; // 1 hodina
  for (const [key, bucket] of store) {
    if (now - bucket.windowStart > maxAge) {
      store.delete(key);
    }
  }
}

/**
 * Extrahuje client IP z Next.js Request — pokud možno z `x-forwarded-for`,
 * fallback na `x-real-ip`. Za reverse proxy (Vercel) je x-forwarded-for spolehlivý.
 */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return "unknown";
}