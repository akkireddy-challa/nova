import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryGraphCard } from "../src/components/GenerativeCards/MemoryGraphCard";
import { synthesizeMemoryGraph } from "../src/lib/graph/memory-graph-engine";

describe("MemoryGraphCard Generative UI Component", () => {
  const sampleArtifact = synthesizeMemoryGraph(
    "Distributed Consensus & Failover",
  );

  it("renders topic title, authority badge, and density chip in the header", () => {
    const html = renderToStaticMarkup(
      React.createElement(MemoryGraphCard, { artifact: sampleArtifact }),
    );

    expect(html).toContain("Distributed Consensus &amp; Failover");
    expect(html).toContain("Graph RAG Memory Studio");
    expect(html).toContain("Authority:");
    expect(html).toContain("Density:");
  });

  it("renders scorecard metric counters for entities, relations, density, and average degree", () => {
    const html = renderToStaticMarkup(
      React.createElement(MemoryGraphCard, { artifact: sampleArtifact }),
    );

    expect(html).toContain("Entities");
    expect(html).toContain("Relations");
    expect(html).toContain("Graph Density");
    expect(html).toContain("Avg Degree");
    expect(html).toContain("Dominant Type");
  });

  it("renders the interactive SVG canvas with role=graphics-document and node elements", () => {
    const html = renderToStaticMarkup(
      React.createElement(MemoryGraphCard, { artifact: sampleArtifact }),
    );

    expect(html).toContain('role="graphics-document"');
    expect(html).toContain("Knowledge Graph Visualizer");
    expect(html).toContain("<svg");
    expect(html).toContain("<circle");
    expect(html).toContain("<line");
    expect(html).toContain("arrow-default");
  });

  it("renders action buttons for Markdown report copy and CSV export", () => {
    const html = renderToStaticMarkup(
      React.createElement(MemoryGraphCard, { artifact: sampleArtifact }),
    );

    expect(html).toContain("Copy MD");
    expect(html).toContain("Export CSV");
  });

  it("renders the executive synthesis callout", () => {
    const html = renderToStaticMarkup(
      React.createElement(MemoryGraphCard, { artifact: sampleArtifact }),
    );

    expect(html).toContain("Executive Synthesis &amp; Grounding");
    expect(html).toContain("Central authority node identified as");
    expect(html).toContain("verified semantic entities");
  });

  it("strictly enforces ZERO pseudo-randomness in MemoryGraphCard source", () => {
    const filePath = join(
      process.cwd(),
      "src/components/GenerativeCards/MemoryGraphCard.tsx",
    );
    const source = readFileSync(filePath, "utf-8");

    expect(source).not.toContain("Math.random");
    expect(source).not.toContain("crypto.getRandomValues");
  });
});
