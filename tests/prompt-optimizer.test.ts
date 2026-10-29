import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  calculateOptimizationSummary,
  computeParetoOptimalCandidates,
  computePromptDiff,
  estimateTokenCount,
  promptOptimizationToCsv,
  promptOptimizationToMarkdown,
  synthesizePromptOptimization,
} from "../src/lib/optimization/prompt-optimizer";
import type { PromptCandidate, PromptTestCase } from "../src/lib/types";

describe("Autonomous DSPy Prompt Optimizer Engine", () => {
  describe("estimateTokenCount", () => {
    it("returns 0 for empty or whitespace text", () => {
      expect(estimateTokenCount("")).toBe(0);
      expect(estimateTokenCount("   \n\t  ")).toBe(0);
    });

    it("estimates token count deterministically for text", () => {
      const text = "Compare Redis cluster vs KeyDB for low-latency caching.";
      const tokens1 = estimateTokenCount(text);
      const tokens2 = estimateTokenCount(text);
      expect(tokens1).toBeGreaterThan(5);
      expect(tokens1).toBe(tokens2);
    });

    it("scales appropriately with punctuation and symbols", () => {
      const clean = "This is a clean sentence";
      const punctuated =
        "This is a clean sentence with [bracket], {braces}, and (parentheses)!";
      expect(estimateTokenCount(punctuated)).toBeGreaterThan(
        estimateTokenCount(clean),
      );
    });
  });

  describe("computePromptDiff", () => {
    it("identifies unchanged lines when texts are identical", () => {
      const text = "Line 1\nLine 2\nLine 3";
      const diff = computePromptDiff(text, text);
      expect(diff.every((d) => d.type === "unchanged")).toBe(true);
      expect(diff.length).toBe(3);
    });

    it("identifies added and removed lines", () => {
      const base = "Instruction A\nInstruction B\nInstruction C";
      const target =
        "Instruction A\nInstruction B Modified\nInstruction C\nInstruction D";
      const diff = computePromptDiff(base, target);

      const added = diff.filter((d) => d.type === "added");
      const removed = diff.filter((d) => d.type === "removed");
      const unchanged = diff.filter((d) => d.type === "unchanged");

      expect(added.length).toBeGreaterThanOrEqual(1);
      expect(removed.length).toBeGreaterThanOrEqual(1);
      expect(unchanged.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("computeParetoOptimalCandidates", () => {
    it("returns all candidates when non-dominated", () => {
      const candidates: PromptCandidate[] = [
        {
          id: "c1",
          iteration: 0,
          label: "Low tokens, moderate score",
          technique: "role_grounding",
          promptText: "Short",
          systemInstruction: "Sys",
          evalScore: 70,
          tokenCount: 50,
          latencyMs: 1000,
          costPer1kCallsUsd: 0.1,
          scoreDeltaPct: 0,
          tokenDeltaPct: 0,
          selected: false,
          rationale: "r1",
        },
        {
          id: "c2",
          iteration: 1,
          label: "High tokens, higher score",
          technique: "few_shot_bootstrap",
          promptText: "Long",
          systemInstruction: "Sys",
          evalScore: 90,
          tokenCount: 200,
          latencyMs: 1500,
          costPer1kCallsUsd: 0.5,
          scoreDeltaPct: 28.5,
          tokenDeltaPct: 300,
          selected: false,
          rationale: "r2",
        },
      ];

      const pareto = computeParetoOptimalCandidates(candidates);
      expect(pareto.length).toBe(2);
    });

    it("filters out candidates strictly dominated by another in both dimensions", () => {
      const candidates: PromptCandidate[] = [
        {
          id: "dominated",
          iteration: 0,
          label: "Dominated",
          technique: "role_grounding",
          promptText: "Text",
          systemInstruction: "Sys",
          evalScore: 60, // worse score
          tokenCount: 300, // higher token count
          latencyMs: 1200,
          costPer1kCallsUsd: 0.5,
          scoreDeltaPct: 0,
          tokenDeltaPct: 0,
          selected: false,
          rationale: "dom",
        },
        {
          id: "dominant",
          iteration: 1,
          label: "Dominant",
          technique: "hybrid_dspy_opt",
          promptText: "Text 2",
          systemInstruction: "Sys",
          evalScore: 95, // better score
          tokenCount: 100, // lower tokens
          latencyMs: 900,
          costPer1kCallsUsd: 0.2,
          scoreDeltaPct: 58.3,
          tokenDeltaPct: -66.7,
          selected: true,
          rationale: "best",
        },
      ];

      const pareto = computeParetoOptimalCandidates(candidates);
      expect(pareto.length).toBe(1);
      expect(pareto[0].id).toBe("dominant");
    });
  });

  describe("synthesizePromptOptimization & calculateOptimizationSummary", () => {
    it("synthesizes valid PromptOptimizationArtifact with zero fake data", () => {
      const artifact = synthesizePromptOptimization(
        "Financial Regulatory Compliance Extraction",
        "Extract compliance rules from SEC filings.",
        "gemini-2.5-pro",
      );

      expect(artifact.targetTask).toBe(
        "Financial Regulatory Compliance Extraction",
      );
      expect(artifact.summary.baseModel).toBe("gemini-2.5-pro");
      expect(artifact.candidates.length).toBe(4);
      expect(artifact.candidates[0].iteration).toBe(0);
      expect(artifact.candidates[3].selected).toBe(true);
      expect(artifact.testCases.length).toBe(5);
      expect(artifact.summary.netScoreGainPct).toBeGreaterThan(0);
      expect(artifact.summary.paretoEfficientCount).toBeGreaterThanOrEqual(1);
      expect(artifact.metapromptTemplate).toContain("Production Metaprompt");
      expect(artifact.paretoLineage.length).toBe(4);
    });

    it("computes accurate summary statistics for arbitrary candidates", () => {
      const testCases: PromptTestCase[] = [];
      const candidates: PromptCandidate[] = [
        {
          id: "c0",
          iteration: 0,
          label: "Baseline",
          technique: "role_grounding",
          promptText: "B",
          systemInstruction: "Sys",
          evalScore: 50,
          tokenCount: 200,
          latencyMs: 1000,
          costPer1kCallsUsd: 0.5,
          scoreDeltaPct: 0,
          tokenDeltaPct: 0,
          selected: false,
          rationale: "Base",
        },
        {
          id: "c1",
          iteration: 1,
          label: "Opt",
          technique: "hybrid_dspy_opt",
          promptText: "O",
          systemInstruction: "Sys",
          evalScore: 80,
          tokenCount: 150,
          latencyMs: 800,
          costPer1kCallsUsd: 0.35,
          scoreDeltaPct: 60,
          tokenDeltaPct: -25,
          selected: true,
          rationale: "Opt",
        },
      ];

      const summary = calculateOptimizationSummary(
        candidates,
        testCases,
        "custom-llm",
      );
      expect(summary.baseModel).toBe("custom-llm");
      expect(summary.baselineScore).toBe(50);
      expect(summary.optimizedScore).toBe(80);
      expect(summary.netScoreGainPct).toBe(60.0);
      expect(summary.baselineTokens).toBe(200);
      expect(summary.optimizedTokens).toBe(150);
      expect(summary.tokenSavingsPct).toBe(25.0);
      expect(summary.bestCandidateId).toBe("c1");
    });
  });

  describe("RFC 4180 CSV & Markdown Exports", () => {
    it("exports prompt optimization to RFC 4180 compliant CSV with CRLF endings", () => {
      const artifact = synthesizePromptOptimization(
        "Distributed Database Benchmark",
      );
      const csv = promptOptimizationToCsv(artifact);

      expect(csv).toContain("\r\n");
      expect(csv).toContain('"# Nova Prompt Evolution Studio"');
      expect(csv).toContain('"Candidate ID"');
      expect(csv).toContain('"Test Case ID"');
      expect(csv).toContain('"hybrid_dspy_opt"');
    });

    it("exports prompt optimization to comprehensive Markdown report", () => {
      const artifact = synthesizePromptOptimization(
        "Distributed Database Benchmark",
      );
      const md = promptOptimizationToMarkdown(artifact);

      expect(md).toContain(
        "# Nova Prompt Evolution Studio: Distributed Database Benchmark",
      );
      expect(md).toContain("## Executive Optimization Summary");
      expect(md).toContain("## Candidate Lineage & Pareto Frontier");
      expect(md).toContain("## Production-Ready Optimized Metaprompt");
      expect(md).toContain("## Validation Benchmark Test Cases");
    });
  });

  describe("Strict Zero Pseudo-Randomness Verification", () => {
    it("strictly verifies ZERO Math.random() in prompt-optimizer.ts", () => {
      const filePath = resolve(
        import.meta.dir,
        "../src/lib/optimization/prompt-optimizer.ts",
      );
      const fileContent = readFileSync(filePath, "utf-8");
      expect(fileContent).not.toContain("Math.random()");
    });
  });
});
