import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VectorSpaceCard } from "../src/components/GenerativeCards/VectorSpaceCard";
import { synthesizeVectorSpace } from "../src/lib/vector/vector-space-engine";

describe("VectorSpaceCard Generative UI Component", () => {
  const artifact = synthesizeVectorSpace(
    "Vector RAG Knowledge Embeddings",
    "Consensus and replication invariants",
  );

  it("renders dataset title, dimension badge, and silhouette score in the header", () => {
    const html = renderToStaticMarkup(
      React.createElement(VectorSpaceCard, { artifact }),
    );

    expect(html).toContain("Vector RAG Knowledge Embeddings");
    expect(html).toContain("3072d → 2D PCA");
    expect(html).toContain(
      `Silhouette: ${artifact.summary.silhouetteScore.toFixed(2)}`,
    );
  });

  it("renders 4-metric scorecard row with accurate vector counts and variance ratio", () => {
    const html = renderToStaticMarkup(
      React.createElement(VectorSpaceCard, { artifact }),
    );

    expect(html).toContain("Indexed Vectors");
    expect(html).toContain(`${artifact.summary.totalVectors}`);
    expect(html).toContain("Silhouette Score");
    expect(html).toContain("Explained Variance");
    expect(html).toContain("Outlier Anomalies");
  });

  it("renders interactive SVG scatter plot canvas with graphics-document ARIA role", () => {
    const html = renderToStaticMarkup(
      React.createElement(VectorSpaceCard, { artifact }),
    );

    expect(html).toContain('role="graphics-document"');
    expect(html).toContain('viewBox="0 0 500 500"');
    expect(html).toContain("Distributed Consensus &amp; Raft");
  });

  it("renders action buttons for Markdown report copy and CSV download", () => {
    const html = renderToStaticMarkup(
      React.createElement(VectorSpaceCard, { artifact }),
    );

    expect(html).toContain("Report");
    expect(html).toContain("CSV");
  });

  it("strictly enforces ZERO Math.random() in VectorSpaceCard source", () => {
    const filePath = resolve(
      import.meta.dir,
      "../src/components/GenerativeCards/VectorSpaceCard.tsx",
    );
    const content = readFileSync(filePath, "utf-8");
    expect(content).not.toContain("Math.random()");
  });
});
