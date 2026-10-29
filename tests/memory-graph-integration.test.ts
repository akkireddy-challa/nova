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
import { synthesizeMemoryGraph } from "../src/lib/graph/memory-graph-engine";
import type { ChatMessage, GenerativeArtifact } from "../src/lib/types";

describe("Memory Graph Fullstack Integration", () => {
  const sampleGraph = synthesizeMemoryGraph("Distributed Knowledge Federation");
  const sampleArtifact: GenerativeArtifact = {
    type: "memory_graph",
    data: sampleGraph,
  };

  describe("ArtifactStage.tsx Memory Graph Rendering & CSV Export", () => {
    it("renders ArtifactStage preview with MemoryGraphCard for memory_graph artifacts", () => {
      const html = renderToStaticMarkup(
        React.createElement(ArtifactStage, {
          artifact: sampleArtifact,
          onClose: () => {},
        }),
      );

      expect(html).toContain("Distributed Knowledge Federation");
      expect(html).toContain("Graph RAG Memory Studio");
      expect(html).toContain("Download CSV");
      expect(html).toContain('role="graphics-document"');
    });

    it("renders print dossier section for memory_graph artifacts", () => {
      const html = renderToStaticMarkup(
        React.createElement(ArtifactStage, {
          artifact: sampleArtifact,
          onClose: () => {},
        }),
      );

      expect(html).toContain("Density:");
      expect(html).toContain("Semantic Entities &amp; Centrality Hierarchy");
      expect(html).toContain("Directed Semantic Relations");
    });
  });

  describe("Spatial Intelligence Canvas Extraction & Edge Computation", () => {
    const mockMessages: ChatMessage[] = [
      {
        id: "msg-kg-1",
        role: "assistant",
        content: "Here is the architectural knowledge graph.",
        timestamp: "2026-10-29T21:00:00Z",
        artifact: sampleArtifact,
      },
      {
        id: "msg-res-1",
        role: "assistant",
        content: "Here is the underlying research report.",
        timestamp: "2026-10-29T21:01:00Z",
        artifact: {
          type: "research",
          data: {
            title: "Federated Knowledge Architectures",
            executiveSummary: "Summary of decentralized ontology graphs.",
            keyFindings: [
              {
                point: "Entity resolution scale",
                description: "Scalable entity linking",
                confidence: "high",
                citationIds: [],
              },
            ],
            recommendation:
              "Implement distributed Graph RAG with sovereign Ollama fallback.",
            sources: [],
          },
        },
      },
    ];

    it("extracts spatial canvas node with memory_graph artifactType, metrics, and tags", () => {
      const nodes = extractSpatialNodes(mockMessages);
      const kgNode = nodes.find((n) => n.artifactType === "memory_graph");

      expect(kgNode).toBeDefined();
      expect(kgNode?.title).toBe("Distributed Knowledge Federation");
      expect(kgNode?.tags).toContain("GRAPH_RAG");
      expect(kgNode?.tags).toContain("MEMORY_GRAPH");
      expect(kgNode?.metrics?.status).toBe("indexed");
      expect(kgNode?.metrics?.itemCount).toBe(sampleGraph.nodes.length);
      expect(kgNode?.metrics?.evidenceCount).toBe(sampleGraph.edges.length);
    });

    it("computes deterministic topological edges between memory_graph and related research node", () => {
      const nodes = extractSpatialNodes(mockMessages);
      const edges = computeSpatialEdges(nodes);

      const kgEdge = edges.find(
        (e) =>
          (e.sourceId === nodes[0].id && e.targetId === nodes[1].id) ||
          (e.sourceId === nodes[1].id && e.targetId === nodes[0].id),
      );

      expect(kgEdge).toBeDefined();
      expect(kgEdge?.relationType).toBe("synthesizes");
      expect(kgEdge?.label).toBe("Graph RAG Associative Indexing");
      expect(kgEdge?.strength).toBeGreaterThan(0.5);
    });
  });

  describe("Print Dossier & HTML Dossier Formatters", () => {
    it("resolves print dossier metadata for memory_graph", () => {
      const meta = getArtifactMetadata(
        sampleArtifact,
        undefined,
        "gemini-2.0-flash",
      );
      expect(meta.title).toBe("Distributed Knowledge Federation");
      expect(meta.modeName).toBe("Graph RAG Memory Studio");
    });

    it("resolves HTML dossier title for memory_graph", () => {
      const title = resolveDossierTitle(sampleArtifact, null);
      expect(title).toBe("Distributed Knowledge Federation");
    });

    it("formats markdown export for memory_graph artifacts in session export", () => {
      const md = formatArtifactMarkdown(sampleArtifact);
      expect(md).toContain(
        "#### 🕸️ Memory & Knowledge Graph: Distributed Knowledge Federation",
      );
      expect(md).toContain("*Graph Density:*");
      expect(md).toContain("**Semantic Entities (");
      expect(md).toContain("**Directed Relations (");
    });
  });
});
