import { describe, it, expect } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { extractKnowledgeGraph } from "@/lib/research/knowledge-graph";
import { KnowledgeGraphCard } from "@/components/GenerativeCards/KnowledgeGraphCard";
import type { ResearchReport, SourceCitation } from "@/lib/types";

describe("Knowledge Graph & Citation Network Extractor", () => {
  const sampleSources: SourceCitation[] = [
    {
      id: "src-1",
      title: "Google DeepMind: Vector Embeddings and RAG Architecture",
      url: "https://deepmind.google/research/vector-embeddings",
      domain: "deepmind.google",
      snippet:
        "Vector search combined with Reciprocal Rank Fusion improves retrieval accuracy in LLMs.",
    },
    {
      id: "src-2",
      title: "Next.js App Router Documentation",
      url: "https://nextjs.org/docs/app",
      domain: "nextjs.org",
      snippet:
        "Streaming Server Components with React and TypeScript enable low-latency user interfaces.",
    },
    {
      id: "src-3",
      title: "FastAPI High Performance Web Services",
      url: "https://fastapi.tiangolo.com",
      domain: "fastapi.tiangolo.com",
      snippet: "Asynchronous Python API routing with Pydantic validation.",
    },
  ];

  const sampleFindings = [
    {
      point: "RAG Architecture and Vector Embeddings",
      description:
        "Reciprocal Rank Fusion improves LLM accuracy by fusing sparse and dense retrieval.",
      citationIds: ["src-1"],
      confidence: "high" as const,
    },
    {
      point: "Next.js Streaming with Fast API Backend",
      description:
        "Next.js UI communicates with a FastAPI server using TypeScript and Python.",
      citationIds: ["src-2", "src-3"],
      confidence: "high" as const,
    },
    {
      point: "Hybrid Retrieval Evaluation",
      description: "Comparing vector search and BM25 in RAG workflows.",
      citationIds: ["src-1"],
      confidence: "medium" as const,
    },
  ];

  const sampleReport: ResearchReport = {
    title: "Multi-Agent Intelligence and Grounded Synthesis",
    executiveSummary:
      "Analysis of autonomous agent architectures and citation grounding.",
    keyFindings: [
      {
        point: "Reciprocal Rank Fusion Enhances Accuracy",
        description:
          "Combining vector embeddings with lexical BM25 ranking outperforms single-strategy retrieval.",
        confidence: "high",
        citationIds: ["src-1"],
      },
      {
        point: "Next.js and FastAPI Microservice Decoupling",
        description:
          "Asynchronous Python agents serve streaming responses to Next.js components.",
        confidence: "high",
        citationIds: ["src-2", "src-3"],
      },
    ],
    sources: sampleSources,
    recommendation: "Deploy hybrid retrieval pipeline across all agent swarms.",
  };

  it("extracts source nodes with correct metadata and labels", () => {
    const graph = extractKnowledgeGraph({
      title: "Comparative Study of Modern AI Architectures",
      findings: sampleFindings,
      sources: sampleSources,
    });

    const sourceNodes = graph.nodes.filter((n) => n.type === "source");
    expect(sourceNodes.length).toBe(3);

    const deepmindSource = sourceNodes.find(
      (n) => n.domain === "deepmind.google",
    );
    expect(deepmindSource).toBeDefined();
    expect(deepmindSource?.label).toContain("Google DeepMind");
    expect(deepmindSource?.url).toBe(
      "https://deepmind.google/research/vector-embeddings",
    );
    expect(deepmindSource?.snippet).toContain("Vector search");
  });

  it("extracts finding nodes with proper snippets and confidence", () => {
    const graph = extractKnowledgeGraph({
      title: "Comparative Study of Modern AI Architectures",
      findings: sampleFindings,
      sources: sampleSources,
    });

    const findingNodes = graph.nodes.filter((n) => n.type === "finding");
    expect(findingNodes.length).toBe(3);

    const f1 = findingNodes[0];
    expect(f1.id).toBe("finding-1");
    expect(f1.label).toBe("RAG Architecture and Vector Embeddings");
    expect(f1.confidence).toBe("high");
    expect(f1.snippet).toContain("Reciprocal Rank Fusion");
  });

  it("extracts key concepts and entities without fake data", () => {
    const graph = extractKnowledgeGraph({
      title: "Deep Learning and Knowledge Graph Synthesis",
      findings: sampleFindings,
      sources: sampleSources,
    });

    const conceptNodes = graph.nodes.filter(
      (n) => n.type === "concept" || n.type === "entity",
    );
    expect(conceptNodes.length).toBeGreaterThan(0);

    const labels = conceptNodes.map((c) => c.label.toLowerCase());
    const hasRag = labels.some((l) => l.includes("rag"));
    const hasNext = labels.some((l) => l.includes("next"));
    const hasFastApi = labels.some((l) => l.includes("fastapi"));

    expect(hasRag || hasNext || hasFastApi).toBe(true);
  });

  it("resolves citation links and creates 'cites' edges between findings and sources", () => {
    const graph = extractKnowledgeGraph({
      title: "AI Synthesis",
      findings: sampleFindings,
      sources: sampleSources,
    });

    const citesEdges = graph.edges.filter((e) => e.label === "cites");
    expect(citesEdges.length).toBeGreaterThan(0);

    // Finding 1 cites src-1
    const f1SourceEdge = citesEdges.find(
      (e) => e.source === "finding-1" && e.target.includes("src-1"),
    );
    expect(f1SourceEdge).toBeDefined();
    expect(f1SourceEdge?.weight).toBeGreaterThanOrEqual(1);

    // Finding 2 cites both src-2 and src-3
    const f2Edges = citesEdges.filter((e) => e.source === "finding-2");
    expect(f2Edges.length).toBe(2);
  });

  it("resolves numeric and bracketed citation formats like [1] or '2'", () => {
    const numericFindings = [
      {
        text: "Direct bracket citation to first source",
        citationIds: ["[1]"],
      },
      {
        text: "String number citation to second source",
        citationIds: ["2"],
      },
    ];

    const graph = extractKnowledgeGraph({
      title: "Citation Test",
      findings: numericFindings,
      sources: sampleSources,
    });

    const citesEdges = graph.edges.filter((e) => e.label === "cites");
    expect(citesEdges.length).toBe(2);
    expect(
      citesEdges.some(
        (e) => e.source === "finding-1" && e.target.includes("src-1"),
      ),
    ).toBe(true);
    expect(
      citesEdges.some(
        (e) => e.source === "finding-2" && e.target.includes("src-2"),
      ),
    ).toBe(true);
  });

  it("accumulates edge weights when a finding cites a source multiple times", () => {
    const repeatedFindings = [
      {
        point: "Repeated reference",
        text: "Important observation backed by src-1 twice",
        citationIds: ["src-1", "src-1"],
      },
    ];

    const graph = extractKnowledgeGraph({
      title: "Weight Accumulation Test",
      findings: repeatedFindings,
      sources: sampleSources,
    });

    const edge = graph.edges.find(
      (e) => e.source === "finding-1" && e.target.includes("src-1"),
    );
    expect(edge).toBeDefined();
    expect(edge?.weight).toBe(2);
  });

  it("creates 'relates_to' edges between co-occurring concepts", () => {
    const graph = extractKnowledgeGraph({
      title: "Co-occurrence Network",
      findings: sampleFindings,
      sources: sampleSources,
    });

    const relatesEdges = graph.edges.filter((e) => e.label === "relates_to");
    for (const edge of relatesEdges) {
      expect(edge.weight).toBeGreaterThanOrEqual(1);
      expect(edge.source).not.toBe(edge.target);
    }
  });

  it("computes accurate node degrees for all nodes deterministically", () => {
    const graph = extractKnowledgeGraph({
      title: "Degree Calculation Test",
      findings: sampleFindings,
      sources: sampleSources,
    });

    for (const node of graph.nodes) {
      const actualIncidentCount = graph.edges.filter(
        (e) => e.source === node.id || e.target === node.id,
      ).length;
      expect(node.degree).toBe(actualIncidentCount);
    }
  });

  it("computes deterministic 2D coordinates within canvas boundaries", () => {
    const runA = extractKnowledgeGraph({
      title: "Deterministic Layout Test",
      findings: sampleFindings,
      sources: sampleSources,
    });

    const runB = extractKnowledgeGraph({
      title: "Deterministic Layout Test",
      findings: sampleFindings,
      sources: sampleSources,
    });

    // Run A and Run B must produce exact identical coordinates (Strictly zero Math.random)
    expect(runA.nodes.length).toBe(runB.nodes.length);
    for (let i = 0; i < runA.nodes.length; i++) {
      expect(runA.nodes[i].x).toBe(runB.nodes[i].x);
      expect(runA.nodes[i].y).toBe(runB.nodes[i].y);
      expect(runA.nodes[i].x).toBeGreaterThanOrEqual(50);
      expect(runA.nodes[i].x).toBeLessThanOrEqual(750);
      expect(runA.nodes[i].y).toBeGreaterThanOrEqual(50);
      expect(runA.nodes[i].y).toBeLessThanOrEqual(550);
    }
  });

  it("handles empty findings and sources gracefully without error", () => {
    const emptyGraph = extractKnowledgeGraph({
      title: "",
      findings: [],
      sources: [],
    });

    expect(emptyGraph.nodes).toBeDefined();
    expect(emptyGraph.edges).toBeDefined();
    expect(Array.isArray(emptyGraph.nodes)).toBe(true);
    expect(Array.isArray(emptyGraph.edges)).toBe(true);
  });

  it("handles findings without sources cleanly", () => {
    const graph = extractKnowledgeGraph({
      title: "Theoretical AI Reasoning",
      findings: [
        {
          point: "Autonomous Swarms",
          description:
            "Multi-agent systems coordinate via distributed consensus protocols.",
        },
      ],
      sources: [],
    });

    expect(graph.nodes.length).toBeGreaterThanOrEqual(1);
    const sourceNodes = graph.nodes.filter((n) => n.type === "source");
    expect(sourceNodes.length).toBe(0);

    const findingNodes = graph.nodes.filter((n) => n.type === "finding");
    expect(findingNodes.length).toBe(1);
  });

  it("handles sources without findings cleanly", () => {
    const graph = extractKnowledgeGraph({
      title: "Unprocessed Sources Dossier",
      findings: [],
      sources: sampleSources,
    });

    const sourceNodes = graph.nodes.filter((n) => n.type === "source");
    expect(sourceNodes.length).toBe(3);
    const findingNodes = graph.nodes.filter((n) => n.type === "finding");
    expect(findingNodes.length).toBe(0);
  });

  it("extracts knowledge graph from a real ResearchReport fixture", () => {
    const graph = extractKnowledgeGraph({
      title: sampleReport.title,
      findings: sampleReport.keyFindings,
      sources: sampleReport.sources,
    });

    expect(graph.nodes.length).toBeGreaterThanOrEqual(5);
    expect(graph.edges.length).toBeGreaterThanOrEqual(2);

    const sourceCount = graph.nodes.filter((n) => n.type === "source").length;
    const findingCount = graph.nodes.filter((n) => n.type === "finding").length;
    expect(sourceCount).toBe(3);
    expect(findingCount).toBe(2);
  });

  describe("KnowledgeGraphCard Component Rendering", () => {
    it("renders SVG canvas, controls, and legend with real report data", () => {
      const html = renderToString(
        React.createElement(KnowledgeGraphCard, { report: sampleReport }),
      );

      // Verify header and title
      expect(html).toContain("Multi-Agent Intelligence and Grounded Synthesis");
      expect(html).toContain(
        "Interactive knowledge graph and citation network",
      );

      // Verify controls
      expect(html).toContain("Zoom In");
      expect(html).toContain("Zoom Out");
      expect(html).toContain("Reset View");
      expect(html).toContain("SVG");
      expect(html).toContain("JSON");

      // Verify legend
      expect(html).toContain("Sources");
      expect(html).toContain("Findings");
      expect(html).toContain("Concepts");
      expect(html).toContain("Entities");

      // Verify SVG canvas elements
      expect(html).toContain("<svg");
      expect(html).toContain("edges-layer");
      expect(html).toContain("nodes-layer");
      expect(html).toContain("arrow-cites");
    });

    it("renders cleanly with empty or minimal data without crashing", () => {
      const html = renderToString(
        React.createElement(KnowledgeGraphCard, {
          data: { title: "Empty Project", findings: [], sources: [] },
        }),
      );

      expect(html).toContain("Empty Project");
      expect(html).toContain("nodes");
      expect(html).toContain("links");
    });
  });

  describe("ArtifactStage Research Graph Tab Integration", () => {
    it("integrates dedicated Graph tab and KnowledgeGraphCard into ArtifactStage", async () => {
      const { readFileSync } = await import("fs");
      const { join } = await import("path");
      const content = readFileSync(
        join(process.cwd(), "src/components/ArtifactStage.tsx"),
        "utf-8",
      );

      // Verify Graph tab button with Network icon
      expect(content).toContain('<Network className="w-3.5 h-3.5" />');
      expect(content).toContain("<span>Graph</span>");
      expect(content).toContain('setActiveTab("graph")');

      // Verify KnowledgeGraphCard rendering
      expect(content).toContain("<KnowledgeGraphCard");
      expect(content).toContain(
        'activeTab === "graph" && artifact.type === "research"',
      );
    });
  });
});
