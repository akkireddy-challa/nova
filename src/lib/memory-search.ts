// Search over the user's saved memories (KnowledgeMemoryItem, stored in the browser and sent with
// each request). Uses real embeddings from a configured provider when one exists, otherwise BM25
// keyword scoring. The response always says which method produced the ranking.
import {
  NoEmbeddingProviderError,
  ProviderError,
  ModelSelectionError,
  getProvider,
  resolveEmbeddingModel,
  toModelId,
} from "./providers";
import type { KnowledgeMemoryItem } from "./types";

export type MemoryInput = Pick<
  KnowledgeMemoryItem,
  "id" | "title" | "content"
> & {
  category?: KnowledgeMemoryItem["category"];
};

export type MemorySearchMethod = "embeddings" | "keyword";

export interface MemorySearchHit {
  memoryId: string;
  title: string;
  category?: KnowledgeMemoryItem["category"];
  /** The best-matching passage of the memory. */
  text: string;
  /** 1-based passage number within the memory. */
  chunkIndex: number;
  totalChunks: number;
  /** Cosine similarity (embeddings) or BM25 score (keyword). Not comparable across methods. */
  score: number;
}

export interface MemorySearchResult {
  query: string;
  method: MemorySearchMethod;
  /** "provider:model" when method is "embeddings". */
  embeddingModel?: string;
  /** Set when an embeddings provider exists but failed, so keyword search was used instead. */
  fallbackReason?: string;
  results: MemorySearchHit[];
}

const CHUNK_WORDS = 200;
const CHUNK_OVERLAP = 40;

/** Split text into word windows that overlap so a match on a boundary is not lost. */
export function chunkText(
  text: string,
  chunkSize = CHUNK_WORDS,
  overlap = CHUNK_OVERLAP,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  if (words.length <= chunkSize) return [words.join(" ")];
  const step = Math.max(1, chunkSize - overlap);
  const chunks: string[] = [];
  for (let start = 0; start < words.length; start += step) {
    const end = Math.min(start + chunkSize, words.length);
    chunks.push(words.slice(start, end).join(" "));
    if (end === words.length) break;
  }
  return chunks;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dot / denominator;
}

const STOPWORDS = new Set(
  "a an and are as at be but by for from has have how i in is it its me my of on or our so that the their them then there these this to was we were what when where which who why will with you your".split(
    " ",
  ),
);

/** Lowercased word tokens without stopwords, with a light plural strip ("preferences" -> "preference"). */
export function tokenize(text: string): string[] {
  const tokens = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  return tokens
    .filter((token) => token.length > 1 && !STOPWORDS.has(token))
    .map((token) =>
      token.length > 3 && token.endsWith("s") && !token.endsWith("ss")
        ? token.slice(0, -1)
        : token,
    );
}

/** Okapi BM25 score of each document for the query. Documents sharing no term with the query score 0. */
export function bm25Scores(
  query: string,
  documents: string[],
  k1 = 1.2,
  b = 0.75,
): number[] {
  const queryTerms = [...new Set(tokenize(query))];
  const docs = documents.map(tokenize);
  if (queryTerms.length === 0 || docs.length === 0) return docs.map(() => 0);
  const avgLength =
    docs.reduce((sum, doc) => sum + doc.length, 0) / docs.length || 1;
  const docFreq = new Map<string, number>();
  for (const term of queryTerms) {
    docFreq.set(term, docs.filter((doc) => doc.includes(term)).length);
  }
  return docs.map((doc) => {
    let score = 0;
    for (const term of queryTerms) {
      const tf = doc.filter((token) => token === term).length;
      if (tf === 0) continue;
      const df = docFreq.get(term) ?? 0;
      const idf = Math.log(1 + (docs.length - df + 0.5) / (df + 0.5));
      score +=
        idf *
        ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * doc.length) / avgLength)));
    }
    return score;
  });
}

// Vectors are cached per model and text so repeated searches only embed new or edited memories.
const VECTOR_CACHE_LIMIT = 5_000;
const vectorCache = new Map<string, number[]>();

function cacheKey(modelId: string, text: string): string {
  return `${modelId}\u0000${text}`;
}

function remember(key: string, vector: number[]): void {
  vectorCache.set(key, vector);
  while (vectorCache.size > VECTOR_CACHE_LIMIT) {
    const oldest = vectorCache.keys().next().value;
    if (oldest === undefined) break;
    vectorCache.delete(oldest);
  }
}

