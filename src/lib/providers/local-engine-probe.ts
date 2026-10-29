import { readLines } from "./openai";
import {
  parseModelId,
  resolveModel,
  streamText,
  type ProviderId,
} from "./index";

export type LocalRuntimeType = "ollama" | "lmstudio" | "vllm" | "unknown";

export interface LocalEngineProbeResult {
  reachable: boolean;
  runtime: LocalRuntimeType;
  models: string[];
  latencyMs: number;
  error?: string;
}

export interface ProbeOptions {
  timeoutMs?: number;
}

export interface CostSavings {
  hostedCostUsd: number;
  localCostUsd: number;
  savingsUsd: number;
}

export interface BenchmarkMetrics {
  ttftMs: number;
  totalTimeMs: number;
  tokenCount: number;
  tokensPerSecond: number;
  costSavings: CostSavings;
}

export interface DiscoveredEngine {
  id: string;
  name: string;
  endpoint: string;
  reachable: boolean;
  runtime: LocalRuntimeType;
  models: string[];
  latencyMs: number;
  error?: string;
}

export const BENCHMARK_STANDARDIZATION_PROMPT =
  "Explain the core distinction between concurrency and parallelism in 40 words.";

export const DEFAULT_LOCAL_ENGINES: ReadonlyArray<{
  id: string;
  name: string;
  endpoint: string;
  runtime: LocalRuntimeType;
}> = [
  {
    id: "ollama",
    name: "Ollama",
    endpoint: "http://127.0.0.1:11434",
    runtime: "ollama",
  },
  {
    id: "lmstudio",
    name: "LM Studio",
    endpoint: "http://127.0.0.1:1234/v1",
    runtime: "lmstudio",
  },
  {
    id: "vllm",
    name: "vLLM",
    endpoint: "http://127.0.0.1:8000/v1",
    runtime: "vllm",
  },
];

/**
 * Standard baseline cost comparison against hosted frontier models (e.g. Claude 3.5 Sonnet: $3/M in, $15/M out).
 * Local inference on self-hosted hardware incurs $0 API cost.
 */
export function calculateLocalCostSavings(
  promptTokens: number,
  completionTokens: number,
  rates: { inputPerMillion?: number; outputPerMillion?: number } = {},
): CostSavings {
  const inputRate = rates.inputPerMillion ?? 3.0;
  const outputRate = rates.outputPerMillion ?? 15.0;

  const validPromptTokens = Math.max(0, promptTokens || 0);
  const validCompletionTokens = Math.max(0, completionTokens || 0);

  const hostedCostUsd = Number(
    (
      (validPromptTokens / 1_000_000) * inputRate +
      (validCompletionTokens / 1_000_000) * outputRate
    ).toFixed(6),
  );
  const localCostUsd = 0;
  const savingsUsd = hostedCostUsd;

  return {
    hostedCostUsd,
    localCostUsd,
    savingsUsd,
  };
}

/**
 * Counts natural language tokens using linguistic boundary matching (words, contractions, punctuation).
 * Preserves strictly deterministic, non-random token counting across environments.
 */
