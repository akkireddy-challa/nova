import { describe, expect, it } from "bun:test";
import {
  generateStandaloneHtmlDossier,
  downloadStandaloneHtmlDossier,
  sanitizeFileName,
  escapeHtml,
  sanitizeUrl,
  resolveDossierTitle,
  resolveDossierModel,
  extractDossierSources,
  type Artifact,
} from "../src/lib/html-dossier";
import type {
  ResearchReport,
  DecisionMatrix,
  ChartArtifact,
  GoalPlan,
  CodeArtifact,
  DebateArtifact,
  Session,
  SourceCitation,
} from "../src/lib/types";

describe("HTML Dossier Generator", () => {
  const sampleSources: SourceCitation[] = [
    {
      id: "src-1",
      title: "Deep Reinforcement Learning & Autonomous Agents",
      url: "https://arxiv.org/abs/2301.00001",
      domain: "arxiv.org",
      snippet:
        "Empirical benchmarking reveals sub-second multi-agent arbitration latency.",
      relevanceScore: 96,
      publishedDate: "2026-02-15",
      author: "Dr. Elena Rostova",
    },
    {
      id: "src-2",
      title: "Model Context Protocol Specification v1.0",
      url: "https://modelcontextprotocol.io/docs",
      domain: "modelcontextprotocol.io",
      snippet:
        "Standardized tool registries for cross-platform agentic coordination.",
      relevanceScore: 92,
      publishedDate: "2026-01-10",
      author: "MCP Working Group",
    },
  ];

  const sampleResearchReport: ResearchReport = {
    title: "Quantum Supercomputing in Distributed AI",
    executiveSummary:
      "Quantum annealing and neutral atom architectures have reached coherence benchmarks [1]. Integration with MCP tool pipelines [2] enables fault-tolerant routing.",
    keyFindings: [
      {
        point: "Neutral atom coherence exceeds 100 microseconds",
        description:
          "Benchmark evaluations demonstrated sustained multi-qubit gate fidelity [1].",
        confidence: "high",
        citationIds: ["src-1"],
      },
      {
        point: "Tool arbitration requires deterministic state contracts",
        description:
          "Cross-agent tool registries require schema validation [2] to prevent execution drift.",
        confidence: "medium",
        citationIds: ["src-2"],
      },
    ],
    contradictionsAndRisks: [
      "Cryogenic interconnect requirements constrain server rack density.",
    ],
    recommendation:
      "Proceed with hybrid quantum-classical pipeline utilizing MCP tool abstractions.",
    sources: sampleSources,
  };

  const sampleMatrix: DecisionMatrix = {
    topic: "Vector Database Engine Selection",
    criteria: [
      { id: "c1", name: "Search Latency", weight: 8 },
      { id: "c2", name: "Memory Efficiency", weight: 6 },
      { id: "c3", name: "Ecosystem Support", weight: 4 },
    ],
    options: [
      {
        id: "opt-1",
        name: "Qdrant",
        scores: { c1: 9, c2: 8, c3: 7 },
        pros: ["Rust memory safety", "Native payload filtering"],
        cons: ["Requires cluster tuning at petabyte scale"],
        totalWeightedScore: 8.2,
      },
      {
        id: "opt-2",
        name: "Milvus",
        scores: { c1: 8, c2: 7, c3: 9 },
        pros: ["Proven Kubernetes operator", "High concurrency throughput"],
        cons: ["Higher baseline RAM consumption"],
        totalWeightedScore: 7.9,
      },
      {
        id: "opt-3",
        name: "Chroma",
        scores: { c1: 7, c2: 7, c3: 8 },
        pros: ["Zero-config onboarding", "Lightweight Python embed"],
        cons: ["Lacks distributed multi-master tier"],
        totalWeightedScore: 7.2,
      },
    ],
    verdict:
      "Qdrant provides the optimal balance of sub-10ms latency and memory efficiency.",
  };

  const sampleChart: ChartArtifact = {
    title: "Inference Latency by Model Provider",
    type: "bar",
    xAxisKey: "Model",
    insight:
      "Gemini 2.0 Flash achieves lowest time-to-first-token across 1,000 runs.",
    data: [
      { label: "Gemini 2.0 Flash", value: 185, deltaPercent: "-42%" },
      { label: "Claude 3.5 Sonnet", value: 310, deltaPercent: "+12%" },
      { label: "GPT-4o Mini", value: 240, deltaPercent: "-18%" },
    ],
    takeaways: [
      "Local caching reduces median TTFT by 40%",
      "Edge routing bypasses transit hops",
    ],
  };

  const samplePlan: GoalPlan = {
    goal: "Deploy Enterprise Agentic RAG Platform",
    timeframe: "Q1-Q2 2026",
    overview:
      "Three-phase rollout of autonomous knowledge synthesis pipelines.",
    keySuccessMetrics: [
      "Sub-2s synthesis latency",
      "99.9% tool uptime",
      "Zero hallucinations on verified docs",
    ],
    phases: [
      {
        id: "p1",
        phaseNumber: 1,
        phaseName: "Infrastructure & MCP Registry",
        summary: "Deploy FastMCP servers and memory indexer",
        status: "completed",
        tasks: [
          {
            id: "t1",
            title: "Setup Vector DB",
            description: "Deploy Qdrant cluster on Kubernetes",
            status: "completed",
            actionableOutput: "qdrant.cluster.local:6333 online",
          },
        ],
      },
      {
        id: "p2",
        phaseNumber: 2,
        phaseName: "Synthesizer Calibration",
        summary: "Tune dialectical critic agents",
        status: "active",
        tasks: [
          {
            id: "t2",
            title: "Benchmark prompt variations",
            description:
              "Evaluate prompt robustness with 100 synthetic scenarios",
            status: "in_progress",
          },
        ],
      },
    ],
  };

  const sampleCode: CodeArtifact = {
    language: "typescript",
    filename: "mcp-agent-bridge.ts",
    code: `import { Client } from "@modelcontextprotocol/sdk/client/index.js";\n\nexport async function initMcpBridge() {\n  return new Client({ name: "nova-agent", version: "1.0.0" });\n}`,
    explanation:
      "Standardized initialization of the Model Context Protocol bridge client.",
    previewHtml: "<div>MCP Bridge Active</div>",
  };

  const sampleDebate: DebateArtifact = {
    topic: "Local LLM Inference vs Managed Cloud Endpoints",
    consensusSummary:
      "Hybrid tiered routing offers superior privacy and burst capability.",
    synthesisVerdict:
      "Route confidential memory search to local Ollama; burst complex synthesis to Claude.",
    perspectives: [
      {
        agentName: "Privacy Guardian",
        stance: "Advocate",
        avatarColor: "#10b981",
        arguments: [
          "Zero egress of confidential enterprise records",
          "Predictable hardware cost",
        ],
        caveats: ["Requires dedicated 80GB VRAM accelerators"],
      },
      {
        agentName: "Throughput Arbiter",
        stance: "Critic",
        avatarColor: "#f43f5e",
        arguments: [
          "Cloud providers offer continuous fine-tuning and scale",
          "Lower maintenance overhead",
        ],
        caveats: ["Subject to external rate limits and API deprecations"],
      },
    ],
  };

  describe("HTML Structure & Offline Guarantee", () => {
    it("generates valid DOCTYPE and HTML5 container", () => {
      const artifact: Artifact = {
        type: "research",
        data: sampleResearchReport,
      };
      const html = generateStandaloneHtmlDossier(artifact);

      expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
      expect(html).toContain('<html lang="en">');
      expect(html).toContain("<head>");
      expect(html).toContain('<meta charset="UTF-8">');
      expect(html).toContain(
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
      );
      expect(html).toContain(
        "<title>Quantum Supercomputing in Distributed AI — Nova Research Dossier</title>",
      );
      expect(html).toContain("</head>");
      expect(html).toContain("<body>");
      expect(html).toContain("</html>");
    });

    it("is 100% self-contained with zero external CDN dependencies", () => {
      const artifact: Artifact = {
        type: "research",
        data: sampleResearchReport,
      };
      const html = generateStandaloneHtmlDossier(artifact);

      // Verify no external script tags, external links, or remote CDN stylesheets
      expect(html).not.toMatch(/<script\s+[^>]*src=["']https?:\/\//i);
      expect(html).not.toMatch(/<link\s+[^>]*href=["']https?:\/\//i);
      expect(html).not.toMatch(/@import\s+url\(["']https?:\/\//i);
      expect(html).toContain("<style>");
      expect(html).toContain("</style>");
    });

    it("includes modern dark slate CSS theme with light theme fallback and print rules", () => {
      const artifact: Artifact = {
        type: "research",
        data: sampleResearchReport,
      };
      const html = generateStandaloneHtmlDossier(artifact);

      // Embedded dark slate theme variables
      expect(html).toContain("--bg-primary: #090d16;");
      expect(html).toContain("--bg-secondary: #0f172a;");
      expect(html).toContain("--accent-teal: #14b8a6;");
      // Light theme fallback media query
      expect(html).toContain("@media (prefers-color-scheme: light)");
      // Print media query for clean offline paper/PDF export
      expect(html).toContain("@media print");
      expect(html).toContain("break-inside: avoid;");
    });

    it("renders executive header with title, model, confidence badge, and timestamp", () => {
      const artifact: Artifact = {
        type: "research",
        data: sampleResearchReport,
      };
      const html = generateStandaloneHtmlDossier(artifact);

      expect(html).toContain("NOVA RESEARCH INTELLIGENCE // EXECUTIVE DOSSIER");
      expect(html).toContain("Quantum Supercomputing in Distributed AI");
      expect(html).toContain("HIGH CONFIDENCE (EMPIRICALLY VERIFIED)");
      expect(html).toContain("Model: nova-autonomous-v1");
      expect(html).toContain("2 Verified Sources");
      expect(html).toContain("100% Offline Standalone");
    });
  });

  describe("XSS Prevention and Input Escaping", () => {
    it("escapes untrusted findings text, preventing malicious HTML injection", () => {
      const maliciousReport: ResearchReport = {
        title: 'Security <script>alert("hacked")</script> Test',
        executiveSummary:
          '<img src=x onerror=alert("exec") /> Summary & "quotes" \'apostrophes\'',
        keyFindings: [
          {
            point: '<b onmouseover="alert(1)">Exploit Point</b>',
            description:
              '<script>document.cookie="stolen"</script> Detailed description',
            confidence: "low",
            citationIds: [],
          },
        ],
        recommendation: '<svg onload="alert(1)">Recommendation',
        sources: [],
      };

      const artifact: Artifact = { type: "research", data: maliciousReport };
      const html = generateStandaloneHtmlDossier(artifact);

      // Verify that raw malicious tags are NOT present unescaped
      expect(html).not.toContain('<script>alert("hacked")</script>');
      expect(html).not.toContain('<img src=x onerror=alert("exec") />');
      expect(html).not.toContain('<b onmouseover="alert(1)">');
      expect(html).not.toContain('<script>document.cookie="stolen"</script>');
      expect(html).not.toContain('<svg onload="alert(1)">');

      // Verify escaped equivalents exist
      expect(html).toContain(
        "&lt;script&gt;alert(&quot;hacked&quot;)&lt;/script&gt;",
      );
      expect(html).toContain(
        "&lt;img src=x onerror=alert(&quot;exec&quot;) /&gt;",
      );
      expect(html).toContain("&amp; &quot;quotes&quot; &#39;apostrophes&#39;");
      expect(html).toContain(
        "&lt;b onmouseover=&quot;alert(1)&quot;&gt;Exploit Point&lt;/b&gt;",
      );
    });

    it("neutralizes dangerous javascript: or data: URLs in bibliography", () => {
      const maliciousSources: SourceCitation[] = [
        {
          id: "s1",
          title: "Malicious Source",
          url: "javascript:alert('pwned')",
          domain: "evil.com",
          snippet: "Snippet text",
        },
        {
          id: "s2",
          title: "Data URI Source",
          url: "data:text/html,<script>alert(1)</script>",
          domain: "evil.com",
          snippet: "Data snippet",
        },
        {
          id: "s3",
          title: "Legitimate Source",
          url: "https://example.com/research",
          domain: "example.com",
          snippet: "Legit snippet",
        },
      ];

      const report: ResearchReport = {
        ...sampleResearchReport,
        sources: maliciousSources,
      };

      const html = generateStandaloneHtmlDossier({
        type: "research",
        data: report,
      });

      // Ensure dangerous schemes are replaced with "#"
      expect(html).not.toContain('href="javascript:');
      expect(html).not.toContain('href="data:');
      expect(html).toContain('href="https://example.com/research"');
    });

    it("safely escapes embedded JSON script payloads preventing script tag breakout", () => {
      const matrixWithMaliciousNames: DecisionMatrix = {
        topic: 'Test </script><script>alert("injected")</script>',
        criteria: [
          {
            id: 'c</script><script>alert("crit")</script>',
            name: "Crit 1",
            weight: 5,
          },
        ],
        options: [
          {
            id: "opt1",
            name: 'Option </script><script>alert("opt")</script>',
            scores: {},
            pros: [],
            cons: [],
            totalWeightedScore: 5,
          },
        ],
        verdict: "Verdict",
      };

      const html = generateStandaloneHtmlDossier({
        type: "matrix",
        data: matrixWithMaliciousNames,
      });

      // Confirm raw breakout tags are neutralized in script blocks
      expect(html).not.toContain('</script><script>alert("injected")</script>');
      expect(html).not.toContain('</script><script>alert("crit")</script>');
      expect(html).not.toContain('</script><script>alert("opt")</script>');
      // Replaced by unicode escape \u003c
      expect(html).toContain("\\u003c/script>\\u003cscript>");
    });
  });

  describe("Embedded CSS and JavaScript Syntax Validity", () => {
    it("extracts CSS and verifies balanced block delimiters", () => {
      const html = generateStandaloneHtmlDossier({
        type: "research",
        data: sampleResearchReport,
      });
      const cssMatch = html.match(/<style>([\s\S]*?)<\/style>/);
      expect(cssMatch).not.toBeNull();
      const css = cssMatch![1];

      // Check balanced braces in CSS
      let openBraces = 0;
      let closeBraces = 0;
      for (const ch of css) {
        if (ch === "{") openBraces++;
        if (ch === "}") closeBraces++;
      }
      expect(openBraces).toBeGreaterThan(10);
      expect(openBraces).toBe(closeBraces);
    });

    it("extracts embedded JavaScript and verifies clean syntax execution", () => {
      const html = generateStandaloneHtmlDossier({
        type: "research",
        data: sampleResearchReport,
      });
      const jsMatches = [
        ...html.matchAll(
          /<script(?![^>]*type=["']application\/json["'])>([\s\S]*?)<\/script>/gi,
        ),
      ];
      expect(jsMatches.length).toBeGreaterThan(0);

      for (const match of jsMatches) {
        const jsCode = match[1];
        // Compiling via new Function ensures JavaScript is syntactically valid
        expect(() => new Function(jsCode)).not.toThrow();
      }
    });
  });

  describe("Artifact Rendering", () => {
    it("renders Research Findings with interactive citation tags and popover metadata", () => {
      const html = generateStandaloneHtmlDossier({
        type: "research",
        data: sampleResearchReport,
      });

      expect(html).toContain("Executive Summary");
      expect(html).toContain("Neutral atom coherence exceeds 100 microseconds");
      expect(html).toContain("HIGH CONFIDENCE");
      // Interactive citation tags with data attributes
      expect(html).toContain('class="citation-tag" data-citation-idx="1"');
      expect(html).toContain('class="citation-tag" data-citation-idx="2"');
      // Sources payload element for vanilla JS tooltip popover
      expect(html).toContain('id="nova-sources-payload"');
      expect(html).toContain(
        "Deep Reinforcement Learning &amp; Autonomous Agents",
      );
    });

    it("renders Decision Matrix with criteria weight sliders and dynamic option rankings", () => {
      const html = generateStandaloneHtmlDossier({
        type: "matrix",
        data: sampleMatrix,
      });

      expect(html).toContain("Criteria Weight Adjustments");
      expect(html).toContain("Search Latency");
      expect(html).toContain('type="range"');
      expect(html).toContain('min="0"');
      expect(html).toContain('max="10"');
      expect(html).toContain('step="1"');
      expect(html).toContain('id="slider-c1"');
      expect(html).toContain('id="slider-c2"');
      expect(html).toContain('id="reset-matrix-weights"');
      // Options cards
      expect(html).toContain("Qdrant");
      expect(html).toContain("Milvus");
      expect(html).toContain("Chroma");
      expect(html).toContain('id="option-card-opt-1"');
      expect(html).toContain('id="score-val-opt-1"');
      expect(html).toContain('id="top-badge-opt-1"');
      // Matrix payload JSON embedded for real-time recalculation
      expect(html).toContain('id="nova-matrix-payload"');
    });

    it("renders Chart artifact with data table and visual percentage bars", () => {
      const html = generateStandaloneHtmlDossier({
        type: "chart",
        data: sampleChart,
      });

      expect(html).toContain("Inference Latency by Model Provider");
      expect(html).toContain("Gemini 2.0 Flash");
      expect(html).toContain("Claude 3.5 Sonnet");
      expect(html).toContain("Data Table");
      expect(html).toContain("Comparative Distribution");
      expect(html).toContain("Key Takeaways");
      expect(html).toContain("Local caching reduces median TTFT by 40%");
    });

    it("renders Plan artifact with milestone phases and tasks checklists", () => {
      const html = generateStandaloneHtmlDossier({
        type: "plan",
        data: samplePlan,
      });

      expect(html).toContain("Deploy Enterprise Agentic RAG Platform");
      expect(html).toContain("Q1-Q2 2026");
      expect(html).toContain("Sub-2s synthesis latency");
      expect(html).toContain("Phase 1");
      expect(html).toContain("Infrastructure &amp; MCP Registry");
      expect(html).toContain("Setup Vector DB");
      expect(html).toContain("Deliverable:");
      expect(html).toContain("qdrant.cluster.local:6333 online");
    });

    it("renders Code artifact with styled code block and copy-to-clipboard button", () => {
      const html = generateStandaloneHtmlDossier({
        type: "code",
        data: sampleCode,
      });

      expect(html).toContain("mcp-agent-bridge.ts");
      expect(html).toContain("typescript");
      expect(html).toContain("Copy Code");
      expect(html).toContain(
        "import { Client } from &quot;@modelcontextprotocol/sdk/client/index.js&quot;;",
      );
      expect(html).toContain("MCP Bridge Active");
    });

    it("renders Debate artifact with dialectical stances and consensus verdict", () => {
      const html = generateStandaloneHtmlDossier({
        type: "debate",
        data: sampleDebate,
      });

      expect(html).toContain("Local LLM Inference vs Managed Cloud Endpoints");
      expect(html).toContain("Privacy Guardian");
      expect(html).toContain("Throughput Arbiter");
      expect(html).toContain("Core Arguments:");
      expect(html).toContain("Zero egress of confidential enterprise records");
      expect(html).toContain("Identified Caveats &amp; Edge Cases:");
      expect(html).toContain("Requires dedicated 80GB VRAM accelerators");
      expect(html).toContain("SYNTHESIS ARBITRATION VERDICT");
    });

    it("renders Academic Bibliography with domain badges, authors, dates, and scores", () => {
      const html = generateStandaloneHtmlDossier({
        type: "research",
        data: sampleResearchReport,
      });

      expect(html).toContain("Academic Bibliography &amp; Verified Sources");
      expect(html).toContain("arxiv.org");
      expect(html).toContain("modelcontextprotocol.io");
      expect(html).toContain("Dr. Elena Rostova");
      expect(html).toContain("96% Relevance");
      expect(html).toContain("Published: 2026-02-15");
      expect(html).toContain("https://arxiv.org/abs/2301.00001");
      expect(html).toContain('id="source-1"');
      expect(html).toContain('id="source-2"');
    });

    it("handles Session fallback cleanly when no artifact is provided", () => {
      const session: Session = {
        id: "sess-123",
        title: "Autonomous Financial Audit Session",
        mode: "research",
        createdAt: "2026-10-28T18:00:00Z",
        updatedAt: "2026-10-28T19:30:00Z",
        messages: [
          {
            id: "m1",
            role: "user",
            content: "Audit Q3 balance sheets",
            timestamp: "2026-10-28T18:01:00Z",
          },
          {
            id: "m2",
            role: "assistant",
            content: "Reconciliation complete. Zero discrepancy detected.",
            timestamp: "2026-10-28T18:02:00Z",
          },
        ],
      };

      const html = generateStandaloneHtmlDossier(null, session);
      expect(html).toContain("Autonomous Financial Audit Session");
      expect(html).toContain(
        "Reconciliation complete. Zero discrepancy detected.",
      );
      expect(html).toContain("Turn Transcript (2 messages)");
    });
  });

  describe("Filename Sanitization and Download Engine", () => {
    it("sanitizes filenames into clean kebab-case slugs", () => {
      expect(sanitizeFileName("Quantum Supercomputing in Distributed AI")).toBe(
        "quantum-supercomputing-in-distributed-ai",
      );
      expect(sanitizeFileName("Next-Gen Multi-Agent (2026!) / Spec")).toBe(
        "next-gen-multi-agent-2026-spec",
      );
      expect(sanitizeFileName("   ---Multiple    Spaces---   ")).toBe(
        "multiple-spaces",
      );
      expect(sanitizeFileName("")).toBe("untitled-session");
      expect(sanitizeFileName("$$$%%%")).toBe("untitled-session");
    });

    it("resolves titles accurately across artifact types", () => {
      expect(
        resolveDossierTitle({ type: "research", data: sampleResearchReport }),
      ).toBe("Quantum Supercomputing in Distributed AI");
      expect(resolveDossierTitle({ type: "matrix", data: sampleMatrix })).toBe(
        "Vector Database Engine Selection",
      );
      expect(resolveDossierTitle({ type: "chart", data: sampleChart })).toBe(
        "Inference Latency by Model Provider",
      );
      expect(resolveDossierTitle({ type: "plan", data: samplePlan })).toBe(
        "Deploy Enterprise Agentic RAG Platform",
      );
      expect(resolveDossierTitle({ type: "code", data: sampleCode })).toBe(
        "mcp-agent-bridge.ts",
      );
      expect(resolveDossierTitle({ type: "debate", data: sampleDebate })).toBe(
        "Local LLM Inference vs Managed Cloud Endpoints",
      );
    });

    it("resolves model telemetry from session messages", () => {
      const sessionWithModel: Session = {
        id: "sess-1",
        title: "Test Session",
        mode: "research",
        createdAt: "2026-10-28T18:00:00Z",
        updatedAt: "2026-10-28T18:00:00Z",
        messages: [
          {
            id: "m1",
            role: "assistant",
            content: "Response",
            timestamp: "2026-10-28T18:00:00Z",
            telemetry: {
              latencyMs: 120,
              tokenCount: 450,
              tokensPerSec: 85,
              model: "anthropic:claude-sonnet-5-5",
            },
          },
        ],
      };

      expect(resolveDossierModel(null, sessionWithModel)).toBe(
        "anthropic:claude-sonnet-5-5",
      );
    });

    it("downloadStandaloneHtmlDossier runs safely in SSR without throwing", () => {
      expect(() => {
        downloadStandaloneHtmlDossier({
          type: "research",
          data: sampleResearchReport,
        });
      }).not.toThrow();
    });

    it("escapeHtml, sanitizeUrl, and extractDossierSources work deterministically", () => {
      expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
      expect(escapeHtml(null)).toBe("");
      expect(sanitizeUrl("https://example.com")).toBe("https://example.com");
      expect(sanitizeUrl("javascript:evil()")).toBe("#");
      expect(sanitizeUrl("")).toBe("#");

      const extracted = extractDossierSources({
        type: "research",
        data: sampleResearchReport,
      });
      expect(extracted.length).toBe(2);
      expect(extracted[0].domain).toBe("arxiv.org");
    });
  });
});
