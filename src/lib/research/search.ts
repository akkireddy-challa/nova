import { decodeHtmlEntities, searchDuckDuckGo, WebSearchResult } from '../web-grounding';

export type SearchProviderId = 'tavily' | 'brave' | 'duckduckgo';

export const SEARCH_PROVIDER_LABELS: Record<SearchProviderId, string> = {
  tavily: 'Tavily',
  brave: 'Brave Search',
  duckduckgo: 'DuckDuckGo',
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
  results?: { title?: string; url?: string; content?: string; score?: number; published_date?: string }[];
}

interface BraveResponse {
  web?: { results?: { title?: string; url?: string; description?: string; age?: string; page_age?: string }[] };
}

function stripTags(text: string): string {
  return decodeHtmlEntities(text.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
}

async function searchTavily(query: string, maxResults: number, apiKey: string): Promise<WebSearchResult[]> {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ query, max_results: maxResults, search_depth: 'basic' }),
    signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Tavily returned HTTP ${res.status}`);
  const data = (await res.json()) as TavilyResponse;
  return (data.results ?? [])
    .filter(r => r.url && r.title)
    .slice(0, maxResults)
    .map(r => ({
      title: stripTags(r.title ?? ''),
      url: r.url ?? '',
      snippet: stripTags(r.content ?? '').slice(0, 500),
      score: typeof r.score === 'number' ? r.score : undefined,
      publishedDate: r.published_date || undefined,
    }));
}

async function searchBrave(query: string, maxResults: number, apiKey: string): Promise<WebSearchResult[]> {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${maxResults}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'X-Subscription-Token': apiKey },
    signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Brave Search returned HTTP ${res.status}`);
  const data = (await res.json()) as BraveResponse;
  return (data.web?.results ?? [])
    .filter(r => r.url && r.title)
    .slice(0, maxResults)
    .map(r => ({
      title: stripTags(r.title ?? ''),
      url: r.url ?? '',
      snippet: stripTags(r.description ?? ''),
      publishedDate: r.page_age || r.age || undefined,
    }));
}

/** Error text safe to show users: no URLs, no key material. */
function describeError(err: unknown): string {
  if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) return 'request timed out';
  const message = err instanceof Error ? err.message : String(err);
  return message.replace(/https?:\/\/\S+/g, '[url]').slice(0, 200);
}

/**
 * Searches the web with the configured providers in order of preference
 * (Tavily, Brave, then keyless DuckDuckGo), falling through on failure.
 * Never invents results: if all providers fail the result list is empty.
 */
export async function searchWeb(query: string, maxResults: number): Promise<SearchOutcome> {
  const start = Date.now();
  const attempts: { provider: SearchProviderId; run: () => Promise<WebSearchResult[]> }[] = [];
  const tavilyKey = process.env.TAVILY_API_KEY?.trim();
  const braveKey = process.env.BRAVE_API_KEY?.trim();
  if (tavilyKey) attempts.push({ provider: 'tavily', run: () => searchTavily(query, maxResults, tavilyKey) });
  if (braveKey) attempts.push({ provider: 'brave', run: () => searchBrave(query, maxResults, braveKey) });
  attempts.push({ provider: 'duckduckgo', run: () => searchDuckDuckGo(query, maxResults, AbortSignal.timeout(SEARCH_TIMEOUT_MS)) });

  const errors: SearchAttemptError[] = [];
  for (const attempt of attempts) {
    try {
      const results = await attempt.run();
      return { provider: attempt.provider, results, errors, latencyMs: Date.now() - start };
    } catch (err) {
      errors.push({ provider: attempt.provider, message: describeError(err) });
    }
  }
  return { provider: null, results: [], errors, latencyMs: Date.now() - start };
}
