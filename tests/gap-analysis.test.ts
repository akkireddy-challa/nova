import { describe, it, expect } from "bun:test";
import {
  generateGapAnalysis,
  gapAnalysisToCsv,
  gapAnalysisToMarkdown,
  getCriterionScore,
} from "@/lib/research/gap-analysis";

describe("Competitive Matrix & Feature Gap Analysis Engine", () => {
  const sampleMatrix = {
    topic: "Cloud Provider Architecture",
    criteria: [
      { id: "c1", name: "Latency", weight: 3 },
      { id: "c2", name: "Throughput", weight: 2 },
      { id: "c3", name: "Pricing", weight: 1 },
    ],
    options: [
      {
        id: "opt-1",
        name: "Option A",
        scores: { c1: 9.5, c2: 8.0, c3: 3.5 },
      },
      {
        id: "opt-2",
        name: "Option B",
        scores: { c1: 7.0, c2: 8.0, c3: 8.5 },
      },
      {
        id: "opt-3",
        name: "Option C",
        scores: { c1: 6.0, c2: 4.0, c3: 9.0 },
      },
    ],
  };

  describe("getCriterionScore", () => {
    it("retrieves scores by criterion ID", () => {
      const score = getCriterionScore(
        { latency_id: 8.5 },
        { id: "latency_id", name: "Latency" },
      );
      expect(score).toBe(8.5);
    });

    it("retrieves scores by criterion name fallback", () => {
      const score = getCriterionScore({ Latency: 9.0 }, { name: "Latency" });
      expect(score).toBe(9.0);
    });

    it("retrieves scores case-insensitively", () => {
      const score = getCriterionScore({ latency: 7.2 }, { name: "Latency" });
      expect(score).toBe(7.2);
    });

    it("returns 0 for missing or undefined scores safely", () => {
      expect(getCriterionScore(undefined, { name: "Speed" })).toBe(0);
      expect(getCriterionScore({}, { name: "Speed" })).toBe(0);
    });
  });

  describe("Criteria Statistics Calculation", () => {
    it("computes accurate means, spreads, leaders, and laggards", () => {
      const report = generateGapAnalysis(sampleMatrix);

      // Verify Latency criterion: [9.5, 7.0, 6.0]
      const latencyStat = report.criteriaStats.find(
        (c) => c.criterionName === "Latency",
      );
      expect(latencyStat).toBeDefined();
      expect(latencyStat?.weight).toBe(3);
      // (9.5 + 7.0 + 6.0) / 3 = 22.5 / 3 = 7.5
      expect(latencyStat?.mean).toBe(7.5);
      expect(latencyStat?.leader).toEqual({ name: "Option A", score: 9.5 });
      expect(latencyStat?.laggard).toEqual({ name: "Option C", score: 6.0 });
      // Spread: 9.5 - 6.0 = 3.5
      expect(latencyStat?.spread).toBe(3.5);

      // Verify Throughput criterion: [8.0, 8.0, 4.0]
      const throughputStat = report.criteriaStats.find(
        (c) => c.criterionName === "Throughput",
      );
      expect(throughputStat).toBeDefined();
      // (8.0 + 8.0 + 4.0) / 3 = 20 / 3 = 6.67
      expect(throughputStat?.mean).toBe(6.67);
      expect(throughputStat?.spread).toBe(4.0);
      expect(throughputStat?.laggard).toEqual({ name: "Option C", score: 4.0 });

      // Verify Pricing criterion: [3.5, 8.5, 9.0]
      const pricingStat = report.criteriaStats.find(
        (c) => c.criterionName === "Pricing",
      );
      expect(pricingStat).toBeDefined();
      expect(pricingStat?.leader).toEqual({ name: "Option C", score: 9.0 });
      expect(pricingStat?.laggard).toEqual({ name: "Option A", score: 3.5 });
      expect(pricingStat?.spread).toBe(5.5);
    });

    it("identifies the highest spread and most contested criteria", () => {
      const report = generateGapAnalysis(sampleMatrix);
      expect(report.summary.highestSpreadCriterion.name).toBe("Pricing");
      expect(report.summary.highestSpreadCriterion.spread).toBe(5.5);
      expect(report.summary.mostContestedCriterion.name).toBe("Latency");
      expect(report.summary.mostContestedCriterion.spread).toBe(3.5);
    });
  });

  describe("Differentiating Moat Detection", () => {
    it("detects moats where an option score >= 9.0", () => {
      const report = generateGapAnalysis(sampleMatrix);

      // Option A has 9.5 in Latency (score >= 9.0)
      const moatA = report.moats.find(
        (m) => m.optionName === "Option A" && m.criterionName === "Latency",
      );
      expect(moatA).toBeDefined();
      expect(moatA?.score).toBe(9.5);
      expect(moatA?.significance).toBe("dominant");

      // Option C has 9.0 in Pricing (score >= 9.0)
      const moatC = report.moats.find(
        (m) => m.optionName === "Option C" && m.criterionName === "Pricing",
      );
      expect(moatC).toBeDefined();
      expect(moatC?.score).toBe(9.0);
    });

    it("detects moats where an option leads the second-place contender by >= 15%", () => {
      // Create a scenario where score < 9.0, but lead is >= 15%
      const matrix = {
        criteria: [{ name: "Developer Velocity", weight: 2 }],
        options: [
          { name: "Framework X", scores: { "Developer Velocity": 8.0 } },
          { name: "Framework Y", scores: { "Developer Velocity": 6.0 } },
        ],
      };
      const report = generateGapAnalysis(matrix);

      // (8.0 - 6.0) / 6.0 = 33.3% lead, which is >= 15%
      const moat = report.moats.find((m) => m.optionName === "Framework X");
      expect(moat).toBeDefined();
      expect(moat?.leadMargin).toBe(2.0);
      expect(moat?.leadPercent).toBe(33.3);
      expect(moat?.secondPlaceContender?.name).toBe("Framework Y");
    });

    it("does not award a moat when lead is below 15% and score is below 9.0", () => {
      const matrix = {
        criteria: [{ name: "Reliability", weight: 2 }],
        options: [
          { name: "Alpha", scores: { Reliability: 7.5 } },
          { name: "Beta", scores: { Reliability: 7.0 } },
        ],
      };
      const report = generateGapAnalysis(matrix);
      // Lead is 0.5 / 7.0 = 7.1% (< 15%), score is 7.5 (< 9.0)
      expect(report.moats.length).toBe(0);
    });

    it("awards moats to both contenders if both achieve score >= 9.0", () => {
      const matrix = {
        criteria: [{ name: "Security", weight: 3 }],
        options: [
          { name: "Vault A", scores: { Security: 9.8 } },
          { name: "Vault B", scores: { Security: 9.2 } },
        ],
      };
      const report = generateGapAnalysis(matrix);
      expect(report.moats.some((m) => m.optionName === "Vault A")).toBe(true);
      expect(report.moats.some((m) => m.optionName === "Vault B")).toBe(true);
    });
  });

  describe("Critical Vulnerability Detection", () => {
    it("detects vulnerabilities where score <= 4.0", () => {
      const report = generateGapAnalysis(sampleMatrix);

      // Option A has 3.5 in Pricing (<= 4.0)
      const vulnA = report.vulnerabilities.find(
        (v) => v.optionName === "Option A" && v.criterionName === "Pricing",
      );
      expect(vulnA).toBeDefined();
      expect(vulnA?.score).toBe(3.5);
      expect(vulnA?.severity).toBe("critical");

      // Option C has 4.0 in Throughput (<= 4.0)
      const vulnC = report.vulnerabilities.find(
        (v) => v.optionName === "Option C" && v.criterionName === "Throughput",
      );
      expect(vulnC).toBeDefined();
      expect(vulnC?.score).toBe(4.0);
    });

    it("detects vulnerabilities where an option falls >= 20% below average", () => {
      const matrix = {
        criteria: [{ name: "Response Time", weight: 2 }],
        options: [
          { name: "System 1", scores: { "Response Time": 9.0 } },
          { name: "System 2", scores: { "Response Time": 8.0 } },
          { name: "System 3", scores: { "Response Time": 5.0 } },
        ],
      };
      // Mean: (9 + 8 + 5) / 3 = 7.33
      // Deficit for System 3: (7.33 - 5.0) / 7.33 = 31.8% >= 20%
      const report = generateGapAnalysis(matrix);
      const vuln = report.vulnerabilities.find(
        (v) => v.optionName === "System 3",
      );
      expect(vuln).toBeDefined();
      expect(vuln?.deficitPercent).toBeGreaterThanOrEqual(20);
    });

    it("does not flag options scoring close to average and above 4.0", () => {
      const matrix = {
        criteria: [{ name: "Uptime", weight: 2 }],
        options: [
          { name: "Node A", scores: { Uptime: 8.0 } },
          { name: "Node B", scores: { Uptime: 7.5 } },
          { name: "Node C", scores: { Uptime: 7.0 } },
        ],
      };
      // Mean: 7.5, Node C is (7.5-7.0)/7.5 = 6.7% below average (< 20%)
      const report = generateGapAnalysis(matrix);
      expect(report.vulnerabilities.length).toBe(0);
    });
  });

  describe("Strategic Recommendation Generation", () => {
    it("generates prioritized recommendations addressing vulnerabilities against benchmark leaders", () => {
      const report = generateGapAnalysis(sampleMatrix);

      // Option A trails Option C in Pricing (weight 1)
      const recA = report.recommendations.find(
        (r) => r.targetOption === "Option A" && r.criterionName === "Pricing",
      );
      expect(recA).toBeDefined();
      expect(recA?.benchmarkOption).toBe("Option C");
      expect(recA?.action).toBe(
        "Option A should address Pricing vulnerability to match Option C",
      );

      // Option C trails Option A and B in Throughput (weight 2)
      const recC = report.recommendations.find(
        (r) =>
          r.targetOption === "Option C" && r.criterionName === "Throughput",
      );
      expect(recC).toBeDefined();
      expect(recC?.action).toContain(
        "Option C should address Throughput vulnerability to match Option A",
      );
    });

    it("assigns High Priority to heavy-weighted criteria or severe score gaps", () => {
      const matrix = {
        criteria: [{ name: "Enterprise Security", weight: 8 }],
        options: [
          { name: "Product A", scores: { "Enterprise Security": 9.5 } },
          { name: "Product B", scores: { "Enterprise Security": 2.5 } },
        ],
      };
      const report = generateGapAnalysis(matrix);
      const rec = report.recommendations[0];
      expect(rec).toBeDefined();
      expect(rec.priority).toBe("High Priority");
      expect(rec.targetOption).toBe("Product B");
      expect(rec.benchmarkOption).toBe("Product A");
      expect(rec.action).toBe(
        "Product B should address Enterprise Security vulnerability to match Product A",
      );
    });
  });

  describe("Strategic Tradeoff Insights", () => {
    it("generates battleground, dominance, and compromise insights deterministically", () => {
      const report = generateGapAnalysis(sampleMatrix);
      expect(report.tradeoffs.length).toBeGreaterThan(0);

      // Battleground should highlight Pricing (highest spread: 5.5)
      const battleground = report.tradeoffs.find(
        (t) => t.type === "battleground",
      );
      expect(battleground).toBeDefined();
      expect(battleground?.criterionName).toBe("Pricing");
    });
  });

  describe("Report Export Utilities", () => {
    it("exports valid RFC 4180 CSV containing criteria, moats, vulnerabilities, and roadmap", () => {
      const report = generateGapAnalysis(sampleMatrix);
      const csv = gapAnalysisToCsv(report);

      expect(csv).toContain("Section,Criterion,Option,Score");
      expect(csv).toContain("Criteria Overview,Latency,Option A");
      expect(csv).toContain("Differentiating Moat");
      expect(csv).toContain("Critical Vulnerability");
      expect(csv).toContain("Action Roadmap");
    });

    it("exports clean markdown summary with benchmark tables and action items", () => {
      const report = generateGapAnalysis(sampleMatrix);
      const md = gapAnalysisToMarkdown(report);

      expect(md).toContain(
        "# Competitive Gap Analysis: Cloud Provider Architecture",
      );
      expect(md).toContain("| Criterion | Weight | Category Mean | Leader |");
      expect(md).toContain("## Differentiating Moats & Asymmetric Strengths");
      expect(md).toContain("## Critical Vulnerabilities & Risks");
      expect(md).toContain("## Strategic Action Items Roadmap");
    });
  });

  describe("Boundary and Edge Case Robustness", () => {
    it("handles an empty options list safely without errors", () => {
      const report = generateGapAnalysis({
        criteria: [{ name: "Speed", weight: 1 }],
        options: [],
      });
      expect(report.criteriaStats.length).toBe(0);
      expect(report.moats.length).toBe(0);
      expect(report.vulnerabilities.length).toBe(0);
    });

    it("handles an empty criteria list safely without errors", () => {
      const report = generateGapAnalysis({
        criteria: [],
        options: [{ name: "Opt 1", scores: {} }],
      });
      expect(report.criteriaStats.length).toBe(0);
      expect(report.summary.totalCriteria).toBe(0);
    });

    it("handles single-option matrices without division by zero", () => {
      const report = generateGapAnalysis({
        criteria: [{ name: "Speed", weight: 5 }],
        options: [{ name: "Solo", scores: { Speed: 9.5 } }],
      });
      expect(report.criteriaStats[0].mean).toBe(9.5);
      expect(report.criteriaStats[0].spread).toBe(0);
      expect(report.moats[0].optionName).toBe("Solo");
    });

    it("operates strictly deterministically with zero Math.random()", () => {
      const report1 = generateGapAnalysis(sampleMatrix);
      const report2 = generateGapAnalysis(sampleMatrix);
      expect(JSON.stringify(report1)).toBe(JSON.stringify(report2));
    });
  });

  describe("Component Structure & SSR Assertions", () => {
    it("renders GapAnalysisCard with moats, vulnerabilities, roadmap, and action buttons", async () => {
      const React = await import("react");
      const { renderToString } = await import("react-dom/server");
      const { GapAnalysisCard } =
        await import("@/components/GenerativeCards/GapAnalysisCard");

      const html = renderToString(
        React.createElement(GapAnalysisCard, { matrix: sampleMatrix }),
      );

      // Verify core titles and sections
      expect(html).toContain("Cloud Provider Architecture");
      expect(html).toContain("Gap Engine");
      expect(html).toContain("Moats &amp; Differentiators");
      expect(html).toContain("Vulnerabilities &amp; Competitor Risks");
      expect(html).toContain("Strategic Action Items Roadmap");

      // Verify action buttons
      expect(html).toContain("Export Gap Analysis (.csv)");
      expect(html).toContain("Copy Markdown Summary");

      // Verify view mode buttons
      expect(html).toContain("Feature Bars");
      expect(html).toContain("Radar Topology");

      // Verify moats content
      expect(html).toContain("Option A");
      expect(html).toContain("Pricing");

      // Verify priority pill
      expect(html).toContain("High Priority");
    });

    it("renders GapAnalysisCard fallback state when matrix is missing or empty", async () => {
      const React = await import("react");
      const { renderToString } = await import("react-dom/server");
      const { GapAnalysisCard } =
        await import("@/components/GenerativeCards/GapAnalysisCard");

      const html = renderToString(
        React.createElement(GapAnalysisCard, {
          matrix: { criteria: [], options: [] },
        }),
      );

      expect(html).toContain(
        "Insufficient criteria data to synthesize gap analysis.",
      );
    });

    it("renders DecisionMatrixCard with [Matrix Overview] and [Deep Gap Analysis] tab switcher", async () => {
      const React = await import("react");
      const { renderToString } = await import("react-dom/server");
      const { DecisionMatrixCard } =
        await import("@/components/GenerativeCards/DecisionMatrixCard");

      const fullDecisionMatrix = {
        topic: "API Gateway Evaluation",
        criteria: [
          { id: "c1", name: "Latency", weight: 4 },
          { id: "c2", name: "Cost", weight: 2 },
        ],
        options: [
          {
            id: "opt-1",
            name: "Kong",
            scores: { c1: 9.0, c2: 6.0 },
            pros: ["Plugin ecosystem"],
            cons: ["Resource heavy"],
            totalWeightedScore: 8.0,
          },
          {
            id: "opt-2",
            name: "Envoy",
            scores: { c1: 9.5, c2: 8.0 },
            pros: ["Blazing fast C++ core"],
            cons: ["Steep learning curve"],
            totalWeightedScore: 9.0,
          },
        ],
        verdict: "Envoy leads overall for high-throughput microservices.",
      };

      const html = renderToString(
        React.createElement(DecisionMatrixCard, { matrix: fullDecisionMatrix }),
      );

      // Verify Tab switcher buttons
      expect(html).toContain("Matrix Overview");
      expect(html).toContain("Deep Gap Analysis");

      // Verify winner badge
      expect(html).toContain("Top Choice:");
      expect(html).toContain("Envoy");

      // Verify weight sliders
      expect(html).toContain(
        "Adjust Criteria Priority (Dynamic Recalculation)",
      );
      expect(html).toContain("Latency");
      expect(html).toContain("Cost");

      // Verify Export CSV
      expect(html).toContain("Export CSV");
    });

    it("ensures zero Math.random() in gap analysis source files", async () => {
      const { readFileSync } = await import("fs");
      const { join } = await import("path");

      const gapSource = readFileSync(
        join(process.cwd(), "src/lib/research/gap-analysis.ts"),
        "utf-8",
      );
      const cardSource = readFileSync(
        join(
          process.cwd(),
          "src/components/GenerativeCards/GapAnalysisCard.tsx",
        ),
        "utf-8",
      );
      const matrixCardSource = readFileSync(
        join(
          process.cwd(),
          "src/components/GenerativeCards/DecisionMatrixCard.tsx",
        ),
        "utf-8",
      );

      expect(gapSource).not.toMatch(/Math\.random\s*\(/);
      expect(cardSource).not.toMatch(/Math\.random\s*\(/);
      expect(matrixCardSource).not.toMatch(/Math\.random\s*\(/);
    });
  });
});
