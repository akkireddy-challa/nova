/**
 * Keyless web search via the DuckDuckGo HTML endpoint. Used as the fallback search
 * provider when no Tavily/Brave key is configured. Returns only what the results
 * page actually contains; nothing is synthesized.
 */

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  /** Provider-reported relevance in [0, 1], when the provider reports one. */
  score?: number;
  /** Provider-reported publication date/age string, when available. */
  publishedDate?: string;
}

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => safeFromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => safeFromCodePoint(parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

function safeFromCodePoint(code: number): string {
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

function cleanInline(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
}

export function parseDuckDuckGoHtml(html: string, maxResults: number): WebSearchResult[] {
  const results: WebSearchResult[] = [];
  const blockRegex = /<h2 class="result__title">\s*<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>\s*<\/h2>([\s\S]*?)(?=<h2 class="result__title">|$)/g;
  const snippetRegex = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/;

  for (const match of html.matchAll(blockRegex)) {
    if (results.length >= maxResults) break;
    let rawUrl = decodeHtmlEntities(match[1]);
    if (rawUrl.includes('uddg=')) {
      try {
        rawUrl = decodeURIComponent(rawUrl.split('uddg=')[1].split('&')[0]);
      } catch {
        continue;
      }
    }
    if (rawUrl.startsWith('//')) rawUrl = `https:${rawUrl}`;

    let hostname: string;
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue;
      hostname = parsed.hostname;
    } catch {
      continue;
    }
    // Skip DuckDuckGo's own ad/redirect links.
    if (hostname.endsWith('duckduckgo.com')) continue;

    const title = cleanInline(match[2]);
    if (!title) continue;
    const snippetMatch = match[3].match(snippetRegex);
    results.push({ title, url: rawUrl, snippet: snippetMatch ? cleanInline(snippetMatch[1]) : '' });
  }
  return results;
}

/** Throws on network/HTTP failure so the caller can record the error honestly. */
export async function searchDuckDuckGo(query: string, maxResults: number, signal?: AbortSignal): Promise<WebSearchResult[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query.trim())}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: signal ?? AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`DuckDuckGo returned HTTP ${res.status}`);
  const html = await res.text();
  // DuckDuckGo answers automated traffic with a 202 bot-check page instead of results.
  if (res.status === 202 || html.includes('anomaly-modal')) {
    throw new Error('DuckDuckGo blocked the request with a bot check; set TAVILY_API_KEY or BRAVE_API_KEY for reliable search');
  }
  return parseDuckDuckGoHtml(html, maxResults);
}
