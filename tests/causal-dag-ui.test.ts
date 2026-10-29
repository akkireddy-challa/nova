import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CausalDagCard } from "../src/components/GenerativeCards/CausalDagCard";
import { synthesizeCausalDag } from "../src/lib/causal/causal-dag-engine";

describe("CausalDagCard Generative UI Component", () => {
  const artifact = synthesizeCausalDag(
    "Does connection pooling directly decrease tail latency under load?",
    "Connection Multiplexing",
    "P99 Tail Latency",
  );

  it("renders hypothesis, backdoor criterion status, and identifiability badge in the header", () => {
    const html = renderToStaticMarkup(
      React.createElement(CausalDagCard, { artifact }),
    );

    expect(html).toContain(
      "Does connection pooling directly decrease tail latency under load?",
    );
    expect(html).toContain("Backdoor Criterion: Satisfied");
    expect(html).toContain("IDENTIFIABLE");
  });

  it("renders 4-metric scorecard row with ATE, E-Value, and Relative Risk Ratio", () => {
    const html = renderToStaticMarkup(
      React.createElement(CausalDagCard, { artifact }),
    );

    expect(html).toContain("Average Treatment Effect");
    expect(html).toContain(`${artifact.summary.averageTreatmentEffect}`);
    expect(html).toContain("E-Value Robustness");
    expect(html).toContain(`${artifact.summary.eValue.toFixed(2)}`);
    expect(html).toContain("Relative Risk Ratio");
    expect(html).toContain("Identifiability");
  });

  it("renders interactive SVG DAG canvas with graphics-document ARIA role", () => {
    const html = renderToStaticMarkup(
      React.createElement(CausalDagCard, { artifact }),
    );

    expect(html).toContain('role="graphics-document"');
    expect(html).toContain('viewBox="0 0 500 480"');
    expect(html).toContain("Connection Multiplexing");
    expect(html).toContain("P99 Tail Latency");
  });

  it("renders action buttons for Markdown report copy and CSV download", () => {
    const html = renderToStaticMarkup(
      React.createElement(CausalDagCard, { artifact }),
    );

    expect(html).toContain("Report");
    expect(html).toContain("CSV");
  });

  it("strictly enforces ZERO Math.random() in CausalDagCard source", () => {
    const filePath = resolve(
      import.meta.dir,
      "../src/components/GenerativeCards/CausalDagCard.tsx",
    );
    const content = readFileSync(filePath, "utf-8");
    expect(content).not.toContain("Math.random()");
  });
});
