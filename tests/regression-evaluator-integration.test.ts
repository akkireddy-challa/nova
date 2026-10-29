import { describe, it, expect } from "bun:test";
import React from "react";
import ReactDOMServer from "react-dom/server";
import fs from "fs";
import path from "path";
import { ArtifactStage } from "@/components/ArtifactStage";
import {
  extractSpatialNodes,
  computeSpatialEdges,
} from "@/lib/canvas/spatial-canvas";
import { getArtifactMetadata } from "@/lib/print-dossier";
import { formatArtifactMarkdown } from "@/lib/session-export";
import {
  synthesizeRegressionEvalSuite,
  evalSuiteToCsv,
} from "@/lib/eval/regression-evaluator";
import type { ChatMessage, GenerativeArtifact } from "@/lib/types";

describe("Regression Evaluator Suite Fullstack Integration", () => {
  const sampleEval = synthesizeRegressionEvalSuite(
    "Mission-Critical Healthcare Diagnostic Safety Audit",
  );

  const sampleEvalArtifact: GenerativeArtifact = {
    type: "eval_suite",
    data: sampleEval,
  };

  const sampleMessages: ChatMessage[] = [
    {
      id: "msg-eval-1",
      role: "assistant",
      content:
        "Here is the automated regression test report for the healthcare model.",
      timestamp: "2026-10-29T06:00:00.000Z",
      artifact: sampleEvalArtifact,
    },
  ];

  describe("ArtifactStage.tsx Eval Suite Rendering & CSV Export", () => {
    it("imports RegressionEvaluatorCard and evalSuiteToCsv in ArtifactStage", () => {
      const filePath = path.join(
        process.cwd(),
        "src/components/ArtifactStage.tsx",
      );
      const source = fs.readFileSync(filePath, "utf-8");
      expect(source).toContain("RegressionEvaluatorCard");
      expect(source).toContain("evalSuiteToCsv");
    });

    it("renders ArtifactStage preview with RegressionEvaluatorCard for eval_suite artifacts", () => {
      const html = ReactDOMServer.renderToString(
        React.createElement(ArtifactStage, {
          artifact: sampleEvalArtifact,
          onClose: () => {},
        }),
      );

      expect(html).toContain(
        "Mission-Critical Healthcare Diagnostic Safety Audit",
      );
      expect(html).toContain("Dynamic Regression Evaluator");
      expect(html).toContain("Pass Rate");
    });

    it("includes CSV export button in ArtifactStage for eval_suite", () => {
      const html = ReactDOMServer.renderToString(
        React.createElement(ArtifactStage, {
          artifact: sampleEvalArtifact,
          onClose: () => {},
        }),
      );

      expect(html).toContain('title="Download CSV"');
      expect(html).toContain('aria-label="Download CSV"');
    });

    it("renders print dossier section for eval_suite artifacts", () => {
      const html = ReactDOMServer.renderToString(
        React.createElement(ArtifactStage, {
          artifact: sampleEvalArtifact,
          onClose: () => {},
        }),
      );

      expect(html).toContain("Scenario Evaluation Scorecard");
      expect(html).toContain("Target Pipeline:");
      expect(html).toContain("Nova Autonomous Multi-Agent Pipeline v1.4");
      expect(html).toContain("eval-adv-01");
    });
  });

  describe("Spatial Intelligence Canvas Extraction & Edge Computation", () => {
    it("extracts spatial canvas node with eval_suite artifactType, metrics, and tags", () => {
      const nodes = extractSpatialNodes(sampleMessages);
      expect(nodes).toHaveLength(1);

      const node = nodes[0];
      expect(node.artifactType).toBe("eval_suite");
      expect(node.title).toBe(
        "Mission-Critical Healthcare Diagnostic Safety Audit",
      );
      expect(node.tags).toContain("EVAL");
      expect(node.tags).toContain("REGRESSION");
      expect(node.tags).toContain("QA");
      expect(node.metrics?.score).toBe(sampleEval.summary.overallPassRatePct);
      expect(node.metrics?.itemCount).toBe(sampleEval.scenarios.length);
      expect(node.metrics?.status).toBe("evaluated");
    });

    it("computes deterministic topological edges between eval_suite and related artifacts", () => {
      const mixedMessages: ChatMessage[] = [
        {
          id: "msg-1",
          role: "assistant",
          content: "Eval Suite",
          timestamp: "2026-10-29T06:00:00.000Z",
          artifact: sampleEvalArtifact,
        },
        {
          id: "msg-2",
          role: "assistant",
          content: "TypeScript Implementation",
          timestamp: "2026-10-29T06:01:00.000Z",
          artifact: {
            type: "code",
            data: {
              filename: "evaluator.ts",
              language: "typescript",
              code: "export function evaluate() { return true; }",
              explanation: "Pure deterministic evaluation routine.",
            },
          },
        },
        {
          id: "msg-3",
          role: "assistant",
          content: "Research Synthesis",
          timestamp: "2026-10-29T06:02:00.000Z",
          artifact: {
            type: "research",
            data: {
              title: "Clinical Safety Benchmarks",
              executiveSummary: "Grounded research synthesis.",
              recommendation:
                "Deploy with automated regression checks and citation grounding.",
              keyFindings: [],
              sources: [],
            },
          },
        },
      ];

      const nodes = extractSpatialNodes(mixedMessages);
      const edges = computeSpatialEdges(nodes);

      expect(edges.length).toBeGreaterThanOrEqual(2);

      const evalCodeEdge = edges.find(
        (e) =>
          (e.sourceId === nodes[0].id && e.targetId === nodes[1].id) ||
          (e.sourceId === nodes[1].id && e.targetId === nodes[0].id),
      );
      expect(evalCodeEdge).toBeDefined();
      expect(evalCodeEdge?.relationType).toBe("validates");
      expect(evalCodeEdge?.label).toBe("Automated Code QA");

      const evalResearchEdge = edges.find(
        (e) =>
          (e.sourceId === nodes[0].id && e.targetId === nodes[2].id) ||
          (e.sourceId === nodes[2].id && e.targetId === nodes[0].id),
      );
      expect(evalResearchEdge).toBeDefined();
      expect(evalResearchEdge?.relationType).toBe("validates");
      expect(evalResearchEdge?.label).toBe("Grounding Accuracy Audit");
    });
  });

  describe("Print Dossier & Session Export Formatters", () => {
    it("resolves print dossier metadata for eval_suite", () => {
      const meta = getArtifactMetadata(sampleEvalArtifact);
      expect(meta.title).toBe(
        "Mission-Critical Healthcare Diagnostic Safety Audit",
      );
      expect(meta.modeName).toBe("Dynamic Regression Evaluator");
    });

    it("formats markdown export for eval_suite artifacts with pass status and scenarios", () => {
      const md = formatArtifactMarkdown(sampleEvalArtifact);
      expect(md).toContain("Automated Regression Evaluation Suite");
      expect(md).toContain(
        "Mission-Critical Healthcare Diagnostic Safety Audit",
      );
      expect(md).toContain("Evaluation Scenarios");
      expect(md).toContain("System Prompt Extraction Isolation");
      expect(md).toContain("eval-adv-01");
    });

    it("verifies evalSuiteToCsv outputs RFC 4180 format with proper headers", () => {
      const csv = evalSuiteToCsv(sampleEval);
      expect(csv).toContain("Record Type,Scenario ID,Title,Category,Status");
      expect(csv).toContain("OVERVIEW");
      expect(csv).toContain("SCENARIO_RESULT");
      expect(csv).toContain("eval-adv-01");
    });
  });
});
