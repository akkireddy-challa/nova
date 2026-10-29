import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ArtifactStage } from "../src/components/ArtifactStage";
import {
  extractSpatialNodes,
  computeSpatialEdges,
} from "../src/lib/canvas/spatial-canvas";
import { getArtifactMetadata } from "../src/lib/print-dossier";
import { resolveDossierTitle } from "../src/lib/html-dossier";
import { formatArtifactMarkdown } from "../src/lib/session-export";
import { synthesizeAudioSpectrogram } from "../src/lib/audio/spectrogram-inspector";
import type { ChatMessage, GenerativeArtifact } from "../src/lib/types";

describe("Audio Spectrogram Fullstack Integration", () => {
  const sampleSpectrogram = synthesizeAudioSpectrogram(
    "Acoustic Telemetry Stream",
  );
  const sampleArtifact: GenerativeArtifact = {
    type: "audio_spectrogram",
    data: sampleSpectrogram,
  };

  describe("ArtifactStage.tsx Audio Spectrogram Rendering & CSV Export", () => {
    it("renders ArtifactStage preview with AudioSpectrogramCard for audio_spectrogram artifacts", () => {
      const html = renderToStaticMarkup(
        React.createElement(ArtifactStage, {
          artifact: sampleArtifact,
          onClose: () => {},
        }),
      );

      expect(html).toContain("Acoustic Telemetry Stream");
      expect(html).toContain("Acoustic Spectrogram Inspector");
      expect(html).toContain("Download CSV");
      expect(html).toContain('role="graphics-document"');
    });

    it("renders print dossier section for audio_spectrogram artifacts", () => {
      const html = renderToStaticMarkup(
        React.createElement(ArtifactStage, {
          artifact: sampleArtifact,
          onClose: () => {},
        }),
      );

      expect(html).toContain("SNR:");
      expect(html).toContain("Aligned Phonetic Segments");
      expect(html).toContain("Speaker 1 (Architect)");
    });
  });

  describe("Spatial Intelligence Canvas Extraction & Edge Computation", () => {
    const mockMessages: ChatMessage[] = [
      {
        id: "msg-spec-1",
        role: "assistant",
        content: "Here is the audio spectrogram analysis.",
        timestamp: "2026-10-29T21:00:00Z",
        artifact: sampleArtifact,
      },
      {
        id: "msg-res-1",
        role: "assistant",
        content: "Here is the architectural research report.",
        timestamp: "2026-10-29T21:01:00Z",
        artifact: {
          type: "research",
          data: {
            title: "Acoustic Voice Telemetry Architecture",
            executiveSummary: "Multi-party voice synthesis and analysis.",
            keyFindings: [
              {
                point: "Spectral clarity",
                description: "Harmonic integrity",
                confidence: "high",
                citationIds: [],
              },
            ],
            recommendation:
              "Deploy spectrogram inspection with synchronized diarization.",
            sources: [],
          },
        },
      },
    ];

    it("extracts spatial canvas node with audio_spectrogram artifactType, metrics, and tags", () => {
      const nodes = extractSpatialNodes(mockMessages);
      const specNode = nodes.find(
        (n) => n.artifactType === "audio_spectrogram",
      );

      expect(specNode).toBeDefined();
      expect(specNode?.title).toBe("Acoustic Telemetry Stream");
      expect(specNode?.tags).toContain("AUDIO");
      expect(specNode?.tags).toContain("SPECTROGRAM");
      expect(specNode?.metrics?.status).toBe("acoustic");
      expect(specNode?.metrics?.itemCount).toBe(
        sampleSpectrogram.segments.length,
      );
      expect(specNode?.metrics?.evidenceCount).toBe(
        sampleSpectrogram.spectralBands.length,
      );
    });

    it("computes deterministic topological edges between audio_spectrogram and research node", () => {
      const nodes = extractSpatialNodes(mockMessages);
      const edges = computeSpatialEdges(nodes);

      const specEdge = edges.find(
        (e) =>
          (e.sourceId === nodes[0].id && e.targetId === nodes[1].id) ||
          (e.sourceId === nodes[1].id && e.targetId === nodes[0].id),
      );

      expect(specEdge).toBeDefined();
      expect(specEdge?.relationType).toBe("synthesizes");
      expect(specEdge?.label).toBe("Acoustic Evidence Ingestion");
      expect(specEdge?.strength).toBeGreaterThan(0.5);
    });
  });

  describe("Print Dossier & HTML Dossier Formatters", () => {
    it("resolves print dossier metadata for audio_spectrogram", () => {
      const meta = getArtifactMetadata(
        sampleArtifact,
        undefined,
        "gemini-2.0-flash",
      );
      expect(meta.title).toBe("Acoustic Telemetry Stream");
      expect(meta.modeName).toBe("Acoustic Spectrogram Inspector");
    });

    it("resolves HTML dossier title for audio_spectrogram", () => {
      const title = resolveDossierTitle(sampleArtifact, null);
      expect(title).toBe("Acoustic Telemetry Stream");
    });

    it("formats markdown export for audio_spectrogram artifacts in session export", () => {
      const md = formatArtifactMarkdown(sampleArtifact);
      expect(md).toContain(
        "#### 🎙️ Acoustic Spectrogram: Acoustic Telemetry Stream",
      );
      expect(md).toContain("*SNR:*");
      expect(md).toContain("**Aligned Phonetic Segments (");
    });
  });
});
