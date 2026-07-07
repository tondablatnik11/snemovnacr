# Contributing

Děkujeme za zájem o příspění do projektu Sněmovna ČR! Toto je open-source civic-tech projekt zaměřený na transparentnost české politiky.

## Jak začít

1. Forkněte repozitář
2. Naklonujte si fork: `git clone https://github.com/YOUR-USER/snemovnacr.git`
3. Nainstalujte závislosti: `pnpm install`
4. Zkopírujte `.env.example` do `.env.local` a doplňte:
   - `DATABASE_URL` (lokální Postgres nebo Neon/Supabase free tier)
   - `REDIS_URL` (lokální Redis nebo Upstash free tier)
   - `NVIDIA_API_KEY` (free na https://build.nvidia.com)
   - `AUTH_SECRET` (32+ znaků)
5. Spusťte DB a seed: `pnpm db:migrate && pnpm db:seed`
6. Spusťte ETL: `pnpm etl:run`
7. Spusťte worker: `pnpm worker` (v separátním terminálu)
8. Spusťte dev server: `pnpm dev`

## Code style

- TypeScript strict mode (`noUncheckedIndexedAccess`, `noImplicitOverride`)
- Používejte `import { ... } from "~/lib/..."` aliasy
- Žádné `as unknown as` antipattern — použijte typy z `src/server/db/types.ts`
- Funkce a komponenty by měly mít JSDoc komentáře pro veřejné API
- Naming: čeština pro UI texty, angličtina pro kód/identifiers

## Branch & commit konvence

- Branch naming: `feat/...`, `fix/...`, `refactor/...`, `docs/...`
- Commit messages v imperativu: "Add cross-party matrix", ne "Added..."

## Testy

- Spusťte `pnpm test` před commitem
- Pro nové featury přidejte unit testy v `tests/unit/` nebo `src/**/*.test.ts`
- E2E testy v `tests/e2e/` jsou pro komplexní user flow

## Code review

Všechny PR procházejí review. Očekávejte:
- TypeScript kontrola (`pnpm typecheck`)
- Lint (`pnpm lint`)
- Vitest (`pnpm test`)
- Build na Vercel

## Oblasti pro příspění

Vítáme PR v těchto oblastech:

### Coalition mappings (vysoká priorita)
Coalition mapping je **kurátorovaný** — automatická data z PSP neobsahují informaci o koalici/opozici. Soubor `src/server/db/seed/coalition.ts` obsahuje výchozí mapu, ale potřebuje aktualizaci po každých volbách.

### Mobile UX
Aplikace je optimalizovaná pro desktop. Mobilní UX ještě potřebuje zlepšení (hamburger menu, swipe gestures, dot-friendly tap targets).

### Live voting
PSP poskytuje live data přes `https://www.psp.cz/sqw/hl.sqw`. Plná integrace by vyžadovala:
1. Background job který každých 5 minut kontroluje nová hlasování
2. WebSocket/SSE notifikace pro přihlášené uživatele
3. Vizualizace průběhu hlasování v reálném čase

### Federace s EU tiskovými daty
Propojení sněmovních tisků s evropskými legislativními procesy (např. EU Parliament Open Data Portal).

### Platební brána pro fundraising petic
Integrovat Stripe/PaymentButton pro umožnění fundraisingu u petice s vysokou quótou.

### Lepší testy
Pokrytí E2E testy (Playwright) je minimální. Klíčové oblasti:
- AI chat end-to-end
- Petice sign flow
- Watch toggle
- Search & filter

## Reporting issues

Použijte GitHub Issues. Prosím přidejte:
- Čitelné shrnutí problému
- Kroky k reprodukci (pokud jde o bug)
- Očekávané vs. skutečné chování
- Screenshots / logs (pokud relevantní)

## Code of conduct

Respektujte ostatní přispěvatele. Toto je apolitický, transparentní projekt — politické debaty prosím směřujte jinam.
