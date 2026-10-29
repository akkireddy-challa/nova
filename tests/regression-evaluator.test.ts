import { describe, it, expect } from "bun:test";
import fs from "fs";
import path from "path";
import {
  computeHealthGrade,
  calculateEvalSummary,
  synthesizeRegressionEvalSuite,
  evalSuiteToCsv,
  evalSuiteToMarkdown,
  escapeCsvCell,
  DEFAULT_EVAL_SCENARIOS,
  type EvaluationScenario,
} from "@/lib/eval/regression-evaluator";

describe("Automated Regression Evaluation Suite Engine", () => {
  describe("computeHealthGrade", () => {
    it("returns correct grade thresholds", () => {
      expect(computeHealthGrade(98)).toBe("A+");
      expect(computeHealthGrade(95)).toBe("A+");
      expect(computeHealthGrade(92)).toBe("A");
      expect(computeHealthGrade(90)).toBe("A");
      expect(computeHealthGrade(85)).toBe("B");
      expect(computeHealthGrade(80)).toBe("B");
      expect(computeHealthGrade(75)).toBe("C");
      expect(computeHealthGrade(70)).toBe("C");
      expect(computeHealthGrade(65)).toBe("F");
    });
  });

  describe("calculateEvalSummary", () => {
    it("handles empty scenario array cleanly", () => {
      const summary = calculateEvalSummary([]);
      expect(summary.totalScenarios).toBe(0);
      expect(summary.passedCount).toBe(0);
      expect(summary.failedCount).toBe(0);
      expect(summary.regressedCount).toBe(0);
      expect(summary.overallPassRatePct).toBe(0);
      expect(summary.healthGrade).toBe("F");
    });

    it("calculates accurate summary statistics from scenarios", () => {
      const scenarios: EvaluationScenario[] = [
        {
          scenarioId: "test-1",
          title: "Scenario 1",
          category: "adversarial_injection",
          promptInput: "Prompt",
          expectedConstraints: [],
          actualOutputSnippet: "Output",
          status: "passed",
          score: 95,
          latencyMs: 500,
        },
        {
          scenarioId: "test-2",
          title: "Scenario 2",
          category: "grounding_alignment",
          promptInput: "Prompt",
          expectedConstraints: [],
          actualOutputSnippet: "Output",
          status: "passed",
          score: 90,
          latencyMs: 700,
        },
        {
          scenarioId: "test-3",
          title: "Scenario 3",
          category: "latency_sla",
          promptInput: "Prompt",
          expectedConstraints: [],
          actualOutputSnippet: "Output",
          status: "failed",
          score: 60,
          latencyMs: 2400,
        },
      ];

      const summary = calculateEvalSummary(scenarios);
      expect(summary.totalScenarios).toBe(3);
      expect(summary.passedCount).toBe(2);
      expect(summary.failedCount).toBe(1);
      expect(summary.overallPassRatePct).toBe(66.7);
      expect(summary.averageLatencyMs).toBe(1200); // (500 + 700 + 2400) / 3
      expect(summary.criticalRisksIdentified).toBe(1);
      expect(summary.healthGrade).toBe("F");
    });

    it("calculates summary for default enterprise scenarios", () => {
      const summary = calculateEvalSummary(DEFAULT_EVAL_SCENARIOS);
      expect(summary.totalScenarios).toBe(9);
      expect(summary.passedCount).toBe(9);
      expect(summary.failedCount).toBe(0);
      expect(summary.overallPassRatePct).toBe(100);
      expect(summary.healthGrade).toBe("A+");
      expect(summary.averageLatencyMs).toBeGreaterThan(0);
    });
  });

  describe("synthesizeRegressionEvalSuite", () => {
    it("creates populated RegressionEvalArtifact from string topic", () => {
      const artifact = synthesizeRegressionEvalSuite(
        "Financial Agent Guardrails",
      );
      expect(artifact.id).toContain("eval-financial-agent-guardrails");
      expect(artifact.topic).toBe("Financial Agent Guardrails");
      expect(artifact.targetPipeline).toContain("Nova Autonomous");
      expect(artifact.scenarios.length).toBe(9);
      expect(artifact.summary.overallPassRatePct).toBe(100);
      expect(artifact.summary.healthGrade).toBe("A+");
    });

    it("handles object config inputs cleanly", () => {
      const artifact = synthesizeRegressionEvalSuite({
        title: "Medical Diagnostic QA Pipeline",
        targetPipeline: "BioNova v2.0",
        executiveSummary: "Clinical safety validation suite.",
      });
      expect(artifact.topic).toBe("Medical Diagnostic QA Pipeline");
      expect(artifact.targetPipeline).toBe("BioNova v2.0");
      expect(artifact.executiveSummary).toBe(
        "Clinical safety validation suite.",
      );
    });
  });

  describe("RFC 4180 CSV & Markdown Exports", () => {
    it("escapes CSV cells with quotes and commas properly", () => {
      expect(escapeCsvCell('Hello "World"')).toBe('"Hello ""World"""');
      expect(escapeCsvCell("Simple,Text")).toBe('"Simple,Text"');
      expect(escapeCsvCell("Normal")).toBe("Normal");
      expect(escapeCsvCell(null)).toBe("");
    });

    it("exports eval suite to strict RFC 4180 CSV with CRLF line endings", () => {
      const artifact = synthesizeRegressionEvalSuite(
        "Enterprise Security Audit",
      );
      const csv = evalSuiteToCsv(artifact);

      expect(csv).toContain("\r\n");
      expect(csv).toContain("Record Type,Scenario ID,Title,Category,Status");
      expect(csv).toContain("OVERVIEW");
      expect(csv).toContain("SCENARIO_RESULT");
      expect(csv).toContain("eval-adv-01");
      expect(csv).toContain("System Prompt Extraction Isolation");
      expect(csv).toContain("PASSED");
    });

    it("exports eval suite to formatted Markdown report", () => {
      const artifact = synthesizeRegressionEvalSuite(
        "Compliance Gate Verification",
      );
      const md = evalSuiteToMarkdown(artifact);

      expect(md).toContain(
        "# 🧪 Automated Regression Evaluation Suite: Compliance Gate Verification",
      );
      expect(md).toContain("Health Grade: **A+**");
      expect(md).toContain("**Passed:** 9 ✅");
      expect(md).toContain("| `eval-adv-01` |");
      expect(md).toContain("System Prompt Extraction Isolation");
      expect(md).toContain("✅ PASS");
    });
  });

  describe("Zero Pseudo-Randomness & Documentation Integrity", () => {
    it("strictly verifies that regression-evaluator.ts has ZERO Math.random() calls", () => {
      const filePath = path.join(
        process.cwd(),
        "src/lib/eval/regression-evaluator.ts",
      );
      const content = fs.readFileSync(filePath, "utf-8");
      expect(content).not.toContain("Math.random");
    });
  });
});
