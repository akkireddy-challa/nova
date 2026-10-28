import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import type {
  LLMRequest,
  LLMResult,
  ModelSelection,
} from "../src/lib/providers/types";
import { NoProviderConfiguredError } from "../src/lib/providers/types";
import type { ResearchReport, SourceCitation } from "../src/lib/types";
import {
  auditEvidenceAndCitations,
  calculateKeywordAlignment,
  refineWithCritic,
} from "../src/lib/research/evaluator-optimizer";
import { runPipeline } from "../src/lib/research/pipeline";

// --- Mock Sources for Testing ---
const MOCK_SOURCES: SourceCitation[] = [
  {
    id: "src-1",
    title: "Global Renewable Energy Outlook 2024",
    url: "https://energy.example.org/renewables-2024",
    domain: "energy.example.org",
    snippet:
      "Solar and wind installations grew 35% globally in 2023, with photovoltaic costs declining to record lows.",
    description:
      "Annual comprehensive analysis of global renewable generation capacity.",
  },
  {
    id: "src-2",
    title: "Electric Vehicle Market Assessment",
    url: "https://transport.example.net/ev-report",
    domain: "transport.example.net",
    snippet:
      "Global electric car sales exceeded 14 million vehicles in 2023, representing 18% of all car sales worldwide.",
  },
  {
    id: "src-3",
    title: "Grid Modernization & Battery Storage Trends",
    url: "https://grid.example.com/battery-storage",
    domain: "grid.example.com",
    snippet:
      "Utility-scale lithium-ion battery storage deployment doubled, but supply chain bottlenecks for nickel remain a key challenge.",
  },
];

// --- Mock Provider for Pipeline Integration Tests ---
type GenerateRequest = Omit<LLMRequest, "model">;
const llmState: {
  configured: boolean;
  responses: (string | Error)[];
  requests: GenerateRequest[];
} = { configured: true, responses: [], requests: [] };

const mockLlm = {
  resolveModel: async (id?: string): Promise<ModelSelection> => {
    if (!llmState.configured) throw new NoProviderConfiguredError();
    if (id) {
      const i = id.indexOf(":");
      return {
        provider: id.slice(0, i) as ModelSelection["provider"],
        model: id.slice(i + 1),
      };
    }
    return { provider: "anthropic", model: "claude-test" };
  },
  generate: async (
    selection: ModelSelection,
    request: GenerateRequest,
  ): Promise<LLMResult> => {
    llmState.requests.push(request);
    const next = llmState.responses.shift();
    if (next === undefined) throw new Error("test: no LLM response queued");
    if (next instanceof Error) throw next;
    return {
      text: next,
      usage: { inputTokens: 120, outputTokens: 60 },
      latencyMs: 350,
      model: selection.model,
      provider: selection.provider,
    };
  },
};

const realFetch = globalThis.fetch;
const publicLookup = async () => ["93.184.216.34"];
const testDeps = { ...mockLlm, lookup: publicLookup };

function ddgResult(url: string, title: string, snippet: string): string {
  return `<h2 class="result__title"><a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=${encodeURIComponent(url)}&amp;rut=1">${title}</a></h2>
<a class="result__snippet" href="#">${snippet}</a>`;
}

const MOCK_SEARCH_HTML = [
  ddgResult(
    "https://energy.example.org/renewables-2024",
    "Global Renewable Energy Outlook 2024",
    "Solar and wind installations grew 35% globally in 2023.",
  ),
  ddgResult(
    "https://transport.example.net/ev-report",
    "Electric Vehicle Market Assessment",
    "Global electric car sales exceeded 14 million vehicles in 2023.",
  ),
].join("\n");

function installTestFetch() {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.startsWith("https://html.duckduckgo.com/")) {
      return new Response(MOCK_SEARCH_HTML, {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    }
    if (url.startsWith("https://energy.example.org/")) {
      return new Response(
        "<html><head><title>Global Renewable Energy Outlook</title></head><body><p>Solar and wind installations grew 35% globally in 2023, with photovoltaic costs declining to record lows.</p></body></html>",
        { status: 200, headers: { "content-type": "text/html" } },
      );
    }
    if (url.startsWith("https://transport.example.net/")) {
      return new Response(
        "<html><head><title>EV Market</title></head><body><p>Global electric car sales exceeded 14 million vehicles in 2023.</p></body></html>",
        { status: 200, headers: { "content-type": "text/html" } },
      );
    }
    throw new Error(`test: unexpected fetch to ${url}`);
  }) as typeof fetch;
}

