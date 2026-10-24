import { describe, expect, it, beforeEach } from 'bun:test';
import { 
  VectorIndexCache, 
  ModelCircuitBreakerHub, 
  MLOpsTelemetryCollector, 
  calculatePercentiles, 
  mlopsPipeline,
  vectorCache,
  circuitBreaker
} from '../src/lib/mlops-pipeline';
import { generateEmbeddingV2 } from '../src/lib/embeddings-v2';

describe('MLOps Telemetry Collector & Cost Estimator', () => {
  let collector: MLOpsTelemetryCollector;

  beforeEach(() => {
    collector = new MLOpsTelemetryCollector();
  });

  it('should accurately compute latency percentiles (p50, p95, p99, min, max, avg)', () => {
    // Generate 100 uniformly distributed latencies from 10ms to 1000ms
    const latencies: number[] = [];
    for (let i = 1; i <= 100; i++) {
      latencies.push(i * 10);
    }

    const percentiles = calculatePercentiles(latencies);

    expect(percentiles.min).toBe(10);
    expect(percentiles.max).toBe(1000);
    expect(percentiles.avg).toBe(505);
    expect(percentiles.p50).toBe(500); // 50th item (50 * 10)
    expect(percentiles.p95).toBe(950); // 95th item (95 * 10)
    expect(percentiles.p99).toBe(990); // 99th item (99 * 10)
  });

  it('should handle edge cases in latency percentiles safely without crashing', () => {
    expect(calculatePercentiles([])).toEqual({ p50: 0, p95: 0, p99: 0, avg: 0, min: 0, max: 0 });
    expect(calculatePercentiles([125])).toEqual({ p50: 125, p95: 125, p99: 125, avg: 125, min: 125, max: 125 });
  });

  it('should accurately estimate token costs across frontier and local models', () => {
    // Gemini 3 Flash Preview: $0.075 / 1M prompt, $0.30 / 1M completion
    const geminiCost = collector.estimateCost('gemini-3-flash-preview', 1_000_000, 1_000_000);
    expect(geminiCost.promptCostUsd).toBeCloseTo(0.075, 4);
    expect(geminiCost.completionCostUsd).toBeCloseTo(0.30, 4);
    expect(geminiCost.totalCostUsd).toBeCloseTo(0.375, 4);

    // Claude 3.7 Sonnet: $3.00 / 1M prompt, $15.00 / 1M completion
    const claudeCost = collector.estimateCost('claude-3-7-sonnet', 500_000, 100_000);
    expect(claudeCost.promptCostUsd).toBeCloseTo(1.50, 4);
    expect(claudeCost.completionCostUsd).toBeCloseTo(1.50, 4);
    expect(claudeCost.totalCostUsd).toBeCloseTo(3.00, 4);

    // DeepSeek R1: $0.55 / 1M prompt, $2.19 / 1M completion
    const deepseekCost = collector.estimateCost('deepseek-r1', 1_000_000, 200_000);
    expect(deepseekCost.promptCostUsd).toBeCloseTo(0.55, 4);
    expect(deepseekCost.completionCostUsd).toBeCloseTo(0.438, 4);

    // Local model: Zero token cost
    const localCost = collector.estimateCost('ollama-local', 500_000, 500_000);
    expect(localCost.totalCostUsd).toBe(0);
  });

  it('should track request success rates, error classification, and throughput', () => {
    // Record 8 successful requests
    for (let i = 0; i < 8; i++) {
      collector.recordRequest({
        model: 'gemini-3.5-flash-lite',
        latencyMs: 120 + i * 10,
        promptTokens: 100,
        completionTokens: 50,
        success: true,
        statusCode: 200,
      });
    }

    // Record 2 failures (429 Rate Limit and 500 Server Error)
    collector.recordRequest({
      model: 'gemini-3.5-flash-lite',
      latencyMs: 250,
      promptTokens: 100,
      completionTokens: 0,
      success: false,
      statusCode: 429,
      error: 'Rate limit exceeded',
    });

    collector.recordRequest({
      model: 'gemini-3.5-flash-lite',
      latencyMs: 300,
      promptTokens: 100,
      completionTokens: 0,
      success: false,
      statusCode: 500,
      error: 'Internal server error',
    });

    const snapshot = collector.getSnapshot();
    expect(snapshot.totalRequests).toBe(10);
    expect(snapshot.successfulRequests).toBe(8);
    expect(snapshot.failedRequests).toBe(2);
    expect(snapshot.globalErrorRatePercent).toBe(20); // 2/10 = 20%

    const modelStats = snapshot.models['gemini-3.5-flash-lite'];
    expect(modelStats).toBeDefined();
    expect(modelStats.totalRequests).toBe(10);
    expect(modelStats.errorRatePercent).toBe(20);
    expect(modelStats.statusCodes[200]).toBe(8);
    expect(modelStats.statusCodes[429]).toBe(1);
    expect(modelStats.statusCodes[500]).toBe(1);
    expect(modelStats.totalPromptTokens).toBe(1000);
    expect(modelStats.totalCompletionTokens).toBe(400);
  });
});

