import { connection } from "next/server";
import { getProvider } from "@/lib/providers";
import { resetGeminiCache } from "@/lib/providers/gemini";
import { resetOllamaCache } from "@/lib/providers/ollama";

export interface ProviderStatus {
  configured: boolean;
  latencyMs?: number;
  modelCount?: number;
  error?: string;
}

export interface SearchStatus {
  configured: boolean;
  latencyMs?: number;
  error?: string;
}

export interface ProviderControlHubResponse {
  providers: Record<string, ProviderStatus>;
  search: Record<string, SearchStatus>;
}

type LLMProviderId = "gemini" | "anthropic" | "openai" | "ollama";

const SEARCH_PROVIDER_IDS = [
  "tavily",
  "exa",
  "brave",
  "searxng",
  "duckduckgo",
] as const;
type SearchProviderId = (typeof SEARCH_PROVIDER_IDS)[number];

async function checkLLM(
  id: LLMProviderId,
  shouldMeasureLatency: boolean,
): Promise<ProviderStatus> {
  const provider = getProvider(id);
  if (!provider) {
    return { configured: false, error: `Unknown provider: ${id}` };
  }

  if (id === "gemini") resetGeminiCache();
  if (id === "ollama") resetOllamaCache();

  let isConfigured = false;
  try {
    isConfigured = await provider.isConfigured();
  } catch (err) {
    return {
      configured: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  if (!isConfigured) {
    return { configured: false };
  }

  if (!shouldMeasureLatency) {
    return { configured: true };
  }

  const start = performance.now();
  try {
    const models = await provider.listModels();
    const latencyMs = Math.round(performance.now() - start);
    return {
      configured: true,
      latencyMs,
      modelCount: models.length,
    };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      configured: true,
      latencyMs,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function checkSearch(
  id: SearchProviderId,
  shouldProbe: boolean,
): Promise<SearchStatus> {
  const keyChecks: Record<SearchProviderId, boolean> = {
    tavily: Boolean(process.env.TAVILY_API_KEY?.trim()),
    exa: Boolean(process.env.EXA_API_KEY?.trim()),
    brave: Boolean(process.env.BRAVE_API_KEY?.trim()),
    searxng: Boolean(process.env.SEARXNG_URL?.trim()),
    duckduckgo: true,
  };

  const configured = keyChecks[id];
  if (!configured) {
    return { configured: false };
  }

  if (!shouldProbe) {
    return { configured: true };
  }

  const start = performance.now();
  try {
    switch (id) {
      case "tavily": {
        await fetch("https://api.tavily.com", {
          signal: AbortSignal.timeout(5000),
        });
        break;
      }
      case "exa": {
        await fetch("https://api.exa.ai", {
          signal: AbortSignal.timeout(5000),
        });
        break;
      }
      case "brave": {
        await fetch("https://api.search.brave.com", {
          signal: AbortSignal.timeout(5000),
        });
        break;
      }
      case "searxng": {
        const url = process.env.SEARXNG_URL?.trim() || "";
        await fetch(url.replace(/\/+$/, ""), {
          signal: AbortSignal.timeout(5000),
        });
        break;
      }
      case "duckduckgo": {
        await fetch("https://html.duckduckgo.com", {
          method: "HEAD",
          signal: AbortSignal.timeout(5000),
        });
        break;
      }
    }
    const latencyMs = Math.round(performance.now() - start);
    return { configured: true, latencyMs };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      configured: true,
      latencyMs,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function GET(request?: Request): Promise<Response> {
  try {
    await connection();
  } catch {
    // Outside Next.js request context (e.g. tests)
  }

  let targetProvider: string | null = null;
  let probeAll = false;

  if (request?.url) {
    try {
      const url = new URL(request.url);
      targetProvider =
        url.searchParams.get("provider")?.toLowerCase().trim() || null;
      probeAll = url.searchParams.get("probe") === "true";
    } catch {
      // Invalid URL string; ignore search params
    }
  }

  const isTargetingSearch =
    targetProvider &&
    (SEARCH_PROVIDER_IDS as readonly string[]).includes(targetProvider);

  // If a specific provider is targeted, only measure latency on that provider.
  // If no target is specified, measure latency on all configured LLMs, and probe search only if probeAll is true.
  const [gemini, anthropic, openai, ollama] = await Promise.all([
    checkLLM("gemini", targetProvider ? targetProvider === "gemini" : true),
    checkLLM(
      "anthropic",
      targetProvider ? targetProvider === "anthropic" : true,
    ),
    checkLLM("openai", targetProvider ? targetProvider === "openai" : true),
    checkLLM("ollama", targetProvider ? targetProvider === "ollama" : true),
  ]);

  const [tavily, exa, brave, searxng, duckduckgo] = await Promise.all([
    checkSearch(
      "tavily",
      probeAll || (isTargetingSearch ? targetProvider === "tavily" : false),
    ),
    checkSearch(
      "exa",
      probeAll || (isTargetingSearch ? targetProvider === "exa" : false),
    ),
    checkSearch(
      "brave",
      probeAll || (isTargetingSearch ? targetProvider === "brave" : false),
    ),
    checkSearch(
      "searxng",
      probeAll || (isTargetingSearch ? targetProvider === "searxng" : false),
    ),
    checkSearch(
      "duckduckgo",
      probeAll || (isTargetingSearch ? targetProvider === "duckduckgo" : false),
    ),
  ]);

  const body: ProviderControlHubResponse = {
    providers: {
      gemini,
      anthropic,
      openai,
      ollama,
    },
    search: {
      tavily,
      exa,
      brave,
      searxng,
      duckduckgo,
    },
  };

  return Response.json(body, {
    headers: { "Cache-Control": "no-store" },
  });
}
