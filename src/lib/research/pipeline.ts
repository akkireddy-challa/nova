import type { z } from 'zod';
import { generate, resolveModel } from '../providers';
import type { LLMImage, LLMMessage, LLMResult, ModelSelection, ProviderId } from '../providers/types';
import type {
  AgentThought,
  Attachment,
  GenerationTelemetry,
  GenerativeArtifact,
  SourceCitation,
  StudioMode,
  ThinkingBudget,
} from '../types';
import {
  chartOutputSchema,
  codeOutputSchema,
  debateOutputSchema,
  matrixOutputSchema,
  planOutputSchema,
  researchOutputSchema,
  toChartArtifact,
  toCodeArtifact,
  toDebateArtifact,
  toDecisionMatrix,
  toGoalPlan,
  toResearchReport,
  validateOutput,
} from '../schemas/artifacts';
import { fetchPageText, HostLookup, isSafePublicUrl } from './fetch-page';
import { buildRetryPrompt, buildSystemPrompt, buildUserPrompt, PromptSource, TextAttachment } from './prompts';
import { SEARCH_PROVIDER_LABELS, searchWeb } from './search';

export type PipelineErrorCode = 'INVALID_OUTPUT' | 'BAD_REQUEST';

export class PipelineError extends Error {
  constructor(message: string, public readonly code: PipelineErrorCode) {
    super(message);
    this.name = 'PipelineError';
  }
}

export interface PipelineInput {
  prompt: string;
  mode: StudioMode;
  context?: string;
  /** "provider:model"; omitted = first available default. */
  model?: string;
  attachments?: Attachment[];
  thinkingBudget?: ThinkingBudget;
}

export interface PipelineDeps {
  /** DNS lookup used by the SSRF guard (injectable for tests). */
  lookup?: HostLookup;
  /** Model resolution and generation (injectable for tests). */
  resolveModel?: typeof resolveModel;
  generate?: typeof generate;
}

export interface PipelineResult {
  content: string;
  thoughts: AgentThought[];
  artifact?: GenerativeArtifact;
  /** Web sources given to the model, numbered [1..n] in order. */
  sources: SourceCitation[];
  provider: ProviderId;
  telemetry: GenerationTelemetry;
}

/** Modes that ground the answer in live web search. */
const SEARCH_MODES: ReadonlySet<StudioMode> = new Set<StudioMode>(['research', 'matrix', 'debate', 'canvas']);
/** Modes answered as plain Markdown without a structured artifact. */
const PLAIN_MODES: ReadonlySet<StudioMode> = new Set<StudioMode>(['intelligence', 'mcp']);

const BUDGETS: Record<ThinkingBudget, { results: number; pages: number; maxTokens: number }> = {
  quick: { results: 4, pages: 2, maxTokens: 2048 },
  analytical: { results: 6, pages: 4, maxTokens: 4096 },
  deep: { results: 8, pages: 5, maxTokens: 8192 },
};

const MAX_TEXT_ATTACHMENT_CHARS = 20000;

class ThoughtLog {
  readonly thoughts: AgentThought[] = [];

  add(agentName: string, action: string, status: AgentThought['status'] = 'success', details?: string): void {
    this.thoughts.push({
      id: `th-${this.thoughts.length + 1}`,
      timestamp: new Date().toISOString(),
      agentName,
      action,
      status,
      ...(details ? { details } : {}),
    });
  }
}

function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function describeFailure(err: unknown): string {
  if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) return 'timed out';
  const message = err instanceof Error ? err.message : String(err);
  return message.replace(/https?:\/\/\S+/g, '[url]').slice(0, 160);
}

function splitAttachments(attachments: Attachment[], log: ThoughtLog): { images: LLMImage[]; texts: TextAttachment[] } {
  const images: LLMImage[] = [];
  const texts: TextAttachment[] = [];
  const skipped: string[] = [];
  for (const att of attachments) {
    const content = typeof att.content === 'string' ? att.content : '';
    const dataUrl = content.match(/^data:([^;,]+)?(?:;[^,]*)?;base64,([\s\S]*)$/);
    if (att.type?.startsWith('image/')) {
      const data = dataUrl ? dataUrl[2] : content;
      if (data && /^[A-Za-z0-9+/=\s]+$/.test(data.slice(0, 200))) {
        images.push({ mimeType: dataUrl?.[1] || att.type, data: data.replace(/\s+/g, '') });
      } else {
        skipped.push(att.name);
      }
    } else if (dataUrl || !content.trim()) {
      // Binary documents arrive as data URLs; there is no extractor for them yet.
      skipped.push(att.name);
    } else {
      texts.push({ name: att.name, content: content.slice(0, MAX_TEXT_ATTACHMENT_CHARS) });
    }
  }
  if (images.length > 0 || texts.length > 0) {
    const parts = [];
    if (images.length > 0) parts.push(`${images.length} image${images.length === 1 ? '' : 's'}`);
    if (texts.length > 0) parts.push(`${texts.length} text file${texts.length === 1 ? '' : 's'}`);
    log.add('Attachments', `Included ${parts.join(' and ')} in the model request`);
  }
  if (skipped.length > 0) {
    log.add('Attachments', `Skipped ${skipped.length} attachment(s) in an unsupported format`, 'warn', skipped.join(', '));
  }
  return { images, texts };
}

