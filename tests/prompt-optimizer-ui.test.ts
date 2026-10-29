import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PromptOptimizerCard } from "../src/components/GenerativeCards/PromptOptimizerCard";
import { synthesizePromptOptimization } from "../src/lib/optimization/prompt-optimizer";

describe("PromptOptimizerCard Generative UI Component", () => {
  const artifact = synthesizePromptOptimization(
    "Cross-Shard Distributed Consensus Validation",
    "Analyze Raft vs Paxos edge case failovers.",
    "gemini-2.5-pro",
  );

  it("renders target task, base model badge, and net score gain in the header", () => {
    const html = renderToStaticMarkup(
      React.createElement(PromptOptimizerCard, { artifact }),
    );

    expect(html).toContain("Cross-Shard Distributed Consensus Validation");
    expect(html).toContain("gemini-2.5-pro");
    expect(html).toContain(`+${artifact.summary.netScoreGainPct}% Eval Score`);
  });

  it("renders 4-metric scorecard row with baseline vs optimized statistics", () => {
    const html = renderToStaticMarkup(
      React.createElement(PromptOptimizerCard, { artifact }),
    );

    expect(html).toContain("Eval Accuracy");
    expect(html).toContain(`${artifact.summary.optimizedScore.toFixed(1)}%`);
    expect(html).toContain("Token Footprint");
    expect(html).toContain(`${artifact.summary.optimizedTokens}`);
    expect(html).toContain("Pareto Frontier");
    expect(html).toContain(`${artifact.summary.paretoEfficientCount}`);
    expect(html).toContain("Cost Efficiency");
    expect(html).toContain(`${artifact.summary.estimatedCostSavingsPct}%`);
  });

  it("renders action buttons for Metaprompt, Report, and CSV download", () => {
    const html = renderToStaticMarkup(
      React.createElement(PromptOptimizerCard, { artifact }),
    );

    expect(html).toContain("Metaprompt");
    expect(html).toContain("Report");
    expect(html).toContain("CSV");
  });

  it("renders candidate pills with technique badges and token indicators", () => {
    const html = renderToStaticMarkup(
      React.createElement(PromptOptimizerCard, { artifact }),
    );

    expect(html).toContain("DSPy Pareto-Optimal Hybrid");
    expect(html).toContain("DSPy Few-Shot Bootstrap");
    expect(html).toContain("Chain-of-Thought Anchor");
    expect(html).toContain("SYSTEM INSTRUCTION:");
  });

  it("strictly enforces ZERO Math.random() in PromptOptimizerCard source", () => {
    const filePath = resolve(
      import.meta.dir,
      "../src/components/GenerativeCards/PromptOptimizerCard.tsx",
    );
    const content = readFileSync(filePath, "utf-8");
    expect(content).not.toContain("Math.random()");
  });
});
