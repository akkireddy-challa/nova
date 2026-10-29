import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { EpistemicConsensusCard } from "../src/components/GenerativeCards/EpistemicConsensusCard";
import { synthesizeEpistemicConsensus } from "../src/lib/consensus/consensus-engine";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("EpistemicConsensusCard Generative UI Component", () => {
  it("renders consensus title, index badge, and confidence grade", () => {
    const artifact = synthesizeEpistemicConsensus(
      "Byzantine Invariant Architecture",
    );
    const html = renderToString(
      React.createElement(EpistemicConsensusCard, { artifact }),
    );

    expect(html).toContain("Bayesian Truth Serum Consensus");
    expect(html).toContain("Consensus:");
    expect(html).toContain("Grade");
    expect(html).toContain("A+");
    expect(html).toContain("Entropy Reduction");
  });

  it("renders SVG graphics-document BTS belief distribution canvas", () => {
    const artifact = synthesizeEpistemicConsensus(
      "Byzantine Invariant Architecture",
    );
    const html = renderToString(
      React.createElement(EpistemicConsensusCard, { artifact }),
    );

    expect(html).toContain('role="graphics-document"');
    expect(html).toContain("Surprisingly Common");
    expect(html).toContain("Personal Endorsement Probability");
    expect(html).toContain("Predicted Crowd Mean");
  });

  it("renders tab triggers for agents, Delphi rounds, and quadratic governance", () => {
    const artifact = synthesizeEpistemicConsensus(
      "Byzantine Invariant Architecture",
    );
    const html = renderToString(
      React.createElement(EpistemicConsensusCard, { artifact }),
    );

    expect(html).toContain("Agent Endorsements");
    expect(html).toContain("Delphi Rounds");
    expect(html).toContain("Quadratic Governance");
    expect(html).toContain("Prelec BTS Proof");
  });

  it("renders initial selected agent details in the inspection drawer", () => {
    const artifact = synthesizeEpistemicConsensus(
      "Byzantine Invariant Architecture",
    );
    const html = renderToString(
      React.createElement(EpistemicConsensusCard, { artifact }),
    );

    expect(html).toContain("Chief System Architect");
    expect(html).toContain("Distributed Systems &amp; Invariants");
    expect(html).toContain("Prelec Information Score");
    expect(html).toContain("Truthful Bayesian Nash Equilibrium");
  });

  it("strictly enforces ZERO Math.random() in EpistemicConsensusCard source", () => {
    const filePath = join(
      process.cwd(),
      "src/components/GenerativeCards/EpistemicConsensusCard.tsx",
    );
    const content = readFileSync(filePath, "utf-8");
    expect(content).not.toContain("Math.random");
  });
});