/** Clear cached memory vectors (used by tests). */
export function resetMemoryVectorCache(): void {
  vectorCache.clear();
}

interface Passage {
  memory: MemoryInput;
  text: string;
  chunkIndex: number;
  totalChunks: number;
  /** What gets scored: title plus passage, so a title match counts. */
  indexed: string;
}

function toPassages(memories: MemoryInput[]): Passage[] {
  const passages: Passage[] = [];
  for (const memory of memories) {
    const chunks = chunkText(memory.content);
    if (chunks.length === 0) chunks.push("");
    chunks.forEach((text, index) => {
      passages.push({
        memory,
        text,
        chunkIndex: index + 1,
        totalChunks: chunks.length,
        indexed: `${memory.title}\n${text}`.trim(),
      });
    });
  }
  return passages.filter((passage) => passage.indexed.length > 0);
}

/** Keep the best passage per memory, highest score first. */
function rank(
  passages: Passage[],
  scores: number[],
  topK: number,
  keepZero: boolean,
): MemorySearchHit[] {
  const best = new Map<string, MemorySearchHit>();
  passages.forEach((passage, index) => {
    const score = scores[index];
    if (!keepZero && score <= 0) return;
    const current = best.get(passage.memory.id);
    if (current && current.score >= score) return;
    best.set(passage.memory.id, {
      memoryId: passage.memory.id,
      title: passage.memory.title,
      ...(passage.memory.category ? { category: passage.memory.category } : {}),
      text: passage.text,
      chunkIndex: passage.chunkIndex,
      totalChunks: passage.totalChunks,
      score: Math.round(score * 1000) / 1000,
    });
  });
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, topK);
}

async function embedWithCache(
  passages: Passage[],
  query: string,
  signal?: AbortSignal,
): Promise<{ modelId: string; queryVector: number[]; vectors: number[][] }> {
  const selection = await resolveEmbeddingModel();
  const provider = getProvider(selection.provider);
  if (!provider.embed) throw new NoEmbeddingProviderError();
  const modelId = toModelId(selection);

  const texts = [query, ...passages.map((passage) => passage.indexed)];
  const missing = [
    ...new Set(
      texts.filter((text) => !vectorCache.has(cacheKey(modelId, text))),
    ),
  ];
  if (missing.length > 0) {
    const { vectors } = await provider.embed({
      model: selection.model,
      texts: missing,
      signal,
    });
    missing.forEach((text, index) =>
      remember(cacheKey(modelId, text), vectors[index]),
    );
  }
  const lookup = (text: string): number[] =>
    vectorCache.get(cacheKey(modelId, text)) ?? [];
  return {
    modelId,
    queryVector: lookup(query),
    vectors: passages.map((passage) => lookup(passage.indexed)),
  };
}

/**
 * Rank memories against a query. Uses embeddings from the first configured embeddings provider;
 * falls back to BM25 keyword scoring when there is none or it fails (and reports why).
 */
export async function searchMemories(
  query: string,
  memories: MemoryInput[],
  options: { topK?: number; signal?: AbortSignal } = {},
): Promise<MemorySearchResult> {
  const trimmed = query.trim();
  const topK = Math.max(1, Math.min(options.topK ?? 5, 50));
  const passages = toPassages(memories);
  if (!trimmed || passages.length === 0) {
    return { query: trimmed, method: "keyword", results: [] };
  }

  let fallbackReason: string | undefined;
  try {
    const { modelId, queryVector, vectors } = await embedWithCache(
      passages,
      trimmed,
      options.signal,
    );
    const scores = vectors.map((vector) =>
      cosineSimilarity(queryVector, vector),
    );
    return {
      query: trimmed,
      method: "embeddings",
      embeddingModel: modelId,
      results: rank(passages, scores, topK, true),
    };
  } catch (err) {
    if (options.signal?.aborted) throw err;
    if (!(err instanceof NoEmbeddingProviderError)) {
      fallbackReason =
        err instanceof ProviderError || err instanceof ModelSelectionError
          ? err.message
          : "The embeddings request failed";
    }
  }

  const scores = bm25Scores(
    trimmed,
    passages.map((passage) => passage.indexed),
  );
  return {
    query: trimmed,
    method: "keyword",
    ...(fallbackReason ? { fallbackReason } : {}),
    results: rank(passages, scores, topK, false),
  };
}
