// Nova MLOps Platform Engine
// Production Telemetry Collector, High-Throughput 3072-dim Vector Cache, & Circuit Breaker

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface ModelPricing {
  promptCostPerMillion: number;
  completionCostPerMillion: number;
}

export interface LatencyPercentiles {
  p50: number;
  p95: number;
  p99: number;
  avg: number;
  min: number;
  max: number;
}

export interface TokenCostEstimate {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  promptCostUsd: number;
  completionCostUsd: number;
  totalCostUsd: number;
}

export interface RecordTelemetryOptions {
  model: string;
  latencyMs: number;
  promptTokens?: number;
  completionTokens?: number;
  success?: boolean;
  statusCode?: number;
  error?: string | Error;
  cachedVector?: boolean;
}

export interface ModelTelemetryStats {
  model: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  errorRatePercent: number;
  statusCodes: Record<number, number>;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  latencyPercentiles: LatencyPercentiles;
  averageTokensPerSec: number;
  lastActiveTimestamp?: string;
  circuitBreakerState: CircuitBreakerState;
  hotStandbyModel?: string;
}

export interface VectorCacheStats {
  size: number;
  maxSize: number;
  dimensions: number;
  hits: number;
  misses: number;
  evictions: number;
  hitRatioPercent: number;
  estimatedMemoryBytes: number;
}

export interface CircuitBreakerConfig {
  failureThreshold?: number; // Consecutive 429/500 errors before tripping
  resetTimeoutMs?: number; // Cooldown before canary probe in HALF_OPEN
  canarySuccessThreshold?: number; // Consecutive successes in HALF_OPEN to CLOSE
}

export interface CircuitBreakerInfo {
  model: string;
  state: CircuitBreakerState;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  failureThreshold: number;
  resetTimeoutMs: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  lastFailureReason?: string;
  standbyChain: string[];
  activeStandby?: string;
}

export interface MLOpsSummary {
  timestamp: string;
  uptimeSeconds: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  globalErrorRatePercent: number;
  globalLatency: LatencyPercentiles;
  globalTokens: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
  };
  globalTokensPerSec: number;
  models: Record<string, ModelTelemetryStats>;
  vectorCache: VectorCacheStats;
  circuitBreakers: Record<string, CircuitBreakerInfo>;
}

// Model pricing in USD per 1 Million Tokens (Industry Standard Rates)
export const MODEL_PRICING: Record<string, ModelPricing> = {
  'gemini-3-flash-preview': { promptCostPerMillion: 0.075, completionCostPerMillion: 0.30 },
  'gemini-3.5-flash-lite': { promptCostPerMillion: 0.075, completionCostPerMillion: 0.30 },
  'gemini-3.8-flash': { promptCostPerMillion: 0.10, completionCostPerMillion: 0.40 },
  'gemini-3.1-flash-lite': { promptCostPerMillion: 0.075, completionCostPerMillion: 0.30 },
  'gemini-2.5-flash': { promptCostPerMillion: 0.075, completionCostPerMillion: 0.30 },
  'gemini-embedding-2': { promptCostPerMillion: 0.02, completionCostPerMillion: 0.00 },
  'claude-3-7-sonnet': { promptCostPerMillion: 3.00, completionCostPerMillion: 15.00 },
  'deepseek-r1': { promptCostPerMillion: 0.55, completionCostPerMillion: 2.19 },
  'llama-3.3-70b-instruct': { promptCostPerMillion: 0.00, completionCostPerMillion: 0.00 }, // local / zero-cost
  'ollama-local': { promptCostPerMillion: 0.00, completionCostPerMillion: 0.00 },
};

// Default Standby Failover Topology
export const DEFAULT_STANDBY_TOPOLOGY: Record<string, string[]> = {
  'gemini-3.5-flash-lite': ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash', 'ollama-local'],
  'gemini-3.8-flash': ['gemini-3.5-flash-lite', 'gemini-2.5-flash', 'ollama-local'],
  'gemini-3.1-flash-lite': ['gemini-3.5-flash-lite', 'gemini-2.5-flash', 'ollama-local'],
  'gemini-3-flash-preview': ['gemini-2.5-flash', 'claude-3-7-sonnet', 'ollama-local'],
  'gemini-2.5-flash': ['gemini-3-flash-preview', 'ollama-local'],
  'claude-3-7-sonnet': ['gemini-3-flash-preview', 'deepseek-r1', 'ollama-local'],
  'deepseek-r1': ['gemini-3-flash-preview', 'llama-3.3-70b-instruct', 'ollama-local'],
  'llama-3.3-70b-instruct': ['gemini-2.5-flash', 'ollama-local'],
  'gemini-embedding-2': ['deterministic-128'],
};

