import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ArtifactStage } from "../src/components/ArtifactStage";
import {
  extractSpatialNodes,
  computeSpatialEdges,
} from "../src/lib/canvas/spatial-canvas";
import { getArtifactMetadata } from "../src/lib/print-dossier";
import { resolveDossierTitle } from "../src/lib/html-dossier";
import { formatArtifactMarkdown } from "../src/lib/session-export";
import { synthesizeCausalDag } from "../src/lib/causal/causal-dag-engine";
import type { ChatMessage, GenerativeArtifact } from "../src/lib/types";

describe("Causal DAG Fullstack Integration", () => {
  const sampleCausalDag = synthesizeCausalDag(
    "Speculative Decoding on Time-to-First-Token",
    "Measuring speculative draft model verification overhead vs batch latency",
  );
  const sampleArtifact: GenerativeArtifact = {
    type: "causal_dag",
    data: sampleCausalDag,
  };

  describe("ArtifactStage.tsx Causal DAG Rendering & CSV Export", () => {
    it("renders ArtifactStage preview with CausalDagCard for causal_dag artifacts", () => {
      const html = renderToStaticMarkup(
        React.createElement(ArtifactStage, {
          artifact: sampleArtifact,
          onClose: () => {},
        }),
      );

      expect(html).toContain("Speculative Decoding on Time-to-First-Token");
      expect(html).toContain("Download CSV");
      expect(html).toContain('role="graphics-document"');
      expect(html).toContain("Backdoor Criterion");
      expect(html).toContain("E-Value Robustness");
    });

    it("renders print dossier section for causal_dag artifacts", () => {
      const html = renderToStaticMarkup(
        React.createElement(ArtifactStage, {
          artifact: sampleArtifact,
          onClose: () => {},
        }),
      );

      expect(html).toContain(
        "Hypothesis: Speculative Decoding on Time-to-First-Token",
      );
      expect(html).toContain("Structural Pathways &amp; Mechanisms");
      expect(html).toContain("Causal Inference &amp; SCM Studio");
      expect(html).toContain("E-Value Robustness");
    });
  });

  describe("Spatial Intelligence Canvas Extraction & Edge Computation", () => {
    const mockMessages: ChatMessage[] = [
      {
        id: "msg-cd-1",
        role: "assistant",
        content: "Here is the causal DAG model.",
        timestamp: "2026-10-29T21:30:00Z",
        artifact: sampleArtifact,
      },
    ];

    it("extracts spatial canvas node with proper metrics and tags for causal_dag", () => {
      const nodes = extractSpatialNodes(mockMessages);
      expect(nodes.length).toBe(1);

      const node = nodes[0];
      expect(node.artifactType).toBe("causal_dag");
      expect(node.title).toBe("Speculative Decoding on Time-to-First-Token");
      expect(node.tags).toContain("CAUSAL_DAG");
      expect(node.tags).toContain("DO_CALCULUS");
      expect(node.metrics?.status).toBe("causal");
      expect(node.metrics?.itemCount).toBe(sampleCausalDag.nodes.length);
      expect(node.metrics?.evidenceCount).toBe(
        sampleCausalDag.counterfactuals.length,
      );
      expect(node.metrics?.score).toBe(
        Math.round(Math.abs(sampleCausalDag.summary.averageTreatmentEffect)),
      );
    });

    it("computes domain edges between causal_dag and debate/eval nodes", () => {
      const combinedMessages: ChatMessage[] = [
        ...mockMessages,
        {
          id: "msg-eval-1",
          role: "assistant",
          content: "Evaluation suite results.",
          timestamp: "2026-10-29T21:35:00Z",
          artifact: {
            type: "eval_suite",
            data: {
              id: "eval-01",
              topic: "Regression Benchmark",
              targetPipeline: "inference-router",
              baselineVersion: "v1.0.0",
              evaluatedVersion: "v1.1.0",
              scenarios: [],
              summary: {
                totalScenarios: 20,
                passedCount: 19,
                failedCount: 1,
                regressedCount: 0,
                overallPassRatePct: 95,
                averageLatencyMs: 120,
                criticalRisksIdentified: 0,
                healthGrade: "A",
              },
              executiveSummary: "Summary",
              generatedAt: "2026-10-29T21:35:00Z",
            },
          },
        },
      ];

      const nodes = extractSpatialNodes(combinedMessages);
      expect(nodes.length).toBe(2);

      const edges = computeSpatialEdges(nodes);
      expect(edges.length).toBe(1);
      expect(edges[0].relationType).toBe("validates");
      expect(edges[0].label).toBe("Causal SCM Validates");
    });
  });

  describe("HTML & Print Dossier Resolvers", () => {
    it("resolves dossier title correctly for causal_dag", () => {
      const title = resolveDossierTitle(sampleArtifact, null);
      expect(title).toBe("Speculative Decoding on Time-to-First-Token");
    });

    it("resolves print dossier metadata correctly for causal_dag", () => {
      const metadata = getArtifactMetadata(
        sampleArtifact,
        "planner",
        "gemini-2.5-pro",
      );
      expect(metadata.title).toBe(
        "Speculative Decoding on Time-to-First-Token",
      );
      expect(metadata.modeName).toBe("Strategic Planner");
    });
  });

  describe("Session Export Markdown Formatter", () => {
    it("formats causal_dag markdown artifact cleanly with pathways and scenarios", () => {
      const md = formatArtifactMarkdown(sampleArtifact);
      expect(md).toContain(
        "#### 🔀 Causal DAG & Counterfactual Studio: Speculative Decoding on Time-to-First-Token",
      );
      expect(md).toContain("Backdoor Criterion");
      expect(md).toContain("Causal Nodes");
      expect(md).toContain("Structural Pathways");
      expect(md).toContain("Counterfactual Scenarios");
    });
  });
});
