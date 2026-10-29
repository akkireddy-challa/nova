import { describe, expect, it } from "bun:test";
import {
  calculateShannonEntropy,
  calculateJensenShannonDivergence,
  computePrelecBtsScores,
  computeQuadraticVoting,
  synthesizeEpistemicConsensus,
  consensusToCsv,
  consensusToMarkdown,
} from "../src/lib/consensus/consensus-engine";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Autonomous Epistemic Consensus & Bayesian Truth Serum Engine", () => {
  describe("Information-Theoretic Primitives", () => {
    it("computes Shannon entropy in bits accurately", () => {
      // Deterministic distribution -> 0 entropy
      expect(calculateShannonEntropy([1, 0, 0])).toBe(0);

      // Uniform binary distribution -> 1.0 bit
      expect(calculateShannonEntropy([0.5, 0.5])).toBe(1.0);

      // Uniform ternary distribution -> log2(3) = 1.5850 bits
      expect(calculateShannonEntropy([1, 1, 1])).toBe(1.585);
    });

    it("computes Jensen-Shannon Divergence (JSD) bounded between 0 and 1", () => {
      // Identical distributions -> 0 JSD
      expect(calculateJensenShannonDivergence([0.5, 0.5], [0.5, 0.5])).toBe(0);

      // Disjoint distributions -> positive divergence
      const jsd = calculateJensenShannonDivergence([1, 0], [0, 1]);
      expect(jsd).toBeGreaterThan(0.9);
      expect(jsd).toBeLessThanOrEqual(1.0);
    });
  });

  describe("Prelec Bayesian Truth Serum (BTS) Algorithm", () => {
    it("computes positive Information Score for surprisingly common beliefs", () => {
      const agents = [
        { personalEndorsement: 0.9, predictedCrowdMean: 0.3 },
        { personalEndorsement: 0.85, predictedCrowdMean: 0.35 },
        { personalEndorsement: 0.8, predictedCrowdMean: 0.4 },
      ];

      const scores = computePrelecBtsScores(agents);
      expect(scores.length).toBe(3);
      // Because personalEndorsement > predictedCrowdMean, info score must be positive
      for (const s of scores) {
        expect(s.informationScore).toBeGreaterThan(0);
        expect(typeof s.predictionScore).toBe("number");
        expect(typeof s.btsTotalScore).toBe("number");
      }
    });

    it("handles empty or single agent arrays cleanly", () => {
      expect(computePrelecBtsScores([])).toEqual([]);
      const single = computePrelecBtsScores([
        { personalEndorsement: 0.5, predictedCrowdMean: 0.5 },
      ]);
      expect(single.length).toBe(1);
    });
  });

  describe("Quadratic Voting Allocations", () => {
    it("allocates effective votes via square-root formula: v = sqrt(C)", () => {
      const options = [
        { id: "opt-1", label: "Option 1", rawCreditsSpent: 100 }, // sqrt(100) = 10
        { id: "opt-2", label: "Option 2", rawCreditsSpent: 400 }, // sqrt(400) = 20
        { id: "opt-3", label: "Option 3", rawCreditsSpent: 900 }, // sqrt(900) = 30
      ];

      const results = computeQuadraticVoting(options);
      expect(results[0].effectiveVotes).toBe(10);
      expect(results[1].effectiveVotes).toBe(20);
      expect(results[2].effectiveVotes).toBe(30);
      expect(results[2].isConsensusChoice).toBe(true);
      expect(results[0].isConsensusChoice).toBe(false);
      expect(results[2].voteSharePct).toBe(50.0);
    });
  });

  describe("synthesizeEpistemicConsensus", () => {
    it("synthesizes populated EpistemicConsensusArtifact with Delphi rounds and BTS scores", () => {
      const artifact = synthesizeEpistemicConsensus(
        "Byzantine Fault Tolerance Architecture",
      );

      expect(artifact.id).toContain("consensus-");
      expect(artifact.summary.consensusIndexPct).toBeGreaterThan(70);
      expect(artifact.summary.totalAgents).toBe(5);
      expect(artifact.summary.delphiRoundsCompleted).toBe(3);
      expect(artifact.summary.entropyReductionPct).toBeGreaterThan(70);
      expect(artifact.agents.length).toBe(5);
      expect(artifact.delphiRounds.length).toBe(3);
      expect(artifact.quadraticAllocations.length).toBe(3);
      expect(artifact.mathematicalProofNotes).toContain(
        "Prelec BTS formulation",
      );
    });
  });

  describe("RFC 4180 CSV & Markdown Exports", () => {
    it("exports consensus artifact to RFC 4180 compliant CSV with CRLF line endings", () => {
      const artifact = synthesizeEpistemicConsensus("System Consensus");
      const csv = consensusToCsv(artifact);

      expect(csv).toContain("\r\n");
      expect(csv).toContain(
        "EPISTEMIC CONSENSUS & BAYESIAN TRUTH SERUM REPORT",
      );
      expect(csv).toContain("AGENT BELIEF ENDORSEMENTS & BTS SCORES");
      expect(csv).toContain("DELPHI MULTI-ROUND CONVERGENCE TRACE");
      expect(csv).toContain("QUADRATIC GOVERNANCE VOTING ALLOCATIONS");
    });

    it("exports consensus artifact to rich Markdown report", () => {
      const artifact = synthesizeEpistemicConsensus("System Consensus");
      const md = consensusToMarkdown(artifact);

      expect(md).toContain(
        "# Epistemic Consensus & Bayesian Truth Serum Dossier",
      );
      expect(md).toContain("## Agent Belief Endorsements & Prelec BTS Scores");
      expect(md).toContain("## Delphi Convergence Rounds");
      expect(md).toContain("## Quadratic Governance Allocations");
    });
  });

  describe("Strict Zero Fake Data Integrity", () => {
    it("strictly verifies ZERO Math.random() in consensus-engine.ts", () => {
      const filePath = join(
        process.cwd(),
        "src/lib/consensus/consensus-engine.ts",
      );
      const content = readFileSync(filePath, "utf-8");
      expect(content).not.toContain("Math.random");
    });
  });
});
