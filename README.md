# Sněmovna ČR — Civic-Tech Transparentnostní Aplikace

Pokročilá open-source civic-tech aplikace pro transparentní sledování Poslanecké sněmovny ČR.
Kombinuje hlasování, poslance, návrhy zákonů, AI asistenta, petice a analytiku v jednom rozhraní.

## Funkce

### 1. Monitoring + transparentnost
- 📊 **Hlasování** — kompletní timeline s divergencí od koalice, vizualizací pro/proti/zdržel
- 👥 **Poslanci** — profily s fotkou, kontakty, hlasovací historií, členstvím v klubech
- 📜 **Návrhy zákonů** — sněmovní tisky s procedurou (od doručení po Sbírku zákonů)
- 🏛️ **Kluby** — poslanecké kluby s koaličním/opozičním statusem
- 🎤 **Projevy** — metadata stenoprotokolů, fulltext skrz RAG

### 2. AI asistent nad legislativou (RAG)
- 💬 **Streaming chat** — Llama 3.3 70B přes NVIDIA NIM (free tier)
- 🔍 **Hybrid retrieval** — pgvector (cosine) + PostgreSQL BM25 (ts_rank)
- 🎯 **Intent routing** — Llama 3.1 8B klasifikuje typ dotazu
- 📚 **Citations** — odpovědi s číslovanými odkazy [1], [2]…
- 🇨🇿 **Czech-quality** — NV-Embed-v2 pro kvalitní české embeddings

### 3. Participace
- ✍️ **Petice** — vytvoření, podepisování, kvóta, progress bar
- 💬 **Komentáře** — threaded diskuze k tiskům a hlasováním
- 📊 **Ankety** — single/multi-choice s anonymním i autentizovaným hlasem
- 🔔 **Sledování** — notifikace přes email (Resend) a web

### 4. Analytika
- 📈 **Coalition divergence** — jak často poslanec hlasuje opačně než koalice
- 🔥 **Cross-party matrix** — heatmap shody mezi kluby
- 🚨 **Alerting** — kontroverzní hlasování s úzkou výhrou

---

## Tech Stack

| Vrstva | Technologie |
|---|---|
| Frontend | Next.js 15 App Router + TypeScript + Tailwind v4 + shadcn-style UI |
| API | tRPC v11 end-to-end typesafe |
| DB | PostgreSQL 16 + pgvector + pg_trgm |
| ORM | Drizzle |
| AI | NVIDIA NIM (Llama 3.3 70B, NV-Embed-v2) přes Vercel AI SDK |
| Auth | Auth.js v5 (Google OAuth + email magic link) |
| Queue | BullMQ + Redis |
| Mail | Resend |
| Storage | Cloudflare R2 (pro scraped assety) |
| Deploy | Vercel + Upstash Redis |

---

## Quick Start

### Prerequisites

- **Node.js 20+**
- **pnpm 9+** (`npm install -g pnpm`)
- **Docker + Docker Compose** (pro lokální Postgres a Redis)
- **NVIDIA API key** (free) — https://build.nvidia.com → "Get API Key"

### 1. Instalace

```bash
git clone <repo>
cd SmemovnaCR
pnpm install
cp .env.example .env.local
# Doplň NVIDIA_API_KEY do .env.local
```

### 2. Spuštění DB a Redis

```bash
docker compose up -d
```

Služby:
- Postgres na `localhost:5432` (user `snemovna`, db `snemovna`, heslo `snemovna_dev`)
- Redis na `localhost:6379`
- Mailpit na `localhost:8025` (UI) / `localhost:1025` (SMTP)

### 3. Migrace + seed

```bash
pnpm db:generate   # vygeneruje SQL migrace z Drizzle schématu
pnpm db:migrate    # aplikuje migrace
pnpm db:seed       # nasype coalition mapping (vláda vs opozice)
```

### 4. ETL — stáhne data z PSP Open Data

```bash
# Stáhne všechna období najednou (5–10 min)
pnpm etl:run

# Nebo selektivně:
pnpm etl:run --dataset=poslanci
pnpm etl:run --dataset=hlasovani --term=10
pnpm etl:run --dataset=tisky
pnpm etl:run --dataset=interpelace
pnpm etl:run --dataset=steno
```

