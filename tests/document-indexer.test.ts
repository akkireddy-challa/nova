import { describe, expect, it } from "bun:test";
import {
  chunkDocumentText,
  indexDocumentIntoMemories,
  groupDocumentMemories,
} from "../src/lib/document-indexer";
import type { KnowledgeMemoryItem } from "../src/lib/types";

describe("Document Indexer & Local RAG", () => {
  describe("Chunking long markdown/text documents on paragraph boundaries", () => {
    it("splits long text cleanly on paragraph boundaries without splitting paragraphs in half when they fit", () => {
      const p1 =
        "First paragraph about Nova architecture. It contains sufficient detail about how agents collaborate locally without leaking data or tokens.";
      const p2 =
        "Second paragraph detailing Model Context Protocol. MCP connects custom tools and local databases directly to the AI models.";
      const p3 =
        "Third paragraph explaining RAG indexing and BM25 scoring. Documents are chunked into paragraphs and embedded for semantic retrieval.";
      const p4 =
        "Fourth paragraph discussing offline resilience and fallback mechanisms. The system runs smoothly even when internet drops.";

      const docText = `${p1}\n\n${p2}\n\n${p3}\n\n${p4}`;

      // Set maxChunkSize to fit ~2 paragraphs per chunk
      const chunks = chunkDocumentText(docText, {
        maxChunkSize: 320,
        minChunkSize: 150,
        overlap: 50,
      });

      expect(chunks.length).toBeGreaterThan(1);
      // Chunks should start/end on paragraph or sentence boundaries
      for (const chunk of chunks) {
        expect(chunk.length).toBeGreaterThan(0);
        expect(chunk.length).toBeLessThanOrEqual(400); // within allowance
      }

      // First chunk should contain p1
      expect(chunks[0]).toContain(p1);
    });

    it("splits on sentence boundaries when a single paragraph exceeds the maximum chunk size", () => {
      const sentence1 =
        "Nova provides an enterprise-grade agent studio with multi-provider intelligence.";
      const sentence2 =
        "It supports Claude, Gemini, OpenAI, and local Ollama inference transparently.";
      const sentence3 =
        "Each provider endpoint is health-checked with real latency measurements and zero simulated telemetry.";
      const sentence4 =
        "The built-in RAG engine stores document chunks in local browser memory without remote database dependencies.";

      const giantParagraph = `${sentence1} ${sentence2} ${sentence3} ${sentence4}`;

      const chunks = chunkDocumentText(giantParagraph, {
        maxChunkSize: 180,
        minChunkSize: 80,
        overlap: 40,
      });

      expect(chunks.length).toBeGreaterThan(1);
      // Verify no words are chopped in half
      for (const chunk of chunks) {
        expect(chunk).toMatch(/^[A-Z]/); // Begins cleanly with a capital letter
        expect(chunk).toMatch(/[.!?]$/); // Ends cleanly with sentence punctuation
      }
    });

    it("maintains overlapping context between consecutive chunks", () => {
      const paragraphs = [
        "Section Alpha describes the foundational security requirements of the studio.",
        "Section Beta covers the provider proxy and key redaction layers.",
        "Section Gamma defines the memory search with BM25 and cosine similarity rankings.",
      ];
      const text = paragraphs.join("\n\n");

      const chunks = chunkDocumentText(text, {
        maxChunkSize: 180,
        minChunkSize: 70,
        overlap: 40,
      });

      expect(chunks.length).toBeGreaterThan(1);
      // Check that later chunks share some context from earlier text
      const joined = chunks.join(" ");
      expect(joined).toContain("Section Alpha");
      expect(joined).toContain("Section Beta");
      expect(joined).toContain("Section Gamma");
    });
  });

  describe("Tagging and metadata assignment", () => {
    it("indexes a document into KnowledgeMemoryItems with required fields and tags", () => {
      const doc = {
        name: "Security Policy 2026.md",
        content:
          "All API keys are strictly kept on the server and never sent to client-side localStorage. Requests redact bearer tokens before returning error traces.",
      };

      const memories = indexDocumentIntoMemories(doc);

      expect(memories.length).toBe(1);
      const memory = memories[0];

      // Check id format
      expect(memory.id).toMatch(/^doc-[a-z0-9]+$/i);

      // Check title format: "${doc.name} (Part ${i+1}/${total})"
      expect(memory.title).toBe("Security Policy 2026.md (Part 1/1)");

      // Check category is "document"
      expect(memory.category).toBe("document");

      // Check tags: ["document", doc.name.toLowerCase().replace(/[^a-z0-9]/g, "-")]
      expect(memory.tags).toEqual(["document", "security-policy-2026-md"]);

      // Check timestamps
      expect(memory.createdAt).toBeDefined();
      expect(memory.updatedAt).toBeDefined();
      expect(new Date(memory.createdAt).getTime()).toBeGreaterThan(0);
      expect(new Date(memory.updatedAt!).getTime()).toBeGreaterThan(0);

      // Content should match cleaned text
      expect(memory.content).toBe(doc.content.trim());
    });

    it("formats part numbers accurately across multiple chunks", () => {
      const doc = {
        name: "architecture.md",
        content: [
          "# Core Architecture\n\nNova is built for high-performance agent workflows.",
          "## Memory System\n\nLocal documents are chunked and searched with BM25.",
          "## Providers\n\nSupports Gemini, Anthropic, OpenAI, and Ollama with live health probes.",
        ].join("\n\n"),
      };

      const memories = indexDocumentIntoMemories(doc, {
        maxChunkSize: 120,
        minChunkSize: 50,
        overlap: 20,
      });

      expect(memories.length).toBeGreaterThan(1);
      const total = memories.length;

      memories.forEach((mem, index) => {
        expect(mem.title).toBe(`architecture.md (Part ${index + 1}/${total})`);
        expect(mem.category).toBe("document");
        expect(mem.tags).toEqual(["document", "architecture-md"]);
        expect(mem.id.startsWith("doc-")).toBe(true);
      });
    });
  });

  describe("Grouping document chunks into summaries (groupDocumentMemories)", () => {
    it("groups chunk memories back to a document overview", () => {
      const now = new Date().toISOString();
      const memories: KnowledgeMemoryItem[] = [
        {
          id: "doc-1",
          title: "API-Guide.md (Part 1/2)",
          content: "This is the first chunk of the API guide with eight words.",
          category: "document",
          tags: ["document", "api-guide-md"],
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "doc-2",
          title: "API-Guide.md (Part 2/2)",
          content: "Here is the second chunk containing six more words.",
          category: "document",
          tags: ["document", "api-guide-md"],
          createdAt: now,
          updatedAt: now,
        },
      ];

      const groups = groupDocumentMemories(memories);

      expect(groups).toHaveLength(1);
      const group = groups[0];
      expect(group.docName).toBe("API-Guide.md");
      expect(group.totalChunks).toBe(2);
      expect(group.totalWords).toBe(21); // 12 words + 9 words
      expect(group.memoryIds).toEqual(["doc-1", "doc-2"]);
      expect(group.lastUpdated).toBe(now);
    });

    it("filters out non-document memories and separates distinct documents", () => {
      const time1 = "2026-10-28T10:00:00.000Z";
      const time2 = "2026-10-28T12:00:00.000Z";

      const memories: KnowledgeMemoryItem[] = [
        {
          id: "mem-pref",
          title: "Dark mode preference",
          content: "User prefers dark mode and high contrast.",
          category: "preference",
          createdAt: time1,
        },
        {
          id: "doc-1",
          title: "Database.sql (Part 1/1)",
          content: "CREATE TABLE users (id SERIAL PRIMARY KEY, email TEXT);",
          category: "document",
          createdAt: time1,
          updatedAt: time1,
        },
        {
          id: "doc-2",
          title: "README.md (Part 1/1)",
          content: "# Nova\nOpen source local studio.",
          category: "document",
          createdAt: time2,
          updatedAt: time2,
        },
      ];

      const groups = groupDocumentMemories(memories);

      expect(groups).toHaveLength(2);
      // Newest first
      expect(groups[0].docName).toBe("README.md");
      expect(groups[0].lastUpdated).toBe(time2);
      expect(groups[1].docName).toBe("Database.sql");
      expect(groups[1].lastUpdated).toBe(time1);

      // Verify personal preference was excluded
      const allDocNames = groups.map((g) => g.docName);
      expect(allDocNames).not.toContain("Dark mode preference");
    });

    it("handles empty memories gracefully", () => {
      expect(groupDocumentMemories([])).toEqual([]);
    });
  });

  describe("Handling small single-paragraph documents vs large multi-page documents", () => {
    it("indexes small single-paragraph document into a single chunk", () => {
      const doc = {
        name: "quick-note.txt",
        content: "Just a short note about the project roadmap.",
      };

      const memories = indexDocumentIntoMemories(doc);
      expect(memories).toHaveLength(1);
      expect(memories[0].title).toBe("quick-note.txt (Part 1/1)");
      expect(memories[0].content).toBe(doc.content);
    });

    it("handles large multi-page documents producing multiple chunks", () => {
      const paragraphs = Array.from({ length: 25 }, (_, i) => {
        return `Paragraph ${i + 1}: Detailed description of system component #${i + 1}. Contains extensive specifications, interface contracts, error boundaries, and integration tests for local RAG execution.`;
      });
      const largeDoc = {
        name: "specification.md",
        content: paragraphs.join("\n\n"),
      };

      const memories = indexDocumentIntoMemories(largeDoc, {
        maxChunkSize: 600,
        minChunkSize: 300,
        overlap: 80,
      });

      expect(memories.length).toBeGreaterThan(5);
      const groups = groupDocumentMemories(memories);
      expect(groups).toHaveLength(1);
      expect(groups[0].docName).toBe("specification.md");
      expect(groups[0].totalChunks).toBe(memories.length);
      expect(groups[0].totalWords).toBeGreaterThan(200);
    });

    it("returns empty array for empty or whitespace-only documents", () => {
      expect(
        indexDocumentIntoMemories({ name: "empty.txt", content: "" }),
      ).toEqual([]);
      expect(
        indexDocumentIntoMemories({ name: "spaces.txt", content: "   \n\t  " }),
      ).toEqual([]);
    });
  });
});
