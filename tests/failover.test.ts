import { describe, expect, it } from "bun:test";
import { runPipeline } from "../src/lib/research/pipeline";
import { ProviderError } from "../src/lib/providers/types";
import type { AgentThought } from "../src/lib/types";

describe("pipeline provider failover", () => {
  it("fails over to secondary provider when primary returns 503 high demand", async () => {
    const thoughts: AgentThought[] = [];
    const callLog: string[] = [];

    const result = await runPipeline(
      {
        prompt: "Explain edge inference vs cloud LLMs",
        mode: "research",
        budget: "analytical",
      },
      {
        resolveModel: async () => ({
          provider: "gemini",
          model: "gemini-2.5-flash",
        }),
        findFallback: async () => ({
          provider: "ollama",
          model: "qwen2.5:0.5b",
        }),
        generate: async (selection) => {
          callLog.push(`${selection.provider}:${selection.model}`);
          if (selection.provider === "gemini") {
            throw new ProviderError(
              "Gemini request failed (503): This model is currently experiencing high demand.",
              "gemini",
              503,
            );
          }
          return {
            text: JSON.stringify({
              content:
                "Edge inference offers ultra-low latency and local privacy without API rate limits.",
              research: {
                title: "Edge Inference vs Cloud LLMs",
                executiveSummary:
                  "Local edge inference delivers predictable latency and sovereignty.",
                keyFindings: [
                  {
                    point: "Zero cloud API rate limits",
                    description:
                      "Running open models locally eliminates provider HTTP 503 errors.",
                    confidence: "high",
                    citations: [],
                  },
                ],
                recommendation:
                  "Deploy hybrid inference: local Ollama for fast offline queries, cloud for massive reasoning.",
              },
            }),
            provider: selection.provider,
            model: selection.model,
            latencyMs: 120,
            usage: { inputTokens: 50, outputTokens: 25 },
          };
        },
        onThought: (t) => {
          thoughts.push(t);
        },
      },
    );

    expect(callLog).toEqual(["gemini:gemini-2.5-flash", "ollama:qwen2.5:0.5b"]);
    expect(result.content).toContain("Edge inference offers ultra-low latency");
    expect(result.provider).toBe("ollama");
    expect(result.telemetry.model).toBe("ollama:qwen2.5:0.5b");

    const failoverWarning = thoughts.find((t) =>
      t.action.includes("Failing over to ollama:qwen2.5:0.5b"),
    );
    expect(failoverWarning).toBeDefined();
    expect(failoverWarning?.status).toBe("warn");

    const failoverSuccess = thoughts.find((t) =>
      t.action.includes("ollama:qwen2.5:0.5b responded"),
    );
    expect(failoverSuccess).toBeDefined();
    expect(failoverSuccess?.status).toBe("success");
  });

  it("rethrows error when no fallback provider is available", async () => {
    const thoughts: AgentThought[] = [];

    await expect(
      runPipeline(
        {
          prompt: "What is quantum computing?",
          mode: "research",
          budget: "analytical",
        },
        {
          resolveModel: async () => ({
            provider: "gemini",
            model: "gemini-2.5-flash",
          }),
          findFallback: async () => null,
          generate: async () => {
            throw new ProviderError("Rate limit exceeded", "gemini", 429);
          },
          onThought: (t) => {
            thoughts.push(t);
          },
        },
      ),
    ).rejects.toThrow("Rate limit exceeded");

    const failedThought = thoughts.find((t) =>
      t.action.includes("gemini:gemini-2.5-flash failed: Rate limit exceeded"),
    );
    expect(failedThought).toBeDefined();
  });
});
