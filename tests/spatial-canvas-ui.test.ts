import { describe, it, expect } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import fs from "fs";
import path from "path";
import { SpatialIntelligenceCanvas } from "@/components/SpatialIntelligenceCanvas";
import type { Session, GenerativeArtifact } from "@/lib/types";

describe("SpatialIntelligenceCanvas UI Component", () => {
  const sampleDebateArtifact: GenerativeArtifact = {
    type: "debate",
    data: {
      topic: "Monolithic vs Microservices Architecture in 2026",
      consensusSummary:
        "Microservices for scale-out teams, modular monoliths for rapid velocity.",
      synthesisVerdict:
        "Adopt modular monolith initially, split under distinct bounded contexts.",
      perspectives: [
        {
          agentName: "Arbiter Prime",
          stance: "Neutral Arbiter",
          avatarColor: "#8b5cf6",
          arguments: [
            "Modularity can be maintained within monolithic codebase.",
          ],
          caveats: ["Requires strict interface boundaries."],
        },
        {
          agentName: "Advocate Scale",
          stance: "Advocate",
          avatarColor: "#10b981",
          arguments: ["Independent deployments decouple failure domains."],
          caveats: ["Operational overhead is significant."],
        },
        {
          agentName: "Critic Simplifier",
          stance: "Critic",
          avatarColor: "#f43f5e",
          arguments: [
            "Network latency and distributed transactions add immense complexity.",
          ],
          caveats: [
            "Only relevant when throughput exceeds single-node capacity.",
          ],
        },
      ],
    },
  };

  const sampleMatrixArtifact: GenerativeArtifact = {
    type: "matrix",
    data: {
      topic: "Database Engine Selection for High-Throughput Telemetry",
      verdict:
        "ClickHouse provides superior columnar compression and analytical query speed.",
      criteria: [
        { id: "c1", name: "Write Throughput", weight: 0.4 },
        { id: "c2", name: "Query Latency", weight: 0.35 },
        { id: "c3", name: "Operational Simplicity", weight: 0.25 },
      ],
      options: [
        {
          id: "opt-1",
          name: "ClickHouse",
          scores: { c1: 9.5, c2: 9.8, c3: 7.2 },
          pros: ["Blazing vector processing", "High compression ratio"],
          cons: ["Steep operational curve"],
          totalWeightedScore: 9.03,
        },
        {
          id: "opt-2",
          name: "PostgreSQL with TimescaleDB",
          scores: { c1: 7.5, c2: 8.0, c3: 9.0 },
          pros: ["Standard SQL compliance", "Familiar ecosystem"],
          cons: ["Lower batch throughput"],
          totalWeightedScore: 8.05,
        },
      ],
    },
  };

  const sampleResearchArtifact: GenerativeArtifact = {
    type: "research",
    data: {
      title: "State of Agentic AI Swarms in Enterprise Systems",
      executiveSummary:
        "Multi-agent workflows with specialized roles outperform single prompt chains.",
      keyFindings: [
        {
          point: "Specialized roles prevent context dilution",
          description:
            "Decomposing problems into distinct roles increases verification accuracy.",
          confidence: "high",
          citationIds: ["src-1"],
        },
        {
          point: "Evaluator-optimizer loops reduce hallucinations",
          description:
            "Self-correcting iterative refinement catches edge cases.",
          confidence: "high",
          citationIds: ["src-2"],
        },
      ],
      sources: [
        {
          id: "src-1",
          title: "DeepMind Multi-Agent Research Paper",
          url: "https://deepmind.google/research/multi-agent",
          domain: "deepmind.google",
          snippet:
            "Autonomous agent networks demonstrate emergent problem solving.",
        },
        {
          id: "src-2",
          title: "Anthropic Claude Architecture Guidelines",
          url: "https://docs.anthropic.com/agents",
          domain: "docs.anthropic.com",
          snippet: "Tool use and structured planning loops.",
        },
      ],
      recommendation:
        "Deploy role-based agent swarms with deterministic state verification.",
    },
  };

  const samplePlanArtifact: GenerativeArtifact = {
    type: "plan",
    data: {
      goal: "Migrate Monolith to Autonomous Services",
      timeframe: "Q1-Q2 2026",
      overview: "Stepwise decoupling of core ingestion and inference layers.",
      phases: [
        {
          id: "p1",
          phaseNumber: 1,
          phaseName: "Telemetry Decoupling",
          summary: "Extract metrics pipeline to independent worker pool.",
          status: "completed",
          tasks: [
            {
              id: "t1",
              title: "Setup Kafka queue",
              description: "Route event streams",
              status: "completed",
            },
          ],
        },
      ],
      keySuccessMetrics: ["Zero data loss during transition", "< 50ms latency"],
    },
  };

  const sampleChartArtifact: GenerativeArtifact = {
    type: "chart",
    data: {
      title: "Inference Latency vs Batch Size",
      type: "line",
      xAxisKey: "Batch Size",
      data: [
        { label: "1", value: 12 },
        { label: "8", value: 34 },
        { label: "32", value: 89 },
      ],
      insight: "Optimal throughput / latency tradeoff occurs at batch size 16.",
    },
  };

  const sampleCodeArtifact: GenerativeArtifact = {
    type: "code",
    data: {
      language: "typescript",
      filename: "spatial-canvas.ts",
      code: "export function computeTopology() { return true; }",
      explanation: "Core topology calculation algorithm.",
    },
  };

  const populatedSession: Session = {
    id: "session-test-spatial",
    title: "Spatial Intelligence Mission",
    mode: "canvas",
    createdAt: "2026-10-29T00:00:00.000Z",
    updatedAt: "2026-10-29T01:00:00.000Z",
    messages: [
      {
        id: "msg-research-1",
        role: "assistant",
        content: "Completed deep research synthesis on multi-agent systems.",
        timestamp: "2026-10-29T00:05:00.000Z",
        artifact: sampleResearchArtifact,
      },
      {
        id: "msg-debate-1",
        role: "assistant",
        content: "Dialectic red team adjudication completed.",
        timestamp: "2026-10-29T00:10:00.000Z",
        artifact: sampleDebateArtifact,
      },
      {
        id: "msg-matrix-1",
        role: "assistant",
        content: "Decision matrix calculated tradeoffs.",
        timestamp: "2026-10-29T00:15:00.000Z",
        artifact: sampleMatrixArtifact,
      },
      {
        id: "msg-plan-1",
        role: "assistant",
        content: "Execution roadmap established.",
        timestamp: "2026-10-29T00:20:00.000Z",
        artifact: samplePlanArtifact,
      },
      {
        id: "msg-chart-1",
        role: "assistant",
        content: "Empirical telemetry chart rendered.",
        timestamp: "2026-10-29T00:25:00.000Z",
        artifact: sampleChartArtifact,
      },
      {
        id: "msg-code-1",
        role: "assistant",
        content: "Executable code sandbox generated.",
        timestamp: "2026-10-29T00:30:00.000Z",
        artifact: sampleCodeArtifact,
      },
    ],
  };

  it("renders canvas header, zoom controls, and filter pills", () => {
    const html = renderToString(
      React.createElement(SpatialIntelligenceCanvas, {
        session: populatedSession,
      }),
    );

    // Verify Title & LayoutGrid
    expect(html).toContain("Spatial Intelligence Canvas");

    // Verify Node and Wire count badges
    expect(html).toContain("6 Nodes");
    expect(html).toContain("Wires");

    // Verify Filter Pills
    expect(html).toContain("All");
    expect(html).toContain("Debates");
    expect(html).toContain("Matrices");
    expect(html).toContain("Research");
    expect(html).toContain("Plans");
    expect(html).toContain("Charts");
    expect(html).toContain("Code");

    // Verify Zoom Controls & Readout
    expect(html).toContain("Zoom Out");
    expect(html).toContain("100%");
    expect(html).toContain("Zoom In");
    expect(html).toContain("Fit View");
    expect(html).toContain("Reset View");

    // Verify Action Buttons
    expect(html).toContain("Export Canvas CSV");
    expect(html).toContain("Copy Topology Report");
  });

  it("renders nodes for sessions with debate, matrix, and research artifacts", () => {
    const html = renderToString(
      React.createElement(SpatialIntelligenceCanvas, {
        session: populatedSession,
      }),
    );

    // Debate Node checks
    expect(html).toContain("Monolithic vs Microservices Architecture in 2026");
    expect(html).toContain("Dialectic Consensus");
    expect(html).toContain("participants");

    // Matrix Node checks
    expect(html).toContain(
      "Database Engine Selection for High-Throughput Telemetry",
    );
    expect(html).toContain("Top Choice Verdict");
    expect(html).toContain("options");

    // Research Node checks
    expect(html).toContain("State of Agentic AI Swarms in Enterprise Systems");
    expect(html).toContain("Grounded Sources");
    expect(html).toContain("findings");
    expect(html).toContain("sources");

    // Plan Node checks
    expect(html).toContain("Migrate Monolith to Autonomous Services");
    expect(html).toContain("Strategic Horizon");

    // Chart Node checks
    expect(html).toContain("Inference Latency vs Batch Size");
    expect(html).toContain("Telemetry Series");

    // Code Node checks
    expect(html).toContain("Sandboxed Code");
  });

  it("renders SVG connection wires between related nodes", () => {
    const html = renderToString(
      React.createElement(SpatialIntelligenceCanvas, {
        session: populatedSession,
      }),
    );

    // SVG Layer presence
    expect(html).toContain("<svg");
    expect(html).toContain('stroke-dasharray="6 4"');

    // Directional arrow markers
    expect(html).toContain('marker id="wire-arrow-indigo"');
    expect(html).toContain('marker id="wire-arrow-rose"');
    expect(html).toContain('marker id="wire-arrow-cyan"');

    // Semantic relationship labels on wires
    expect(html).toMatch(
      /Stress Tests|Evaluates Tradeoffs|Execution Roadmap|Empirical Validation|debates|compares|implements/,
    );
  });

  it("renders mini-map container", () => {
    const html = renderToString(
      React.createElement(SpatialIntelligenceCanvas, {
        session: populatedSession,
      }),
    );

    expect(html).toContain("mini-map-container");
    expect(html).toContain("Mini-Map");
    expect(html).toContain("bg-rose-500");
    expect(html).toContain("bg-indigo-500");
    expect(html).toContain("bg-cyan-500");
  });

  it("handles empty session without crashing", () => {
    // Null session
    const nullHtml = renderToString(
      React.createElement(SpatialIntelligenceCanvas, {
        session: null,
      }),
    );
    expect(nullHtml).toContain("Spatial Intelligence Canvas");
    expect(nullHtml).toContain("Start research or debate to populate canvas");
    expect(nullHtml).toContain("/research");
    expect(nullHtml).toContain("/debate");
    expect(nullHtml).toContain("/matrix");

    // Empty messages session
    const emptySession: Session = {
      ...populatedSession,
      messages: [],
    };
    const emptyHtml = renderToString(
      React.createElement(SpatialIntelligenceCanvas, {
        session: emptySession,
      }),
    );
    expect(emptyHtml).toContain("Spatial Intelligence Canvas");
    expect(emptyHtml).toContain("Start research or debate to populate canvas");
    expect(emptyHtml).toContain("/research");
    expect(emptyHtml).toContain("/debate");
    expect(emptyHtml).toContain("/matrix");
  });

  it("strictly asserts that the component source file does not contain Math.random()", () => {
    const componentPath = path.resolve(
      __dirname,
      "../src/components/SpatialIntelligenceCanvas.tsx",
    );
    const sourceCode = fs.readFileSync(componentPath, "utf-8");

    // Zero Math.random() allowed
    expect(sourceCode).not.toContain("Math.random");

    // Zero synthetic/mock data generators
    expect(sourceCode).not.toContain("Math.random()");
  });
});
