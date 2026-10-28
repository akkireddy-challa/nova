import { describe, it, expect, afterEach } from "bun:test";
import { htmlToText } from "../src/lib/research/fetch-page";
import { runPipeline, PipelineDeps } from "../src/lib/research/pipeline";
import { ResearchReport } from "../src/lib/types";

describe("htmlToText metadata extraction", () => {
  it("extracts OpenGraph description, author, published date, and site name from HTML samples", () => {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <title>Nova Research - Next Gen Agents</title>
        <meta property="og:title" content="Nova Research - Next Gen Agents" />
        <meta property="og:description" content="An in-depth analysis of multimodal intelligence architectures." />
        <meta property="og:site_name" content="Nova Tech Journal" />
        <meta name="author" content="Dr. Elena Vance" />
        <meta property="article:published_time" content="2026-10-28T14:30:00Z" />
      </head>
      <body>
        <main>
          <h1>Nova Research</h1>
          <p>Key findings on autonomous agent workflows.</p>
        </main>
      </body>
      </html>
    `;

    const parsed = htmlToText(html);

    expect(parsed.title).toBe("Nova Research - Next Gen Agents");
    expect(parsed.description).toBe(
      "An in-depth analysis of multimodal intelligence architectures.",
    );
    expect(parsed.siteName).toBe("Nova Tech Journal");
    expect(parsed.author).toBe("Dr. Elena Vance");
    expect(parsed.publishedDate).toBe("2026-10-28T14:30:00Z");
    expect(parsed.text).toContain("Nova Research");
    expect(parsed.text).toContain(
      "Key findings on autonomous agent workflows.",
    );
  });

  it("extracts metadata from fallback meta tags when OpenGraph tags are absent", () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Fallback Meta Document</title>
        <meta name="description" content="Standard page description without OpenGraph." />
        <meta property="article:author" content="Arthur Dent" />
        <meta name="pubdate" content="2026-05-15" />
        <meta name="application-name" content="Nova Core Platform" />
      </head>
      <body>
        <p>Document body content.</p>
      </body>
      </html>
    `;

    const parsed = htmlToText(html);

    expect(parsed.title).toBe("Fallback Meta Document");
    expect(parsed.description).toBe(
      "Standard page description without OpenGraph.",
    );
    expect(parsed.author).toBe("Arthur Dent");
    expect(parsed.publishedDate).toBe("2026-05-15");
    expect(parsed.siteName).toBe("Nova Core Platform");
  });

  it("falls back to name=date when article:published_time and pubdate are absent", () => {
    const html = `
      <html>
      <head>
        <meta name="date" content="2026-01-15T09:00:00Z" />
      </head>
      <body>
        <p>Text</p>
      </body>
      </html>
    `;

    const parsed = htmlToText(html);
    expect(parsed.publishedDate).toBe("2026-01-15T09:00:00Z");
  });

  it("prioritizes OpenGraph tags over standard meta tags", () => {
    const html = `
      <html>
      <head>
        <meta name="description" content="Standard description (should be overridden)" />
        <meta property="og:description" content="Preferred OpenGraph description" />
        <meta name="application-name" content="Fallback App" />
        <meta property="og:site_name" content="Preferred OG Site" />
      </head>
      <body>
        <p>Content</p>
      </body>
      </html>
    `;

    const parsed = htmlToText(html);
    expect(parsed.description).toBe("Preferred OpenGraph description");
    expect(parsed.siteName).toBe("Preferred OG Site");
  });

  it("prioritizes name=author over article:author", () => {
    const html = `
      <html>
      <head>
        <meta property="article:author" content="Secondary Article Author" />
        <meta name="author" content="Primary Author" />
      </head>
      <body><p>Content</p></body>
      </html>
    `;

    const parsed = htmlToText(html);
    expect(parsed.author).toBe("Primary Author");
  });

  it("prioritizes article:published_time over date and pubdate", () => {
    const html = `
      <html>
      <head>
        <meta name="pubdate" content="2024-01-01" />
        <meta name="date" content="2025-01-01" />
        <meta property="article:published_time" content="2026-10-28T00:00:00Z" />
      </head>
      <body><p>Content</p></body>
      </html>
    `;

    const parsed = htmlToText(html);
    expect(parsed.publishedDate).toBe("2026-10-28T00:00:00Z");
  });

  it("gracefully falls back when meta tags are absent", () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Minimal Page</title>
      </head>
      <body>
        <p>Plain body with no metadata.</p>
      </body>
      </html>
    `;

    const parsed = htmlToText(html);

    expect(parsed.title).toBe("Minimal Page");
    expect(parsed.description).toBeUndefined();
    expect(parsed.author).toBeUndefined();
    expect(parsed.publishedDate).toBeUndefined();
    expect(parsed.siteName).toBeUndefined();
    expect(parsed.text).toBe("Plain body with no metadata.");
  });

  it("gracefully handles empty HTML string", () => {
    const parsed = htmlToText("");

    expect(parsed.title).toBeUndefined();
    expect(parsed.description).toBeUndefined();
    expect(parsed.author).toBeUndefined();
    expect(parsed.publishedDate).toBeUndefined();
    expect(parsed.siteName).toBeUndefined();
    expect(parsed.text).toBe("");
  });

  it("strips HTML tags and decodes entities in metadata", () => {
    const html = `
      <html>
      <head>
        <meta property="og:description" content="Exploring &lt;b&gt;AI models&lt;/b&gt; &amp; &quot;machine learning&quot; systems &mdash; <em>2026</em>." />
        <meta name="author" content="Jane &amp; John &lt;span&gt;Doe&lt;/span&gt;" />
        <meta property="og:site_name" content="Tech &amp; Science Daily" />
      </head>
      <body><p>Content</p></body>
      </html>
    `;

    const parsed = htmlToText(html);

    expect(parsed.description).toBe(
      'Exploring AI models & "machine learning" systems — 2026.',
    );
    expect(parsed.author).toBe("Jane & John Doe");
    expect(parsed.siteName).toBe("Tech & Science Daily");
  });

  it("handles reversed attribute order, single quotes, whitespace, and case-insensitivity", () => {
    const html = `
      <HTML>
      <HEAD>
        <META CONTENT='Reversed OG description' PROPERTY='OG:DESCRIPTION' />
        <META CONTENT="Wired Magazine" PROPERTY="OG:SITE_NAME" />
        <META CONTENT='Jane Smith' NAME='AUTHOR' />
        <META CONTENT="2026-08-20" NAME="DATE" />
      </HEAD>
      <BODY><P>Reversed attributes test</P></BODY>
      </HTML>
    `;

    const parsed = htmlToText(html);

    expect(parsed.description).toBe("Reversed OG description");
    expect(parsed.siteName).toBe("Wired Magazine");
    expect(parsed.author).toBe("Jane Smith");
    expect(parsed.publishedDate).toBe("2026-08-20");
  });

  it("skips empty meta tags and falls back to populated alternative", () => {
    const html = `
      <html>
      <head>
        <meta property="og:description" content="   " />
        <meta name="description" content="Valid fallback description" />
      </head>
      <body><p>Content</p></body>
      </html>
    `;

    const parsed = htmlToText(html);
    expect(parsed.description).toBe("Valid fallback description");
  });
});

describe("pipeline citation metadata enrichment", () => {
  const realFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("enriches sources with author, siteName, publishedDate, and description when candidate page is fetched", async () => {
    const searchHtml = `<h2 class="result__title"><a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=${encodeURIComponent("https://rich.example.com/article")}&amp;rut=1">Rich Article</a></h2>
<a class="result__snippet" href="#">Initial snippet.</a>`;

    const pageHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rich Article Title</title>
        <meta property="og:description" content="Detailed OpenGraph description." />
        <meta name="author" content="Dr. Sarah Connor" />
        <meta property="og:site_name" content="Cyberdyne Research" />
        <meta property="article:published_time" content="2026-08-15T10:00:00Z" />
      </head>
      <body>
        <p>This is the full text of the article with sufficient body content for page fetch.</p>
      </body>
      </html>
    `;

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.startsWith("https://html.duckduckgo.com/")) {
        return new Response(searchHtml, {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      }
      if (url.startsWith("https://rich.example.com/")) {
        return new Response(pageHtml, {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }
      throw new Error(`Unexpected url: ${url}`);
    }) as typeof fetch;

    const mockDeps: PipelineDeps = {
      resolveModel: async () => ({
        provider: "anthropic",
        model: "claude-test",
      }),
      generate: async (selection) => ({
        text: JSON.stringify({
          content: "Summary mentioning [1].",
          research: {
            title: "Test Report",
            executiveSummary: "Summary",
            keyFindings: [
              {
                point: "Finding 1",
                description: "Description",
                confidence: "high",
                citations: [1],
              },
            ],
            recommendation: "Rec",
          },
        }),
        usage: { inputTokens: 50, outputTokens: 25 },
        latencyMs: 100,
        model: selection.model,
        provider: selection.provider,
      }),
      lookup: async () => ["93.184.216.34"],
    };

    const res = await runPipeline(
      { prompt: "Research rich metadata", mode: "research" },
      mockDeps,
    );

    const report = res.artifact?.data as ResearchReport;
    expect(report).toBeDefined();
    expect(report.sources.length).toBeGreaterThan(0);
    const source = report.sources[0];
    expect(source.author).toBe("Dr. Sarah Connor");
    expect(source.siteName).toBe("Cyberdyne Research");
    expect(source.publishedDate).toBe("2026-08-15T10:00:00Z");
    expect(source.description).toBe("Detailed OpenGraph description.");
    expect(source.snippet).toBe("Initial snippet.");
  });

  it("uses page description as snippet when search result provides no snippet", async () => {
    const searchHtml = `<h2 class="result__title"><a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=${encodeURIComponent("https://nosnippet.example.com/doc")}&amp;rut=1">No Snippet Doc</a></h2>`;

    const pageHtml = `
      <html>
      <head>
        <meta property="og:description" content="Description should become snippet." />
      </head>
      <body>
        <p>Page text content here.</p>
      </body>
      </html>
    `;

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.startsWith("https://html.duckduckgo.com/")) {
        return new Response(searchHtml, {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      }
      if (url.startsWith("https://nosnippet.example.com/")) {
        return new Response(pageHtml, {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      }
      throw new Error(`Unexpected url: ${url}`);
    }) as typeof fetch;

    const mockDeps: PipelineDeps = {
      resolveModel: async () => ({
        provider: "anthropic",
        model: "claude-test",
      }),
      generate: async (selection) => ({
        text: JSON.stringify({
          content: "Result with [1].",
          research: {
            title: "Test",
            executiveSummary: "Exec",
            keyFindings: [
              {
                point: "Finding 1",
                description: "Description",
                confidence: "high",
                citations: [1],
              },
            ],
            recommendation: "Rec",
          },
        }),
        usage: { inputTokens: 50, outputTokens: 25 },
        latencyMs: 100,
        model: selection.model,
        provider: selection.provider,
      }),
      lookup: async () => ["93.184.216.34"],
    };

    const res = await runPipeline(
      { prompt: "Test no snippet", mode: "research" },
      mockDeps,
    );

    const report = res.artifact?.data as ResearchReport;
    const source = report.sources[0];
    expect(source.snippet).toBe("Description should become snippet.");
    expect(source.description).toBe("Description should become snippet.");
  });
});
