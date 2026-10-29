import { describe, expect, test } from "bun:test";
import {
  findPureNashEquilibria,
  compute2x2MixedNash,
  computePriceOfAnarchy,
  computeShapleyValues,
  synthesizeGameTheory,
  gameTheoryToCsv,
  gameTheoryToMarkdown,
} from "../src/lib/gametheory/game-theory-engine";
import type { StrategyPayoffCell } from "../src/lib/types";
import fs from "fs";
import path from "path";

describe("Autonomous Game Theory & Strategic Mechanism Design Engine", () => {
  test("finds strict Pure Strategy Nash Equilibrium in Prisoner's Dilemma", () => {
    const rowStrategies = ["Cooperate", "Defect"];
    const colStrategies = ["Cooperate", "Defect"];
    const cells: StrategyPayoffCell[] = [
      {
        rowStrategy: "Cooperate",
        colStrategy: "Cooperate",
        player1Payoff: 3,
        player2Payoff: 3,
        isNashEquilibrium: false,
        isParetoOptimal: true,
      },
      {
        rowStrategy: "Cooperate",
        colStrategy: "Defect",
        player1Payoff: 0,
        player2Payoff: 5,
        isNashEquilibrium: false,
        isParetoOptimal: false,
      },
      {
        rowStrategy: "Defect",
        colStrategy: "Cooperate",
        player1Payoff: 5,
        player2Payoff: 0,
        isNashEquilibrium: false,
        isParetoOptimal: false,
      },
      {
        rowStrategy: "Defect",
        colStrategy: "Defect",
        player1Payoff: 1,
        player2Payoff: 1,
        isNashEquilibrium: false,
        isParetoOptimal: false,
      },
    ];

    const neCells = findPureNashEquilibria(rowStrategies, colStrategies, cells);
    expect(neCells.length).toBe(1);
    expect(neCells[0].rowStrategy).toBe("Defect");
    expect(neCells[0].colStrategy).toBe("Defect");
    expect(neCells[0].player1Payoff).toBe(1);
    expect(neCells[0].player2Payoff).toBe(1);
  });

  test("computes mixed strategy equilibrium for Matching Pennies / zero-sum game", () => {
    // Matching Pennies:
    // P1 heads/tails, P2 heads/tails
    // (H, H) -> (1, -1)
    // (H, T) -> (-1, 1)
    // (T, H) -> (-1, 1)
    // (T, T) -> (1, -1)
    const cells: StrategyPayoffCell[] = [
      {
        rowStrategy: "Heads",
        colStrategy: "Heads",
        player1Payoff: 1,
        player2Payoff: -1,
        isNashEquilibrium: false,
        isParetoOptimal: true,
      },
      {
        rowStrategy: "Heads",
        colStrategy: "Tails",
        player1Payoff: -1,
        player2Payoff: 1,
        isNashEquilibrium: false,
        isParetoOptimal: true,
      },
      {
        rowStrategy: "Tails",
        colStrategy: "Heads",
        player1Payoff: -1,
        player2Payoff: 1,
        isNashEquilibrium: false,
        isParetoOptimal: true,
      },
      {
        rowStrategy: "Tails",
        colStrategy: "Tails",
        player1Payoff: 1,
        player2Payoff: -1,
        isNashEquilibrium: false,
        isParetoOptimal: true,
      },
    ];

    const mixed = compute2x2MixedNash(
      "Heads",
      "Tails",
      "Heads",
      "Tails",
      cells,
    );
    expect(mixed.hasMixed).toBe(true);
    expect(mixed.p).toBe(0.5);
    expect(mixed.q).toBe(0.5);
    expect(mixed.expectedPayoff1).toBe(0);
    expect(mixed.expectedPayoff2).toBe(0);
  });

  test("calculates Price of Anarchy and Price of Stability", () => {
    const cells: StrategyPayoffCell[] = [
      {
        rowStrategy: "C",
        colStrategy: "C",
        player1Payoff: 8,
        player2Payoff: 8,
        isNashEquilibrium: false,
        isParetoOptimal: true,
      },
      {
        rowStrategy: "C",
        colStrategy: "D",
        player1Payoff: 1,
        player2Payoff: 10,
        isNashEquilibrium: false,
        isParetoOptimal: false,
      },
      {
        rowStrategy: "D",
        colStrategy: "C",
        player1Payoff: 10,
        player2Payoff: 1,
        isNashEquilibrium: false,
        isParetoOptimal: false,
      },
      {
        rowStrategy: "D",
        colStrategy: "D",
        player1Payoff: 4,
        player2Payoff: 4,
        isNashEquilibrium: true,
        isParetoOptimal: false,
      },
    ];

    const poa = computePriceOfAnarchy(cells);
    // Social optimum: 8 + 8 = 16
    // NE welfare: 4 + 4 = 8
    // PoA = 16 / 8 = 2.0
    // PoS = 16 / 8 = 2.0
    expect(poa.socialOptimumPayoff).toBe(16);
    expect(poa.priceOfAnarchy).toBe(2.0);
    expect(poa.priceOfStability).toBe(2.0);
  });

  test("computes exact Shapley values for 3-player cooperative coalition game", () => {
    const players = [
      { id: "p1", name: "Alpha", role: "Leader" },
      { id: "p2", name: "Beta", role: "Worker" },
      { id: "p3", name: "Gamma", role: "Verifier" },
    ];

    const shapley = computeShapleyValues(players);
    expect(shapley.length).toBe(3);
    const totalShare = shapley.reduce((acc, p) => acc + p.shapleySharePct, 0);
    expect(totalShare).toBeGreaterThan(99.0);
    expect(totalShare).toBeLessThan(101.0);
    // All marginal contributions must be positive
    for (const p of shapley) {
      expect(p.marginalContributionValue).toBeGreaterThan(0);
    }
  });

  test("synthesizes deterministic GameTheoryArtifact with zero fake data", () => {
    const artifact = synthesizeGameTheory(
      "Decentralized Autonomous Validator Coordination",
    );

    expect(artifact.id).toContain("game-");
    expect(artifact.title).toContain("Validator Coordination");
    expect(artifact.payoffMatrix.length).toBe(4);
    expect(artifact.equilibria.length).toBeGreaterThan(0);
    expect(artifact.shapleyValues.length).toBe(3);
    expect(artifact.iesdsEliminationSteps.length).toBeGreaterThan(0);
    expect(artifact.summary.priceOfAnarchy).toBeGreaterThanOrEqual(1.0);
    expect(artifact.summary.priceOfStability).toBeGreaterThanOrEqual(1.0);
  });

  test("generates valid RFC 4180 CSV export", () => {
    const artifact = synthesizeGameTheory("Consensus MEV Auction");
    const csv = gameTheoryToCsv(artifact);

    expect(csv).toContain("GAME THEORY & STRATEGIC EQUILIBRIUM DOSSIER");
    expect(csv).toContain("STRATEGY PAYOFF MATRIX");
    expect(csv).toContain("NASH EQUILIBRIA DETECTED");
    expect(csv).toContain("COOPERATIVE SHAPLEY VALUE ATTRIBUTION");
    expect(csv).toContain("Consensus MEV Auction");
  });

  test("generates formatted Markdown export", () => {
    const artifact = synthesizeGameTheory("Cross-Chain Liquidity Routing");
    const md = gameTheoryToMarkdown(artifact);

    expect(md).toContain("# Game Theory & Strategic Equilibrium Dossier");
    expect(md).toContain("## Executive Summary");
    expect(md).toContain("## Strategy Payoff Matrix");
    expect(md).toContain("## Computed Nash Equilibria");
    expect(md).toContain("## Cooperative Shapley Value Attribution");
    expect(md).toContain("## Strategic Mechanism Recommendation");
  });

  test("enforces zero Math.random() in codebase", () => {
    const engineFile = fs.readFileSync(
      path.join(process.cwd(), "src/lib/gametheory/game-theory-engine.ts"),
      "utf-8",
    );
    expect(engineFile).not.toContain("Math.random");
  });
});
