import type { z } from "zod";
import { generate, resolveModel } from "../providers";
import type {
  LLMImage,
  LLMMessage,
  LLMResult,
  ModelSelection,
  ProviderId,
} from "../providers/types";
import type {
  AgentThought,
  Attachment,
  ConversationTurn,
  GenerationTelemetry,
  GenerativeArtifact,
  SourceCitation,
  StudioMode,
  ThinkingBudget,
} from "../types";
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
} from "../schemas/artifacts";
import { fetchPageText, HostLookup, isSafePublicUrl } from "./fetch-page";
import {
  buildQueryRewritePrompt,
  buildRetryPrompt,
  buildSystemPrompt,
  buildUserPrompt,
  PromptSource,
  QUERY_REWRITE_SYSTEM_PROMPT,
  TextAttachment,
} from "./prompts";
import { SEARCH_PROVIDER_LABELS, searchWeb } from "./search";

export type PipelineErrorCode = "INVALID_OUTPUT" | "BAD_REQUEST";

export class PipelineError extends Error {
  constructor(
    message: string,
    public readonly code: PipelineErrorCode,
  ) {
    super(message);
    this.name = "PipelineError";
  }
}

/** Thrown when the caller's AbortSignal fires; the route turns it into "no result" rather than an error. */
export class PipelineAbortedError extends Error {
  constructor() {
    super("The request was stopped.");
    this.name = "AbortError";
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
  /** Earlier turns of the conversation, oldest first. Capped to MAX_HISTORY_TURNS x MAX_HISTORY_CHARS. */
  history?: ConversationTurn[];
}

export interface PipelineDeps {
  /** DNS lookup used by the SSRF guard (injectable for tests). */
  lookup?: HostLookup;
  /** Model resolution and generation (injectable for tests). */
  resolveModel?: typeof resolveModel;
  generate?: typeof generate;
  /**
   * Called with every step the moment it is recorded. A step that changes later (a running LLM call
   * that finishes) is reported again with the same `id`; consumers should replace by id.
   */
  onThought?: (thought: AgentThought) => void;
  /** Cancels search, page fetches and model calls; the pipeline then throws PipelineAbortedError. */
  signal?: AbortSignal;
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
const SEARCH_MODES: ReadonlySet<StudioMode> = new Set<StudioMode>([
  "research",
  "matrix",
  "debate",
  "canvas",
]);
/** Modes answered as plain Markdown without a structured artifact. */
const PLAIN_MODES: ReadonlySet<StudioMode> = new Set<StudioMode>([
  "intelligence",
  "mcp",
]);

const BUDGETS: Record<
  ThinkingBudget,
  { results: number; pages: number; maxTokens: number }
> = {
  quick: { results: 4, pages: 2, maxTokens: 4096 },
  analytical: { results: 6, pages: 4, maxTokens: 8192 },
  deep: { results: 8, pages: 5, maxTokens: 16384 },
};

const MAX_TEXT_ATTACHMENT_CHARS = 20000;
export const MAX_HISTORY_TURNS = 10;
export const MAX_HISTORY_CHARS = 4000;
const REWRITE_MAX_TOKENS = 200;
const MAX_QUERY_CHARS = 400;

class ThoughtLog {
  readonly thoughts: AgentThought[] = [];

  constructor(private readonly onThought?: (thought: AgentThought) => void) {}

  /** Records a step and returns its id. */
  add(
    agentName: string,
    action: string,
    status: AgentThought["status"] = "success",
    details?: string,
  ): string {
    const thought: AgentThought = {
      id: `th-${this.thoughts.length + 1}`,
      timestamp: new Date().toISOString(),
      agentName,
      action,
      status,
      ...(details ? { details } : {}),
    };
    this.thoughts.push(thought);
    this.onThought?.({ ...thought });
    return thought.id;
  }

  /** Replaces a recorded step's action/status/details (e.g. a running LLM call that finished). */
  update(
    id: string,
    patch: { action: string; status: AgentThought["status"]; details?: string },
  ): void {
    const index = this.thoughts.findIndex((t) => t.id === id);
    if (index === -1) return;
    const { id: stepId, timestamp, agentName } = this.thoughts[index];
    const thought: AgentThought = {
      id: stepId,
      timestamp,
      agentName,
      action: patch.action,
      status: patch.status,
      ...(patch.details ? { details: patch.details } : {}),
    };
    this.thoughts[index] = thought;
    this.onThought?.({ ...thought });
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new PipelineAbortedError();
}

/**
 * Settles with `promise`, or rejects with PipelineAbortedError as soon as `signal` fires.
 * Used for work that does not accept a signal itself (web search).
 */
function raceAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) {
    promise.catch(() => undefined);
    return Promise.reject(new PipelineAbortedError());
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new PipelineAbortedError());
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (err) => {
        signal.removeEventListener("abort", onAbort);
        reject(err);
      },
    );
  });
}