async function gatherSources(query: string, budget: ThinkingBudget, log: ThoughtLog, deps: PipelineDeps): Promise<PromptSource[]> {
  const limits = BUDGETS[budget];
  const outcome = await searchWeb(query.slice(0, 400), limits.results);

  for (const failure of outcome.errors) {
    log.add('Web search', `${SEARCH_PROVIDER_LABELS[failure.provider]} search failed: ${failure.message}`, 'warn');
  }
  if (!outcome.provider) {
    log.add('Web search', 'No search provider returned results; continuing without sources', 'warn');
    return [];
  }
  const label = SEARCH_PROVIDER_LABELS[outcome.provider];
  if (outcome.results.length === 0) {
    log.add('Web search', `${label} returned no results; continuing without sources`, 'warn');
    return [];
  }
  log.add('Web search', `Found ${outcome.results.length} results via ${label} in ${seconds(outcome.latencyMs)}`);

  const sources: PromptSource[] = outcome.results.map((r, i) => ({
    citation: {
      id: `src-${i + 1}`,
      title: r.title,
      url: r.url,
      domain: domainOf(r.url),
      snippet: r.snippet,
      ...(typeof r.score === 'number' ? { relevanceScore: Math.round(Math.min(Math.max(r.score, 0), 1) * 100) } : {}),
      ...(r.publishedDate ? { publishedDate: r.publishedDate } : {}),
    },
  }));

  const candidates = sources.filter(s => isSafePublicUrl(s.citation.url)).slice(0, limits.pages);
  if (candidates.length === 0) return sources;

  const fetchStart = Date.now();
  const settled = await Promise.allSettled(candidates.map(s => fetchPageText(s.citation.url, { lookup: deps.lookup })));
  const failures: string[] = [];
  let fetched = 0;
  let chars = 0;
  settled.forEach((result, i) => {
    const source = candidates[i];
    if (result.status === 'fulfilled' && result.value.text.length > 0) {
      source.pageText = result.value.text;
      if (!source.citation.snippet) source.citation.snippet = result.value.text.slice(0, 280);
      fetched += 1;
      chars += result.value.text.length;
    } else {
      const reason = result.status === 'rejected' ? describeFailure(result.reason) : 'no readable text';
      failures.push(`${source.citation.domain}: ${reason}`);
    }
  });
  log.add(
    'Page fetch',
    `Fetched ${fetched} of ${candidates.length} pages (${Math.round(chars / 1000)}k chars) in ${seconds(Date.now() - fetchStart)}`,
    fetched === 0 ? 'warn' : 'success',
    failures.length > 0 ? `Failed: ${failures.join('; ')}` : undefined,
  );
  return sources;
}

interface LlmUsageTotals {
  calls: number;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  usageComplete: boolean;
}

interface RunContext {
  log: ThoughtLog;
  totals: LlmUsageTotals;
  generate: typeof generate;
}

async function callModel(
  selection: ModelSelection,
  request: { system: string; messages: LLMMessage[]; images: LLMImage[]; json: boolean; maxTokens: number },
  ctx: RunContext,
): Promise<LLMResult> {
  const { log, totals } = ctx;
  const result = await ctx.generate(selection, {
    system: request.system,
    messages: request.messages,
    images: request.images.length > 0 ? request.images : undefined,
    json: request.json,
    maxTokens: request.maxTokens,
    temperature: 0.2,
  });
  totals.calls += 1;
  totals.latencyMs += result.latencyMs;
  if (result.usage) {
    totals.inputTokens += result.usage.inputTokens;
    totals.outputTokens += result.usage.outputTokens;
  } else {
    totals.usageComplete = false;
  }
  const usage = result.usage ? `${result.usage.inputTokens} input / ${result.usage.outputTokens} output tokens` : undefined;
  log.add('LLM', `${result.provider}:${result.model} responded in ${seconds(result.latencyMs)}`, 'success', usage);
  return result;
}

/** Calls the model, validates its JSON against `schema`, and retries once with the validation error. */
async function generateValidated<T>(
  schema: z.ZodType<T>,
  selection: ModelSelection,
  base: { system: string; userPrompt: string; images: LLMImage[]; maxTokens: number },
  ctx: RunContext,
): Promise<T> {
  const { log } = ctx;
  const messages: LLMMessage[] = [{ role: 'user', content: base.userPrompt }];
  const first = await callModel(selection, { ...base, messages, json: true }, ctx);
  const firstCheck = validateOutput(schema, first.text);
  if (firstCheck.ok) return firstCheck.data;

  log.add('Validation', 'Model output failed schema validation; retrying once with the error', 'warn', firstCheck.error.slice(0, 500));
  const retryMessages: LLMMessage[] = [
    ...messages,
    { role: 'assistant', content: first.text.slice(0, 20000) },
    { role: 'user', content: buildRetryPrompt(firstCheck.error) },
  ];
  const second = await callModel(selection, { ...base, messages: retryMessages, json: true }, ctx);
  const secondCheck = validateOutput(schema, second.text);
  if (secondCheck.ok) {
    log.add('Validation', 'Retry produced valid output');
    return secondCheck.data;
  }
  log.add('Validation', 'Retry also failed schema validation', 'warn', secondCheck.error.slice(0, 500));
  throw new PipelineError('The model did not return valid structured output after one retry.', 'INVALID_OUTPUT');
}

