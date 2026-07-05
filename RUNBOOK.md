# Runbook — provoz Sněmovna ČR

## Denní kontrola (Cron)

Vercel Cron spouští:
- `02:00` ETL poslanci
- `03:00` ETL hlasování (všech 10 období paralelně)
- `04:00` Embed nových řádků

**Jak ověřit, že proběhly:**
1. Vercel Dashboard → Functions → Logs
2. Hledat `/api/cron/etl-*` requesty s `200 OK`
3. Sledovat BullMQ dashboard (Upstash Console → Queue)
4. Porovnat počty řádků v DB: `pnpm psql -c "SELECT COUNT(*) FROM hlasovani"`

## Manuální ETL trigger

```bash
# ETL pro konkrétní období
pnpm etl:run --dataset=hlasovani --term=10

# Force re-embed
pnpm etl:embed --target=hlasovani
```

## NVIDIA NIM rate-limit

Free tier: **5 RPM / 5k TPM**.

- Embed joby: batch po 5, pauza 13s mezi batchi.
- Chat: průměrně 1–2 requesty za minutu (OK).
- Router (8B): oddělený rate limit pool.

Pokud dojde k 429: worker automaticky počká 30s a zkusí znovu (3× s exponenciálním backoffem).

## DB indexy

Pro RAG výkon je klíčové mít **HNSW indexy** na `embedding` sloupcích. Drizzle Kit je neumí, takže je potřeba vytvořit ručně:

```sql
-- Po `pnpm db:migrate`
CREATE INDEX hlasovani_embedding_hnsw_idx ON hlasovani
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX tisk_embedding_hnsw_idx ON tisk
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX rec_embedding_hnsw_idx ON rec
  USING hnsw (embedding vector_cosine_ops);
```

Tyto indexy jsou v `docker/init-pgvector.sql` pro čerstvou DB.

## Coalition mapping

Soubor `src/server/db/seed/coalition.ts` obsahuje výchozí mapu. **Po volbách je nutné aktualizovat!** Edituj `DEFAULT_COALITION` pole a spusť:

```bash
pnpm db:seed
```

Nebo ručně přes admin UI (TODO).

## Disaster recovery

### DB zálohy
- Neon: automatické denní zálohy 7 dní (free tier)
- Vercel Postgres (Supabase): automatické denní zálohy

### Worker crash
- BullMQ jobs jsou v Redis, přežijí restart workeru
- Worker lze jednoduše restartovat: `pnpm worker`

### Embeddings se rozbijí
- Smaž embedding: `UPDATE hlasovani SET embedding = NULL WHERE id IN (...)`
- Znovu spusť: `pnpm etl:embed --target=hlasovani`

## Metriky ke sledování

- **Aktuální stav**: https://[your-app]/admin
- **Queue**: Upstash Console → Queues → `etl`, `embed`
- **AI usage**: build.nvidia.com → Usage Dashboard
- **DB**: Neon / Supabase dashboard
- **Errors**: Sentry dashboard (NEXT_PUBLIC_SENTRY_DSN)
- **Logs**: Vercel Functions → Logs

## Bezpečnost

- Všechny admin routes za `/admin/*` jsou chráněny middleware + tRPC `curatorProcedure` / `adminProcedure`
- Cron routes vyžadují `Authorization: Bearer $CRON_SECRET`
- CSP v `next.config.ts` povoluje jen `integrate.api.nvidia.com` pro connect-src

## Kontakt / Eskalace

- **Issue**: GitHub Issues
- **Data bug**: otevři issue s označením `data`
- **Security**: SECURITY.md (pokud existuje)