// RAG pipeline — hybrid retrieval (vector + BM25) + re-ranking

import { db } from "~/server/db";
import { sql, and, desc } from "drizzle-orm";
import { nvidiaEmbedQuery } from "./nvidia";
import { RAG_TOP_K } from "~/lib/constants";
import { logger } from "~/lib/logger";

export interface RagSource {
  kind: "HLASOVANI" | "TISK" | "REC";
  id: number;
  title: string;
  snippet: string;
  score: number;
  url?: string;
}

export interface RagResult {
  query: string;
  queryVector: number[];
  sources: RagSource[];
}

/**
 * Hybridní retrieval: kombinuje vector similarity (pgvector HNSW)
 * s keyword BM25 (fulltext) nad názvy hlasování a tisků.
 *
 * Vektorová složka: HNSW cosine distance přes embedding sloupec.
 * BM25 složka: ts_rank přes GIN index na to_tsvector('simple', nazev).
 */
export async function retrieve(query: string): Promise<RagResult> {
  const queryVector = await nvidiaEmbedQuery(query);
  const vectorStr = `[${queryVector.join(",")}]`;

  // --- Hlasování: hybridní ---
  const hlasHybrid = await db.execute<RagSource>(sql`
    WITH vec AS (
      SELECT id, nazev, popis,
        1 - (embedding <=> ${vectorStr}::vector) AS score
      FROM hlasovani
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${vectorStr}::vector
      LIMIT ${RAG_TOP_K}
    ),
    bm25 AS (
      SELECT id, nazev, popis,
        ts_rank(to_tsvector('simple', nazev || ' ' || COALESCE(popis, '')),
                plainto_tsquery('simple', ${query})) AS score
      FROM hlasovani
      WHERE to_tsvector('simple', nazev || ' ' || COALESCE(popis, ''))
            @@ plainto_tsquery('simple', ${query})
      ORDER BY score DESC
      LIMIT ${RAG_TOP_K}
    )
    SELECT
      'HLASOVANI'::text AS kind,
      COALESCE(vec.id, bm25.id) AS id,
      COALESCE(vec.nazev, bm25.nazev) AS title,
      COALESCE(vec.popis, bm25.popis, '') AS snippet,
      (COALESCE(vec.score, 0) * 0.7 + COALESCE(bm25.score, 0) * 0.3)::float AS score
    FROM vec
    FULL OUTER JOIN bm25 ON vec.id = bm25.id
    ORDER BY score DESC
    LIMIT ${RAG_TOP_K};
  `);

  // --- Tisky ---
  const tiskHybrid = await db.execute<RagSource>(sql`
    WITH vec AS (
      SELECT id, nazev, vazby AS snippet,
        1 - (embedding <=> ${vectorStr}::vector) AS score
      FROM tisk
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${vectorStr}::vector
      LIMIT ${RAG_TOP_K}
    ),
    bm25 AS (
      SELECT id, nazev, vazby AS snippet,
        ts_rank(to_tsvector('simple', nazev),
                plainto_tsquery('simple', ${query})) AS score
      FROM tisk
      WHERE to_tsvector('simple', nazev) @@ plainto_tsquery('simple', ${query})
      ORDER BY score DESC
      LIMIT ${RAG_TOP_K}
    )
    SELECT
      'TISK'::text AS kind,
      COALESCE(vec.id, bm25.id) AS id,
      COALESCE(vec.nazev, bm25.nazev) AS title,
      COALESCE(vec.snippet, bm25.snippet, '') AS snippet,
      (COALESCE(vec.score, 0) * 0.7 + COALESCE(bm25.score, 0) * 0.3)::float AS score
    FROM vec
    FULL OUTER JOIN bm25 ON vec.id = bm25.id
    ORDER BY score DESC
    LIMIT ${RAG_TOP_K};
  `);

  const all = [...hlasHybrid, ...tiskHybrid].sort((a, b) => b.score - a.score).slice(0, RAG_TOP_K);

  return { query, queryVector, sources: all };
}

export function formatSourcesForPrompt(sources: RagSource[]): string {
  return sources
    .map(
      (s, i) =>
        `[${i + 1}] (${s.kind} #${s.id}) ${s.title}\n   ${(s.snippet ?? "").slice(0, 200)}`
    )
    .join("\n\n");
}