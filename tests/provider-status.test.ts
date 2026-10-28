import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { resetProviderCaches } from "../src/lib/providers";
import { GET } from "../src/app/api/v1/providers/status/route";

const ENV_KEYS = [
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "GEMINI_MODEL",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_MODEL",
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_AUTH_TOKEN",
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
  "OPENAI_MODEL",
  "OLLAMA_BASE_URL",
  "OLLAMA_MODEL",
  "TAVILY_API_KEY",
  "EXA_API_KEY",
  "BRAVE_API_KEY",
  "SEARXNG_URL",
] as const;

let savedEnv: Record<string, string | undefined> = {};
const originalFetch = globalThis.fetch;

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("GET /api/v1/providers/status", () => {
  beforeEach(() => {
    savedEnv = {};
    for (const key of ENV_KEYS) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
    resetProviderCaches();
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (savedEnv[key] !== undefined) {
        process.env[key] = savedEnv[key];
      } else {
        delete process.env[key];
      }
    }
    globalThis.fetch = originalFetch;
    resetProviderCaches();
  });

  it("returns correct structure when no providers are configured", async () => {
    // With no env vars and Ollama unreachable, all providers except DuckDuckGo should report configured: false.
    globalThis.fetch = (async () => {
      throw new TypeError("fetch failed: connection refused");
    }) as unknown as typeof fetch;

    const res = await GET(
      new Request("http://localhost:3000/api/v1/providers/status"),
    );
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty("providers");
    expect(data).toHaveProperty("search");

    expect(data.providers.gemini).toEqual({ configured: false });
    expect(data.providers.anthropic).toEqual({ configured: false });
    expect(data.providers.openai).toEqual({ configured: false });
    expect(data.providers.ollama).toEqual({ configured: false });

    expect(data.search.tavily).toEqual({ configured: false });
    expect(data.search.exa).toEqual({ configured: false });
    expect(data.search.brave).toEqual({ configured: false });
    expect(data.search.searxng).toEqual({ configured: false });
    // DuckDuckGo is keyless and always available
    expect(data.search.duckduckgo).toEqual({ configured: true });
  });

  it("measures real latency and reflects configured providers when env vars are present", async () => {
    process.env.OPENAI_API_KEY = "sk-test-openai-key-12345";
    process.env.OPENAI_BASE_URL = "https://api.openai.test/v1";

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      if (url.includes("/models")) {
        return jsonResponse({
          data: [
            { id: "gpt-4o" },
            { id: "gpt-4o-mini" },
            { id: "text-embedding-3-small" }, // Non-chat models are filtered out by openaiProvider
          ],
        });
      }
      return jsonResponse({ error: "not found" }, 404);
    }) as unknown as typeof fetch;

    const res = await GET(
      new Request("http://localhost:3000/api/v1/providers/status"),
    );
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.providers.openai.configured).toBe(true);
    expect(typeof data.providers.openai.latencyMs).toBe("number");
    expect(data.providers.openai.latencyMs).toBeGreaterThanOrEqual(0);
    expect(data.providers.openai.modelCount).toBe(2); // gpt-4o, gpt-4o-mini
    expect(data.providers.openai.error).toBeUndefined();

    // Others remain unconfigured
    expect(data.providers.gemini.configured).toBe(false);
    expect(data.providers.anthropic.configured).toBe(false);
  });

  it("reports search provider configuration status", async () => {
    process.env.TAVILY_API_KEY = "tvly-test-key-999";
    process.env.SEARXNG_URL = "https://searx.local";

    const res = await GET(
      new Request("http://localhost:3000/api/v1/providers/status"),
    );
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.search.tavily).toEqual({ configured: true });
    expect(data.search.searxng).toEqual({ configured: true });
    expect(data.search.exa).toEqual({ configured: false });
    expect(data.search.brave).toEqual({ configured: false });
    expect(data.search.duckduckgo).toEqual({ configured: true });
  });

  it("handles provider probe failures gracefully with real error", async () => {
    process.env.OPENAI_API_KEY = "sk-test-openai-key-fail";
    process.env.OPENAI_BASE_URL = "https://api.openai.test/v1";

    globalThis.fetch = (async () => {
      return jsonResponse(
        { error: { message: "Invalid API key provided" } },
        401,
      );
    }) as unknown as typeof fetch;

    const res = await GET(
      new Request(
        "http://localhost:3000/api/v1/providers/status?provider=openai",
      ),
    );
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.providers.openai.configured).toBe(true);
    expect(typeof data.providers.openai.latencyMs).toBe("number");
    expect(data.providers.openai.error).toBeDefined();
    expect(data.providers.openai.error).toContain("401");
  });

  it("supports targeted probing via ?provider= query parameter", async () => {
    process.env.TAVILY_API_KEY = "tvly-test-123";

    let tavilyCalled = false;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      if (url.includes("tavily.com")) {
        tavilyCalled = true;
        return new Response("OK", { status: 200 });
      }
      return jsonResponse({}, 200);
    }) as unknown as typeof fetch;

    const res = await GET(
      new Request(
        "http://localhost:3000/api/v1/providers/status?provider=tavily",
      ),
    );
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(tavilyCalled).toBe(true);
    expect(data.search.tavily.configured).toBe(true);
    expect(typeof data.search.tavily.latencyMs).toBe("number");
    expect(data.search.tavily.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
