import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  computeClusterCentroid,
  computeSilhouetteScore,
  cosineDistance,
  cosineSimilarity,
  dotProduct,
  euclideanDistance2D,
  synthesizeVectorSpace,
  vectorMagnitude,
  vectorSpaceToCsv,
  vectorSpaceToMarkdown,
} from "../src/lib/vector/vector-space-engine";
import type { VectorCluster, VectorEmbeddingPoint } from "../src/lib/types";

describe("Autonomous Vector Space & Semantic Cluster Engine", () => {
  describe("Mathematical Primitives", () => {
    it("computes accurate dot products", () => {
      expect(dotProduct([1, 2, 3], [4, 5, 6])).toBe(32);
      expect(dotProduct([1, 0], [0, 1])).toBe(0);
      expect(dotProduct([], [])).toBe(0);
    });

    it("computes accurate vector magnitude", () => {
      expect(vectorMagnitude([3, 4])).toBe(5);
      expect(vectorMagnitude([0, 0, 0])).toBe(0);
      expect(vectorMagnitude([1, 1, 1, 1])).toBe(2);
    });

    it("computes cosine similarity and distance deterministically", () => {
      const v1 = [1, 0, 0];
      const v2 = [1, 0, 0];
      const v3 = [0, 1, 0];
      const v4 = [-1, 0, 0];

      expect(cosineSimilarity(v1, v2)).toBe(1.0);
      expect(cosineDistance(v1, v2)).toBe(0.0);

      expect(cosineSimilarity(v1, v3)).toBe(0.0);
      expect(cosineDistance(v1, v3)).toBe(1.0);

      expect(cosineSimilarity(v1, v4)).toBe(-1.0);
      expect(cosineDistance(v1, v4)).toBe(2.0);

      // Zero magnitude guard
      expect(cosineSimilarity([0, 0], [1, 2])).toBe(0);
    });

    it("computes 2D Euclidean distance", () => {
      expect(euclideanDistance2D({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
      expect(euclideanDistance2D({ x: 1, y: 1 }, { x: 1, y: 1 })).toBe(0);
    });
  });

  describe("Clustering & Silhouette Analysis", () => {
    it("computes cluster centroid and max radius", () => {
      const points: VectorEmbeddingPoint[] = [
        {
          id: "p1",
          label: "P1",
          chunkText: "T1",
          tokenCount: 10,
          x: 0.0,
          y: 0.0,
          clusterId: 0,
          clusterLabel: "C0",
          cosineDistanceToQuery: 0.2,
          isOutlier: false,
        },
        {
          id: "p2",
          label: "P2",
          chunkText: "T2",
          tokenCount: 15,
          x: 2.0,
          y: 0.0,
          clusterId: 0,
          clusterLabel: "C0",
          cosineDistanceToQuery: 0.3,
          isOutlier: false,
        },
      ];

      const { centroidX, centroidY, radius } = computeClusterCentroid(points);
      expect(centroidX).toBe(1.0);
      expect(centroidY).toBe(0.0);
      expect(radius).toBe(1.0);
    });

    it("computes silhouette score for well-separated clusters", () => {
      const points: VectorEmbeddingPoint[] = [
        {
          id: "p1",
          label: "P1",
          chunkText: "T1",
          tokenCount: 10,
          x: -1.0,
          y: 0.0,
          clusterId: 0,
          clusterLabel: "C0",
          cosineDistanceToQuery: 0.2,
          isOutlier: false,
        },
        {
          id: "p2",
          label: "P2",
          chunkText: "T2",
          tokenCount: 10,
          x: -0.9,
          y: 0.1,
          clusterId: 0,
          clusterLabel: "C0",
          cosineDistanceToQuery: 0.2,
          isOutlier: false,
        },
        {
          id: "p3",
          label: "P3",
          chunkText: "T3",
          tokenCount: 10,
          x: 1.0,
          y: 0.0,
          clusterId: 1,
          clusterLabel: "C1",
          cosineDistanceToQuery: 0.7,
          isOutlier: false,
        },
        {
          id: "p4",
          label: "P4",
          chunkText: "T4",
          tokenCount: 10,
          x: 0.9,
          y: -0.1,
          clusterId: 1,
          clusterLabel: "C1",
          cosineDistanceToQuery: 0.7,
          isOutlier: false,
        },
      ];

      const clusters: VectorCluster[] = [
        {
          id: 0,
          label: "C0",
          color: "#fff",
          centroidX: -0.95,
          centroidY: 0.05,
          pointCount: 2,
          averageTokenCount: 10,
          radius: 0.1,
          topKeywords: ["k1"],
        },
        {
          id: 1,
          label: "C1",
          color: "#000",
          centroidX: 0.95,
          centroidY: -0.05,
          pointCount: 2,
          averageTokenCount: 10,
          radius: 0.1,
          topKeywords: ["k2"],
        },
      ];

      const score = computeSilhouetteScore(points, clusters);
      expect(score).toBeGreaterThan(0.7); // Strongly distinct clusters
    });
  });

  describe("synthesizeVectorSpace", () => {
    it("synthesizes valid VectorSpaceArtifact with pure mathematical determinism", () => {
      const artifact = synthesizeVectorSpace(
        "Financial Analytics Embeddings",
        "Treasury yield curve inversions",
        1536,
        "pca",
      );

      expect(artifact.datasetTitle).toBe("Financial Analytics Embeddings");
      expect(artifact.targetQuery).toBe("Treasury yield curve inversions");
      expect(artifact.summary.embeddingDimension).toBe(1536);
      expect(artifact.summary.reductionMethod).toBe("pca");
      expect(artifact.clusters.length).toBe(4);
      expect(artifact.points.length).toBe(15);
      expect(artifact.summary.outlierCount).toBeGreaterThanOrEqual(1);
      expect(artifact.summary.silhouetteScore).toBeGreaterThan(0.4);
      expect(artifact.executiveSummary).toContain("Silhouette Score");
    });
  });

  describe("RFC 4180 CSV & Markdown Exports", () => {
    it("exports vector space to RFC 4180 compliant CSV with CRLF line endings", () => {
      const artifact = synthesizeVectorSpace("Database RAG Store");
      const csv = vectorSpaceToCsv(artifact);

      expect(csv).toContain("\r\n");
      expect(csv).toContain('"# Nova Vector Space Studio"');
      expect(csv).toContain('"Cluster ID"');
      expect(csv).toContain('"Vector ID"');
      expect(csv).toContain('"Distributed Consensus & Raft"');
    });

    it("exports vector space to comprehensive Markdown report", () => {
      const artifact = synthesizeVectorSpace("Database RAG Store");
      const md = vectorSpaceToMarkdown(artifact);

      expect(md).toContain("# Nova Vector Space Studio: Database RAG Store");
      expect(md).toContain("## Executive Vector Space Summary");
      expect(md).toContain("## Semantic Clusters");
      expect(md).toContain("## Indexed Vector Embeddings");
    });
  });

  describe("Strict Zero Pseudo-Randomness Verification", () => {
    it("strictly verifies ZERO Math.random() in vector-space-engine.ts", () => {
      const filePath = resolve(
        import.meta.dir,
        "../src/lib/vector/vector-space-engine.ts",
      );
      const fileContent = readFileSync(filePath, "utf-8");
      expect(fileContent).not.toContain("Math.random()");
    });
  });
});
