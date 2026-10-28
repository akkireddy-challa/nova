import { describe, it, expect } from "bun:test";
import {
  calculateNormalizedWeights,
  recalculateOptionScores,
  escapeCsvCell,
  tableToCsv,
  chartDataToCsv,
  matrixToCsv,
  getLanguageExtension,
  resolveCodeFilename,
} from "@/lib/matrix-calculator";

describe("Decision Matrix Calculation & Weight Normalization", () => {
  it("normalizes weights to percentages summing to 100%", () => {
    const criteria = [
      { name: "Performance", weight: 3 },
      { name: "Cost", weight: 1 },
    ];
    const normalized = calculateNormalizedWeights(criteria);

    expect(normalized).toEqual([
      { name: "Performance", weight: 3, percentage: 75 },
      { name: "Cost", weight: 1, percentage: 25 },
    ]);
  });

  it("handles a single criterion correctly as 100%", () => {
    const criteria = [{ name: "Accuracy", weight: 5 }];
    const normalized = calculateNormalizedWeights(criteria);

    expect(normalized).toEqual([
      { name: "Accuracy", weight: 5, percentage: 100 },
    ]);
  });

  it("handles multiple equal weights with 1-decimal precision", () => {
    const criteria = [
      { name: "Speed", weight: 1 },
      { name: "Reliability", weight: 1 },
      { name: "Simplicity", weight: 1 },
    ];
    const normalized = calculateNormalizedWeights(criteria);

    expect(normalized.map((c) => c.percentage)).toEqual([33.3, 33.3, 33.3]);
  });

  it("handles all-zero weights safely without division by zero or NaN", () => {
    const criteria = [
      { name: "Speed", weight: 0 },
      { name: "Cost", weight: 0 },
    ];
    const normalized = calculateNormalizedWeights(criteria);

    expect(normalized).toEqual([
      { name: "Speed", weight: 0, percentage: 0 },
      { name: "Cost", weight: 0, percentage: 0 },
    ]);
  });

  it("preserves criteria extra attributes such as id", () => {
    const criteria = [
      { id: "c-1", name: "Speed", weight: 4 },
      { id: "c-2", name: "Cost", weight: 1 },
    ];
    const normalized = calculateNormalizedWeights(criteria);

    expect(normalized[0].id).toBe("c-1");
    expect(normalized[0].percentage).toBe(80);
    expect(normalized[1].id).toBe("c-2");
    expect(normalized[1].percentage).toBe(20);
  });

  it("handles empty criteria list gracefully", () => {
    expect(calculateNormalizedWeights([])).toEqual([]);
  });

  it("recalculates option scores accurately based on weights", () => {
    const options = [
      { name: "Option A", scores: { speed: 8, cost: 4 } },
      { name: "Option B", scores: { speed: 5, cost: 9 } },
    ];
    const weights = { speed: 3, cost: 1 };

    // Option A: (8*3 + 4*1)/4 = 28/4 = 7.0
    // Option B: (5*3 + 9*1)/4 = 24/4 = 6.0
    const scored = recalculateOptionScores(options, weights);

    expect(scored[0].name).toBe("Option A");
    expect(scored[0].totalScore).toBe(7.0);
    expect(scored[0].rank).toBe(1);

    expect(scored[1].name).toBe("Option B");
    expect(scored[1].totalScore).toBe(6.0);
    expect(scored[1].rank).toBe(2);
  });

  it("recomputes scores dynamically when weights shift priority", () => {
    const options = [
      { name: "Option A", scores: { speed: 8, cost: 4 } },
      { name: "Option B", scores: { speed: 5, cost: 9 } },
    ];

    // Shift priority to cost (weight 4) over speed (weight 1)
    // Option A: (8*1 + 4*4)/5 = 24/5 = 4.8
    // Option B: (5*1 + 9*4)/5 = 41/5 = 8.2
    const weights = { speed: 1, cost: 4 };
    const scored = recalculateOptionScores(options, weights);

    expect(scored[0].name).toBe("Option B");
    expect(scored[0].totalScore).toBe(8.2);
    expect(scored[0].rank).toBe(1);

    expect(scored[1].name).toBe("Option A");
    expect(scored[1].totalScore).toBe(4.8);
    expect(scored[1].rank).toBe(2);
  });

  it("handles zero total weight without NaN", () => {
    const options = [
      { name: "Option A", scores: { speed: 8 } },
      { name: "Option B", scores: { speed: 6 } },
    ];
    const weights = { speed: 0 };
    const scored = recalculateOptionScores(options, weights);

    expect(scored[0].totalScore).toBe(0);
    expect(scored[1].totalScore).toBe(0);
    expect(scored[0].rank).toBe(1);
    expect(scored[1].rank).toBe(1);
  });

  it("preserves pros, cons, and metadata on options", () => {
    const options = [
      {
        id: "opt-1",
        name: "Cloud Run",
        scores: { latency: 9 },
        pros: ["Fast startup"],
        cons: ["Cold starts"],
      },
    ];
    const scored = recalculateOptionScores(options, { latency: 1 });

    expect(scored[0].id).toBe("opt-1");
    expect(scored[0].pros).toEqual(["Fast startup"]);
    expect(scored[0].cons).toEqual(["Cold starts"]);
  });
});

