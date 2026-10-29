import { describe, it, expect } from "bun:test";
import fs from "fs";
import path from "path";
import {
  calculateDimensionScore,
  calculateMoatScore,
  extractWinThemes,
  synthesizeBattleCardFromResearch,
  battleCardToCsv,
  battleCardToMarkdown,
  escapeCsvCell,
  DEFAULT_COMPETITORS,
  DEFAULT_DIMENSIONS,
} from "@/lib/competitive/battle-card";
import type { CompetitiveDimension, CompetitorProfile } from "@/lib/types";

describe("Competitive Feature Matrix & Battle-Card Engine", () => {
  const sampleDimension: CompetitiveDimension = {
    dimensionKey: "resilience",
    label: "Chaos Resilience & Circuit Breakers",
    category: "architecture",
    weight: 0.9,
    novaRating: 5,
    novaNote:
      "Pure 3-state circuit breaker with discrete event queue simulation",
    competitorRatings: {
      "LegacyCorp Orchestrator": {
        rating: 2,
        note: "Cascades failure during API rate limits",
      },
      "FastAgent Cloud": {
        rating: 2,
        note: "Throws raw 500 errors on quota exhaust",
      },
    },
  };

  describe("calculateDimensionScore", () => {
    it("computes exact score difference and assigns nova advantage", () => {
      const result = calculateDimensionScore(
        sampleDimension,
        "LegacyCorp Orchestrator",
      );
      expect(result.novaScore).toBe(5);
      expect(result.competitorScore).toBe(2);
      expect(result.gap).toBe(3);
      expect(result.advantage).toBe("nova");
    });

    it("matches competitor names case-insensitively", () => {
      const result = calculateDimensionScore(
        sampleDimension,
        "legacycorp orchestrator",
      );
      expect(result.competitorScore).toBe(2);
      expect(result.advantage).toBe("nova");
    });

    it("falls back to default rating 3 when competitor is unknown", () => {
      const result = calculateDimensionScore(
        sampleDimension,
        "Unknown Competitor",
      );
      expect(result.competitorScore).toBe(3);
      expect(result.gap).toBe(2);
    });
  });

  describe("calculateMoatScore", () => {
    it("returns safe defaults when dimensions array is empty", () => {
      const emptyResult = calculateMoatScore([]);
      expect(emptyResult.novaScore).toBe(0);
      expect(emptyResult.competitorScore).toBe(0);
      expect(emptyResult.moatGap).toBe(0);
      expect(emptyResult.moatScore).toBe(50);
      expect(emptyResult.advantageCount).toBe(0);
    });

    it("computes weighted moat score across default dimensions", () => {
      const result = calculateMoatScore(DEFAULT_DIMENSIONS);
      expect(result.novaScore).toBe(5);
      expect(result.competitorScore).toBeGreaterThan(1);
      expect(result.competitorScore).toBeLessThan(4);
      expect(result.moatGap).toBeGreaterThan(1);
      expect(result.moatScore).toBeGreaterThanOrEqual(75);
      expect(result.advantageCount).toBe(DEFAULT_DIMENSIONS.length);
      expect(result.gapCount).toBe(0);
    });

    it("computes specific competitor moat score accurately", () => {
      const result = calculateMoatScore(DEFAULT_DIMENSIONS, "FastAgent Cloud");
      expect(result.moatGap).toBeGreaterThan(2);
      expect(result.moatScore).toBeGreaterThanOrEqual(80);
    });
  });

  describe("extractWinThemes", () => {
    it("extracts actionable win themes from top dimensions and competitor weaknesses", () => {
      const themes = extractWinThemes(DEFAULT_DIMENSIONS, DEFAULT_COMPETITORS);
      expect(themes.length).toBeGreaterThanOrEqual(4);
      expect(themes.some((t) => t.includes("Deterministic Verification"))).toBe(
        true,
      );
      expect(themes.some((t) => t.includes("Architectural Moat vs"))).toBe(
        true,
      );
    });

    it("returns a sensible default theme if no high-rating dimensions exist", () => {
      const weakDims: CompetitiveDimension[] = [
        {
          dimensionKey: "misc",
          label: "Miscellaneous",
          category: "cost",
          weight: 0.5,
          novaRating: 2,
          novaNote: "Work in progress",
          competitorRatings: {},
        },
      ];
      const emptyComps: CompetitorProfile[] = [];
      const themes = extractWinThemes(weakDims, emptyComps);
      expect(themes.length).toBe(1);
      expect(themes[0]).toContain("Deterministic Multi-Agent Orchestration");
    });
  });

  describe("synthesizeBattleCardFromResearch", () => {
    it("creates a populated battle-card artifact from string topic", () => {
      const card = synthesizeBattleCardFromResearch(
        "Global Financial Distributed Ledger",
      );
      expect(card.id).toContain("battlecard-global-financial");
      expect(card.topic).toBe("Global Financial Distributed Ledger");
      expect(card.novaMoatScore).toBeGreaterThanOrEqual(75);
      expect(card.dimensions.length).toBe(DEFAULT_DIMENSIONS.length);
      expect(card.competitorProfiles.length).toBe(DEFAULT_COMPETITORS.length);
      expect(card.keyWinThemes.length).toBeGreaterThan(0);
    });

    it("creates a battle-card artifact from research object", () => {
      const card = synthesizeBattleCardFromResearch({
        title: "Cloud Infrastructure Resilience",
        executiveSummary:
          "Enterprise mission-critical multi-region orchestration.",
      });
      expect(card.topic).toBe("Cloud Infrastructure Resilience");
      expect(card.strategicSummary).toBe(
        "Enterprise mission-critical multi-region orchestration.",
      );
    });
  });

  describe("RFC 4180 CSV & Markdown Exports", () => {
    it("escapes CSV cells with quotes and commas properly", () => {
      expect(escapeCsvCell("simple")).toBe("simple");
      expect(escapeCsvCell('has "quotes"')).toBe('"has ""quotes"""');
      expect(escapeCsvCell("has,comma")).toBe('"has,comma"');
      expect(escapeCsvCell("has\nnewline")).toBe('"has\nnewline"');
    });

    it("exports battle-card to strict RFC 4180 CSV with CRLF line endings", () => {
      const card = synthesizeBattleCardFromResearch("Enterprise LLM Security");
      const csv = battleCardToCsv(card);

      expect(csv.endsWith("\r\n")).toBe(true);
      const lines = csv.split("\r\n").filter((l) => l.trim().length > 0);
      expect(lines.length).toBeGreaterThan(15);

      // Verify headers
      expect(lines[0]).toContain("Record Type,Category / Competitor");

      // Verify CRLF compliance throughout
      const crlfCount = (csv.match(/\r\n/g) || []).length;
      expect(crlfCount).toBe(lines.length);
    });

    it("exports battle-card to formatted Markdown with landmines and objections", () => {
      const card = synthesizeBattleCardFromResearch("Enterprise LLM Security");
      const md = battleCardToMarkdown(card);

      expect(md).toContain("# ⚔️ Competitive Battle-Card & Moat Scorecard");
      expect(md).toContain("## 📋 Strategic Executive Summary");
      expect(md).toContain("## 🏆 Key Win Themes");
      expect(md).toContain("## 📊 Feature Comparison Matrix");
      expect(md).toContain("## 🎯 Competitor Battle-Cards");
      expect(md).toContain("💣 Landmine Discovery Questions");
      expect(md).toContain("🛡️ Objection Handling Script");
    });
  });

  describe("Zero Math.random() & Documentation Integrity", () => {
    it("strictly verifies that battle-card.ts has ZERO Math.random() calls", () => {
      const filePath = path.join(
        process.cwd(),
        "src/lib/competitive/battle-card.ts",
      );
      const source = fs.readFileSync(filePath, "utf-8");
      expect(source).not.toContain("Math.random");
    });
  });
});