/**
 * Keeps the last MAX_HISTORY_TURNS non-empty turns, caps each one, merges consecutive turns
 * from the same role, and makes the history start with a user turn and end with an assistant
 * turn so every provider accepts it before the current user message.
 */
export function normalizeHistory(
  history: ConversationTurn[] | undefined,
): LLMMessage[] {
  const merged: LLMMessage[] = [];
  for (const turn of history ?? []) {
    if (turn.role !== "user" && turn.role !== "assistant") continue;
    const content =
      typeof turn.content === "string"
        ? turn.content.trim().slice(0, MAX_HISTORY_CHARS)
        : "";
    if (!content) continue;
    const last = merged[merged.length - 1];
    if (last && last.role === turn.role) {
      last.content = `${last.content}\n\n${content}`.slice(
        0,
        MAX_HISTORY_CHARS,
      );
    } else {
      merged.push({ role: turn.role, content });
    }
  }
  // A trailing user turn never got an answer (failed or stopped); the current prompt replaces it.
  while (merged.length > 0 && merged[merged.length - 1].role === "user")
    merged.pop();
  const recent = merged.slice(-MAX_HISTORY_TURNS);
  while (recent.length > 0 && recent[0].role === "assistant") recent.shift();
  return recent;
}

function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function describeFailure(err: unknown): string {
  if (
    err instanceof Error &&
    (err.name === "TimeoutError" || err.name === "AbortError")
  )
    return "timed out";
  const message = err instanceof Error ? err.message : String(err);
  return message.replace(/https?:\/\/\S+/g, "[url]").slice(0, 160);
}

function splitAttachments(
  attachments: Attachment[],
  log: ThoughtLog,
): { images: LLMImage[]; texts: TextAttachment[] } {
  const images: LLMImage[] = [];
  const texts: TextAttachment[] = [];
  const skipped: string[] = [];
  for (const att of attachments) {
    const content = typeof att.content === "string" ? att.content : "";
    const dataUrl = content.match(
      /^data:([^;,]+)?(?:;[^,]*)?;base64,([\s\S]*)$/,
    );
    if (att.type?.startsWith("image/")) {
      const data = dataUrl ? dataUrl[2] : content;
      if (data && /^[A-Za-z0-9+/=\s]+$/.test(data.slice(0, 200))) {
        images.push({
          mimeType: dataUrl?.[1] || att.type,
          data: data.replace(/\s+/g, ""),
        });
      } else {
        skipped.push(att.name);
      }
    } else if (dataUrl || !content.trim()) {
      // Binary documents arrive as data URLs; there is no extractor for them yet.
      skipped.push(att.name);
    } else {
      texts.push({
        name: att.name,
        content: content.slice(0, MAX_TEXT_ATTACHMENT_CHARS),
      });
    }
  }
  if (images.length > 0 || texts.length > 0) {
    const parts = [];
    if (images.length > 0)
      parts.push(`${images.length} image${images.length === 1 ? "" : "s"}`);
    if (texts.length > 0)
      parts.push(`${texts.length} text file${texts.length === 1 ? "" : "s"}`);
    log.add(
      "Attachments",
      `Included ${parts.join(" and ")} in the model request`,
    );
  }
  if (skipped.length > 0) {
    log.add(
      "Attachments",
      `Skipped ${skipped.length} attachment(s) in an unsupported format`,
      "warn",
      skipped.join(", "),
    );
  }
  return { images, texts };
}

