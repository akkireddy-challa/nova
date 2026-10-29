import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  causalDagToCsv,
  causalDagToMarkdown,
  computeAverageTreatmentEffect,
  computeEValue,
  synthesizeCausalDag,
  verifyBackdoorCriterion,
} from "../src/lib/causal/causal-dag-engine";
import type { CausalEdge, CausalNode } from "../src/lib/types";

describe("Autonomous Causal Inference & Counterfactual DAG Engine", () => {
  describe("Mathematical Causal Primitives", () => {
    it("computes accurate Average Treatment Effect (ATE) and confidence intervals", () => {
      const treated = [10, 12, 11, 13, 10]; // mean 11.2
      const control = [20, 22, 21, 23, 20]; // mean 21.2
      const res = computeAverageTreatmentEffect(treated, control);

      expect(res.ate).toBe(-10.0);
      expect(res.ciLower).toBeLessThan(-10.0);
      expect(res.ciUpper).toBeGreaterThan(-10.0);
      expect(res.pValue).toBeLessThanOrEqual(0.01);
    });

    it("handles empty sample arrays cleanly without NaN", () => {
      const res = computeAverageTreatmentEffect([], []);
      expect(res.ate).toBe(0);
      expect(res.pValue).toBe(1.0);
    });

    it("computes Ding & VanderWeele E-Value for sensitivity to unmeasured confounding", () => {
      // For RR = 2.0: E = 2.0 + sqrt(2.0 * 1.0) = 3.414 -> 3.41
      const eVal = computeEValue(2.0);
      expect(eVal).toBe(3.41);

      // Inverted RR for protective effects (RR = 0.5 -> 1/0.5 = 2.0 -> 3.41)
      const eValProtective = computeEValue(0.5);
      expect(eValProtective).toBe(3.41);

      expect(computeEValue(1.0)).toBe(1.0);
    });
  });

  describe("Pearl Backdoor Criterion Verification", () => {
    it("verifies satisfied backdoor criterion when all backdoor paths are blocked", () => {
      const nodes: CausalNode[] = [
        {
          id: "T",
          label: "Treatment",
          role: "treatment",
          description: "T",
          observedMean: 1,
          unit: "x",
          x: 0,
          y: 0,
        },
        {
          id: "Y",
          label: "Outcome",
          role: "outcome",
          description: "Y",
          observedMean: 1,
          unit: "y",
          x: 100,
          y: 0,
        },
        {
          id: "Z",
          label: "Confounder",
          role: "confounder",
          description: "Z",
          observedMean: 1,
          unit: "z",
          x: 50,
          y: 50,
        },
      ];

      const edges: CausalEdge[] = [
        {
          id: "e1",
          source: "Z",
          target: "T",
          coefficient: 0.5,
          pValue: 0.01,
          isBackdoorPath: true,
          isBlocked: true, // Controlled for
          mechanism: "Z -> T",
        },
        {
          id: "e2",
          source: "T",
          target: "Y",
          coefficient: -0.8,
          pValue: 0.01,
          isBackdoorPath: false,
          isBlocked: false,
          mechanism: "T -> Y",
        },
      ];

      const check = verifyBackdoorCriterion(nodes, edges, "T", "Y");
      expect(check.satisfied).toBe(true);
      expect(check.controlledConfounders).toContain("Confounder");
    });
  });

  describe("synthesizeCausalDag", () => {
    it("synthesizes valid CausalDagArtifact with structural equation model and counterfactuals", () => {
      const artifact = synthesizeCausalDag(
        "Connection Multiplexing Impact on Latency",
        "Connection Multiplexing",
        "P99 Tail Latency",
      );

      expect(artifact.hypothesis).toContain("Connection Multiplexing");
      expect(artifact.nodes.length).toBe(5);
      expect(artifact.edges.length).toBe(6);
      expect(artifact.counterfactuals.length).toBe(3);
      expect(artifact.summary.averageTreatmentEffect).toBeLessThan(0);
      expect(artifact.summary.backdoorCriterionSatisfied).toBe(true);
      expect(artifact.summary.causalIdentifiability).toBe("identifiable");
      expect(artifact.summary.eValue).toBeGreaterThan(1.0);
      expect(artifact.executiveSummary).toContain(
        "statistically significant causal reduction",
      );
    });
  });

  describe("RFC 4180 CSV & Markdown Exports", () => {
    it("exports causal DAG to RFC 4180 compliant CSV with CRLF endings", () => {
      const artifact = synthesizeCausalDag("Load Shedding Efficacy");
      const csv = causalDagToCsv(artifact);

      expect(csv).toContain("\r\n");
      expect(csv).toContain('"# Nova Causal Inference Studio"');
      expect(csv).toContain('"Node ID"');
      expect(csv).toContain('"Edge ID"');
      expect(csv).toContain('"Scenario ID"');
    });

    it("exports causal DAG to comprehensive Markdown report", () => {
      const artifact = synthesizeCausalDag("Load Shedding Efficacy");
      const md = causalDagToMarkdown(artifact);

      expect(md).toContain(
        "# Nova Causal Inference Studio: Load Shedding Efficacy",
      );
      expect(md).toContain("## Executive Causal Summary");
      expect(md).toContain("## Structural Causal Model DAG");
      expect(md).toContain('## Counterfactual "What-If" Analysis');
    });
  });

  describe("Strict Zero Pseudo-Randomness Verification", () => {
    it("strictly verifies ZERO Math.random() in causal-dag-engine.ts", () => {
      const filePath = resolve(
        import.meta.dir,
        "../src/lib/causal/causal-dag-engine.ts",
      );
      const fileContent = readFileSync(filePath, "utf-8");
      expect(fileContent).not.toContain("Math.random()");
    });
  });
});