describe("Rank Assignment & Ties Handling", () => {
  it("assigns standard competition ranks when 1st place is tied (1, 1, 3)", () => {
    const options = [
      { name: "Beta", scores: { score: 8.5 } },
      { name: "Alpha", scores: { score: 8.5 } },
      { name: "Gamma", scores: { score: 6.0 } },
    ];
    const scored = recalculateOptionScores(options, { score: 1 });

    // Deterministic tie-breaker sorts Alpha before Beta
    expect(scored[0].name).toBe("Alpha");
    expect(scored[0].rank).toBe(1);
    expect(scored[0].totalScore).toBe(8.5);

    expect(scored[1].name).toBe("Beta");
    expect(scored[1].rank).toBe(1);
    expect(scored[1].totalScore).toBe(8.5);

    // 3rd item gets rank 3 in standard competition ranking
    expect(scored[2].name).toBe("Gamma");
    expect(scored[2].rank).toBe(3);
    expect(scored[2].totalScore).toBe(6.0);
  });

  it("handles all options tied with rank 1 (1, 1, 1)", () => {
    const options = [
      { name: "Option Z", scores: { score: 7 } },
      { name: "Option Y", scores: { score: 7 } },
      { name: "Option X", scores: { score: 7 } },
    ];
    const scored = recalculateOptionScores(options, { score: 1 });

    expect(scored.map((o) => o.rank)).toEqual([1, 1, 1]);
    expect(scored.map((o) => o.name)).toEqual([
      "Option X",
      "Option Y",
      "Option Z",
    ]);
  });

  it("handles ties at 2nd place (1, 2, 2, 4)", () => {
    const options = [
      { name: "A", scores: { val: 10 } },
      { name: "B", scores: { val: 7 } },
      { name: "C", scores: { val: 7 } },
      { name: "D", scores: { val: 4 } },
    ];
    const scored = recalculateOptionScores(options, { val: 1 });

    expect(scored.map((o) => o.rank)).toEqual([1, 2, 2, 4]);
  });

  it("handles empty options gracefully", () => {
    expect(recalculateOptionScores([], { score: 1 })).toEqual([]);
  });
});

