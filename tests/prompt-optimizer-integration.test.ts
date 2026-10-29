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
import { synthesizePromptOptimization } from "../src/lib/optimization/prompt-optimizer";
import type { ChatMessage, GenerativeArtifact } from "../src/lib/types";

describe("Prompt Optimizer Fullstack Integration", () => {
  const sampleOptimization = synthesizePromptOptimization(
    "Cross-Shard Distributed Consensus Validation",
    "Analyze Raft vs Paxos edge case failovers.",
    "gemini-2.5-pro",
  );
  const sampleArtifact: GenerativeArtifact = {
    type: "prompt_optimizer",
    data: sampleOptimization,
  };

  describe("ArtifactStage.tsx Prompt Optimizer Rendering & CSV Export", () => {
    it("renders ArtifactStage preview with PromptOptimizerCard for prompt_optimizer artifacts", () => {
      const html = renderToStaticMarkup(
        React.createElement(ArtifactStage, {
          artifact: sampleArtifact,
          onClose: () => {},
        }),
      );

      expect(html).toContain("Cross-Shard Distributed Consensus Validation");
      expect(html).toContain("gemini-2.5-pro");
      expect(html).toContain("Download CSV");
      expect(html).toContain("Eval Accuracy");
      expect(html).toContain("DSPy Pareto-Optimal Hybrid");
    });

    it("renders print dossier section for prompt_optimizer artifacts", () => {
      const html = renderToStaticMarkup(
        React.createElement(ArtifactStage, {
          artifact: sampleArtifact,
          onClose: () => {},
        }),
      );

      expect(html).toContain(
        "Target Task: Cross-Shard Distributed Consensus Validation",
      );
      expect(html).toContain("Validation Test Bench");
      expect(html).toContain("DSPy Prompt Evolution Studio");
    });
  });

  describe("Spatial Intelligence Canvas Extraction & Edge Computation", () => {
    const mockMessages: ChatMessage[] = [
      {
        id: "msg-opt-1",
        role: "assistant",
        content: "Here is the prompt optimization studio output.",
        timestamp: "2026-10-29T21:00:00Z",
        artifact: sampleArtifact,
      },
    ];

    it("extracts spatial canvas node with proper metrics and tags for prompt_optimizer", () => {
      const nodes = extractSpatialNodes(mockMessages);
      expect(nodes.length).toBe(1);

      const node = nodes[0];
      expect(node.artifactType).toBe("prompt_optimizer");
      expect(node.title).toBe("Cross-Shard Distributed Consensus Validation");
      expect(node.tags).toContain("PROMPT_OPT");
      expect(node.tags).toContain("DSPY");
      expect(node.metrics?.status).toBe("optimized");
      expect(node.metrics?.itemCount).toBe(
        sampleOptimization.candidates.length,
      );
      expect(node.metrics?.evidenceCount).toBe(
        sampleOptimization.testCases.length,
      );
      expect(node.metrics?.score).toBe(
        Math.round(sampleOptimization.summary.optimizedScore),
      );
    });

    it("computes domain edges between prompt_optimizer and research/eval nodes", () => {
      const combinedMessages: ChatMessage[] = [
        ...mockMessages,
        {
          id: "msg-eval-1",
          role: "assistant",
          content: "Evaluation suite results.",
          timestamp: "2026-10-29T21:05:00Z",
          artifact: {
            type: "eval_suite",
            data: {
              id: "eval-01",
              topic: "Consensus Eval Suite",
              targetPipeline: "Consensus Pipeline",
              baselineVersion: "v1.0.0",
              evaluatedVersion: "v1.1.0",
              executiveSummary: "All passed.",
              generatedAt: "2026-10-29T21:05:00Z",
              scenarios: [],
              summary: {
                totalScenarios: 5,
                passedCount: 5,
                failedCount: 0,
                regressedCount: 0,
                averageLatencyMs: 1200,
                criticalRisksIdentified: 0,
                overallPassRatePct: 100,
                healthGrade: "A+",
              },
            },
          },
        },
      ];

      const nodes = extractSpatialNodes(combinedMessages);
      expect(nodes.length).toBe(2);

      const edges = computeSpatialEdges(nodes);
      expect(edges.length).toBe(1);
      expect(edges[0].relationType).toBe("validates");
      expect(edges[0].label).toBe("Metaprompt Benchmark Verification");
    });
  });

  describe("HTML & Print Dossier Resolvers", () => {
    it("resolves dossier title correctly for prompt_optimizer", () => {
      const title = resolveDossierTitle(sampleArtifact, null);
      expect(title).toBe("Cross-Shard Distributed Consensus Validation");
    });

    it("resolves print dossier metadata correctly for prompt_optimizer", () => {
      const metadata = getArtifactMetadata(
        sampleArtifact,
        "intelligence",
        "gemini-2.5-pro",
      );
      expect(metadata.title).toBe(
        "Cross-Shard Distributed Consensus Validation",
      );
      expect(metadata.modeName).toBe("Intelligence Memory");
    });
  });

  describe("Session Export Markdown Formatter", () => {
    it("formats prompt_optimizer markdown artifact cleanly with test bench", () => {
      const md = formatArtifactMarkdown(sampleArtifact);
      expect(md).toContain(
        "#### ⚡ Prompt Evolution Studio: Cross-Shard Distributed Consensus Validation",
      );
      expect(md).toContain("*Model:* **gemini-2.5-pro**");
      expect(md).toContain("Validation Test Bench");
      expect(md).toContain("Production Metaprompt");
    });
  });
});
