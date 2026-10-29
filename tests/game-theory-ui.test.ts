import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { GameTheoryCard } from "../src/components/GenerativeCards/GameTheoryCard";
import { synthesizeGameTheory } from "../src/lib/gametheory/game-theory-engine";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("GameTheoryCard Generative UI Component", () => {
  it("renders game title, Pure Nash badge, and Price of Anarchy metric", () => {
    const artifact = synthesizeGameTheory(
      "Consensus Validator Staking Mechanism",
    );
    const html = renderToString(
      React.createElement(GameTheoryCard, { artifact }),
    );

    expect(html).toContain("Game-Theoretic Strategic Equilibrium");
    expect(html).toContain("Pure Nash:");
    expect(html).toContain("PoA:");
    expect(html).toContain("Price of Anarchy (PoA)");
    expect(html).toContain("Price of Stability (PoS)");
  });

  it("renders SVG graphics-document payoff matrix canvas", () => {
    const artifact = synthesizeGameTheory(
      "Consensus Validator Staking Mechanism",
    );
    const html = renderToString(
      React.createElement(GameTheoryCard, { artifact }),
    );

    expect(html).toContain('role="graphics-document"');
    expect(html).toContain('aria-label="Payoff Matrix Heatmap Canvas"');
    expect(html).toContain("NASH");
    expect(html).toContain("PARETO OPT");
  });

  it("renders tab triggers for matrix, Nash equilibria, Shapley values, IESDS, and mechanism design", () => {
    const artifact = synthesizeGameTheory(
      "Consensus Validator Staking Mechanism",
    );
    const html = renderToString(
      React.createElement(GameTheoryCard, { artifact }),
    );

    expect(html).toContain("Payoff Matrix Heatmap");
    expect(html).toContain("Nash Equilibria");
    expect(html).toContain("Cooperative Shapley Values");
    expect(html).toContain("IESDS Elimination Trace");
    expect(html).toContain("Strategic Mechanism Design");
  });

  it("renders initial selected cell inspection details", () => {
    const artifact = synthesizeGameTheory(
      "Consensus Validator Staking Mechanism",
    );
    const html = renderToString(
      React.createElement(GameTheoryCard, { artifact }),
    );

    expect(html).toContain("Strategy Cell Inspection");
    expect(html).toContain("Profile Coordinates");
    expect(html).toContain("Player 1 Payoff");
    expect(html).toContain("Player 2 Payoff");
    expect(html).toContain("Aggregate Social Welfare");
  });

  it("strictly enforces ZERO Math.random() in GameTheoryCard source", () => {
    const filePath = join(
      process.cwd(),
      "src/components/GenerativeCards/GameTheoryCard.tsx",
    );
    const content = readFileSync(filePath, "utf-8");
    expect(content).not.toContain("Math.random");
  });
});
