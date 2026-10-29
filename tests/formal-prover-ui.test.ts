import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { FormalProverCard } from "../src/components/GenerativeCards/FormalProverCard";
import { synthesizeFormalProof } from "../src/lib/formal/formal-prover-engine";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("FormalProverCard Generative UI Component", () => {
  it("renders formal prover title, Q.E.D. badge, and proof depth", () => {
    const artifact = synthesizeFormalProof("Byzantine Quorum Safety");
    const html = renderToString(
      React.createElement(FormalProverCard, { artifact }),
    );

    expect(html).toContain("Byzantine Quorum Safety");
    expect(html).toContain("Automated Theorem Prover");
    expect(html).toContain("Q.E.D. PROVEN");
    expect(html).toContain("Soundness Guarantee");
  });

  it("renders SVG graphics-document proof tree canvas with directed markers", () => {
    const artifact = synthesizeFormalProof("Byzantine Quorum Safety");
    const html = renderToString(
      React.createElement(FormalProverCard, { artifact }),
    );

    expect(html).toContain('role="graphics-document"');
    expect(html).toContain("arrow-prover");
    expect(html).toContain("Axiom 1: Quorum");
  });

  it("renders deduction steps tab trigger and Hoare invariants count badge", () => {
    const artifact = synthesizeFormalProof("Byzantine Quorum Safety");
    const html = renderToString(
      React.createElement(FormalProverCard, { artifact }),
    );

    expect(html).toContain("Hoare Invariants");
    expect(html).toContain("Deduction Steps");
    expect(html).toContain("SMT-LIB &amp; Lean 4");
  });

  it("renders counterexample alert when artifact contains violations", () => {
    const artifact = synthesizeFormalProof(
      "Network Partition Vulnerability Flaw",
    );
    const html = renderToString(
      React.createElement(FormalProverCard, { artifact }),
    );

    expect(html).toContain("COUNTEREXAMPLE FOUND");
    expect(html).toContain("Counterexamples");
  });

  it("strictly enforces ZERO Math.random() in FormalProverCard source", () => {
    const filePath = join(
      process.cwd(),
      "src/components/GenerativeCards/FormalProverCard.tsx",
    );
    const content = readFileSync(filePath, "utf-8");
    expect(content).not.toContain("Math.random");
  });
});