describe('High-Throughput Vector Index Cache (3072-dim LRU)', () => {
  let cache: VectorIndexCache;

  beforeEach(() => {
    cache = new VectorIndexCache({ maxSize: 3, dimensions: 3072 });
  });

  it('should normalize input queries and cache dense 3072-dimensional vectors', () => {
    // Generate a synthetic 3072-dim dense embedding
    const sampleVector3072 = new Array(3072).fill(0).map((_, i) => Math.sin(i));

    cache.set('  Cognitive Architecture Agent Swarm   ', sampleVector3072);

    expect(cache.size()).toBe(1);
    expect(cache.has('cognitive architecture agent swarm')).toBe(true);

    const retrieved = cache.get('cognitive architecture agent swarm');
    expect(retrieved).toBeDefined();
    expect(retrieved?.length).toBe(3072);
    expect(retrieved?.[0]).toBe(sampleVector3072[0]);
    expect(retrieved?.[3071]).toBe(sampleVector3072[3071]);
  });

  it('should track cache hits, misses, and hit ratio accurately', () => {
    const vec = [0.1, 0.2, 0.3];
    cache.set('vector-query-alpha', vec);

    // 1 miss on unknown query
    const missResult = cache.get('unknown-query');
    expect(missResult).toBeUndefined();

    // 2 hits on cached query
    const hit1 = cache.get('vector-query-alpha');
    const hit2 = cache.get('vector-query-alpha');
    expect(hit1).toBeDefined();
    expect(hit2).toBeDefined();

    const stats = cache.getStats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
    // Hit ratio: 2 / (2 + 1) = 66.67%
    expect(stats.hitRatioPercent).toBeCloseTo(66.67, 1);
  });

  it('should enforce strict LRU eviction policy when capacity is exceeded', () => {
    const vecA = [1, 0, 0];
    const vecB = [0, 1, 0];
    const vecC = [0, 0, 1];
    const vecD = [1, 1, 1];

    // Capacity is 3
    cache.set('key-a', vecA);
    cache.set('key-b', vecB);
    cache.set('key-c', vecC);
    expect(cache.size()).toBe(3);

    // Access 'key-a' to make it most recently used (LRU order becomes: key-b, key-c, key-a)
    const accessedA = cache.get('key-a');
    expect(accessedA).toBeDefined();

    // Insert 'key-d': key-b is the least recently used, so key-b must be evicted
    cache.set('key-d', vecD);

    expect(cache.size()).toBe(3);
    expect(cache.has('key-b')).toBe(false); // Evicted!
    expect(cache.has('key-a')).toBe(true);  // Preserved (recently accessed)
    expect(cache.has('key-c')).toBe(true);  // Preserved
    expect(cache.has('key-d')).toBe(true);  // Preserved (just inserted)

    const stats = cache.getStats();
    expect(stats.evictions).toBe(1);
  });

  it('should support vector similarity search across cached embeddings', () => {
    cache.set('orthogonal-x', [1, 0, 0]);
    cache.set('orthogonal-y', [0, 1, 0]);
    cache.set('similar-x', [0.99, 0.01, 0]);

    const results = cache.searchSimilar([1, 0, 0], 2);
    expect(results.length).toBe(2);
    expect(results[0].text).toContain('orthogonal-x');
    expect(results[0].similarity).toBeCloseTo(1.0, 2);
    expect(results[1].text).toContain('similar-x');
    expect(results[1].similarity).toBeGreaterThan(0.9);
  });
});

