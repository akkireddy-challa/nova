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
import { getArtifactMetadata } from "@/lib/print-dossier";
import {
  generateAudioBriefing,
  audioBriefingToCsv,
  audioBriefingToVtt,
  audioBriefingToMarkdown,
} from "@/lib/audio/voice-briefing";
import type {
  ChatMessage,
  GenerativeArtifact,
  AudioBriefingArtifact,
} from "@/lib/types";

describe("Audio Briefing Fullstack Integration", () => {
  const sampleBriefing: AudioBriefingArtifact = generateAudioBriefing(
    "Global Distributed Spanner Architecture",
  );

  const sampleArtifact: GenerativeArtifact = {
    type: "audio_briefing",
    data: sampleBriefing,
  };

  const sampleMessages: ChatMessage[] = [
    {
      id: "msg-user-1",
      role: "user",
      content: "Explain the Spanner database topology with audio overview.",
      timestamp: "2026-10-29T14:00:00.000Z",
    },
    {
      id: "msg-agent-audio",
      role: "assistant",
      content: "Synthesized full multimodal audio briefing.",
      timestamp: "2026-10-29T14:00:15.000Z",
      artifact: sampleArtifact,
    },
  ];

  describe("ArtifactStage.tsx Audio Briefing Rendering & CSV Export", () => {
    const stageSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/ArtifactStage.tsx"),
      "utf-8",
    );

    it("imports AudioBriefingCard and audioBriefingToCsv in ArtifactStage", () => {
      expect(stageSource).toContain("AudioBriefingCard");
      expect(stageSource).toContain("audioBriefingToCsv");
    });

    it("renders ArtifactStage preview with AudioBriefingCard for audio_briefing artifacts", () => {
      const html = renderToString(
        React.createElement(ArtifactStage, {
          artifact: sampleArtifact,
          onClose: () => {},
        }),
      );

      expect(html).toContain("Multimodal Audio Briefing Engine");
      expect(html).toContain("Global Distributed Spanner Architecture");
      expect(html).toContain("Play Briefing");
      expect(html).toContain("CSV");
      expect(html).toContain("VTT");
      expect(html).toContain("Copy");
    });

    it("ensures strict zero Math.random() in ArtifactStage.tsx", () => {
      expect(stageSource).not.toContain("Math.random()");
      expect(stageSource).not.toContain("Math.random");
    });
  });

  describe("Spatial Canvas 2D Extraction for Audio Briefing Artifacts", () => {
    it("extracts audio_briefing nodes with tags and duration metrics in extractSpatialNodes", () => {
      const nodes = extractSpatialNodes(sampleMessages);
      expect(nodes.length).toBe(1);

      const audioNode = nodes[0];
      expect(audioNode.artifactType).toBe("audio_briefing");
      expect(audioNode.title).toContain(
        "Global Distributed Spanner Architecture",
      );
      expect(audioNode.tags).toContain("AUDIO");
      expect(audioNode.tags).toContain("BRIEFING");
      expect(audioNode.metrics?.score).toBe(
        Math.round(sampleBriefing.totalDurationMs / 1000),
      );
      expect(audioNode.metrics?.itemCount).toBe(sampleBriefing.chapters.length);
      expect(audioNode.metrics?.evidenceCount).toBe(
        sampleBriefing.totalWordCount,
      );
    });

    it("computes topological edges between audio_briefing and research artifacts", () => {
      const multiMessages: ChatMessage[] = [
        ...sampleMessages,
        {
          id: "msg-res-arch",
          role: "assistant",
          content: "Spanner architecture whitepaper.",
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
      const audioEdge = edges.find(
        (e) =>
          (e.sourceId === nodes[0].id && e.targetId === nodes[1].id) ||
          (e.sourceId === nodes[1].id && e.targetId === nodes[0].id),
      );
      expect(audioEdge).toBeDefined();
      expect(audioEdge?.relationType).toBe("synthesizes");
      expect(audioEdge?.label).toContain("Audio Narration");
    });
  });

  describe("Print Dossier Metadata Resolver", () => {
    it("resolves audio_briefing title and modeName in getArtifactMetadata", () => {
      const meta = getArtifactMetadata(sampleArtifact);
      expect(meta.title).toContain("Global Distributed Spanner Architecture");
      expect(meta.modeName).toBe("Audio Narration Briefing");
      expect(meta.banner).toContain("NOVA RESEARCH INTELLIGENCE");
    });
  });

  describe("Deterministic Export & Full Quality Audit", () => {
    it("exports audio briefing telemetry to RFC 4180 CSV with CRLF endings", () => {
      const csv = audioBriefingToCsv(sampleBriefing);
      expect(csv).toContain(
        "Chapter,StartTimeMs,EndTimeMs,StartTime,EndTime,Speaker,Title,WordCount,Script",
      );
      expect(csv).toContain("\r\n");
      const lines = csv.split("\r\n");
      expect(lines.length).toBe(sampleBriefing.chapters.length + 1);
    });

    it("exports audio briefing subtitles to WebVTT format", () => {
      const vtt = audioBriefingToVtt(sampleBriefing);
      expect(vtt.startsWith("WEBVTT")).toBe(true);
      expect(vtt).toContain("-->");
    });

    it("exports executive briefing to Markdown format", () => {
      const md = audioBriefingToMarkdown(sampleBriefing);
      expect(md).toContain("# 🎙️ Audio Briefing:");
      expect(md).toContain("## Chapter Breakdown & Timeline");
      expect(md).toContain("## Full Narration Script");
    });

    it("strictly verifies ZERO Math.random() in audio module and UI components", () => {
      const engineSrc = fs.readFileSync(
        path.join(process.cwd(), "src/lib/audio/voice-briefing.ts"),
        "utf-8",
      );
      const barSrc = fs.readFileSync(
        path.join(process.cwd(), "src/components/AudioBriefingBar.tsx"),
        "utf-8",
      );
      const cardSrc = fs.readFileSync(
        path.join(
          process.cwd(),
          "src/components/GenerativeCards/AudioBriefingCard.tsx",
        ),
        "utf-8",
      );

      expect(engineSrc).not.toContain("Math.random()");
      expect(engineSrc).not.toContain("Math.random");

      expect(barSrc).not.toContain("Math.random()");
      expect(barSrc).not.toContain("Math.random");

      expect(cardSrc).not.toContain("Math.random()");
      expect(cardSrc).not.toContain("Math.random");
    });
  });
});
