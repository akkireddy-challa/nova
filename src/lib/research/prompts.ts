import type {
  ConversationTurn,
  SourceCitation,
  StudioMode,
  ThinkingBudget,
} from "../types";

export interface PromptSource {
  citation: SourceCitation;
  /** Readable page text when the page was fetched. */
  pageText?: string;
}

export interface TextAttachment {
  name: string;
  content: string;
}

const JSON_SHAPES: Partial<Record<StudioMode, string>> = {
  research: `{
  "content": string,            // 2-4 paragraph answer in Markdown, citing sources inline as [1], [2]
  "research": {
    "title": string,
    "executiveSummary": string,
    "keyFindings": [            // 3-6 items
      { "point": string, "description": string,
        "confidence": "high" | "medium" | "low",
        "citations": number[]   // numbers of the sources that support this finding; [] if none
      }
    ],
    "contradictionsAndRisks": string[],   // disagreements between sources, caveats, gaps
    "recommendation": string
  }
}`,
  planner: `{
  "content": string,            // short Markdown overview of the plan
  "plan": {
    "goal": string,
    "timeframe": string,        // realistic overall duration, e.g. "6 weeks"
    "overview": string,
    "phases": [                 // 2-6 phases in execution order
      { "phaseName": string, "summary": string,
        "tasks": [ { "title": string, "description": string, "actionableOutput": string } ] }
    ],
    "keySuccessMetrics": string[]
  }
}`,
  matrix: `{
  "content": string,            // Markdown explanation of the trade-offs, citing sources as [n] where used
  "matrix": {
    "topic": string,
    "criteria": [ { "id": string, "name": string, "weight": number } ],   // weight 1-10, ids like "c1"
    "options": [                // at least 2 options
      { "name": string,
        "scores": { "<criterion id>": number },   // a 0-10 score for EVERY criterion id
        "pros": string[], "cons": string[] }
    ],
    "verdict": string
  }
}`,
  coder: `{
  "content": string,            // Markdown explanation of the solution
  "code": {
    "language": string,         // e.g. "typescript", "python", "html"
    "filename": string,
    "code": string,             // complete, runnable code
    "explanation": string,
    "previewHtml": string       // optional: self-contained HTML preview, only for UI/web code
  }
}`,
  debate: `{
  "content": string,            // balanced Markdown overview, citing sources as [n] where used
  "debate": {
    "topic": string,
    "consensusSummary": string,
    "perspectives": [           // exactly: one "Advocate", one "Critic", optionally one "Neutral Arbiter"
      { "agentName": string, "stance": "Advocate" | "Critic" | "Neutral Arbiter",
        "arguments": string[], "caveats": string[] }
    ],
    "synthesisVerdict": string
  }
}`,
  canvas: `{
  "content": string,            // Markdown analysis, citing sources as [n]
  "chart": null | {             // null when the sources contain no usable numbers
    "title": string,
    "type": "bar" | "line" | "area",
    "data": [ { "label": string, "value": number, "secondaryValue": number, "category": string, "deltaPercent": string } ],
                                // value is required; secondaryValue, category and deltaPercent are optional
    "insight": string,
    "takeaways": string[],
    "followUpQuestions": string[]
  }
}`,
};

const DEPTH: Record<ThinkingBudget, string> = {
  quick: "Be concise: short answers, only the essential points.",
  analytical: "Be thorough but focused.",
  deep: "Be comprehensive: examine edge cases, disagreements between sources, and limitations.",
};

