import { describe, expect, it, afterEach } from "bun:test";
import {
  cleanMarkdownForSpeech,
  splitIntoSpeechChunks,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  createSpeechRecognizer,
  createAudioBriefing,
} from "../src/lib/client/voice";

describe("Voice Interface & Audio Overview Module", () => {
  describe("cleanMarkdownForSpeech", () => {
    it("strips markdown headers and retains header title text", () => {
      const input = "# Executive Summary\n## Key Architecture\n### Deep Dive";
      const cleaned = cleanMarkdownForSpeech(input);
      expect(cleaned).toContain("Executive Summary");
      expect(cleaned).toContain("Key Architecture");
      expect(cleaned).toContain("Deep Dive");
      expect(cleaned).not.toContain("#");
    });

    it("strips citations like [1], [2, 3], and [1][2] without disrupting prose", () => {
      const input =
        "Nova achieves sub-second latency [1] through parallel evaluation [2, 3]. Prior work [4] showed similar gains.";
      const cleaned = cleanMarkdownForSpeech(input);
      expect(cleaned).toContain("Nova achieves sub-second latency");
      expect(cleaned).toContain("through parallel evaluation");
      expect(cleaned).toContain("Prior work");
      expect(cleaned).not.toMatch(/\[\d+\]/);
      expect(cleaned).not.toMatch(/\[\d+,\s*\d+\]/);
    });

    it("strips fenced code blocks entirely for smooth audio narration", () => {
      const input =
        "Here is the implementation:\n```typescript\nconst agent = new NovaAgent();\nawait agent.run();\n```\nIt executes in the background.";
      const cleaned = cleanMarkdownForSpeech(input);
      expect(cleaned).toContain("Here is the implementation:");
      expect(cleaned).toContain("It executes in the background.");
      expect(cleaned).not.toContain("const agent");
      expect(cleaned).not.toContain("```");
    });

    it("preserves inline code text while removing backticks", () => {
      const input = "Use the `bun test` command to verify test execution.";
      const cleaned = cleanMarkdownForSpeech(input);
      expect(cleaned).toBe(
        "Use the bun test command to verify test execution.",
      );
    });

    it("converts markdown links to their anchor text and removes raw URLs", () => {
      const input =
        "Read the [Documentation Guide](https://example.com/docs) or visit https://nova.ai for details.";
      const cleaned = cleanMarkdownForSpeech(input);
      expect(cleaned).toContain("Read the Documentation Guide or visit");
      expect(cleaned).toContain("for details.");
      expect(cleaned).not.toContain("https://example.com/docs");
      expect(cleaned).not.toContain("https://nova.ai");
    });

    it("strips bold, italic, and strikethrough markdown tags", () => {
      const input =
        "This is **critical**, this is *fast*, and this is ~~outdated~~.";
      const cleaned = cleanMarkdownForSpeech(input);
      expect(cleaned).toBe(
        "This is critical, this is fast, and this is outdated.",
      );
    });

    it("strips blockquotes, bullet points, and HTML tags", () => {
      const input =
        "> High impact finding:\n- Feature Alpha\n* Feature Beta\n+ Feature Gamma\n<div class='meta'>Updated</div>";
      const cleaned = cleanMarkdownForSpeech(input);
      expect(cleaned).toContain("High impact finding:");
      expect(cleaned).toContain("Feature Alpha");
      expect(cleaned).toContain("Feature Beta");
      expect(cleaned).toContain("Feature Gamma");
      expect(cleaned).toContain("Updated");
      expect(cleaned).not.toContain(">");
      expect(cleaned).not.toContain("<div");
    });

    it("handles empty or blank inputs cleanly", () => {
      expect(cleanMarkdownForSpeech("")).toBe("");
      expect(cleanMarkdownForSpeech("   \n\t  ")).toBe("");
    });
  });

  describe("splitIntoSpeechChunks", () => {
    it("returns an empty array for empty or whitespace text", () => {
      expect(splitIntoSpeechChunks("")).toEqual([]);
      expect(splitIntoSpeechChunks("   ")).toEqual([]);
    });

    it("bundles short sentences together within maxChunkLength", () => {
      const text = "First sentence. Second sentence. Third sentence.";
      const chunks = splitIntoSpeechChunks(text, 100);
      expect(chunks.length).toBe(1);
      expect(chunks[0]).toBe(
        "First sentence. Second sentence. Third sentence.",
      );
    });

    it("splits multiple long sentences into separate chunks", () => {
      const text =
        "The quick brown fox jumps over the lazy dog in a warm sunny afternoon. " +
        "Sphinx of black quartz, judge my vow with swift justice and quiet wisdom. " +
        "Pack my box with five dozen liquor jugs before morning arrives.";
      const chunks = splitIntoSpeechChunks(text, 80);
      expect(chunks.length).toBeGreaterThan(1);
      for (const chunk of chunks) {
        expect(chunk.length).toBeLessThanOrEqual(80);
      }
    });

    it("breaks a single very long sentence into clause- or word-bounded chunks", () => {
      const longSentence =
        "In modern multi-agent systems, agents collaborate using structured JSON schemas, verify facts with web search, compile comprehensive briefs, and present findings through interactive generative user interfaces without blocking the main event thread.";
      const chunks = splitIntoSpeechChunks(longSentence, 70);
      expect(chunks.length).toBeGreaterThan(1);
      for (const chunk of chunks) {
        expect(chunk.length).toBeLessThanOrEqual(70);
      }
      const combined = chunks.join(" ");
      expect(combined).toContain("In modern multi-agent systems");
      expect(combined).toContain("event thread");
    });
  });

  describe("Browser Environment Guards", () => {
    const g = globalThis as unknown as Record<string, unknown>;
    const originalWindow = g.window;
    const originalUtterance = g.SpeechSynthesisUtterance;

    afterEach(() => {
      g.window = originalWindow;
      g.SpeechSynthesisUtterance = originalUtterance;
    });

    it("isSpeechRecognitionSupported returns false in SSR / non-browser environment", () => {
      delete g.window;
      expect(isSpeechRecognitionSupported()).toBe(false);
    });

    it("isSpeechRecognitionSupported returns true when SpeechRecognition exists", () => {
      g.window = {
        SpeechRecognition: class MockSpeechRecognition {},
      };
      expect(isSpeechRecognitionSupported()).toBe(true);
    });

    it("isSpeechRecognitionSupported returns true when webkitSpeechRecognition exists", () => {
      g.window = {
        webkitSpeechRecognition: class MockWebkitSpeechRecognition {},
      };
      expect(isSpeechRecognitionSupported()).toBe(true);
    });

    it("isSpeechSynthesisSupported returns false when speechSynthesis is missing", () => {
      delete g.window;
      expect(isSpeechSynthesisSupported()).toBe(false);
    });

    it("isSpeechSynthesisSupported returns true when window.speechSynthesis and SpeechSynthesisUtterance exist", () => {
      g.window = {
        speechSynthesis: {
          speak: () => {},
          cancel: () => {},
          pause: () => {},
          resume: () => {},
        },
      };
      g.SpeechSynthesisUtterance = class MockUtterance {};

      expect(isSpeechSynthesisSupported()).toBe(true);
    });

    it("createSpeechRecognizer reports error callback when unsupported", () => {
      delete g.window;
      let errorReceived = "";
      const recognizer = createSpeechRecognizer({
        onResult: () => {},
        onError: (err) => {
          errorReceived = err;
        },
      });

      expect(errorReceived).toContain("not supported");
      expect(recognizer.isListening()).toBe(false);
      recognizer.stop();
    });

    it("createAudioBriefing controller initializes and exposes getStatus cleanly", () => {
      delete g.window;
      const briefing = createAudioBriefing(
        "## Overview\nThis is a test briefing with [1] citations.",
      );
      const status = briefing.getStatus();
      expect(status.isPlaying).toBe(false);
      expect(status.isPaused).toBe(false);
      expect(status.rate).toBe(1.0);
      expect(status.cleanedText).toBe(
        "Overview\nThis is a test briefing with citations.",
      );

      briefing.setRate(1.25);
      expect(briefing.getStatus().rate).toBe(1.25);
      briefing.stop();
    });
  });
});
