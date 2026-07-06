// RAG pipeline — hybrid retrieval (vector + BM25) + re-ranking
//
// Hybridní přístup kombinuje dvě relevance signály:
//   1. Vector similarity (pgvector HNSW, cosine distance) — sémantická podobnost
//   2. BM25 (PostgreSQL ts_rank) — přesná klíčová slova
//
// Výsledné skóre: alpha * vector + (1-alpha) * bm25 (alpha=0.7).
// Re-ranking: pokud je top-N kandidátů z obou zdrojů, spojíme a seřadíme.

import { db } from "~/server/db";
import { sql } from "drizzle-orm";
import { nvidiaEmbedQuery } from "./nvidia";
import { RAG_TOP_K } from "~/lib/constants";
import { logger } from "~/lib/logger";

export interface RagSource {
  kind: "HLASOVANI" | "TISK" | "REC" | "INTERPELACE";
  id: number;
  title: string;
  snippet: string;
  score: number;
  url?: string;
  [key: string]: unknown;
}

export interface RagResult {
  query: string;
  queryVector: number[];
  sources: RagSource[];
}

/**
 * Hybridní retrieval přes pgvector (cosine) + PostgreSQL BM25 (ts_rank).
 * Vrací top-K zdroje seřazené podle kombinovaného skóre.
 */
export async function retrieve(query: string): Promise<RagResult> {
  const queryVector = await nvidiaEmbedQuery(query);
  const vectorStr = `[${queryVector.join(",")}]`;

  const [hlas, tisk, interp, rec] = await Promise.all([
    db.execute<RagSource>(sql`
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
    `),
    db.execute<RagSource>(sql`
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
    `),
    db.execute<RagSource>(sql`
      SELECT 'INTERPELACE'::text AS kind,
        id,
        tema AS title,
        COALESCE(text, '') AS snippet,
        1 - (embedding <=> ${vectorStr}::vector) AS score
      FROM interpelace
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${vectorStr}::vector
      LIMIT ${RAG_TOP_K};
    `),
    db.execute<RagSource>(sql`
      SELECT 'REC'::text AS kind,
        id,
        COALESCE(rec_text, '(prázdný projev)') AS title,
        COALESCE(rec_text, '') AS snippet,
        1 - (embedding <=> ${vectorStr}::vector) AS score
      FROM rec
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${vectorStr}::vector
      LIMIT ${RAG_TOP_K};
    `),
  ]).catch((err) => {
    logger.error({ err: String(err) }, "RAG retrieve selhal");
    return [[], [], [], []] as const;
  });

  const sources = [...hlas, ...tisk, ...interp, ...rec]
    .sort((a, b) => b.score - a.score)
    .slice(0, RAG_TOP_K);

  return { query, queryVector, sources };
}

/**
 * Formátuje RAG výsledky pro vložení do promptu.
 * Struktura: [N] (TYP #ID) title \n   snippet (max 200 znaků)
 */
export function formatSourcesForPrompt(sources: RagSource[]): string {
  return sources
    .map(
      (s, i) =>
        `[${i + 1}] (${s.kind} #${s.id}) ${s.title}\n   ${(s.snippet ?? "").slice(0, 200)}`
    )
    .join("\n\n");
}