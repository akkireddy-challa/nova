import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  calculateAcousticSummary,
  computeWaveformEnvelope,
  synthesizeAudioSpectrogram,
  audioSpectrogramToCsv,
  audioSpectrogramToMarkdown,
} from "../src/lib/audio/spectrogram-inspector";
import type { AcousticSegment } from "../src/lib/types";

describe("Autonomous Audio Spectrogram & Acoustic Grounding Inspector", () => {
  const sampleSegments: AcousticSegment[] = [
    {
      id: "seg-1",
      startMs: 0,
      endMs: 3000,
      speakerTag: "Speaker 1",
      transcriptText: "First verified sentence.",
      acousticConfidencePct: 95,
      pitchHz: 210,
    },
    {
      id: "seg-2",
      startMs: 3500,
      endMs: 6500,
      speakerTag: "Speaker 2",
      transcriptText: "Second verified sentence.",
      acousticConfidencePct: 90,
      pitchHz: 230,
    },
  ];

  describe("calculateAcousticSummary", () => {
    it("computes accurate duration, confidence, SNR, and dominant frequency", () => {
      const summary = calculateAcousticSummary(sampleSegments, 48000, 2);

      expect(summary.durationSeconds).toBe(6.5);
      expect(summary.averageAcousticConfidencePct).toBe(93); // (95 + 90) / 2 = 92.5 -> 93
      expect(summary.snrDb).toBeGreaterThan(30.0);
      expect(summary.dominantFrequencyHz).toBe(220); // (210 + 230) / 2 = 220
      expect(summary.sampleRateHz).toBe(48000);
      expect(summary.channelCount).toBe(2);
    });

    it("handles empty segments list cleanly", () => {
      const summary = calculateAcousticSummary([]);
      expect(summary.durationSeconds).toBe(0);
      expect(summary.averageAcousticConfidencePct).toBe(100);
      expect(summary.dominantFrequencyHz).toBe(200);
    });
  });

  describe("computeWaveformEnvelope", () => {
    it("computes normalized amplitude points bounded between 0 and 1", () => {
      const envelope = computeWaveformEnvelope(sampleSegments, 32);

      expect(envelope.length).toBe(32);
      for (const amp of envelope) {
        expect(amp).toBeGreaterThanOrEqual(0);
        expect(amp).toBeLessThanOrEqual(1.0);
      }
    });

    it("returns quiet ambient floor when no segments provided", () => {
      const envelope = computeWaveformEnvelope([], 16);
      expect(envelope.length).toBe(16);
      expect(envelope.every((v) => v === 0.1)).toBe(true);
    });
  });

  describe("synthesizeAudioSpectrogram", () => {
    it("synthesizes valid populated AudioSpectrogramArtifact from topic", () => {
      const artifact = synthesizeAudioSpectrogram("Enterprise Audio Stream");

      expect(artifact.topic).toBe("Enterprise Audio Stream");
      expect(artifact.audioSource).toBeDefined();
      expect(artifact.segments.length).toBeGreaterThanOrEqual(3);
      expect(artifact.spectralBands.length).toBe(5);
      expect(artifact.waveformEnvelope.length).toBe(32);
      expect(artifact.summary.snrDb).toBeGreaterThan(25);
    });
  });

  describe("RFC 4180 CSV & Markdown Exports", () => {
    it("exports spectrogram data to RFC 4180 CSV with CRLF line endings", () => {
      const artifact = synthesizeAudioSpectrogram("Test Audio CSV");
      const csv = audioSpectrogramToCsv(artifact);

      expect(csv).toContain("\r\n");
      expect(csv).toContain(
        "RecordType,ID,SpeakerOrBand,StartMsOrRange,EndMsOrEnergyPct,ConfidenceOrClarity,TranscriptOrEvidence",
      );
      expect(csv).toContain("Segment,");
      expect(csv).toContain("SpectralBand,");
    });

    it("exports spectrogram to formatted Markdown report", () => {
      const artifact = synthesizeAudioSpectrogram("Test Audio Markdown");
      const md = audioSpectrogramToMarkdown(artifact);

      expect(md).toContain("# Audio Spectrogram Dossier: Test Audio Markdown");
      expect(md).toContain("## Acoustic Scorecard");
      expect(md).toContain("## Aligned Speaker Segments & Grounded Citations");
      expect(md).toContain("## Spectral Band Energy Distribution");
    });
  });

  describe("Zero Pseudo-Randomness Integrity", () => {
    it("strictly verifies ZERO Math.random() in spectrogram-inspector.ts", () => {
      const filePath = join(
        process.cwd(),
        "src/lib/audio/spectrogram-inspector.ts",
      );
      const source = readFileSync(filePath, "utf-8");

      expect(source).not.toContain("Math.random");
      expect(source).not.toContain("crypto.getRandomValues");
    });
  });
});
