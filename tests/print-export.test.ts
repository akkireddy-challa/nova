import { describe, it, expect } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import {
  formatBibliographyEntry,
  prepareBibliography,
  formatDossierDate,
  getArtifactMetadata,
  resolveFindingCitations,
  calculateMatrixOptionScores,
  stripInteractiveArtifacts,
} from "@/lib/print-dossier";
import {
  GenerativeArtifact,
  SourceCitation,
  ResearchReport,
  DecisionMatrix,
  GoalPlan,
  ChartArtifact,
  DebateArtifact,
  CodeArtifact,
} from "@/lib/types";

describe("Print Dossier & Executive PDF Export", () => {
  describe("formatBibliographyEntry & prepareBibliography", () => {
    it("formats source into standard [1] Title - Domain (URL) line", () => {
      const source: SourceCitation = {
        id: "src-1",
        title: "Advancements in Agentic LLM Architectures",
        url: "https://arxiv.org/abs/2401.12345",
        domain: "arxiv.org",
        snippet: "A survey of agentic multi-agent systems and reasoning loops.",
        relevanceScore: 96,
        publishedDate: "2026-02-15",
      };

      const entry = formatBibliographyEntry(source, 1);

      expect(entry.citationMarker).toBe("[1]");
      expect(entry.title).toBe("Advancements in Agentic LLM Architectures");
      expect(entry.domain).toBe("arxiv.org");
      expect(entry.url).toBe("https://arxiv.org/abs/2401.12345");
      expect(entry.formattedLine).toBe(
        "[1] Advancements in Agentic LLM Architectures - arxiv.org (https://arxiv.org/abs/2401.12345)",
      );
      expect(entry.relevanceScore).toBe(96);
      expect(entry.relevanceLabel).toBe("96% Relevance");
      expect(entry.publishedDate).toBe("2026-02-15");
      expect(entry.snippet).toBe(
        "A survey of agentic multi-agent systems and reasoning loops.",
      );
    });

    it("handles extended author field if present", () => {
      const sourceWithAuthor = {
        id: "src-author",
        title: "Deep Residual Learning for Image Recognition",
        url: "https://arxiv.org/abs/1512.03385",
        domain: "arxiv.org",
        snippet: "Residual learning framework.",
        author: "Kaiming He et al.",
        publishedDate: "2015-12-10",
        relevanceScore: 99,
      } as SourceCitation;

      const entry = formatBibliographyEntry(sourceWithAuthor, 2);

      expect(entry.citationMarker).toBe("[2]");
      expect(entry.author).toBe("Kaiming He et al.");
      expect(entry.relevanceLabel).toBe("99% Relevance");
    });

    it("handles sources with missing optional fields cleanly without undefined or NaN", () => {
      const source: SourceCitation = {
        id: "src-minimal",
        title: "Minimal Reference",
        url: "https://example.com/doc",
        domain: "example.com",
        snippet: "Brief snippet text.",
      };

      const entry = formatBibliographyEntry(source, 3);

      expect(entry.formattedLine).toBe(
        "[3] Minimal Reference - example.com (https://example.com/doc)",
      );
      expect(entry.author).toBeUndefined();
      expect(entry.publishedDate).toBeUndefined();
      expect(entry.relevanceScore).toBeUndefined();
      expect(entry.relevanceLabel).toBeUndefined();
      expect(entry.formattedLine).not.toContain("undefined");
      expect(entry.formattedLine).not.toContain("NaN");
    });

    it("prepares bibliography list with 1-based numbering and deduplicates identical URLs", () => {
      const sources: SourceCitation[] = [
        {
          id: "s1",
          title: "First Source",
          url: "https://nova.ai/paper1",
          domain: "nova.ai",
          snippet: "Paper 1 snippet",
        },
        {
          id: "s2",
          title: "Duplicate Source",
          url: "https://nova.ai/paper1", // same URL
          domain: "nova.ai",
          snippet: "Duplicate snippet",
        },
        {
          id: "s3",
          title: "Second Unique Source",
          url: "https://nova.ai/paper2",
          domain: "nova.ai",
          snippet: "Paper 2 snippet",
        },
      ];

      const bib = prepareBibliography(sources);

      expect(bib).toHaveLength(2);
      expect(bib[0].citationMarker).toBe("[1]");
      expect(bib[0].title).toBe("First Source");
      expect(bib[1].citationMarker).toBe("[2]");
      expect(bib[1].title).toBe("Second Unique Source");
    });

    it("safely returns empty array for null, undefined, or empty sources", () => {
      expect(prepareBibliography(null)).toEqual([]);
      expect(prepareBibliography(undefined)).toEqual([]);
      expect(prepareBibliography([])).toEqual([]);
    });
  });

  describe("formatDossierDate", () => {
    it("formats a specified Date object into a readable UTC timestamp string", () => {
      const date = new Date("2026-10-28T14:30:00Z");
      const formatted = formatDossierDate(date);

      expect(formatted).toContain("October 28, 2026");
      expect(formatted).toContain("14:30 UTC");
    });

    it("formats ISO date string properly", () => {
      const formatted = formatDossierDate("2026-05-12T09:15:00Z");

      expect(formatted).toContain("May 12, 2026");
      expect(formatted).toContain("09:15 UTC");
    });

    it("falls back gracefully to current date when given an invalid date", () => {
      const formatted = formatDossierDate("invalid-date-string");

      expect(formatted).toContain("UTC");
      expect(formatted).not.toContain("NaN");
      expect(formatted).not.toContain("Invalid");
    });
  });

  describe("getArtifactMetadata", () => {
    it("extracts research dossier metadata with formal banner and model", () => {
      const artifact: GenerativeArtifact = {
        type: "research",
        data: {
          title: "State of Autonomous AI Agents 2026",
          executiveSummary: "Executive summary text.",
          keyFindings: [],
          sources: [],
          recommendation: "Deploy cautiously.",
        },
      };

      const meta = getArtifactMetadata(
        artifact,
        "research",
        "anthropic:claude-sonnet-5-5",
        "2026-10-28T19:00:00Z",
      );

      expect(meta.banner).toBe(
        "NOVA RESEARCH INTELLIGENCE // EXECUTIVE DOSSIER",
      );
      expect(meta.title).toBe("State of Autonomous AI Agents 2026");
      expect(meta.artifactType).toBe("research");
      expect(meta.modeName).toBe("Research Synthesis");
      expect(meta.model).toBe("anthropic:claude-sonnet-5-5");
      expect(meta.timestamp).toContain("October 28, 2026");
    });

    it("extracts planner dossier metadata and maps goal to title", () => {
      const planData: GoalPlan = {
        goal: "Migrate Infrastructure to Edge Computing",
        timeframe: "Q1-Q2 2026",
        overview: "Step-by-step roadmap.",
        phases: [],
        keySuccessMetrics: ["Sub-50ms latency"],
      };

      const artifact: GenerativeArtifact = {
        type: "plan",
        data: planData,
      };

      const meta = getArtifactMetadata(artifact, "planner", undefined);

      expect(meta.title).toBe("Migrate Infrastructure to Edge Computing");
      expect(meta.modeName).toBe("Strategic Planner");
      expect(meta.model).toBe("nova-autonomous-v1");
    });

    it("extracts decision matrix topic and maps mode cleanly", () => {
      const artifact: GenerativeArtifact = {
        type: "matrix",
        data: {
          topic: "Ollama Local vs Cloud API Provider",
          criteria: [],
          options: [],
          verdict: "Hybrid setup recommended.",
        },
      };

      const meta = getArtifactMetadata(artifact, "matrix", "gemini-2.0-flash");

      expect(meta.title).toBe("Ollama Local vs Cloud API Provider");
      expect(meta.modeName).toBe("Comparative Decision Matrix");
      expect(meta.model).toBe("gemini-2.0-flash");
    });

    it("extracts chart, debate, and code artifact metadata", () => {
      const chartArtifact: GenerativeArtifact = {
        type: "chart",
        data: {
          title: "Token Throughput Scaling",
          type: "bar",
          xAxisKey: "model",
          data: [{ label: "Model A", value: 120 }],
          insight: "Throughput scales linearly.",
        } as ChartArtifact,
      };

      const debateArtifact: GenerativeArtifact = {
        type: "debate",
        data: {
          topic: "Monolithic vs Multi-Agent Frameworks",
          consensusSummary: "Both have distinct tradeoffs.",
          perspectives: [],
          synthesisVerdict: "Multi-agent for high-complexity workflows.",
        } as DebateArtifact,
      };

      const codeArtifact: GenerativeArtifact = {
        type: "code",
        data: {
          filename: "search-pipeline.ts",
          language: "typescript",
          code: "export const run = () => {};",
          explanation: "Pipeline implementation.",
        } as CodeArtifact,
      };

      expect(getArtifactMetadata(chartArtifact).title).toBe(
        "Token Throughput Scaling",
      );
      expect(getArtifactMetadata(chartArtifact).modeName).toBe(
        "Data Analysis & Visuals",
      );

      expect(getArtifactMetadata(debateArtifact).title).toBe(
        "Monolithic vs Multi-Agent Frameworks",
      );
      expect(getArtifactMetadata(debateArtifact).modeName).toBe(
        "Multi-Agent Debate Analysis",
      );

      expect(getArtifactMetadata(codeArtifact).title).toBe(
        "search-pipeline.ts",
      );
      expect(getArtifactMetadata(codeArtifact).modeName).toBe(
        "Technical Specification",
      );
    });
  });

  describe("resolveFindingCitations", () => {
    it("maps finding citation IDs to 1-based bibliography markers [1], [2]", () => {
      const sources: SourceCitation[] = [
        {
          id: "src-alpha",
          title: "Alpha Research",
          url: "https://example.com/alpha",
          domain: "example.com",
          snippet: "Alpha snippet",
        },
        {
          id: "src-beta",
          title: "Beta Report",
          url: "https://example.com/beta",
          domain: "example.com",
          snippet: "Beta snippet",
        },
      ];

      const findings: ResearchReport["keyFindings"] = [
        {
          point: "Autonomous reasoning has improved 3x",
          description: "Benchmark results confirm rapid convergence.",
          confidence: "high",
          citationIds: ["src-alpha", "src-beta"],
        },
        {
          point: "Latency remains bottleneck for 70B+ models",
          description: "Edge inference requires quantization.",
          confidence: "medium",
          citationIds: ["src-beta"],
        },
      ];

      const resolved = resolveFindingCitations(findings, sources);

      expect(resolved).toHaveLength(2);
      expect(resolved[0].citations).toHaveLength(2);
      expect(resolved[0].citations[0].marker).toBe("[1]");
      expect(resolved[0].citations[0].title).toBe("Alpha Research");
      expect(resolved[0].citations[1].marker).toBe("[2]");
      expect(resolved[0].citations[1].title).toBe("Beta Report");

      expect(resolved[1].citations).toHaveLength(1);
      expect(resolved[1].citations[0].marker).toBe("[2]");
    });

    it("falls back to numeric extraction if citationId does not match source id directly", () => {
      const findings: ResearchReport["keyFindings"] = [
        {
          point: "General finding",
          description: "Desc",
          confidence: "low",
          citationIds: ["cit-3", "4"],
        },
      ];

      const resolved = resolveFindingCitations(findings, []);

      expect(resolved[0].citations[0].marker).toBe("[3]");
      expect(resolved[0].citations[1].marker).toBe("[4]");
    });
  });

  describe("calculateMatrixOptionScores", () => {
    it("computes weighted score averages accurately for data matrices", () => {
      const matrix: DecisionMatrix = {
        topic: "Database Architecture",
        verdict: "Option B wins on reliability",
        criteria: [
          { id: "perf", name: "Performance", weight: 3 },
          { id: "cost", name: "Cost Efficiency", weight: 2 },
        ],
        options: [
          {
            id: "opt-1",
            name: "PostgreSQL",
            scores: { perf: 8, cost: 9 }, // (8*3 + 9*2) / 5 = (24 + 18)/5 = 42/5 = 8.4
            pros: ["Reliable", "ACID compliant"],
            cons: ["Horizontal scale complexity"],
            totalWeightedScore: 8.4,
          },
          {
            id: "opt-2",
            name: "Cloud Spanner",
            scores: { perf: 10, cost: 5 }, // (10*3 + 5*2) / 5 = (30 + 10)/5 = 40/5 = 8.0
            pros: ["Global scale", "Fully managed"],
            cons: ["Higher cost"],
            totalWeightedScore: 8.0,
          },
        ],
      };

      const scores = calculateMatrixOptionScores(matrix);

      expect(scores).toHaveLength(2);
      expect(scores[0].name).toBe("PostgreSQL");
      expect(scores[0].score).toBe("8.4");
      expect(scores[0].numericScore).toBe(8.4);

      expect(scores[1].name).toBe("Cloud Spanner");
      expect(scores[1].score).toBe("8.0");
      expect(scores[1].numericScore).toBe(8.0);
    });

    it("supports custom dynamic weights when adjusted by the user", () => {
      const matrix: DecisionMatrix = {
        topic: "Hosting",
        verdict: "Cloud wins when performance is 5x",
        criteria: [
          { id: "perf", name: "Performance", weight: 1 },
          { id: "cost", name: "Cost", weight: 1 },
        ],
        options: [
          {
            id: "opt-1",
            name: "Cloud",
            scores: { perf: 10, cost: 2 },
            pros: [],
            cons: [],
            totalWeightedScore: 6.0,
          },
        ],
      };

      // Custom weights: perf = 5x, cost = 1x -> (10*5 + 2*1)/6 = 52/6 = 8.666 -> 8.7
      const scores = calculateMatrixOptionScores(matrix, { perf: 5, cost: 1 });

      expect(scores[0].score).toBe("8.7");
    });
  });

  describe("stripInteractiveArtifacts", () => {
    it("strips buttons, inputs, event handlers, and tooltips for clean print output", () => {
      const htmlSnippet = `
        <div class="card" title="Interactive Tooltip">
          <button onclick="handleClick()" class="btn">Print / PDF Dossier</button>
          <input type="range" min="1" max="5" value="3" onchange="updateWeight()" />
          <p>Verified Executive Summary text.</p>
          <select><option>Option 1</option></select>
        </div>
      `;

      const stripped = stripInteractiveArtifacts(htmlSnippet);

      expect(stripped).not.toContain("<button");
      expect(stripped).not.toContain("Print / PDF Dossier");
      expect(stripped).not.toContain("<input");
      expect(stripped).not.toContain("<select");
      expect(stripped).not.toContain("onclick");
      expect(stripped).not.toContain("onchange");
      expect(stripped).not.toContain("title=");
      expect(stripped).toContain("<p>Verified Executive Summary text.</p>");
    });

    it("handles empty or blank string without crashing", () => {
      expect(stripInteractiveArtifacts("")).toBe("");
    });
  });

  describe("ArtifactStage Component Structure & Print Rules Verification", () => {
    const artifactStagePath = join(
      process.cwd(),
      "src/components/ArtifactStage.tsx",
    );
    const content = readFileSync(artifactStagePath, "utf-8");

    it("includes Printer icon from lucide-react and window.print() trigger", () => {
      expect(content).toContain('<Printer className="w-3.5 h-3.5');
      expect(content).toContain("window.print()");
      expect(content).toContain("Print / PDF Dossier");
    });

    it("includes mandatory print container classes", () => {
      expect(content).toContain("print:w-full");
      expect(content).toContain("print:max-w-none");
      expect(content).toContain("print:p-8");
      expect(content).toContain("print:bg-white");
      expect(content).toContain("print:text-black");
      expect(content).toContain("print:overflow-visible");
    });

    it("suppresses interactive chrome via print:hidden", () => {
      expect(content).toContain("print:hidden");
    });

    it("renders Executive Dossier Cover Header with Nova banner, title, mode, model, and date", () => {
      expect(content).toContain("dossierMetadata.banner");
      expect(content).toContain("dossierMetadata.title");
      expect(content).toContain("dossierMetadata.modeName");
      expect(content).toContain("dossierMetadata.model");
      expect(content).toContain("dossierMetadata.timestamp");
    });

    it("renders table borders and zebra striping for data matrices", () => {
      expect(content).toContain("border-collapse");
      expect(content).toContain("border-gray-400");
      expect(content).toContain("bg-gray-50");
      expect(content).toContain("bg-white");
    });

    it("renders checkmarks for execution milestones", () => {
      expect(content).toContain("✓");
    });

    it("renders formatted bibliography section at the end", () => {
      expect(content).toContain("Bibliography & Cited References");
      expect(content).toContain("bib.citationMarker");
      expect(content).toContain("bib.title");
      expect(content).toContain("bib.domain");
    });
  });
});
