import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { AstControlFlowCard } from "../src/components/GenerativeCards/AstControlFlowCard";
import { synthesizeControlFlowGraph } from "../src/lib/ast/cfg-decompiler-engine";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("AstControlFlowCard Generative UI Component", () => {
  it("renders CFG title, cyclomatic complexity badge, and basic blocks count", () => {
    const artifact = synthesizeControlFlowGraph("TokenStakingVault");
    const html = renderToString(
      React.createElement(AstControlFlowCard, { artifact }),
    );

    expect(html).toContain("Control Flow &amp; Decompiler Analysis");
    expect(html).toContain("Complexity:");
    expect(html).toContain("Blocks:");
    expect(html).toContain("Natural Loops");
    expect(html).toContain("Cyclomatic Complexity");
    expect(html).toContain("M = ");
  });

  it("renders SVG graphics-document control flow canvas with directed markers", () => {
    const artifact = synthesizeControlFlowGraph("TokenStakingVault");
    const html = renderToString(
      React.createElement(AstControlFlowCard, { artifact }),
    );

    expect(html).toContain('role="graphics-document"');
    expect(html).toContain('aria-label="Control Flow Graph Canvas"');
    expect(html).toContain("cfg-arrow");
    expect(html).toContain("cfg-back-arrow");
    expect(html).toContain("BB0: Function Prologue");
  });

  it("renders tab triggers for canvas, blocks, dominator tree, def-use chains, and decompiled code", () => {
    const artifact = synthesizeControlFlowGraph("TokenStakingVault");
    const html = renderToString(
      React.createElement(AstControlFlowCard, { artifact }),
    );

    expect(html).toContain("Control Flow Graph Canvas");
    expect(html).toContain("Basic Blocks");
    expect(html).toContain("Dominator Tree &amp; Loops");
    expect(html).toContain("SSA &amp; Def-Use Chains");
    expect(html).toContain("Decompiler Pseudocode");
  });

  it("renders initial selected block inspection details", () => {
    const artifact = synthesizeControlFlowGraph("TokenStakingVault");
    const html = renderToString(
      React.createElement(AstControlFlowCard, { artifact }),
    );

    expect(html).toContain("Basic Block Inspection");
    expect(html).toContain("Block Identifier");
    expect(html).toContain("Predecessors");
    expect(html).toContain("Successors");
    expect(html).toContain("Disassembled Instructions");
  });

  it("strictly enforces ZERO Math.random() in AstControlFlowCard source", () => {
    const filePath = join(
      process.cwd(),
      "src/components/GenerativeCards/AstControlFlowCard.tsx",
    );
    const content = readFileSync(filePath, "utf-8");
    expect(content).not.toContain("Math.random");
  });
});
