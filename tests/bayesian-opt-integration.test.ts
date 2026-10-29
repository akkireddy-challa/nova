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
import { synthesizeBayesianOptimization } from "../src/lib/optimization/bayesian-opt-engine";
import type { ChatMessage, GenerativeArtifact } from "../src/lib/types";

describe("Bayesian Optimization Fullstack Integration", () => {
  const sampleBayesianOpt = synthesizeBayesianOptimization(
    "vLLM Speculative Decoding Optimization",
    "Throughput (tokens/s)",
    "draft_tokens",
  );
  const sampleArtifact: GenerativeArtifact = {
    type: "bayesian_opt",
    data: sampleBayesianOpt,
  };

  describe("ArtifactStage.tsx Bayesian Opt Rendering & CSV Export", () => {
    it("renders ArtifactStage preview with BayesianOptCard for bayesian_opt artifacts", () => {
      const html = renderToStaticMarkup(
        React.createElement(ArtifactStage, {
          artifact: sampleArtifact,
          onClose: () => {},
        }),
      );

      expect(html).toContain("vLLM Speculative Decoding Optimization");
      expect(html).toContain("Download CSV");
      expect(html).toContain('role="graphics-document"');
      expect(html).toContain("Peak Objective");
      expect(html).toContain("Acquisition Peak");
    });

    it("renders print dossier section for bayesian_opt artifacts", () => {
      const html = renderToStaticMarkup(
        React.createElement(ArtifactStage, {
          artifact: sampleArtifact,
          onClose: () => {},
        }),
      );

      expect(html).toContain(
        "Target: vLLM Speculative Decoding Optimization (DeepSeek-R1-Distill-70B)",
      );
      expect(html).toContain("Tuned Hyperparameters");
      expect(html).toContain(
        "Bayesian Optimization &amp; Hyperparameter Studio",
      );
      expect(html).toContain("Production Runtime Configuration (YAML)");
    });
  });

  describe("Spatial Intelligence Canvas Extraction & Edge Computation", () => {
    const mockMessages: ChatMessage[] = [
      {
        id: "msg-bo-1",
        role: "assistant",
        content: "Here is the Bayesian optimization study.",
        timestamp: "2026-10-29T22:00:00Z",
        artifact: sampleArtifact,
      },
    ];

    it("extracts spatial canvas node with proper metrics and tags for bayesian_opt", () => {
      const nodes = extractSpatialNodes(mockMessages);
      expect(nodes.length).toBe(1);

      const node = nodes[0];
      expect(node.artifactType).toBe("bayesian_opt");
      expect(node.title).toBe("vLLM Speculative Decoding Optimization");
      expect(node.tags).toContain("BAYESIAN_OPT");
      expect(node.tags).toContain("GAUSSIAN_PROCESS");
      expect(node.metrics?.status).toBe("optimized");
      expect(node.metrics?.itemCount).toBe(sampleBayesianOpt.trials.length);
      expect(node.metrics?.evidenceCount).toBe(
        sampleBayesianOpt.parameters.length,
      );
      expect(node.metrics?.score).toBe(
        Math.round(sampleBayesianOpt.summary.bestObjectiveValue),
      );
    });

    it("computes domain edges between bayesian_opt and eval_suite nodes", () => {
      const combinedMessages: ChatMessage[] = [
        ...mockMessages,
        {
          id: "msg-eval-1",
          role: "assistant",
          content: "Evaluation suite results.",
          timestamp: "2026-10-29T22:05:00Z",
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
              generatedAt: "2026-10-29T22:05:00Z",
            },
          },
        },
      ];

      const nodes = extractSpatialNodes(combinedMessages);
      expect(nodes.length).toBe(2);

      const edges = computeSpatialEdges(nodes);
      expect(edges.length).toBe(1);
      expect(edges[0].relationType).toBe("validates");
      expect(edges[0].label).toBe("Hyperparameter Benchmark Tuning");
    });
  });

  describe("HTML & Print Dossier Resolvers", () => {
    it("resolves dossier title correctly for bayesian_opt", () => {
      const title = resolveDossierTitle(sampleArtifact, null);
      expect(title).toBe("vLLM Speculative Decoding Optimization");
    });

    it("resolves print dossier metadata correctly for bayesian_opt", () => {
      const metadata = getArtifactMetadata(sampleArtifact);
      expect(metadata.title).toBe("vLLM Speculative Decoding Optimization");
      expect(metadata.modeName).toBe(
        "Bayesian Optimization & Hyperparameter Studio",
      );
    });
  });

  describe("Session Export Markdown Formatter", () => {
    it("formats bayesian_opt markdown artifact cleanly with tuned parameters and trials", () => {
      const md = formatArtifactMarkdown(sampleArtifact);
      expect(md).toContain(
        "#### 🎛️ Bayesian Optimization Studio: vLLM Speculative Decoding Optimization",
      );
      expect(md).toContain("Tuned Parameters");
      expect(md).toContain("Evaluated Trials");
      expect(md).toContain("Optimal Peak");
    });
  });
});
