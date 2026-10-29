import { describe, expect, it } from "bun:test";
import type { GenerativeArtifact, Session } from "../src/lib/types";
import { synthesizeGameTheory } from "../src/lib/gametheory/game-theory-engine";
import {
  extractSpatialNodes,
  computeSpatialEdges,
} from "../src/lib/canvas/spatial-canvas";
import { generateStandaloneHtmlDossier } from "../src/lib/html-dossier";
import { getArtifactMetadata } from "../src/lib/print-dossier";
import { exportSessionAsMarkdown } from "../src/lib/session-export";

describe("Autonomous Game Theory & Strategic Mechanism Design Fullstack Integration", () => {
  it("packages synthesized game theory artifact into a valid GenerativeArtifact union", () => {
    const gameArtifact = synthesizeGameTheory(
      "Decentralized Sequencer MEV Auction",
    );
    const genArtifact: GenerativeArtifact = {
      type: "game_theory",
      data: gameArtifact,
    };

    expect(genArtifact.type).toBe("game_theory");
    expect(genArtifact.data.summary.priceOfAnarchy).toBeGreaterThanOrEqual(1.0);
    expect(genArtifact.data.summary.gameClass).toBe("non_zero_sum");
    expect(genArtifact.data.payoffMatrix.length).toBe(4);
    expect(genArtifact.data.shapleyValues.length).toBe(3);
  });

  it("extracts spatial canvas node with game theory tags and metrics", () => {
    const gameArtifact = synthesizeGameTheory("Consensus Coordination Game");
    const session: Session = {
      id: "session-game-1",
      title: "Game Theory Coordination Session",
      messages: [
        {
          id: "msg-game-1",
          role: "assistant",
          content: "Nash equilibrium reached.",
          timestamp: new Date().toISOString(),
          artifact: {
            type: "game_theory",
            data: gameArtifact,
          },
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mode: "research",
    };

    const nodes = extractSpatialNodes(session.messages);
    expect(nodes.length).toBe(1);
    expect(nodes[0].artifactType).toBe("game_theory");
    expect(nodes[0].tags).toContain("GAME_THEORY");
    expect(nodes[0].tags).toContain("NASH_EQUILIBRIUM");
    expect(nodes[0].tags).toContain("SHAPLEY_VALUES");
    expect(nodes[0].metrics?.status).toBe("verified");
  });

  it("generates domain topological edges between game_theory and epistemic_consensus", () => {
    const gameArtifact = synthesizeGameTheory("Strategic Equilibrium");
    const session: Session = {
      id: "session-game-edges",
      title: "Game & Consensus Integration",
      messages: [
        {
          id: "msg-gt",
          role: "assistant",
          content: "Game Theory",
          timestamp: new Date().toISOString(),
          artifact: {
            type: "game_theory",
            data: gameArtifact,
          },
        },
        {
          id: "msg-ec",
          role: "assistant",
          content: "Consensus",
          timestamp: new Date().toISOString(),
          artifact: {
            type: "epistemic_consensus",
            data: {
              id: "ec-1",
              title: "Strategic Consensus",
              createdAt: new Date().toISOString(),
              summary: {
                deliberationTopic: "Strategic Consensus",
                totalAgents: 3,
                consensusIndexPct: 88,
                delphiRoundsCompleted: 3,
                shannonEntropyInitialBits: 1.5,
                shannonEntropyFinalBits: 0.3,
                entropyReductionPct: 80,
                surprisinglyCommonVerdict: "Synthesis",
                majorityVsBtsDivergence: false,
                verdictConfidenceGrade: "A",
                governanceModel: "Bayesian_Truth_Serum_Prelec",
              },
              agents: [],
              delphiRounds: [],
              quadraticAllocations: [],
              mathematicalProofNotes: "BTS Proof",
              executiveSummary: "Consensus reached",
            },
          },
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mode: "research",
    };

    const nodes = extractSpatialNodes(session.messages);
    const edges = computeSpatialEdges(nodes);

    expect(edges.length).toBeGreaterThan(0);
    const edge = edges.find(
      (e) =>
        (e.sourceId === "node-msg-gt" && e.targetId === "node-msg-ec") ||
        (e.sourceId === "node-msg-ec" && e.targetId === "node-msg-gt"),
    );
    expect(edge).toBeDefined();
    expect(edge?.relationType).toBe("validates");
    expect(edge?.label).toBe("Bayesian Truth Serum Mechanism Stability");
  });

  it("generates complete standalone HTML dossier with game theory section", () => {
    const gameArtifact = synthesizeGameTheory(
      "Cross-Chain Atomic Settlement Game",
    );
    const genArtifact: GenerativeArtifact = {
      type: "game_theory",
      data: gameArtifact,
    };

    const html = generateStandaloneHtmlDossier(genArtifact);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("STRATEGIC GAME THEORY &amp; MECHANISM DESIGN");
    expect(html).toContain("Game-Theoretic Strategic Equilibrium");
    expect(html).toContain("Strategy Payoff Matrix");
    expect(html).toContain("Cooperative Shapley Value Attribution");
    expect(html).toContain("Strategic Mechanism Recommendation");
  });

  it("resolves print dossier metadata correctly", () => {
    const gameArtifact = synthesizeGameTheory(
      "Public Goods Coordination Mechanism",
    );
    const genArtifact: GenerativeArtifact = {
      type: "game_theory",
      data: gameArtifact,
    };

    const metadata = getArtifactMetadata(genArtifact);
    expect(metadata.title).toContain("Public Goods Coordination");
    expect(metadata.modeName).toBe("Strategic Mechanism Design Studio");
  });

  it("exports session markdown with game theory sections and Shapley attribution", () => {
    const gameArtifact = synthesizeGameTheory("Staking Slashing Game");
    const session: Session = {
      id: "session-export-gt",
      title: "Staking Slashing Session",
      messages: [
        {
          id: "msg-gt-export",
          role: "assistant",
          content: "Strategic mechanism computed.",
          timestamp: new Date().toISOString(),
          artifact: {
            type: "game_theory",
            data: gameArtifact,
          },
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mode: "research",
    };

    const md = exportSessionAsMarkdown(session);
    expect(md).toContain("#### 🎮 Game-Theoretic Strategic Equilibrium");
    expect(md).toContain("Price of Anarchy (PoA)");
    expect(md).toContain("Strategy Payoff Matrix");
    expect(md).toContain("Cooperative Shapley Value Attribution");
    expect(md).toContain("Strategic Recommendation:");
  });
});
