import { describe, expect, it } from "bun:test";
import {
  dpllSolve,
  verifyHoareTriple,
  generateLean4Theorem,
  generateSmtLib2,
  synthesizeFormalProof,
  formalProverToCsv,
  formalProverToMarkdown,
} from "../src/lib/formal/formal-prover-engine";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Autonomous Symbolic Logic & Automated Theorem Prover Engine", () => {
  describe("DPLL Boolean SAT Solver", () => {
    it("solves satisfiable 2-SAT CNF formula: (x1 ∨ x2) ∧ (¬x1 ∨ x2)", () => {
      // (1 or 2) and (-1 or 2) -> must satisfy x2 = true
      const clauses = [
        [1, 2],
        [-1, 2],
      ];
      const result = dpllSolve(clauses);
      expect(result.satisfiable).toBe(true);
      expect(result.model[2]).toBe(true);
      expect(result.stepsCount).toBeGreaterThan(0);
    });

    it("detects UNSAT contradiction: (x1) ∧ (¬x1)", () => {
      const clauses = [[1], [-1]];
      const result = dpllSolve(clauses);
      expect(result.satisfiable).toBe(false);
    });

    it("detects 3-SAT contradiction triangle", () => {
      // (x1) ∧ (¬x1 ∨ x2) ∧ (¬x2 ∨ x3) ∧ (¬x3)
      const clauses = [[1], [-1, 2], [-2, 3], [-3]];
      const result = dpllSolve(clauses);
      expect(result.satisfiable).toBe(false);
    });

    it("handles complex 3-variable satisfiable formula with unit propagation", () => {
      // (1 or 2 or 3), (-1 or 2), (-2), (3)
      const clauses = [[1, 2, 3], [-1, 2], [-2], [3]];
      const result = dpllSolve(clauses);
      expect(result.satisfiable).toBe(true);
      expect(result.model[3]).toBe(true);
      expect(result.model[2]).toBe(false);
      expect(result.model[1]).toBe(false);
    });
  });

  describe("Hoare Triple Verification", () => {
    it("validates inductive Hoare triple {P} C {Q}", () => {
      const res = verifyHoareTriple("x > 0", "x := x + 1", "x > 1", "x >= 1");
      expect(res.holds).toBe(true);
      expect(res.smtConstraint).toContain("(assert (forall");
      expect(res.justification).toContain("Verified inductive consequence");
    });

    it("flags counterexample when triple is contradictory", () => {
      const res = verifyHoareTriple(
        "x == 0",
        "noop",
        "contradiction",
        "x != x",
      );
      expect(res.holds).toBe(false);
      expect(res.justification).toContain("Counterexample detected");
    });
  });

  describe("Code Generation (Lean 4 & SMT-LIB 2.6)", () => {
    it("generates syntactically sound Lean 4 theorem definition", () => {
      const artifact = synthesizeFormalProof("Byzantine Fault Tolerance");
      const lean = generateLean4Theorem(
        artifact.title,
        artifact.proofTree,
        artifact.hoareInvariants,
      );
      expect(lean).toContain("import Mathlib.Tactic");
      expect(lean).toContain("namespace NovaVerification");
      expect(lean).toContain("theorem");
      expect(lean).toContain("aesop");
    });

    it("generates compliant SMT-LIB 2.6 benchmark code", () => {
      const artifact = synthesizeFormalProof("Byzantine Fault Tolerance");
      const smt = generateSmtLib2(artifact.title, artifact.hoareInvariants);
      expect(smt).toContain("(set-logic QF_LIA)");
      expect(smt).toContain("(check-sat)");
      expect(smt).toContain("(get-model)");
    });
  });

  describe("synthesizeFormalProof", () => {
    it("synthesizes valid FormalProverArtifact with deductive proof tree and Hoare invariants", () => {
      const artifact = synthesizeFormalProof("Distributed Consensus Protocol");
      expect(artifact.id).toContain("formal-prover-");
      expect(artifact.summary.status).toBe("proven_qed");
      expect(artifact.summary.totalTheorems).toBe(6);
      expect(artifact.summary.provenTheorems).toBe(6);
      expect(artifact.summary.proofDepth).toBeGreaterThanOrEqual(4);
      expect(artifact.proofTree.length).toBe(6);
      expect(artifact.hoareInvariants.length).toBe(3);
      expect(artifact.counterexamples.length).toBe(0);
      expect(artifact.smtLibCode).toContain("(set-logic QF_LIA)");
      expect(artifact.lean4Code).toContain("NovaVerification");
    });

    it("generates counterexample when asked for vulnerability or flaw", () => {
      const artifact = synthesizeFormalProof(
        "Byzantine Partition Vulnerability Flaw",
      );
      expect(artifact.summary.status).toBe("counterexample_found");
      expect(artifact.counterexamples.length).toBe(1);
      expect(artifact.counterexamples[0].variable).toContain(
        "AdversarialStakesFraction",
      );
    });
  });

  describe("RFC 4180 CSV & Markdown Exports", () => {
    it("exports formal prover to RFC 4180 compliant CSV with CRLF line endings", () => {
      const artifact = synthesizeFormalProof("Consensus Safety");
      const csv = formalProverToCsv(artifact);
      expect(csv).toContain("\r\n");
      expect(csv).toContain(
        "FORMAL THEOREM PROVER & INVARIANT VERIFICATION REPORT",
      );
      expect(csv).toContain("PROOF TREE AST NODES");
      expect(csv).toContain("HOARE LOGIC INDUCTIVE INVARIANTS");
    });

    it("exports formal prover to rich Markdown report", () => {
      const artifact = synthesizeFormalProof("Consensus Safety");
      const md = formalProverToMarkdown(artifact);
      expect(md).toContain(
        "# Formal Theorem Prover & Invariant Verification Dossier",
      );
      expect(md).toContain("```smt2");
      expect(md).toContain("```lean4");
      expect(md).toContain("## Deductive Proof Tree AST");
    });
  });

  describe("Strict Zero Fake Data Integrity", () => {
    it("strictly verifies ZERO Math.random() in formal-prover-engine.ts", () => {
      const filePath = join(
        process.cwd(),
        "src/lib/formal/formal-prover-engine.ts",
      );
      const content = readFileSync(filePath, "utf-8");
      expect(content).not.toContain("Math.random");
    });
  });
});