// Utility to calculate exact p50, p95, p99 percentiles
export function calculatePercentiles(latencies: number[]): LatencyPercentiles {
  if (!latencies || latencies.length === 0) {
    return { p50: 0, p95: 0, p99: 0, avg: 0, min: 0, max: 0 };
  }
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const avg = Math.round((sum / sorted.length) * 100) / 100;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  const getPercentile = (p: number): number => {
    if (sorted.length === 1) return sorted[0];
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
  };

  return {
    p50: getPercentile(50),
    p95: getPercentile(95),
    p99: getPercentile(99),
    avg,
    min,
    max,
  };
}

// -----------------------------------------------------------------------------
// PART 1: HIGH-THROUGHPUT VECTOR INDEX CACHE (3072-DIM LRU CACHE)
// -----------------------------------------------------------------------------

export interface CachedVectorEntry {
  key: string;
  text: string;
  vector: number[];
  dimensions: number;
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;
}

export class VectorIndexCache {
  private map: Map<string, CachedVectorEntry> = new Map();
  private readonly maxSize: number;
  private readonly expectedDimensions: number;
  private hitsCount = 0;
  private missesCount = 0;
  private evictionsCount = 0;

  constructor(options?: { maxSize?: number; dimensions?: number }) {
    this.maxSize = options?.maxSize ?? 2000;
    this.expectedDimensions = options?.dimensions ?? 3072;
  }

  public normalizeKey(text: string): string {
    return text.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  public get(text: string): number[] | undefined {
    const key = this.normalizeKey(text);
    const entry = this.map.get(key);

    if (!entry) {
      this.missesCount++;
      return undefined;
    }

    // Refresh LRU order (delete & re-set moves to newest position in Map)
    this.map.delete(key);
    entry.lastAccessedAt = Date.now();
    entry.accessCount++;
    this.map.set(key, entry);

    this.hitsCount++;
    return entry.vector;
  }

  public set(text: string, vector: number[]): void {
    if (!text || !vector || vector.length === 0) return;

    const key = this.normalizeKey(text);

    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.maxSize) {
      // Evict least recently used (first key in Map iterator)
      const oldestKey = this.map.keys().next().value;
      if (oldestKey) {
        this.map.delete(oldestKey);
        this.evictionsCount++;
      }
    }

    this.map.set(key, {
      key,
      text: text.slice(0, 500),
      vector,
      dimensions: vector.length,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 1,
    });
  }

  public has(text: string): boolean {
    const key = this.normalizeKey(text);
    return this.map.has(key);
  }

  public delete(text: string): boolean {
    const key = this.normalizeKey(text);
    return this.map.delete(key);
  }

  public clear(): void {
    this.map.clear();
    this.hitsCount = 0;
    this.missesCount = 0;
    this.evictionsCount = 0;
  }

  public size(): number {
    return this.map.size;
  }

  public getStats(): VectorCacheStats {
    const totalLookups = this.hitsCount + this.missesCount;
    const hitRatioPercent = totalLookups > 0
      ? Math.round((this.hitsCount / totalLookups) * 10000) / 100
      : 0;

    // Approximate memory: 8 bytes per float + ~128 bytes metadata per entry
    const sampleDim = this.expectedDimensions;
    const estimatedMemoryBytes = this.map.size * (sampleDim * 8 + 128);

    return {
      size: this.map.size,
      maxSize: this.maxSize,
      dimensions: this.expectedDimensions,
      hits: this.hitsCount,
      misses: this.missesCount,
      evictions: this.evictionsCount,
      hitRatioPercent,
      estimatedMemoryBytes,
    };
  }

