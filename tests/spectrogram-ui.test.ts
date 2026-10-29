import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AudioSpectrogramCard } from "../src/components/GenerativeCards/AudioSpectrogramCard";
import { synthesizeAudioSpectrogram } from "../src/lib/audio/spectrogram-inspector";

describe("AudioSpectrogramCard Generative UI Component", () => {
  const sampleArtifact = synthesizeAudioSpectrogram(
    "Multi-Party Consensus Telemetry",
  );

  it("renders topic title, duration, and SNR in the scorecard", () => {
    const html = renderToStaticMarkup(
      React.createElement(AudioSpectrogramCard, { artifact: sampleArtifact }),
    );

    expect(html).toContain("Multi-Party Consensus Telemetry");
    expect(html).toContain("Acoustic Spectrogram Inspector");
    expect(html).toContain("SNR (Clarity)");
    expect(html).toContain("Acoustic Conf");
    expect(html).toContain("Speech / Silence");
    expect(html).toContain("Dominant F0");
  });

  it("renders the interactive SVG spectrogram canvas with graphics-document role", () => {
    const html = renderToStaticMarkup(
      React.createElement(AudioSpectrogramCard, { artifact: sampleArtifact }),
    );

    expect(html).toContain('role="graphics-document"');
    expect(html).toContain("Audio Spectrogram for");
    expect(html).toContain("<svg");
    expect(html).toContain("<rect");
    expect(html).toContain("waveGradient");
  });

  it("renders action buttons for Markdown report copy and CSV export", () => {
    const html = renderToStaticMarkup(
      React.createElement(AudioSpectrogramCard, { artifact: sampleArtifact }),
    );

    expect(html).toContain("Copy MD");
    expect(html).toContain("Export CSV");
  });

  it("renders the acoustic grounding synthesis callout", () => {
    const html = renderToStaticMarkup(
      React.createElement(AudioSpectrogramCard, { artifact: sampleArtifact }),
    );

    expect(html).toContain("Acoustic Grounding Synthesis");
    expect(html).toContain("Acoustic inspection verified across");
  });

  it("strictly enforces ZERO pseudo-randomness in AudioSpectrogramCard source", () => {
    const filePath = join(
      process.cwd(),
      "src/components/GenerativeCards/AudioSpectrogramCard.tsx",
    );
    const source = readFileSync(filePath, "utf-8");

    expect(source).not.toContain("Math.random");
    expect(source).not.toContain("crypto.getRandomValues");
  });
});