export function buildSystemPrompt(
  mode: StudioMode,
  usesSources: boolean,
  sourceCount: number,
  budget: ThinkingBudget,
  hasHistory = false,
): string {
  const today = new Date().toISOString().slice(0, 10);
  const lines = [
    `You are Nova, an open-source research assistant. Today's date is ${today}.`,
    DEPTH[budget],
  ];
  if (hasHistory) {
    lines.push(
      'Earlier turns of this conversation come before the current request. Use them to understand follow-ups such as "tell me more about point 2".',
      "Citation numbers in earlier turns referred to earlier source lists; cite only the sources given with the current request.",
    );
  }

  if (usesSources) {
    if (sourceCount > 0) {
      lines.push(
        `You are given ${sourceCount} numbered web sources. Base every factual claim ONLY on these sources and the user's attachments or context.`,
        "Cite sources by their number. Never cite a number that is not in the list, and never invent sources, URLs, quotes, or statistics.",
        "If the sources do not answer the question, say so plainly instead of guessing.",
      );
    } else {
      lines.push(
        "Web search returned no usable sources for this request. Say clearly that no sources were found, answer cautiously from general knowledge, and do not cite anything.",
      );
    }
  } else {
    lines.push(
      "Work from the user request, attachments, and context. Do not invent facts, statistics, or references.",
    );
  }
  if (mode === "canvas") {
    lines.push(
      'Chart only numbers that appear in the sources or attachments. If there are none, set "chart" to null and explain why in "content".',
    );
  }

  const shape = JSON_SHAPES[mode];
  if (shape) {
    lines.push(
      "",
      "Respond with a single JSON object and nothing else (no code fences, no prose around it), matching this shape:",
      shape,
    );
  } else {
    lines.push("Respond in Markdown.");
  }
  return lines.join("\n");
}

export function buildUserPrompt(input: {
  prompt: string;
  context?: string;
  sources: PromptSource[];
  usesSources: boolean;
  attachments: TextAttachment[];
}): string {
  const parts: string[] = [`Request: ${input.prompt}`];

  if (input.context?.trim()) {
    parts.push(
      `User context (saved notes):\n${input.context.trim().slice(0, 4000)}`,
    );
  }
  for (const att of input.attachments) {
    parts.push(`Attached file "${att.name}":\n${att.content}`);
  }
  if (input.usesSources && input.sources.length > 0) {
    const blocks = input.sources.map((s, i) => {
      const lines = [
        `[${i + 1}] ${s.citation.title}`,
        `URL: ${s.citation.url}`,
      ];
      if (s.citation.publishedDate)
        lines.push(`Published: ${s.citation.publishedDate}`);
      if (s.citation.snippet) lines.push(`Snippet: ${s.citation.snippet}`);
      if (s.pageText) lines.push(`Page text:\n${s.pageText}`);
      return lines.join("\n");
    });
    parts.push(`Sources:\n\n${blocks.join("\n\n")}`);
  }
  return parts.join("\n\n");
}

export function buildRetryPrompt(validationError: string): string {
  return `Your previous response could not be used because it failed validation:\n${validationError}\n\nReturn only the corrected JSON object with the required shape.`;
}

export const QUERY_REWRITE_SYSTEM_PROMPT =
  "You turn a follow-up question into a standalone web search query. " +
  'Use the conversation only to resolve references such as "it", "that", or "point 2". ' +
  "Return only the search query on a single line, with no quotes, labels, or commentary.";

const REWRITE_TURN_CHARS = 1200;

/** The user message for the query-rewrite call: a short transcript plus the follow-up. */
export function buildQueryRewritePrompt(
  history: ConversationTurn[],
  followUp: string,
): string {
  const transcript = history
    .map(
      (turn) =>
        `${turn.role === "user" ? "User" : "Assistant"}: ${turn.content.slice(0, REWRITE_TURN_CHARS)}`,
    )
    .join("\n\n");
  return `Conversation so far:\n${transcript}\n\nFollow-up question: ${followUp}\n\nStandalone web search query:`;
}

export const QUERY_DECOMPOSITION_SYSTEM_PROMPT =
  "You are a research query strategist. Decompose the research topic into two distinct, highly targeted web search queries:\n" +
  "1. A primary query covering the core concepts and overview.\n" +
  "2. A secondary query targeting specific empirical data, benchmarks, metrics, comparisons, or counter-perspectives.\n" +
  "Output exactly two lines, one query per line, with no labels, numbers, or quotation marks.";

/** Prompt template for LLM query decomposition when needed. */
export function buildQueryDecompositionPrompt(topic: string): string {
  return `Research Topic: ${topic}\n\nFormulate 2 complementary search queries:`;
}

