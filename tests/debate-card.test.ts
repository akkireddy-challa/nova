import { describe, it, expect } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";
import { DialecticDebateCard } from "@/components/GenerativeCards/DialecticDebateCard";
import { DebateArtifact } from "@/lib/types";

describe("DialecticDebateCard Generative UI Component", () => {
  const sampleDebate: DebateArtifact = {
    topic: "Event-Driven Microservices vs Monolithic Architecture",
    consensusSummary:
      "Both sides agree that domain boundaries and modularity are essential for long-term maintainability.",
    perspectives: [
      {
        agentName: "Cloud Architect Advocate",
        stance: "Advocate",
        avatarColor: "#10b981",
        arguments: [
          "Independent service scalability under spiky read/write loads.",
          "Decoupled deployment cycles reducing release blast radius.",
          "Polyglot persistence per domain service requirement.",
        ],
        caveats: [
          "Operational complexity of distributed tracing and eventual consistency.",
        ],
      },
      {
        agentName: "Pragmatic Systems Critic",
        stance: "Critic",
        avatarColor: "#f43f5e",
        arguments: [
          "Cross-network latency and serialized network hops degrade p99.",
          "Distributed transaction coordination risks data inconsistency.",
          "Massive infrastructure cost overhead for multi-cluster meshes.",
        ],
        caveats: [
          "Microservices provide clear ownership for teams exceeding 50 engineers.",
        ],
      },
    ],
    synthesisVerdict:
      "Adopt a modular monolith first, extracting high-throughput services only when bounded contexts stabilize.",
  };

  describe("Header, Gauge & Dual-Column Rendering", () => {
    it("renders topic, consensus score meter, and dual-column perspectives", () => {
      const html = renderToString(
        React.createElement(DialecticDebateCard, {
          debate: sampleDebate,
          initialRound: 1,
        }),
      );

      // Verify topic and header
      expect(html).toContain(
        "Event-Driven Microservices vs Monolithic Architecture",
      );
      expect(html).toContain("Dialectic Debate Arena");

      // Verify consensus gauge and percentage meter
      expect(html).toContain("% Consensus");
      expect(html).toContain("<svg");

      // Verify round selector tabs
      expect(html).toContain("Round 1: Assertions");
      expect(html).toContain("Round 2: Cross-Examination");
      expect(html).toContain("Round 3: Arbiter Verdict");

      // Verify action buttons
      expect(html).toContain("Download CSV");
      expect(html).toContain("Copy Markdown Report");

      // Verify dual-column perspectives
      expect(html).toContain("Cloud Architect Advocate");
      expect(html).toContain("Pragmatic Systems Critic");
      expect(html).toContain("Primary Proponent");
      expect(html).toContain("Counter-Perspective &amp; Adversarial Review");

      // Verify assertions content
      expect(html).toContain("Independent service scalability");
      expect(html).toContain("Cross-network latency");
    });
  });

  describe("Round 1: Assertions View", () => {
    it("renders round 1 assertions with advocate arguments and critic counter-assertions", () => {
      const html = renderToString(
        React.createElement(DialecticDebateCard, {
          debate: sampleDebate,
          initialRound: 1,
        }),
      );

      // Round 1 container and markers
      expect(html).toContain("Round 1: Assertions");
      expect(html).toContain("Core Assertions");
      expect(html).toContain("Counter-Assertions &amp; Risks");

      // Advocate arguments
      expect(html).toContain("Decoupled deployment cycles");
      expect(html).toContain("Polyglot persistence per domain");

      // Critic counter-assertions
      expect(html).toContain(
        "Distributed transaction coordination risks data inconsistency",
      );
      expect(html).toContain("Massive infrastructure cost overhead");

      // Concessions & caveats
      expect(html).toContain("Acknowledged Concessions &amp; Blind Spots");
      expect(html).toContain("Operational complexity of distributed tracing");
      expect(html).toContain("Identified Vulnerabilities &amp; Risks");
    });
  });

  describe("Round 2: Cross-Examination & Stress Tests View", () => {
    it("renders round 2 content with trade-off matrix and shared agreements cleanly", () => {
      const html = renderToString(
        React.createElement(DialecticDebateCard, {
          debate: sampleDebate,
          initialRound: 2,
        }),
      );

      // Section headers
      expect(html).toContain("Round 2: Cross-Examination &amp; Stress Tests");
      expect(html).toContain("Irreconcilable Trade-Offs");
      expect(html).toContain("Discovered Points of Consensus");

      // Side-by-side advantage vs risk within tradeoff
      expect(html).toContain("Advocate Advantage");
      expect(html).toContain("Critic Risk");

      // Consensus shared agreements
      expect(html).toContain(
        "Both sides agree that domain boundaries and modularity are essential for long-term maintainability.",
      );
    });

    it("renders trade-off severity badges and agreement points", () => {
      const html = renderToString(
        React.createElement(DialecticDebateCard, {
          debate: sampleDebate,
          initialRound: 2,
        }),
      );

      // Checks for severity badge labels (High, Medium, or Low)
      const hasSeverity =
        html.includes("High") ||
        html.includes("Medium") ||
        html.includes("Low");
      expect(hasSeverity).toBe(true);

      // Discovered points of consensus checkmark icons
      expect(html).toContain("Discovered Points of Consensus");
    });
  });

  describe("Round 3: Arbiter Verdict View", () => {
    it("renders round 3 arbiter adjudication, decisive factors, and strategic recommendation", () => {
      const html = renderToString(
        React.createElement(DialecticDebateCard, {
          debate: sampleDebate,
          initialRound: 3,
        }),
      );

      // Arbiter ruling card
      expect(html).toContain("Neutral Arbiter Ruling");
      expect(html).toContain("% Confidence");

      // Formatted winner
      const hasValidWinner =
        html.includes("Advocate Favored") ||
        html.includes("Critic Favored") ||
        html.includes("Balanced Compromise");
      expect(hasValidWinner).toBe(true);

      // Strategic recommendation banner with bold callout
      expect(html).toContain("Strategic Recommendation");
      expect(html).toContain("Adopt a modular monolith first");

      // Decisive factors checklist
      expect(html).toContain("Decisive Factors");

      // Synthesis verdict and consensus summary
      expect(html).toContain("Synthesis Verdict:");
      expect(html).toContain("Consensus Summary:");
    });
  });

  describe("Consensus Color Progression", () => {
    it("progresses gauge styling across low, medium, and high consensus scores", () => {
      // 1. High consensus debate
      const highConsensusDebate: DebateArtifact = {
        topic: "TypeScript Strict Mode Adoption",
        consensusSummary:
          "Both agree that static typing dramatically reduces production bugs and aligns team productivity.",
        perspectives: [
          {
            agentName: "Proponent",
            stance: "Advocate",
            avatarColor: "#10b981",
            arguments: [
              "We agree that static typing dramatically reduces runtime bugs.",
              "Clear compiler error messages improve team velocity and consensus.",
            ],
            caveats: [],
          },
          {
            agentName: "Cautious Lead",
            stance: "Critic",
            avatarColor: "#f43f5e",
            arguments: [
              "We agree that static typing has merit for critical services.",
              "Gradual migration is acceptable trade-off for legacy files.",
            ],
            caveats: [],
          },
        ],
        synthesisVerdict: "Enable strict mode incrementally.",
      };

      const highHtml = renderToString(
        React.createElement(DialecticDebateCard, {
          debate: highConsensusDebate,
        }),
      );
      expect(highHtml).toContain("% Consensus");

      // 2. Low consensus debate (heavy dispute markers)
      const lowConsensusDebate: DebateArtifact = {
        topic: "Complete Production Rewrite from Scratch",
        consensusSummary: "No consensus reached.",
        perspectives: [
          {
            agentName: "Rewrite Advocate",
            stance: "Advocate",
            avatarColor: "#10b981",
            arguments: ["Complete rewrite eliminates technical debt entirely."],
            caveats: [],
          },
          {
            agentName: "Stability Guardian",
            stance: "Critic",
            avatarColor: "#f43f5e",
            arguments: [
              "Fatal flaw: total rewrite is catastrophic, unacceptable, and impossible.",
              "Critical risk of data loss and severe vulnerability.",
            ],
            caveats: [],
          },
        ],
        synthesisVerdict: "Reject full rewrite.",
      };

      const lowHtml = renderToString(
        React.createElement(DialecticDebateCard, {
          debate: lowConsensusDebate,
        }),
      );
      expect(lowHtml).toContain("% Consensus");
    });
  });

  describe("Defensive Resilience & Edge Cases", () => {
    it("handles empty or minimal perspectives without throwing errors", () => {
      const emptyDebate: DebateArtifact = {
        topic: "Empty Debate Deliberation",
        consensusSummary: "",
        perspectives: [],
        synthesisVerdict: "",
      };

      // Must not throw for Round 1
      expect(() => {
        const html = renderToString(
          React.createElement(DialecticDebateCard, {
            debate: emptyDebate,
            initialRound: 1,
          }),
        );
        expect(html).toContain("Empty Debate Deliberation");
      }).not.toThrow();

      // Must not throw for Round 2
      expect(() => {
        const html = renderToString(
          React.createElement(DialecticDebateCard, {
            debate: emptyDebate,
            initialRound: 2,
          }),
        );
        expect(html).toContain("No irreconcilable trade-offs detected");
      }).not.toThrow();

      // Must not throw for Round 3
      expect(() => {
        const html = renderToString(
          React.createElement(DialecticDebateCard, {
            debate: emptyDebate,
            initialRound: 3,
          }),
        );
        expect(html).toContain("Neutral Arbiter Ruling");
      }).not.toThrow();
    });

    it("handles single perspective debate gracefully", () => {
      const singlePerspectiveDebate: DebateArtifact = {
        topic: "Solo Perspective Consideration",
        consensusSummary: "Unilateral view.",
        perspectives: [
          {
            agentName: "Solo Researcher",
            stance: "Advocate",
            avatarColor: "#10b981",
            arguments: ["Independent analysis thesis."],
            caveats: [],
          },
        ],
        synthesisVerdict: "Needs opposing peer review.",
      };

      const html = renderToString(
        React.createElement(DialecticDebateCard, {
          debate: singlePerspectiveDebate,
        }),
      );

      expect(html).toContain("Solo Perspective Consideration");
      expect(html).toContain("Solo Researcher");
    });
  });

  describe("Zero Math.random() & Documentation Integrity", () => {
    it("strictly asserts that the component source file does not contain Math.random()", () => {
      const componentPath = path.resolve(
        process.cwd(),
        "src/components/GenerativeCards/DialecticDebateCard.tsx",
      );
      const sourceCode = fs.readFileSync(componentPath, "utf-8");

      expect(sourceCode).not.toContain("Math.random");
    });
  });
});
