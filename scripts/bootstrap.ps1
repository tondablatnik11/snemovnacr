# Bootstrap script (Windows PowerShell) - UTF-8 with BOM
# Spusti: pnpm install, docker compose up, db:migrate, db:seed, etl:run

$ErrorActionPreference = "Stop"

# Vynuceni UTF-8 konzole pro spravne zobrazeni znaku
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'

Write-Host "=== Snemovna CR -- Bootstrap (Windows) ===" -ForegroundColor Cyan
Write-Host ""

# 1. Prerequisites
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "X Node.js neni nainstalovan" -ForegroundColor Red; exit 1
}
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  Write-Host "X pnpm neni nainstalovan (npm i -g pnpm)" -ForegroundColor Red; exit 1
}
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host "X Docker neni nainstalovan" -ForegroundColor Red; exit 1
}

$nodeVersion = [int](node -v).Substring(1).Split('.')[0]
if ($nodeVersion -lt 20) {
  Write-Host "X Node.js >= 20 nutny (mate $(node -v))" -ForegroundColor Red; exit 1
}

# 2. Env
if (-not (Test-Path .env.local)) {
  Write-Host "--> Vytvarim .env.local" -ForegroundColor Yellow
  Copy-Item .env.example .env.local
  Write-Host "  ! Dopln NVIDIA_API_KEY do .env.local" -ForegroundColor Yellow
}

# 3. Install
Write-Host "--> pnpm install..." -ForegroundColor Cyan
pnpm install

# 4. Docker
Write-Host "--> docker compose up -d..." -ForegroundColor Cyan
docker compose up -d
Start-Sleep -Seconds 5
Write-Host "  OK Sluzby bezi" -ForegroundColor Green

# 5. Migrace
Write-Host "--> db:generate + db:migrate..." -ForegroundColor Cyan
pnpm db:generate
pnpm db:migrate

# 6. HNSW indexy
Write-Host "--> HNSW indexy..." -ForegroundColor Cyan
docker compose exec -T postgres psql -U snemovna -d snemovna -c @"
CREATE INDEX IF NOT EXISTS hlasovani_embedding_hnsw_idx ON hlasovani USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS tisk_embedding_hnsw_idx ON tisk USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS rec_embedding_hnsw_idx ON rec USING hnsw (embedding vector_cosine_ops);
"@

# 7. Seed
Write-Host "--> db:seed..." -ForegroundColor Cyan
pnpm db:seed

# 8. ETL
Write-Host "--> ETL: poslanci..." -ForegroundColor Cyan
pnpm etl:run --dataset=poslanci
Write-Host "--> ETL: hlasovani (term=10)..." -ForegroundColor Cyan
pnpm etl:run --dataset=hlasovani --term=10
Write-Host "--> ETL: tisky..." -ForegroundColor Cyan
pnpm etl:run --dataset=tisky

Write-Host ""
Write-Host "=== Bootstrap hotovy! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Dalsi kroky:"
Write-Host "  pnpm dev          # dev server"
Write-Host "  pnpm worker       # worker"
Write-Host "  pnpm test         # testy"