export function countTokens(text: string): number {
  if (!text || typeof text !== "string") return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const matches = trimmed.match(/\b[\w']+\b|[^\w\s]/gu);
  return matches ? matches.length : 0;
}

/**
 * Computes benchmark telemetry (TTFT, TPS, tokens, cost savings) with zero fake data.
 */
export function computeBenchmarkMetrics(params: {
  ttftMs: number;
  totalTimeMs: number;
  tokenCount: number;
  promptTokens?: number;
}): BenchmarkMetrics {
  const { ttftMs, totalTimeMs, tokenCount, promptTokens = 0 } = params;
  const generationTimeMs = Math.max(0, totalTimeMs - ttftMs);
  const tokensPerSecond =
    generationTimeMs > 0
      ? Math.round((tokenCount / generationTimeMs) * 1000)
      : 0;
  const costSavings = calculateLocalCostSavings(promptTokens, tokenCount);

  return {
    ttftMs,
    totalTimeMs,
    tokenCount,
    tokensPerSecond,
    costSavings,
  };
}

/**
 * Extract model names from various local engine response formats.
 */
function extractModelNames(data: unknown): string[] {
  if (!data || typeof data !== "object") return [];

  const record = data as Record<string, unknown>;

  // Ollama format: { models: [{ name: "...", model: "..." }] }
  if (Array.isArray(record.models)) {
    return record.models
      .map((item: unknown) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const m = item as { name?: string; model?: string };
          return m.name || m.model || "";
        }
        return "";
      })
      .filter((name): name is string => Boolean(name && name.length > 0));
  }

  // OpenAI / LM Studio / vLLM format: { object: "list", data: [{ id: "..." }] }
  if (Array.isArray(record.data)) {
    return record.data
      .map((item: unknown) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const m = item as { id?: string; name?: string };
          return m.id || m.name || "";
        }
        return "";
      })
      .filter((id): id is string => Boolean(id && id.length > 0));
  }

  // Direct array: [{ id: "..." }]
  if (Array.isArray(data)) {
    return data
      .map((item: unknown) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const m = item as { id?: string; name?: string; model?: string };
          return m.id || m.name || m.model || "";
        }
        return "";
      })
      .filter((id): id is string => Boolean(id && id.length > 0));
  }

  return [];
}

/**
 * Identify the local engine runtime from the endpoint, response payload, and headers.
 */
function detectRuntime(
  endpoint: string,
  data: unknown,
  serverHeader?: string | null,
): LocalRuntimeType {
  const lowerUrl = endpoint.toLowerCase();
  const lowerServer = (serverHeader || "").toLowerCase();

  if (lowerServer.includes("ollama")) return "ollama";
  if (lowerServer.includes("lmstudio") || lowerServer.includes("lm-studio"))
    return "lmstudio";
  if (lowerServer.includes("vllm") || lowerServer.includes("uvicorn")) {
    if (lowerUrl.includes("8000") || lowerUrl.includes("vllm")) return "vllm";
  }

  const record =
    data && typeof data === "object" ? (data as Record<string, unknown>) : null;

  // Ollama check
  if (record && Array.isArray(record.models) && !Array.isArray(record.data)) {
    return "ollama";
  }
  if (lowerUrl.includes("11434") || lowerUrl.includes("ollama")) {
    return "ollama";
  }

  // LM Studio / vLLM check
  if (record && Array.isArray(record.data)) {
    const items = record.data as Array<Record<string, unknown>>;
    const hasLMStudio = items.some(
      (m) =>
        typeof m.owned_by === "string" &&
        m.owned_by.toLowerCase().includes("lmstudio"),
    );
    if (
      hasLMStudio ||
      lowerUrl.includes("1234") ||
      lowerUrl.includes("lmstudio")
    ) {
      return "lmstudio";
    }

    const hasVllm = items.some(
      (m) =>
        typeof m.owned_by === "string" &&
        m.owned_by.toLowerCase().includes("vllm"),
    );
    if (hasVllm || lowerUrl.includes("8000") || lowerUrl.includes("vllm")) {
      return "vllm";
    }
  }

  if (lowerUrl.includes("1234") || lowerUrl.includes("lmstudio"))
    return "lmstudio";
  if (lowerUrl.includes("8000") || lowerUrl.includes("vllm")) return "vllm";

  return "unknown";
}

/**
 * Probes a local inference engine endpoint for reachability, model inventory, and roundtrip latency.
 */
