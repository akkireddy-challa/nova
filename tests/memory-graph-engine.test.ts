import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  calculateDegreeCentrality,
  computeGraphDensity,
  calculateGraphSummary,
  computeDeterministicNodePositions,
  synthesizeMemoryGraph,
  memoryGraphToCsv,
  memoryGraphToMarkdown,
} from "../src/lib/graph/memory-graph-engine";
import type {
  GraphEdge,
  GraphNode,
  KnowledgeMemoryItem,
} from "../src/lib/types";

describe("Autonomous Memory Graph Engine", () => {
  const sampleNodes: GraphNode[] = [
    {
      id: "node-1",
      label: "Ollama",
      type: "technology",
      description: "Local inference engine",
      centralityScore: 0,
      degree: 0,
    },
    {
      id: "node-2",
      label: "Gemini",
      type: "technology",
      description: "Hosted primary provider",
      centralityScore: 0,
      degree: 0,
    },
    {
      id: "node-3",
      label: "Failover Engine",
      type: "methodology",
      description: "Resilience coordinator",
      centralityScore: 0,
      degree: 0,
    },
  ];

  const sampleEdges: GraphEdge[] = [
    {
      id: "edge-1",
      source: "node-3",
      target: "node-1",
      relation: "fails_over_to",
      label: "fallback",
      weight: 0.95,
    },
    {
      id: "edge-2",
      source: "node-3",
      target: "node-2",
      relation: "relies_on",
      label: "primary",
      weight: 0.9,
    },
  ];

  describe("calculateDegreeCentrality", () => {
    it("computes accurate normalized degree centrality scores", () => {
      const centrality = calculateDegreeCentrality(sampleNodes, sampleEdges);

      expect(centrality.get("node-3")?.degree).toBe(2);
      expect(centrality.get("node-3")?.score).toBe(1.0); // 2 / (3 - 1) = 1.0

      expect(centrality.get("node-1")?.degree).toBe(1);
      expect(centrality.get("node-1")?.score).toBe(0.5); // 1 / 2 = 0.5

      expect(centrality.get("node-2")?.degree).toBe(1);
      expect(centrality.get("node-2")?.score).toBe(0.5);
    });

    it("handles single node without throwing", () => {
      const singleNode: GraphNode[] = [sampleNodes[0]];
      const centrality = calculateDegreeCentrality(singleNode, []);
      expect(centrality.get("node-1")?.degree).toBe(0);
      expect(centrality.get("node-1")?.score).toBe(0);
    });
  });

  describe("computeGraphDensity", () => {
    it("computes accurate density for undirected and directed graphs", () => {
      // 3 nodes, max undirected edges = 3 * 2 / 2 = 3. 2 edges => 2/3 = 0.6667
      const densityUndirected = computeGraphDensity(3, 2, false);
      expect(densityUndirected).toBe(0.6667);

      // directed: max edges = 3 * 2 = 6. 2 edges => 2/6 = 0.3333
      const densityDirected = computeGraphDensity(3, 2, true);
      expect(densityDirected).toBe(0.3333);
    });

    it("returns 0 for empty or single node graphs", () => {
      expect(computeGraphDensity(1, 0)).toBe(0);
      expect(computeGraphDensity(0, 0)).toBe(0);
    });
  });

  describe("calculateGraphSummary", () => {
    it("summarizes node and edge counts, dominant type, and most central node", () => {
      const summary = calculateGraphSummary(sampleNodes, sampleEdges);

      expect(summary.totalNodes).toBe(3);
      expect(summary.totalEdges).toBe(2);
      expect(summary.dominantEntityType).toBe("technology"); // 2 tech, 1 method
      expect(summary.mostCentralNode).toBe("Failover Engine"); // node-3 has degree 2
      expect(summary.averageDegree).toBe(1.33); // (2 * 2) / 3 = 1.33
    });
  });

  describe("computeDeterministicNodePositions", () => {
    it("returns deterministic coordinates for all nodes within viewport bounds", () => {
      const width = 800;
      const height = 500;
      const posMap1 = computeDeterministicNodePositions(
        sampleNodes,
        sampleEdges,
        width,
        height,
      );
      const posMap2 = computeDeterministicNodePositions(
        sampleNodes,
        sampleEdges,
        width,
        height,
      );

      expect(posMap1.size).toBe(3);
      for (const node of sampleNodes) {
        const p1 = posMap1.get(node.id);
        const p2 = posMap2.get(node.id);
        expect(p1).toBeDefined();
        expect(p2).toBeDefined();
        expect(p1?.x).toBe(p2?.x);
        expect(p1?.y).toBe(p2?.y);

        expect(p1!.x).toBeGreaterThan(0);
        expect(p1!.x).toBeLessThan(width);
        expect(p1!.y).toBeGreaterThan(0);
        expect(p1!.y).toBeLessThan(height);
      }
    });

    it("handles large node sets with multi-tier concentric layout", () => {
      const largeNodes: GraphNode[] = Array.from({ length: 9 }, (_, i) => ({
        id: `node-${i + 1}`,
        label: `Entity ${i + 1}`,
        type: "concept",
        description: `Description ${i + 1}`,
        centralityScore: 0,
        degree: 0,
      }));

      const positions = computeDeterministicNodePositions(
        largeNodes,
        [],
        1000,
        600,
      );
      expect(positions.size).toBe(9);
    });
  });

  describe("synthesizeMemoryGraph", () => {
    it("synthesizes valid default MemoryGraphArtifact with full topology", () => {
      const artifact = synthesizeMemoryGraph("Enterprise AI Architecture");

      expect(artifact.topic).toBe("Enterprise AI Architecture");
      expect(artifact.nodes.length).toBeGreaterThanOrEqual(5);
      expect(artifact.edges.length).toBeGreaterThanOrEqual(5);
      expect(artifact.summary.totalNodes).toBe(artifact.nodes.length);
      expect(artifact.summary.totalEdges).toBe(artifact.edges.length);
      expect(artifact.summary.mostCentralNode).toBeDefined();
    });

    it("synthesizes from provided memories when available", () => {
      const mockMemories: KnowledgeMemoryItem[] = [
        {
          id: "mem-1",
          title: "Next.js App Router Architecture",
          content: "Server-side rendering and streaming server components",
          category: "project_context",
          createdAt: "2026-10-29T20:00:00Z",
        },
        {
          id: "mem-2",
          title: "Tauri Desktop IPC Protocol",
          content:
            "Rust backend communicating with frontend via invoke commands",
          category: "project_context",
          createdAt: "2026-10-29T20:01:00Z",
        },
        {
          id: "mem-3",
          title: "Sovereign Ollama Deployment",
          content: "Offline LLM inference running on localhost port 11434",
          category: "document",
          createdAt: "2026-10-29T20:02:00Z",
        },
        {
          id: "mem-4",
          title: "Deterministic Verification Guard",
          content: "Zero Math.random() policy strictly enforced in test suite",
          category: "preference",
          createdAt: "2026-10-29T20:03:00Z",
        },
      ];

      const artifact = synthesizeMemoryGraph("System Knowledge", mockMemories);
      expect(artifact.nodes.length).toBe(4);
      expect(artifact.edges.length).toBeGreaterThanOrEqual(3);
      expect(artifact.nodes[0].label).toContain("Next.js");
    });
  });

  describe("RFC 4180 CSV & Markdown Exports", () => {
    it("exports memory graph to RFC 4180 CSV with CRLF line endings", () => {
      const artifact = synthesizeMemoryGraph("Test Knowledge Base");
      const csv = memoryGraphToCsv(artifact);

      expect(csv).toContain("\r\n");
      expect(csv).toContain(
        "RecordType,ID,SourceOrLabel,TargetOrType,RelationOrCentrality,WeightOrDegree,Description",
      );
      expect(csv).toContain("Node,");
      expect(csv).toContain("Edge,");
    });

    it("exports memory graph to formatted executive Markdown", () => {
      const artifact = synthesizeMemoryGraph("Test Markdown Export");
      const md = memoryGraphToMarkdown(artifact);

      expect(md).toContain("# Dynamic Memory Graph: Test Markdown Export");
      expect(md).toContain("## Executive Summary");
      expect(md).toContain("## Graph Metrics Scorecard");
      expect(md).toContain("## Entities & Centrality Hierarchy");
      expect(md).toContain("## Directed Relations & Semantic Bindings");
    });
  });

  describe("Zero Pseudo-Randomness Integrity", () => {
    it("strictly verifies ZERO Math.random() in memory-graph-engine.ts", () => {
      const filePath = join(
        process.cwd(),
        "src/lib/graph/memory-graph-engine.ts",
      );
      const source = readFileSync(filePath, "utf-8");

      expect(source).not.toContain("Math.random");
      expect(source).not.toContain("crypto.getRandomValues");
    });
  });
});
