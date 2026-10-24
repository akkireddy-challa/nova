# Shared System Contracts

These contracts form the single source of truth for all Nova subagents. All agents must code to these interfaces so work proceeds independently without file contention.

---

## 1. LLM Providers (`src/lib/providers/types.ts`)

```typescript
export interface LLMUsage {
  inputTokens: number;
  outputTokens: number;
}

export type ProviderId = "gemini" | "anthropic" | "openai" | "ollama";

export interface LLMResult {
  text: string;
  usage?: LLMUsage;
  latencyMs: number;
  model: string;
  provider: ProviderId;
}

export interface LLMProvider {
  id: ProviderId;
  isConfigured(): Promise<boolean>;
  listModels(): Promise<string[]>;
  generate(input: {
    system?: string;
    messages: { role: "user" | "assistant"; content: string }[];
    json?: boolean;
    signal?: AbortSignal;
  }): Promise<LLMResult>;
  stream?(input: {
    system?: string;
    messages: { role: "user" | "assistant"; content: string }[];
    json?: boolean;
    signal?: AbortSignal;
  }): AsyncIterable<string>;
}
```

---

## 2. Search Provider (`src/lib/search/types.ts`)

```typescript
export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
  content?: string;
}

export interface SearchProvider {
  id: string;
  search(q: string, n: number): Promise<SearchResult[]>;
}
```

---

## 3. Schemas for Visual Artifacts (`src/lib/schemas/artifacts.ts`)

Validated with Zod:

```typescript
import { z } from "zod";

export const CitationSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  title: z.string(),
  quote: z.string(),
});

export const ResearchSectionSchema = z.object({
  heading: z.string(),
  body: z.string(),
  citationIds: z.array(z.string()),
});

export const ResearchReportSchema = z.object({
  summary: z.string(),
  sections: z.array(ResearchSectionSchema),
  citations: z.array(CitationSchema),
});

export const CriterionSchema = z.object({
  name: z.string(),
  weight: z.number().min(0).max(1),
});

export const ComparisonMatrixSchema = z.object({
  options: z.array(z.string()),
  criteria: z.array(CriterionSchema),
  scores: z.array(z.array(z.number())),
  rationale: z.string(),
});

export const PlanStepSchema = z.object({
  title: z.string(),
  detail: z.string(),
  dependsOn: z.array(z.string()),
});

export const PlanSchema = z.object({
  goal: z.string(),
  steps: z.array(PlanStepSchema),
});

export const ChartSeriesSchema = z.object({
  label: z.string(),
  values: z.array(z.number()),
});

export const ChartSchema = z.object({
  title: z.string(),
  type: z.enum(["bar", "line", "pie"]),
  series: z.array(ChartSeriesSchema),
  sourceCitationIds: z.array(z.string()),
});
```

---

## 4. Agent Step Trace — ONLY Real Events (`src/lib/types.ts`)

```typescript
export interface TraceStep {
  at: string;
  kind: "search" | "fetch" | "llm" | "parse" | "error";
  detail: string;
  ms: number;
}
```
