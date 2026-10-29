import { describe, it, expect } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import fs from "fs";
import path from "path";
import { ArtifactStage } from "@/components/ArtifactStage";
import {
  extractSpatialNodes,
  computeSpatialEdges,
} from "@/lib/canvas/spatial-canvas";
import {
  runResilienceSimulation,
  simulationToCsv,
  simulationToMarkdown,
} from "@/lib/research/resilience-simulator";
import { getArtifactMetadata } from "@/lib/print-dossier";
import type {
  ChatMessage,
  ResilienceSimulationArtifact,
  GenerativeArtifact,
} from "@/lib/types";

describe("Resilience Simulation Fullstack Integration", () => {
  const sampleSim: ResilienceSimulationArtifact = runResilienceSimulation(
    "Multi-Region Database Failover & Partition Test",
    {
      baselineRps: 1800,
      steps: 25,
    },
  );

  const sampleMessages: ChatMessage[] = [
    {
      id: "msg-user-sim",
      role: "user",
      content:
        "Run a stress-test chaos simulation on our multi-region failover architecture.",
      timestamp: "2026-10-29T14:00:00.000Z",
    },
    {
      id: "msg-asst-sim",
      role: "assistant",
      content:
        "The chaos stress simulation has completed across 25 discrete time steps.",
      timestamp: "2026-10-29T14:00:15.000Z",
      artifact: {
        type: "simulation",
        data: sampleSim,
      },
    },
  ];

  describe("ArtifactStage.tsx Simulation Rendering & CSV Export", () => {
    const stageSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/ArtifactStage.tsx"),
      "utf-8",
    );

    it("imports ResilienceSimulationCard and simulationToCsv in ArtifactStage", () => {
      expect(stageSource).toContain("ResilienceSimulationCard");
      expect(stageSource).toContain("simulationToCsv");
    });

    it("renders ArtifactStage preview with ResilienceSimulationCard for simulation artifacts", () => {
      const simArtifact: GenerativeArtifact = {
        type: "simulation",
        data: sampleSim,
      };

      const html = renderToString(
        React.createElement(ArtifactStage, {
          artifact: simArtifact,
          onClose: () => {},
        }),
      );

      expect(html).toContain(
        "Multi-Region Database Failover &amp; Partition Test",
      );
      expect(html).toContain("Chaos &amp; Resilience Simulator");
      expect(html).toContain("Download CSV");
    });

    it("ensures strict zero Math.random() in ArtifactStage.tsx", () => {
      expect(stageSource).not.toContain("Math.random()");
    });
  });

  describe("Spatial Canvas 2D Extraction for Simulation Artifacts", () => {
    it("extracts simulation nodes with tags and resilience score metrics in extractSpatialNodes", () => {
      const nodes = extractSpatialNodes(sampleMessages);
      expect(nodes.length).toBe(1);

      const simNode = nodes[0];
      expect(simNode.artifactType).toBe("simulation");
      expect(simNode.title).toContain("Multi-Region Database Failover");
      expect(simNode.tags).toContain("SIMULATION");
      expect(simNode.tags).toContain("CHAOS");
      expect(simNode.metrics?.score).toBe(sampleSim.summary.resilienceScore);
      expect(simNode.metrics?.itemCount).toBe(sampleSim.telemetrySeries.length);
    });

    it("computes topological edges between simulation and research artifacts", () => {
      const multiMessages: ChatMessage[] = [
        ...sampleMessages,
        {
          id: "msg-res-arch",
          role: "assistant",
          content: "Spanner multi-region architecture documentation.",
          timestamp: "2026-10-29T14:00:30.000Z",
          artifact: {
            type: "research",
            data: {
              title: "Global Multi-Region Distributed Spanner Topology",
              executiveSummary: "Spanner consensus replication model.",
              recommendation: "Deploy 3-region synchronous replication.",
              keyFindings: [
                {
                  point:
                    "Synchronous replication guarantees zero data loss (RPO=0)",
                  description: "Ensures atomic consensus across nodes",
                  confidence: "high" as const,
                  citationIds: [],
                },
              ],
              sources: [],
            },
          },
        },
      ];

      const nodes = extractSpatialNodes(multiMessages);
      expect(nodes.length).toBe(2);

      const edges = computeSpatialEdges(nodes);
      expect(edges.length).toBeGreaterThan(0);
      expect(edges[0].relationType).toBe("validates");
      expect(edges[0].label).toBe("Resilience Verification");
    });
  });

  describe("Print Dossier Metadata Resolver", () => {
    it("resolves simulation title and modeName in getArtifactMetadata", () => {
      const simArtifact: GenerativeArtifact = {
        type: "simulation",
        data: sampleSim,
      };

      const meta = getArtifactMetadata(simArtifact);
      expect(meta.title).toBe(
        "Multi-Region Database Failover & Partition Test",
      );
      expect(meta.modeName).toBe("Resilience & Chaos Simulation");
    });
  });

  describe("Deterministic Export & Full Quality Audit", () => {
    it("exports simulation telemetry to RFC 4180 CSV with CRLF endings", () => {
      const csv = simulationToCsv(sampleSim);
      expect(csv).toContain(
        "Step,TimeSeconds,ThroughputRps,LatencyP99Ms,ErrorRatePct,CpuSaturationPct,CircuitBreaker,Incident",
      );
      expect(csv).toContain("\r\n");
    });

    it("exports executive briefing to Markdown with failure diagnosis and hardening checklist", () => {
      const md = simulationToMarkdown(sampleSim);
      expect(md).toContain("# Resilience & Chaos Stress-Test Simulation:");
      expect(md).toContain("## Bottleneck & Failure Mode Diagnosis");
      expect(md).toContain("## Configured Chaos Injections");
      expect(md).toContain("## Architectural Hardening Recommendations");
    });

    it("strictly verifies ZERO Math.random() in resilience-simulator.ts and ResilienceSimulationCard.tsx", () => {
      const engineSource = fs.readFileSync(
        path.join(process.cwd(), "src/lib/research/resilience-simulator.ts"),
        "utf-8",
      );
      const cardSource = fs.readFileSync(
        path.join(
          process.cwd(),
          "src/components/GenerativeCards/ResilienceSimulationCard.tsx",
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
