import { describe, it, expect } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import {
  calculatePersonaGrade,
  calculatePersonaVerdict,
  calculateCouncilAlignmentIndex,
  determineCouncilVerdict,
  deterministicHash,
  analyzePersonaCouncil,
  escapeCsvCell,
  personaCouncilToCsv,
  personaCouncilToMarkdown,
  type PersonaCouncilArtifact,
} from "@/lib/research/persona-studio";
import type { AgentPersona } from "@/lib/agent-personas";

describe("Multi-Persona Executive Council Studio Engine", () => {
  // =========================================================================
  // 1. Grade Calculation Boundaries
  // =========================================================================
  describe("Grade Calculation Boundaries", () => {
    it("strictly maps grade thresholds according to specifications", () => {
      // 95-100 -> A+
      expect(calculatePersonaGrade(100)).toBe("A+");
      expect(calculatePersonaGrade(95)).toBe("A+");

      // 85-94 -> A
      expect(calculatePersonaGrade(94)).toBe("A");
      expect(calculatePersonaGrade(90)).toBe("A");
      expect(calculatePersonaGrade(85)).toBe("A");

      // 75-84 -> B
      expect(calculatePersonaGrade(84)).toBe("B");
      expect(calculatePersonaGrade(80)).toBe("B");
      expect(calculatePersonaGrade(75)).toBe("B");

      // 65-74 -> C
      expect(calculatePersonaGrade(74)).toBe("C");
      expect(calculatePersonaGrade(70)).toBe("C");
      expect(calculatePersonaGrade(65)).toBe("C");

      // 50-64 -> D
      expect(calculatePersonaGrade(64)).toBe("D");
      expect(calculatePersonaGrade(58)).toBe("D");
      expect(calculatePersonaGrade(50)).toBe("D");

      // < 50 -> F
      expect(calculatePersonaGrade(49)).toBe("F");
      expect(calculatePersonaGrade(25)).toBe("F");
      expect(calculatePersonaGrade(0)).toBe("F");
      expect(calculatePersonaGrade(-10)).toBe("F");
    });
  });

  // =========================================================================
  // 2. Verdict Thresholds
  // =========================================================================
  describe("Verdict Thresholds", () => {
    it("determines individual persona verdicts with exact boundary precision", () => {
      // >= 80 -> approve
      expect(calculatePersonaVerdict(100)).toBe("approve");
      expect(calculatePersonaVerdict(85)).toBe("approve");
      expect(calculatePersonaVerdict(80)).toBe("approve");

      // 60-79 -> conditional
      expect(calculatePersonaVerdict(79)).toBe("conditional");
      expect(calculatePersonaVerdict(70)).toBe("conditional");
      expect(calculatePersonaVerdict(60)).toBe("conditional");

      // < 60 -> veto
      expect(calculatePersonaVerdict(59)).toBe("veto");
      expect(calculatePersonaVerdict(45)).toBe("veto");
      expect(calculatePersonaVerdict(0)).toBe("veto");
    });
  });

  // =========================================================================
  // 3. Council Alignment Index Calculation
  // =========================================================================
  describe("Council Alignment Index Calculation", () => {
    it("yields exactly 100% when there is zero score variance and zero vetoes", () => {
      expect(calculateCouncilAlignmentIndex([90, 90, 90, 90], 0)).toBe(100);
      expect(calculateCouncilAlignmentIndex([75, 75, 75], 0)).toBe(100);
    });

    it("applies deterministic penalties for active vetoes even with zero variance", () => {
      const zeroVeto = calculateCouncilAlignmentIndex([70, 70, 70], 0);
      const oneVeto = calculateCouncilAlignmentIndex([70, 70, 70], 1);
      const twoVetoes = calculateCouncilAlignmentIndex([70, 70, 70], 2);

      expect(zeroVeto).toBe(100);
      expect(oneVeto).toBe(88); // 100 - (1 * 12)
      expect(twoVetoes).toBe(76); // 100 - (2 * 12)
      expect(oneVeto).toBeLessThan(zeroVeto);
      expect(twoVetoes).toBeLessThan(oneVeto);
    });

    it("heavily diminishes alignment index in high-variance polarized scenarios", () => {
      const polarizedScores = [95, 25, 90, 30]; // Strong disagreement
      const alignment = calculateCouncilAlignmentIndex(polarizedScores, 2);
      expect(alignment).toBeLessThan(50);
      expect(alignment).toBeGreaterThanOrEqual(0);
    });

    it("handles edge cases: empty array and single-member councils", () => {
      expect(calculateCouncilAlignmentIndex([])).toBe(0);
      expect(calculateCouncilAlignmentIndex([85], 0)).toBe(100);
      expect(calculateCouncilAlignmentIndex([45], 1)).toBe(75); // 100 - (1 * 25)
    });

    it("strictly clamps alignment index between 0 and 100", () => {
      const extremeLow = calculateCouncilAlignmentIndex([100, 0, 100, 0, 0], 5);
      expect(extremeLow).toBeGreaterThanOrEqual(0);
      expect(extremeLow).toBeLessThanOrEqual(100);
    });
  });

  // =========================================================================
  // 4. Council Verdict Determination
  // =========================================================================
  describe("Council Verdict Determination", () => {
    it("reaches unanimous_approval when all members approve with high consensus", () => {
      const verdict = determineCouncilVerdict(90, 85, 0, 92);
      expect(verdict).toBe("unanimous_approval");
    });

    it("reaches conditional_consensus when no vetoes exist but approval is not unanimous", () => {
      // Moderate scores without vetoes
      const verdict1 = determineCouncilVerdict(76, 68, 0, 78);
      expect(verdict1).toBe("conditional_consensus");

      // High scores but minScore is conditional (e.g. 75 < 80)
      const verdict2 = determineCouncilVerdict(86, 75, 0, 85);
      expect(verdict2).toBe("conditional_consensus");
    });

    it("reaches divided_council when a single veto exists or alignment is low", () => {
      // Lone veto
      const verdictLoneVeto = determineCouncilVerdict(78, 55, 1, 65);
      expect(verdictLoneVeto).toBe("divided_council");

      // Alignment index < 60 with no vetoes
      const verdictPolarized = determineCouncilVerdict(80, 60, 0, 50);
      expect(verdictPolarized).toBe("divided_council");
    });

    it("reaches rejected_high_risk when multiple vetoes, catastrophic minimum, or failing mean occur", () => {
      // Multiple vetoes
      expect(determineCouncilVerdict(58, 48, 2, 45)).toBe("rejected_high_risk");

      // Minimum score falls below critical safety floor (< 45)
      expect(determineCouncilVerdict(72, 40, 1, 60)).toBe("rejected_high_risk");

      // Failing overall mean (< 55)
      expect(determineCouncilVerdict(52, 50, 0, 80)).toBe("rejected_high_risk");
    });
  });

  // =========================================================================
  // 5. Deterministic Hash Function
  // =========================================================================
  describe("Deterministic Hash Function", () => {
    it("produces identical 32-bit positive integers for identical inputs", () => {
      const hash1 = deterministicHash("kafka-microservices-eval");
      const hash2 = deterministicHash("kafka-microservices-eval");
      expect(hash1).toBe(hash2);
      expect(hash1).toBeGreaterThanOrEqual(0);
    });

    it("produces distinct outputs for different inputs", () => {
      const hA = deterministicHash("tech-architect");
      const hB = deterministicHash("security-ciso");
      expect(hA).not.toBe(hB);
    });
  });

  // =========================================================================
  // 6. Full analyzePersonaCouncil Generation
  // =========================================================================
  describe("analyzePersonaCouncil Generation", () => {
    const realisticTopic =
      "Migrating monolithic core banking platform to event-driven Kafka and distributed microservices with multi-region active-active deployment";
    const realisticContext =
      "System operates under zero-trust mTLS encryption, SOC2 and PCI-DSS compliance, automated FinOps budget controls, and 50,000 TPS capacity.";

    it("generates a complete, structurally compliant PersonaCouncilArtifact", () => {
      const council: PersonaCouncilArtifact = analyzePersonaCouncil(
        realisticTopic,
        realisticContext,
      );

      expect(council).toBeDefined();
      expect(council.topic).toBe(realisticTopic);
      expect(council.alignmentIndex).toBeGreaterThanOrEqual(0);
      expect(council.alignmentIndex).toBeLessThanOrEqual(100);
      expect(council.meanScore).toBeGreaterThanOrEqual(0);
      expect(council.meanScore).toBeLessThanOrEqual(100);
      expect(council.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

      // Verifies 5 default specialist personas
      expect(council.reviews).toHaveLength(5);
      const personaIds = council.reviews.map((r) => r.personaId);
      expect(personaIds).toContain("tech-architect");
      expect(personaIds).toContain("security-ciso");
      expect(personaIds).toContain("financial-analyst");
      expect(personaIds).toContain("market-analyst");
      expect(personaIds).toContain("academic-critic");

      // Verifies review fields
      for (const review of council.reviews) {
        expect(review.personaName).toBeTruthy();
        expect(review.roleTitle).toBeTruthy();
        expect(review.avatarIcon).toBeTruthy();
        expect(review.score).toBeGreaterThanOrEqual(0);
        expect(review.score).toBeLessThanOrEqual(100);
        expect(["A+", "A", "B", "C", "D", "F"]).toContain(review.grade);
        expect(["approve", "conditional", "veto"]).toContain(review.verdict);
        expect(review.coreEndorsement.length).toBeGreaterThan(10);
        expect(review.criteriaScores.length).toBeGreaterThanOrEqual(3);
        expect(review.nonNegotiables.length).toBeGreaterThanOrEqual(1);

        // Sum of criteria weights is approximately 1.0
        const totalWeight = review.criteriaScores.reduce(
          (sum, c) => sum + c.weight,
          0,
        );
        expect(totalWeight).toBeCloseTo(1.0, 1);
      }

      // Verifies synthesis fields
      expect(council.verdictSummary.length).toBeGreaterThan(20);
      expect(council.strategicCompromise.length).toBeGreaterThan(20);
      expect(council.actionItems.length).toBeGreaterThanOrEqual(1);
    });

    it("is 100% deterministic and reproducible across multiple invocations", () => {
      const runA = analyzePersonaCouncil(realisticTopic, realisticContext);
      const runB = analyzePersonaCouncil(realisticTopic, realisticContext);

      expect(runA.alignmentIndex).toBe(runB.alignmentIndex);
      expect(runA.meanScore).toBe(runB.meanScore);
      expect(runA.councilVerdict).toBe(runB.councilVerdict);
      expect(runA.verdictSummary).toBe(runB.verdictSummary);
      expect(runA.strategicCompromise).toBe(runB.strategicCompromise);
      expect(runA.reviews.length).toBe(runB.reviews.length);

      for (let i = 0; i < runA.reviews.length; i++) {
        expect(runA.reviews[i].score).toBe(runB.reviews[i].score);
        expect(runA.reviews[i].grade).toBe(runB.reviews[i].grade);
        expect(runA.reviews[i].verdict).toBe(runB.reviews[i].verdict);
        expect(runA.reviews[i].coreEndorsement).toBe(
          runB.reviews[i].coreEndorsement,
        );
      }
    });

    it("detects fatal blindspots and issues vetoes in high-risk scenarios", () => {
      const highRiskTopic =
        "Deploying unauthenticated and unencrypted cleartext data pipeline over public internet with single point of failure and unbounded cloud spend";
      const council = analyzePersonaCouncil(highRiskTopic);

      // CISO or Architect should veto this dangerous proposal
      const vetoReviews = council.reviews.filter((r) => r.verdict === "veto");
      expect(vetoReviews.length).toBeGreaterThanOrEqual(1);

      // Council should reject high risk
      expect(council.councilVerdict).toBe("rejected_high_risk");

      // Fatal blindspots must be detected
      expect(council.fatalBlindspots.length).toBeGreaterThanOrEqual(1);
      const criticalBlindspots = council.fatalBlindspots.filter(
        (b) => b.severity === "critical",
      );
      expect(criticalBlindspots.length).toBeGreaterThanOrEqual(1);

      // Verify blindspot fields
      const blindspot = council.fatalBlindspots[0];
      expect(blindspot.dimension).toBeTruthy();
      expect(blindspot.flaggedBy).toBeTruthy();
      expect(blindspot.risk).toBeTruthy();
      expect(blindspot.mitigation).toBeTruthy();

      // Action items must contain the critical mitigation
      expect(
        council.actionItems.some((item) => item.includes("[CRITICAL]")),
      ).toBe(true);
    });
  });

  // =========================================================================
  // 7. Edge Cases
  // =========================================================================
  describe("Edge Cases", () => {
    it("handles empty or whitespace-only topic gracefully", () => {
      const council = analyzePersonaCouncil("   ");
      expect(council.topic).toBe("Untitled System Architecture");
      expect(council.reviews.length).toBe(5);
      expect(council.alignmentIndex).toBeGreaterThanOrEqual(0);
      expect(council.meanScore).toBeGreaterThanOrEqual(0);
    });

    it("evaluates a custom single-persona council correctly", () => {
      const singlePersona: AgentPersona = {
        id: "custom-safety-lead",
        name: "AI Safety Officer",
        icon: "Shield",
        roleTitle: "Lead Alignment & Safety Researcher",
        description: "Evaluates catastrophic risks and alignment verification.",
        systemPrompt: "Audit safety constraints and kill-switch governance.",
        defaultBudget: "deep",
        verificationThreshold: 90,
        isCustom: true,
      };

      const council = analyzePersonaCouncil(
        "Autonomous recursive self-improvement agent loop",
        "Agent has full execution privileges with zero human in the loop",
        [singlePersona],
      );

      expect(council.reviews).toHaveLength(1);
      expect(council.reviews[0].personaId).toBe("custom-safety-lead");
      expect(council.reviews[0].personaName).toBe("AI Safety Officer");
      expect(council.reviews[0].roleTitle).toBe(
        "Lead Alignment & Safety Researcher",
      );
      expect(council.alignmentIndex).toBeGreaterThanOrEqual(0);
      expect(council.alignmentIndex).toBeLessThanOrEqual(100);
      expect(council.actionItems.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // 8. RFC 4180 CSV Export Compliance
  // =========================================================================
  describe("RFC 4180 CSV Export Compliance", () => {
    it("escapes CSV cells strictly according to RFC 4180", () => {
      expect(escapeCsvCell(null)).toBe("");
      expect(escapeCsvCell(undefined)).toBe("");
      expect(escapeCsvCell("NormalText")).toBe("NormalText");
      expect(escapeCsvCell(123)).toBe("123");

      // Comma requires double quotes
      expect(escapeCsvCell("Kafka, Redis")).toBe('"Kafka, Redis"');

      // Double quote requires escaped pair ""
      expect(escapeCsvCell('The "Best" Model')).toBe('"The ""Best"" Model"');

      // Newline requires double quotes
      expect(escapeCsvCell("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
      expect(escapeCsvCell("Line 1\r\nLine 2")).toBe('"Line 1\r\nLine 2"');
    });

    it("generates an RFC 4180 compliant CSV document with CRLF line endings", () => {
      const council = analyzePersonaCouncil(
        'Testing "Complex" Architectural Topic, with commas and quotes',
        "Operational context here",
      );

      const csv = personaCouncilToCsv(council);
      expect(csv).toContain("\r\n");

      const lines = csv.split("\r\n").filter(Boolean);
      expect(lines.length).toBeGreaterThan(10);

      // Header row
      expect(lines[0]).toBe(
        "Record Type,Persona / Category,Role / Dimension,Score,Grade / Severity,Verdict / Status,Core Analysis,Details / Items",
      );

      // Check record types exist
      expect(csv).toContain("Council Summary");
      expect(csv).toContain("Persona Review");
      expect(csv).toContain("Criteria Evaluation");
      expect(csv).toContain("Action Item");
    });
  });

  // =========================================================================
  // 9. Markdown Export Formatting
  // =========================================================================
  describe("Markdown Export Formatting", () => {
    it("generates an executive markdown briefing with all required sections", () => {
      const council = analyzePersonaCouncil(
        "Adopting Bun and Next.js 15 for Real-Time Financial Trading Terminal",
        "Targeting sub-5ms rendering with high throughput WebSocket feeds.",
      );

      const markdown = personaCouncilToMarkdown(council);

      // Verdict banner & Executive summary
      expect(markdown).toContain(
        "# Executive Council Briefing: Adopting Bun and Next.js 15 for Real-Time Financial Trading Terminal",
      );
      expect(markdown).toContain("> **Council Verdict:**");
      expect(markdown).toContain("## Executive Summary");

      // Summary table
      expect(markdown).toContain("## Persona Scorecard Overview");
      expect(markdown).toContain(
        "| Persona | Role | Score | Grade | Verdict | Core Endorsement |",
      );
      expect(markdown).toContain("| :--- | :--- | :--- | :--- | :--- | :--- |");

      // Detailed scorecards
      expect(markdown).toContain("## Detailed Specialist Scorecards");
      expect(markdown).toContain("Principal Systems Architect");
      expect(markdown).toContain("Chief Information Security Officer");
      expect(markdown).toContain("| Evaluation Criterion | Score | Weight |");

      // Fatal blindspots
      expect(markdown).toContain(
        "## Fatal Blindspots & Critical Vulnerabilities",
      );

      // Strategic compromise
      expect(markdown).toContain("## Strategic Compromise & Synthesis");

      // Action items checklist
      expect(markdown).toContain("## Executive Action Items Checklist");
      expect(markdown).toContain("- [ ] ");
    });
  });

  // =========================================================================
  // 10. Strict Audit: ZERO Math.random() & Documentation Integrity
  // =========================================================================
  describe("Zero Math.random() & Code Quality Verification", () => {
    it("strictly asserts that persona-studio.ts does NOT contain Math.random()", () => {
      const sourcePath = join(
        process.cwd(),
        "src/lib/research/persona-studio.ts",
      );
      const sourceCode = readFileSync(sourcePath, "utf-8");

      expect(sourceCode).not.toContain("Math.random");
      expect(sourceCode).not.toContain("Math.random()");
    });
  });
});
