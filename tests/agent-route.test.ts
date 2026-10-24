import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { NextRequest } from "next/server";
import { POST } from "../src/app/api/agent/route";
import { resetOllamaCache } from "../src/lib/providers/ollama";

const PROVIDER_ENV = [
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
  "OLLAMA_BASE_URL",
  "OLLAMA_MODEL",
];

const realFetch = globalThis.fetch;
let savedEnv: Record<string, string | undefined> = {};
let fetchedUrls: string[] = [];

function agentRequest(body: string): NextRequest {
  return new NextRequest("http://localhost/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

beforeEach(() => {
  savedEnv = Object.fromEntries(
    PROVIDER_ENV.map((key) => [key, process.env[key]]),
  );
  for (const key of PROVIDER_ENV) delete process.env[key];
  resetOllamaCache();
  fetchedUrls = [];
  // Ollama is the only provider probed without a key; make it unreachable.
  globalThis.fetch = (async (input: string | URL | Request) => {
    fetchedUrls.push(input instanceof Request ? input.url : String(input));
    throw new TypeError("fetch failed: connection refused");
  }) as unknown as typeof fetch;
});

afterEach(() => {
  for (const key of PROVIDER_ENV) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  resetOllamaCache();
  globalThis.fetch = realFetch;
});

describe("POST /api/agent", () => {
  it("returns 503 NO_PROVIDER without searching when nothing is configured", async () => {
    const res = await POST(
      agentRequest(
        JSON.stringify({ prompt: "What is MCP?", mode: "research" }),
      ),
    );
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe("NO_PROVIDER");
    expect(body.artifact).toBeUndefined();
    expect(fetchedUrls.every((url) => url.includes("11434"))).toBe(true);
  });

  it("returns 400 BAD_REQUEST for invalid JSON", async () => {
    const res = await POST(agentRequest("{not json"));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("BAD_REQUEST");
  });

  it("returns 400 BAD_REQUEST for an empty prompt without attachments", async () => {
    const res = await POST(
      agentRequest(JSON.stringify({ prompt: "   ", mode: "research" })),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("BAD_REQUEST");
  });

  it("returns 400 BAD_REQUEST for an unknown mode", async () => {
    const res = await POST(
      agentRequest(JSON.stringify({ prompt: "Hi", mode: "startup-center" })),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("BAD_REQUEST");
  });
});
