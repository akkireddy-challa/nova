import { describe, expect, it } from "bun:test";
import type { GenerativeArtifact, Session } from "../src/lib/types";
import { synthesizeFormalProof } from "../src/lib/formal/formal-prover-engine";
import {
  extractSpatialNodes,
  computeSpatialEdges,
} from "../src/lib/canvas/spatial-canvas";
import { generateStandaloneHtmlDossier } from "../src/lib/html-dossier";
import { getArtifactMetadata } from "../src/lib/print-dossier";
import { exportSessionAsMarkdown } from "../src/lib/session-export";

describe("Autonomous Formal Theorem Prover & Invariant Studio Fullstack Integration", () => {
  it("packages synthesized formal proof into a valid GenerativeArtifact union", () => {
    const proverArtifact = synthesizeFormalProof("Byzantine Fault Tolerance");
    const genArtifact: GenerativeArtifact = {
      type: "formal_prover",
      data: proverArtifact,
    };

    expect(genArtifact.type).toBe("formal_prover");
    expect(genArtifact.data.summary.status).toBe("proven_qed");
    expect(genArtifact.data.summary.satSolverType).toBe("DPLL_SMT");
  });

  it("extracts spatial canvas node with formal verification tags and metrics", () => {
    const proverArtifact = synthesizeFormalProof("Consensus Safety");
    const session: Session = {
      id: "session-formal-1",
      title: "Formal Proof Session",
      messages: [
        {
          id: "msg-formal-1",
          role: "assistant",
          content: "Automated theorem proving complete.",
          timestamp: new Date().toISOString(),
          artifact: {
            type: "formal_prover",
            data: proverArtifact,
          },
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mode: "research",
    };

    const nodes = extractSpatialNodes(session.messages);
    expect(nodes.length).toBe(1);
    expect(nodes[0].artifactType).toBe("formal_prover");
    expect(nodes[0].tags).toContain("FORMAL_VERIFICATION");
    expect(nodes[0].tags).toContain("THEOREM_PROVER");
    expect(nodes[0].metrics?.score).toBe(100);
    expect(nodes[0].metrics?.status).toBe("verified");
  });

  it("generates domain topological edges between formal_prover and code", () => {
    const proverArtifact = synthesizeFormalProof("Byzantine Quorum Safety");
    const session: Session = {
      id: "session-formal-edges",
      title: "Formal Prover & Code Verification",
      messages: [
        {
          id: "msg-fp",
          role: "assistant",
          content: "Proof",
          timestamp: new Date().toISOString(),
          artifact: {
            type: "formal_prover",
            data: proverArtifact,
          },
        },
        {
          id: "msg-code",
          role: "assistant",
          content: "Code",
          timestamp: new Date().toISOString(),
          artifact: {
            type: "code",
            data: {
              filename: "consensus.rs",
              language: "rust",
              code: "pub fn commit() {}",
              explanation: "Consensus implementation",
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
    const formalEdge = edges.find(
      (e) =>
        e.label === "Formal Code Correctness Proof" &&
        e.relationType === "validates",
    );
    expect(formalEdge).toBeDefined();
    expect(formalEdge?.strength).toBeGreaterThan(0.9);
  });

  it("generates standalone offline HTML dossier with formal prover section", () => {
    const proverArtifact = synthesizeFormalProof("Byzantine Quorum Safety");
    const genArtifact: GenerativeArtifact = {
      type: "formal_prover",
      data: proverArtifact,
    };

    const html = generateStandaloneHtmlDossier(genArtifact);
    expect(html).toContain("AUTOMATED THEOREM PROVER STUDIO");
    expect(html).toContain("Deductive Proof Tree AST");
    expect(html).toContain("Byzantine Quorum Safety");
    expect(html).toContain("PROVEN_QED");
  });

  it("resolves print dossier metadata for formal_prover artifact", () => {
    const proverArtifact = synthesizeFormalProof("Byzantine Invariants");
    const genArtifact: GenerativeArtifact = {
      type: "formal_prover",
      data: proverArtifact,
    };

    const meta = getArtifactMetadata(genArtifact);
    expect(meta.title).toContain("Byzantine");
    expect(meta.modeName).toBe("Automated Theorem Prover & SMT Verification");
  });

  it("exports session with formal prover artifact to formatted Markdown", () => {
    const proverArtifact = synthesizeFormalProof("Byzantine Safety");
    const session: Session = {
      id: "session-md-formal",
      title: "Formal Proof Export Session",
      messages: [
        {
          id: "msg-1",
          role: "assistant",
          content: "Formal verification result.",
          timestamp: new Date().toISOString(),
          artifact: {
            type: "formal_prover",
            data: proverArtifact,
          },
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mode: "research",
    };

    const md = exportSessionAsMarkdown(session);
    expect(md).toContain("Automated Theorem Prover Studio");
    expect(md).toContain("Deductive Proof Tree AST");
    expect(md).toContain("Hoare Logic Inductive Invariants");
    expect(md).toContain("DPLL_SMT");
  });
});
