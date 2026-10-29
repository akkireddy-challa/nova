import { describe, expect, it } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import {
  normalPdf,
  normalCdf,
  rbfKernel,
  solveLinearSystem,
  computeAcquisitionValue,
  GaussianProcessSurrogate1D,
  synthesizeBayesianOptimization,
  bayesianOptToCsv,
  bayesianOptToMarkdown,
} from "../src/lib/optimization/bayesian-opt-engine";

describe("Autonomous Bayesian Optimization & Hyperparameter Explorer Engine", () => {
  describe("Statistical & Normal Distribution Primitives", () => {
    it("computes accurate standard normal PDF values", () => {
      expect(normalPdf(0)).toBeCloseTo(0.3989, 3);
      expect(normalPdf(1)).toBeCloseTo(0.242, 3);
    });

    it("computes accurate standard normal CDF values", () => {
      expect(normalCdf(0)).toBeCloseTo(0.5, 3);
      expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
      expect(normalCdf(-1.96)).toBeCloseTo(0.025, 3);
      expect(normalCdf(-10)).toBe(0.0);
      expect(normalCdf(10)).toBe(1.0);
    });
  });

  describe("Linear Algebra & GP Surrogate Modeling", () => {
    it("computes symmetric RBF kernel distance decay", () => {
      const k1 = rbfKernel(2, 2, 1.5, 1.0);
      const k2 = rbfKernel(2, 4, 1.5, 1.0);
      const k3 = rbfKernel(4, 2, 1.5, 1.0);

      expect(k1).toBe(1.0);
      expect(k2).toBe(k3);
      expect(k2).toBeLessThan(k1);
    });

    it("solves linear system deterministically with Gaussian elimination", () => {
      const A = [
        [2, 1],
        [1, 3],
      ];
      const b = [5, 5];
      // 2x + y = 5, x + 3y = 5 => x = 2, y = 1
      const sol = solveLinearSystem(A, b);
      expect(sol[0]).toBeCloseTo(2.0, 4);
      expect(sol[1]).toBeCloseTo(1.0, 4);
    });

    it("fits 1D Gaussian Process surrogate model with uncertainty prediction", () => {
      const X = [1, 3, 5];
      const y = [10, 25, 20];
      const gp = new GaussianProcessSurrogate1D(X, y, 1.5, 1.0, 0.05);

      const predAtSample = gp.predict(3);
      expect(predAtSample.mean).toBeGreaterThan(15);
      expect(predAtSample.stdDev).toBeLessThan(1.0);

      const predFar = gp.predict(10);
      expect(predFar.stdDev).toBeGreaterThan(predAtSample.stdDev);
    });
  });

  describe("Acquisition Functions", () => {
    it("evaluates Upper Confidence Bound (UCB)", () => {
      const ucb = computeAcquisitionValue(
        100,
        10,
        90,
        "upper_confidence_bound",
        2.0,
      );
      expect(ucb).toBe(120);
    });

    it("evaluates Expected Improvement (EI)", () => {
      const ei = computeAcquisitionValue(105, 5, 100, "expected_improvement");
      expect(ei).toBeGreaterThan(0);
    });
  });

  describe("synthesizeBayesianOptimization", () => {
    it("synthesizes valid BayesianOptArtifact with parameters, trials, and surrogate curve", () => {
      const artifact = synthesizeBayesianOptimization(
        "vLLM Speculative Decoding Optimization",
        "Throughput (tokens/s)",
        "draft_tokens",
      );

      expect(artifact.id).toContain("bayes-");
      expect(artifact.title).toBe("vLLM Speculative Decoding Optimization");
      expect(artifact.parameters.length).toBeGreaterThanOrEqual(4);
      expect(artifact.trials.length).toBeGreaterThan(5);
      expect(artifact.surrogateCurve.length).toBe(31);
      expect(artifact.summary.bestObjectiveValue).toBeGreaterThan(0);
      expect(artifact.summary.improvementPct).toBeGreaterThan(0);
      expect(artifact.configSnippetYaml).toContain("inference_engine:");
      expect(artifact.configSnippetJson).toContain("inference_engine");
    });
  });

  describe("RFC 4180 CSV & Markdown Exports", () => {
    const artifact = synthesizeBayesianOptimization();

    it("exports trials to RFC 4180 compliant CSV with CRLF line endings", () => {
      const csv = bayesianOptToCsv(artifact);
      expect(csv).toContain("iteration,status,is_optimal");
      expect(csv).toContain("\r\n");
      const lines = csv.split("\r\n").filter(Boolean);
      expect(lines.length).toBe(artifact.trials.length + 1);
    });

    it("exports comprehensive Markdown report with parameters and trials table", () => {
      const md = bayesianOptToMarkdown(artifact);
      expect(md).toContain("# 🎛️ Bayesian Optimization Studio:");
      expect(md).toContain("Tuned Hyperparameters");
      expect(md).toContain("Sequential Trial History");
      expect(md).toContain("Production Configuration Snippet");
    });
  });

  describe("Zero Pseudo-Randomness Integrity", () => {
    it("strictly verifies ZERO Math.random() in bayesian-opt-engine.ts", () => {
      const filePath = join(
        process.cwd(),
        "src/lib/optimization/bayesian-opt-engine.ts",
      );
      const source = readFileSync(filePath, "utf-8");
      expect(source).not.toContain("Math.random()");
    });
  });
});
