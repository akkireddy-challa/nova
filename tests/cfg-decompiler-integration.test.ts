import { describe, expect, it } from "bun:test";
import type { GenerativeArtifact, Session } from "../src/lib/types";
import { synthesizeControlFlowGraph } from "../src/lib/ast/cfg-decompiler-engine";
import {
  extractSpatialNodes,
  computeSpatialEdges,
} from "../src/lib/canvas/spatial-canvas";
import { generateStandaloneHtmlDossier } from "../src/lib/html-dossier";
import { getArtifactMetadata } from "../src/lib/print-dossier";
import { exportSessionAsMarkdown } from "../src/lib/session-export";

describe("Autonomous Control Flow Graph & Decompiler Fullstack Integration", () => {
  it("packages synthesized CFG artifact into a valid GenerativeArtifact union", () => {
    const cfgArtifact = synthesizeControlFlowGraph("EVMBytecodeDecompiler");
    const genArtifact: GenerativeArtifact = {
      type: "ast_control_flow",
      data: cfgArtifact,
    };

    expect(genArtifact.type).toBe("ast_control_flow");
    expect(
      genArtifact.data.summary.cyclomaticComplexity,
    ).toBeGreaterThanOrEqual(1);
    expect(genArtifact.data.basicBlocks.length).toBe(7);
    expect(genArtifact.data.edges.length).toBe(8);
    expect(genArtifact.data.defUseChains.length).toBeGreaterThan(0);
  });

  it("extracts spatial canvas node with CFG tags and metrics", () => {
    const cfgArtifact = synthesizeControlFlowGraph("CryptoSignatureValidator");
    const session: Session = {
      id: "session-cfg-1",
      title: "CFG Analysis Session",
      messages: [
        {
          id: "msg-cfg-1",
          role: "assistant",
          content: "Control flow graph analyzed.",
          timestamp: new Date().toISOString(),
          artifact: {
            type: "ast_control_flow",
            data: cfgArtifact,
          },
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mode: "coder",
    };

    const nodes = extractSpatialNodes(session.messages);
    expect(nodes.length).toBe(1);
    expect(nodes[0].artifactType).toBe("ast_control_flow");
    expect(nodes[0].tags).toContain("CONTROL_FLOW_GRAPH");
    expect(nodes[0].tags).toContain("DOMINATOR_TREE");
    expect(nodes[0].tags).toContain("DECOMPILER");
    expect(nodes[0].metrics?.status).toBe("verified");
    expect(nodes[0].metrics?.score).toBe(3);
  });

  it("generates domain topological edges between ast_control_flow and formal_prover", () => {
    const cfgArtifact = synthesizeControlFlowGraph("StateTransitionVerifier");
    const session: Session = {
      id: "session-cfg-edges",
      title: "CFG & Formal Prover Integration",
      messages: [
        {
          id: "msg-cfg",
          role: "assistant",
          content: "CFG",
          timestamp: new Date().toISOString(),
          artifact: {
            type: "ast_control_flow",
            data: cfgArtifact,
          },
        },
        {
          id: "msg-fp",
          role: "assistant",
          content: "Formal Prover",
          timestamp: new Date().toISOString(),
          artifact: {
            type: "formal_prover",
            data: {
              id: "fp-1",
              title: "State Transition Invariants",
              createdAt: new Date().toISOString(),
              summary: {
                conjecture: "SafetyInvariant",
                status: "proven_qed",
                totalTheorems: 5,
                provenTheorems: 5,
                counterexamplesCount: 0,
                proofDepth: 3,
                satSolverType: "DPLL_SMT",
                soundnessCompletenessPct: 100,
                verificationTimeMs: 12,
                lean4TargetReady: true,
              },
              proofTree: [],
              hoareInvariants: [],
              counterexamples: [],
              smtLibCode: "; SMT",
              lean4Code: "-- Lean",
              executiveSummary: "Q.E.D. verified",
            },
          },
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mode: "coder",
    };

    const nodes = extractSpatialNodes(session.messages);
    const edges = computeSpatialEdges(nodes);

    expect(edges.length).toBeGreaterThan(0);
    const edge = edges.find(
      (e) =>
        (e.sourceId === "node-msg-cfg" && e.targetId === "node-msg-fp") ||
        (e.sourceId === "node-msg-fp" && e.targetId === "node-msg-cfg"),
    );
    expect(edge).toBeDefined();
    expect(edge?.relationType).toBe("validates");
    expect(edge?.label).toBe("Inductive Invariant Hoare Verification");
  });

  it("generates complete standalone HTML dossier with CFG section", () => {
    const cfgArtifact = synthesizeControlFlowGraph("ReentrancyGuardExecution");
    const genArtifact: GenerativeArtifact = {
      type: "ast_control_flow",
      data: cfgArtifact,
    };

    const html = generateStandaloneHtmlDossier(genArtifact);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("CONTROL FLOW GRAPH &amp; SYMBOLIC DECOMPILER");
    expect(html).toContain(
      "Control Flow &amp; Decompiler Analysis: ReentrancyGuardExecution",
    );
    expect(html).toContain("Basic Blocks &amp; Dominator Hierarchy");
    expect(html).toContain("Reconstructed Decompiled Pseudocode");
  });

  it("resolves print dossier metadata correctly", () => {
    const cfgArtifact = synthesizeControlFlowGraph("MemoryBufferDecompiler");
    const genArtifact: GenerativeArtifact = {
      type: "ast_control_flow",
      data: cfgArtifact,
    };

    const metadata = getArtifactMetadata(genArtifact);
    expect(metadata.title).toContain("MemoryBufferDecompiler");
    expect(metadata.modeName).toBe("Control Flow & Symbolic Decompiler Studio");
  });

  it("exports session markdown with CFG basic blocks and decompiled code", () => {
    const cfgArtifact = synthesizeControlFlowGraph("OptimisticRollupExecution");
    const session: Session = {
      id: "session-export-cfg",
      title: "CFG Export Session",
      messages: [
        {
          id: "msg-cfg-export",
          role: "assistant",
          content: "CFG generated.",
          timestamp: new Date().toISOString(),
          artifact: {
            type: "ast_control_flow",
            data: cfgArtifact,
          },
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mode: "coder",
    };

    const md = exportSessionAsMarkdown(session);
    expect(md).toContain("#### 🌿 Control Flow Graph & Decompiler");
    expect(md).toContain("Cyclomatic Complexity:");
    expect(md).toContain("Basic Blocks & Dominance Hierarchy");
    expect(md).toContain("Def-Use Chains & Dead Store Audit");
    expect(md).toContain("Reconstructed Decompiled Pseudocode:");
  });
});