  // Cosine similarity search over cached entries
  public searchSimilar(queryVector: number[], topK: number = 3): { text: string; similarity: number }[] {
    if (this.map.size === 0 || !queryVector || queryVector.length === 0) return [];

    const results: { text: string; similarity: number }[] = [];
    for (const entry of this.map.values()) {
      if (entry.vector.length !== queryVector.length) continue;

      let dotProduct = 0;
      let normA = 0;
      let normB = 0;
      for (let i = 0; i < queryVector.length; i++) {
        dotProduct += queryVector[i] * entry.vector[i];
        normA += queryVector[i] * queryVector[i];
        normB += entry.vector[i] * entry.vector[i];
      }
      const denom = Math.sqrt(normA) * Math.sqrt(normB);
      const similarity = denom === 0 ? 0 : dotProduct / denom;
      results.push({ text: entry.text, similarity });
    }

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }
}

// -----------------------------------------------------------------------------
// PART 2: AUTOMATED MODEL HEALTH & FALLBACK CIRCUIT BREAKER
// -----------------------------------------------------------------------------

interface CircuitBreakerInternal {
  model: string;
  state: CircuitBreakerState;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  failureThreshold: number;
  resetTimeoutMs: number;
  canarySuccessThreshold: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  lastFailureReason?: string;
  standbyChain: string[];
}

export class ModelCircuitBreakerHub {
  private circuits: Map<string, CircuitBreakerInternal> = new Map();
  private readonly defaultThreshold: number;
  private readonly defaultResetTimeoutMs: number;
  private readonly defaultCanarySuccessThreshold: number;

  constructor(config?: CircuitBreakerConfig) {
    this.defaultThreshold = config?.failureThreshold ?? 3;
    this.defaultResetTimeoutMs = config?.resetTimeoutMs ?? 30000;
    this.defaultCanarySuccessThreshold = config?.canarySuccessThreshold ?? 1;
  }

  private getOrCreateCircuit(model: string): CircuitBreakerInternal {
    let circuit = this.circuits.get(model);
    if (!circuit) {
      const standbys = DEFAULT_STANDBY_TOPOLOGY[model] || ['gemini-2.5-flash', 'ollama-local'];
      circuit = {
        model,
        state: 'CLOSED',
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        failureThreshold: this.defaultThreshold,
        resetTimeoutMs: this.defaultResetTimeoutMs,
        canarySuccessThreshold: this.defaultCanarySuccessThreshold,
        standbyChain: [...standbys],
      };
      this.circuits.set(model, circuit);
    }
    return circuit;
  }

  public registerModel(
    model: string,
    standbyChain: string[],
    config?: CircuitBreakerConfig
  ): void {
    const circuit = this.getOrCreateCircuit(model);
    circuit.standbyChain = standbyChain;
    if (config?.failureThreshold) circuit.failureThreshold = config.failureThreshold;
    if (config?.resetTimeoutMs) circuit.resetTimeoutMs = config.resetTimeoutMs;
    if (config?.canarySuccessThreshold) circuit.canarySuccessThreshold = config.canarySuccessThreshold;
  }

  // Determines if status code / error is a model outage (429 rate limit, 500, 502, 503, 504, timeout)
  public isOutageError(statusCode?: number, error?: any): boolean {
    if (statusCode !== undefined) {
      if ([429, 500, 502, 503, 504, 408].includes(statusCode)) return true;
    }
    if (error) {
      const msg = typeof error === 'string' ? error : error.message || '';
      const lower = msg.toLowerCase();
      if (
        lower.includes('429') ||
        lower.includes('500') ||
        lower.includes('rate limit') ||
        lower.includes('resource exhausted') ||
        lower.includes('quota') ||
        lower.includes('timeout') ||
        lower.includes('overloaded') ||
        lower.includes('service unavailable')
      ) {
        return true;
      }
    }
    return false;
  }

