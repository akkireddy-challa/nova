import { describe, it, expect } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import fs from "fs";
import path from "path";
import {
  AudioBriefingBar,
  getNextPlaybackSpeed,
  PLAYBACK_SPEEDS,
} from "@/components/AudioBriefingBar";
import { AudioBriefingCard } from "@/components/GenerativeCards/AudioBriefingCard";
import {
  generateAudioBriefing,
  formatDurationTimestamp,
} from "@/lib/audio/voice-briefing";
import type { AudioBriefingArtifact } from "@/lib/types";

describe("Multimodal Audio Briefing Generative UI Components", () => {
  const sampleBriefing: AudioBriefingArtifact = generateAudioBriefing(
    "Zero-Downtime Multi-Region Database Architecture & Failover Strategy",
    {
      topic:
        "Zero-Downtime Multi-Region Database Architecture & Failover Strategy",
    },
  );

  const barSource = fs.readFileSync(
    path.join(process.cwd(), "src/components/AudioBriefingBar.tsx"),
    "utf-8",
  );

  const cardSource = fs.readFileSync(
    path.join(
      process.cwd(),
      "src/components/GenerativeCards/AudioBriefingCard.tsx",
    ),
    "utf-8",
  );

  describe("AudioBriefingBar Component", () => {
    it("renders with title, duration, scrubber, and waveform bars", () => {
      const html = renderToString(
        React.createElement(AudioBriefingBar, {
          briefing: sampleBriefing,
        }),
      );

      // Title & container
      expect(html).toContain(
        "Zero-Downtime Multi-Region Database Architecture",
      );
      expect(html).toContain('data-testid="audio-briefing-bar"');

      // Timeline Scrubber
      expect(html).toContain('data-testid="timeline-scrubber"');
      expect(html).toContain('type="range"');
      expect(html).toContain(`max="${sampleBriefing.totalDurationMs}"`);

      // Time display formatted duration
      const totalFormatted = formatDurationTimestamp(
        sampleBriefing.totalDurationMs,
      );
      expect(html).toContain(totalFormatted);

      // SVG Audio Waveform Visualizer
      expect(html).toContain('data-testid="waveform-visualizer"');
      expect(html).toContain('data-testid="waveform-bar"');

      // Action and playback buttons
      expect(html).toContain('data-testid="play-pause-btn"');
      expect(html).toContain('data-testid="skip-prev-btn"');
      expect(html).toContain('data-testid="skip-next-btn"');
      expect(html).toContain('data-testid="stop-btn"');
      expect(html).toContain('data-testid="export-csv-btn"');
      expect(html).toContain('data-testid="copy-markdown-btn"');
    });

    it("speed multiplier cycles properly (1x, 1.25x, 1.5x, 2x)", () => {
      // Verify cycling algorithm
      expect(PLAYBACK_SPEEDS).toEqual([1.0, 1.25, 1.5, 2.0]);
      expect(getNextPlaybackSpeed(1.0)).toBe(1.25);
      expect(getNextPlaybackSpeed(1.25)).toBe(1.5);
      expect(getNextPlaybackSpeed(1.5)).toBe(2.0);
      expect(getNextPlaybackSpeed(2.0)).toBe(1.0);

      // Test tolerance with close floats
      expect(getNextPlaybackSpeed(1.001)).toBe(1.25);

      // Render each speed state and verify speed badge
      for (const speed of PLAYBACK_SPEEDS) {
        const html = renderToString(
          React.createElement(AudioBriefingBar, {
            briefing: sampleBriefing,
            currentSpeed: speed,
          }),
        );
        expect(html).toContain('data-testid="speed-multiplier-btn"');
        expect(html).toContain(`${speed.toFixed(1)}x`);
      }
    });

    it("renders chapter drawer with all chapter titles and speakers", () => {
      const html = renderToString(
        React.createElement(AudioBriefingBar, {
          briefing: sampleBriefing,
          initialDrawerOpen: true,
        }),
      );

      // Drawer container
      expect(html).toContain('data-testid="chapter-drawer"');
      expect(html).toContain("Briefing Chapters &amp; Transcript");

      // Verify each chapter title, index, and speaker
      for (const ch of sampleBriefing.chapters) {
        expect(html).toContain(`Chapter ${ch.chapterIndex}`);
        const escapedTitle = ch.title.replace(/&/g, "&amp;");
        expect(html).toContain(escapedTitle);
        const escapedSpeaker = ch.speaker.replace(/&/g, "&amp;");
        expect(html).toContain(escapedSpeaker);
      }

      // Verify key takeaways are displayed in drawer
      const firstChapterWithTakeaways = sampleBriefing.chapters.find(
        (c) => c.keyTakeaways && c.keyTakeaways.length > 0,
      );
      if (
        firstChapterWithTakeaways &&
        firstChapterWithTakeaways.keyTakeaways[0]
      ) {
        const escapedTakeaway =
          firstChapterWithTakeaways.keyTakeaways[0].replace(/&/g, "&amp;");
        expect(html).toContain(escapedTakeaway);
      }
    });

    it("supports backwards-compatible fallback rendering when briefing prop is omitted", () => {
      const html = renderToString(
        React.createElement(AudioBriefingBar, {
          title: "Legacy Overview",
          currentChunk: 1,
          totalChunks: 4,
          currentSpeed: 1.5,
          isPlaying: true,
          isPaused: false,
        }),
      );

      expect(html).toContain("Legacy Overview");
      expect(html).toContain('data-testid="audio-briefing-bar"');
      expect(html).toContain("1.5x");
      expect(html).toContain('data-testid="waveform-visualizer"');
    });
  });

  describe("AudioBriefingCard Component", () => {
    it("renders header, duration pill, word count, chapters count, and action buttons", () => {
      const html = renderToString(
        React.createElement(AudioBriefingCard, {
          briefing: sampleBriefing,
        }),
      );

      // Header Branding
      expect(html).toContain("Multimodal Audio Briefing Engine");
      expect(html).toContain(
        "Zero-Downtime Multi-Region Database Architecture",
      );

      // Meta Pills
      expect(html).toContain('data-testid="duration-pill"');
      expect(html).toContain(
        formatDurationTimestamp(sampleBriefing.totalDurationMs),
      );

      expect(html).toContain('data-testid="word-count-pill"');
      expect(html).toContain(
        `${sampleBriefing.totalWordCount.toLocaleString()} words`,
      );

      expect(html).toContain('data-testid="chapters-count-pill"');
      expect(html).toContain(`${sampleBriefing.chapters.length} Chapters`);

      // Action CTAs
      expect(html).toContain('data-testid="play-briefing-btn"');
      expect(html).toContain("Play Briefing");
      expect(html).toContain('data-testid="card-export-csv-btn"');
      expect(html).toContain("CSV");
      expect(html).toContain('data-testid="card-export-vtt-btn"');
      expect(html).toContain("VTT");
      expect(html).toContain('data-testid="card-copy-md-btn"');
      expect(html).toContain("Copy");
    });

    it("renders waveform preview banner with chapter markers", () => {
      const html = renderToString(
        React.createElement(AudioBriefingCard, {
          briefing: sampleBriefing,
        }),
      );

      expect(html).toContain('data-testid="card-waveform-banner"');

      // Verify chapter markers
      for (const ch of sampleBriefing.chapters) {
        expect(html).toContain(
          `data-testid="chapter-marker-${ch.chapterIndex}"`,
        );
        expect(html).toContain(`Ch ${ch.chapterIndex}`);
      }
    });

    it("renders chapter cards with play buttons, speakers, and takeaways", () => {
      const html = renderToString(
        React.createElement(AudioBriefingCard, {
          briefing: sampleBriefing,
        }),
      );

      expect(html).toContain('data-testid="chapters-list"');

      // Check each chapter card
      for (const ch of sampleBriefing.chapters) {
        expect(html).toContain(`data-testid="chapter-card-${ch.chapterIndex}"`);
        expect(html).toContain(
          `data-testid="play-chapter-btn-${ch.chapterIndex}"`,
        );
        const escapedTitle = ch.title.replace(/&/g, "&amp;");
        expect(html).toContain(escapedTitle);
        const escapedSpeaker = ch.speaker.replace(/&/g, "&amp;");
        expect(html).toContain(escapedSpeaker);
      }

      // Check takeaways pills
      expect(html).toContain('data-testid="takeaway-pill"');
    });

    it("renders tab navigation for Chapters Breakdown and Full Script", () => {
      const html = renderToString(
        React.createElement(AudioBriefingCard, {
          briefing: sampleBriefing,
        }),
      );

      expect(html).toContain('data-testid="tab-chapters-btn"');
      expect(html).toContain('data-testid="tab-script-btn"');
      expect(html).toContain("Full Narration Script");
    });
  });

  describe("Strict ZERO Math.random() Audit", () => {
    it("strictly asserts ZERO Math.random() in AudioBriefingBar.tsx source", () => {
      expect(barSource).not.toContain("Math.random()");
      expect(barSource).not.toContain("Math.random");
    });

    it("strictly asserts ZERO Math.random() in AudioBriefingCard.tsx source", () => {
      expect(cardSource).not.toContain("Math.random()");
      expect(cardSource).not.toContain("Math.random");
    });
  });
});