describe("Evaluator-Optimizer Critic & Evidence Verification", () => {
  beforeEach(() => {
    llmState.configured = true;
    llmState.responses = [];
    llmState.requests = [];
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  // =========================================================================
  // 1. Audit of well-cited findings vs uncited findings
  // =========================================================================
  describe("auditEvidenceAndCitations - Citations and Verification Audit", () => {
    it("correctly audits and verifies well-cited findings with real matched sources", () => {
      const findings = [
        {
          text: "Solar and wind installations grew 35% globally with declining photovoltaic costs",
          citationIds: ["src-1"],
        },
        {
          text: "Global electric car sales exceeded 14 million in 2023",
          citationIds: ["src-2"],
        },
      ];

      const audit = auditEvidenceAndCitations(findings, MOCK_SOURCES);

      expect(audit.verifiedClaims).toBe(2);
      expect(audit.uncitedClaims).toBe(0);
      expect(audit.invalidCitations).toBe(0);
      expect(audit.sourceAlignment).toBeGreaterThan(60);
      expect(audit.details).toHaveLength(2);

      expect(audit.details[0].status).toBe("verified");
      expect(audit.details[0].matchedSources).toEqual(["src-1"]);
      expect(audit.details[1].status).toBe("verified");
      expect(audit.details[1].matchedSources).toEqual(["src-2"]);
    });

    it("marks findings with empty citation arrays or missing citationIds as uncited", () => {
      const findings = [
        {
          text: "Uncited claim about autonomous mobility expansion",
          citationIds: [],
        },
        {
          text: "Another claim without citationIds field",
        },
      ];

      const audit = auditEvidenceAndCitations(findings, MOCK_SOURCES);

      expect(audit.verifiedClaims).toBe(0);
      expect(audit.uncitedClaims).toBe(2);
      expect(audit.invalidCitations).toBe(0);
      expect(audit.sourceAlignment).toBe(0);
      expect(audit.details[0].status).toBe("uncited");
      expect(audit.details[0].matchedSources).toEqual([]);
      expect(audit.details[1].status).toBe("uncited");
      expect(audit.details[1].matchedSources).toEqual([]);
    });

    it("accurately reports mixed sets of well-cited and uncited findings", () => {
      const findings = [
        {
          text: "Global electric car sales exceeded 14 million vehicles in 2023",
          citationIds: ["src-2"],
        },
        {
          text: "Hydrogen aviation will dominate domestic flights by 2028 without any verified data",
          citationIds: [],
        },
      ];

      const audit = auditEvidenceAndCitations(findings, MOCK_SOURCES);

      expect(audit.verifiedClaims).toBe(1);
      expect(audit.uncitedClaims).toBe(1);
      expect(audit.invalidCitations).toBe(0);
      // Average of ~80-100% for claim 1 and 0% for claim 2
      expect(audit.sourceAlignment).toBeGreaterThanOrEqual(35);
      expect(audit.sourceAlignment).toBeLessThanOrEqual(60);
      expect(audit.details[0].status).toBe("verified");
      expect(audit.details[1].status).toBe("uncited");
    });

    it("supports findings formatted with point and description properties", () => {
      const findings = [
        {
          point: "Renewable capacity surge",
          description: "Solar and wind installations grew 35% globally",
          citationIds: ["src-1"],
        },
      ];

      const audit = auditEvidenceAndCitations(findings, MOCK_SOURCES);

      expect(audit.verifiedClaims).toBe(1);
      expect(audit.uncitedClaims).toBe(0);
      expect(audit.details[0].claim).toContain("Renewable capacity surge");
      expect(audit.details[0].status).toBe("verified");
      expect(audit.details[0].matchedSources).toEqual(["src-1"]);
    });

    it("handles empty findings array cleanly", () => {
      const audit = auditEvidenceAndCitations([], MOCK_SOURCES);

      expect(audit.verifiedClaims).toBe(0);
      expect(audit.uncitedClaims).toBe(0);
      expect(audit.invalidCitations).toBe(0);
      expect(audit.sourceAlignment).toBe(100);
      expect(audit.details).toEqual([]);
    });
  });

  // =========================================================================
  // 2. Detection of invalid / unknown citation IDs
  // =========================================================================
  describe("auditEvidenceAndCitations - Invalid Citation Detection", () => {
    it("flags claims citing non-existent citation IDs as invalid_citation", () => {
      const findings = [
        {
          text: "Unsubstantiated statement citing an unknown source ID",
          citationIds: ["src-999"],
        },
        {
          text: "Fabricated citation reference",
          citationIds: ["hallucinated-source-id"],
        },
      ];

      const audit = auditEvidenceAndCitations(findings, MOCK_SOURCES);

      expect(audit.verifiedClaims).toBe(0);
      expect(audit.invalidCitations).toBe(2);
      expect(audit.uncitedClaims).toBe(0);
      expect(audit.sourceAlignment).toBe(0);
      expect(audit.details[0].status).toBe("invalid_citation");
      expect(audit.details[0].matchedSources).toEqual([]);
      expect(audit.details[1].status).toBe("invalid_citation");
      expect(audit.details[1].matchedSources).toEqual([]);
    });

    it("detects mixed valid and invalid citation IDs within the same finding", () => {
      const findings = [
        {
          text: "Solar installations grew 35% in 2023 with record low costs",
          citationIds: ["src-1", "non-existent-src-42"],
        },
      ];

      const audit = auditEvidenceAndCitations(findings, MOCK_SOURCES);

      expect(audit.verifiedClaims).toBe(0);
      expect(audit.invalidCitations).toBe(1);
      expect(audit.details[0].status).toBe("invalid_citation");
      // Still records the valid source that was matched
      expect(audit.details[0].matchedSources).toEqual(["src-1"]);
    });

    it("correctly tallies multiple invalid citations across multiple claims", () => {
      const findings = [
        {
          text: "Claim 1",
          citationIds: ["invalid-a", "invalid-b"],
        },
        {
          text: "Claim 2",
          citationIds: ["invalid-c"],
        },
      ];

      const audit = auditEvidenceAndCitations(findings, MOCK_SOURCES);

      expect(audit.invalidCitations).toBe(3);
      expect(audit.verifiedClaims).toBe(0);
      expect(audit.details.every((d) => d.status === "invalid_citation")).toBe(
        true,
      );
    });
  });

  // =========================================================================
  // 3. Real keyword alignment calculation
  // =========================================================================
  describe("calculateKeywordAlignment - Real Content Overlap Calculation", () => {
    it("calculates high alignment when finding keywords overlap with source snippet", () => {
      const claim =
        "Solar and wind installations grew globally in 2023 with photovoltaic costs declining";
      const { alignment, matchedKeywords, totalKeywords } =
        calculateKeywordAlignment(claim, [MOCK_SOURCES[0]]);

      expect(totalKeywords).toBeGreaterThan(5);
      expect(matchedKeywords).toContain("solar");
      expect(matchedKeywords).toContain("wind");
      expect(matchedKeywords).toContain("photovoltaic");
      expect(alignment).toBeGreaterThanOrEqual(70);
    });

    it("calculates proportional partial alignment for partially matching text", () => {
      // "battery storage deployment" is in src-3, but the other words are novel
      const claim =
        "Utility battery storage deployment revolutionized municipal water pumps";
      const { alignment, matchedKeywords } = calculateKeywordAlignment(claim, [
        MOCK_SOURCES[2],
      ]);

      expect(matchedKeywords).toContain("battery");
      expect(matchedKeywords).toContain("storage");
      expect(matchedKeywords).toContain("deployment");
      expect(alignment).toBeGreaterThan(0);
      expect(alignment).toBeLessThan(100);
    });

    it("returns 0% alignment when finding text shares no keywords with the source", () => {
      const claim =
        "Chocolate chip cookie recipe requires butter sugar and organic vanilla extract";
      const { alignment, matchedKeywords } = calculateKeywordAlignment(claim, [
        MOCK_SOURCES[0],
      ]);

      expect(alignment).toBe(0);
      expect(matchedKeywords).toHaveLength(0);
    });

    it("filters stopwords and extracts semantic tokens correctly", () => {
      const claim =
        "The and or in at is on for with of this that these their them";
      const { totalKeywords } = calculateKeywordAlignment(claim, [
        MOCK_SOURCES[0],
      ]);

      expect(totalKeywords).toBe(0);
    });

    it("includes title, description, and snippet in the keyword matching pool", () => {
      // "comprehensive" and "generation" only appear in src-1 description, not snippet
      const claim = "Comprehensive analysis of generation capacity";
      const { matchedKeywords, alignment } = calculateKeywordAlignment(claim, [
        MOCK_SOURCES[0],
      ]);

      expect(matchedKeywords).toContain("comprehensive");
      expect(matchedKeywords).toContain("generation");
      expect(alignment).toBeGreaterThan(50);
    });
  });

  // =========================================================================
  // 4. Evaluator-Optimizer Critic Pass (refineWithCritic)
  // =========================================================================
  describe("refineWithCritic - Targeted Optimization Pass", () => {
    it("attaches real crawled sources to critical findings that lack citations", () => {
      const rawFindings = [
        {
          point: "Surging EV adoption",
          description:
            "Global electric car sales exceeded 14 million vehicles in 2023",
          confidence: "high" as const,
          citationIds: [] as string[], // Uncited!
        },
      ];

      const result = refineWithCritic(rawFindings, MOCK_SOURCES);

      expect(result.optimizedCount).toBe(1);
      expect(result.findings[0].citationIds).toContain("src-2");
      expect(result.audit.verifiedClaims).toBe(1);
      expect(result.audit.uncitedClaims).toBe(0);
      expect(result.audit.sourceAlignment).toBeGreaterThan(50);
    });

    it("preserves already well-cited findings without modifying their citations", () => {
      const wellCitedFindings = [
        {
          point: "Renewable surge",
          description: "Solar and wind installations grew 35%",
          confidence: "high" as const,
          citationIds: ["src-1"],
        },
      ];

      const result = refineWithCritic(wellCitedFindings, MOCK_SOURCES);

      expect(result.optimizedCount).toBe(0);
      expect(result.findings[0].citationIds).toEqual(["src-1"]);
      expect(result.audit.verifiedClaims).toBe(1);
    });

    it("does not attach unrelated sources when keyword overlap is absent", () => {
      const unrelatedFindings = [
        {
          point: "Ancient architectural masonry",
          description:
            "Roman concrete used volcanic ash and pozzolana for underwater durability",
          confidence: "medium" as const,
          citationIds: [],
        },
      ];

      const result = refineWithCritic(unrelatedFindings, MOCK_SOURCES);

      expect(result.optimizedCount).toBe(0);
      expect(result.findings[0].citationIds).toEqual([]);
      expect(result.audit.uncitedClaims).toBe(1);
    });
  });

  // =========================================================================
  // 5. Pipeline Integration with Verification Audit Metrics & Honest Thoughts
  // =========================================================================
  describe("Pipeline Integration - Evidence Audit & Verification Thoughts", () => {
    const validModelResearchJson = (citationRefs: (number | string)[]) =>
      JSON.stringify({
        content: "Renewable energy analysis report based on crawled data.",
        research: {
          title: "Clean Energy Transition 2024",
          executiveSummary: "Renewables grew rapidly worldwide in 2023.",
          keyFindings: [
            {
              point: "Solar and wind installations grew 35% in 2023",
              description:
                "Photovoltaic generation capacity reached record deployment.",
              confidence: "high",
              citations: citationRefs,
            },
            {
              point: "Electric vehicle adoption reached new milestones",
              description:
                "Electric car sales exceeded 14 million vehicles worldwide.",
              confidence: "high",
              citations: [2],
            },
          ],
          contradictionsAndRisks: [
            "Supply chain bottlenecks persist in battery storage.",
          ],
          recommendation: "Accelerate grid infrastructure investments.",
        },
      });

    it("attaches verificationAudit metrics to research report during artifact synthesis", async () => {
      installTestFetch();
      llmState.responses.push(validModelResearchJson([1]));

      const res = await runPipeline(
        {
          prompt: "Analyze global renewable energy trends in 2024",
          mode: "research",
        },
        testDeps,
      );

      expect(res.artifact?.type).toBe("research");
      const report = res.artifact?.data as ResearchReport;
      expect(report).toBeDefined();

      // Check verificationAudit in report.metrics
      const audit = report.metrics?.verificationAudit;
      expect(audit).toBeDefined();
      expect(typeof audit?.verifiedClaims).toBe("number");
      expect(typeof audit?.uncitedClaims).toBe("number");
      expect(typeof audit?.sourceAlignment).toBe("number");

      expect(audit?.verifiedClaims).toBe(2);
      expect(audit?.uncitedClaims).toBe(0);
      expect(audit?.sourceAlignment).toBeGreaterThan(0);
      expect(audit?.sourceAlignment).toBeLessThanOrEqual(100);
    });

    it("logs honest thought trace steps for evidence audit against crawled sources", async () => {
      installTestFetch();
      llmState.responses.push(validModelResearchJson([1]));

      const res = await runPipeline(
        {
          prompt: "Analyze global renewable energy trends in 2024",
          mode: "research",
        },
        testDeps,
      );

      const thoughts = res.thoughts;

      // 1. "Auditing evidence against [N] crawled sources"
      const auditStep = thoughts.find((t) =>
        t.action.includes("Auditing evidence against"),
      );
      expect(auditStep).toBeDefined();
      expect(auditStep?.action).toMatch(
        /Auditing evidence against \d+ crawled sources/,
      );
      expect(auditStep?.status).toBe("success");

      // 2. "Verified [X] claims across [Y] sources ([Z]% alignment)"
      const verifiedStep = thoughts.find(
        (t) =>
          t.action.startsWith("Verified ") && t.action.includes("% alignment)"),
      );
      expect(verifiedStep).toBeDefined();
      expect(verifiedStep?.action).toMatch(
        /Verified \d+ claims across \d+ sources \(\d+% alignment\)/,
      );
      expect(verifiedStep?.status).toBe("success");
    });

    it("operates with strictly zero fake data and zero Math.random()", async () => {
      installTestFetch();
      llmState.responses.push(validModelResearchJson([1]));

      const res = await runPipeline(
        { prompt: "Examine clean energy trends", mode: "research" },
        testDeps,
      );

      const report = res.artifact?.data as ResearchReport;
      const audit = report.metrics?.verificationAudit;

      // Verified claims cannot exceed total keyFindings
      expect(audit).toBeDefined();
      if (audit) {
        expect(audit.verifiedClaims).toBeLessThanOrEqual(
          report.keyFindings.length,
        );
        expect(audit.uncitedClaims).toBeLessThanOrEqual(
          report.keyFindings.length,
        );
        const uncited =
          typeof audit.uncitedClaims === "number" ? audit.uncitedClaims : 0;
        expect(audit.verifiedClaims + uncited).toBe(report.keyFindings.length);
      }

      // Verify no scripted persona thought traces exist
      const personaPhrases = [
        "Lead Strategist",
        "Autonomous Crawler",
        "Cross-Verifier",
        "Executive Synthesizer",
        "Dispatched",
        "Deconstructed",
        "Vision Engine",
      ];
      for (const t of res.thoughts) {
        for (const phrase of personaPhrases) {
          expect(`${t.agentName} ${t.action}`).not.toContain(phrase);
        }
      }
    });

    it("runs critic optimization pass when in deep budget mode", async () => {
      installTestFetch();
      // First finding has NO citation ([]) so critic pass will optimize it
      const jsonWithUncitedFinding = JSON.stringify({
        content: "Deep research synthesis.",
        research: {
          title: "Deep Energy Analysis",
          executiveSummary: "Synthesis of deep clean energy trends.",
          keyFindings: [
            {
              point: "Solar and wind installations grew 35% in 2023",
              description:
                "Photovoltaic generation capacity reached record deployment.",
              confidence: "high",
              citations: [], // Uncited! Critic should attach src-1
            },
            {
              point: "Electric vehicle adoption reached new milestones",
              description:
                "Electric car sales exceeded 14 million vehicles worldwide.",
              confidence: "high",
              citations: [2],
            },
          ],
          recommendation: "Focus on battery supply chains.",
        },
      });
      llmState.responses.push(jsonWithUncitedFinding);

      const res = await runPipeline(
        {
          prompt:
            "Deep investigation into renewable power and electric mobility",
          mode: "research",
          thinkingBudget: "deep",
        },
        testDeps,
      );

      const report = res.artifact?.data as ResearchReport;
      const audit = report.metrics?.verificationAudit;

      // The uncited finding was optimized by attaching matching crawled source src-1
      expect(audit?.verifiedClaims).toBe(2);
      expect(audit?.uncitedClaims).toBe(0);

      // Thought log contains critic optimization
      const criticThought = res.thoughts.find((t) => t.agentName === "Critic");
      expect(criticThought).toBeDefined();
      expect(criticThought?.action).toContain(
        "Optimized 1 finding(s) with crawled evidence citations",
      );
    });
  });
});
