import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "fs";
import { join } from "path";
import { BayesianOptCard } from "../src/components/GenerativeCards/BayesianOptCard";
import { synthesizeBayesianOptimization } from "../src/lib/optimization/bayesian-opt-engine";

describe("BayesianOptCard Generative UI Component", () => {
  const sampleArtifact = synthesizeBayesianOptimization(
    "vLLM Speculative Decoding Optimization",
    "Throughput (tokens/s)",
    "draft_tokens",
  );

  it("renders title, target model, and objective in header", () => {
    const html = renderToStaticMarkup(
      React.createElement(BayesianOptCard, { artifact: sampleArtifact }),
    );

    expect(html).toContain("vLLM Speculative Decoding Optimization");
    expect(html).toContain("DeepSeek-R1-Distill-70B");
    expect(html).toContain("Bayesian Optimization");
  });

  it("renders 4-metric scorecard row with Peak Objective and Acquisition Peak", () => {
    const html = renderToStaticMarkup(
      React.createElement(BayesianOptCard, { artifact: sampleArtifact }),
    );

    expect(html).toContain("Peak Objective");
    expect(html).toContain("Acquisition Peak");
    expect(html).toContain("Evaluated Trials");
    expect(html).toContain("Tuned Dimensions");
    expect(html).toContain(`${sampleArtifact.summary.bestObjectiveValue}`);
  });

  it("renders interactive SVG response surface canvas with graphics-document ARIA role", () => {
    const html = renderToStaticMarkup(
      React.createElement(BayesianOptCard, { artifact: sampleArtifact }),
    );

    expect(html).toContain('role="graphics-document"');
    expect(html).toContain("Bayesian Gaussian Process Response Surface");
    expect(html).toContain("GP Mean μ(x)");
    expect(html).toContain("95% Credible Interval");
  });

  it("renders action buttons for YAML config, report copy, and CSV download", () => {
    const html = renderToStaticMarkup(
      React.createElement(BayesianOptCard, { artifact: sampleArtifact }),
    );

    expect(html).toContain("YAML");
    expect(html).toContain("Report");
    expect(html).toContain("CSV");
    expect(html).toContain("Surrogate Response Surface");
    expect(html).toContain("Hyperparameter Space");
  });

  it("strictly enforces ZERO Math.random() in BayesianOptCard source", () => {
    const filePath = join(
      process.cwd(),
      "src/components/GenerativeCards/BayesianOptCard.tsx",
    );
    const source = readFileSync(filePath, "utf-8");
    expect(source).not.toContain("Math.random()");
  });
});
