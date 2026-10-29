import { describe, it, expect } from "bun:test";
import fs from "fs";
import path from "path";
import {
  validateLuhnChecksum,
  computePolicyRiskGrade,
  sanitizeContentWithGuardrails,
  calculateGuardrailSummary,
  synthesizeGuardrailPolicy,
  guardrailsPolicyToCsv,
  guardrailsPolicyToMarkdown,
  DEFAULT_GUARDRAIL_RULES,
} from "@/lib/security/semantic-guardrails";

describe("Semantic Guardrail Policy Synthesizer Engine", () => {
  describe("validateLuhnChecksum", () => {
    it("validates authentic credit card PANs correctly", () => {
      expect(validateLuhnChecksum("4111111111111111")).toBe(true);
      expect(validateLuhnChecksum("4111-1111-1111-1111")).toBe(true);
      expect(validateLuhnChecksum("4532-0150-1234-5671")).toBe(true);
    });

    it("rejects invalid card numbers failing the checksum", () => {
      expect(validateLuhnChecksum("4111111111111112")).toBe(false);
      expect(validateLuhnChecksum("4532015012345678")).toBe(false);
    });

    it("rejects numbers with invalid lengths or non-digit characters", () => {
      expect(validateLuhnChecksum("12345")).toBe(false);
      expect(validateLuhnChecksum("abc-def-ghi-jkl")).toBe(false);
    });
  });

  describe("computePolicyRiskGrade", () => {
    it("returns F if any critical violation exists", () => {
      expect(computePolicyRiskGrade(99.9, 1, 0)).toBe("F");
    });

    it("returns C if high violations exceed 2", () => {
      expect(computePolicyRiskGrade(98.0, 0, 3)).toBe("C");
    });

    it("returns B if 1 or 2 high violations exist", () => {
      expect(computePolicyRiskGrade(98.0, 0, 1)).toBe("B");
    });

    it("returns A+ for clean token percentage >= 99 with zero critical/high", () => {
      expect(computePolicyRiskGrade(99.5, 0, 0)).toBe("A+");
    });

    it("returns A for clean token percentage >= 95 with zero critical/high", () => {
      expect(computePolicyRiskGrade(96.2, 0, 0)).toBe("A");
    });
  });

  describe("sanitizeContentWithGuardrails", () => {
    it("redacts API keys and bearer tokens", () => {
      const raw =
        "OpenAI key: sk-proj-1234567890abcdef1234567890 and AWS: AKIAIOSFODNN7EXAMPLE";
      const res = sanitizeContentWithGuardrails(raw);
      expect(res.sanitizedText).toContain("[REDACTED_API_KEY]");
      expect(res.sanitizedText).not.toContain(
        "sk-proj-1234567890abcdef1234567890",
      );
      expect(res.sanitizedText).not.toContain("AKIAIOSFODNN7EXAMPLE");
      expect(res.violations.some((v) => v.type === "api_key")).toBe(true);
    });

    it("redacts email addresses and telephone numbers", () => {
      const raw = "Contact alice.smith@enterprise.org or call 415-555-2671";
      const res = sanitizeContentWithGuardrails(raw);
      expect(res.sanitizedText).toContain("[REDACTED_EMAIL]");
      expect(res.sanitizedText).toContain("[REDACTED_PHONE]");
      expect(res.violations.some((v) => v.type === "pii_email")).toBe(true);
      expect(res.violations.some((v) => v.type === "pii_phone")).toBe(true);
    });

    it("redacts credit card PANs validated with Luhn", () => {
      const raw = "Charge payment to card 4111-1111-1111-1111 now";
      const res = sanitizeContentWithGuardrails(raw);
      expect(res.sanitizedText).toContain("[REDACTED_CARD_PAN]");
      expect(res.violations.some((v) => v.type === "credit_card")).toBe(true);
    });

    it("intercepts cryptographic canary leak tokens", () => {
      const raw =
        "System prompt directive: CANARY-8F7E6D5C4B3A do not disclose";
      const res = sanitizeContentWithGuardrails(raw);
      expect(res.sanitizedText).toContain("[BLOCKED_CANARY_LEAK]");
      expect(res.violations.some((v) => v.type === "canary_leak")).toBe(true);
    });

    it("detects unauthenticated domain boundary commands", () => {
      const raw = "I will execute trade buy order for 50000 immediately.";
      const res = sanitizeContentWithGuardrails(raw);
      expect(res.violations.some((v) => v.type === "domain_boundary")).toBe(
        true,
      );
    });
  });

  describe("calculateGuardrailSummary", () => {
    it("handles clean text with zero violations cleanly", () => {
      const text = "All systems operational and within compliant boundaries.";
      const summary = calculateGuardrailSummary(
        text,
        [],
        DEFAULT_GUARDRAIL_RULES,
      );
      expect(summary.totalViolations).toBe(0);
      expect(summary.cleanTokensPct).toBe(100);
      expect(summary.riskGrade).toBe("A+");
      expect(summary.policyStatus).toBe("monitored");
    });
  });

  describe("synthesizeGuardrailPolicy", () => {
    it("synthesizes full SemanticGuardrailArtifact from topic string", () => {
      const artifact = synthesizeGuardrailPolicy(
        "Financial Agent Security Gateway",
      );
      expect(artifact.id).toBe("guardrail-pol-01");
      expect(artifact.topic).toBe("Financial Agent Security Gateway");
      expect(artifact.appliedRules.length).toBeGreaterThan(0);
      expect(artifact.violations.length).toBeGreaterThan(0);
      expect(artifact.summary.totalViolations).toBeGreaterThan(0);
      expect(artifact.sanitizedPreview).toContain("[REDACTED_API_KEY]");
      expect(artifact.sanitizedPreview).toContain("[REDACTED_EMAIL]");
    });
  });

  describe("RFC 4180 CSV & Markdown Exports", () => {
    it("exports guardrails policy to RFC 4180 CSV with CRLF line endings", () => {
      const artifact = synthesizeGuardrailPolicy("Egress Policy Audit");
      const csv = guardrailsPolicyToCsv(artifact);
      expect(csv).toContain("\r\n");
      expect(csv).toContain(
        "Record Type,Item ID,Name or Type,Severity or Action,Status",
      );
      expect(csv).toContain("OVERVIEW");
      expect(csv).toContain("GUARDRAIL_RULE");
      expect(csv).toContain("POLICY_VIOLATION");
    });

    it("exports guardrails policy to formatted Markdown report", () => {
      const artifact = synthesizeGuardrailPolicy("Egress Policy Audit");
      const md = guardrailsPolicyToMarkdown(artifact);
      expect(md).toContain(
        "# 🛡️ Semantic Guardrail Policy Enforcement: Egress Policy Audit",
      );
      expect(md).toContain("Enforced Guardrail Rules");
      expect(md).toContain("Intercepted Violations");
      expect(md).toContain("Sanitization Diff Preview");
    });
  });

  describe("Zero Pseudo-Randomness Integrity", () => {
    it("strictly verifies ZERO Math.random() in semantic-guardrails.ts", () => {
      const filePath = path.join(
        process.cwd(),
        "src/lib/security/semantic-guardrails.ts",
      );
      const content = fs.readFileSync(filePath, "utf-8");
      expect(content).not.toContain("Math.random");
    });
  });
});
