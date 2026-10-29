import { describe, expect, it } from "bun:test";
import type { GenerativeArtifact, Session } from "../src/lib/types";
import { synthesizeEpistemicConsensus } from "../src/lib/consensus/consensus-engine";
import {
  extractSpatialNodes,
  computeSpatialEdges,
} from "../src/lib/canvas/spatial-canvas";
import { generateStandaloneHtmlDossier } from "../src/lib/html-dossier";
import { getArtifactMetadata } from "../src/lib/print-dossier";
import { exportSessionAsMarkdown } from "../src/lib/session-export";

describe("Autonomous Epistemic Consensus & Bayesian Truth Serum Fullstack Integration", () => {
  it("packages synthesized consensus artifact into a valid GenerativeArtifact union", () => {
    const consensusArtifact = synthesizeEpistemicConsensus(
      "Byzantine Architecture",
    );
    const genArtifact: GenerativeArtifact = {
      type: "epistemic_consensus",
      data: consensusArtifact,
    };

    expect(genArtifact.type).toBe("epistemic_consensus");
    expect(genArtifact.data.summary.consensusIndexPct).toBeGreaterThan(70);
    expect(genArtifact.data.summary.governanceModel).toBe(
      "Bayesian_Truth_Serum_Prelec",
    );
  });

  it("extracts spatial canvas node with epistemic consensus tags and metrics", () => {
    const consensusArtifact = synthesizeEpistemicConsensus(
      "Consensus Coordination",
    );
    const session: Session = {
      id: "session-consensus-1",
      title: "Consensus Coordination Session",
      messages: [
        {
          id: "msg-consensus-1",
          role: "assistant",
          content: "Delphi convergence reached.",
          timestamp: new Date().toISOString(),
          artifact: {
            type: "epistemic_consensus",
            data: consensusArtifact,
          },
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mode: "research",
    };

    const nodes = extractSpatialNodes(session.messages);
    expect(nodes.length).toBe(1);
    expect(nodes[0].artifactType).toBe("epistemic_consensus");
    expect(nodes[0].tags).toContain("EPISTEMIC_CONSENSUS");
    expect(nodes[0].tags).toContain("BAYESIAN_TRUTH_SERUM");
    expect(nodes[0].metrics?.score).toBeGreaterThan(70);
    expect(nodes[0].metrics?.status).toBe("verified");
  });

  it("generates domain topological edges between epistemic_consensus and council", () => {
    const consensusArtifact = synthesizeEpistemicConsensus(
      "Consensus Evaluation",
    );
    const session: Session = {
      id: "session-consensus-edges",
      title: "Consensus & Council Integration",
      messages: [
        {
          id: "msg-ec",
          role: "assistant",
          content: "Consensus",
          timestamp: new Date().toISOString(),
          artifact: {
            type: "epistemic_consensus",
            data: consensusArtifact,
          },
        },
        {
          id: "msg-council",
          role: "assistant",
          content: "Council",
          timestamp: new Date().toISOString(),
          artifact: {
            type: "council",
            data: {
              topic: "Consensus Evaluation Council",
              alignmentIndex: 88,
              meanScore: 8.8,
              councilVerdict: "unanimous_approval",
              verdictSummary: "Unanimous alignment",
              reviews: [],
              fatalBlindspots: [],
              actionItems: [],
              strategicCompromise: "Balanced adoption",
              generatedAt: new Date().toISOString(),
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
    const consensusEdge = edges.find(
      (e) =>
        e.label === "Bayesian Truth Serum Council Arbitration" &&
        e.relationType === "synthesizes",
    );
    expect(consensusEdge).toBeDefined();
    expect(consensusEdge?.strength).toBeGreaterThan(0.6);
  });

  it("generates standalone offline HTML dossier with consensus section", () => {
    const consensusArtifact = synthesizeEpistemicConsensus("System Decision");
    const genArtifact: GenerativeArtifact = {
      type: "epistemic_consensus",
      data: consensusArtifact,
    };

    const html = generateStandaloneHtmlDossier(genArtifact);
    expect(html).toContain("BAYESIAN TRUTH SERUM &amp; DELPHI CONSENSUS");
    expect(html).toContain("Agent Belief Endorsements &amp; BTS Scores");
    expect(html).toContain("System Decision");
  });

  it("resolves print dossier metadata for epistemic_consensus artifact", () => {
    const consensusArtifact = synthesizeEpistemicConsensus("System Consensus");
    const genArtifact: GenerativeArtifact = {
      type: "epistemic_consensus",
      data: consensusArtifact,
    };

    const meta = getArtifactMetadata(genArtifact);
    expect(meta.title).toContain("Consensus");
    expect(meta.modeName).toBe("Bayesian Truth Serum Consensus");
  });

  it("exports session with consensus artifact to formatted Markdown", () => {
    const consensusArtifact =
      synthesizeEpistemicConsensus("System Convergence");
    const session: Session = {
      id: "session-md-consensus",
      title: "Consensus Export Session",
      messages: [
        {
          id: "msg-1",
          role: "assistant",
          content: "Consensus reached.",
          timestamp: new Date().toISOString(),
          artifact: {
            type: "epistemic_consensus",
            data: consensusArtifact,
          },
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mode: "research",
    };

    const md = exportSessionAsMarkdown(session);
    expect(md).toContain("Bayesian Truth Serum Consensus");
    expect(md).toContain("Agent Belief Endorsements & Prelec BTS Scores");
    expect(md).toContain("Delphi Convergence Rounds");
    expect(md).toContain("Consensus Index");
  });
});
