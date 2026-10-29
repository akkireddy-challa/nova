import { describe, it, expect } from "bun:test";
import fs from "fs";
import path from "path";
import {
  computeParetoDominance,
  calculateParetoFrontier,
  computeRoutingRecommendations,
  synthesizeParetoFrontier,
  paretoFrontierToCsv,
  paretoFrontierToMarkdown,
  escapeCsvCell,
  DEFAULT_PROVIDER_BENCHMARKS,
} from "@/lib/research/pareto-optimizer";
import type { ProviderBenchmarkMetrics } from "@/lib/types";

describe("Multi-Provider Cost-Latency Pareto Frontier Engine", () => {
  const superiorProvider: ProviderBenchmarkMetrics = {
    providerId: "test:superior",
    displayName: "Superior Model",
    tier: "fast",
    timeToFirstTokenMs: 100,
    totalLatencyMs: 500,
    costPer1kInput: 0.001,
    costPer1kOutput: 0.002,
    qualityScore: 95,
    reasoningScore: 92,
    privacyComplianceIndex: 90,
    isAirGapped: false,
  };

  const dominatedProvider: ProviderBenchmarkMetrics = {
    providerId: "test:dominated",
    displayName: "Dominated Model",
    tier: "flagship",
    timeToFirstTokenMs: 300,
    totalLatencyMs: 1500,
    costPer1kInput: 0.005,
    costPer1kOutput: 0.015,
    qualityScore: 85,
    reasoningScore: 80,
    privacyComplianceIndex: 80,
    isAirGapped: false,
  };

  const tradeOffProvider: ProviderBenchmarkMetrics = {
    providerId: "test:tradeoff",
    displayName: "Tradeoff Model",
    tier: "reasoning",
    timeToFirstTokenMs: 400,
    totalLatencyMs: 2000,
    costPer1kInput: 0.002,
    costPer1kOutput: 0.005,
    qualityScore: 98,
    reasoningScore: 99,
    privacyComplianceIndex: 85,
    isAirGapped: false,
  };

  describe("computeParetoDominance", () => {
    it("returns true when provider A is superior in all dimensions and strictly better in at least one", () => {
      const isDominated = computeParetoDominance(
        superiorProvider,
        dominatedProvider,
      );
      expect(isDominated).toBe(true);
    });

    it("returns false when neither provider dominates the other (trade-off exists)", () => {
      const isDominated = computeParetoDominance(
        superiorProvider,
        tradeOffProvider,
      );
      expect(isDominated).toBe(false);

      const reverse = computeParetoDominance(
        tradeOffProvider,
        superiorProvider,
      );
      expect(reverse).toBe(false);
    });

    it("returns false when compared to itself", () => {
      expect(computeParetoDominance(superiorProvider, superiorProvider)).toBe(
        false,
      );
    });
  });

  describe("calculateParetoFrontier", () => {
    it("handles empty provider arrays cleanly", () => {
      const result = calculateParetoFrontier([]);
      expect(result.providers).toEqual([]);
      expect(result.frontierProviderIds).toEqual([]);
    });

    it("identifies Pareto-optimal providers and marks dominated providers", () => {
      const testSet = [superiorProvider, dominatedProvider, tradeOffProvider];
      const result = calculateParetoFrontier(testSet);

      expect(result.frontierProviderIds).toContain("test:superior");
      expect(result.frontierProviderIds).toContain("test:tradeoff");
      expect(result.frontierProviderIds).not.toContain("test:dominated");

      const dominatedItem = result.providers.find(
        (p) => p.providerId === "test:dominated",
      );
      expect(dominatedItem?.isParetoOptimal).toBe(false);
      expect(dominatedItem?.dominatedBy).toContain("test:superior");
    });

    it("calculates Pareto frontier for default enterprise benchmarks", () => {
      const result = calculateParetoFrontier(DEFAULT_PROVIDER_BENCHMARKS);
      expect(result.frontierProviderIds.length).toBeGreaterThanOrEqual(3);
      expect(result.frontierProviderIds).toContain("gemini:gemini-2-0-flash");
      expect(result.frontierProviderIds).toContain("ollama:llama3-3-70b");

      // Verify unoptimized legacy cloud chain is marked dominated
      const legacy = result.providers.find(
        (p) => p.providerId === "legacy:unoptimized-cloud-chain",
      );
      expect(legacy?.isParetoOptimal).toBe(false);
      expect(legacy?.dominatedBy.length).toBeGreaterThan(0);
    });
  });

  describe("computeRoutingRecommendations", () => {
    it("generates 4 strategic enterprise routing recommendations", () => {
      const { providers } = calculateParetoFrontier(
        DEFAULT_PROVIDER_BENCHMARKS,
      );
      const recs = computeRoutingRecommendations(
        providers,
        "High-Throughput Analytics",
      );

      expect(recs.length).toBe(4);
      const strategies = recs.map((r) => r.strategy);
      expect(strategies).toContain("balanced_enterprise");
      expect(strategies).toContain("latency_critical");
      expect(strategies).toContain("maximum_reasoning");
      expect(strategies).toContain("cost_minimizer");

      recs.forEach((r) => {
        expect(r.estimatedMonthlySavingsPct).toBeGreaterThan(0);
        expect(r.primaryProviderId).toBeDefined();
        expect(r.fallbackProviderId).toBeDefined();
        expect(r.rationale.length).toBeGreaterThan(20);
      });
    });
  });

  describe("synthesizeParetoFrontier", () => {
    it("creates a populated ParetoFrontierArtifact from string topic", () => {
      const artifact = synthesizeParetoFrontier(
        "High-Frequency Algorithmic Execution",
      );
      expect(artifact.id).toContain("pareto-high-frequency");
      expect(artifact.topic).toBe("High-Frequency Algorithmic Execution");
      expect(artifact.frontierProviderIds.length).toBeGreaterThanOrEqual(3);
      expect(artifact.providers.length).toBe(
        DEFAULT_PROVIDER_BENCHMARKS.length,
      );
      expect(artifact.recommendations.length).toBe(4);
    });
  });

  describe("RFC 4180 CSV & Markdown Exports", () => {
    it("escapes CSV cells with quotes and commas properly", () => {
      expect(escapeCsvCell("simple")).toBe("simple");
      expect(escapeCsvCell('with "quote"')).toBe('"with ""quote"""');
      expect(escapeCsvCell("with,comma")).toBe('"with,comma"');
      expect(escapeCsvCell("with\r\nnewline")).toBe('"with\r\nnewline"');
    });

    it("exports Pareto artifact to strict RFC 4180 CSV with CRLF line endings", () => {
      const artifact = synthesizeParetoFrontier("Financial Risk Optimization");
      const csv = paretoFrontierToCsv(artifact);

      expect(csv.endsWith("\r\n")).toBe(true);
      const lines = csv.split("\r\n").filter((l) => l.trim().length > 0);
      expect(lines.length).toBeGreaterThan(10);
      expect(lines[0]).toContain("Record Type,Provider ID");

      const crlfCount = (csv.match(/\r\n/g) || []).length;
      expect(crlfCount).toBe(lines.length);
    });

    it("exports Pareto artifact to formatted Markdown report", () => {
      const artifact = synthesizeParetoFrontier("Financial Risk Optimization");
      const md = paretoFrontierToMarkdown(artifact);

      expect(md).toContain("# 📈 Multi-Provider Cost-Latency Pareto Frontier");
      expect(md).toContain("## 📋 Strategic Overview");
      expect(md).toContain("## 🎯 Recommended Routing Strategies");
      expect(md).toContain(
        "## 📊 Multi-Provider Benchmark & Frontier Trade-Off Table",
      );
    });
  });

  describe("Zero Pseudo-Randomness & Documentation Integrity", () => {
    it("strictly verifies that pareto-optimizer.ts has ZERO Math.random() calls", () => {
      const filePath = path.join(
        process.cwd(),
        "src/lib/research/pareto-optimizer.ts",
      );
      const source = fs.readFileSync(filePath, "utf-8");
      expect(source).not.toContain("Math.random");
    });
  });
});
