import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ArtifactStage } from "../src/components/ArtifactStage";
import {
  extractSpatialNodes,
  computeSpatialEdges,
} from "../src/lib/canvas/spatial-canvas";
import { exportSessionAsMarkdown } from "../src/lib/session-export";
import { getArtifactMetadata } from "../src/lib/print-dossier";
import {
  synthesizeMultiModalInspection,
  multiModalInspectionToCsv,
} from "../src/lib/multimodal/frame-inspector";
import type {
  GenerativeArtifact,
  Session,
  ChatMessage,
} from "../src/lib/types";

describe("multimodal inspection integration", () => {
  const sampleArtifact: GenerativeArtifact = {
    type: "multimodal_inspection",
    data: synthesizeMultiModalInspection({
      topic: "Autonomous Satellite Earth Observation",
      frames: [
        {
          frameIndex: 0,
          timestampMs: 1200,
          label: "Orbital scan of port logistics terminal",
          width: 1920,
          height: 1080,
          visualSaliencyPct: 96,
          regions: [
            {
              id: "bb-1",
              label: "Container Crane",
              ymin: 150,
              xmin: 100,
              ymax: 450,
              xmax: 350,
              confidencePct: 94,
              colorHex: "#38bdf8",
            },
            {
              id: "bb-2",
              label: "Cargo Vessel",
              ymin: 300,
              xmin: 500,
              ymax: 800,
              xmax: 950,
              confidencePct: 98,
              colorHex: "#10b981",
            },
          ],
          citations: [
            {
              citationId: "vc-1",
              claim: "Cargo vessel docked in primary loading berth.",
              boxId: "bb-2",
              frameIndex: 0,
              verifiableSource: "Sentinel-2 Multi-Spectral Band 4",
            },
          ],
        },
        {
          frameIndex: 1,
          timestampMs: 2500,
          label: "Secondary scan of container stacking zone",
          width: 1920,
          height: 1080,
          visualSaliencyPct: 88,
          regions: [
            {
              id: "bb-3",
              label: "Stacked Freight",
              ymin: 200,
              xmin: 250,
              ymax: 600,
              xmax: 700,
              confidencePct: 89,
              colorHex: "#f59e0b",
            },
          ],
          citations: [],
        },
      ],
      executiveSummary:
        "Clear spatial grounding across all orbital keyframes with 94% average confidence.",
    }),
  };

  it("renders ArtifactStage preview with CSV download button and dossier sections", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ArtifactStage, {
        artifact: sampleArtifact,
        onClose: () => {},
        mode: "research",
        model: "ollama:qwen2.5:0.5b",
      }),
    );

    // CSV button
    expect(markup).toContain("Download CSV");
    // Interactive card elements
    expect(markup).toContain("Autonomous Satellite Earth Observation");
    expect(markup).toContain("Orbital scan of port logistics terminal");
    expect(markup).toContain("Cargo Vessel");
    expect(markup).toContain("Grounded Visual Citations");
    // Print dossier section
    expect(markup).toContain("Grounding Index:");
    expect(markup).toContain("Frame Grounding &amp; Spatial Bounding Boxes");
  });

  it("extracts spatial canvas node with correct metrics and tags", () => {
    const mockMessages: ChatMessage[] = [
      {
        id: "msg-sat-1",
        role: "assistant",
        content: "Observation completed.",
        timestamp: "2026-10-29T20:00:00.000Z",
        artifact: sampleArtifact,
      },
    ];

    const nodes = extractSpatialNodes(mockMessages);
    expect(nodes.length).toBe(1);
    const node = nodes[0];
    expect(node.artifactType).toBe("multimodal_inspection");
    expect(node.title).toBe("Autonomous Satellite Earth Observation");
    expect(node.tags).toContain("MULTIMODAL");
    expect(node.tags).toContain("VISION");
    expect(node.metrics?.itemCount).toBe(2); // 2 frames
    expect(node.metrics?.evidenceCount).toBe(3); // 3 regions
    expect(node.metrics?.score).toBeGreaterThan(0);
  });

  it("computes spatial edges connecting multimodal inspection to research artifacts", () => {
    const mockMessages: ChatMessage[] = [
      {
        id: "msg-sat-1",
        role: "assistant",
        content: "Vision scan",
        timestamp: "2026-10-29T20:00:00.000Z",
        artifact: sampleArtifact,
      },
      {
        id: "msg-research-1",
        role: "assistant",
        content: "Research report",
        timestamp: "2026-10-29T20:01:00.000Z",
        artifact: {
          type: "research",
          data: {
            title: "Orbital Maritime Logistics",
            executiveSummary: "Satellite Earth Observation analysis.",
            recommendation:
              "Deploy orbital constellation for continuous real-time monitoring.",
            keyFindings: [],
            sources: [],
          },
        },
      },
    ];

    const nodes = extractSpatialNodes(mockMessages);
    const edges = computeSpatialEdges(nodes);
    expect(edges.length).toBeGreaterThan(0);
    const connectingEdge = edges.find(
      (e) =>
        e.relationType === "validates" &&
        e.label === "Visual Empirical Evidence",
    );
    expect(connectingEdge).toBeDefined();
    expect(connectingEdge?.strength).toBeGreaterThan(0.7);
  });

  it("exports session markdown with visual citations and frame inspection scorecard", () => {
    const session: Session = {
      id: "sess-sat-1",
      title: "Satellite Inspection Mission",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mode: "research",
      messages: [
        {
          id: "m-user",
          role: "user",
          content: "Inspect latest orbital telemetry.",
          timestamp: "2026-10-29T20:00:00.000Z",
        },
        {
          id: "m-assistant",
          role: "assistant",
          content: "Analysis completed.",
          timestamp: "2026-10-29T20:01:00.000Z",
          artifact: sampleArtifact,
        },
      ],
    };

    const markdown = exportSessionAsMarkdown(session);
    expect(markdown).toContain(
      "👁️ Multimodal Vision Inspection: Autonomous Satellite Earth Observation",
    );
    expect(markdown).toContain("Visual Grounding Index:");
    expect(markdown).toContain("Frame 1** (1920x1080");
    expect(markdown).toContain("Cargo vessel docked in primary loading berth.");
  });

  it("resolves print dossier title and metadata correctly", () => {
    const metadata = getArtifactMetadata(
      sampleArtifact,
      undefined,
      "ollama:qwen2.5:0.5b",
    );
    expect(metadata.title).toBe("Autonomous Satellite Earth Observation");
    expect(metadata.modeName).toBe("Multimodal Vision Grounding");
    expect(metadata.model).toBe("ollama:qwen2.5:0.5b");
  });

  it("formats deterministic RFC 4180 CSV export with frame and detection coordinates", () => {
    const csv = multiModalInspectionToCsv(sampleArtifact.data);
    expect(csv).toContain("Record Type,Item ID,Frame Index,Timestamp Ms");
    expect(csv).toContain("KEYFRAME,frame-0,0,1200");
    expect(csv).toContain("BOUNDING_REGION,bb-2,0,1200,Cargo Vessel");
    expect(csv).toContain("VISUAL_CITATION,vc-1,0,1200");
    expect(csv).toContain("Autonomous Satellite Earth Observation");
  });
});