describe('Automated Model Health & Fallback Circuit Breaker', () => {
  let breaker: ModelCircuitBreakerHub;

  beforeEach(() => {
    breaker = new ModelCircuitBreakerHub({
      failureThreshold: 3,
      resetTimeoutMs: 60, // Short timeout for unit testing
      canarySuccessThreshold: 1,
    });
  });

  it('should start in CLOSED state and remain CLOSED on normal requests', () => {
    const primary = 'gemini-3.5-flash-lite';
    const resolution = breaker.getActiveModel(primary);
    expect(resolution.circuitState).toBe('CLOSED');
    expect(resolution.isFallback).toBe(false);
    expect(resolution.activeModel).toBe(primary);

    breaker.recordSuccess(primary);
    const info = breaker.getCircuitInfo(primary);
    expect(info.state).toBe('CLOSED');
    expect(info.consecutiveFailures).toBe(0);
  });

  it('should trip to OPEN upon detecting 3 consecutive 429/500 errors', () => {
    const primary = 'gemini-3.5-flash-lite';

    // Failure 1 (429 Rate Limit)
    breaker.recordFailure(primary, 429, 'Rate limit exceeded');
    expect(breaker.getCircuitInfo(primary).state).toBe('CLOSED');
    expect(breaker.getCircuitInfo(primary).consecutiveFailures).toBe(1);

    // Failure 2 (500 Internal Error)
    breaker.recordFailure(primary, 500, 'Internal Server Error');
    expect(breaker.getCircuitInfo(primary).state).toBe('CLOSED');
    expect(breaker.getCircuitInfo(primary).consecutiveFailures).toBe(2);

    // Failure 3 (503 Service Unavailable) -> Threshold reached!
    breaker.recordFailure(primary, 503, 'Service Unavailable');
    expect(breaker.getCircuitInfo(primary).state).toBe('OPEN');
    expect(breaker.getCircuitInfo(primary).consecutiveFailures).toBe(3);
  });

  it('should automatically switch to hot standby models when circuit is OPEN', () => {
    const primary = 'gemini-3.5-flash-lite';
    breaker.registerModel(primary, ['gemini-3.8-flash', 'gemini-2.5-flash', 'ollama-local']);

    // Trip the primary model
    breaker.recordFailure(primary, 429);
    breaker.recordFailure(primary, 429);
    breaker.recordFailure(primary, 429);
    expect(breaker.getCircuitInfo(primary).state).toBe('OPEN');

    // getActiveModel must now switch to the first healthy standby
    const resolution = breaker.getActiveModel(primary);
    expect(resolution.circuitState).toBe('OPEN');
    expect(resolution.isFallback).toBe(true);
    expect(resolution.activeModel).toBe('gemini-3.8-flash');

    // If standby 1 also trips, cascade to standby 2
    breaker.recordFailure('gemini-3.8-flash', 500);
    breaker.recordFailure('gemini-3.8-flash', 500);
    breaker.recordFailure('gemini-3.8-flash', 500);

    const cascadedResolution = breaker.getActiveModel(primary);
    expect(cascadedResolution.activeModel).toBe('gemini-2.5-flash');
  });

  it('should transition to HALF_OPEN after cooldown and recover to CLOSED upon successful canary', async () => {
    const primary = 'gemini-2.5-flash';

    // Trip the circuit
    breaker.recordFailure(primary, 429);
    breaker.recordFailure(primary, 429);
    breaker.recordFailure(primary, 429);
    expect(breaker.getCircuitInfo(primary).state).toBe('OPEN');

    // Wait for resetTimeoutMs (60ms)
    await new Promise(r => setTimeout(r, 75));

    // Next request triggers canary in HALF_OPEN
    const canaryResolution = breaker.getActiveModel(primary);
    expect(canaryResolution.circuitState).toBe('HALF_OPEN');
    expect(canaryResolution.activeModel).toBe(primary);
    expect(canaryResolution.isFallback).toBe(false);

    // Successful canary response -> recovers circuit to CLOSED!
    breaker.recordSuccess(primary);
    const recoveredInfo = breaker.getCircuitInfo(primary);
    expect(recoveredInfo.state).toBe('CLOSED');
    expect(recoveredInfo.consecutiveFailures).toBe(0);
  });

  it('should trip back to OPEN if canary request fails in HALF_OPEN', async () => {
    const primary = 'gemini-3-flash-preview';

    // Trip the circuit
    breaker.recordFailure(primary, 500);
    breaker.recordFailure(primary, 500);
    breaker.recordFailure(primary, 500);
    expect(breaker.getCircuitInfo(primary).state).toBe('OPEN');

    // Wait for cooldown
    await new Promise(r => setTimeout(r, 75));

    // Transitions to HALF_OPEN
    const resolution = breaker.getActiveModel(primary);
    expect(resolution.circuitState).toBe('HALF_OPEN');

    // Canary probe fails!
    breaker.recordFailure(primary, 500, 'Canary failed');
    expect(breaker.getCircuitInfo(primary).state).toBe('OPEN');
  });

  it('should support manual circuit reset', () => {
    const primary = 'deepseek-r1';
    breaker.recordFailure(primary, 500);
    breaker.recordFailure(primary, 500);
    breaker.recordFailure(primary, 500);
    expect(breaker.getCircuitInfo(primary).state).toBe('OPEN');

    breaker.reset(primary);
    expect(breaker.getCircuitInfo(primary).state).toBe('CLOSED');
    expect(breaker.getCircuitInfo(primary).consecutiveFailures).toBe(0);
  });
});

