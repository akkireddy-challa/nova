import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  SEARCH_PROVIDER_LABELS,
  searchExa,
  searchSearxng,
  searchWeb,
} from "../src/lib/research/search";

const realFetch = globalThis.fetch;
const SEARCH_ENV = [
  "TAVILY_API_KEY",
  "EXA_API_KEY",
  "BRAVE_API_KEY",
  "SEARXNG_URL",
] as const;
const savedEnv: Partial<Record<(typeof SEARCH_ENV)[number], string>> = {};

interface FetchCall {
  url: string;
  init?: RequestInit;
}

let calls: FetchCall[] = [];

function installFetch(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
) {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    calls.push({ url, init });
    return handler(url, init);
  }) as typeof fetch;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const SEARXNG_BODY = {
  query: "rust async",
  results: [
    {
      url: "https://alpha.example.org/post",
      title: "Alpha <b>post</b>",
      content: "Alpha &amp; friends explain async.",
      engine: "bing",
      score: 2.5,
      publishedDate: "2026-03-01T00:00:00",
    },
    {
      url: "https://beta.example.net/",
      title: "Beta",
      content: "",
      score: 1,
      publishedDate: null,
    },
    { url: "", title: "No URL" },
    { url: "https://gamma.example.com/", title: "Gamma", content: "Third" },
  ],
};

const EXA_BODY = {
  results: [
    {
      url: "https://alpha.example.org/post",
      title: "Alpha <b>post</b>",
      text: "Alpha &amp; friends explain async.",
      score: 0.95,
      publishedDate: "2026-03-01T00:00:00",
    },
    {
      url: "https://beta.example.net/",
      title: "Beta",
      text: "",
      score: undefined,
      publishedDate: undefined,
    },
    { url: "", title: "No URL" },
    { url: "https://gamma.example.com/", title: "Gamma", text: "Third" },
  ],
};

const DDG_HTML = `<h2 class="result__title"><a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=${encodeURIComponent("https://ddg.example.org/")}&amp;rut=1">DDG hit</a></h2>
<a class="result__snippet" href="#">From DuckDuckGo</a>`;