/**
 * Detects whether a research topic has multiple facets (comparisons, multiple sub-topics,
 * trade-offs, or metric/data focus) that benefit from multi-step search query decomposition.
 */
export function isMultiFacetedQuery(query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q.length < 5) return false;

  // Comparison markers
  if (
    /\b(vs\.?|versus|compare|comparison|difference between|trade-?offs?|pros and cons)\b/i.test(
      q,
    )
  ) {
    return true;
  }

  // Conjunctions with sufficient length (e.g. "X and Y", "X as well as Y")
  const words = q.split(/\s+/);
  if (
    words.length >= 4 &&
    /\b(and|as well as|along with|with focus on|including|in addition to)\b/i.test(
      q,
    )
  ) {
    return true;
  }

  // Analytical or metric focus
  if (
    /\b(benchmarks?|metrics|market size|market share|statistics|regulations?|challenges|risks|forecast|trends?)\b/i.test(
      q,
    )
  ) {
    return true;
  }

  return false;
}

/**
 * Algorithmic decomposition of a research query into a primary search query and a targeted
 * secondary query focusing on empirical evidence, benchmarks, metrics, or distinct sub-facets.
 * Avoids extra LLM call latency while guaranteeing robust search coverage.
 */
export function decomposeResearchQuery(rawQuery: string): string[] {
  const query = rawQuery.trim().replace(/\s+/g, " ");
  if (!query) return [];

  // Very short query (1-2 words): return the query plus a targeted analytical angle
  const words = query.split(" ");
  if (words.length <= 2) {
    return [query, `${query} overview benchmarks and analysis`];
  }

  // 1. "Compare A and B" pattern
  const compareMatch = query.match(/^compare\s+(.+?)\s+and\s+(.+)$/i);
  if (compareMatch) {
    const itemA = compareMatch[1].trim();
    const itemB = compareMatch[2].trim();
    return [
      query,
      `${itemA} vs ${itemB} comparison performance benchmarks trade-offs`,
    ];
  }

  // 2. Comparison queries: "A vs B" / "A versus B" / "A compared to B"
  const vsMatch = query.match(
    /^(?:compare\s+)?(.+?)\s+(?:vs\.?|versus|compared to)\s+(.+)$/i,
  );
  if (vsMatch) {
    const itemA = vsMatch[1].replace(/^compare\s+/i, "").trim();
    const itemB = vsMatch[2].trim();
    return [
      query,
      `${itemA} vs ${itemB} performance benchmarks metrics comparison`,
    ];
  }

  // 3. "Difference between A and B" pattern
  const diffMatch = query.match(/^difference between\s+(.+?)\s+and\s+(.+)$/i);
  if (diffMatch) {
    const itemA = diffMatch[1].trim();
    const itemB = diffMatch[2].trim();
    return [query, `${itemA} vs ${itemB} comparison trade-offs benchmarks`];
  }

  // 4. Conjunction queries: "Topic Part A and Part B"
  const conjunctionMatch = query.match(
    /^(.+?)\s+(?:and|as well as|along with|with focus on)\s+(.+)$/i,
  );
  if (conjunctionMatch) {
    const partA = conjunctionMatch[1].trim();
    const partB = conjunctionMatch[2].trim();
    if (partA.split(" ").length >= 2) {
      const subject = partA.split(" ").slice(0, 3).join(" ");
      const secondaryTarget = partB
        .toLowerCase()
        .includes(subject.toLowerCase())
        ? partB
        : `${subject} ${partB}`;
      return [query, `${secondaryTarget} data metrics analysis`];
    }
  }

  // 5. Market / Industry queries
  const lower = query.toLowerCase();
  if (lower.includes("market") || lower.includes("industry")) {
    return [query, `${query} market size revenue statistics forecast`];
  }

  // 6. Architecture / Systems / Engineering queries
  if (
    lower.includes("architecture") ||
    lower.includes("design") ||
    lower.includes("system")
  ) {
    return [query, `${query} implementation benchmarks trade-offs`];
  }

  // 7. General deep research: primary query + empirical metrics and benchmarks angle
  return [query, `${query} data metrics benchmarks statistics`];
}
