import { describe, it, expect } from "bun:test";
import fs from "fs";
import path from "path";
import {
  computeDefensePosture,
  calculateAuditSummary,
  synthesizeRedTeamAudit,
  redTeamAuditToCsv,
  redTeamAuditToMarkdown,
  escapeCsvCell,
  DEFAULT_ATTACK_CHAINS,
  type RedTeamAttackChain,
} from "@/lib/security/red-team-auditor";

describe("Autonomous Dialectic Red-Teamer Engine", () => {
  describe("computeDefensePosture", () => {
    it("returns compromised when any critical vulnerability exists", () => {
      expect(computeDefensePosture(95, 1)).toBe("compromised");
      expect(computeDefensePosture(100, 2)).toBe("compromised");
    });

    it("returns hardened for immunity >= 90 with zero critical vulnerabilities", () => {
      expect(computeDefensePosture(100, 0)).toBe("hardened");
      expect(computeDefensePosture(90, 0)).toBe("hardened");
    });

    it("returns resilient for immunity >= 75 with zero critical vulnerabilities", () => {
      expect(computeDefensePosture(85, 0)).toBe("resilient");
      expect(computeDefensePosture(75, 0)).toBe("resilient");
    });

    it("returns vulnerable for immunity < 75 with zero critical vulnerabilities", () => {
      expect(computeDefensePosture(70, 0)).toBe("vulnerable");
      expect(computeDefensePosture(50, 0)).toBe("vulnerable");
    });
  });

  describe("calculateAuditSummary", () => {
    it("handles empty attack chains cleanly", () => {
      const summary = calculateAuditSummary([]);
      expect(summary.totalAttackChains).toBe(0);
      expect(summary.neutralizedCount).toBe(0);
      expect(summary.exploitedCount).toBe(0);
      expect(summary.immunityScore).toBe(0);
      expect(summary.defensePosture).toBe("compromised");
    });

    it("calculates accurate audit summary from mixed attack chains", () => {
      const chains: RedTeamAttackChain[] = [
        {
          chainId: "chain-1",
          vectorName: "Chain 1",
          owaspCategory: "LLM01_Prompt_Injection",
          severity: "critical",
          status: "neutralized",
          turns: [],
          vulnerabilityAnalysis: "Analysis",
          recommendedGuardrail: "Guardrail",
        },
        {
          chainId: "chain-2",
          vectorName: "Chain 2",
          owaspCategory: "LLM02_Sensitive_Information_Disclosure",
          severity: "high",
          status: "neutralized",
          turns: [],
          vulnerabilityAnalysis: "Analysis",
          recommendedGuardrail: "Guardrail",
        },
        {
          chainId: "chain-3",
          vectorName: "Chain 3",
          owaspCategory: "LLM06_Excessive_Agency",
          severity: "high",
          status: "exploited",
          turns: [],
          vulnerabilityAnalysis: "Analysis",
          recommendedGuardrail: "Guardrail",
        },
      ];

      const summary = calculateAuditSummary(chains);
      expect(summary.totalAttackChains).toBe(3);
      expect(summary.neutralizedCount).toBe(2);
      expect(summary.exploitedCount).toBe(1);
      expect(summary.immunityScore).toBe(67);
      expect(summary.highVulnerabilities).toBe(1);
      expect(summary.criticalVulnerabilities).toBe(0);
      expect(summary.defensePosture).toBe("vulnerable");
    });

    it("calculates audit summary for default enterprise attack chains", () => {
      const summary = calculateAuditSummary(DEFAULT_ATTACK_CHAINS);
      expect(summary.totalAttackChains).toBe(5);
      expect(summary.neutralizedCount).toBe(5);
      expect(summary.exploitedCount).toBe(0);
      expect(summary.immunityScore).toBe(100);
      expect(summary.defensePosture).toBe("hardened");
    });
  });

  describe("synthesizeRedTeamAudit", () => {
    it("creates populated RedTeamAuditArtifact from string topic", () => {
      const artifact = synthesizeRedTeamAudit(
        "FinTech Trading Agent Security Audit",
      );
      expect(artifact.id).toContain("audit-fintech-trading-agent-security-");
      expect(artifact.topic).toBe("FinTech Trading Agent Security Audit");
      expect(artifact.targetSystem).toContain("Nova Autonomous");
      expect(artifact.attackChains.length).toBe(5);
      expect(artifact.summary.immunityScore).toBe(100);
      expect(artifact.summary.defensePosture).toBe("hardened");
    });

    it("handles object configuration inputs cleanly", () => {
      const artifact = synthesizeRedTeamAudit({
        title: "Medical LLM Air-Gap Penetration Test",
        targetSystem: "MedNova Core v2.1",
        executiveSummary: "Clinical agent security validation.",
      });
      expect(artifact.topic).toBe("Medical LLM Air-Gap Penetration Test");
      expect(artifact.targetSystem).toBe("MedNova Core v2.1");
      expect(artifact.executiveSummary).toBe(
        "Clinical agent security validation.",
      );
    });
  });

  describe("RFC 4180 CSV & Markdown Exports", () => {
    it("escapes CSV cells with quotes and commas properly", () => {
      expect(escapeCsvCell('Text "Quote"')).toBe('"Text ""Quote"""');
      expect(escapeCsvCell("One,Two")).toBe('"One,Two"');
      expect(escapeCsvCell(null)).toBe("");
      expect(escapeCsvCell("Normal")).toBe("Normal");
    });

    it("exports red team audit to strict RFC 4180 CSV with CRLF line endings", () => {
      const artifact = synthesizeRedTeamAudit(
        "Enterprise Model Penetration Suite",
      );
      const csv = redTeamAuditToCsv(artifact);

      expect(csv).toContain("\r\n");
      expect(csv).toContain(
        "Record Type,Chain ID,Vector Name,OWASP Category,Severity",
      );
      expect(csv).toContain("OVERVIEW");
      expect(csv).toContain("ATTACK_CHAIN");
      expect(csv).toContain("PROBE_TURN");
      expect(csv).toContain("chain-adv-01");
      expect(csv).toContain("Multi-Turn Roleplay Boundary Erosion");
      expect(csv).toContain("NEUTRALIZED");
    });

    it("exports red team audit to formatted Markdown report", () => {
      const artifact = synthesizeRedTeamAudit(
        "Zero-Trust Security Verification",
      );
      const md = redTeamAuditToMarkdown(artifact);

      expect(md).toContain(
        "# 🛡️ Dialectic Red-Team Security Audit: Zero-Trust Security Verification",
      );
      expect(md).toContain("Immunity Score:** **100%** (HARDENED)");
      expect(md).toContain("Multi-Turn Roleplay Boundary Erosion");
      expect(md).toContain("NEUTRALIZED");
      expect(md).toContain("Turn 1");
      expect(md).toContain("Attacker:");
      expect(md).toContain("Defender:");
    });
  });

  describe("Zero Pseudo-Randomness & Documentation Integrity", () => {
    it("strictly verifies that red-team-auditor.ts has ZERO Math.random() calls", () => {
      const filePath = path.join(
        process.cwd(),
        "src/lib/security/red-team-auditor.ts",
      );
      const content = fs.readFileSync(filePath, "utf-8");
      expect(content).not.toContain("Math.random");
    });
  });
});
