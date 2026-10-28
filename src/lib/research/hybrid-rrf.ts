/**
 * Hybrid RAG & Reciprocal Rank Fusion (RRF) Module for Nova
 * Combines sparse BM25 keyword rankings with dense vector cosine similarity
 * and provides multi-document batch ingestion.
 */

import type { KnowledgeMemoryItem } from "../types";
import { bm25Scores, cosineSimilarity } from "../memory-search";
import {
  indexDocumentIntoMemories,
  type ChunkOptions,
} from "../document-indexer";

export interface RankingItem {
  id: string;
  rank: number;
  score: number;
}

export interface RRFOptions {
  /** RRF smoothing constant. Standard default is 60. */
  k?: number;
  /** Relative weight for sparse BM25 scores. Default is 1.0. */
  bm25Weight?: number;
  /** Relative weight for dense vector scores. Default is 1.0. */
  vectorWeight?: number;
}

export interface RRFResult {
  id: string;
  rrfScore: number;
  bm25Rank?: number;
  vectorRank?: number;
}

export interface HybridSearchOptions extends RRFOptions {
  /** Async provider or cache returning vectors mapped by memory ID or text. */
  getVectors?: () => Promise<Map<string, number[]>>;
  /** Pre-computed dense embedding vector for the search query. */
  queryVector?: number[];
  /** Search mode: 'hybrid' (default), 'bm25', or 'vector'. */
  mode?: "hybrid" | "bm25" | "vector";
  /** Maximum number of results to return. */
  topK?: number;
}

export interface HybridSearchResultItem {
  memory: KnowledgeMemoryItem;
  score: number;
  method: "hybrid_rrf" | "bm25_keyword" | "vector_dense";
  bm25Rank?: number;
  vectorRank?: number;
}

/**
 * Reciprocal Rank Fusion (RRF)
 * Standard formula: RRF(d) = (w_bm25 / (k + rank_bm25(d))) + (w_vec / (k + rank_vec(d)))
 * Handles documents appearing in only one ranking list gracefully.
 * Sorts by descending rrfScore with deterministic tie-breaking.
 */
export function reciprocalRankFusion(
  bm25Rankings: Array<{ id: string; rank: number; score: number }>,
  vectorRankings: Array<{ id: string; rank: number; score: number }>,
  options?: { k?: number; bm25Weight?: number; vectorWeight?: number },
): Array<{
  id: string;
  rrfScore: number;
  bm25Rank?: number;
  vectorRank?: number;
}> {
  const k = Math.max(1, options?.k ?? 60);
  const wBm25 = options?.bm25Weight ?? 1.0;
  const wVec = options?.vectorWeight ?? 1.0;

  // Deduplicate and index best rank per ID for BM25
  const bm25Map = new Map<string, { rank: number; score: number }>();
  if (Array.isArray(bm25Rankings)) {
    for (const item of bm25Rankings) {
      if (!item || !item.id) continue;
      const existing = bm25Map.get(item.id);
      if (!existing || item.rank < existing.rank) {
        bm25Map.set(item.id, item);
      }
    }
  }

  // Deduplicate and index best rank per ID for Vectors
  const vecMap = new Map<string, { rank: number; score: number }>();
  if (Array.isArray(vectorRankings)) {
    for (const item of vectorRankings) {
      if (!item || !item.id) continue;
      const existing = vecMap.get(item.id);
      if (!existing || item.rank < existing.rank) {
        vecMap.set(item.id, item);
      }
    }
  }

  // Union of document IDs across both ranking lists
  const allIds = new Set<string>([...bm25Map.keys(), ...vecMap.keys()]);
  const results: RRFResult[] = [];

  for (const id of allIds) {
    const bm25Entry = bm25Map.get(id);
    const vecEntry = vecMap.get(id);

    const bm25Contribution = bm25Entry ? wBm25 / (k + bm25Entry.rank) : 0;
    const vecContribution = vecEntry ? wVec / (k + vecEntry.rank) : 0;
    const rrfScore = bm25Contribution + vecContribution;

    results.push({
      id,
      rrfScore,
      ...(bm25Entry !== undefined ? { bm25Rank: bm25Entry.rank } : {}),
      ...(vecEntry !== undefined ? { vectorRank: vecEntry.rank } : {}),
    });
  }

  // Sort by descending rrfScore with deterministic tie-breaking (by id)
  results.sort((a, b) => {
    const scoreDiff = b.rrfScore - a.rrfScore;
    if (Math.abs(scoreDiff) > 1e-12) {
      return scoreDiff;
    }
    return a.id.localeCompare(b.id);
  });

  return results;
}

/**
 * Batch ingests multiple documents or folder files, chunking them into KnowledgeMemoryItems.
 */
export function batchIndexDocuments(
  docs: Array<{ name: string; content: string }>,
  options?: ChunkOptions,
): KnowledgeMemoryItem[] {
  if (!Array.isArray(docs) || docs.length === 0) {
    return [];
  }

  const allMemories: KnowledgeMemoryItem[] = [];

  for (const doc of docs) {
    if (!doc || !doc.name || !doc.content || !doc.content.trim()) {
      continue;
    }

    const chunks = indexDocumentIntoMemories(
      {
        name: doc.name,
        content: doc.content,
      },
      options,
    );

    allMemories.push(...chunks);
  }

  return allMemories;
}

/**
 * Searches memories using Hybrid RRF if vector embeddings are available,
 * or falls back transparently to BM25 if only keywords match, reporting the real method used.
 */