describe('End-to-End MLOps Pipeline Integration', () => {
  beforeEach(() => {
    mlopsPipeline.reset();
  });

  it('should utilize vector LRU cache on consecutive embedding calls with 100% hit rate', async () => {
    const query = 'Sliding chunk overlap vector embedding indexing';

    // First call generates and populates cache
    const vec1 = await generateEmbeddingV2(query);
    expect(Array.isArray(vec1)).toBe(true);

    const statsAfterFirst = vectorCache.getStats();
    expect(statsAfterFirst.size).toBeGreaterThanOrEqual(1);

    // Second call with same text should immediately hit the cache
    const vec2 = await generateEmbeddingV2(query);
    expect(vec2).toEqual(vec1);

    const statsAfterSecond = vectorCache.getStats();
    expect(statsAfterSecond.hits).toBeGreaterThanOrEqual(1);
  });

  it('should provide full telemetry snapshot including cache, latency, and circuit breakers', () => {
    // Record mock telemetry activity
    mlopsPipeline.collector.recordRequest({
      model: 'gemini-3-flash-preview',
      latencyMs: 145,
      promptTokens: 250,
      completionTokens: 120,
      success: true,
      statusCode: 200,
    });

    vectorCache.set('test-key', [1, 2, 3]);
    vectorCache.get('test-key');

    const snapshot = mlopsPipeline.getSnapshot();
    expect(snapshot.totalRequests).toBe(1);
    expect(snapshot.successfulRequests).toBe(1);
    expect(snapshot.globalTokens.totalTokens).toBe(370);
    expect(snapshot.vectorCache.hits).toBe(1);
    expect(snapshot.globalLatency.p50).toBe(145);
  });
});
