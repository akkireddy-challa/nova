import {
  decodeHtmlEntities,
  searchDuckDuckGo,
  WebSearchResult,
} from "../web-grounding";

export type SearchProviderId =
  "tavily" | "exa" | "brave" | "searxng" | "duckduckgo";

export const SEARCH_PROVIDER_LABELS: Record<SearchProviderId, string> = {
  tavily: "Tavily",
  exa: "Exa",
  brave: "Brave Search",
  searxng: "SearXNG",
  duckduckgo: "DuckDuckGo",
};

export interface SearchAttemptError {
  provider: SearchProviderId;
  message: string;
}

export interface SearchOutcome {
  /** Provider that produced `results`; null when every provider failed. */
  provider: SearchProviderId | null;
  results: WebSearchResult[];
  /** Failures from providers tried before (or instead of) the successful one. */
  errors: SearchAttemptError[];
  latencyMs: number;
}

const SEARCH_TIMEOUT_MS = 8000;

interface TavilyResponse {
  results?: {
    title?: string;
    url?: string;
    content?: string;
    score?: number;
    published_date?: string;
  }[];
}

interface ExaResponse {
  results?: {
    title?: string;
    url?: string;
    text?: string;
    score?: number;
    publishedDate?: string;
  }[];
}

interface BraveResponse {
  web?: {
    results?: {
      title?: string;
      url?: string;
      description?: string;
      age?: string;
      page_age?: string;
    }[];
  };
}

interface SearxngResponse {
  results?: {
    title?: string;
    url?: string;
    content?: string;
    publishedDate?: string | null;
  }[];
}

/** Per-provider timeout, cancelled early if the caller's signal aborts. */
function requestSignal(signal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(SEARCH_TIMEOUT_MS);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

function stripTags(text: string): string {
  return decodeHtmlEntities(text.replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

async function searchTavily(
  query: string,
  maxResults: number,
  apiKey: string,
  signal?: AbortSignal,
): Promise<WebSearchResult[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      max_results: maxResults,
      search_depth: "basic",
    }),
    signal: requestSignal(signal),
  });
  if (!res.ok) throw new Error(`Tavily returned HTTP ${res.status}`);
  const data = (await res.json()) as TavilyResponse;
  return (data.results ?? [])
    .filter((r) => r.url && r.title)
    .slice(0, maxResults)
    .map((r) => ({
      title: stripTags(r.title ?? ""),
      url: r.url ?? "",
      snippet: stripTags(r.content ?? "").slice(0, 500),
      score: typeof r.score === "number" ? r.score : undefined,
      publishedDate: r.published_date || undefined,
    }));
}

export async function searchExa(
  query: string,
  maxResults: number,
  apiKey: string,
  signal?: AbortSignal,
): Promise<WebSearchResult[]> {
  const res = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      query,
      numResults: maxResults,
      contents: { text: { maxCharacters: 500 } },
    }),
    signal: requestSignal(signal),
  });
  if (!res.ok) throw new Error(`Exa returned HTTP ${res.status}`);
  const data = (await res.json()) as ExaResponse;
  return (data.results ?? [])
    .filter((r) => r.url && r.title)
    .slice(0, maxResults)
    .map((r) => ({
      title: stripTags(r.title ?? ""),
      url: r.url ?? "",
      snippet: stripTags(r.text ?? "").slice(0, 500),
      score: typeof r.score === "number" ? r.score : undefined,
      publishedDate: r.publishedDate,
    }));
}

async function searchBrave(
  query: string,
  maxResults: number,
  apiKey: string,
  signal?: AbortSignal,
): Promise<WebSearchResult[]> {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${maxResults}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "X-Subscription-Token": apiKey },
    signal: requestSignal(signal),
  });
  if (!res.ok) throw new Error(`Brave Search returned HTTP ${res.status}`);
  const data = (await res.json()) as BraveResponse;
  return (data.web?.results ?? [])
    .filter((r) => r.url && r.title)
    .slice(0, maxResults)
    .map((r) => ({
      title: stripTags(r.title ?? ""),
      url: r.url ?? "",
      snippet: stripTags(r.description ?? ""),
      publishedDate: r.page_age || r.age || undefined,
    }));
}

