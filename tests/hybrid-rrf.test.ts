import { describe, it, expect } from "bun:test";
import {
  reciprocalRankFusion,
  batchIndexDocuments,
  hybridSearchMemories,
} from "../src/lib/research/hybrid-rrf";
import type { KnowledgeMemoryItem } from "../src/lib/types";

describe("Reciprocal Rank Fusion (RRF)", () => {
  it("calculates standard RRF scores with default k=60, w_bm25=1.0, w_vec=1.0", () => {
    const bm25 = [
      { id: "doc-1", rank: 1, score: 3.5 },
      { id: "doc-2", rank: 2, score: 2.1 },
    ];
    const vec = [
      { id: "doc-1", rank: 1, score: 0.95 },
      { id: "doc-2", rank: 2, score: 0.88 },
    ];

    const results = reciprocalRankFusion(bm25, vec);

    expect(results.length).toBe(2);

    // doc-1: 1/(60+1) + 1/(60+1) = 2/61 ≈ 0.032786885
    expect(results[0].id).toBe("doc-1");
    expect(results[0].rrfScore).toBeCloseTo(2 / 61, 6);
    expect(results[0].bm25Rank).toBe(1);
    expect(results[0].vectorRank).toBe(1);

    // doc-2: 1/(60+2) + 1/(60+2) = 2/62 ≈ 0.032258064
    expect(results[1].id).toBe("doc-2");
    expect(results[1].rrfScore).toBeCloseTo(2 / 62, 6);
    expect(results[1].bm25Rank).toBe(2);
    expect(results[1].vectorRank).toBe(2);
  });

  it("calculates RRF scores with custom smoothing k and custom weights", () => {
    const bm25 = [{ id: "doc-alpha", rank: 2, score: 5.0 }];
    const vec = [{ id: "doc-alpha", rank: 4, score: 0.8 }];

    const results = reciprocalRankFusion(bm25, vec, {
      k: 20,
      bm25Weight: 2.0,
      vectorWeight: 0.5,
    });

    expect(results.length).toBe(1);
    // formula: 2.0 / (20 + 2) + 0.5 / (20 + 4) = 2/22 + 0.5/24 = 1/11 + 1/48 ≈ 0.1117424
    const expected = 2.0 / 22 + 0.5 / 24;
    expect(results[0].id).toBe("doc-alpha");
    expect(results[0].rrfScore).toBeCloseTo(expected, 6);
    expect(results[0].bm25Rank).toBe(2);
    expect(results[0].vectorRank).toBe(4);
  });

  it("handles document union gracefully (present in both lists or in only one list)", () => {
    const bm25 = [
      { id: "doc-both", rank: 1, score: 4.0 },
      { id: "doc-bm25-only", rank: 2, score: 3.0 },
    ];
    const vec = [
      { id: "doc-both", rank: 2, score: 0.85 },
      { id: "doc-vec-only", rank: 1, score: 0.95 },
    ];

    const results = reciprocalRankFusion(bm25, vec, { k: 60 });

    expect(results.length).toBe(3);

    // doc-both: 1/(60+1) + 1/(60+2) = 1/61 + 1/62 ≈ 0.032522
    const docBoth = results.find((r) => r.id === "doc-both");
    expect(docBoth).toBeDefined();
    expect(docBoth?.bm25Rank).toBe(1);
    expect(docBoth?.vectorRank).toBe(2);
    expect(docBoth?.rrfScore).toBeCloseTo(1 / 61 + 1 / 62, 6);

    // doc-vec-only: 0 + 1/(60+1) = 1/61 ≈ 0.016393
    const docVecOnly = results.find((r) => r.id === "doc-vec-only");
    expect(docVecOnly).toBeDefined();
    expect(docVecOnly?.bm25Rank).toBeUndefined();
    expect(docVecOnly?.vectorRank).toBe(1);
    expect(docVecOnly?.rrfScore).toBeCloseTo(1 / 61, 6);

    // doc-bm25-only: 1/(60+2) + 0 = 1/62 ≈ 0.016129
    const docBm25Only = results.find((r) => r.id === "doc-bm25-only");
    expect(docBm25Only).toBeDefined();
    expect(docBm25Only?.bm25Rank).toBe(2);
    expect(docBm25Only?.vectorRank).toBeUndefined();
    expect(docBm25Only?.rrfScore).toBeCloseTo(1 / 62, 6);

    // Verification of ordering: doc-both > doc-vec-only > doc-bm25-only
    expect(results.map((r) => r.id)).toEqual([
      "doc-both",
      "doc-vec-only",
      "doc-bm25-only",
    ]);
  });

  it("ranks scores accurately and breaks ties deterministically by document id", () => {
    // Two documents with symmetric ranks producing exact same RRF score
    const bm25 = [
      { id: "doc-zebra", rank: 1, score: 4.0 },
      { id: "doc-apple", rank: 2, score: 3.5 },
    ];
    const vec = [
      { id: "doc-apple", rank: 1, score: 0.9 },
      { id: "doc-zebra", rank: 2, score: 0.8 },
    ];

    const results = reciprocalRankFusion(bm25, vec, { k: 60 });

    expect(results.length).toBe(2);
    // Both doc-zebra and doc-apple have rrfScore = 1/61 + 1/62
    expect(results[0].rrfScore).toBeCloseTo(results[1].rrfScore, 8);
    // Deterministic tie-breaker should place 'doc-apple' before 'doc-zebra'
    expect(results[0].id).toBe("doc-apple");
    expect(results[1].id).toBe("doc-zebra");
  });

  it("handles empty lists gracefully", () => {
    expect(reciprocalRankFusion([], [])).toEqual([]);

    const bm25Only = [{ id: "doc-1", rank: 1, score: 2.0 }];
    const resBm25 = reciprocalRankFusion(bm25Only, []);
    expect(resBm25.length).toBe(1);
    expect(resBm25[0].id).toBe("doc-1");
    expect(resBm25[0].bm25Rank).toBe(1);
    expect(resBm25[0].vectorRank).toBeUndefined();

    const vecOnly = [{ id: "doc-2", rank: 1, score: 0.9 }];
    const resVec = reciprocalRankFusion([], vecOnly);
    expect(resVec.length).toBe(1);
    expect(resVec[0].id).toBe("doc-2");
    expect(resVec[0].vectorRank).toBe(1);
    expect(resVec[0].bm25Rank).toBeUndefined();
  });
});

