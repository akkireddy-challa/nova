import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { NextRequest } from "next/server";
import { POST as postEmbeddings } from "../src/app/api/v1/embeddings/route";
import { POST as postIntelligence } from "../src/app/api/intelligence/route";
import {
  bm25Scores,
  chunkText,
  cosineSimilarity,
  resetMemoryVectorCache,
  searchMemories,
  tokenize,
  type MemoryInput,
} from "../src/lib/memory-search";
import { resetProviderCaches } from "../src/lib/providers";

const ENV_KEYS = [
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "GEMINI_EMBEDDING_MODEL",
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
  "OPENAI_EMBEDDING_MODEL",
  "OLLAMA_BASE_URL",
  "OLLAMA_MODEL",
  "OLLAMA_EMBEDDING_MODEL",
] as const;

const OPENAI_KEY = "sk-test-openai-embed-secret-0003";
const realFetch = globalThis.fetch;
let savedEnv: Record<string, string | undefined> = {};
let calls: Array<{ url: string; body: string }> = [];

function mockFetch(
  handler: (url: string, body: string) => Response | Promise<Response>,
): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const body = typeof init?.body === "string" ? init.body : "";
    calls.push({ url, body });
    return handler(url, body);
  }) as typeof fetch;
}

function unreachable(): never {
  throw new TypeError("fetch failed: connection refused");
}

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  for (const key of ENV_KEYS) delete process.env[key];
  process.env.OLLAMA_BASE_URL = "http://ollama.test:11434";
  calls = [];
  resetProviderCaches();
  resetMemoryVectorCache();
  mockFetch(() => unreachable());
});

afterEach(() => {
  globalThis.fetch = realFetch;
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  resetProviderCaches();
  resetMemoryVectorCache();
});

const MEMORIES: MemoryInput[] = [
  {
    id: "m1",
    title: "Tech stack",
    content: "I build web apps with Next.js, TypeScript and Bun.",
    category: "project_context",
  },
  {
    id: "m2",
    title: "Coffee",
    content: "I prefer espresso in the morning.",
    category: "preference",
  },
  {
    id: "m3",
    title: "Local models",
    content:
      "Run Ollama locally for private TypeScript experiments with TypeScript tooling.",
  },
];

/** Deterministic fake embedding API: one axis per known topic, so the expected ranking is obvious. */
function topicVector(text: string): number[] {
  const t = text.toLowerCase();
  return [
    /next|typescript|bun|web/.test(t) ? 1 : 0,
    /espresso|coffee/.test(t) ? 1 : 0,
    /ollama|model/.test(t) ? 1 : 0,
    0.01,
  ];
}

function openAIEmbeddings(body: string): Response {
  const { input } = JSON.parse(body) as { input: string[] };
  return Response.json({
    model: "text-embedding-3-small",
    data: input.map((text, index) => ({
      object: "embedding",
      index,
      embedding: topicVector(text),
    })),
    usage: { prompt_tokens: 11, total_tokens: 11 },
  });
}

describe("memory search helpers", () => {
  it("chunks long text with overlapping windows", () => {
    const text = Array.from({ length: 500 }, (_, i) => `word${i}`).join(" ");
    const chunks = chunkText(text, 100, 20);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].split(" ").slice(-20)).toEqual(
      chunks[1].split(" ").slice(0, 20),
    );
    expect(chunks.at(-1)?.endsWith("word499")).toBe(true);
    expect(chunkText("   ")).toEqual([]);
  });

  it("computes cosine similarity", () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0);
    expect(cosineSimilarity([1, 0], [1, 0, 0])).toBe(0);
  });

  it("tokenizes without stopwords and strips simple plurals", () => {
    expect(tokenize("What are my Project Preferences?")).toEqual([
      "project",
      "preference",
    ]);
  });

  it("ranks by BM25 and gives zero to documents without query terms", () => {
    const scores = bm25Scores("typescript", [
      "typescript typescript tooling",
      "typescript once in a much longer document about other things",
      "espresso",
    ]);
    expect(scores[0]).toBeGreaterThan(scores[1]);
    expect(scores[1]).toBeGreaterThan(0);
    expect(scores[2]).toBe(0);
  });
});