async function gatherSources(
  query: string,
  budget: ThinkingBudget,
  log: ThoughtLog,
  deps: PipelineDeps,
): Promise<PromptSource[]> {
  const limits = BUDGETS[budget];
  const { signal } = deps;
  throwIfAborted(signal);
  // searchWeb has no signal parameter yet, so cancellation stops waiting for it rather than the request itself.
  const outcome = await raceAbort(
    searchWeb(query.slice(0, MAX_QUERY_CHARS), limits.results),
    signal,
  );

  for (const failure of outcome.errors) {
    log.add(
      "Web search",
      `${SEARCH_PROVIDER_LABELS[failure.provider]} search failed: ${failure.message}`,
      "warn",
    );
  }
  if (!outcome.provider) {
    log.add(
      "Web search",
      "No search provider returned results; continuing without sources",
      "warn",
    );
    return [];
  }
  const label = SEARCH_PROVIDER_LABELS[outcome.provider];
  if (outcome.results.length === 0) {
    log.add(
      "Web search",
      `${label} returned no results; continuing without sources`,
      "warn",
    );
    return [];
  }
  log.add(
    "Web search",
    `Found ${outcome.results.length} results via ${label} in ${seconds(outcome.latencyMs)}`,
  );

  const sources: PromptSource[] = outcome.results.map((r, i) => ({
    citation: {
      id: `src-${i + 1}`,
      title: r.title,
      url: r.url,
      domain: domainOf(r.url),
      snippet: r.snippet,
      ...(typeof r.score === "number"
        ? {
            relevanceScore: Math.round(Math.min(Math.max(r.score, 0), 1) * 100),
          }
        : {}),
      ...(r.publishedDate ? { publishedDate: r.publishedDate } : {}),
    },
  }));

  const candidates = sources
    .filter((s) => isSafePublicUrl(s.citation.url))
    .slice(0, limits.pages);
  if (candidates.length === 0) return sources;

  const fetchStart = Date.now();
  const settled = await Promise.allSettled(
    candidates.map((s) =>
      fetchPageText(s.citation.url, { lookup: deps.lookup, signal }),
    ),
  );
  throwIfAborted(signal);
  const failures: string[] = [];
  let fetched = 0;
  let chars = 0;
  settled.forEach((result, i) => {
    const source = candidates[i];
    if (result.status === "fulfilled" && result.value.text.length > 0) {
      source.pageText = result.value.text;
      if (!source.citation.snippet)
        source.citation.snippet = result.value.text.slice(0, 280);
      fetched += 1;
      chars += result.value.text.length;
    } else {
      const reason =
        result.status === "rejected"
          ? describeFailure(result.reason)
          : "no readable text";
      failures.push(`${source.citation.domain}: ${reason}`);
    }
  });
  log.add(
    "Page fetch",
    `Fetched ${fetched} of ${candidates.length} pages (${Math.round(chars / 1000)}k chars) in ${seconds(Date.now() - fetchStart)}`,
    fetched === 0 ? "warn" : "success",
    failures.length > 0 ? `Failed: ${failures.join("; ")}` : undefined,
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
  signal?: AbortSignal;
}

/** How a model call appears in the step list: a running step that is updated when the call returns. */
interface CallLabels {
  agentName: string;
  running: string;
  failed: string;
  done: (result: LLMResult) => {
    action: string;
    status: AgentThought["status"];
  };
}

function answerLabels(selection: ModelSelection): CallLabels {
  const id = `${selection.provider}:${selection.model}`;
  return {
    agentName: "LLM",
    running: `Generating with ${id}…`,
    failed: `${id} failed`,
    done: (result) => ({
      action: `${result.provider}:${result.model} responded in ${seconds(result.latencyMs)}`,
      status: "success",
    }),
  };
}

async function callModel(
  selection: ModelSelection,
  request: {
    system: string;
    messages: LLMMessage[];
    images: LLMImage[];
    json: boolean;
    maxTokens: number;
    temperature?: number;
  },
  ctx: RunContext,
  labels: CallLabels = answerLabels(selection),
): Promise<LLMResult> {
  const { log, totals, signal } = ctx;
  throwIfAborted(signal);
  const stepId = log.add(labels.agentName, labels.running, "running");
  let result: LLMResult;
  try {
    result = await ctx.generate(selection, {
      system: request.system,
      messages: request.messages,
      images: request.images.length > 0 ? request.images : undefined,
      json: request.json,
      maxTokens: request.maxTokens,
      temperature: request.temperature ?? 0.2,
      ...(signal ? { signal } : {}),
    });
  } catch (err) {
    if (signal?.aborted) {
      log.update(stepId, {
        action: `${labels.failed}: stopped`,
        status: "warn",
      });
      throw new PipelineAbortedError();
    }
    log.update(stepId, {
      action: `${labels.failed}: ${describeFailure(err)}`,
      status: "warn",
    });
    throw err;
  }
  totals.calls += 1;
  totals.latencyMs += result.latencyMs;
  if (result.usage) {
    totals.inputTokens += result.usage.inputTokens;
    totals.outputTokens += result.usage.outputTokens;
  } else {
    totals.usageComplete = false;
  }
  const usage = result.usage
    ? `${result.usage.inputTokens} input / ${result.usage.outputTokens} output tokens`
    : undefined;
  log.update(stepId, { ...labels.done(result), details: usage });
  throwIfAborted(signal);
  return result;
}

/** Cleans a model-written search query: first non-empty line, no quotes or "Query:" label, capped. */
function cleanQuery(text: string): string {
  const line =
    text
      .split("\n")
      .map((l) => l.trim())
      .find(Boolean) ?? "";
  return line
    .replace(/^(?:standalone\s+)?(?:web\s+)?(?:search\s+)?query\s*:\s*/i, "")
    .replace(/^["'`“”]+|["'`“”]+$/g, "")
    .trim()
    .slice(0, MAX_QUERY_CHARS);
}

/**
 * Turns a follow-up ("tell me more about point 2") into a standalone web search query with one
 * short model call. Falls back to the raw prompt, with a warn step, when the call fails.
 */
async function rewriteSearchQuery(
  selection: ModelSelection,
  prompt: string,
  history: LLMMessage[],
  ctx: RunContext,
): Promise<string> {
  let query = "";
  const labels: CallLabels = {
    agentName: "Query",
    running: `Rewriting the follow-up as a standalone search query with ${selection.provider}:${selection.model}…`,
    failed: "Query rewrite failed",
    done: (result) => {
      query = cleanQuery(result.text);
      return query
        ? { action: `Rewrote follow-up as "${query}"`, status: "success" }
        : {
            action:
              "Query rewrite returned nothing; searching with the original prompt",
            status: "warn",
          };
    },
  };
  try {
    await callModel(
      selection,
      {
        system: QUERY_REWRITE_SYSTEM_PROMPT,
        messages: [
          { role: "user", content: buildQueryRewritePrompt(history, prompt) },
        ],
        images: [],
        json: false,
        maxTokens: REWRITE_MAX_TOKENS,
        temperature: 0,
      },
      ctx,
      labels,
    );
  } catch (err) {
    if (err instanceof PipelineAbortedError) throw err;
    ctx.log.add("Query", "Searching with the original prompt instead", "warn");
    return prompt;
  }
  return query || prompt;
}

/** Calls the model, validates its JSON against `schema`, and retries once with the validation error. */
async function generateValidated<T>(
  schema: z.ZodType<T>,
  selection: ModelSelection,
  base: {
    system: string;
    userPrompt: string;
    history: LLMMessage[];
    images: LLMImage[];
    maxTokens: number;
  },
  ctx: RunContext,
): Promise<T> {
  const { log } = ctx;
  const messages: LLMMessage[] = [
    ...base.history,
    { role: "user", content: base.userPrompt },
  ];
  const first = await callModel(
    selection,
    { ...base, messages, json: true },
    ctx,
  );
  const firstCheck = validateOutput(schema, first.text);
  if (firstCheck.ok) return firstCheck.data;

  log.add(
    "Validation",
    "Model output failed schema validation; retrying once with the error",
    "warn",
    firstCheck.error.slice(0, 500),
  );
  const retryMessages: LLMMessage[] = [
    ...messages,
    { role: "assistant", content: first.text.slice(0, 20000) },
    { role: "user", content: buildRetryPrompt(firstCheck.error) },
  ];
  const second = await callModel(
    selection,
    { ...base, messages: retryMessages, json: true },
    ctx,
  );
  const secondCheck = validateOutput(schema, second.text);
  if (secondCheck.ok) {
    log.add("Validation", "Retry produced valid output");
    return secondCheck.data;
  }
  log.add(
    "Validation",
    "Retry also failed schema validation",
    "warn",
    secondCheck.error.slice(0, 500),
  );
  throw new PipelineError(
    "The model did not return valid structured output after one retry.",
    "INVALID_OUTPUT",
  );
}

function buildTelemetry(
  selection: ModelSelection,
  startedAt: number,
  totals: LlmUsageTotals,
  budget: ThinkingBudget,
): GenerationTelemetry {
  const hasUsage = totals.calls > 0 && totals.usageComplete;
  return {
    latencyMs: Date.now() - startedAt,
    model: `${selection.provider}:${selection.model}`,
    tokenCount: hasUsage ? totals.inputTokens + totals.outputTokens : 0,
    tokensPerSec:
      hasUsage && totals.latencyMs > 0
        ? Math.round(totals.outputTokens / (totals.latencyMs / 1000))
        : 0,
    thinkingBudget: budget,
  };
}

/**
 * The research pipeline: resolve model -> (search -> fetch pages) -> LLM -> validate -> artifact.
 * Throws NoProviderConfiguredError, ProviderError, or PipelineError; the route maps them to HTTP codes.
 */
export async function runPipeline(
  input: PipelineInput,
  deps: PipelineDeps = {},
): Promise<PipelineResult> {
  const startedAt = Date.now();
  const budget: ThinkingBudget =
    input.thinkingBudget && input.thinkingBudget in BUDGETS
      ? input.thinkingBudget
      : "analytical";
  const prompt = input.prompt.trim();
  if (!prompt) throw new PipelineError("Prompt is required.", "BAD_REQUEST");

  const { signal } = deps;
  throwIfAborted(signal);
  const selection = await (deps.resolveModel ?? resolveModel)(input.model);
  throwIfAborted(signal);
  const log = new ThoughtLog(deps.onThought);
  const totals: LlmUsageTotals = {
    calls: 0,
    latencyMs: 0,
    inputTokens: 0,
    outputTokens: 0,
    usageComplete: true,
  };
  const ctx: RunContext = {
    log,
    totals,
    generate: deps.generate ?? generate,
    signal,
  };
  const { images, texts } = splitAttachments(input.attachments ?? [], log);

  const history = normalizeHistory(input.history);
  if (history.length > 0) {
    log.add(
      "Conversation",
      `Included ${history.length} earlier message${history.length === 1 ? "" : "s"} as context`,
    );
  }

  const usesSources = SEARCH_MODES.has(input.mode);
  let promptSources: PromptSource[] = [];
  if (usesSources) {
    const query =
      history.length > 0
        ? await rewriteSearchQuery(selection, prompt, history, ctx)
        : prompt;
    promptSources = await gatherSources(query, budget, log, deps);
  }
  const sources = promptSources.map((s) => s.citation);

  const system = buildSystemPrompt(
    input.mode,
    usesSources,
    sources.length,
    budget,
    history.length > 0,
  );
  const userPrompt = buildUserPrompt({
    prompt,
    context: input.context,
    sources: promptSources,
    usesSources,
    attachments: texts,
  });
  const base = {
    system,
    userPrompt,
    history,
    images,
    maxTokens: BUDGETS[budget].maxTokens,
  };

  const finish = (
    content: string,
    artifact?: GenerativeArtifact,
  ): PipelineResult => ({
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
      {
        ...base,
        messages: [...history, { role: "user", content: userPrompt }],
        json: false,
      },
      ctx,
    );
    const content = result.text.trim();
    if (!content)
      throw new PipelineError(
        "The model returned an empty response.",
        "INVALID_OUTPUT",
      );
    return finish(content);
  }

  switch (input.mode) {
    case "research": {
      const output = await generateValidated(
        researchOutputSchema,
        selection,
        base,
        ctx,
      );
      const { report, droppedCitations } = toResearchReport(output, sources, {
        sourcesCrawled: promptSources.filter((s) => s.pageText).length,
        depthLevel: 1,
        synthesisTimeMs: totals.latencyMs,
      });
      if (droppedCitations.length > 0) {
        log.add(
          "Citations",
          `Dropped ${droppedCitations.length} citation(s) that matched no retrieved source`,
          "warn",
          droppedCitations.join(", "),
        );
      }
      return finish(output.content, { type: "research", data: report });
    }
    case "planner": {
      const output = await generateValidated(
        planOutputSchema,
        selection,
        base,
        ctx,
      );
      return finish(output.content, { type: "plan", data: toGoalPlan(output) });
    }
    case "matrix": {
      const output = await generateValidated(
        matrixOutputSchema,
        selection,
        base,
        ctx,
      );
      return finish(output.content, {
        type: "matrix",
        data: toDecisionMatrix(output),
      });
    }
    case "coder": {
      const output = await generateValidated(
        codeOutputSchema,
        selection,
        base,
        ctx,
      );
      return finish(output.content, {
        type: "code",
        data: toCodeArtifact(output),
      });
    }
    case "debate": {
      const output = await generateValidated(
        debateOutputSchema,
        selection,
        base,
        ctx,
      );
      return finish(output.content, {
        type: "debate",
        data: toDebateArtifact(output),
      });
    }
    case "canvas": {
      const output = await generateValidated(
        chartOutputSchema,
        selection,
        base,
        ctx,
      );
      if (!output.chart) {
        log.add(
          "Chart",
          "Model found no numeric data to chart; no chart rendered",
          "warn",
        );
        return finish(output.content);
      }
      return finish(output.content, {
        type: "chart",
        data: toChartArtifact(output.chart),
      });
    }
    default:
      throw new PipelineError(
        `Unsupported mode "${String(input.mode)}".`,
        "BAD_REQUEST",
      );
  }
}
