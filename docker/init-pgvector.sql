-- pgvector extension (built into pgvector/pgvector image)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- Czech collation (libicu)
-- Note: 'cs_CZ' collation may not be available in minimal images; using default unicode