describe("searchMemories", () => {
  it("falls back to keyword search when no embeddings provider is configured, and says so", async () => {
    const result = await searchMemories("TypeScript", MEMORIES);
    expect(result.method).toBe("keyword");
    expect(result.embeddingModel).toBeUndefined();
    expect(result.fallbackReason).toBeUndefined();
    expect(result.results.map((hit) => hit.memoryId)).toEqual(["m3", "m1"]);
    expect(result.results[0].score).toBeGreaterThan(result.results[1].score);
  });

  it("keyword search matches titles and returns nothing for unrelated queries", async () => {
    expect(
      (await searchMemories("coffee", MEMORIES)).results.map(
        (hit) => hit.memoryId,
      ),
    ).toEqual(["m2"]);
    expect(
      (await searchMemories("quantum chromodynamics", MEMORIES)).results,
    ).toEqual([]);
  });

  it("uses real provider embeddings with cosine similarity when available", async () => {
    process.env.OPENAI_API_KEY = OPENAI_KEY;
    mockFetch((url, body) =>
      url.endsWith("/embeddings") ? openAIEmbeddings(body) : unreachable(),
    );
    const coffee = await searchMemories("coffee please", MEMORIES, { topK: 2 });
    expect(coffee.method).toBe("embeddings");
    expect(coffee.embeddingModel).toBe("openai:text-embedding-3-small");
    expect(coffee.results[0].memoryId).toBe("m2");
    expect(coffee.results[0].score).toBeCloseTo(1, 2);
    expect(coffee.results).toHaveLength(2);
  });

  it("caches memory vectors so only new texts are embedded", async () => {
    process.env.OPENAI_API_KEY = OPENAI_KEY;
    mockFetch((url, body) =>
      url.endsWith("/embeddings") ? openAIEmbeddings(body) : unreachable(),
    );
    await searchMemories("coffee", MEMORIES);
    const first = calls.filter((call) => call.url.endsWith("/embeddings"));
    expect(
      (JSON.parse(first[0].body) as { input: string[] }).input,
    ).toHaveLength(4);
    await searchMemories("bun", MEMORIES);
    const second = calls.filter((call) => call.url.endsWith("/embeddings"));
    expect((JSON.parse(second[1].body) as { input: string[] }).input).toEqual([
      "bun",
    ]);
  });

  it("reports why it fell back when the embeddings provider fails", async () => {
    process.env.OPENAI_API_KEY = OPENAI_KEY;
    mockFetch((url) =>
      url.endsWith("/embeddings")
        ? Response.json(
            { error: { message: `Incorrect API key provided: ${OPENAI_KEY}` } },
            { status: 401 },
          )
        : unreachable(),
    );
    const result = await searchMemories("coffee", MEMORIES);
    expect(result.method).toBe("keyword");
    expect(result.fallbackReason).toContain("401");
    expect(result.fallbackReason).not.toContain(OPENAI_KEY);
    expect(result.results.map((hit) => hit.memoryId)).toEqual(["m2"]);
  });
});

describe("POST /api/intelligence", () => {
  function post(body: unknown): Promise<Response> {
    return postIntelligence(
      new NextRequest("http://localhost/api/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  }

  it("returns keyword results with the method and no invented metrics", async () => {
    const res = await post({ query: "espresso", memories: MEMORIES });
    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(Object.keys(data).sort()).toEqual(["method", "query", "results"]);
    expect(data.method).toBe("keyword");
    expect(
      (data.results as Array<{ memoryId: string }>).map((hit) => hit.memoryId),
    ).toEqual(["m2"]);
  });

  it("rejects an empty query or malformed memories", async () => {
    expect((await post({ query: "  ", memories: MEMORIES })).status).toBe(400);
    expect(
      (await post({ query: "x", memories: [{ title: "no id" }] })).status,
    ).toBe(400);
  });
});

describe("POST /api/v1/embeddings", () => {
  function post(body: unknown): Promise<Response> {
    return postEmbeddings(
      new Request("http://localhost/api/v1/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  }

  it("returns 503 with an OpenAI-style error when no embeddings provider is configured", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-0004";
    const res = await post({ input: "hello" });
    expect(res.status).toBe(503);
    const data = (await res.json()) as {
      error: { type: string; code: string; message: string };
      data?: unknown;
    };
    expect(data.error.type).toBe("service_unavailable");
    expect(data.error.code).toBe("no_embedding_provider");
    expect(data.data).toBeUndefined();
  });

  it("returns 400 for missing or non-string input", async () => {
    expect((await post({})).status).toBe(400);
    expect((await post({ input: [1, 2] })).status).toBe(400);
  });

  it("proxies real vectors and real usage from the provider", async () => {
    process.env.OPENAI_API_KEY = OPENAI_KEY;
    mockFetch((url, body) =>
      url.endsWith("/embeddings") ? openAIEmbeddings(body) : unreachable(),
    );
    const res = await post({ input: ["coffee", "bun"] });
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      object: string;
      model: string;
      data: Array<{ object: string; index: number; embedding: number[] }>;
      usage: { prompt_tokens: number; total_tokens: number };
    };
    expect(data.object).toBe("list");
    expect(data.model).toBe("openai:text-embedding-3-small");
    expect(data.data.map((item) => item.embedding)).toEqual([
      topicVector("coffee"),
      topicVector("bun"),
    ]);
    expect(data.usage).toEqual({ prompt_tokens: 11, total_tokens: 11 });
  });

  it("omits usage when the provider does not report it (Gemini)", async () => {
    process.env.GEMINI_API_KEY = "AIzaTESTgeminiEmbedKey123456";
    mockFetch((url) =>
      url.includes(":embedContent")
        ? Response.json({ embedding: { values: [0.25, 0.5] } })
        : unreachable(),
    );
    const res = await post({
      input: "hello",
      model: "gemini:gemini-embedding-001",
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      data: Array<{ embedding: number[] }>;
      usage?: unknown;
      model: string;
    };
    expect(data.data[0].embedding).toEqual([0.25, 0.5]);
    expect(data.usage).toBeUndefined();
    expect(data.model).toBe("gemini:gemini-embedding-001");
  });

  it("returns a provider error instead of fallback vectors when the provider fails", async () => {
    process.env.OPENAI_API_KEY = OPENAI_KEY;
    mockFetch((url) =>
      url.endsWith("/embeddings")
        ? new Response("upstream down", { status: 500 })
        : unreachable(),
    );
    const res = await post({ input: "hello" });
    expect(res.status).toBe(502);
    const raw = await res.text();
    expect(raw).not.toContain(OPENAI_KEY);
    expect(raw).not.toContain('embedding"');
    expect((JSON.parse(raw) as { error: { type: string } }).error.type).toBe(
      "provider_error",
    );
  });

  it("rejects embedding requests for providers without an embeddings API", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-0004";
    process.env.OPENAI_API_KEY = OPENAI_KEY;
    const res = await post({
      input: "hello",
      model: "anthropic:claude-sonnet-5-5",
    });
    expect(res.status).toBe(400);
  });
});
