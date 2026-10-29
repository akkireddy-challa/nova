import { describe, it, expect } from "bun:test";
import React from "react";
import ReactDOMServer from "react-dom/server";
import fs from "fs";
import path from "path";
import { RegressionEvaluatorCard } from "@/components/GenerativeCards/RegressionEvaluatorCard";
import { synthesizeRegressionEvalSuite } from "@/lib/eval/regression-evaluator";

describe("RegressionEvaluatorCard Generative UI Component", () => {
  const sampleArtifact = synthesizeRegressionEvalSuite(
    "Automated Financial Safety & SSRF Audit",
  );

  it("renders topic title, target pipeline badge, and health grade", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(RegressionEvaluatorCard, {
        artifact: sampleArtifact,
      }),
    );

    expect(html).toContain("Automated Financial Safety &amp; SSRF Audit");
    expect(html).toContain("Dynamic Regression Evaluator");
    expect(html).toContain("Nova Autonomous Multi-Agent Pipeline v1.4");
    expect(html).toMatch(/A\+.*Grade/);
  });

  it("renders metric scorecard counters for pass rate, regressions, and latency", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(RegressionEvaluatorCard, {
        artifact: sampleArtifact,
      }),
    );

    expect(html).toContain("Pass Rate");
    expect(html).toMatch(/100.*%/);
    expect(html).toContain("Regressions");
    expect(html).toContain("Avg Latency");
    expect(html).toContain("Critical Risks");
  });

  it("renders category filter tabs for all scenario groups", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(RegressionEvaluatorCard, {
        artifact: sampleArtifact,
      }),
    );

    expect(html).toContain("All Scenarios");
    expect(html).toContain("Adversarial Injection");
    expect(html).toContain("Grounding Alignment");
    expect(html).toContain("Edge-Case Robustness");
    expect(html).toContain("Latency SLA");
  });

  it("renders individual scenario items with IDs, titles, and pass status badges", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(RegressionEvaluatorCard, {
        artifact: sampleArtifact,
      }),
    );

    expect(html).toContain("eval-adv-01");
    expect(html).toContain("System Prompt Extraction Isolation");
    expect(html).toContain("eval-adv-02");
    expect(html).toContain("SSRF Localhost &amp; Cloud Metadata Probe");
    expect(html).toContain("passed");
  });

  it("renders action buttons for Markdown report copy and CSV export", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(RegressionEvaluatorCard, {
        artifact: sampleArtifact,
      }),
    );

    expect(html).toContain('aria-label="Copy Markdown Report"');
    expect(html).toContain('aria-label="Download RFC 4180 CSV"');
  });

  it("strictly enforces ZERO pseudo-randomness in RegressionEvaluatorCard source", () => {
    const filePath = path.join(
      process.cwd(),
      "src/components/GenerativeCards/RegressionEvaluatorCard.tsx",
    );
    const source = fs.readFileSync(filePath, "utf-8");
    expect(source).not.toContain("Math.random");
  });
});
