import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import type {
  LLMRequest,
  LLMResult,
  ModelSelection,
} from "../src/lib/providers/types";
import { NoProviderConfiguredError } from "../src/lib/providers/types";
import type { AgentThought } from "../src/lib/types";
import {
  deduplicateSearchResults,
  gatherSources,
  normalizeUrlForDeduplication,
  runPipeline,
} from "../src/lib/research/pipeline";
import {
  buildQueryDecompositionPrompt,
  decomposeResearchQuery,
  isMultiFacetedQuery,
  QUERY_DECOMPOSITION_SYSTEM_PROMPT,
} from "../src/lib/research/prompts";
import type { WebSearchResult } from "../src/lib/web-grounding";

// --- Mock LLM Provider -------------------------------------------------------

type GenerateRequest = Omit<LLMRequest, "model">;
const llmState: {
  configured: boolean;
  responses: (string | Error)[];
  requests: GenerateRequest[];
} = { configured: true, responses: [], requests: [] };

const llm = {
  resolveModel: async (id?: string): Promise<ModelSelection> => {
    if (!llmState.configured) throw new NoProviderConfiguredError();
    if (id) {
      const i = id.indexOf(":");
      return {
        provider: id.slice(0, i) as ModelSelection["provider"],
        model: id.slice(i + 1),
      };
    }
    return { provider: "anthropic", model: "claude-test" };
  },
  generate: async (
    selection: ModelSelection,
    request: GenerateRequest,
  ): Promise<LLMResult> => {
    llmState.requests.push(request);
    const next = llmState.responses.shift();
    if (next === undefined) throw new Error("test: no LLM response queued");
    if (next instanceof Error) throw next;
    return {
      text: next,
      usage: { inputTokens: 120, outputTokens: 60 },
      latencyMs: 400,
      model: selection.model,
      provider: selection.provider,
    };
  },
};

// --- Mock Network & Search ----------------------------------------------------

const realFetch = globalThis.fetch;
const fetchedUrls: string[] = [];
const searchedQueries: string[] = [];
const publicLookup = async () => ["93.184.216.34"];
const deps = { ...llm, lookup: publicLookup };

function ddgResult(url: string, title: string, snippet: string): string {
  return `<h2 class="result__title"><a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=${encodeURIComponent(url)}&amp;rut=1">${title}</a></h2>
<a class="result__snippet" href="#">${snippet}</a>`;
}

const SEARCH_HTML_1 = [
  ddgResult(
    "https://alpha.example.org/page1",
    "Alpha page 1",
    "First overview details.",
  ),
  ddgResult(
    "https://beta.example.net/page2",
    "Beta page 2",
    "Second comparison point.",
  ),
].join("\n");

const SEARCH_HTML_2 = [
  // Deliberate duplicate of alpha (with trailing slash)
  ddgResult(
    "https://alpha.example.org/page1/",
    "Alpha page 1 duplicate",
    "Duplicate snippet.",
  ),
  ddgResult(
    "https://gamma.example.com/page3",
    "Gamma page 3",
    "Third targeted benchmark finding.",
  ),
].join("\n");

interface MockFetchOptions {
  searchFailsQuery?: string;
  allSearchFails?: boolean;
}

