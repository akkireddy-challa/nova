import { describe, it, expect } from "bun:test";
import React from "react";
import ReactDOMServer from "react-dom/server";
import fs from "fs";
import path from "path";
import { ParetoFrontierCard } from "@/components/GenerativeCards/ParetoFrontierCard";
import { synthesizeParetoFrontier } from "@/lib/research/pareto-optimizer";

describe("ParetoFrontierCard Generative UI Component", () => {
  const sampleArtifact = synthesizeParetoFrontier(
    "High-Throughput Financial Analysis Engine",
  );

  it("renders topic title, status badges, and frontier summary", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(ParetoFrontierCard, { artifact: sampleArtifact }),
    );

    expect(html).toContain("High-Throughput Financial Analysis Engine");
    expect(html).toContain("Pareto Trade-Off Optimizer");
    expect(html).toContain("Optimal");
    expect(html).toContain(
      "High-Throughput Enterprise Intelligence &amp; Synthesis",
    );
  });

  it("renders 2D trade-off scatter plot with SVG canvas and axis labels", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(ParetoFrontierCard, { artifact: sampleArtifact }),
    );

    expect(html).toContain("<svg");
    expect(html).toContain("Latency (ms)");
    expect(html).toContain("Quality Score (0-100)");
    expect(html).toContain("Frontier Curve");
  });

  it("renders view tabs for routing strategies and benchmark matrix", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(ParetoFrontierCard, { artifact: sampleArtifact }),
    );

    expect(html).toContain("Routing Strategies");
    expect(html).toContain("Benchmark Matrix");
  });

  it("renders action buttons for Markdown report copy and CSV export", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(ParetoFrontierCard, { artifact: sampleArtifact }),
    );

    expect(html).toContain('aria-label="Copy Markdown Report"');
    expect(html).toContain('aria-label="Download RFC 4180 CSV"');
  });

  it("strictly enforces ZERO pseudo-randomness in ParetoFrontierCard source", () => {
    const filePath = path.join(
      process.cwd(),
      "src/components/GenerativeCards/ParetoFrontierCard.tsx",
    );
    const source = fs.readFileSync(filePath, "utf-8");
    expect(source).not.toContain("Math.random");
  });
});
