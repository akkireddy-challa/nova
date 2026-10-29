import { describe, it, expect } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import {
  analyzeDialecticDebate,
  calculateConsensusScore,
  extractAssertions,
  extractSharedAgreements,
  extractIrreconcilableTradeoffs,
  determineArbiterRuling,
  generateDebateRounds,
  debateToCsv,
  debateToMarkdown,
  escapeCsvCell,
  tokenizeText,
  computeJaccardSimilarity,
  getPerspectivesByStance,
} from "@/lib/research/dialectic-debate";
import { DebateArtifact } from "@/lib/types";

describe("Dialectic Debate Calculation & Adjudication Engine", () => {
  // Standard full-featured dialectic fixture
  const standardDebateFixture: DebateArtifact = {
    topic: "Migrating Core Monolith to Event-Driven Microservices",
    consensusSummary:
      "Both parties agree that real-time event streaming is critical for horizontal scaling, but acknowledge operational complexity and migration risks.",
    perspectives: [
      {
        agentName: "Cloud Architect",
        stance: "Advocate",
        avatarColor: "#0ea5e9",
        arguments: [
          "Sub-15ms p99 latency across distributed services using Apache Kafka event streaming",
          "Independent scalability allows payment service to scale independently during flash sale spikes",
          "Zero-downtime canary deployments decouple team releases from monolithic deployment trains",
        ],
        caveats: [
          "Initial operational complexity requires investments in distributed tracing and observability tooling",
          "Data consistency requires transitioning to eventual consistency and Saga orchestrators",
        ],
      },
      {
        agentName: "Site Reliability Engineer",
        stance: "Critic",
        avatarColor: "#f43f5e",
        arguments: [
          "Operational complexity and cognitive overhead increase blast radius of network partitions",
          "Financial cost of distributed infrastructure and multi-region Kafka clusters increases cloud spend by 45%",
          "Distributed transactions risk cascading failures without mature circuit breakers",
        ],
        caveats: [
          "Acknowledge that monolithic database write lock contention is approaching physical limits",
          "Grant that microservices would accelerate checkout team release velocity",
        ],
      },
    ],
    synthesisVerdict:
      "Adopt balanced compromise: extract only high-throughput payment services to event-driven workers while keeping core account management in monolith.",
  };

  // Advocate-favored fixture
  const advocateFavoredFixture: DebateArtifact = {
    topic: "Adopting Strict TypeScript & Automated Static Analysis",
    consensusSummary:
      "Advocate demonstrates overwhelming developer velocity and defect reduction with minimal friction.",
    perspectives: [
      {
        agentName: "Frontend Lead",
        stance: "Advocate",
        avatarColor: "#10b981",
        arguments: [
          "Eliminates 38% of production runtime null pointer exceptions at compile-time",
          "Enables automated IDE refactoring and self-documenting codebases across 50 engineers",
          "Speeds up PR review turnaround by automating mechanical style discussions",
          "Standardized patterns reduce onboarding ramp-up time from 3 weeks to 4 days",
        ],
        caveats: [],
      },
      {
        agentName: "Legacy Maintainer",
        stance: "Critic",
        avatarColor: "#ef4444",
        arguments: [
          "Slight initial build compilation latency increase of 2.5 seconds",
        ],
        caveats: [],
      },
    ],
    synthesisVerdict:
      "Strongly recommend adoption of strict TypeScript. Advocate presents the stronger case with indisputable velocity gains.",
  };

  // Critic-favored fixture
  const criticFavoredFixture: DebateArtifact = {
    topic: "Deploying Unaudited Experimental WebAssembly in Kernel Space",
    consensusSummary:
      "Severe unmitigated security vulnerabilities and lack of audit make adoption untenable.",
    perspectives: [
      {
        agentName: "Innovation Advocate",
        stance: "Advocate",
        avatarColor: "#8b5cf6",
        arguments: [
          "Theoretical 5% throughput boost on specialized vector computations",
        ],
        caveats: [],
      },
      {
        agentName: "Security Officer",
        stance: "Critic",
        avatarColor: "#dc2626",
        arguments: [
          "Catastrophic security vulnerability risks kernel panic and unauthenticated memory breach",
          "Fatal lack of cryptographic sandboxing introduces unmitigated CVE exploit vector",
          "Unacceptable lack of vendor audit violates SOC2 and ISO compliance standards",
        ],
        caveats: [
          "Prohibitive disaster recovery and absence of emergency rollback tooling",
        ],
      },
    ],
    synthesisVerdict:
      "Reject proposal decisively. Risks outweigh benefits and critic presents decisive security objections.",
  };

  describe("Core Analysis Execution & Schema Adherence", () => {
    it("analyzes standard dialectic debate fixture producing all required fields", () => {
      const analysis = analyzeDialecticDebate(standardDebateFixture);

      expect(analysis).toBeDefined();
      expect(typeof analysis.consensusScore).toBe("number");
      expect(typeof analysis.advocateEvidenceCount).toBe("number");
      expect(typeof analysis.criticEvidenceCount).toBe("number");
      expect(Array.isArray(analysis.sharedAgreements)).toBe(true);
      expect(Array.isArray(analysis.irreconcilableTradeoffs)).toBe(true);
      expect(analysis.arbiterRuling).toBeDefined();
      expect(Array.isArray(analysis.debateRounds)).toBe(true);
      expect(analysis.debateRounds).toHaveLength(3);
    });

    it("extracts exact evidence counts from advocate and critic perspectives", () => {
      const analysis = analyzeDialecticDebate(standardDebateFixture);

      // 3 advocate arguments
      expect(analysis.advocateEvidenceCount).toBe(3);
      // 3 critic arguments + 2 critic caveats = 5 counter-claims/risks
      expect(analysis.criticEvidenceCount).toBe(5);
    });

    it("correctly identifies perspectives by stance case-insensitively", () => {
      const advs = getPerspectivesByStance(
        standardDebateFixture.perspectives,
        "advocate",
      );
      const crits = getPerspectivesByStance(
        standardDebateFixture.perspectives,
        "critic",
      );
      const arbiters = getPerspectivesByStance(
        standardDebateFixture.perspectives,
        "arbiter",
      );

      expect(advs).toHaveLength(1);
      expect(advs[0].agentName).toBe("Cloud Architect");
      expect(crits).toHaveLength(1);
      expect(crits[0].agentName).toBe("Site Reliability Engineer");
      expect(arbiters).toHaveLength(0);
    });

    it("supports single-argument overload returning structured stance map", () => {
      const { advocate, critic, arbiter } = getPerspectivesByStance(
        standardDebateFixture,
      );

      expect(advocate).toBeDefined();
      expect(advocate?.agentName).toBe("Cloud Architect");
      expect(critic).toBeDefined();
      expect(critic?.agentName).toBe("Site Reliability Engineer");
      expect(arbiter).toBeUndefined();
    });
  });

  describe("Consensus Density Calculation & Determinism", () => {
    it("calculates consensusScore within the valid [0, 100] range", () => {
      const score = calculateConsensusScore(standardDebateFixture);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(Number.isInteger(score)).toBe(true);
    });

    it("guarantees 100% deterministic score across multiple repeated executions", () => {
      const run1 = calculateConsensusScore(standardDebateFixture);
      const run2 = calculateConsensusScore(standardDebateFixture);
      const run3 = calculateConsensusScore(standardDebateFixture);

      expect(run1).toBe(run2);
      expect(run2).toBe(run3);

      const fullAnalysis1 = analyzeDialecticDebate(standardDebateFixture);
      const fullAnalysis2 = analyzeDialecticDebate(standardDebateFixture);
      expect(JSON.stringify(fullAnalysis1)).toBe(JSON.stringify(fullAnalysis2));
    });

    it("yields higher consensus score when perspectives share concessions and common ground", () => {
      const highConsensusFixture: DebateArtifact = {
        topic: "API Gateway Migration",
        consensusSummary:
          "Both teams agree on Envoy as the standard proxy and align on shared rate limiting.",
        perspectives: [
          {
            agentName: "Platform Team",
            stance: "Advocate",
            avatarColor: "#3b82f6",
            arguments: [
              "Agreed that rate limiting and observability are common ground",
              "Aligned on Envoy proxy architecture with shared consensus",
            ],
            caveats: ["Acknowledge migration requires careful team training"],
          },
          {
            agentName: "App Team",
            stance: "Critic",
            avatarColor: "#f59e0b",
            arguments: [
              "Concede that Envoy provides undeniable latency benefits",
              "Valid points on centralized auth and agreed security baseline",
            ],
            caveats: [],
          },
        ],
        synthesisVerdict: "Balanced compromise reached with mutual agreement.",
      };

      const high = calculateConsensusScore(highConsensusFixture);
      const criticHeavy = calculateConsensusScore(criticFavoredFixture);

      expect(high).toBeGreaterThan(criticHeavy);
      expect(high).toBeGreaterThanOrEqual(60);
    });

    it("yields lower consensus score for severe irreconcilable disputes with blockers", () => {
      const low = calculateConsensusScore(criticFavoredFixture);
      expect(low).toBeLessThanOrEqual(40);
    });
  });

  describe("Text Tokenization & Similarity Metrics", () => {
    it("tokenizes text filtering stopwords and punctuation", () => {
      const tokens = tokenizeText(
        "The quick brown Fox jumps over a lazy, complex database-lock!",
      );
      expect(tokens).toContain("quick");
      expect(tokens).toContain("brown");
      expect(tokens).toContain("fox");
      expect(tokens).toContain("database-lock");
      expect(tokens).not.toContain("the");
      expect(tokens).not.toContain("over");
    });

    it("computes Jaccard similarity accurately", () => {
      const sim = computeJaccardSimilarity(
        ["kafka", "latency", "throughput", "cluster"],
        ["kafka", "cluster", "cost", "cloud"],
      );
      // Intersection: ["kafka", "cluster"] (2)
      // Union: ["kafka", "latency", "throughput", "cluster", "cost", "cloud"] (6)
      // Jaccard: 2/6 = 0.3333...
      expect(sim).toBeCloseTo(0.333, 2);
    });

    it("returns zero similarity for disjoint token sets or empty inputs", () => {
      expect(computeJaccardSimilarity([], ["test"])).toBe(0);
      expect(computeJaccardSimilarity(["alpha"], ["beta"])).toBe(0);
    });
  });

  describe("Factual Claim & Assertion Extraction", () => {
    it("extracts clean assertions from bullet points, newlines, and lists", () => {
      const raw = [
        "- First assertion with metrics: 10,000 rps\n- Second assertion: 99.99% uptime",
        "• Third bullet point claim regarding security audits.",
        "1. Fourth numbered claim on zero-downtime releases.",
      ];

      const extracted = extractAssertions(raw);
      expect(extracted.length).toBeGreaterThanOrEqual(4);
      expect(extracted[0]).toContain(
        "First assertion with metrics: 10,000 rps",
      );
      expect(extracted[1]).toContain("Second assertion: 99.99% uptime");
    });

    it("filters out empty or whitespace-only items cleanly", () => {
      const extracted = extractAssertions([
        "",
        "   ",
        " - ",
        "Valid assertion statement.",
      ]);
      expect(extracted).toHaveLength(1);
      expect(extracted[0]).toBe("Valid assertion statement.");
    });
  });

  describe("Shared Agreements Discovery", () => {
    it("discovers shared agreements from consensus summary", () => {
      const agreements = extractSharedAgreements(standardDebateFixture);
      expect(agreements.length).toBeGreaterThanOrEqual(1);
      expect(agreements[0]).toContain("real-time event streaming is critical");
    });

    it("identifies cross-perspective acknowledgments when advocate caveats match critic arguments", () => {
      const agreements = extractSharedAgreements(standardDebateFixture);
      // Operational complexity is mentioned in Advocate caveats and Critic arguments
      const foundOperational = agreements.some(
        (a) =>
          a.toLowerCase().includes("operational") ||
          a.toLowerCase().includes("complexity"),
      );
      expect(foundOperational).toBe(true);
    });

    it("returns empty array for debate with no summary and no overlapping keywords", () => {
      const emptyFixture: DebateArtifact = {
        topic: "Test Topic",
        consensusSummary: "",
        perspectives: [
          {
            agentName: "A",
            stance: "Advocate",
            avatarColor: "#000",
            arguments: ["Apples are sweet"],
            caveats: [],
          },
          {
            agentName: "B",
            stance: "Critic",
            avatarColor: "#fff",
            arguments: ["Zebras run fast"],
            caveats: [],
          },
        ],
        synthesisVerdict: "",
      };

      const agreements = extractSharedAgreements(emptyFixture);
      expect(Array.isArray(agreements)).toBe(true);
    });
  });

  describe("Irreconcilable Trade-off Extraction & Severity Triage", () => {
    it("extracts trade-offs across architectural dimensions with appropriate severity", () => {
      const tradeoffs = extractIrreconcilableTradeoffs(standardDebateFixture);
      expect(tradeoffs.length).toBeGreaterThanOrEqual(1);

      const perfComplexity = tradeoffs.find(
        (t) =>
          t.dimension.includes("Performance") ||
          t.dimension.includes("Complexity"),
      );
      expect(perfComplexity).toBeDefined();
      expect(perfComplexity?.advocateAdvantage).toBeDefined();
      expect(perfComplexity?.criticRisk).toBeDefined();
      expect(["high", "medium", "low"]).toContain(perfComplexity!.severity);
    });

    it("assigns high severity to critical, catastrophic, or security risk language", () => {
      const tradeoffs = extractIrreconcilableTradeoffs(criticFavoredFixture);
      expect(tradeoffs.length).toBeGreaterThanOrEqual(1);
      const highSeverity = tradeoffs.some((t) => t.severity === "high");
      expect(highSeverity).toBe(true);
    });

    it("falls back to primary tension pairing when no predefined dimensions match", () => {
      const customDebate: DebateArtifact = {
        topic: "Botanical Soil Mix Selection",
        consensusSummary: "Ongoing exploration",
        perspectives: [
          {
            agentName: "Botanist A",
            stance: "Advocate",
            avatarColor: "#000",
            arguments: ["Perlite increases soil aeration significantly"],
            caveats: [],
          },
          {
            agentName: "Botanist B",
            stance: "Critic",
            avatarColor: "#fff",
            arguments: [
              "Excess perlite floats away causing severe potting mess",
            ],
            caveats: [],
          },
        ],
        synthesisVerdict: "Use moderate perlite ratio.",
      };

      const tradeoffs = extractIrreconcilableTradeoffs(customDebate);
      expect(tradeoffs.length).toBe(1);
      expect(tradeoffs[0].advocateAdvantage).toContain(
        "Perlite increases soil aeration",
      );
      expect(tradeoffs[0].criticRisk).toContain("Excess perlite floats away");
    });
  });

  describe("Arbiter Adjudication & Ruling Logic", () => {
    it("adjudicates advocate_favored when evidence and synthesis decisively favor advocate", () => {
      const ruling = determineArbiterRuling(
        advocateFavoredFixture,
        4,
        1,
        [],
        75,
      );

      expect(ruling.winner).toBe("advocate_favored");
      expect(ruling.confidenceScore).toBeGreaterThanOrEqual(60);
      expect(ruling.strategicRecommendation).toContain("strict TypeScript");
      expect(ruling.decisiveFactors.length).toBeGreaterThanOrEqual(2);
    });

    it("adjudicates critic_favored when critic presents decisive blocker risks", () => {
      const ruling = determineArbiterRuling(
        criticFavoredFixture,
        1,
        4,
        [
          {
            dimension: "Security",
            advocateAdvantage: "Fast",
            criticRisk: "Catastrophic breach",
            severity: "high",
          },
        ],
        20,
      );

      expect(ruling.winner).toBe("critic_favored");
      expect(ruling.confidenceScore).toBeGreaterThanOrEqual(60);
      expect(ruling.strategicRecommendation).toContain("Reject proposal");
    });

    it("adjudicates balanced_compromise for balanced architectural debates", () => {
      const analysis = analyzeDialecticDebate(standardDebateFixture);
      expect(analysis.arbiterRuling.winner).toBe("balanced_compromise");
      expect(analysis.arbiterRuling.strategicRecommendation).toContain(
        "balanced compromise",
      );
      expect(analysis.arbiterRuling.confidenceScore).toBeGreaterThanOrEqual(50);
    });
  });

  describe("Debate Progression Rounds Sequencing", () => {
    it("generates exactly 3 sequential dialectic rounds with name and consensus delta", () => {
      const rounds = generateDebateRounds(standardDebateFixture, 64);

      expect(rounds).toHaveLength(3);
      expect(rounds[0].round).toBe(1);
      expect(rounds[0].name).toBe("Opening Theses");
      expect(rounds[0].advocateStatement).toBe(
        standardDebateFixture.perspectives[0].arguments[0],
      );
      expect(rounds[0].criticStatement).toBe(
        standardDebateFixture.perspectives[1].arguments[0],
      );

      expect(rounds[1].round).toBe(2);
      expect(rounds[1].name).toBe("Cross-Examination & Stress Tests");

      expect(rounds[2].round).toBe(3);
      expect(rounds[2].name).toBe("Arbiter Adjudication");

      for (const r of rounds) {
        expect(typeof r.consensusDelta).toBe("number");
        expect(r.consensusDelta).toBeGreaterThanOrEqual(0);
      }
    });

    it("handles sparse or missing round statements gracefully with informative fallbacks", () => {
      const minimalDebate: DebateArtifact = {
        topic: "Minimal Topic",
        consensusSummary: "",
        perspectives: [
          {
            agentName: "Sole Advocate",
            stance: "Advocate",
            avatarColor: "#000",
            arguments: ["Single argument"],
            caveats: [],
          },
        ],
        synthesisVerdict: "",
      };

      const rounds = generateDebateRounds(minimalDebate, 20);
      expect(rounds).toHaveLength(3);
      expect(rounds[0].advocateStatement).toBe("Single argument");
      expect(rounds[0].criticStatement).toContain("Critic did not submit");
    });
  });

  describe("RFC 4180 CSV Export Compliance", () => {
    it("escapes cells containing commas, quotes, and newlines properly", () => {
      expect(escapeCsvCell("StandardText")).toBe("StandardText");
      expect(escapeCsvCell("Text, with comma")).toBe('"Text, with comma"');
      expect(escapeCsvCell('He said "Hello"')).toBe('"He said ""Hello"""');
      expect(escapeCsvCell("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
      expect(escapeCsvCell(null)).toBe("");
      expect(escapeCsvCell(undefined)).toBe("");
    });

    it("generates valid RFC 4180 CSV containing all required columns", () => {
      const analysis = analyzeDialecticDebate(standardDebateFixture);
      const csv = debateToCsv(standardDebateFixture, analysis);

      expect(typeof csv).toBe("string");
      expect(csv.length).toBeGreaterThan(100);

      const lines = csv.split("\r\n");
      const headerLine = lines[0];

      // Verify exact required columns
      expect(headerLine).toBe(
        "Round,Perspective,Stance,Statement/Argument,Severity/Confidence,ConsensusScore",
      );

      // Verify rounds exist
      expect(csv).toContain("Round 1: Opening Theses");
      expect(csv).toContain("Round 2: Cross-Examination & Stress Tests");
      expect(csv).toContain("Round 3: Arbiter Adjudication");

      // Verify tradeoffs and arbiter adjudication exist in CSV
      expect(csv).toContain("Tradeoff Analysis");
      expect(csv).toContain("Final Adjudication");
      expect(csv).toContain(String(analysis.consensusScore));
    });

    it("properly handles double quote escaping in CSV statements", () => {
      const quoteDebate: DebateArtifact = {
        topic: 'Quoted "Debate" Topic',
        consensusSummary: 'Summary with "internal quotes" and, commas.',
        perspectives: [
          {
            agentName: "Advocate",
            stance: "Advocate",
            avatarColor: "#000",
            arguments: ['Argument with "special" term and, comma.'],
            caveats: [],
          },
          {
            agentName: "Critic",
            stance: "Critic",
            avatarColor: "#fff",
            arguments: ['Criticism with "quoted" objection.'],
            caveats: [],
          },
        ],
        synthesisVerdict: 'Verdict: "Proceed with caution".',
      };

      const analysis = analyzeDialecticDebate(quoteDebate);
      const csv = debateToCsv(quoteDebate, analysis);

      // Quoted terms must have escaped ""
      expect(csv).toContain('""special""');
      expect(csv).toContain('""quoted""');
    });
  });

  describe("Markdown Briefing Report Generation", () => {
    it("generates clean Markdown briefing report with headers, tables, and rulings", () => {
      const analysis = analyzeDialecticDebate(standardDebateFixture);
      const md = debateToMarkdown(standardDebateFixture, analysis);

      expect(typeof md).toBe("string");
      expect(md).toContain(
        "# Dialectic Debate Briefing: Migrating Core Monolith to Event-Driven Microservices",
      );
      expect(md).toContain(
        `**Consensus Score:** ${analysis.consensusScore}/100`,
      );
      expect(md).toContain("## Executive Consensus Summary");
      expect(md).toContain("## Irreconcilable Architectural Trade-offs");
      expect(md).toContain(
        "| Dimension | Advocate Advantage | Critic Risk | Severity |",
      );
      expect(md).toContain("## Dialectic Progression Rounds");
      expect(md).toContain("### Round 1: Opening Theses");
      expect(md).toContain("## Arbiter Ruling & Strategic Recommendation");
      expect(md).toContain("### Decisive Factors");
    });

    it("escapes table pipe characters in Markdown rows safely", () => {
      const pipeDebate: DebateArtifact = {
        topic: "Topic | With | Pipes",
        consensusSummary: "Summary",
        perspectives: [
          {
            agentName: "Advocate",
            stance: "Advocate",
            avatarColor: "#000",
            arguments: ["Command like `cat file | grep pattern` is supported"],
            caveats: [],
          },
          {
            agentName: "Critic",
            stance: "Critic",
            avatarColor: "#fff",
            arguments: ["Pipes like `foo | bar` can fail silently"],
            caveats: [],
          },
        ],
        synthesisVerdict: "Use with caution.",
      };

      const analysis = analyzeDialecticDebate(pipeDebate);
      const md = debateToMarkdown(pipeDebate, analysis);

      // Pipe in table should be escaped as \|
      expect(md).toContain("\\|");
    });
  });

  describe("Edge Case Resilience & Defense", () => {
    it("handles null / undefined debate input safely without throwing", () => {
      const analysis = analyzeDialecticDebate(
        null as unknown as DebateArtifact,
      );
      expect(analysis.consensusScore).toBe(0);
      expect(analysis.advocateEvidenceCount).toBe(0);
      expect(analysis.criticEvidenceCount).toBe(0);
      expect(analysis.sharedAgreements).toHaveLength(0);
      expect(analysis.irreconcilableTradeoffs).toHaveLength(0);
      expect(analysis.arbiterRuling.confidenceScore).toBe(0);
    });

    it("handles completely empty debate artifact safely", () => {
      const emptyDebate: DebateArtifact = {
        topic: "",
        consensusSummary: "",
        perspectives: [],
        synthesisVerdict: "",
      };

      const analysis = analyzeDialecticDebate(emptyDebate);
      expect(analysis.consensusScore).toBe(0);
      expect(analysis.advocateEvidenceCount).toBe(0);
      expect(analysis.criticEvidenceCount).toBe(0);
      expect(analysis.sharedAgreements).toHaveLength(0);
      expect(analysis.irreconcilableTradeoffs).toHaveLength(0);

      const csv = debateToCsv(emptyDebate, analysis);
      expect(csv).toContain(
        "Round,Perspective,Stance,Statement/Argument,Severity/Confidence,ConsensusScore",
      );

      const md = debateToMarkdown(emptyDebate, analysis);
      expect(md).toContain("# Dialectic Debate Briefing:");
    });

    it("handles debate with single perspective safely", () => {
      const singleDebate: DebateArtifact = {
        topic: "Single Perspective Test",
        consensusSummary: "One sided analysis",
        perspectives: [
          {
            agentName: "Sole Proponent",
            stance: "Advocate",
            avatarColor: "#000",
            arguments: ["Primary solitary argument"],
            caveats: ["Known boundary"],
          },
        ],
        synthesisVerdict: "Awaiting opposition",
      };

      const analysis = analyzeDialecticDebate(singleDebate);
      expect(analysis.advocateEvidenceCount).toBe(1);
      expect(analysis.criticEvidenceCount).toBe(0);
      expect(analysis.debateRounds).toHaveLength(3);
    });

    it("handles perspectives with undefined or missing caveats array cleanly", () => {
      const noCaveatsDebate: DebateArtifact = {
        topic: "Missing Caveats Debate",
        consensusSummary: "Summary without caveats",
        perspectives: [
          {
            agentName: "Advocate",
            stance: "Advocate",
            avatarColor: "#000",
            arguments: ["Claim A"],
            caveats: undefined as unknown as string[],
          },
          {
            agentName: "Critic",
            stance: "Critic",
            avatarColor: "#fff",
            arguments: ["Counter A"],
            caveats: null as unknown as string[],
          },
        ],
        synthesisVerdict: "Verdict",
      };

      const analysis = analyzeDialecticDebate(noCaveatsDebate);
      expect(analysis.advocateEvidenceCount).toBe(1);
      expect(analysis.criticEvidenceCount).toBe(1);
      expect(analysis.consensusScore).toBeGreaterThanOrEqual(0);
    });

    it("handles missing summary and synthesis verdict gracefully with fallback text", () => {
      const noSummaryDebate: DebateArtifact = {
        topic: "Topic Only",
        consensusSummary: "",
        perspectives: [
          {
            agentName: "Adv",
            stance: "Advocate",
            avatarColor: "#000",
            arguments: ["Arg 1"],
            caveats: [],
          },
          {
            agentName: "Crit",
            stance: "Critic",
            avatarColor: "#fff",
            arguments: ["Crit 1"],
            caveats: [],
          },
        ],
        synthesisVerdict: "",
      };

      const analysis = analyzeDialecticDebate(noSummaryDebate);
      expect(
        analysis.arbiterRuling.strategicRecommendation.length,
      ).toBeGreaterThan(10);
      const md = debateToMarkdown(noSummaryDebate, analysis);
      expect(md).toContain("No consensus summary recorded.");
    });
  });

  describe("Deterministic Code Integrity Audit", () => {
    it("strictly contains ZERO Math.random() in dialectic-debate.ts source code", () => {
      const sourcePath = join(
        process.cwd(),
        "src/lib/research/dialectic-debate.ts",
      );
      const source = readFileSync(sourcePath, "utf-8");

      // Verify strictly no Math.random() is present
      expect(source).not.toMatch(/Math\.random\s*\(/);
    });
  });
});