  public recordFailure(model: string, statusCode?: number, error?: any): void {
    const circuit = this.getOrCreateCircuit(model);
    circuit.consecutiveFailures++;
    circuit.consecutiveSuccesses = 0;
    circuit.lastFailureTime = Date.now();
    circuit.lastFailureReason = typeof error === 'string'
      ? error
      : error?.message || `HTTP ${statusCode || 500}`;

    if (circuit.state === 'HALF_OPEN') {
      // Canary failed, trip back to OPEN
      circuit.state = 'OPEN';
    } else if (circuit.state === 'CLOSED' && circuit.consecutiveFailures >= circuit.failureThreshold) {
      // Tripped due to consecutive 429/500 failures
      circuit.state = 'OPEN';
    }
  }

  public recordSuccess(model: string): void {
    const circuit = this.getOrCreateCircuit(model);
    circuit.consecutiveSuccesses++;
    circuit.lastSuccessTime = Date.now();

    if (circuit.state === 'HALF_OPEN') {
      if (circuit.consecutiveSuccesses >= circuit.canarySuccessThreshold) {
        circuit.state = 'CLOSED';
        circuit.consecutiveFailures = 0;
      }
    } else if (circuit.state === 'CLOSED') {
      circuit.consecutiveFailures = 0;
    }
  }

  public getActiveModel(requestedModel: string): {
    activeModel: string;
    isFallback: boolean;
    originalModel: string;
    circuitState: CircuitBreakerState;
  } {
    const circuit = this.getOrCreateCircuit(requestedModel);

    // Check if OPEN circuit cooldown expired -> promote to HALF_OPEN for canary
    if (circuit.state === 'OPEN' && circuit.lastFailureTime) {
      const elapsed = Date.now() - circuit.lastFailureTime;
      if (elapsed >= circuit.resetTimeoutMs) {
        circuit.state = 'HALF_OPEN';
        circuit.consecutiveSuccesses = 0;
      }
    }

    if (circuit.state === 'CLOSED' || circuit.state === 'HALF_OPEN') {
      return {
        activeModel: requestedModel,
        isFallback: false,
        originalModel: requestedModel,
        circuitState: circuit.state,
      };
    }

    // Circuit is OPEN: Route to first available hot standby model
    for (const standby of circuit.standbyChain) {
      const standbyCircuit = this.circuits.get(standby);
      if (!standbyCircuit || standbyCircuit.state !== 'OPEN') {
        return {
          activeModel: standby,
          isFallback: true,
          originalModel: requestedModel,
          circuitState: 'OPEN',
        };
      }
    }

    // Resilient fallback of last resort
    return {
      activeModel: 'ollama-local',
      isFallback: true,
      originalModel: requestedModel,
      circuitState: 'OPEN',
    };
  }

  public reset(model?: string): void {
    if (model) {
      const circuit = this.circuits.get(model);
      if (circuit) {
        circuit.state = 'CLOSED';
        circuit.consecutiveFailures = 0;
        circuit.consecutiveSuccesses = 0;
        circuit.lastFailureTime = undefined;
        circuit.lastFailureReason = undefined;
      }
    } else {
      for (const circuit of this.circuits.values()) {
        circuit.state = 'CLOSED';
        circuit.consecutiveFailures = 0;
        circuit.consecutiveSuccesses = 0;
        circuit.lastFailureTime = undefined;
        circuit.lastFailureReason = undefined;
      }
    }
  }

  public getCircuitInfo(model: string): CircuitBreakerInfo {
    const circuit = this.getOrCreateCircuit(model);
    const activeResolution = this.getActiveModel(model);

    return {
      model: circuit.model,
      state: circuit.state,
      consecutiveFailures: circuit.consecutiveFailures,
      consecutiveSuccesses: circuit.consecutiveSuccesses,
      failureThreshold: circuit.failureThreshold,
      resetTimeoutMs: circuit.resetTimeoutMs,
      lastFailureTime: circuit.lastFailureTime,
      lastSuccessTime: circuit.lastSuccessTime,
      lastFailureReason: circuit.lastFailureReason,
      standbyChain: circuit.standbyChain,
      activeStandby: activeResolution.isFallback ? activeResolution.activeModel : undefined,
    };
  }

  public getAllCircuits(): Record<string, CircuitBreakerInfo> {
    const result: Record<string, CircuitBreakerInfo> = {};
    for (const model of this.circuits.keys()) {
      result[model] = this.getCircuitInfo(model);
    }
    return result;
  }
}

