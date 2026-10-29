import { describe, expect, test } from "bun:test";
import {
  calculateCyclomaticComplexity,
  getComplexityGrade,
  computeDominators,
  computeImmediateDominators,
  computeDominanceFrontiers,
  detectNaturalLoops,
  synthesizeControlFlowGraph,
  cfgToCsv,
  cfgToMarkdown,
} from "../src/lib/ast/cfg-decompiler-engine";
import fs from "fs";
import path from "path";

describe("Autonomous Control Flow Graph (CFG) & Decompiler Engine", () => {
  test("computes accurate McCabe cyclomatic complexity and risk tiers", () => {
    // 7 nodes, 8 edges, 1 component: M = 8 - 7 + 2*1 = 3
    expect(calculateCyclomaticComplexity(7, 8, 1)).toBe(3);
    expect(getComplexityGrade(3)).toBe("Simple");
    expect(getComplexityGrade(8)).toBe("Moderate");
    expect(getComplexityGrade(15)).toBe("Complex");
    expect(getComplexityGrade(25)).toBe("High Risk");
  });

  test("computes dominator sets Dom(n) and immediate dominators idom", () => {
    const blocks = [
      { id: "b0", predecessorIds: [] },
      { id: "b1", predecessorIds: ["b0"] },
      { id: "b2", predecessorIds: ["b1"] },
      { id: "b3", predecessorIds: ["b1"] },
      { id: "b4", predecessorIds: ["b2", "b3"] },
    ];

    const dom = computeDominators(blocks, "b0");
    expect(dom.get("b0")?.has("b0")).toBe(true);
    expect(dom.get("b1")?.has("b0")).toBe(true);
    expect(dom.get("b4")?.has("b0")).toBe(true);
    expect(dom.get("b4")?.has("b1")).toBe(true);

    const idom = computeImmediateDominators(blocks, dom, "b0");
    expect(idom.get("b0")).toBe(null);
    expect(idom.get("b1")).toBe("b0");
    expect(idom.get("b2")).toBe("b1");
    expect(idom.get("b3")).toBe("b1");
    expect(idom.get("b4")).toBe("b1");
  });

  test("computes dominance frontiers DF(X)", () => {
    const blocks = [
      { id: "b0", predecessorIds: [] },
      { id: "b1", predecessorIds: ["b0"] },
      { id: "b2", predecessorIds: ["b1"] },
      { id: "b3", predecessorIds: ["b1"] },
      { id: "b4", predecessorIds: ["b2", "b3"] },
    ];

    const dom = computeDominators(blocks, "b0");
    const idom = computeImmediateDominators(blocks, dom, "b0");
    const df = computeDominanceFrontiers(blocks, idom);

    // b2 and b3 have b4 in their dominance frontier because b4 is join point
    expect(df.get("b2")?.has("b4")).toBe(true);
    expect(df.get("b3")?.has("b4")).toBe(true);
  });

  test("detects natural loops via back-edges", () => {
    const blocks = [
      { id: "b0", predecessorIds: [] },
      { id: "b1", predecessorIds: ["b0", "b2"] },
      { id: "b2", predecessorIds: ["b1"] },
      { id: "b3", predecessorIds: ["b1"] },
    ];

    const dom = computeDominators(blocks, "b0");
    const edges = [
      {
        id: "e1",
        fromBlockId: "b0",
        toBlockId: "b1",
        kind: "unconditional" as const,
      },
      {
        id: "e2",
        fromBlockId: "b1",
        toBlockId: "b2",
        kind: "true_branch" as const,
      },
      {
        id: "e3",
        fromBlockId: "b2",
        toBlockId: "b1",
        kind: "back_edge" as const,
      },
      {
        id: "e4",
        fromBlockId: "b1",
        toBlockId: "b3",
        kind: "false_branch" as const,
      },
    ];

    const loops = detectNaturalLoops(edges, dom);
    expect(loops.length).toBe(1);
    expect(loops[0].headerId).toBe("b1");
    expect(loops[0].latchId).toBe("b2");
    expect(loops[0].loopBlockIds).toContain("b1");
    expect(loops[0].loopBlockIds).toContain("b2");
  });

  test("synthesizes deterministic AstControlFlowArtifact with zero fake data", () => {
    const artifact = synthesizeControlFlowGraph(
      "Byzantine Validator Consensus Hook",
    );

    expect(artifact.id).toContain("cfg-");
    expect(artifact.title).toContain("Byzantine Validator");
    expect(artifact.basicBlocks.length).toBe(7);
    expect(artifact.edges.length).toBe(8);
    expect(artifact.summary.cyclomaticComplexity).toBe(3);
    expect(artifact.summary.naturalLoopCount).toBe(1);
    expect(artifact.summary.hasDeadCode).toBe(true); // sig_valid dead store detected
    expect(artifact.decompiledCode).toContain("export async function");
    expect(artifact.defUseChains.length).toBeGreaterThan(0);
  });

  test("generates valid RFC 4180 CSV export", () => {
    const artifact = synthesizeControlFlowGraph("StateTransitionVerifier");
    const csv = cfgToCsv(artifact);

    expect(csv).toContain("CONTROL FLOW GRAPH & DECOMPILER ANALYSIS DOSSIER");
    expect(csv).toContain("BASIC BLOCKS");
    expect(csv).toContain("CONTROL FLOW EDGES");
    expect(csv).toContain("DEF-USE CHAINS & DEAD STORE AUDIT");
    expect(csv).toContain("StateTransitionVerifier");
  });

  test("generates formatted Markdown export", () => {
    const artifact = synthesizeControlFlowGraph("TokenVaultReentrancyGuard");
    const md = cfgToMarkdown(artifact);

    expect(md).toContain("# Control Flow Graph & Symbolic Decompiler Dossier");
    expect(md).toContain("## Executive Summary");
    expect(md).toContain("## Basic Blocks & Dominance Hierarchy");
    expect(md).toContain("## Def-Use Chains & Dead Store Audit");
    expect(md).toContain("## Reconstructed Decompiler Pseudocode");
  });

  test("enforces zero Math.random() in codebase", () => {
    const engineFile = fs.readFileSync(
      path.join(process.cwd(), "src/lib/ast/cfg-decompiler-engine.ts"),
      "utf-8",
    );
    expect(engineFile).not.toContain("Math.random");
  });
});