describe("hybridSearchMemories", () => {
  const sampleMemories: KnowledgeMemoryItem[] = [
    {
      id: "mem-ts",
      title: "TypeScript Architecture",
      content:
        "Nova utilizes strict TypeScript types with Next.js App Router and fullstack type safety.",
      category: "project_context",
      createdAt: "2026-10-28T10:00:00.000Z",
    },
    {
      id: "mem-py",
      title: "Python Machine Learning",
      content:
        "FastAPI service running PyTorch models and dense vector embeddings.",
      category: "project_context",
      createdAt: "2026-10-28T10:05:00.000Z",
    },
    {
      id: "mem-rust",
      title: "Rust Systems Programming",
      content:
        "High performance systems tooling with zero cost abstractions and memory safety.",
      category: "preference",
      createdAt: "2026-10-28T10:10:00.000Z",
    },
  ];

  it("executes pure BM25 search when mode is 'bm25'", async () => {
    const hits = await hybridSearchMemories(
      "TypeScript Next.js",
      sampleMemories,
      {
        mode: "bm25",
      },
    );

    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].memory.id).toBe("mem-ts");
    expect(hits[0].method).toBe("bm25_keyword");
    expect(hits[0].bm25Rank).toBe(1);
    expect(hits[0].score).toBeGreaterThan(0);
  });

  it("transparently falls back to BM25 when vector embeddings are not provided in hybrid mode", async () => {
    const hits = await hybridSearchMemories(
      "Rust memory safety",
      sampleMemories,
      {
        mode: "hybrid",
      },
    );

    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].memory.id).toBe("mem-rust");
    expect(hits[0].method).toBe("bm25_keyword");
    expect(hits[0].bm25Rank).toBe(1);
  });

  it("transparently falls back to BM25 when vector embeddings provider fails", async () => {
    const hits = await hybridSearchMemories("Python PyTorch", sampleMemories, {
      mode: "hybrid",
      getVectors: async () => {
        throw new Error("Provider rate limit 429");
      },
      queryVector: [0.1, 0.2, 0.3],
    });

    expect(hits.length).toBe(1);
    expect(hits[0].memory.id).toBe("mem-py");
    expect(hits[0].method).toBe("bm25_keyword");
    expect(hits[0].bm25Rank).toBe(1);
  });

  it("executes dense vector search when mode is 'vector' and vectors are provided", async () => {
    const queryVector = [1.0, 0.0, 0.0];
    const vectorMap = new Map<string, number[]>([
      ["mem-ts", [0.2, 0.8, 0.0]],
      ["mem-py", [0.95, 0.1, 0.0]], // closest to queryVector
      ["mem-rust", [0.1, 0.1, 0.9]],
    ]);

    const hits = await hybridSearchMemories(
      "neural embeddings",
      sampleMemories,
      {
        mode: "vector",
        queryVector,
        getVectors: async () => vectorMap,
      },
    );

    expect(hits.length).toBe(3);
    expect(hits[0].memory.id).toBe("mem-py");
    expect(hits[0].method).toBe("vector_dense");
    expect(hits[0].vectorRank).toBe(1);
    expect(hits[0].score).toBeCloseTo(0.994, 2);
  });

  it("executes Hybrid RRF combining real BM25 keywords and dense vectors", async () => {
    // mem-ts has keyword match for "TypeScript"
    // Vector query points strongly towards mem-ts and moderately towards mem-py
    const queryVector = [0.8, 0.6, 0.0];
    const vectorMap = new Map<string, number[]>([
      ["mem-ts", [0.8, 0.6, 0.0]], // vector cosine = 1.0 (Rank 1)
      ["mem-py", [0.7, 0.7, 0.0]], // vector cosine ~ 0.98 (Rank 2)
      ["mem-rust", [0.0, 0.0, 1.0]], // vector cosine = 0.0
    ]);

    const hits = await hybridSearchMemories(
      "TypeScript Next.js",
      sampleMemories,
      {
        mode: "hybrid",
        queryVector,
        getVectors: async () => vectorMap,
        k: 60,
      },
    );

    expect(hits.length).toBeGreaterThanOrEqual(1);

    // mem-ts should win top rank because it ranks #1 in BM25 AND #1 in Vectors
    expect(hits[0].memory.id).toBe("mem-ts");
    expect(hits[0].method).toBe("hybrid_rrf");
    expect(hits[0].bm25Rank).toBe(1);
    expect(hits[0].vectorRank).toBe(1);
    expect(hits[0].score).toBeCloseTo(2 / 61, 5);

    // mem-py only matched vectors
    const memPyHit = hits.find((h) => h.memory.id === "mem-py");
    expect(memPyHit).toBeDefined();
    expect(memPyHit?.method).toBe("hybrid_rrf");
    expect(memPyHit?.vectorRank).toBe(2);
    expect(memPyHit?.bm25Rank).toBeUndefined();
  });

  it("returns empty array for empty query or empty memories", async () => {
    const hitsEmptyQ = await hybridSearchMemories("   ", sampleMemories);
    expect(hitsEmptyQ).toEqual([]);

    const hitsEmptyMem = await hybridSearchMemories("test", []);
    expect(hitsEmptyMem).toEqual([]);
  });
});

