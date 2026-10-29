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
import { synthesizeVectorSpace } from "../src/lib/vector/vector-space-engine";
import type { ChatMessage, GenerativeArtifact } from "../src/lib/types";

describe("Vector Space Fullstack Integration", () => {
  const sampleVectorSpace = synthesizeVectorSpace(
    "Database Architecture Embeddings",
    "Consensus invariants and write amplification",
  );
  const sampleArtifact: GenerativeArtifact = {
    type: "vector_space",
    data: sampleVectorSpace,
  };

  describe("ArtifactStage.tsx Vector Space Rendering & CSV Export", () => {
    it("renders ArtifactStage preview with VectorSpaceCard for vector_space artifacts", () => {
      const html = renderToStaticMarkup(
        React.createElement(ArtifactStage, {
          artifact: sampleArtifact,
          onClose: () => {},
        }),
      );

      expect(html).toContain("Database Architecture Embeddings");
      expect(html).toContain("3072d → 2D PCA");
      expect(html).toContain("Download CSV");
      expect(html).toContain('role="graphics-document"');
      expect(html).toContain("Distributed Consensus &amp; Raft");
    });

    it("renders print dossier section for vector_space artifacts", () => {
      const html = renderToStaticMarkup(
        React.createElement(ArtifactStage, {
          artifact: sampleArtifact,
          onClose: () => {},
        }),
      );

      expect(html).toContain("Dataset: Database Architecture Embeddings");
      expect(html).toContain("Semantic Clusters");
      expect(html).toContain("Vector Space &amp; Clustering Studio");
    });
  });

  describe("Spatial Intelligence Canvas Extraction & Edge Computation", () => {
    const mockMessages: ChatMessage[] = [
      {
        id: "msg-vs-1",
        role: "assistant",
        content: "Here is the vector space projection.",
        timestamp: "2026-10-29T21:00:00Z",
        artifact: sampleArtifact,
      },
    ];

    it("extracts spatial canvas node with proper metrics and tags for vector_space", () => {
      const nodes = extractSpatialNodes(mockMessages);
      expect(nodes.length).toBe(1);

      const node = nodes[0];
      expect(node.artifactType).toBe("vector_space");
      expect(node.title).toBe("Database Architecture Embeddings");
      expect(node.tags).toContain("VECTOR_SPACE");
      expect(node.tags).toContain("EMBEDDINGS");
      expect(node.metrics?.status).toBe("indexed");
      expect(node.metrics?.itemCount).toBe(sampleVectorSpace.points.length);
      expect(node.metrics?.evidenceCount).toBe(
        sampleVectorSpace.clusters.length,
      );
      expect(node.metrics?.score).toBe(
        Math.round(sampleVectorSpace.summary.silhouetteScore * 100),
      );
    });

    it("computes domain edges between vector_space and memory_graph nodes", () => {
      const combinedMessages: ChatMessage[] = [
        ...mockMessages,
        {
          id: "msg-kg-1",
          role: "assistant",
          content: "Memory graph results.",
          timestamp: "2026-10-29T21:05:00Z",
          artifact: {
            type: "memory_graph",
            data: {
              id: "mg-01",
              topic: "RAG Memory Graph",
              nodes: [],
              edges: [],
              summary: {
                totalNodes: 10,
                totalEdges: 15,
                density: 0.25,
                averageDegree: 3,
                dominantEntityType: "technology",
                mostCentralNode: "Raft",
              },
              executiveSummary: "Summary",
              generatedAt: "2026-10-29T21:05:00Z",
            },
          },
        },
      ];

      const nodes = extractSpatialNodes(combinedMessages);
      expect(nodes.length).toBe(2);

      const edges = computeSpatialEdges(nodes);
      expect(edges.length).toBe(1);
      expect(edges[0].relationType).toBe("validates");
      expect(edges[0].label).toBe("Embedding Topology Alignment");
    });
  });

  describe("HTML & Print Dossier Resolvers", () => {
    it("resolves dossier title correctly for vector_space", () => {
      const title = resolveDossierTitle(sampleArtifact, null);
      expect(title).toBe("Database Architecture Embeddings");
    });

    it("resolves print dossier metadata correctly for vector_space", () => {
      const metadata = getArtifactMetadata(
        sampleArtifact,
        "intelligence",
        "gemini-2.5-pro",
      );
      expect(metadata.title).toBe("Database Architecture Embeddings");
      expect(metadata.modeName).toBe("Intelligence Memory");
    });
  });

  describe("Session Export Markdown Formatter", () => {
    it("formats vector_space markdown artifact cleanly with clusters summary", () => {
      const md = formatArtifactMarkdown(sampleArtifact);
      expect(md).toContain(
        "#### 🧭 Vector Space Studio: Database Architecture Embeddings",
      );
      expect(md).toContain("*Method:* **3072d → 2D PCA**");
      expect(md).toContain("Semantic Clusters");
      expect(md).toContain("Distributed Consensus & Raft");
    });
  });
});
