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
  synthesizeParetoFrontier,
  paretoFrontierToCsv,
} from "@/lib/research/pareto-optimizer";
import type { ChatMessage, GenerativeArtifact } from "@/lib/types";

describe("Cost-Latency Pareto Frontier Fullstack Integration", () => {
  const samplePareto = synthesizeParetoFrontier(
    "Global Autonomous Multi-Agent Trading Swarm",
  );

  const sampleParetoArtifact: GenerativeArtifact = {
    type: "pareto_frontier",
    data: samplePareto,
  };

  const sampleMessages: ChatMessage[] = [
    {
      id: "msg-pf-1",
      role: "assistant",
      content: "Here is the multi-provider Pareto frontier routing analysis.",
      timestamp: "2026-10-29T05:30:00.000Z",
      artifact: sampleParetoArtifact,
    },
  ];

  describe("ArtifactStage.tsx Pareto Frontier Rendering & CSV Export", () => {
    it("imports ParetoFrontierCard and paretoFrontierToCsv in ArtifactStage", () => {
      const filePath = path.join(
        process.cwd(),
        "src/components/ArtifactStage.tsx",
      );
      const source = fs.readFileSync(filePath, "utf-8");
      expect(source).toContain("ParetoFrontierCard");
      expect(source).toContain("paretoFrontierToCsv");
    });

    it("renders ArtifactStage preview with ParetoFrontierCard for pareto_frontier artifacts", () => {
      const html = ReactDOMServer.renderToString(
        React.createElement(ArtifactStage, {
          artifact: sampleParetoArtifact,
          onClose: () => {},
        }),
      );

      expect(html).toContain("Global Autonomous Multi-Agent Trading Swarm");
      expect(html).toContain("Pareto Trade-Off Optimizer");
      expect(html).toContain("Optimal");
    });

    it("includes CSV export button in ArtifactStage for pareto_frontier", () => {
      const html = ReactDOMServer.renderToString(
        React.createElement(ArtifactStage, {
          artifact: sampleParetoArtifact,
          onClose: () => {},
        }),
      );

      expect(html).toContain('title="Download CSV"');
      expect(html).toContain('aria-label="Download CSV"');
    });

    it("renders print dossier section for pareto_frontier artifacts", () => {
      const html = ReactDOMServer.renderToString(
        React.createElement(ArtifactStage, {
          artifact: sampleParetoArtifact,
          onClose: () => {},
        }),
      );

      expect(html).toContain("Provider Cost &amp; Latency Frontier Benchmarks");
      expect(html).toContain("Strategic Enterprise Routing Matrix");
    });
  });

  describe("Spatial Intelligence Canvas Extraction & Edge Computation", () => {
    it("extracts spatial canvas node with pareto_frontier artifactType, metrics, and tags", () => {
      const nodes = extractSpatialNodes(sampleMessages);
      expect(nodes).toHaveLength(1);

      const node = nodes[0];
      expect(node.artifactType).toBe("pareto_frontier");
      expect(node.title).toBe("Global Autonomous Multi-Agent Trading Swarm");
      expect(node.tags).toContain("PARETO");
      expect(node.tags).toContain("OPTIMIZER");
      expect(node.tags).toContain("ROUTING");
      expect(node.metrics?.score).toBe(samplePareto.frontierProviderIds.length);
      expect(node.metrics?.itemCount).toBe(samplePareto.providers.length);
      expect(node.metrics?.status).toBe("optimized");
    });

    it("computes deterministic topological edges between pareto_frontier and related artifacts", () => {
      const mixedMessages: ChatMessage[] = [
        {
          id: "msg-1",
          role: "assistant",
          content: "Pareto Frontier",
          timestamp: "2026-10-29T05:30:00.000Z",
          artifact: sampleParetoArtifact,
        },
        {
          id: "msg-2",
          role: "assistant",
          content: "Decision Matrix",
          timestamp: "2026-10-29T05:31:00.000Z",
          artifact: {
            type: "matrix",
            data: {
              topic: "Multi-Cloud Provider Comparison",
              verdict: "Select balanced provider",
              criteria: [{ id: "crit-1", name: "Cost", weight: 0.5 }],
              options: [
                {
                  id: "opt-1",
                  name: "Provider A",
                  scores: {},
                  pros: [],
                  cons: [],
                  totalWeightedScore: 85,
                },
              ],
            },
          },
        },
        {
          id: "msg-3",
          role: "assistant",
          content: "Execution Roadmap",
          timestamp: "2026-10-29T05:32:00.000Z",
          artifact: {
            type: "plan",
            data: {
              goal: "Deploy Enterprise AI Infrastructure",
              overview: "Multi-cloud routing architecture roadmap.",
              timeframe: "Q1-Q2",
              phases: [],
              keySuccessMetrics: [
                "Sub-500ms p95 latency",
                "60% cost reduction",
              ],
            },
          },
        },
      ];

      const nodes = extractSpatialNodes(mixedMessages);
      const edges = computeSpatialEdges(nodes);

      expect(edges.length).toBeGreaterThanOrEqual(2);

      const paretoMatrixEdge = edges.find(
        (e) =>
          (e.sourceId === nodes[0].id && e.targetId === nodes[1].id) ||
          (e.sourceId === nodes[1].id && e.targetId === nodes[0].id),
      );
      expect(paretoMatrixEdge).toBeDefined();
      expect(paretoMatrixEdge?.relationType).toBe("compares");
      expect(paretoMatrixEdge?.label).toBe("Pareto Tradeoff Matrix");

      const paretoPlanEdge = edges.find(
        (e) =>
          (e.sourceId === nodes[0].id && e.targetId === nodes[2].id) ||
          (e.sourceId === nodes[2].id && e.targetId === nodes[0].id),
      );
      expect(paretoPlanEdge).toBeDefined();
      expect(paretoPlanEdge?.relationType).toBe("implements");
      expect(paretoPlanEdge?.label).toBe("Routing Infrastructure Plan");
    });
  });

  describe("Print Dossier & Session Export Formatters", () => {
    it("resolves print dossier metadata for pareto_frontier", () => {
      const meta = getArtifactMetadata(sampleParetoArtifact);
      expect(meta.title).toBe("Global Autonomous Multi-Agent Trading Swarm");
      expect(meta.modeName).toBe("Pareto Routing Optimizer");
    });

    it("formats markdown export for pareto_frontier artifacts with strategic routing summary", () => {
      const md = formatArtifactMarkdown(sampleParetoArtifact);
      expect(md).toContain("Cost-Latency Pareto Frontier");
      expect(md).toContain("Global Autonomous Multi-Agent Trading Swarm");
      expect(md).toContain("Strategic Routing Recommendations");
      expect(md).toContain("Balanced Enterprise Frontier");
      expect(md).toContain("Estimated savings:");
    });

    it("verifies paretoFrontierToCsv outputs RFC 4180 format with proper headers", () => {
      const csv = paretoFrontierToCsv(samplePareto);
      expect(csv).toContain(
        "Record Type,Provider ID,Display Name,Tier,Pareto Optimal",
      );
      expect(csv).toContain("PROVIDER_BENCHMARK");
      expect(csv).toContain("ROUTING_STRATEGY");
      expect(csv).toContain("gemini:gemini-2-0-flash");
    });
  });
});