function installFetch(options: MockFetchOptions = {}) {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input instanceof Request ? input.url : input);
    fetchedUrls.push(url);

    if (url.startsWith("https://html.duckduckgo.com/")) {
      if (options.allSearchFails) {
        throw new TypeError("network down");
      }
      const parsed = new URL(url);
      const q = parsed.searchParams.get("q") ?? "";
      searchedQueries.push(q);

      if (options.searchFailsQuery && q.includes(options.searchFailsQuery)) {
        throw new TypeError(`search failed for query: ${q}`);
      }

      // Return distinct result sets based on query keywords
      if (
        q.includes("benchmark") ||
        q.includes("metrics") ||
        q.includes("performance") ||
        searchedQueries.length > 1
      ) {
        return new Response(SEARCH_HTML_2, {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      }
      return new Response(SEARCH_HTML_1, {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    }

    if (url.startsWith("https://alpha.example.org/")) {
      return new Response(
        "<html><head><title>Alpha</title></head><body><p>Alpha content: latency dropped 45% in production.</p></body></html>",
        {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        },
      );
    }
    if (url.startsWith("https://beta.example.net/")) {
      return new Response(
        "<html><head><title>Beta</title></head><body><p>Beta content: memory consumption was 2x lower.</p></body></html>",
        {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        },
      );
    }
    if (url.startsWith("https://gamma.example.com/")) {
      return new Response(
        "<html><head><title>Gamma</title></head><body><p>Gamma benchmarks: throughput reached 120k req/s.</p></body></html>",
        {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        },
      );
    }

    throw new Error(`test: unexpected fetch ${url}`);
  }) as typeof fetch;
}

const validResearchJson = (citations: (number | string)[] = [1, 2]) =>
  JSON.stringify({
    content: "Synthesized evidence based on [1] and [2].",
    research: {
      title: "Deep Investigation Report",
      executiveSummary: "Multi-step research findings overview.",
      keyFindings: [
        {
          point: "Latency dropped significantly",
          description: "Documented in primary crawl.",
          confidence: "high",
          citations,
        },
      ],
      contradictionsAndRisks: ["Third source notes architectural caveats."],
      recommendation: "Adopt with monitoring.",
    },
  });

const SCRIPTED_PHRASES = [
  "Lead Strategist",
  "Autonomous Crawler",
  "Cross-Verifier",
  "Executive Synthesizer",
  "Dispatched",
  "Deconstructed",
  "Vision Engine",
];

function expectNoScriptedThoughts(thoughts: AgentThought[]) {
  for (const t of thoughts) {
    for (const phrase of SCRIPTED_PHRASES) {
      expect(`${t.agentName} ${t.action}`).not.toContain(phrase);
    }
  }
}

beforeEach(() => {
  llmState.configured = true;
  llmState.responses = [];
  llmState.requests = [];
  fetchedUrls.length = 0;
  searchedQueries.length = 0;
  delete process.env.TAVILY_API_KEY;
  delete process.env.BRAVE_API_KEY;
  delete process.env.EXA_API_KEY;
  delete process.env.SEARXNG_URL;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

// =============================================================================
// 1. Query Decomposition Unit Tests
// =============================================================================

describe("Deep Research - Query Decomposition", () => {
  it("decomposes comparison queries into primary and targeted benchmark queries", () => {
    const queries = decomposeResearchQuery(
      "Bun vs Node.js for backend microservices",
    );
    expect(queries.length).toBe(2);
    expect(queries[0]).toBe("Bun vs Node.js for backend microservices");
    expect(queries[1].toLowerCase()).toContain(
      "performance benchmarks metrics",
    );
  });

  it("decomposes 'Compare A and B' pattern into targeted trade-offs queries", () => {
    const queries = decomposeResearchQuery("Compare PostgreSQL and MySQL");
    expect(queries.length).toBe(2);
    expect(queries[0]).toBe("Compare PostgreSQL and MySQL");
    expect(queries[1]).toContain("PostgreSQL vs MySQL");
    expect(queries[1].toLowerCase()).toContain("benchmarks");
  });

  it("decomposes 'difference between A and B' pattern", () => {
    const queries = decomposeResearchQuery(
      "difference between Tailwind CSS and styled-components",
    );
    expect(queries.length).toBe(2);
    expect(queries[0]).toBe(
      "difference between Tailwind CSS and styled-components",
    );
    expect(queries[1]).toContain(
      "Tailwind CSS vs styled-components comparison trade-offs benchmarks",
    );
  });

  it("decomposes multi-clause queries joined by conjunctions", () => {
    const queries = decomposeResearchQuery(
      "Autonomous AI agents architecture and safety guardrails",
    );
    expect(queries.length).toBe(2);
    expect(queries[0]).toBe(
      "Autonomous AI agents architecture and safety guardrails",
    );
    expect(queries[1].toLowerCase()).toContain("safety guardrails");
    expect(queries[1].toLowerCase()).toContain("metrics");
  });

  it("decomposes market and industry research topics with empirical metrics angle", () => {
    const queries = decomposeResearchQuery(
      "Solid state battery electric vehicles market 2026",
    );
    expect(queries.length).toBe(2);
    expect(queries[0]).toBe(
      "Solid state battery electric vehicles market 2026",
    );
    expect(queries[1].toLowerCase()).toContain(
      "market size revenue statistics",
    );
  });

  it("handles short queries with a targeted exploratory query", () => {
    const queries = decomposeResearchQuery("Vector database");
    expect(queries.length).toBe(2);
    expect(queries[0]).toBe("Vector database");
    expect(queries[1]).toContain("overview benchmarks and analysis");
  });

  it("returns empty array for empty or blank query", () => {
    expect(decomposeResearchQuery("")).toEqual([]);
    expect(decomposeResearchQuery("   ")).toEqual([]);
  });

  it("correctly identifies multi-faceted research queries", () => {
    expect(isMultiFacetedQuery("React vs Vue vs Svelte")).toBe(true);
    expect(isMultiFacetedQuery("Compare Turbopack and Vite")).toBe(true);
    expect(
      isMultiFacetedQuery(
        "AI code generation benchmarks and developer productivity metrics",
      ),
    ).toBe(true);
    expect(isMultiFacetedQuery("Tell me about X")).toBe(false);
    expect(isMultiFacetedQuery("Weather")).toBe(false);
  });

  it("exports prompt helper buildQueryDecompositionPrompt and system prompt", () => {
    expect(QUERY_DECOMPOSITION_SYSTEM_PROMPT).toContain(
      "You are a research query strategist",
    );
    const prompt = buildQueryDecompositionPrompt("AI agent frameworks");
    expect(prompt).toContain("Research Topic: AI agent frameworks");
    expect(prompt).toContain("Formulate 2 complementary search queries");
  });
});

// =============================================================================
// 2. URL Deduplication & Normalization Unit Tests
// =============================================================================

describe("Deep Research - URL Deduplication & Normalization", () => {
  it("normalizes trailing slashes, www prefix, and hash fragments", () => {
    const url1 = "https://www.example.com/docs/guide/";
    const url2 = "https://example.com/docs/guide";
    const url3 = "https://example.com/docs/guide#section-2";

    const norm1 = normalizeUrlForDeduplication(url1);
    const norm2 = normalizeUrlForDeduplication(url2);
    const norm3 = normalizeUrlForDeduplication(url3);

    expect(norm1).toBe("https://example.com/docs/guide");
    expect(norm2).toBe("https://example.com/docs/guide");
    expect(norm3).toBe("https://example.com/docs/guide");
  });

  it("normalizes query parameters by sorting them alphabetically", () => {
    const urlA = "https://example.com/search?b=2&a=1";
    const urlB = "https://example.com/search?a=1&b=2";

    expect(normalizeUrlForDeduplication(urlA)).toBe(
      normalizeUrlForDeduplication(urlB),
    );
  });

  it("deduplicates search results across multi-query responses without losing non-duplicates", () => {
    const rawResults: WebSearchResult[] = [
      {
        title: "Alpha One",
        url: "https://alpha.example.org/page1",
        snippet: "Alpha snippet 1",
      },
      {
        title: "Beta One",
        url: "https://beta.example.net/page2",
        snippet: "Beta snippet 1",
      },
      {
        title: "Alpha Duplicate with Slash",
        url: "https://alpha.example.org/page1/",
        snippet: "Duplicate Alpha snippet",
      },
      {
        title: "Gamma One",
        url: "https://gamma.example.com/page3",
        snippet: "Gamma snippet",
      },
    ];

    const deduped = deduplicateSearchResults(rawResults);
    expect(deduped.length).toBe(3);
    expect(deduped[0].url).toBe("https://alpha.example.org/page1");
    expect(deduped[1].url).toBe("https://beta.example.net/page2");
    expect(deduped[2].url).toBe("https://gamma.example.com/page3");
  });

  it("handles empty or null-like results array cleanly", () => {
    expect(deduplicateSearchResults([])).toEqual([]);
  });
});

// =============================================================================
// 3. Budget-Aware Execution Unit Tests
// =============================================================================

describe("Deep Research - Budget-Aware Execution", () => {
  it("preserves single-query search when thinkingBudget is 'quick'", async () => {
    installFetch();
    llmState.responses.push(validResearchJson([1]));

    const res = await runPipeline(
      {
        prompt: "Bun vs Node.js for backend microservices",
        mode: "research",
        thinkingBudget: "quick",
      },
      deps,
    );

    expect(res.content).toBeTruthy();
    // Exactly 1 search request issued
    expect(searchedQueries.length).toBe(1);

    // No multi-step query decomposition thought
    const decompositionThought = res.thoughts.find(
      (t) =>
        t.action.includes("Decomposing research query") ||
        t.action.includes("Executed multi-step search"),
    );
    expect(decompositionThought).toBeUndefined();

    // Contains single-query found thought
    const singleSearchThought = res.thoughts.find((t) =>
      t.action.startsWith("Found 2 results via DuckDuckGo"),
    );
    expect(singleSearchThought).toBeDefined();
  });

  it("preserves single-query search when thinkingBudget is 'analytical'", async () => {
    installFetch();
    llmState.responses.push(validResearchJson([1]));

    const res = await runPipeline(
      {
        prompt: "Compare PostgreSQL and MySQL",
        mode: "research",
        thinkingBudget: "analytical",
      },
      deps,
    );

    expect(res.content).toBeTruthy();
    expect(searchedQueries.length).toBe(1);

    const multiStepThought = res.thoughts.find((t) =>
      t.action.includes("Executed multi-step search"),
    );
    expect(multiStepThought).toBeUndefined();
  });

  it("executes multi-query search when thinkingBudget is 'deep'", async () => {
    installFetch();
    llmState.responses.push(validResearchJson([1, 2, 3]));

    const res = await runPipeline(
      {
        prompt: "Compare PostgreSQL and MySQL for high concurrency workloads",
        mode: "research",
        thinkingBudget: "deep",
      },
      deps,
    );

    expect(res.content).toBeTruthy();
    // 2 distinct queries searched
    expect(searchedQueries.length).toBe(2);
    expect(searchedQueries[0]).not.toBe(searchedQueries[1]);

    // Check citation IDs are normalized sequentially
    expect(res.sources.length).toBe(3);
    expect(res.sources[0].id).toBe("src-1");
    expect(res.sources[1].id).toBe("src-2");
    expect(res.sources[2].id).toBe("src-3");
  });

  it("can invoke gatherSources directly with deep budget", async () => {
    installFetch();
    const thoughts: AgentThought[] = [];
    const log = {
      thoughts,
      add: (
        agentName: string,
        action: string,
        status: AgentThought["status"] = "success",
        details?: string,
      ) => {
        thoughts.push({
          id: `t-${thoughts.length + 1}`,
          timestamp: new Date().toISOString(),
          agentName,
          action,
          status,
          ...(details ? { details } : {}),
        });
        return `t-${thoughts.length}`;
      },
      update: () => {},
    };

    const sources = await gatherSources(
      "Compare PostgreSQL and MySQL",
      "deep",
      log as Parameters<typeof gatherSources>[2],
      deps,
    );

    expect(sources.length).toBe(3);
    expect(sources[0].citation.id).toBe("src-1");
    expect(
      thoughts.some((t) => t.action.includes("Decomposing research query")),
    ).toBe(true);
  });

  it("supports 'budget' parameter alias for 'thinkingBudget: deep'", async () => {
    installFetch();
    llmState.responses.push(validResearchJson([1, 2]));

    const res = await runPipeline(
      {
        prompt: "Autonomous AI agents architecture and safety guardrails",
        mode: "research",
        budget: "deep",
      },
      deps,
    );

    expect(res.content).toBeTruthy();
    expect(searchedQueries.length).toBe(2);
  });

  it("triggers deep multi-step search on multi-faceted prompt when budget is unspecified in research mode", async () => {
    installFetch();
    llmState.responses.push(validResearchJson([1, 2]));

    const res = await runPipeline(
      {
        prompt: "Next.js vs Remix performance comparison and trade-offs",
        mode: "research",
      },
      deps,
    );

    expect(res.content).toBeTruthy();
    expect(searchedQueries.length).toBe(2);
  });
});

// =============================================================================
// 4. Trace Thought Logging Unit Tests
// =============================================================================

describe("Deep Research - Trace Thought Logging", () => {
  it("logs full multi-step trace steps and strictly zero fake data", async () => {
    installFetch();
    llmState.responses.push(validResearchJson([1, 2, 3]));

    const res = await runPipeline(
      {
        prompt: "Bun vs Node.js for backend microservices",
        mode: "research",
        thinkingBudget: "deep",
      },
      deps,
    );

    // 1. Decomposition thought
    const decompThought = res.thoughts.find((t) =>
      t.action.includes(
        "Decomposing research query into targeted sub-investigations",
      ),
    );
    expect(decompThought).toBeDefined();
    expect(decompThought?.agentName).toBe("Query");
    expect(decompThought?.status).toBe("success");

    // 2. Multi-step search execution thought with real provider name
    const multiSearchThought = res.thoughts.find((t) =>
      t.action.startsWith("Executed multi-step search across DuckDuckGo"),
    );
    expect(multiSearchThought).toBeDefined();
    expect(multiSearchThought?.agentName).toBe("Web search");

    // 3. Deduplication thought with real source count
    const dedupThought = res.thoughts.find((t) =>
      t.action.startsWith("Aggregated and deduplicated 3 distinct sources"),
    );
    expect(dedupThought).toBeDefined();
    expect(dedupThought?.agentName).toBe("Web search");

    // 4. Page fetch thought
    const pageFetchThought = res.thoughts.find((t) =>
      t.action.startsWith("Fetched 3 of 3 pages"),
    );
    expect(pageFetchThought).toBeDefined();
    expect(pageFetchThought?.agentName).toBe("Page fetch");

    // 5. Zero scripted/fake phrases check
    expectNoScriptedThoughts(res.thoughts);

    // 6. Artifact metrics indicate depthLevel 2 for deep budget
    if (res.artifact?.type === "research") {
      expect(res.artifact.data.metrics?.depthLevel).toBe(2);
      expect(res.artifact.data.metrics?.sourcesCrawled).toBe(3);
    }
  });
});

// =============================================================================
// 5. Error Resilience & Graceful Fallback Unit Tests
// =============================================================================

describe("Deep Research - Error Resilience", () => {
  it("remains resilient when one of the sub-queries fails, utilizing the successful query", async () => {
    // Fail the secondary benchmark query specifically
    installFetch({ searchFailsQuery: "benchmarks" });
    llmState.responses.push(validResearchJson([1, 2]));

    const res = await runPipeline(
      {
        prompt: "Bun vs Node.js for backend microservices",
        mode: "research",
        thinkingBudget: "deep",
      },
      deps,
    );

    expect(res.content).toBeTruthy();

    // A warning was recorded for the failed sub-query
    const warnThought = res.thoughts.find(
      (t) =>
        t.status === "warn" && t.action.includes("DuckDuckGo search failed"),
    );
    expect(warnThought).toBeDefined();

    // The successful query results were still retained and aggregated
    expect(res.sources.length).toBeGreaterThan(0);
    expect(res.sources[0].url).toContain("alpha.example.org");

    // Execution completed successfully
    expect(res.artifact?.type).toBe("research");
  });

  it("handles total search failure gracefully without throwing PipelineError", async () => {
    installFetch({ allSearchFails: true });
    // Model answers cautiously when sources are empty
    llmState.responses.push(validResearchJson([]));

    const res = await runPipeline(
      {
        prompt: "Bun vs Node.js for backend microservices",
        mode: "research",
        thinkingBudget: "deep",
      },
      deps,
    );

    expect(res.content).toBeTruthy();
    expect(res.sources.length).toBe(0);

    const warnThought = res.thoughts.find(
      (t) =>
        t.status === "warn" &&
        t.action.includes("No search provider returned results"),
    );
    expect(warnThought).toBeDefined();
  });
});
