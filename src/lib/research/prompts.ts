import type { SourceCitation, StudioMode, ThinkingBudget } from '../types';

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
        "confidence": "high" | "medium" | "emerging",
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
  quick: 'Be concise: short answers, only the essential points.',
  analytical: 'Be thorough but focused.',
  deep: 'Be comprehensive: examine edge cases, disagreements between sources, and limitations.',
};

export function buildSystemPrompt(mode: StudioMode, usesSources: boolean, sourceCount: number, budget: ThinkingBudget): string {
  const today = new Date().toISOString().slice(0, 10);
  const lines = [
    `You are Nova, an open-source research assistant. Today's date is ${today}.`,
    DEPTH[budget],
  ];

  if (usesSources) {
    if (sourceCount > 0) {
      lines.push(
        `You are given ${sourceCount} numbered web sources. Base every factual claim ONLY on these sources and the user's attachments or context.`,
        'Cite sources by their number. Never cite a number that is not in the list, and never invent sources, URLs, quotes, or statistics.',
        'If the sources do not answer the question, say so plainly instead of guessing.',
      );
    } else {
      lines.push(
        'Web search returned no usable sources for this request. Say clearly that no sources were found, answer cautiously from general knowledge, and do not cite anything.',
      );
    }
  } else {
    lines.push('Work from the user request, attachments, and context. Do not invent facts, statistics, or references.');
  }
  if (mode === 'canvas') {
    lines.push('Chart only numbers that appear in the sources or attachments. If there are none, set "chart" to null and explain why in "content".');
  }

  const shape = JSON_SHAPES[mode];
  if (shape) {
    lines.push('', 'Respond with a single JSON object and nothing else (no code fences, no prose around it), matching this shape:', shape);
  } else {
    lines.push('Respond in Markdown.');
  }
  return lines.join('\n');
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
    parts.push(`User context (saved notes):\n${input.context.trim().slice(0, 4000)}`);
  }
  for (const att of input.attachments) {
    parts.push(`Attached file "${att.name}":\n${att.content}`);
  }
  if (input.usesSources && input.sources.length > 0) {
    const blocks = input.sources.map((s, i) => {
      const lines = [`[${i + 1}] ${s.citation.title}`, `URL: ${s.citation.url}`];
      if (s.citation.publishedDate) lines.push(`Published: ${s.citation.publishedDate}`);
      if (s.citation.snippet) lines.push(`Snippet: ${s.citation.snippet}`);
      if (s.pageText) lines.push(`Page text:\n${s.pageText}`);
      return lines.join('\n');
    });
    parts.push(`Sources:\n\n${blocks.join('\n\n')}`);
  }
  return parts.join('\n\n');
}

export function buildRetryPrompt(validationError: string): string {
  return `Your previous response could not be used because it failed validation:\n${validationError}\n\nReturn only the corrected JSON object with the required shape.`;
}
