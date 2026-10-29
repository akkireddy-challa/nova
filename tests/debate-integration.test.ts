import { describe, it, expect } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";
import { DebateCard } from "@/components/GenerativeCards/DebateCard";
import { ArtifactStage } from "@/components/ArtifactStage";
import { DebateArtifact, GenerativeArtifact } from "@/lib/types";

describe("Dialectic Debate Arena & Artifact Stage Integration", () => {
  const sampleDebate: DebateArtifact = {
    topic: "Rust vs Go for High-Performance Networking Proxies",
    consensusSummary:
      "Both languages offer significant concurrency and throughput advantages over traditional interpreted runtimes.",
    perspectives: [
      {
        agentName: "Rust Performance Advocate",
        stance: "Advocate",
        avatarColor: "#0ea5e9",
        arguments: [
          "Zero-cost abstractions and guaranteed memory safety without garbage collection pauses.",
          "Fine-grained memory control ensuring deterministic p99 latency under heavy load.",
        ],
        caveats: [
          "Steeper developer learning curve and longer compilation times.",
        ],
      },
      {
        agentName: "Go Pragmatic Critic",
        stance: "Critic",
        avatarColor: "#f43f5e",
        arguments: [
          "Simpler concurrency model with goroutines and channels enabling rapid development.",
          "Fast compiler and straightforward tooling lower maintenance cost across large engineering teams.",
        ],
        caveats: [
          "GC pauses, while sub-millisecond, can cause tail latency jitter in high-frequency trading.",
        ],
      },
    ],
    synthesisVerdict:
      "Use Go for business microservices and API gateways; choose Rust for sub-millisecond data plane network proxies.",
  };

  const sampleDebateArtifact: GenerativeArtifact = {
    type: "debate",
    data: sampleDebate,
  };

  describe("DebateCard Component Integration & SSR", () => {
    it("renders DebateCard with [Arena Stream] and [Classic Overview] tab switcher", () => {
      const html = renderToString(
        React.createElement(DebateCard, { debate: sampleDebate }),
      );

      // Verify Tab Switcher buttons
      expect(html).toContain("Arena Stream");
      expect(html).toContain("Classic Overview");

      // Verify Topic Title in tab header
      expect(html).toContain(
        "Rust vs Go for High-Performance Networking Proxies",
      );

      // Verify default Arena Stream view renders DialecticDebateCard content
      expect(html).toContain("Dialectic Debate Arena");
      expect(html).toContain("% Consensus");
      expect(html).toContain("Round 1: Assertions");
      expect(html).toContain("Round 2: Cross-Examination");
      expect(html).toContain("Round 3: Arbiter Verdict");

      // Verify Advocate and Critic statements are present in Arena stream
      expect(html).toContain("Rust Performance Advocate");
      expect(html).toContain("Go Pragmatic Critic");
    });

    it("maintains backward-compatible Props interface with DebateArtifact", () => {
      const cardElement = React.createElement(DebateCard, {
        debate: sampleDebate,
      });
      expect(cardElement.props.debate).toEqual(sampleDebate);
    });

    it("verifies DebateCard.tsx source code contract", () => {
      const source = fs.readFileSync(
        path.join(
          process.cwd(),
          "src/components/GenerativeCards/DebateCard.tsx",
        ),
        "utf-8",
      );

      // Verify imports
      expect(source).toContain(
        'import { DialecticDebateCard } from "./DialecticDebateCard"',
      );
      expect(source).toContain('import { sound } from "@/lib/sound"');

      // Verify tab labels
      expect(source).toContain("Arena Stream");
      expect(source).toContain("Classic Overview");

      // Verify sound trigger on tab switch
      expect(source).toContain("sound.playCheck()");

      // Verify DialecticDebateCard rendering
      expect(source).toContain("<DialecticDebateCard debate={debate} />");
    });
  });

  describe("ArtifactStage Integration for Debate Artifacts", () => {
    it("renders DebateCard in preview section when artifact.type is debate", () => {
      const html = renderToString(
        React.createElement(ArtifactStage, {
          artifact: sampleDebateArtifact,
          onClose: () => {},
        }),
      );

      // Verify DebateCard integration in stage preview
      expect(html).toContain("Arena Stream");
      expect(html).toContain("Classic Overview");
      expect(html).toContain("Dialectic Debate Arena");
      expect(html).toContain("% Consensus");
    });

    it("surfaces 'Download CSV' action in header action bar for debate artifacts", () => {
      const html = renderToString(
        React.createElement(ArtifactStage, {
          artifact: sampleDebateArtifact,
          onClose: () => {},
        }),
      );

      // Verify Download CSV button is accessible in the header
      expect(html).toContain("Download CSV");
      expect(html).toContain("Print / PDF");
      expect(html).toContain("HTML Dossier");
    });

    it("maintains clean formatting in print dossier view for debate artifacts", () => {
      const html = renderToString(
        React.createElement(ArtifactStage, {
          artifact: sampleDebateArtifact,
          onClose: () => {},
        }),
      );

      // Verify print view contains synthesis verdict
      expect(html).toContain("Synthesis Verdict");
      expect(html).toContain(sampleDebate.synthesisVerdict);

      // Verify print view contains consensus summary
      expect(html).toContain("Consensus Summary");
      expect(html).toContain(sampleDebate.consensusSummary);

      // Verify print view contains perspectives, arguments and caveats
      expect(html).toContain("Dialectical Perspectives");
      expect(html).toContain("Rust Performance Advocate");
      expect(html).toContain("Go Pragmatic Critic");
      expect(html).toContain("Core Arguments");
      expect(html).toContain("Caveats &amp; Blind Spots");
      expect(html).toContain("Steeper developer learning curve");
    });

    it("verifies ArtifactStage.tsx source code contract", () => {
      const source = fs.readFileSync(
        path.join(process.cwd(), "src/components/ArtifactStage.tsx"),
        "utf-8",
      );

      // Verify DebateCard import and preview rendering
      expect(source).toContain(
        'import { DebateCard } from "@/components/GenerativeCards/DebateCard"',
      );
      expect(source).toContain("<DebateCard debate={artifact.data} />");

      // Verify dialectic-debate helper imports for CSV download
      expect(source).toContain(
        'import {\n  analyzeDialecticDebate,\n  debateToCsv,\n} from "@/lib/research/dialectic-debate"',
      );

      // Verify CSV export handler for debate
      expect(source).toContain('if (artifact.type === "debate")');
      expect(source).toContain("analyzeDialecticDebate(artifact.data)");
      expect(source).toContain("debateToCsv(artifact.data, analysis)");
    });
  });

  describe("Zero Math.random() & Code Quality Verification", () => {
    it("ensures strictly ZERO Math.random() in all touched and integrated files", () => {
      const touchedFiles = [
        "src/components/GenerativeCards/DebateCard.tsx",
        "src/components/ArtifactStage.tsx",
        "src/components/GenerativeCards/DialecticDebateCard.tsx",
        "src/lib/research/dialectic-debate.ts",
      ];

      for (const relPath of touchedFiles) {
        const fullPath = path.join(process.cwd(), relPath);
        expect(fs.existsSync(fullPath)).toBe(true);

        const content = fs.readFileSync(fullPath, "utf-8");
        expect(content).not.toMatch(/Math\.random\s*\(/);
      }
    });
  });
});