describe("batchIndexDocuments", () => {
  it("ingests multiple documents in batch and produces KnowledgeMemoryItems", () => {
    const docs = [
      {
        name: "Overview.md",
        content:
          "Nova is an advanced multimodal autonomous agent workspace with hybrid RAG capabilities.",
      },
      {
        name: "Security.txt",
        content:
          "API keys are strictly managed server side and never sent to client local storage.",
      },
    ];

    const memories = batchIndexDocuments(docs);

    expect(memories.length).toBe(2);

    expect(memories[0].id).toMatch(/^doc-/);
    expect(memories[0].title).toBe("Overview.md (Part 1/1)");
    expect(memories[0].category).toBe("document");
    expect(memories[0].tags).toContain("overview-md");
    expect(memories[0].content).toContain("Nova is an advanced multimodal");

    expect(memories[1].id).toMatch(/^doc-/);
    expect(memories[1].title).toBe("Security.txt (Part 1/1)");
    expect(memories[1].category).toBe("document");
    expect(memories[1].tags).toContain("security-txt");
    expect(memories[1].content).toContain("API keys are strictly managed");
  });

  it("chunks large documents across multiple parts during batch ingestion", () => {
    const docs = [
      {
        name: "LargeDoc.md",
        content:
          "Paragraph 1 discusses the fundamental theorems of distributed consensus protocols.\n\n" +
          "Paragraph 2 dives into raft leader elections, heartbeats, and log compaction routines.\n\n" +
          "Paragraph 3 reviews network partitions, split-brain scenarios, and quorum intersections.",
      },
    ];

    const memories = batchIndexDocuments(docs, {
      maxChunkSize: 100,
      minChunkSize: 40,
      overlap: 20,
    });

    expect(memories.length).toBeGreaterThan(1);
    const total = memories.length;

    memories.forEach((mem, index) => {
      expect(mem.title).toBe(`LargeDoc.md (Part ${index + 1}/${total})`);
      expect(mem.category).toBe("document");
    });
  });

  it("skips empty documents and returns empty array on empty input", () => {
    expect(batchIndexDocuments([])).toEqual([]);

    const memories = batchIndexDocuments([
      { name: "empty.txt", content: "   " },
      { name: "valid.txt", content: "Valid knowledge content." },
    ]);

    expect(memories.length).toBe(1);
    expect(memories[0].title).toBe("valid.txt (Part 1/1)");
  });
});