function buildTelemetry(selection: ModelSelection, startedAt: number, totals: LlmUsageTotals, budget: ThinkingBudget): GenerationTelemetry {
  const hasUsage = totals.calls > 0 && totals.usageComplete;
  return {
    latencyMs: Date.now() - startedAt,
    model: `${selection.provider}:${selection.model}`,
    tokenCount: hasUsage ? totals.inputTokens + totals.outputTokens : 0,
    tokensPerSec: hasUsage && totals.latencyMs > 0 ? Math.round(totals.outputTokens / (totals.latencyMs / 1000)) : 0,
    thinkingBudget: budget,
  };
}

/**
 * The research pipeline: resolve model -> (search -> fetch pages) -> LLM -> validate -> artifact.
 * Throws NoProviderConfiguredError, ProviderError, or PipelineError; the route maps them to HTTP codes.
 */
export async function runPipeline(input: PipelineInput, deps: PipelineDeps = {}): Promise<PipelineResult> {
  const startedAt = Date.now();
  const budget: ThinkingBudget = input.thinkingBudget && input.thinkingBudget in BUDGETS ? input.thinkingBudget : 'analytical';
  const prompt = input.prompt.trim();
  if (!prompt) throw new PipelineError('Prompt is required.', 'BAD_REQUEST');

  const selection = await (deps.resolveModel ?? resolveModel)(input.model);
  const log = new ThoughtLog();
  const { images, texts } = splitAttachments(input.attachments ?? [], log);

  const usesSources = SEARCH_MODES.has(input.mode);
  const promptSources = usesSources ? await gatherSources(prompt, budget, log, deps) : [];
  const sources = promptSources.map(s => s.citation);

  const system = buildSystemPrompt(input.mode, usesSources, sources.length, budget);
  const userPrompt = buildUserPrompt({ prompt, context: input.context, sources: promptSources, usesSources, attachments: texts });
  const base = { system, userPrompt, images, maxTokens: BUDGETS[budget].maxTokens };
  const totals: LlmUsageTotals = { calls: 0, latencyMs: 0, inputTokens: 0, outputTokens: 0, usageComplete: true };
  const ctx: RunContext = { log, totals, generate: deps.generate ?? generate };

  const finish = (content: string, artifact?: GenerativeArtifact): PipelineResult => ({
    content,
    thoughts: log.thoughts,
    ...(artifact ? { artifact } : {}),
    sources,
    provider: selection.provider,
    telemetry: buildTelemetry(selection, startedAt, totals, budget),
  });

  if (PLAIN_MODES.has(input.mode)) {
    const result = await callModel(
      selection,
      { ...base, messages: [{ role: 'user', content: userPrompt }], json: false },
      ctx,
    );
    const content = result.text.trim();
    if (!content) throw new PipelineError('The model returned an empty response.', 'INVALID_OUTPUT');
    return finish(content);
  }

  switch (input.mode) {
    case 'research': {
      const output = await generateValidated(researchOutputSchema, selection, base, ctx);
      const { report, droppedCitations } = toResearchReport(output, sources, {
        sourcesCrawled: promptSources.filter(s => s.pageText).length,
        depthLevel: 1,
        synthesisTimeMs: totals.latencyMs,
      });
      if (droppedCitations.length > 0) {
        log.add(
          'Citations',
          `Dropped ${droppedCitations.length} citation(s) that matched no retrieved source`,
          'warn',
          droppedCitations.join(', '),
        );
      }
      return finish(output.content, { type: 'research', data: report });
    }
    case 'planner': {
      const output = await generateValidated(planOutputSchema, selection, base, ctx);
      return finish(output.content, { type: 'plan', data: toGoalPlan(output) });
    }
    case 'matrix': {
      const output = await generateValidated(matrixOutputSchema, selection, base, ctx);
      return finish(output.content, { type: 'matrix', data: toDecisionMatrix(output) });
    }
    case 'coder': {
      const output = await generateValidated(codeOutputSchema, selection, base, ctx);
      return finish(output.content, { type: 'code', data: toCodeArtifact(output) });
    }
    case 'debate': {
      const output = await generateValidated(debateOutputSchema, selection, base, ctx);
      return finish(output.content, { type: 'debate', data: toDebateArtifact(output) });
    }
    case 'canvas': {
      const output = await generateValidated(chartOutputSchema, selection, base, ctx);
      if (!output.chart) {
        log.add('Chart', 'Model found no numeric data to chart; no chart rendered', 'warn');
        return finish(output.content);
      }
      return finish(output.content, { type: 'chart', data: toChartArtifact(output.chart) });
    }
    default:
      throw new PipelineError(`Unsupported mode "${String(input.mode)}".`, 'BAD_REQUEST');
  }
}