export async function probeLocalEngine(
  endpoint: string,
  options?: ProbeOptions,
): Promise<LocalEngineProbeResult> {
  const clean = endpoint.trim().replace(/\/+$/, "");
  if (!clean) {
    return {
      reachable: false,
      runtime: "unknown",
      models: [],
      latencyMs: 0,
      error: "Endpoint URL is required",
    };
  }

  const timeoutMs = options?.timeoutMs ?? 2000;
  const start = performance.now();

  // Determine probing candidates
  const candidates: string[] = [];
  if (
    clean.endsWith("/api/tags") ||
    clean.endsWith("/v1/models") ||
    clean.endsWith("/models")
  ) {
    candidates.push(clean);
  } else if (clean.endsWith("/v1")) {
    const base = clean.replace(/\/v1$/, "");
    candidates.push(`${clean}/models`);
    candidates.push(`${base}/api/tags`);
  } else {
    // Port or keyword heuristics
    if (clean.includes("11434") || clean.includes("ollama")) {
      candidates.push(`${clean}/api/tags`);
      candidates.push(`${clean}/v1/models`);
    } else if (clean.includes("1234") || clean.includes("lmstudio")) {
      candidates.push(`${clean}/v1/models`);
      candidates.push(`${clean}/api/tags`);
    } else if (clean.includes("8000") || clean.includes("vllm")) {
      candidates.push(`${clean}/v1/models`);
      candidates.push(`${clean}/api/tags`);
    } else {
      candidates.push(`${clean}/api/tags`);
      candidates.push(`${clean}/v1/models`);
    }
  }

  let lastError: string | undefined;

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!res.ok) {
        lastError = `HTTP ${res.status} from ${url}`;
        continue;
      }

      const data = await res.json();
      const latencyMs = Math.round(performance.now() - start);
      const models = extractModelNames(data);
      const runtime = detectRuntime(clean, data, res.headers.get("server"));

      return {
        reachable: true,
        runtime,
        models,
        latencyMs,
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  const latencyMs = Math.round(performance.now() - start);
  return {
    reachable: false,
    runtime: "unknown",
    models: [],
    latencyMs,
    error: lastError || "Endpoint unreachable",
  };
}

/**
 * Auto-discovers local inference engines (Ollama, LM Studio, vLLM, and any custom endpoints).
 */
export async function discoverLocalEngines(
  customEngines?: Array<{ id?: string; name?: string; endpoint: string }>,
  options?: ProbeOptions,
): Promise<DiscoveredEngine[]> {
  const targets =
    customEngines && customEngines.length > 0
      ? customEngines.map((e, idx) => ({
          id: e.id || `custom-${idx}`,
          name: e.name || e.endpoint,
          endpoint: e.endpoint,
          defaultRuntime: "unknown" as LocalRuntimeType,
        }))
      : DEFAULT_LOCAL_ENGINES.map((e) => ({
          id: e.id,
          name: e.name,
          endpoint: e.endpoint,
          defaultRuntime: e.runtime,
        }));

  return Promise.all(
    targets.map(async (target) => {
      const probe = await probeLocalEngine(target.endpoint, options);
      const runtime: LocalRuntimeType =
        probe.runtime !== "unknown" ? probe.runtime : target.defaultRuntime;

      return {
        id: target.id,
        name: target.name,
        endpoint: target.endpoint,
        reachable: probe.reachable,
        runtime,
        models: probe.models,
        latencyMs: probe.latencyMs,
        error: probe.error,
      };
    }),
  );
}

/**
 * Streams tokens from a local OpenAI-compatible endpoint (LM Studio, vLLM, LocalAI)
 * using standard Server-Sent Events (SSE).
 */
export async function* streamOpenAICompatibleEndpoint(
  endpoint: string,
  model: string,
  prompt: string,
  options?: { signal?: AbortSignal },
): AsyncGenerator<string> {
  const clean = endpoint.trim().replace(/\/+$/, "");
  const chatUrl = clean.endsWith("/chat/completions")
    ? clean
    : clean.endsWith("/v1")
      ? `${clean}/chat/completions`
      : `${clean}/v1/chat/completions`;

  const res = await fetch(chatUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      stream: true,
    }),
    signal: options?.signal,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(
      `Engine returned HTTP ${res.status}: ${errorText || res.statusText}`,
    );
  }

  if (!res.body) {
    throw new Error("Engine returned an empty response body");
  }

  for await (const line of readLines(res.body)) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith("data:")) continue;
    const payload = trimmed.slice(5).trim();
    if (payload === "[DONE]") break;

    try {
      const parsed = JSON.parse(payload) as {
        choices?: Array<{ delta?: { content?: string } }>;
      };
      const delta = parsed.choices?.[0]?.delta?.content;
      if (delta) yield delta;
    } catch {
      continue;
    }
  }
}

