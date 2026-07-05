#!/usr/bin/env bash
# Bootstrap script — kompletní setup od nuly
# Spustí: pnpm install, docker compose up, db:migrate, db:seed, etl:run pro poslanci+hlasovani

set -e

echo "=== Sněmovna ČR — Bootstrap ==="
echo ""

# 1. Kontrola prerequisites
command -v node >/dev/null 2>&1 || { echo "✗ Node.js není nainstalován"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "✗ pnpm není nainstalován (npm i -g pnpm)"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "✗ Docker není nainstalován"; exit 1; }

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "✗ Node.js >= 20 nutný (máte $(node -v))"; exit 1
fi

# 2. Env soubor
if [ ! -f .env.local ]; then
  echo "→ Vytvářím .env.local z .env.example"
  cp .env.example .env.local
  echo "  ⚠ Doplň NVIDIA_API_KEY do .env.local"
fi

# 3. Install dependencies
echo "→ Instaluji dependencies (pnpm install)…"
pnpm install

# 4. Docker compose
echo "→ Startuji Docker compose (Postgres + Redis + Mailpit)…"
docker compose up -d
echo "  Čekám na Postgres…"
sleep 5
for i in {1..30}; do
  if docker compose exec -T postgres pg_isready -U snemovna >/dev/null 2>&1; then
    echo "  ✓ Postgres ready"
    break
  fi
  sleep 1
done

# 5. Migrace
echo "→ Generuji a aplikuji migrace…"
pnpm db:generate || true
pnpm db:migrate

# 6. HNSW indexy (drizzle-kit neumí HNSW)
echo "→ Vytvářím HNSW indexy pro vector search…"
docker compose exec -T postgres psql -U snemovna -d snemovna <<SQL
CREATE INDEX IF NOT EXISTS hlasovani_embedding_hnsw_idx ON hlasovani USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS tisk_embedding_hnsw_idx ON tisk USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS rec_embedding_hnsw_idx ON rec USING hnsw (embedding vector_cosine_ops);
SQL

# 7. Seed coalition
echo "→ Seed coalition…"
pnpm db:seed

# 8. ETL — stáhne poslanci a hlasování aktuálního období
if [ -n "$NVIDIA_API_KEY" ] && [ "$NVIDIA_API_KEY" != "" ]; then
  echo "→ Spouštím ETL pro poslanci…"
  pnpm etl:run --dataset=poslanci
  echo "→ Spouštím ETL pro hlasování (term=10)…"
  pnpm etl:run --dataset=hlasovani --term=10
  echo "→ Spouštím ETL pro tisky…"
  pnpm etl:run --dataset=tisky
  echo "  (Embeddings se napočítají asynchronně přes 'pnpm worker' nebo 'pnpm etl:embed')"
else
  echo "  ⚠ NVIDIA_API_KEY není nastaven — embeddings se nevygenerují."
  echo "         AI chat bude fungovat bez RAG kontextu."
fi

echo ""
echo "=== Bootstrap hotový! ==="
echo ""
echo "Další kroky:"
echo "  pnpm dev          # Next.js dev server na http://localhost:3000"
echo "  pnpm worker       # BullMQ worker (ETL + Embed)"
echo "  pnpm test         # Vitest unit testy"
echo "  pnpm test:e2e     # Playwright E2E"
echo ""
echo "Nastav NVIDIA_API_KEY v .env.local pro plnou AI funkcionalitu."