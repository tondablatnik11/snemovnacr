# Architektura projektu

Toto je high-level přehled architektury Sněmovna ČR — civic-tech aplikace pro transparentní sledování Poslanecké sněmovny.

## Stack

- **Frontend**: Next.js 15 App Router + TypeScript + Tailwind CSS
- **API**: tRPC v11 end-to-end typesafe
- **DB**: PostgreSQL 16 + pgvector + pg_trgm
- **ORM**: Drizzle
- **AI**: NVIDIA NIM (Llama 3.3 70B, NV-Embed-v2) přes Vercel AI SDK
- **Auth**: Auth.js v5 (Google OAuth + email magic link)
- **Queue**: BullMQ + Redis (Upstash v produkci)
- **Mail**: Resend
- **Deploy**: Vercel

## Vrstvy

### 1. Prezentační vrstva (`src/app/`)
Next.js App Router stránky jsou primárně **Server Components** (RSC), které:
1. Volají `getServerCaller()` pro přímý přístup k tRPC bez HTTP roundtripu
2. Načítají data z PostgreSQL přes Drizzle
3. Renderují HTML s Tailwind CSS

Client Components (`"use client"`) se používají jen pro:
- Interaktivní prvky (`WatchToggle`, `ChatWindow`, `CoalitionEditor`)
- Formuláře (`PetitionSignForm`)

### 2. API vrstva (`src/server/trpc/`)
tRPC routery jsou organizované podle domény:
- `poslanci` — poslanci, volební období, detail
- `hlasovani` — hlasování, voting matrix
- `tisk` — sněmovní tisky
- `kluby` — poslanecké kluby
- `analytics` — divergence, cross-party matrix, kontroverzní hlasování, attendance
- `petice` — petice a podpisy
- `sledovane` — sledování a notifikace
- `ai` — intent routing

Každý router používá `paginationSchema`, `offsetFrom()` a typové row interfaces z `src/server/db/types.ts`.

### 3. Databázová vrstva (`src/server/db/`)
Drizzle schémata jsou rozdělena:
- `schema/psp.ts` — PSP Open Data (osoba, poslanec, organ, hlasovani, tisk, rec, interpelace, coalition)
- `schema/participace.ts` — participační tabulky (petice, anketa, komentar, sledovane, notifikace)
- `schema/auth.ts` — Auth.js (users, accounts, sessions, verificationTokens)

`types.ts` obsahuje typové rozhraní pro raw SQL row výsledky — eliminuje `as unknown as` antipattern.

### 4. ETL pipeline (`src/server/services/etl/`)
UNL parser (`src/lib/unl.ts`) dekóduje PSP windows-1250 soubory s `\NNN` octal escapemi.

Loadery:
- `loader-poslanci.ts` — osoby, organy, zarazeni, funkce
- `loader-hlasovani.ts` — schuze, body, hlasovani, hlasovani_poslanec, omluvy
- `loader-tisky.ts` — sněmovní tisky + historie procedury + předkladatelé
- `loader-interpelace.ts` — ústní interpelace
- `loader-steno.ts` — metadata stenoprotokolů

Sdílené helpers jsou v `src/lib/parse.ts` (`nullIfEmpty`, `nullIfInt`, `parseDate`, `parseDateTime`, `inferOrganTyp`, `inferDruhTisku`, `batchInsert`).

### 5. AI vrstva (`src/server/services/ai/`)
- `nvidia.ts` — wrapper nad NVIDIA NIM (chat + embeddings)
- `embeddings.ts` — batch processing s retry logikou (free NIM rate-limit: 5 RPM)
- `rag.ts` — hybrid retrieval (pgvector cosine + PostgreSQL BM25/ts_rank) přes 4 domény (hlasování, tisky, interpelace, projevy)
- `router.ts` — intent klasifikace (Llama 3.1 8B)
- `prompts.ou neutralitou
- `chat.ts` — streaming chat endpoint
- `embed-worker.ts` — BullMQ worker pro embed joby

### 6. Queue vrstva (`src/server/queue/`)
BullMQ + ioredis. Fronty: `etl`, `embed`, `notify`.

### 7. Analytics (`src/server/services/analytics/`)
- `coalition-metrics.ts` — divergence, cross-party matrix, attendance
- `alerts.ts` — kontroverzní hlasování + watch alert dispatch

## Datový tok

```
PSP Open Data (UNL) → psp-client.ts → UNL parser → ETL loadery → PostgreSQL
                                                                          ↓
                                                            Embed worker (BullMQ)
                                                                          ↓
                                                            pgvector embeddings
                                                                          ↓
AI chat /api/chat → intent router → RAG retrieval → NVIDIA NIM → streaming response
```

## Bezpečnost

- **CSP** s `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`
- **HSTS** 2 roky s `includeSubDomains; preload`
- **Cookies**: Auth.js JWT strategie (bez DB session)
- **Rate limiting**: TODO (doporučeno pro `/api/chat`)
- **Admin guard**: middleware + RSC kontrola přes `getOptionalUser()`
- **CRON_SECRET** Bearer token pro všechny cron endpointy

## Testování

- **Unit testy** (`tests/unit/`, `src/**/*.test.ts`): Vitest
- **E2E testy** (`tests/e2e/`): Playwright
- **Coverage**: `pnpm test --coverage` (threshold: 50% lines)

## Build & Deploy

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Production deploy na Vercel s těmito env vars (viz `.env.example`):
- `DATABASE_URL` (Neon/Supabase)
- `REDIS_URL` (Upstash)
- `AUTH_SECRET`
- `NVIDIA_API_KEY`
- `AUTH_RESEND_KEY` (volitelně)

Worker (`pnpm worker`) se deployuje separátně na Railway/Fly.io/Render.
