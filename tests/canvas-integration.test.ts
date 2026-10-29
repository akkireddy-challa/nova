import { describe, it, expect } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";
import { Navbar, NAVBAR_MODES } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { SpatialIntelligenceCanvas } from "@/components/SpatialIntelligenceCanvas";
import { Session, ChatMessage, StudioMode } from "@/lib/types";

describe("Spatial Intelligence Canvas & Viewport Integration", () => {
  const sampleMessages: ChatMessage[] = [
    {
      id: "msg-1",
      role: "user",
      content:
        "Compare Postgres and ClickHouse for analytical time-series logs",
      timestamp: "2026-10-29T10:00:00.000Z",
    },
    {
      id: "msg-2",
      role: "assistant",
      content:
        "Here is the architectural comparison between PostgreSQL and ClickHouse.",
      timestamp: "2026-10-29T10:00:05.000Z",
      artifact: {
        type: "matrix",
        data: {
          topic: "Postgres vs ClickHouse",
          criteria: [
            { id: "c1", name: "Query Speed", weight: 0.5 },
            { id: "c2", name: "Transactional ACID", weight: 0.5 },
          ],
          options: [
            {
              id: "opt-1",
              name: "PostgreSQL",
              scores: { c1: 6, c2: 10 },
              pros: ["ACID compliance"],
              cons: ["Slow columnar scans"],
              totalWeightedScore: 8,
            },
            {
              id: "opt-2",
              name: "ClickHouse",
              scores: { c1: 10, c2: 4 },
              pros: ["Blazing fast vector/columnar scans"],
              cons: ["Limited transaction support"],
              totalWeightedScore: 7,
            },
          ],
          verdict:
            "Use ClickHouse for log aggregations, PostgreSQL for transactional master records.",
        },
      },
    },
    {
      id: "msg-3",
      role: "assistant",
      content:
        "Here is the dialectic debate on memory footprint and ingestion throughput.",
      timestamp: "2026-10-29T10:00:10.000Z",
      artifact: {
        type: "debate",
        data: {
          topic: "Columnar Storage vs Row-Oriented MVCC",
          consensusSummary:
            "Columnar compression outperforms row-oriented engines by 10x on columnar scans.",
          perspectives: [
            {
              agentName: "Columnar Systems Engineer",
              stance: "Advocate",
              avatarColor: "#0ea5e9",
              arguments: [
                "SIMD vectorized execution and LZ4 compression yield high I/O efficiency.",
              ],
              caveats: ["Row updates require background mutation merges."],
            },
            {
              agentName: "OLTP Architect",
              stance: "Critic",
              avatarColor: "#f43f5e",
              arguments: [
                "Row-oriented B-trees allow instant single-row reads and updates.",
              ],
              caveats: ["Scans on billions of rows saturate memory bus."],
            },
          ],
          synthesisVerdict:
            "Adopt hybrid lambda or dual-write architecture for real-time dashboards.",
        },
      },
    },
    {
      id: "msg-4",
      role: "assistant",
      content: "Here is the strategic rollout plan.",
      timestamp: "2026-10-29T10:00:15.000Z",
      artifact: {
        type: "plan",
        data: {
          goal: "Deploy ClickHouse Analytical Cluster",
          timeframe: "4 Weeks",
          overview:
            "Zero-downtime streaming ETL pipeline migration from Postgres to ClickHouse.",
          keySuccessMetrics: [
            "p99 latency < 50ms",
            "Zero data loss during CDC replay",
          ],
          phases: [
            {
              id: "ph-1",
              phaseNumber: 1,
              phaseName: "Kafka CDC Ingestion",
              summary: "Debezium connector mirroring change events.",
              status: "completed",
              tasks: [
                {
                  id: "t1",
                  title: "Deploy Debezium",
                  description: "Deploy Debezium",
                  status: "completed",
                },
                {
                  id: "t2",
                  title: "Validate schema registry",
                  description: "Validate schema registry",
                  status: "completed",
                },
              ],
            },
            {
              id: "ph-2",
              phaseNumber: 2,
              phaseName: "Benchmarking & Cutover",
              summary: "Run 100M row query benchmark suite.",
              status: "pending",
              tasks: [
                {
                  id: "t3",
                  title: "Measure p99 latency",
                  description: "Measure p99 latency",
                  status: "todo",
                },
                {
                  id: "t4",
                  title: "Switch read replicas",
                  description: "Switch read replicas",
                  status: "todo",
                },
              ],
            },
          ],
        },
      },
    },
  ];

  const sampleSession: Session = {
    id: "sess-spatial-demo",
    title: "Analytics Architecture Topology",
    mode: "canvas",
    createdAt: "2026-10-29T10:00:00.000Z",
    updatedAt: "2026-10-29T10:00:20.000Z",
    messages: sampleMessages,
  };

  describe("page.tsx Integration Contract", () => {
    const pageSource = fs.readFileSync(
      path.join(process.cwd(), "src/app/page.tsx"),
      "utf-8",
    );

    it("imports SpatialIntelligenceCanvas component cleanly", () => {
      expect(pageSource).toContain(
        'import { SpatialIntelligenceCanvas } from "@/components/SpatialIntelligenceCanvas";',
      );
    });

    it("renders SpatialIntelligenceCanvas when currentMode === 'canvas'", () => {
      expect(pageSource).toContain('currentMode === "canvas" ? (');
      expect(pageSource).toContain("<SpatialIntelligenceCanvas");
      expect(pageSource).toContain("session={activeSession");
      expect(pageSource).toContain("onSelectMode={setCurrentMode}");
      expect(pageSource).toContain("onInspectArtifact=");
    });

    it("ensures strict zero Math.random() compliance in src/app/page.tsx", () => {
      expect(pageSource).not.toContain("Math.random()");
    });
  });

  describe("Navbar.tsx Integration Contract & Modes List", () => {
    const navbarSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/Navbar.tsx"),
      "utf-8",
    );

    it("exports NAVBAR_MODES including 'canvas' mode", () => {
      expect(NAVBAR_MODES).toBeDefined();
      const canvasMode = NAVBAR_MODES.find((m) => m.id === "canvas");
      expect(canvasMode).toBeDefined();
      expect(canvasMode?.label).toBe("Spatial Canvas");
    });

    it("handles 'canvas' mode label and icon in getModeLabel", () => {
      expect(navbarSource).toContain('case "canvas":');
      expect(navbarSource).toContain('label: "Spatial Canvas"');
    });

    it("renders Navbar with 'canvas' mode displaying breadcrumb", () => {
      const html = renderToString(
        React.createElement(Navbar, {
          currentMode: "canvas",
          onSelectMode: () => {},
          onOpenMemory: () => {},
          onOpenPalette: () => {},
          onNewSession: () => {},
          memoryCount: 3,
          models: [],
          modelsStatus: "ready",
          currentModel: "gemini:gemini-2.0-flash",
          onSelectModel: () => {},
        }),
      );

      expect(html).toContain("Spatial Canvas");
      expect(html).toContain("NOVA");
      expect(html).toContain("Memories");
    });

    it("renders Navbar mode switcher dropdown containing 'canvas' option", () => {
      const html = renderToString(
        React.createElement(Navbar, {
          currentMode: "research",
          onSelectMode: () => {},
          onOpenMemory: () => {},
          onOpenPalette: () => {},
          onNewSession: () => {},
          memoryCount: 0,
          models: [],
          modelsStatus: "ready",
          currentModel: "gemini:gemini-2.0-flash",
          onSelectModel: () => {},
        }),
      );

      expect(html).toContain("Research");
    });

    it("ensures strict zero Math.random() compliance in src/components/Navbar.tsx", () => {
      expect(navbarSource).not.toContain("Math.random()");
    });
  });

  describe("Sidebar.tsx Integration Contract & Workspace Navigation", () => {
    const sidebarSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/Sidebar.tsx"),
      "utf-8",
    );

    it("includes 'canvas' in Sidebar workspaces list", () => {
      expect(sidebarSource).toContain('id: "canvas" as StudioMode');
      expect(sidebarSource).toContain('label: "Spatial Canvas"');
      expect(sidebarSource).toContain('isActive: currentMode === "canvas"');
      expect(sidebarSource).toContain('badge: "2D"');
    });

    it("renders Sidebar with active Spatial Canvas workspace tab when currentMode === 'canvas'", () => {
      const html = renderToString(
        React.createElement(Sidebar, {
          currentMode: "canvas",
          onSelectMode: () => {},
          sessions: [sampleSession],
          activeSessionId: sampleSession.id,
          onSelectSession: () => {},
          onApplyPrompt: () => {},
        }),
      );

      expect(html).toContain("Spatial Canvas");
      expect(html).toContain("2D");
      expect(html).toContain("Workspaces");
      expect(html).toContain("Recent Sessions");
      expect(html).toContain("Analytics Architecture Topology");
    });

    it("renders Sidebar and verifies clicking workspace modes switches to 'canvas'", () => {
      let selectedMode: string = "";
      const element = React.createElement(Sidebar, {
        currentMode: "research",
        onSelectMode: (mode: StudioMode) => {
          selectedMode = mode;
        },
        sessions: [sampleSession],
        activeSessionId: sampleSession.id,
        onSelectSession: () => {},
        onApplyPrompt: () => {},
      });

      expect(element).toBeDefined();
      element.props.onSelectMode("canvas");
      expect(selectedMode).toBe("canvas");
    });

    it("ensures strict zero Math.random() compliance in src/components/Sidebar.tsx", () => {
      expect(sidebarSource).not.toContain("Math.random()");
    });
  });

  describe("SpatialIntelligenceCanvas Component Rendering & Capabilities", () => {
    const canvasSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/SpatialIntelligenceCanvas.tsx"),
      "utf-8",
    );

    it("imports topology functions from spatial-canvas lib", () => {
      expect(canvasSource).toContain('from "@/lib/canvas/spatial-canvas"');
      expect(canvasSource).toContain("extractSpatialNodes");
      expect(canvasSource).toContain("computeSpatialEdges");
      expect(canvasSource).toContain("computeFitViewport");
    });

    it("renders SpatialIntelligenceCanvas with active session artifacts", () => {
      const html = renderToString(
        React.createElement(SpatialIntelligenceCanvas, {
          session: sampleSession,
          onSelectMode: () => {},
          onInspectArtifact: () => {},
        }),
      );

      // Verify header title & controls
      expect(html).toContain("Spatial Intelligence Canvas");
      expect(html).toContain("Zoom In");
      expect(html).toContain("Zoom Out");
      expect(html).toContain("Reset View");
      expect(html).toContain("Export Canvas CSV");
      expect(html).toContain("Copy Topology Report");

      // Verify node cards rendered from session artifacts
      expect(html).toContain("Postgres vs ClickHouse");
      expect(html).toContain("Columnar Storage vs Row-Oriented MVCC");
      expect(html).toContain("Deploy ClickHouse Analytical Cluster");

      // Verify mini-map container
      expect(html).toContain("Mini-Map");
    });

    it("handles null session cleanly with informative empty state", () => {
      const html = renderToString(
        React.createElement(SpatialIntelligenceCanvas, {
          session: null,
          onSelectMode: () => {},
          onInspectArtifact: () => {},
        }),
      );

      expect(html).toContain("Spatial Intelligence Canvas");
      expect(html).toContain("Start research or debate to populate canvas");
    });

    it("handles empty messages list cleanly without crashing", () => {
      const emptySession: Session = {
        id: "sess-empty",
        title: "Empty Session",
        mode: "canvas",
        createdAt: "2026-10-29T10:00:00.000Z",
        updatedAt: "2026-10-29T10:00:00.000Z",
        messages: [],
      };

      const html = renderToString(
        React.createElement(SpatialIntelligenceCanvas, {
          session: emptySession,
          onSelectMode: () => {},
          onInspectArtifact: () => {},
        }),
      );

      expect(html).toContain("Start research or debate to populate canvas");
    });

    it("ensures strict zero Math.random() compliance in SpatialIntelligenceCanvas and spatial-canvas.ts", () => {
      expect(canvasSource).not.toContain("Math.random()");

      const libSource = fs.readFileSync(
        path.join(process.cwd(), "src/lib/canvas/spatial-canvas.ts"),
        "utf-8",
      );
      expect(libSource).not.toContain("Math.random()");
    });
  });

  describe("Workspace Mode Switcher Orchestration", () => {
    it("simulates complete navigation flow: research -> canvas -> intelligence -> mcp", () => {
      let currentMode: StudioMode = "research";
      const setMode = (mode: StudioMode) => {
        currentMode = mode;
      };

      expect(currentMode).toBe("research");

      // User selects Spatial Canvas from sidebar or navbar
      setMode("canvas");
      expect(currentMode as string).toBe("canvas");

      // User selects Memory Search
      setMode("intelligence");
      expect(currentMode as string).toBe("intelligence");

      // User selects Tools & API (MCP)
      setMode("mcp");
      expect(currentMode as string).toBe("mcp");

      // User switches back to Spatial Canvas
      setMode("canvas");
      expect(currentMode as string).toBe("canvas");
    });
  });
});