// -----------------------------------------------------------------------------
// PART 3: PRODUCTION MLOPS TELEMETRY COLLECTOR
// -----------------------------------------------------------------------------

interface InternalModelRecord {
  model: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  statusCodes: Map<number, number>;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalCostUsd: number;
  latencies: number[];
  lastActiveTimestamp?: string;
}

export class MLOpsTelemetryCollector {
  private startTime = Date.now();
  private modelRecords: Map<string, InternalModelRecord> = new Map();
  private globalLatencies: number[] = [];
  private vectorCacheHits = 0;
  private vectorCacheMisses = 0;

  constructor(
    private readonly cacheRef?: VectorIndexCache,
    private readonly breakerRef?: ModelCircuitBreakerHub
  ) {}

  private getOrCreateModel(model: string): InternalModelRecord {
    let record = this.modelRecords.get(model);
    if (!record) {
      record = {
        model,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        statusCodes: new Map(),
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        totalCostUsd: 0,
        latencies: [],
      };
      this.modelRecords.set(model, record);
    }
    return record;
  }

  public estimateCost(
    model: string,
    promptTokens: number,
    completionTokens: number
  ): TokenCostEstimate {
    const pricing = MODEL_PRICING[model] || {
      promptCostPerMillion: 0.10,
      completionCostPerMillion: 0.40,
    };

    const promptCostUsd = (promptTokens / 1_000_000) * pricing.promptCostPerMillion;
    const completionCostUsd = (completionTokens / 1_000_000) * pricing.completionCostPerMillion;
    const totalCostUsd = promptCostUsd + completionCostUsd;

    return {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      promptCostUsd: parseFloat(promptCostUsd.toFixed(6)),
      completionCostUsd: parseFloat(completionCostUsd.toFixed(6)),
      totalCostUsd: parseFloat(totalCostUsd.toFixed(6)),
    };
  }

  public recordRequest(options: RecordTelemetryOptions): TokenCostEstimate {
    const {
      model,
      latencyMs,
      promptTokens = 0,
      completionTokens = 0,
      success = true,
      statusCode = success ? 200 : 500,
      cachedVector = false,
    } = options;

    const record = this.getOrCreateModel(model);
    record.totalRequests++;
    record.lastActiveTimestamp = new Date().toISOString();

    if (success) {
      record.successfulRequests++;
    } else {
      record.failedRequests++;
    }

    const currentCount = record.statusCodes.get(statusCode) || 0;
    record.statusCodes.set(statusCode, currentCount + 1);

    record.totalPromptTokens += promptTokens;
    record.totalCompletionTokens += completionTokens;

    // Track latencies
    record.latencies.push(latencyMs);
    this.globalLatencies.push(latencyMs);

    // Keep window bounded to prevent memory growth (10,000 entries max)
    if (record.latencies.length > 10000) {
      record.latencies.shift();
    }
    if (this.globalLatencies.length > 20000) {
      this.globalLatencies.shift();
    }

    // Estimate cost
    const costEstimate = this.estimateCost(model, promptTokens, completionTokens);
    record.totalCostUsd += costEstimate.totalCostUsd;

    // Track vector cache flag if present
    if (cachedVector) {
      this.vectorCacheHits++;
    }

    return costEstimate;
  }

  public recordVectorCacheHit(): void {
    this.vectorCacheHits++;
  }

  public recordVectorCacheMiss(): void {
    this.vectorCacheMisses++;
  }