describe("CSV Export String Conversion", () => {
  it("escapes CSV cells with commas, quotes, and newlines properly", () => {
    expect(escapeCsvCell("Simple")).toBe("Simple");
    expect(escapeCsvCell("Hello, World")).toBe('"Hello, World"');
    expect(escapeCsvCell('He said "yes"')).toBe('"He said ""yes"""');
    expect(escapeCsvCell("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(undefined)).toBe("");
    expect(escapeCsvCell(42)).toBe("42");
  });

  it("converts a basic table into RFC 4180 CSV", () => {
    const headers = ["ID", "Name", "Score"];
    const rows = [
      ["1", "Alpha", 95],
      ["2", 'Beta, "Pro"', 88],
    ];
    const csv = tableToCsv(headers, rows);

    expect(csv).toContain("ID,Name,Score\r\n");
    expect(csv).toContain('1,Alpha,95\r\n2,"Beta, ""Pro""",88');
  });

  it("converts chart data into CSV string with headers", () => {
    const chartData = [
      { label: "Q1", value: 120 },
      { label: "Q2", value: 150 },
      { label: "Q3", value: 180 },
    ];
    const csv = chartDataToCsv(chartData);

    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("Label,Value");
    expect(lines[1]).toBe("Q1,120");
    expect(lines[2]).toBe("Q2,150");
    expect(lines[3]).toBe("Q3,180");
  });

  it("includes secondary value, category, and delta percent when present in chart data", () => {
    const chartData = [
      {
        label: "Latency",
        value: 45,
        secondaryValue: 80,
        category: "Network",
        deltaPercent: "+12%",
      },
    ];
    const csv = chartDataToCsv(chartData);

    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("Label,Value,Secondary Value,Category,Delta Percent");
    expect(lines[1]).toBe("Latency,45,80,Network,+12%");
  });

  it("converts Decision Matrix into a comprehensive CSV table with rankings", () => {
    const matrix = {
      topic: "Framework Comparison",
      criteria: [
        { id: "c1", name: "Speed", weight: 3 },
        { id: "c2", name: "DX", weight: 1 },
      ],
      options: [
        {
          id: "o1",
          name: "Next.js",
          scores: { c1: 9, c2: 8 },
          pros: ["Rich ecosystem", "SSR"],
          cons: ["Bundle size"],
        },
        {
          id: "o2",
          name: "Vite",
          scores: { c1: 10, c2: 7 },
          pros: ["Ultra fast"],
          cons: ["No built-in SSR"],
        },
      ],
      verdict: "Next.js wins for fullstack applications.",
    };

    const csv = matrixToCsv(matrix);
    expect(csv).toContain(
      "Rank,Option,Speed (3x),DX (1x),Total Score,Pros,Cons",
    );
    expect(csv).toContain("Next.js");
    expect(csv).toContain("Vite");
    expect(csv).toContain("Rich ecosystem; SSR");
  });

  it("converts matrix to CSV with dynamically adjusted weights", () => {
    const matrix = {
      criteria: [
        { id: "c1", name: "Speed", weight: 1 },
        { id: "c2", name: "Cost", weight: 1 },
      ],
      options: [
        {
          name: "Plan A",
          scores: { c1: 10, c2: 2 },
          pros: [],
          cons: [],
        },
      ],
    };

    // Custom weight overrides default
    const customWeights = { c1: 5, c2: 1 };
    const csv = matrixToCsv(matrix, customWeights);

    expect(csv).toContain("Speed (5x),Cost (1x)");
  });
});

describe("Code Artifact Download & Extension Resolution", () => {
  it("resolves language file extensions accurately", () => {
    expect(getLanguageExtension("typescript")).toBe("ts");
    expect(getLanguageExtension("TSX")).toBe("tsx");
    expect(getLanguageExtension("python")).toBe("py");
    expect(getLanguageExtension("javascript")).toBe("js");
    expect(getLanguageExtension("rust")).toBe("rs");
    expect(getLanguageExtension("golang")).toBe("go");
    expect(getLanguageExtension("html")).toBe("html");
    expect(getLanguageExtension("css")).toBe("css");
    expect(getLanguageExtension("json")).toBe("json");
    expect(getLanguageExtension("markdown")).toBe("md");
    expect(getLanguageExtension("unknown-lang")).toBe("txt");
    expect(getLanguageExtension(undefined)).toBe("txt");
  });

  it("resolves code filenames preserving existing extensions or appending proper extension", () => {
    expect(resolveCodeFilename("server.ts", "typescript")).toBe("server.ts");
    expect(resolveCodeFilename("main.py", "python")).toBe("main.py");
    expect(resolveCodeFilename("MatrixCalculator", "typescript")).toBe(
      "MatrixCalculator.ts",
    );
    expect(resolveCodeFilename("DataVisualizer", "python")).toBe(
      "DataVisualizer.py",
    );
    expect(resolveCodeFilename(undefined, "javascript")).toBe("code.js");
  });
});

describe("Interactive Artifacts Component Verification", () => {
  it("DecisionMatrixCard includes dynamic weight sliders, normalized percentage, reset button, and winner badges", async () => {
    const { readFileSync } = await import("fs");
    const { join } = await import("path");
    const content = readFileSync(
      join(
        process.cwd(),
        "src/components/GenerativeCards/DecisionMatrixCard.tsx",
      ),
      "utf-8",
    );

    expect(content).toContain("calculateNormalizedWeights");
    expect(content).toContain("recalculateOptionScores");
    expect(content).toContain("Reset Weights");
    expect(content).toContain("Top Choice");
    expect(content).toContain("Winner");
    expect(content).toContain('type="range"');
    expect(content).toContain("Export CSV");
  });

  it("ArtifactStage includes Code download, line numbers toggle, copy snippet, and CSV exports", async () => {
    const { readFileSync } = await import("fs");
    const { join } = await import("path");
    const content = readFileSync(
      join(process.cwd(), "src/components/ArtifactStage.tsx"),
      "utf-8",
    );

    // Code artifact features
    expect(content).toContain("downloadArtifactCode");
    expect(content).toContain("Download Code File");
    expect(content).toContain("showLineNumbers");
    expect(content).toContain("Copy Snippet");

    // Chart and Matrix CSV export features
    expect(content).toContain("chartDataToCsv");
    expect(content).toContain("matrixToCsv");
    expect(content).toContain("Download CSV Data");
    expect(content).toContain("Reset Weights");
  });
});