Data se stahují z [PSP Open Data](https://www.psp.cz/sqw/hp.sqw?k=1300) — windows-1250 UNL soubory.

### 5. Embedding (RAG)

```bash
# Jeden záznam
pnpm etl:run --dataset=hlasovani --term=10

# Všechny (free NIM limit: 5 RPM → trvá ~12 hodin pro ~10k záznamů)
pnpm etl:embed
```

### 6. Worker (BullMQ fronta)

```bash
# V separátním terminálu
pnpm worker
```

Worker zpracovává ETL joby a embedding joby asynchronně.

### 7. Dev server

```bash
pnpm dev
```

→ http://localhost:3000

---

## Struktura projektu

```
src/
├── app/                    # Next.js App Router
│   ├── (public)/           # /poslanci, /hlasovani, /navrhy, /kluby, /schuze, /analyzy, /petice
│   ├── ai/                 # AI chat asistent
│   ├── dashboard/          # Přihlášený uživatel
│   ├── admin/              # Admin/curator
│   ├── auth/               # signin, verify
│   └── api/                # tRPC, Auth.js, cron, chat
├── server/
│   ├── db/                 # Drizzle schema + migrace
│   ├── auth/               # Auth.js v5
│   ├── trpc/               # tRPC routery + caller
│   ├── services/
│   │   ├── etl/            # UNL parser, loadery, scrappery
│   │   ├── ai/             # NVIDIA NIM, embeddings, RAG, chat
│   │   ├── analytics/      # Coalition metrics, alerting
│   │   └── notifications/  # Resend emaily
│   └── queue/              # BullMQ
├── components/             # UI komponenty (RSC + Client)
├── lib/                    # Utility (unl, vote-codes, formatters, env)
└── styles/                 # Tailwind

tests/
├── unit/                   # Vitest (unl-parser, vote-codes, formatters)
├── integration/            # Databázové testy
└── e2e/                    # Playwright

scripts/                    # Worker entry, ETL CLI, embed CLI
docker/                     # pgvector init SQL
```

---

## Datový model (high-level)

**PSP data** (importovaná z Open Data):
- `volebni_obdobi` · `osoba` · `poslanec` · `organ` · `zarazeni` · `funkce`
- `hlasovani` (s embedding vector(1024)) · `hlasovani_poslanec` · `omluva`
- `tisk` (s embedding) · `tisk_hist` · `predkladatel`
- `schuze` · `bod_schuze` · `steno` · `rec` (s embedding)
- `interpelace` (s embedding) · `coalition` (kurátorované)

**Participace** (naše app):
- `user` · `account` · `session` (Auth.js v5)
- `petice` · `podpis` · `anketa` · `anketa_volba`
- `komentar` (threaded, polymorphic)
- `sledovane` · `notifikace`

---

## Hlasovací kódy (PSP UNL spec)

| Kód | Význam |
|---|---|
| `A` | pro (yes) |
| `B` / `N` | proti (no) |
| `C` | zdržel se (abstain) |
| `F` | nehlasoval (logged-in, no vote) |
| `@` | nepřihlášen (not logged in) |
| `M` | omluven (excused) |
| `W` | před složením slibu |
| `K` | omluven-zdržel (legacy) |

Viz `src/lib/vote-codes.ts` pro `decodeVote()` helper.

---

## Deployment

### Vercel

1. Push na GitHub
2. Importuj repo do Vercel
3. Nastav env vars z `.env.example`
4. Provision: Neon/Supabase Postgres s pgvector, Upstash Redis
5. Deploy worker separátně (Railway, Fly.io, Render) — `pnpm worker`

### Vercel Cron

Konfigurace v `vercel.json`:
- `02:00 UTC` — ETL poslanci
- `03:00 UTC` — ETL hlasování (všech 10 období)
- `04:00 UTC` — Embed nových řádků

### Databáze

Použij **Neon** nebo **Supabase** s pgvector extenzí. Free tier postačí.

---

## Testy

```bash
pnpm test          # Vitest unit + integration
pnpm test:e2e      # Playwright E2E (vyžaduje pnpm dev běžící)
pnpm typecheck     # tsc --noEmit
pnpm lint          # ESLint
```

---

## Contribution

Open-source projekt — vítáme PR. Klíčové oblasti:
- Lepší coalition mappings (ručně kurátorované)
- Scraping aktuálních live hlasování
- Plné texty stenoprotokolů
- Mobilní UX

---

## License & Attribution

Data: © [Poslanecká sněmovna PČR](https://www.psp.cz) — Open Data, volně k použití s uvedením zdroje.

Kód: MIT License.

---

## TODO / Roadmap

- [ ] Admin UI pro coalition mapping
- [ ] Mobilní nativní appka (React Native)
- [ ] Federace s EU tiskovými daty
- [ ] Platební brána pro fundraising petic
- [ ] Real-time websocket voting (přes psp.cz SSE)