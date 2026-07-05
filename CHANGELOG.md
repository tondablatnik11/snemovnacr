# Changelog

Všechny významné změny budou zde dokumentovány.

## [Unreleased]

### Přidáno
- **Bootstrap & DB**: Next.js 15 + TypeScript + Tailwind v4 + shadcn-style UI
- **Drizzle ORM** s pgvector (vector(1024)) pro embeddings
- **Schema**: PSP Open Data (osoba, poslanec, organ, hlasovani, hlasovani_poslanec, omluva, tisk, tisk_hist, predkladatel, schuze, bod_schuze, steno, rec, interpelace, coalition)
- **Auth.js v5** (NextAuth) s Google OAuth + Resend magic link
- **ETL pipeline**: UNL parser (windows-1250, |, escape \NNN), PSP client (download+unzip), loadery (poslanci, hlasovani, tisky, interpelace, steno), scrapery (live votes, stenoprotokoly)
- **BullMQ** workers pro ETL + Embed + Notifikace
- **Vercel Cron** pro denní ETL (02:00, 03:00, 04:00 UTC)
- **tRPC v11** routery: poslanci, hlasovani, tisk, kluby, ai, petice, sledovane
- **Next.js App Router stránky**: landing, /poslanci, /poslanci/[id], /hlasovani, /hlasovani/[id], /navrhy, /navrhy/[id], /kluby, /kluby/[id], /schuze, /schuze/[id], /analyzy, /ai, /petice, /petice/[slug], /dashboard, /admin
- **AI asistent** (NVIDIA NIM): Llama 3.3 70B chat, Llama 3.1 8B router, NV-Embed-v2 embeddings
- **RAG** hybridní retrieval: pgvector cosine + PostgreSQL BM25 (ts_rank)
- **Streaming chat** přes Vercel AI SDK
- **Petice**: vytvoření, podepisování, kvóta, progress
- **Sledování + notifikace** (Resend email + web inbox)
- **Analytika**: coalition divergence (SQL), cross-party agreement matrix, alerting na kontroverzní hlasování
- **Admin UI**: ETL status dashboard, coalition editor, users list
- **Testy**: Vitest (unl-parser, vote-codes, formatters, utils), Playwright (landing, hlasovani, AI chat)
- **CI**: GitHub Actions (typecheck, lint, test, build)
- **Dokumentace**: README, RUNBOOK, SECURITY
- **CSP hlavičky**, security headers
- **Docker compose**: Postgres 16 + pgvector, Redis 7, Mailpit

### Databáze (tabulky)

**Auth**:
- `user` (uuid, role: user/curator/admin)
- `account`, `session`, `verification_token`

**PSP data** (importovaná):
- `volebni_obdobi` · `osoba` · `poslanec`
- `typ_organu` · `organ` · `funkce` · `zarazeni`
- `schuze` · `bod_schuze`
- `hlasovani` (vector(1024)) · `hlasovani_poslanec` · `omluva`
- `tisk` (vector(1024)) · `tisk_hist` · `predkladatel`
- `steno` · `rec` (vector(1024))
- `interpelace` (vector(1024))
- `coalition` (kurátorované — vláda vs opozice)

**Participace**:
- `petice` · `podpis`
- `anketa` · `anketa_volba`
- `komentar` (threaded, polymorphic, markdown)
- `sledovane` · `notifikace`

### API endpointy

- `GET/POST /api/auth/[...nextauth]` — Auth.js v5
- `GET/POST /api/trpc/[trpc]` — tRPC
- `POST /api/chat` — AI streaming chat
- `GET/POST /api/cron/etl-poslanci` — Vercel Cron
- `GET/POST /api/cron/etl-hlasovani` — Vercel Cron
- `GET/POST /api/cron/embed` — Vercel Cron
- `POST /api/admin/coalition` — admin coalition update

### tRPC procedures (high-level)

- `poslanci.list`, `poslanci.detail`, `poslanci.votingMatrix`, `poslanci.currentTerm`, `poslanci.terms`
- `hlasovani.list`, `hlasovani.detail`, `hlasovani.divergence`
- `tisk.list`, `tisk.detail`, `tisk.search`
- `kluby.list`, `kluby.detail`
- `ai.classify`, `ai.suggestedQuestions`
- `petice.list`, `petice.detail`, `petice.create`, `petice.sign`
- `sledovane.toggle`, `sledovane.isWatching`, `sledovane.notifications`, `sledovane.markRead`

## [0.1.0] — Initial scaffold

První verze s kompletním feature setem.