import { describe, expect, it, afterEach } from "bun:test";
import { NextRequest } from "next/server";
import {
  BENCHMARK_STANDARDIZATION_PROMPT,
  calculateLocalCostSavings,
  computeBenchmarkMetrics,
  countTokens,
  discoverLocalEngines,
  probeLocalEngine,
} from "../src/lib/providers/local-engine-probe";
import {
  GET as getBenchmark,
  POST as postBenchmark,
} from "../src/app/api/v1/providers/benchmark/route";

describe("Local Engine Hub & Benchmark", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("Cost savings calculation formulas", () => {
    it("returns zero cost and zero savings for zero or empty tokens", () => {
      const result = calculateLocalCostSavings(0, 0);
      expect(result).toEqual({
        hostedCostUsd: 0,
        localCostUsd: 0,
        savingsUsd: 0,
      });
    });

    it("clamps negative token inputs to zero", () => {
      const result = calculateLocalCostSavings(-50, -100);
      expect(result).toEqual({
        hostedCostUsd: 0,
        localCostUsd: 0,
        savingsUsd: 0,
      });
    });

    it("calculates exact hosted cost and savings against Claude 3.5 Sonnet baseline ($3/M in, $15/M out)", () => {
      // 1,000 prompt tokens: (1000 / 1e6) * $3 = $0.003
      // 500 completion tokens: (500 / 1e6) * $15 = $0.0075
      // Total hosted: $0.0105
      const result = calculateLocalCostSavings(1000, 500);
      expect(result.hostedCostUsd).toBe(0.0105);
      expect(result.localCostUsd).toBe(0);
      expect(result.savingsUsd).toBe(0.0105);
    });

    it("supports custom rate overrides", () => {
      const result = calculateLocalCostSavings(1000, 1000, {
        inputPerMillion: 1.0,
        outputPerMillion: 2.0,
      });
      // (1000 / 1e6) * 1 + (1000 / 1e6) * 2 = 0.001 + 0.002 = 0.003
      expect(result.hostedCostUsd).toBe(0.003);
      expect(result.savingsUsd).toBe(0.003);
    });
  });

  describe("Token counting & benchmark metrics computation", () => {
    it("counts tokens deterministically with countTokens", () => {
      expect(countTokens("")).toBe(0);
      expect(countTokens("   ")).toBe(0);
      expect(countTokens("Hello world")).toBe(2);
      expect(countTokens("It's a test of tokenization.")).toBe(6);
      expect(countTokens(BENCHMARK_STANDARDIZATION_PROMPT)).toBeGreaterThan(10);
    });

    it("computes benchmark metrics (TTFT, TPS, cost) correctly", () => {
      // 50 tokens in (1200ms - 200ms) = 1000ms -> 50 tokens/sec
      const metrics = computeBenchmarkMetrics({
        ttftMs: 200,
        totalTimeMs: 1200,
        tokenCount: 50,
        promptTokens: 12,
      });

      expect(metrics.ttftMs).toBe(200);
      expect(metrics.totalTimeMs).toBe(1200);
      expect(metrics.tokenCount).toBe(50);
      expect(metrics.tokensPerSecond).toBe(50);
      expect(metrics.costSavings.savingsUsd).toBeGreaterThan(0);
    });

    it("avoids division by zero if totalTimeMs equals ttftMs", () => {
      const metrics = computeBenchmarkMetrics({
        ttftMs: 500,
        totalTimeMs: 500,
        tokenCount: 10,
        promptTokens: 10,
      });

      expect(metrics.tokensPerSecond).toBe(0);
      expect(Number.isFinite(metrics.tokensPerSecond)).toBe(true);
    });
  });

  describe("Local engine probing", () => {
    it("handles empty endpoint cleanly", async () => {
      const result = await probeLocalEngine("");
      expect(result.reachable).toBe(false);
      expect(result.runtime).toBe("unknown");
      expect(result.models).toEqual([]);
      expect(result.error).toContain("required");
    });

    it("probes Ollama endpoint (/api/tags format) and identifies runtime & models", async () => {
      globalThis.fetch = (async (url: string | URL | Request) => {
        const urlStr = url.toString();
        if (urlStr.includes("/api/tags")) {
          return Response.json({
            models: [
              { name: "llama3:latest", model: "llama3:latest" },
              { name: "phi3:mini", model: "phi3:mini" },
            ],
          });
        }
        return new Response("Not found", { status: 404 });
      }) as typeof fetch;

      const result = await probeLocalEngine("http://127.0.0.1:11434");
      expect(result.reachable).toBe(true);
      expect(result.runtime).toBe("ollama");
      expect(result.models).toEqual(["llama3:latest", "phi3:mini"]);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    it("probes LM Studio endpoint (/v1/models format with owned_by) and identifies runtime", async () => {
      globalThis.fetch = (async (url: string | URL | Request) => {
        const urlStr = url.toString();
        if (urlStr.includes("/v1/models") || urlStr.includes("/models")) {
          return Response.json({
            object: "list",
            data: [{ id: "mistral-7b-instruct-v0.3", owned_by: "lmstudio" }],
          });
        }
        return new Response("Not found", { status: 404 });
      }) as typeof fetch;

      const result = await probeLocalEngine("http://127.0.0.1:1234/v1");
      expect(result.reachable).toBe(true);
      expect(result.runtime).toBe("lmstudio");
      expect(result.models).toEqual(["mistral-7b-instruct-v0.3"]);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("probes vLLM endpoint (/v1/models format) and identifies runtime", async () => {
      globalThis.fetch = (async (url: string | URL | Request) => {
        const urlStr = url.toString();
        if (urlStr.includes("/v1/models") || urlStr.includes("/models")) {
          return Response.json({
            object: "list",
            data: [
              { id: "meta-llama/Meta-Llama-3-8B-Instruct", owned_by: "vllm" },
            ],
          });
        }
        return new Response("Not found", { status: 404 });
      }) as typeof fetch;

      const result = await probeLocalEngine("http://127.0.0.1:8000/v1");
      expect(result.reachable).toBe(true);
      expect(result.runtime).toBe("vllm");
      expect(result.models).toEqual(["meta-llama/Meta-Llama-3-8B-Instruct"]);
    });

    it("probes generic OpenAI-compatible endpoint as 'unknown' runtime", async () => {
      globalThis.fetch = (async (url: string | URL | Request) => {
        const urlStr = url.toString();
        if (urlStr.includes("/v1/models") || urlStr.includes("/models")) {
          return Response.json({
            object: "list",
            data: [{ id: "custom-local-model", owned_by: "local-user" }],
          });
        }
        return new Response("Not found", { status: 404 });
      }) as typeof fetch;

      const result = await probeLocalEngine("http://127.0.0.1:9090/v1");
      expect(result.reachable).toBe(true);
      expect(result.runtime).toBe("unknown");
      expect(result.models).toEqual(["custom-local-model"]);
    });

    it("gracefully falls back when endpoint is unreachable", async () => {
      globalThis.fetch = (async () => {
        throw new Error("Connection refused (ECONNREFUSED 127.0.0.1:9999)");
      }) as unknown as typeof fetch;

      const result = await probeLocalEngine("http://127.0.0.1:9999");
      expect(result.reachable).toBe(false);
      expect(result.runtime).toBe("unknown");
      expect(result.models).toEqual([]);
      expect(result.error).toContain("Connection refused");
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("discoverLocalEngines queries default engines in parallel", async () => {
      globalThis.fetch = (async (url: string | URL | Request) => {
        const urlStr = url.toString();
        if (urlStr.includes("11434") && urlStr.includes("/api/tags")) {
          return Response.json({
            models: [{ name: "llama3:latest" }],
          });
        }
        throw new Error("Connection refused");
      }) as typeof fetch;

      const discovered = await discoverLocalEngines();
      expect(discovered).toHaveLength(3);
      const ollama = discovered.find((d) => d.id === "ollama");
      const lmstudio = discovered.find((d) => d.id === "lmstudio");
      const vllm = discovered.find((d) => d.id === "vllm");

      expect(ollama?.reachable).toBe(true);
      expect(ollama?.models).toEqual(["llama3:latest"]);
      expect(lmstudio?.reachable).toBe(false);
      expect(vllm?.reachable).toBe(false);
    });
  });

  describe("API Route: /api/v1/providers/benchmark", () => {
    it("GET /api/v1/providers/benchmark returns discovered engines list", async () => {
      globalThis.fetch = (async (url: string | URL | Request) => {
        const urlStr = url.toString();
        if (urlStr.includes("11434")) {
          return Response.json({ models: [{ name: "qwen2.5:7b" }] });
        }
        throw new Error("Offline");
      }) as typeof fetch;

      const req = new NextRequest(
        "http://localhost/api/v1/providers/benchmark",
      );
      const res = await getBenchmark(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveProperty("engines");
      expect(Array.isArray(data.engines)).toBe(true);
      expect(data.engines.length).toBeGreaterThanOrEqual(3);
    });

    it("GET /api/v1/providers/benchmark?endpoint=... probes specific endpoint", async () => {
      globalThis.fetch = (async () => {
        return Response.json({ models: [{ name: "codellama:latest" }] });
      }) as unknown as typeof fetch;

      const req = new NextRequest(
        "http://localhost/api/v1/providers/benchmark?endpoint=http://127.0.0.1:11434",
      );
      const res = await getBenchmark(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveProperty("probe");
      expect(data.probe.reachable).toBe(true);
      expect(data.probe.models).toContain("codellama:latest");
    });

    it("POST /api/v1/providers/benchmark rejects missing model with 400", async () => {
      const req = new NextRequest(
        "http://localhost/api/v1/providers/benchmark",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );

      const res = await postBenchmark(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Model name is required");
    });

    it("POST /api/v1/providers/benchmark rejects invalid JSON with 400", async () => {
      const req = new NextRequest(
        "http://localhost/api/v1/providers/benchmark",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "not-json",
        },
      );

      const res = await postBenchmark(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Invalid JSON");
    });

    it("POST /api/v1/providers/benchmark executes live benchmark, streams chunks and returns real metrics", async () => {
      // Mock streaming NDJSON response from Ollama endpoint
      const chunks = [
        JSON.stringify({
          message: {
            content: "Concurrency is dealing with lots of things at once; ",
          },
          done: false,
        }),
        JSON.stringify({
          message: {
            content:
              "parallelism is doing lots of things at once simultaneously.",
          },
          done: true,
        }),
      ];

      const stream = new ReadableStream({
        async start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(new TextEncoder().encode(chunk + "\n"));
          }
          controller.close();
        },
      });

      globalThis.fetch = (async () => {
        return new Response(stream, {
          status: 200,
          headers: { "Content-Type": "application/x-ndjson" },
        });
      }) as unknown as typeof fetch;

      const req = new NextRequest(
        "http://localhost/api/v1/providers/benchmark",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama3:latest",
            endpoint: "http://127.0.0.1:11434",
          }),
        },
      );

      const res = await postBenchmark(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.model).toBe("llama3:latest");
      expect(data.text).toContain("Concurrency is dealing");
      expect(data.text).toContain("parallelism is doing");
      expect(data.tokenCount).toBeGreaterThan(0);
      expect(data.ttftMs).toBeGreaterThanOrEqual(0);
      expect(data.totalTimeMs).toBeGreaterThanOrEqual(data.ttftMs);
      expect(data.tokensPerSecond).toBeGreaterThanOrEqual(0);
      expect(data.costSavings).toHaveProperty("savingsUsd");
      expect(data.costSavings.savingsUsd).toBeGreaterThan(0);
      expect(data.costSavings.localCostUsd).toBe(0);
    });

    it("POST /api/v1/providers/benchmark reports 502 when backend stream fails", async () => {
      globalThis.fetch = (async () => {
        return new Response("Ollama model not found", { status: 404 });
      }) as unknown as typeof fetch;

      const req = new NextRequest(
        "http://localhost/api/v1/providers/benchmark",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "non-existent-model",
            endpoint: "http://127.0.0.1:11434",
          }),
        },
      );

      const res = await postBenchmark(req);
      expect(res.status).toBe(502);
      const data = await res.json();
      expect(data.error).toContain("Benchmark failed");
    });
  });
});