/**
 * Streams tokens from an Ollama endpoint via /api/chat.
 */
export async function* streamOllamaEndpoint(
  endpoint: string,
  model: string,
  prompt: string,
  options?: { signal?: AbortSignal },
): AsyncGenerator<string> {
  const clean = endpoint.trim().replace(/\/+$/, "");
  const chatUrl = clean.endsWith("/api/chat") ? clean : `${clean}/api/chat`;

  const res = await fetch(chatUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      stream: true,
    }),
    signal: options?.signal,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(
      `Ollama returned HTTP ${res.status}: ${errorText || res.statusText}`,
    );
  }

  if (!res.body) {
    throw new Error("Ollama returned an empty response body");
  }

  for await (const line of readLines(res.body)) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line) as {
        message?: { content?: string };
        done?: boolean;
        error?: string;
      };
      if (parsed.error) throw new Error(parsed.error);
      if (parsed.message?.content) yield parsed.message.content;
      if (parsed.done) break;
    } catch (err) {
      if (
        err instanceof Error &&
        err.message !== "Unexpected end of JSON input"
      ) {
        throw err;
      }
    }
  }
}

/**
 * Unified stream dispatcher that benchmarks local or configured hosted models.
 */
export async function* streamBenchmarkModel(params: {
  model: string;
  provider?: string;
  endpoint?: string;
  prompt?: string;
  signal?: AbortSignal;
}): AsyncGenerator<string> {
  const { model, provider, endpoint, signal } = params;
  const prompt = params.prompt || BENCHMARK_STANDARDIZATION_PROMPT;

  // 1. Direct endpoint provided
  if (endpoint) {
    const clean = endpoint.toLowerCase();
    if (
      clean.includes("11434") ||
      clean.includes("ollama") ||
      provider === "ollama"
    ) {
      yield* streamOllamaEndpoint(endpoint, model, prompt, { signal });
    } else {
      yield* streamOpenAICompatibleEndpoint(endpoint, model, prompt, {
        signal,
      });
    }
    return;
  }

  // 2. Specific local engine provider IDs
  if (provider === "lmstudio") {
    yield* streamOpenAICompatibleEndpoint(
      "http://127.0.0.1:1234/v1",
      model,
      prompt,
      { signal },
    );
    return;
  }
  if (provider === "vllm") {
    yield* streamOpenAICompatibleEndpoint(
      "http://127.0.0.1:8000/v1",
      model,
      prompt,
      { signal },
    );
    return;
  }

  // 3. Model ID parsing ("provider:model")
  const parsed = parseModelId(model);
  if (parsed) {
    if (parsed.provider === ("lmstudio" as unknown as ProviderId)) {
      yield* streamOpenAICompatibleEndpoint(
        "http://127.0.0.1:1234/v1",
        parsed.model,
        prompt,
        { signal },
      );
      return;
    }
    if (parsed.provider === ("vllm" as unknown as ProviderId)) {
      yield* streamOpenAICompatibleEndpoint(
        "http://127.0.0.1:8000/v1",
        parsed.model,
        prompt,
        { signal },
      );
      return;
    }
    // Configured provider stream
    yield* streamText(parsed, {
      messages: [{ role: "user", content: prompt }],
      signal,
    });
    return;
  }

  // 4. Provider passed explicitly
  if (
    provider &&
    ["gemini", "anthropic", "openai", "ollama"].includes(provider)
  ) {
    yield* streamText(
      { provider: provider as ProviderId, model },
      { messages: [{ role: "user", content: prompt }], signal },
    );
    return;
  }

  // 5. Try resolving model against configured providers
  try {
    const selection = await resolveModel(model);
    yield* streamText(selection, {
      messages: [{ role: "user", content: prompt }],
      signal,
    });
  } catch {
    // If not in configured providers, fallback to local Ollama default
    yield* streamOllamaEndpoint("http://127.0.0.1:11434", model, prompt, {
      signal,
    });
  }
}
