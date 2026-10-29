import { describe, expect, it } from "bun:test";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  tokenizeText,
  computeJaccardSimilarity,
  extractSpatialNodes,
  computeSpatialEdges,
  computeCanvasBounds,
  computeFitViewport,
  calculateBezierPath,
  buildSpatialCanvasData,
  escapeCsvCell,
  spatialCanvasToCsv,
  spatialCanvasToMarkdown,
  SpatialCanvasNode,
  SpatialCanvasData,
} from "@/lib/canvas/spatial-canvas";
import { ChatMessage } from "@/lib/types";

describe("Spatial Intelligence Canvas Topology Engine", () => {
  // Mock test messages covering all 6 artifact types
  const createMockMessages = (): ChatMessage[] => [
    {
      id: "msg-1",
      role: "assistant",
      content: "Here is the quantum research report.",
      timestamp: "2026-10-29T10:00:00.000Z",
      artifact: {
        type: "research",
        data: {
          title: "Quantum Annealing for Routing Optimization",
          executiveSummary:
            "Detailed analysis of quantum annealing algorithms applied to logistics routing.",
          recommendation: "Deploy hybrid quantum classical solver.",
          keyFindings: [
            {
              point: "20x speedup on NP-hard topologies",
              description: "Empirical benchmarking",
              confidence: "high",
              citationIds: ["c1"],
            },
            {
              point: "Error mitigation reduces drift",
              description: "Qubit decoherence handling",
              confidence: "high",
              citationIds: ["c2"],
            },
          ],
          sources: [
            {
              id: "c1",
              title: "Quantum Routing",
              url: "https://example.com/q1",
              domain: "example.com",
              snippet: "quantum routing benchmarks",
            },
            {
              id: "c2",
              title: "Decoherence Mitigation",
              url: "https://example.com/q2",
              domain: "example.com",
              snippet: "error mitigation",
            },
          ],
          metrics: {
            sourcesCrawled: 12,
            depthLevel: 3,
            synthesisTimeMs: 1420,
            verificationAudit: { verifiedClaims: 2, sourceAlignment: 94 },
          },
        },
      },
    },
    {
      id: "msg-2",
      role: "assistant",
      content: "Here is the strategic plan.",
      timestamp: "2026-10-29T10:05:00.000Z",
      artifact: {
        type: "plan",
        data: {
          goal: "Deploy Production Quantum Routing Pipeline",
          timeframe: "Q1-Q2 2027",
          overview:
            "Milestone execution roadmap for quantum routing algorithm integration.",
          phases: [
            {
              id: "p1",
              phaseNumber: 1,
              phaseName: "Hybrid Architecture Prototype",
              summary: "Build client SDK adapter",
              status: "completed",
              tasks: [
                {
                  id: "t1",
                  title: "Build SDK",
                  description: "Wrapper",
                  status: "completed",
                },
              ],
            },
            {
              id: "p2",
              phaseNumber: 2,
              phaseName: "Cluster Validation",
              summary: "Verify on hardware",
              status: "pending",
              tasks: [
                {
                  id: "t2",
                  title: "Hardware test",
                  description: "Run test suite",
                  status: "todo",
                },
              ],
            },
          ],
          keySuccessMetrics: ["Sub-second latency", "Zero packet loss"],
        },
      },
    },
    {
      id: "msg-3",
      role: "assistant",
      content: "Here is the performance chart.",
      timestamp: "2026-10-29T10:10:00.000Z",
      artifact: {
        type: "chart",
        data: {
          title: "Quantum Routing Latency Benchmark",
          type: "bar",
          xAxisKey: "nodes",
          data: [
            { label: "100 Nodes", value: 12 },
            { label: "500 Nodes", value: 45 },
            { label: "1000 Nodes", value: 89 },
          ],
          insight:
            "Quantum annealing maintains sub-100ms routing latency across 1000 nodes.",
        },
      },
    },
    {
      id: "msg-4",
      role: "assistant",
      content: "Here is the multi-criteria trade-off matrix.",
      timestamp: "2026-10-29T10:15:00.000Z",
      artifact: {
        type: "matrix",
        data: {
          topic: "Quantum Annealer vs Classical Simulated Annealing",
          criteria: [
            { id: "c1", name: "Throughput", weight: 0.6 },
            { id: "c2", name: "Cost Efficiency", weight: 0.4 },
          ],
          options: [
            {
              id: "o1",
              name: "D-Wave Advantage",
              scores: { c1: 9, c2: 6 },
              pros: ["High Qubit count"],
              cons: ["Cryo cooling cost"],
              totalWeightedScore: 7.8,
            },
            {
              id: "o2",
              name: "Classical Solver Cluster",
              scores: { c1: 6, c2: 9 },
              pros: ["Commodity hardware"],
              cons: ["Slower convergence"],
              totalWeightedScore: 7.2,
            },
          ],
          verdict:
            "D-Wave hybrid solver excels when topology exceeds 500 nodes.",
        },
      },
    },
    {
      id: "msg-5",
      role: "assistant",
      content: "Here is the dialectic red-team debate.",
      timestamp: "2026-10-29T10:20:00.000Z",
      artifact: {
        type: "debate",
        data: {
          topic: "Commercial Viability of Quantum Logistics Routing",
          consensusSummary:
            "Both advocate and critic agree hybrid formulation is required before pure QPU supremacy.",
          perspectives: [
            {
              agentName: "Advocate",
              stance: "Advocate",
              avatarColor: "#10b981",
              arguments: [
                "NP-hard routing breaks classical clusters",
                "Energy consumption per solve is 10x lower",
              ],
              caveats: ["Requires cryogenic hosting facilities"],
            },
            {
              agentName: "Critic",
              stance: "Critic",
              avatarColor: "#ef4444",
              arguments: [
                "Simulated annealing suffices for 95% of fleet operations",
                "QPU calibration introduces latency",
              ],
              caveats: ["Advancements in error mitigation may close this gap"],
            },
          ],
          synthesisVerdict:
            "Adopt classical fallback for small fleets; route metropolitan topologies through QPU.",
        },
      },
    },
    {
      id: "msg-6",
      role: "assistant",
      content: "Here is the TypeScript implementation.",
      timestamp: "2026-10-29T10:25:00.000Z",
      artifact: {
        type: "code",
        data: {
          filename: "quantum-solver-client.ts",
          language: "typescript",
          code: "export class QuantumClient {\n  async solve(graph: any) {\n    return graph;\n  }\n}",
          explanation:
            "Client SDK wrapper for submitting QUBO matrices to quantum annealing endpoints.",
        },
      },
    },
  ];

  // 1. Artifact Extraction Tests
  describe("Artifact Extraction & Node Mapping", () => {
    it("extracts all 6 artifact types from chat messages", () => {
      const messages = createMockMessages();
      const nodes = extractSpatialNodes(messages);

      expect(nodes.length).toBe(6);
      const types = nodes.map((n) => n.artifactType);
      expect(types).toContain("research");
      expect(types).toContain("plan");
      expect(types).toContain("chart");
      expect(types).toContain("matrix");
      expect(types).toContain("debate");
      expect(types).toContain("code");
    });

    it("correctly extracts research artifact attributes and metrics", () => {
      const nodes = extractSpatialNodes([createMockMessages()[0]]);
      const researchNode = nodes[0];

      expect(researchNode.artifactType).toBe("research");
      expect(researchNode.title).toBe(
        "Quantum Annealing for Routing Optimization",
      );
      expect(researchNode.summary).toContain("Detailed analysis");
      expect(researchNode.tags).toContain("INVESTIGATION");
      expect(researchNode.metrics?.itemCount).toBe(2); // 2 key findings
      expect(researchNode.metrics?.evidenceCount).toBe(2); // 2 sources
      expect(researchNode.metrics?.score).toBe(94); // verification alignment
      expect(researchNode.metrics?.status).toBe("verified");
    });

    it("correctly extracts plan artifact attributes and metrics", () => {
      const nodes = extractSpatialNodes([createMockMessages()[1]]);
      const planNode = nodes[0];

      expect(planNode.artifactType).toBe("plan");
      expect(planNode.title).toBe("Deploy Production Quantum Routing Pipeline");
      expect(planNode.tags).toContain("ROADMAP");
      expect(planNode.metrics?.itemCount).toBe(2); // 2 phases
      expect(planNode.metrics?.status).toBe("active");
    });

    it("correctly extracts chart artifact attributes and metrics", () => {
      const nodes = extractSpatialNodes([createMockMessages()[2]]);
      const chartNode = nodes[0];

      expect(chartNode.artifactType).toBe("chart");
      expect(chartNode.title).toBe("Quantum Routing Latency Benchmark");
      expect(chartNode.summary).toContain("sub-100ms");
      expect(chartNode.metrics?.itemCount).toBe(3); // 3 data points
      expect(chartNode.metrics?.status).toBe("rendered");
    });

    it("correctly extracts matrix artifact attributes and metrics", () => {
      const nodes = extractSpatialNodes([createMockMessages()[3]]);
      const matrixNode = nodes[0];

      expect(matrixNode.artifactType).toBe("matrix");
      expect(matrixNode.title).toBe(
        "Quantum Annealer vs Classical Simulated Annealing",
      );
      expect(matrixNode.metrics?.itemCount).toBe(2); // 2 options
      expect(matrixNode.metrics?.score).toBe(7.8); // max score
      expect(matrixNode.metrics?.status).toBe("evaluated");
    });

    it("correctly extracts debate artifact attributes and metrics", () => {
      const nodes = extractSpatialNodes([createMockMessages()[4]]);
      const debateNode = nodes[0];

      expect(debateNode.artifactType).toBe("debate");
      expect(debateNode.title).toBe(
        "Commercial Viability of Quantum Logistics Routing",
      );
      expect(debateNode.tags).toContain("DIALECTIC");
      expect(debateNode.metrics?.itemCount).toBe(2); // 2 perspectives
      expect(debateNode.metrics?.status).toBe("concluded");
    });

    it("correctly extracts code artifact attributes and metrics", () => {
      const nodes = extractSpatialNodes([createMockMessages()[5]]);
      const codeNode = nodes[0];

      expect(codeNode.artifactType).toBe("code");
      expect(codeNode.title).toBe("quantum-solver-client.ts");
      expect(codeNode.tags).toContain("TYPESCRIPT");
      expect(codeNode.metrics?.itemCount).toBe(5); // 5 lines of code
      expect(codeNode.metrics?.status).toBe("compiled");
    });

    it("ignores messages without artifacts", () => {
      const messages: ChatMessage[] = [
        {
          id: "m1",
          role: "user",
          content: "Hello there",
          timestamp: "2026-10-29T10:00:00Z",
        },
        {
          id: "m2",
          role: "assistant",
          content: "General Kenobi!",
          timestamp: "2026-10-29T10:01:00Z",
        },
      ];
      const nodes = extractSpatialNodes(messages);
      expect(nodes.length).toBe(0);
    });

    it("handles null, undefined, or empty messages array defensively", () => {
      expect(extractSpatialNodes([])).toEqual([]);
      expect(extractSpatialNodes(null as unknown as ChatMessage[])).toEqual([]);
      expect(
        extractSpatialNodes(undefined as unknown as ChatMessage[]),
      ).toEqual([]);
    });
  });

  // 2. Deterministic Positioning & Non-overlapping Layout
  describe("Deterministic Layout & Coordinates", () => {
    it("places nodes in a 3-column grid without overlap", () => {
      const messages = createMockMessages();
      const nodes = extractSpatialNodes(messages);

      expect(nodes.length).toBe(6);

      // Card 0: (60, 60)
      expect(nodes[0].x).toBe(60);
      expect(nodes[0].y).toBe(60);
      expect(nodes[0].width).toBe(320);
      expect(nodes[0].height).toBe(220);

      // Card 1: (60 + 380, 60) = (440, 60)
      expect(nodes[1].x).toBe(440);
      expect(nodes[1].y).toBe(60);

      // Card 2: (60 + 760, 60) = (820, 60)
      expect(nodes[2].x).toBe(820);
      expect(nodes[2].y).toBe(60);

      // Card 3: wraps to row 1: (60, 60 + 280) = (60, 340)
      expect(nodes[3].x).toBe(60);
      expect(nodes[3].y).toBe(340);

      // Card 4: (440, 340)
      expect(nodes[4].x).toBe(440);
      expect(nodes[4].y).toBe(340);

      // Card 5: (820, 340)
      expect(nodes[5].x).toBe(820);
      expect(nodes[5].y).toBe(340);

      // Verify no pairs overlap
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const overlapX = a.x < b.x + b.width && a.x + a.width > b.x;
          const overlapY = a.y < b.y + b.height && a.y + a.height > b.y;
          expect(overlapX && overlapY).toBe(false);
        }
      }
    });

    it("respects custom grid configuration parameters", () => {
      const messages = createMockMessages().slice(0, 2);
      const nodes = extractSpatialNodes(messages, {
        columns: 1,
        spacingX: 500,
        spacingY: 400,
        cardWidth: 350,
        cardHeight: 250,
        startX: 100,
        startY: 100,
      });

      expect(nodes[0].x).toBe(100);
      expect(nodes[0].y).toBe(100);
      expect(nodes[0].width).toBe(350);
      expect(nodes[0].height).toBe(250);

      // Column 1 wraps immediately to next row
      expect(nodes[1].x).toBe(100);
      expect(nodes[1].y).toBe(500);
    });
  });

  // 3. Canvas Bounding Box Calculation
  describe("Canvas Bounding Box Calculation", () => {
    it("returns zero bounds for empty or null nodes", () => {
      const emptyBounds = computeCanvasBounds([]);
      expect(emptyBounds).toEqual({
        minX: 0,
        minY: 0,
        maxX: 0,
        maxY: 0,
        width: 0,
        height: 0,
      });
      expect(
        computeCanvasBounds(null as unknown as SpatialCanvasNode[]),
      ).toEqual({
        minX: 0,
        minY: 0,
        maxX: 0,
        maxY: 0,
        width: 0,
        height: 0,
      });
    });

    it("calculates exact bounding box for single node with padding", () => {
      const singleNode: SpatialCanvasNode = {
        id: "node-1",
        messageId: "m1",
        artifactType: "research",
        title: "Test",
        summary: "Desc",
        x: 100,
        y: 100,
        width: 300,
        height: 200,
        tags: [],
        createdAt: "2026-10-29T10:00:00Z",
      };

      const bounds = computeCanvasBounds([singleNode], 50);
      expect(bounds.minX).toBe(50);
      expect(bounds.minY).toBe(50);
      expect(bounds.maxX).toBe(450); // 100 + 300 + 50
      expect(bounds.maxY).toBe(350); // 100 + 200 + 50
      expect(bounds.width).toBe(400); // 450 - 50
      expect(bounds.height).toBe(300); // 350 - 50
    });

    it("calculates bounding box enclosing multiple distributed nodes with default 80px padding", () => {
      const nodes = extractSpatialNodes(createMockMessages());
      const bounds = computeCanvasBounds(nodes);

      // minX = 60 - 80 = -20
      expect(bounds.minX).toBe(-20);
      // minY = 60 - 80 = -20
      expect(bounds.minY).toBe(-20);
      // maxX = (820 + 320) + 80 = 1220
      expect(bounds.maxX).toBe(1220);
      // maxY = (340 + 220) + 80 = 640
      expect(bounds.maxY).toBe(640);
      expect(bounds.width).toBe(1240);
      expect(bounds.height).toBe(660);
    });
  });

  // 4. Semantic Edge Discovery & Topological Relationships
  describe("Semantic Edge Discovery & Typing", () => {
    it("returns empty edges when nodes array has fewer than 2 elements", () => {
      expect(computeSpatialEdges([])).toEqual([]);
      const single = extractSpatialNodes([createMockMessages()[0]]);
      expect(computeSpatialEdges(single)).toEqual([]);
    });

    it("discovers 'implements' relation between research and plan", () => {
      const messages = [createMockMessages()[0], createMockMessages()[1]]; // research + plan
      const nodes = extractSpatialNodes(messages);
      const edges = computeSpatialEdges(nodes);

      expect(edges.length).toBe(1);
      expect(edges[0].relationType).toBe("implements");
      expect(edges[0].label).toBe("Execution Roadmap");
      expect(edges[0].strength).toBeGreaterThan(0.5);
    });

    it("discovers 'validates' relation between research and chart", () => {
      const messages = [createMockMessages()[0], createMockMessages()[2]]; // research + chart
      const nodes = extractSpatialNodes(messages);
      const edges = computeSpatialEdges(nodes);

      expect(edges.length).toBe(1);
      expect(edges[0].relationType).toBe("validates");
      expect(edges[0].label).toBe("Empirical Validation");
    });

    it("discovers 'debates' relation between research and debate", () => {
      const messages = [createMockMessages()[0], createMockMessages()[4]]; // research + debate
      const nodes = extractSpatialNodes(messages);
      const edges = computeSpatialEdges(nodes);

      expect(edges.length).toBe(1);
      expect(edges[0].relationType).toBe("debates");
      expect(edges[0].label).toBe("Stress Tests");
    });

    it("discovers 'compares' relation between debate and matrix", () => {
      const messages = [createMockMessages()[3], createMockMessages()[4]]; // matrix + debate
      const nodes = extractSpatialNodes(messages);
      const edges = computeSpatialEdges(nodes);

      expect(edges.length).toBe(1);
      expect(edges[0].relationType).toBe("compares");
      expect(edges[0].label).toBe("Evaluates Tradeoffs");
    });

    it("discovers 'synthesizes' relation for high keyword overlap on non-pair types", () => {
      const codeNodeA: SpatialCanvasNode = {
        id: "node-c1",
        messageId: "m1",
        artifactType: "code",
        title: "Distributed Raft Consensus Protocol Engine",
        summary:
          "Implementation of raft consensus protocol with leader election and log replication.",
        x: 0,
        y: 0,
        width: 320,
        height: 220,
        tags: ["CODE"],
        createdAt: "2026-10-29T10:00:00Z",
      };

      const codeNodeB: SpatialCanvasNode = {
        id: "node-c2",
        messageId: "m2",
        artifactType: "code",
        title: "Raft Consensus Log Replication Cluster",
        summary:
          "Engine for raft consensus leader election and replicated state machine log storage.",
        x: 400,
        y: 0,
        width: 320,
        height: 220,
        tags: ["CODE"],
        createdAt: "2026-10-29T10:05:00Z",
      };

      const edges = computeSpatialEdges([codeNodeA, codeNodeB]);
      expect(edges.length).toBe(1);
      expect(edges[0].relationType).toBe("synthesizes");
      expect(edges[0].label).toBe("Shared Domain Synthesis");
    });

    it("filters out nodes with low Jaccard similarity (< 0.12)", () => {
      const nodeA: SpatialCanvasNode = {
        id: "node-a",
        messageId: "m1",
        artifactType: "code",
        title: "Apple Banana Cherry Fruits",
        summary: "Botanical taxonomy of sweet citrus and orchard plants.",
        x: 0,
        y: 0,
        width: 320,
        height: 220,
        tags: ["CODE"],
        createdAt: "2026-10-29T10:00:00Z",
      };

      const nodeB: SpatialCanvasNode = {
        id: "node-b",
        messageId: "m2",
        artifactType: "code",
        title: "Quantum Physics Black Hole Radiation",
        summary:
          "Astrophysical calculations of Hawking entropy and gravitational horizon.",
        x: 400,
        y: 0,
        width: 320,
        height: 220,
        tags: ["CODE"],
        createdAt: "2026-10-29T10:05:00Z",
      };

      const edges = computeSpatialEdges([nodeA, nodeB]);
      expect(edges.length).toBe(0);
    });

    it("clamps edge strength deterministically between 0.1 and 1.0", () => {
      const nodes = extractSpatialNodes(createMockMessages());
      const edges = computeSpatialEdges(nodes);

      for (const e of edges) {
        expect(e.strength).toBeGreaterThanOrEqual(0.1);
        expect(e.strength).toBeLessThanOrEqual(1.0);
        // Deterministic numeric precision
        expect(Number.isFinite(e.strength)).toBe(true);
      }
    });
  });

  // 5. Fit Viewport & Zoom Clamping
  describe("Fit Viewport & Zoom Clamping", () => {
    it("returns default viewport for invalid container dimensions", () => {
      const bounds = { width: 1000, height: 800, minX: 0, minY: 0 };
      expect(computeFitViewport(bounds, 0, 800)).toEqual({
        panX: 0,
        panY: 0,
        zoom: 1,
      });
      expect(computeFitViewport(bounds, 1200, -100)).toEqual({
        panX: 0,
        panY: 0,
        zoom: 1,
      });
    });

    it("computes zoom and centering pan for standard canvas bounds", () => {
      const bounds = { width: 1000, height: 500, minX: 100, minY: 100 };
      const containerWidth = 1200;
      const containerHeight = 800;

      const vp = computeFitViewport(bounds, containerWidth, containerHeight);
      expect(vp.zoom).toBeGreaterThanOrEqual(0.25);
      expect(vp.zoom).toBeLessThanOrEqual(2.5);
      expect(typeof vp.panX).toBe("number");
      expect(typeof vp.panY).toBe("number");
    });

    it("clamps zoom to 0.25 for extremely large canvas topologies", () => {
      const bounds = { width: 25000, height: 18000, minX: 0, minY: 0 };
      const vp = computeFitViewport(bounds, 1200, 800);
      expect(vp.zoom).toBe(0.25);
    });

    it("clamps zoom to 2.5 for tiny canvas topologies", () => {
      const bounds = { width: 50, height: 40, minX: 10, minY: 10 };
      const vp = computeFitViewport(bounds, 1920, 1080);
      expect(vp.zoom).toBe(2.5);
    });
  });

  // 6. Cubic Bezier Path Geometry
  describe("Cubic Bezier Path Geometry", () => {
    it("generates smooth SVG cubic bezier wire between horizontal source and target", () => {
      const source = { x: 50, y: 100, width: 300, height: 200 };
      const target = { x: 500, y: 100, width: 300, height: 200 };

      const { path, midX, midY } = calculateBezierPath(source, target);

      // Source right edge: 50 + 300 = 350, Y = 100 + 100 = 200
      // Target left edge: 500, Y = 100 + 100 = 200
      expect(path).toContain("M 350 200 C");
      expect(path).toContain("500 200");
      expect(midX).toBe(425); // (350 + 500) / 2
      expect(midY).toBe(200);
    });

    it("generates top-to-bottom bezier when cards are stacked vertically", () => {
      const source = { x: 100, y: 50, width: 300, height: 200 };
      const target = { x: 100, y: 350, width: 300, height: 200 };

      const { path, midX, midY } = calculateBezierPath(source, target);

      // Stacked: source bottom (250, 250) to target top (250, 350)
      expect(path).toContain("M 250 250 C");
      expect(path).toContain("250 350");
      expect(midX).toBe(250);
      expect(midY).toBe(300);
    });

    it("generates bottom-to-top bezier when source is below target", () => {
      const source = { x: 100, y: 400, width: 300, height: 200 };
      const target = { x: 100, y: 50, width: 300, height: 200 };

      const { path, midX, midY } = calculateBezierPath(source, target);

      // Source top (250, 400) to target bottom (250, 250)
      expect(path).toContain("M 250 400 C");
      expect(path).toContain("250 250");
      expect(midX).toBe(250);
      expect(midY).toBe(325);
    });

    it("generates right-to-left bezier when target is to the left of source", () => {
      const source = { x: 600, y: 100, width: 300, height: 200 };
      const target = { x: 100, y: 100, width: 300, height: 200 };

      const { path, midX, midY } = calculateBezierPath(source, target);

      // Source left (600, 200) to target right (400, 200)
      expect(path).toContain("M 600 200 C");
      expect(path).toContain("400 200");
      expect(midX).toBe(500);
      expect(midY).toBe(200);
    });
  });

  // 7. Strict RFC 4180 CSV Export
  describe("Strict RFC 4180 CSV Export", () => {
    it("escapes cells containing quotes, commas, and newlines per RFC 4180", () => {
      expect(escapeCsvCell('Hello "World"')).toBe('"Hello ""World"""');
      expect(escapeCsvCell("One, Two")).toBe('"One, Two"');
      expect(escapeCsvCell("Line1\nLine2")).toBe('"Line1\nLine2"');
      expect(escapeCsvCell(12345)).toBe('"12345"');
      expect(escapeCsvCell(null)).toBe('""');
      expect(escapeCsvCell(undefined)).toBe('""');
    });

    it("exports complete canvas topology to RFC 4180 CSV with CRLF line endings", () => {
      const canvas = buildSpatialCanvasData(createMockMessages());
      const csv = spatialCanvasToCsv(canvas);

      // CRLF compliance check
      expect(csv).toContain("\r\n");
      const lines = csv.split("\r\n");

      // First line must be header
      expect(lines[0]).toBe(
        '"RecordType","ID","Type_Or_Relation","Title_Or_Pair","Summary_Or_Label","Coordinates","Metrics_Or_Strength"',
      );

      // Check for NODE entries
      const nodeLines = lines.filter((l) => l.startsWith('"NODE"'));
      expect(nodeLines.length).toBe(6);

      // Check for EDGE entries
      const edgeLines = lines.filter((l) => l.startsWith('"EDGE"'));
      expect(edgeLines.length).toBeGreaterThan(0);
    });

    it("handles empty canvas safely in CSV export", () => {
      const emptyCanvas = buildSpatialCanvasData([]);
      const csv = spatialCanvasToCsv(emptyCanvas);
      const lines = csv.split("\r\n");
      expect(lines.length).toBe(1); // Only header
    });
  });

  // 8. Executive Markdown Report Generation
  describe("Executive Markdown Report Generation", () => {
    it("generates markdown with node inventory, topology wires, and type distribution", () => {
      const canvas = buildSpatialCanvasData(createMockMessages());
      const md = spatialCanvasToMarkdown(canvas);

      expect(md).toContain("# Spatial Intelligence Canvas Topology Briefing");
      expect(md).toContain("**Total Artifact Nodes:** 6");
      expect(md).toContain("## Artifact Type Distribution");
      expect(md).toContain("- **RESEARCH:** 1 node(s)");
      expect(md).toContain("- **PLAN:** 1 node(s)");
      expect(md).toContain("- **CHART:** 1 node(s)");
      expect(md).toContain("- **MATRIX:** 1 node(s)");
      expect(md).toContain("- **DEBATE:** 1 node(s)");
      expect(md).toContain("- **CODE:** 1 node(s)");
      expect(md).toContain("## Canvas Artifact Nodes");
      expect(md).toContain(
        "| ID | Type | Title | Summary | Coordinates | Metrics |",
      );
      expect(md).toContain("## Topological Relationships & Wires");
      expect(md).toContain(
        "| Relationship | Source | Target | Label | Strength |",
      );
    });

    it("escapes markdown pipes in node titles and summaries", () => {
      const fakeNode: SpatialCanvasNode = {
        id: "pipe-test",
        messageId: "m1",
        artifactType: "research",
        title: "Comparison | A vs B",
        summary: "Features | Tradeoffs",
        x: 0,
        y: 0,
        width: 320,
        height: 220,
        tags: [],
        createdAt: "2026-10-29T10:00:00Z",
      };

      const customCanvas: SpatialCanvasData = {
        nodes: [fakeNode],
        edges: [],
        bounds: {
          minX: 0,
          minY: 0,
          maxX: 320,
          maxY: 220,
          width: 320,
          height: 220,
        },
        stats: {
          totalNodes: 1,
          totalEdges: 0,
          typeDistribution: { research: 1 },
        },
      };

      const md = spatialCanvasToMarkdown(customCanvas);
      expect(md).toContain("Comparison \\| A vs B");
      expect(md).toContain("Features \\| Tradeoffs");
    });

    it("handles empty canvas safely in Markdown generation", () => {
      const emptyCanvas = buildSpatialCanvasData([]);
      const md = spatialCanvasToMarkdown(emptyCanvas);

      expect(md).toContain("**Total Artifact Nodes:** 0");
      expect(md).toContain("- *No artifacts present*");
    });
  });

  // 9. NLP Tokenization & Jaccard Overlap Engine
  describe("Tokenization & Jaccard Engine", () => {
    it("tokenizes and cleans words removing punctuation and common stopwords", () => {
      const tokens = tokenizeText(
        "The quick brown fox is running after a lazy dog!",
      );
      expect(tokens).toContain("quick");
      expect(tokens).toContain("brown");
      expect(tokens).toContain("fox");
      expect(tokens).toContain("running");
      expect(tokens).toContain("lazy");
      expect(tokens).toContain("dog");
      expect(tokens).not.toContain("the");
      expect(tokens).not.toContain("is");
      expect(tokens).not.toContain("after");
      expect(tokens).not.toContain("a");
    });

    it("returns 0 similarity when either token set is empty", () => {
      expect(computeJaccardSimilarity([], ["test"])).toBe(0);
      expect(computeJaccardSimilarity(["test"], [])).toBe(0);
      expect(computeJaccardSimilarity([], [])).toBe(0);
    });

    it("computes exact Jaccard similarity index", () => {
      const tokensA = ["quantum", "routing", "algorithm", "speedup"];
      const tokensB = ["quantum", "routing", "latency", "benchmark"];
      // Intersection: ["quantum", "routing"] = 2
      // Union: ["quantum", "routing", "algorithm", "speedup", "latency", "benchmark"] = 6
      // Jaccard: 2 / 6 = 0.3333
      const similarity = computeJaccardSimilarity(tokensA, tokensB);
      expect(similarity).toBe(0.3333);
    });
  });

  // 10. Strict Audit: ZERO Math.random() & Documentation Integrity
  describe("Zero Math.random() & Source Code Audit", () => {
    it("verifies that spatial-canvas.ts contains STRICTLY ZERO Math.random()", () => {
      const filePath = resolve(
        __dirname,
        "../src/lib/canvas/spatial-canvas.ts",
      );
      const fileContent = readFileSync(filePath, "utf-8");

      expect(fileContent).not.toContain("Math.random");
      expect(fileContent).not.toMatch(/Math\.random\s*\(/);
      expect(fileContent).not.toContain("crypto.getRandomValues");
    });

    it("verifies all core calculation and export functions are properly exported", () => {
      expect(typeof extractSpatialNodes).toBe("function");
      expect(typeof computeSpatialEdges).toBe("function");
      expect(typeof computeCanvasBounds).toBe("function");
      expect(typeof computeFitViewport).toBe("function");
      expect(typeof calculateBezierPath).toBe("function");
      expect(typeof buildSpatialCanvasData).toBe("function");
      expect(typeof spatialCanvasToCsv).toBe("function");
      expect(typeof spatialCanvasToMarkdown).toBe("function");
    });
  });
});