/**
 * Queries a self-hosted SearXNG instance through its JSON API. SearXNG answers
 * format=json with 403 unless `json` is listed in `search.formats`.
 * SearXNG's `score` is an unbounded engine-weight sum, not a [0, 1] relevance,
 * so it is not mapped onto `WebSearchResult.score`.
 */
export async function searchSearxng(
  query: string,
  maxResults: number,
  baseUrl: string,
  signal?: AbortSignal,
): Promise<WebSearchResult[]> {
  const url = `${baseUrl.replace(/\/+$/, "")}/search?q=${encodeURIComponent(query.trim())}&format=json`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: requestSignal(signal),
  });
  if (res.status === 403) {
    throw new Error(
      'SearXNG returned HTTP 403: JSON output is disabled on this instance; add "json" to search.formats in its settings.yml and restart it',
    );
  }
  if (!res.ok) throw new Error(`SearXNG returned HTTP ${res.status}`);
  let data: SearxngResponse;
  try {
    data = (await res.json()) as SearxngResponse;
  } catch {
    throw new Error(
      "SearXNG did not return JSON; check that SEARXNG_URL points at the instance root",
    );
  }
  return (data.results ?? [])
    .filter((r) => r.url && r.title)
    .slice(0, maxResults)
    .map((r) => ({
      title: stripTags(r.title ?? ""),
      url: r.url ?? "",
      snippet: stripTags(r.content ?? "").slice(0, 500),
      publishedDate: r.publishedDate || undefined,
    }));
}

/** Error text safe to show users: no URLs, no key material. */
function describeError(err: unknown): string {
  if (
    err instanceof Error &&
    (err.name === "TimeoutError" || err.name === "AbortError")
  )
    return "request timed out";
  const message = err instanceof Error ? err.message : String(err);
  return message.replace(/https?:\/\/\S+/g, "[url]").slice(0, 200);
}

/**
 * Searches the web with the configured providers in order of preference
 * (Tavily, Exa, Brave, self-hosted SearXNG, then keyless DuckDuckGo), falling
 * through on failure. Never invents results: if all providers fail the result
 * list is empty. Aborting `signal` cancels the in-flight request and skips the
 * remaining providers.
 */
export async function searchWeb(
  query: string,
  maxResults: number,
  signal?: AbortSignal,
): Promise<SearchOutcome> {
  const start = Date.now();
  const attempts: {
    provider: SearchProviderId;
    run: () => Promise<WebSearchResult[]>;
  }[] = [];
  const tavilyKey = process.env.TAVILY_API_KEY?.trim();
  const exaKey = process.env.EXA_API_KEY?.trim();
  const braveKey = process.env.BRAVE_API_KEY?.trim();
  const searxngUrl = process.env.SEARXNG_URL?.trim();
  if (tavilyKey)
    attempts.push({
      provider: "tavily",
      run: () => searchTavily(query, maxResults, tavilyKey, signal),
    });
  if (exaKey)
    attempts.push({
      provider: "exa",
      run: () => searchExa(query, maxResults, exaKey, signal),
    });
  if (braveKey)
    attempts.push({
      provider: "brave",
      run: () => searchBrave(query, maxResults, braveKey, signal),
    });
  if (searxngUrl)
    attempts.push({
      provider: "searxng",
      run: () => searchSearxng(query, maxResults, searxngUrl, signal),
    });
  attempts.push({
    provider: "duckduckgo",
    run: () => searchDuckDuckGo(query, maxResults, requestSignal(signal)),
  });

  const errors: SearchAttemptError[] = [];
  for (const attempt of attempts) {
    if (signal?.aborted) {
      errors.push({ provider: attempt.provider, message: "request cancelled" });
      break;
    }
    try {
      const results = await attempt.run();
      return {
        provider: attempt.provider,
        results,
        errors,
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      errors.push({
        provider: attempt.provider,
        message: signal?.aborted ? "request cancelled" : describeError(err),
      });
    }
  }
  return { provider: null, results: [], errors, latencyMs: Date.now() - start };
}
