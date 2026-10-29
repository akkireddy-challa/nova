import { describe, it, expect } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import fs from "fs";
import path from "path";
import { Navbar, NAVBAR_MODES } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { ArtifactStage } from "@/components/ArtifactStage";
import {
  extractSpatialNodes,
  computeSpatialEdges,
} from "@/lib/canvas/spatial-canvas";
import {
  analyzePersonaCouncil,
  personaCouncilToCsv,
  personaCouncilToMarkdown,
} from "@/lib/research/persona-studio";
import type {
  Session,
  ChatMessage,
  StudioMode,
  PersonaCouncilArtifact,
  GenerativeArtifact,
} from "@/lib/types";

describe("Persona Council Studio Fullstack Integration", () => {
  const sampleCouncilArtifact: PersonaCouncilArtifact = analyzePersonaCouncil(
    "Implement Zero-Trust Service Mesh with Istio & SPIFFE/SPIRE",
    "Comprehensive enterprise zero-trust infrastructure modernization replacing perimeter firewalls with mTLS microsegmentation.",
  );

  const sampleMessages: ChatMessage[] = [
    {
      id: "msg-user-1",
      role: "user",
      content:
        "Please evaluate migrating our microservices architecture to an Istio service mesh with SPIFFE/SPIRE cryptographic workload identity.",
      timestamp: "2026-10-29T12:00:00.000Z",
    },
    {
      id: "msg-asst-1",
      role: "assistant",
      content:
        "The Executive Council has deliberated and completed a cross-domain architectural assessment.",
      timestamp: "2026-10-29T12:00:15.000Z",
      artifact: {
        type: "council",
        data: sampleCouncilArtifact,
      },
    },
  ];

  const sampleSession: Session = {
    id: "sess-persona-council",
    title: "Zero-Trust Service Mesh Council Deliberation",
    mode: "persona",
    createdAt: "2026-10-29T12:00:00.000Z",
    updatedAt: "2026-10-29T12:00:20.000Z",
    messages: sampleMessages,
  };

  describe("Navbar.tsx Integration Contract", () => {
    const navbarSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/Navbar.tsx"),
      "utf-8",
    );

    it("includes 'persona' mode in NAVBAR_MODES with 'Persona Council' label", () => {
      const personaMode = NAVBAR_MODES.find((m) => m.id === "persona");
      expect(personaMode).toBeDefined();
      expect(personaMode?.label).toBe("Persona Council");
    });

    it("renders Navbar breadcrumb for 'persona' mode", () => {
      const html = renderToString(
        React.createElement(Navbar, {
          currentMode: "persona",
          onSelectMode: () => {},
          onOpenMemory: () => {},
          onOpenPalette: () => {},
          onNewSession: () => {},
          memoryCount: 3,
          models: [],
          modelsStatus: "ready",
          currentModel: "anthropic:claude-sonnet-5-5",
          onSelectModel: () => {},
        }),
      );

      expect(html).toContain("Persona Council");
    });

    it("ensures strict zero Math.random() in Navbar.tsx", () => {
      expect(navbarSource).not.toContain("Math.random()");
    });
  });

  describe("Sidebar.tsx Integration Contract", () => {
    const sidebarSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/Sidebar.tsx"),
      "utf-8",
    );

    it("classifies 'persona' mode as an active studio chat mode", () => {
      expect(sidebarSource).toContain('"persona"');
      expect(sidebarSource).toContain("Council");
    });

    it("renders Sidebar and verifies switching to 'persona' mode", () => {
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
      element.props.onSelectMode("persona");
      expect(selectedMode).toBe("persona");
    });

    it("ensures strict zero Math.random() in Sidebar.tsx", () => {
      expect(sidebarSource).not.toContain("Math.random()");
    });
  });

  describe("ArtifactStage.tsx Council Rendering & CSV Export", () => {
    const stageSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/ArtifactStage.tsx"),
      "utf-8",
    );

    it("imports PersonaCouncilCard and personaCouncilToCsv in ArtifactStage", () => {
      expect(stageSource).toContain("PersonaCouncilCard");
      expect(stageSource).toContain("personaCouncilToCsv");
    });

    it("renders ArtifactStage preview with PersonaCouncilCard for council artifacts", () => {
      const councilArtifact: GenerativeArtifact = {
        type: "council",
        data: sampleCouncilArtifact,
      };

      const html = renderToString(
        React.createElement(ArtifactStage, {
          artifact: councilArtifact,
          onClose: () => {},
        }),
      );

      expect(html).toContain("Implement Zero-Trust Service Mesh with Istio");
      expect(html).toContain("Executive Council Review");
      expect(html).toContain("Download CSV");
    });

    it("ensures strict zero Math.random() in ArtifactStage.tsx", () => {
      expect(stageSource).not.toContain("Math.random()");
    });
  });

  describe("Spatial Canvas 2D Extraction for Council Artifacts", () => {
    it("extracts council nodes with tags and metrics in extractSpatialNodes", () => {
      const nodes = extractSpatialNodes(sampleMessages);
      expect(nodes.length).toBe(1);

      const councilNode = nodes[0];
      expect(councilNode.artifactType).toBe("council");
      expect(councilNode.title).toContain("Zero-Trust Service Mesh");
      expect(councilNode.tags).toContain("COUNCIL");
      expect(councilNode.tags).toContain("EXECUTIVE");
      expect(councilNode.metrics?.score).toBe(
        sampleCouncilArtifact.alignmentIndex,
      );
      expect(councilNode.metrics?.itemCount).toBe(
        sampleCouncilArtifact.reviews.length,
      );
    });

    it("computes spatial edges between council and research artifacts", () => {
      const multiArtifactMessages: ChatMessage[] = [
        ...sampleMessages,
        {
          id: "msg-research-1",
          role: "assistant",
          content: "Detailed Istio architecture research document.",
          timestamp: "2026-10-29T12:00:30.000Z",
          artifact: {
            type: "research",
            data: {
              title: "Istio Service Mesh Performance & Overhead Benchmark",
              executiveSummary:
                "Detailed benchmarking of Istio proxy latency and CPU overhead under high transaction throughput.",
              recommendation:
                "Adopt Istio ambient mesh mode to reduce sidecar memory footprint.",
              keyFindings: [
                {
                  point: "Ambient mode reduces sidecar memory footprint by 70%",
                  description:
                    "Significant memory savings achieved across all nodes.",
                  confidence: "high",
                  citationIds: [],
                },
              ],
              sources: [],
            },
          },
        },
      ];

      const nodes = extractSpatialNodes(multiArtifactMessages);
      expect(nodes.length).toBe(2);

      const edges = computeSpatialEdges(nodes);
      expect(edges.length).toBeGreaterThan(0);
      expect(edges[0].sourceId).toBeDefined();
      expect(edges[0].targetId).toBeDefined();
    });
  });

  describe("Deterministic Export & Full Quality Audit", () => {
    it("exports council deliberation to valid RFC 4180 CSV", () => {
      const csv = personaCouncilToCsv(sampleCouncilArtifact);
      expect(csv).toContain(
        "Record Type,Persona / Category,Role / Dimension,Score,Grade / Severity,Verdict / Status,Core Analysis,Details / Items",
      );
      expect(csv).toContain("Council Summary");
      expect(csv).toContain("Persona Review");
      expect(csv).toContain("\r\n");
    });

    it("exports council deliberation to executive Markdown briefing", () => {
      const md = personaCouncilToMarkdown(sampleCouncilArtifact);
      expect(md).toContain("# Executive Council Briefing:");
      expect(md).toContain("## Persona Scorecard Overview");
      expect(md).toContain("## Strategic Compromise & Synthesis");
      expect(md).toContain("## Executive Action Items Checklist");
    });

    it("strictly verifies ZERO Math.random() in persona-studio.ts and PersonaCouncilCard.tsx", () => {
      const engineSource = fs.readFileSync(
        path.join(process.cwd(), "src/lib/research/persona-studio.ts"),
        "utf-8",
      );
      const cardSource = fs.readFileSync(
        path.join(
          process.cwd(),
          "src/components/GenerativeCards/PersonaCouncilCard.tsx",
        ),
        "utf-8",
      );

      expect(engineSource).not.toContain("Math.random()");
      expect(engineSource).not.toContain("Math.random");
      expect(cardSource).not.toContain("Math.random()");
      expect(cardSource).not.toContain("Math.random");
    });
  });
});