  public getSnapshot(): MLOpsSummary {
    const uptimeSeconds = Math.max(1, Math.round((Date.now() - this.startTime) / 1000));
    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;
    let globalPromptTokens = 0;
    let globalCompletionTokens = 0;
    let globalCostUsd = 0;

    const modelsSummary: Record<string, ModelTelemetryStats> = {};

    for (const [model, rec] of this.modelRecords.entries()) {
      totalRequests += rec.totalRequests;
      successfulRequests += rec.successfulRequests;
      failedRequests += rec.failedRequests;
      globalPromptTokens += rec.totalPromptTokens;
      globalCompletionTokens += rec.totalCompletionTokens;
      globalCostUsd += rec.totalCostUsd;

      const errorRate = rec.totalRequests > 0
        ? Math.round((rec.failedRequests / rec.totalRequests) * 10000) / 100
        : 0;

      const totalTokens = rec.totalPromptTokens + rec.totalCompletionTokens;
      const totalLatencySeconds = (rec.latencies.reduce((a, b) => a + b, 0) || 1000) / 1000;
      const tokensPerSec = Math.round(totalTokens / (totalLatencySeconds || 1));

      const statusObj: Record<number, number> = {};
      rec.statusCodes.forEach((count, code) => {
        statusObj[code] = count;
      });

      const circuitInfo = this.breakerRef?.getCircuitInfo(model);

      modelsSummary[model] = {
        model,
        totalRequests: rec.totalRequests,
        successfulRequests: rec.successfulRequests,
        failedRequests: rec.failedRequests,
        errorRatePercent: errorRate,
        statusCodes: statusObj,
        totalPromptTokens: rec.totalPromptTokens,
        totalCompletionTokens: rec.totalCompletionTokens,
        totalTokens,
        estimatedCostUsd: parseFloat(rec.totalCostUsd.toFixed(6)),
        latencyPercentiles: calculatePercentiles(rec.latencies),
        averageTokensPerSec: tokensPerSec,
        lastActiveTimestamp: rec.lastActiveTimestamp,
        circuitBreakerState: circuitInfo?.state || 'CLOSED',
        hotStandbyModel: circuitInfo?.activeStandby,
      };
    }

    const globalErrorRate = totalRequests > 0
      ? Math.round((failedRequests / totalRequests) * 10000) / 100
      : 0;

    const globalTokensTotal = globalPromptTokens + globalCompletionTokens;
    const globalTokensPerSec = Math.round(globalTokensTotal / uptimeSeconds);

    // Vector cache metrics
    const cacheStats: VectorCacheStats = this.cacheRef
      ? this.cacheRef.getStats()
      : {
          size: 0,
          maxSize: 0,
          dimensions: 3072,
          hits: this.vectorCacheHits,
          misses: this.vectorCacheMisses,
          evictions: 0,
          hitRatioPercent: (this.vectorCacheHits + this.vectorCacheMisses) > 0
            ? Math.round((this.vectorCacheHits / (this.vectorCacheHits + this.vectorCacheMisses)) * 10000) / 100
            : 0,
          estimatedMemoryBytes: 0,
        };

    const circuitBreakers = this.breakerRef ? this.breakerRef.getAllCircuits() : {};

    return {
      timestamp: new Date().toISOString(),
      uptimeSeconds,
      totalRequests,
      successfulRequests,
      failedRequests,
      globalErrorRatePercent: globalErrorRate,
      globalLatency: calculatePercentiles(this.globalLatencies),
      globalTokens: {
        promptTokens: globalPromptTokens,
        completionTokens: globalCompletionTokens,
        totalTokens: globalTokensTotal,
        estimatedCostUsd: parseFloat(globalCostUsd.toFixed(6)),
      },
      globalTokensPerSec,
      models: modelsSummary,
      vectorCache: cacheStats,
      circuitBreakers,
    };
  }

  public reset(): void {
    this.startTime = Date.now();
    this.modelRecords.clear();
    this.globalLatencies = [];
    this.vectorCacheHits = 0;
    this.vectorCacheMisses = 0;
  }
}

// -----------------------------------------------------------------------------
// PART 4: SINGLETON INSTANCES & UNIFIED MLOPS PIPELINE
// -----------------------------------------------------------------------------

export const vectorCache = new VectorIndexCache({ maxSize: 2500, dimensions: 3072 });
export const circuitBreaker = new ModelCircuitBreakerHub({ failureThreshold: 3, resetTimeoutMs: 30000 });
export const mlopsCollector = new MLOpsTelemetryCollector(vectorCache, circuitBreaker);

export const mlopsPipeline = {
  collector: mlopsCollector,
  cache: vectorCache,
  circuitBreaker,
  estimateCost: (model: string, p: number, c: number) => mlopsCollector.estimateCost(model, p, c),
  getSnapshot: () => mlopsCollector.getSnapshot(),
  reset: () => {
    mlopsCollector.reset();
    vectorCache.clear();
    circuitBreaker.reset();
  },
};