export async function hybridSearchMemories(
  query: string,
  memories: KnowledgeMemoryItem[],
  options?: {
    getVectors?: () => Promise<Map<string, number[]>>;
    queryVector?: number[];
    mode?: "hybrid" | "bm25" | "vector";
    k?: number;
    bm25Weight?: number;
    vectorWeight?: number;
    topK?: number;
  },
): Promise<
  Array<{
    memory: KnowledgeMemoryItem;
    score: number;
    method: "hybrid_rrf" | "bm25_keyword" | "vector_dense";
    bm25Rank?: number;
    vectorRank?: number;
  }>
> {
  const trimmed = query?.trim() ?? "";
  if (!trimmed || !Array.isArray(memories) || memories.length === 0) {
    return [];
  }

  const mode = options?.mode ?? "hybrid";
  const memoryMap = new Map<string, KnowledgeMemoryItem>();
  for (const mem of memories) {
    memoryMap.set(mem.id, mem);
  }

  // 1. Calculate BM25 keyword rankings across memory title + content
  const docTexts = memories.map((m) => `${m.title}\n${m.content}`);
  const bm25RawScores = bm25Scores(trimmed, docTexts);

  const bm25Candidates: Array<{
    id: string;
    score: number;
    memory: KnowledgeMemoryItem;
  }> = [];

  bm25RawScores.forEach((score, idx) => {
    if (score > 0) {
      bm25Candidates.push({
        id: memories[idx].id,
        score,
        memory: memories[idx],
      });
    }
  });

  bm25Candidates.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.id.localeCompare(b.id);
  });

  const bm25Rankings: Array<{ id: string; rank: number; score: number }> =
    bm25Candidates.map((c, i) => ({
      id: c.id,
      rank: i + 1,
      score: c.score,
    }));

  // 2. Calculate Vector rankings if requested and available
  let vectorRankings: Array<{ id: string; rank: number; score: number }> = [];
  let vectorsAvailable = false;

  if (mode === "vector" || mode === "hybrid") {
    try {
      let queryVec = options?.queryVector;
      let vectorMap: Map<string, number[]> | undefined;

      if (options?.getVectors) {
        vectorMap = await options.getVectors();
      }

      if (!queryVec && vectorMap) {
        queryVec = vectorMap.get("__query__") ?? vectorMap.get(trimmed);
      }

      if (
        queryVec &&
        Array.isArray(queryVec) &&
        queryVec.length > 0 &&
        vectorMap &&
        vectorMap.size > 0
      ) {
        vectorsAvailable = true;
        const vecCandidates: Array<{
          id: string;
          score: number;
          memory: KnowledgeMemoryItem;
        }> = [];

        for (const mem of memories) {
          const vec =
            vectorMap.get(mem.id) ??
            vectorMap.get(`${mem.title}\n${mem.content}`) ??
            vectorMap.get(mem.content);

          if (vec && Array.isArray(vec) && vec.length === queryVec.length) {
            const sim = cosineSimilarity(queryVec, vec);
            if (sim > 0) {
              vecCandidates.push({
                id: mem.id,
                score: sim,
                memory: mem,
              });
            }
          }
        }

        vecCandidates.sort((a, b) => {
          if (b.score !== a.score) {
            return b.score - a.score;
          }
          return a.id.localeCompare(b.id);
        });

        vectorRankings = vecCandidates.map((c, i) => ({
          id: c.id,
          rank: i + 1,
          score: c.score,
        }));
      }
    } catch {
      vectorsAvailable = false;
    }
  }

  // 3. Dispatch based on mode and vector availability

  // Mode: BM25
  if (mode === "bm25") {
    const results = bm25Rankings.map((item) => ({
      memory: memoryMap.get(item.id)!,
      score: item.score,
      method: "bm25_keyword" as const,
      bm25Rank: item.rank,
    }));
    return options?.topK ? results.slice(0, options.topK) : results;
  }

  // Mode: Vector
  if (mode === "vector") {
    if (vectorsAvailable) {
      const results = vectorRankings.map((item) => ({
        memory: memoryMap.get(item.id)!,
        score: item.score,
        method: "vector_dense" as const,
        vectorRank: item.rank,
      }));
      return options?.topK ? results.slice(0, options.topK) : results;
    }
    // Transparently fall back to BM25 if vectors unavailable
    const results = bm25Rankings.map((item) => ({
      memory: memoryMap.get(item.id)!,
      score: item.score,
      method: "bm25_keyword" as const,
      bm25Rank: item.rank,
    }));
    return options?.topK ? results.slice(0, options.topK) : results;
  }

  // Mode: Hybrid
  if (vectorsAvailable) {
    const rrfResults = reciprocalRankFusion(bm25Rankings, vectorRankings, {
      k: options?.k,
      bm25Weight: options?.bm25Weight,
      vectorWeight: options?.vectorWeight,
    });

    const results = rrfResults
      .map((item) => {
        const mem = memoryMap.get(item.id);
        if (!mem) return null;
        return {
          memory: mem,
          score: item.rrfScore,
          method: "hybrid_rrf" as const,
          bm25Rank: item.bm25Rank,
          vectorRank: item.vectorRank,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return options?.topK ? results.slice(0, options.topK) : results;
  }

  // Vectors not available: falls back transparently to BM25 keyword matching
  const results = bm25Rankings.map((item) => ({
    memory: memoryMap.get(item.id)!,
    score: item.score,
    method: "bm25_keyword" as const,
    bm25Rank: item.rank,
  }));
  return options?.topK ? results.slice(0, options.topK) : results;
}