beforeEach(() => {
  calls = [];
  for (const key of SEARCH_ENV) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  globalThis.fetch = realFetch;
  for (const key of SEARCH_ENV) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

describe("searchSearxng", () => {
  it("sends a GET to /search with format=json and an encoded query", async () => {
    installFetch(() => json({ results: [] }));
    await searchSearxng("  c++ & rust?  ", 5, "http://localhost:8888/");
    expect(calls).toHaveLength(1);
    const url = new URL(calls[0].url);
    expect(url.origin).toBe("http://localhost:8888");
    expect(url.pathname).toBe("/search");
    expect(url.searchParams.get("format")).toBe("json");
    expect(url.searchParams.get("q")).toBe("c++ & rust?");
    expect(calls[0].url).toContain("q=c%2B%2B%20%26%20rust%3F");
    expect(calls[0].init?.method ?? "GET").toBe("GET");
    expect(calls[0].init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("maps results without inventing scores or dates", async () => {
    installFetch(() => json(SEARXNG_BODY));
    const results = await searchSearxng("rust async", 2, "http://searxng:8080");
    expect(results).toEqual([
      {
        title: "Alpha post",
        url: "https://alpha.example.org/post",
        snippet: "Alpha & friends explain async.",
        publishedDate: "2026-03-01T00:00:00",
      },
      {
        title: "Beta",
        url: "https://beta.example.net/",
        snippet: "",
        publishedDate: undefined,
      },
    ]);
    for (const r of results) expect(r.score).toBeUndefined();
  });

  it("explains how to enable JSON output when the instance returns 403", async () => {
    installFetch(() => new Response("Forbidden", { status: 403 }));
    await expect(
      searchSearxng("test", 5, "http://localhost:8888"),
    ).rejects.toThrow(/search\.formats/);
  });

  it("reports other HTTP failures and non-JSON bodies", async () => {
    installFetch(() => new Response("oops", { status: 500 }));
    await expect(
      searchSearxng("test", 5, "http://localhost:8888"),
    ).rejects.toThrow(/HTTP 500/);
    installFetch(() => new Response("<html>not json</html>", { status: 200 }));
    await expect(
      searchSearxng("test", 5, "http://localhost:8888"),
    ).rejects.toThrow(/did not return JSON/);
  });
});

describe("searchExa", () => {
  it("sends a POST to https://api.exa.ai/search with headers and json body", async () => {
    installFetch(() => json({ results: [] }));
    await searchExa("c++ & rust?", 5, "exa-secret-key");
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.exa.ai/search");
    expect(calls[0].init?.method).toBe("POST");
    const headers = calls[0].init?.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("exa-secret-key");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(calls[0].init?.body as string)).toEqual({
      query: "c++ & rust?",
      numResults: 5,
      contents: { text: { maxCharacters: 500 } },
    });
    expect(calls[0].init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("maps results without HTML tags and maps score and publishedDate when reported", async () => {
    installFetch(() => json(EXA_BODY));
    const results = await searchExa("rust async", 2, "exa-key");
    expect(results).toEqual([
      {
        title: "Alpha post",
        url: "https://alpha.example.org/post",
        snippet: "Alpha & friends explain async.",
        score: 0.95,
        publishedDate: "2026-03-01T00:00:00",
      },
      {
        title: "Beta",
        url: "https://beta.example.net/",
        snippet: "",
        score: undefined,
        publishedDate: undefined,
      },
    ]);
  });

  it("truncates snippets to 500 characters", async () => {
    installFetch(() =>
      json({
        results: [
          {
            title: "Long text",
            url: "https://example.com/long",
            text: "a".repeat(600),
          },
        ],
      }),
    );
    const results = await searchExa("test", 1, "exa-key");
    expect(results[0].snippet).toHaveLength(500);
  });

  it("respects signal timeout or cancellation", async () => {
    const controller = new AbortController();
    installFetch(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          if (init?.signal?.aborted) {
            reject(new DOMException("The operation was aborted", "AbortError"));
            return;
          }
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("The operation was aborted", "AbortError")),
          );
          controller.abort();
        }),
    );
    await expect(
      searchExa("test", 5, "exa-key", controller.signal),
    ).rejects.toThrow();
  });

  it("reports HTTP failures", async () => {
    installFetch(() => new Response("Unauthorized", { status: 401 }));
    await expect(searchExa("test", 5, "exa-key")).rejects.toThrow(
      /Exa returned HTTP 401/,
    );
  });
});

describe("searchWeb provider order", () => {
  it("labels Exa and SearXNG", () => {
    expect(SEARCH_PROVIDER_LABELS.exa).toBe("Exa");
    expect(SEARCH_PROVIDER_LABELS.searxng).toBe("SearXNG");
  });

  it("uses Exa when EXA_API_KEY is set and Tavily is unset", async () => {
    process.env.EXA_API_KEY = "exa-test-key";
    installFetch(() => json(EXA_BODY));
    const outcome = await searchWeb("rust async", 5);
    expect(outcome.provider).toBe("exa");
    expect(outcome.results.map((r) => r.url)).toEqual([
      "https://alpha.example.org/post",
      "https://beta.example.net/",
      "https://gamma.example.com/",
    ]);
    expect(outcome.errors).toEqual([]);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.exa.ai/search");
  });

  it("uses SearXNG when SEARXNG_URL is set and no paid key is configured", async () => {
    process.env.SEARXNG_URL = "http://localhost:8888";
    installFetch(() => json(SEARXNG_BODY));
    const outcome = await searchWeb("rust async", 5);
    expect(outcome.provider).toBe("searxng");
    expect(outcome.results.map((r) => r.url)).toEqual([
      "https://alpha.example.org/post",
      "https://beta.example.net/",
      "https://gamma.example.com/",
    ]);
    expect(outcome.errors).toEqual([]);
    expect(calls).toHaveLength(1);
  });

  it("skips SearXNG when SEARXNG_URL is unset", async () => {
    installFetch(() => new Response(DDG_HTML, { status: 200 }));
    const outcome = await searchWeb("rust async", 5);
    expect(outcome.provider).toBe("duckduckgo");
    expect(calls.map((c) => new URL(c.url).hostname)).toEqual([
      "html.duckduckgo.com",
    ]);
  });

  it("tries Tavily, Exa, Brave, SearXNG, then DuckDuckGo, falling through on failure without exposing API key", async () => {
    process.env.TAVILY_API_KEY = "tvly-test";
    process.env.EXA_API_KEY = "exa-secret-token-12345";
    process.env.BRAVE_API_KEY = "brave-test";
    process.env.SEARXNG_URL = "http://localhost:8888";
    installFetch((url) => {
      const host = new URL(url).hostname;
      if (host === "api.tavily.com") return new Response("", { status: 500 });
      if (host === "api.exa.ai") return new Response("", { status: 401 });
      if (host === "api.search.brave.com")
        return new Response("", { status: 429 });
      if (host === "localhost")
        return new Response("Forbidden", { status: 403 });
      return new Response(DDG_HTML, { status: 200 });
    });
    const outcome = await searchWeb("rust async", 5);
    expect(calls.map((c) => new URL(c.url).hostname)).toEqual([
      "api.tavily.com",
      "api.exa.ai",
      "api.search.brave.com",
      "localhost",
      "html.duckduckgo.com",
    ]);
    expect(outcome.provider).toBe("duckduckgo");
    expect(outcome.results).toEqual([
      {
        title: "DDG hit",
        url: "https://ddg.example.org/",
        snippet: "From DuckDuckGo",
      },
    ]);
    expect(outcome.errors.map((e) => e.provider)).toEqual([
      "tavily",
      "exa",
      "brave",
      "searxng",
    ]);
    expect(outcome.errors[1].message).toMatch(/Exa returned HTTP 401/);
    expect(outcome.errors[1].message).not.toContain("exa-secret-token-12345");
    expect(outcome.errors[3].message).toMatch(/search\.formats/);
  });

  it("returns no results (never invented ones) when every provider fails", async () => {
    process.env.SEARXNG_URL = "http://localhost:8888";
    installFetch((url) =>
      new URL(url).hostname === "localhost"
        ? Promise.reject(new TypeError("fetch failed"))
        : new Response('<div class="anomaly-modal__box">bots</div>', {
            status: 202,
          }),
    );
    const outcome = await searchWeb("rust async", 5);
    expect(outcome.provider).toBeNull();
    expect(outcome.results).toEqual([]);
    expect(outcome.errors.map((e) => e.provider)).toEqual([
      "searxng",
      "duckduckgo",
    ]);
    expect(outcome.errors[1].message).toMatch(/SEARXNG_URL/);
  });
});

describe("searchWeb cancellation", () => {
  it("passes the caller signal through to every provider request", async () => {
    process.env.TAVILY_API_KEY = "tvly-test";
    process.env.EXA_API_KEY = "exa-test";
    process.env.BRAVE_API_KEY = "brave-test";
    process.env.SEARXNG_URL = "http://localhost:8888";
    const controller = new AbortController();
    const signals: AbortSignal[] = [];
    installFetch((url, init) => {
      if (init?.signal) signals.push(init.signal);
      return new URL(url).hostname === "html.duckduckgo.com"
        ? new Response(DDG_HTML, { status: 200 })
        : new Response("", { status: 500 });
    });
    await searchWeb("rust async", 5, controller.signal);
    expect(signals).toHaveLength(5);
    for (const s of signals) expect(s.aborted).toBe(false);
    controller.abort();
    for (const s of signals) expect(s.aborted).toBe(true);
  });

  it("aborts the in-flight Exa request and skips remaining providers", async () => {
    process.env.EXA_API_KEY = "exa-test";
    const controller = new AbortController();
    installFetch(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(init.signal?.reason),
          );
          controller.abort();
        }),
    );
    const outcome = await searchWeb("rust async", 5, controller.signal);
    expect(outcome.provider).toBeNull();
    expect(outcome.results).toEqual([]);
    expect(calls.map((c) => new URL(c.url).hostname)).toEqual(["api.exa.ai"]);
    expect(outcome.errors).toEqual([
      { provider: "exa", message: "request cancelled" },
      { provider: "duckduckgo", message: "request cancelled" },
    ]);
  });

  it("aborts the in-flight request and skips remaining providers", async () => {
    process.env.SEARXNG_URL = "http://localhost:8888";
    const controller = new AbortController();
    installFetch(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(init.signal?.reason),
          );
          controller.abort();
        }),
    );
    const outcome = await searchWeb("rust async", 5, controller.signal);
    expect(outcome.provider).toBeNull();
    expect(outcome.results).toEqual([]);
    expect(calls.map((c) => new URL(c.url).hostname)).toEqual(["localhost"]);
    expect(outcome.errors).toEqual([
      { provider: "searxng", message: "request cancelled" },
      { provider: "duckduckgo", message: "request cancelled" },
    ]);
  });

  it("makes no request when the signal is already aborted", async () => {
    installFetch(() => new Response(DDG_HTML, { status: 200 }));
    const outcome = await searchWeb("rust async", 5, AbortSignal.abort());
    expect(calls).toHaveLength(0);
    expect(outcome.provider).toBeNull();
    expect(outcome.errors).toEqual([
      { provider: "duckduckgo", message: "request cancelled" },
    ]);
  });
});
