import {
  checkVectors,
  elapsedSince,
  errorFromException,
  errorFromResponse,
  readLines,
  redact,
  withTimeout,
} from './openai';
import { ProviderError, type EmbedResult, type LLMProvider, type LLMRequest, type LLMResult, type ProviderId } from './types';

const ID: ProviderId = 'ollama';
const LABEL = 'Ollama';
const PROBE_TIMEOUT_MS = 1_500;
const PROBE_CACHE_MS = 30_000;
/** Installed models whose names look like embedding models (nomic-embed-text, bge-m3, all-minilm, ...). */
const EMBEDDING_MODEL = /(embed|bge|minilm|gte-|e5-)/i;

interface OllamaTags {
  models?: Array<{ name?: string; model?: string }>;
}

interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[];
}

interface OllamaChatResponse {
  model?: string;
  message?: { content?: string };
  done?: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
  error?: string;
}

interface OllamaEmbedResponse {
  model?: string;
  embeddings?: unknown[];
  prompt_eval_count?: number;
  error?: string;
}

let probeCache: { base: string; at: number; models: string[] | null } | null = null;

export function resetOllamaCache(): void {
  probeCache = null;
}

function baseUrl(): string {
  return (process.env.OLLAMA_BASE_URL?.trim() || 'http://localhost:11434').replace(/\/+$/, '');
}

async function fetchTags(timeoutMs: number): Promise<string[]> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl()}/api/tags`, { signal: withTimeout(undefined, timeoutMs) });
  } catch (err) {
    throw errorFromException(ID, LABEL, err);
  }
  if (!res.ok) throw await errorFromResponse(ID, LABEL, res);
  try {
    const data = (await res.json()) as OllamaTags;
    return (data.models ?? [])
      .map(model => model.name ?? model.model)
      .filter((name): name is string => typeof name === 'string' && name.length > 0);
  } catch (err) {
    throw errorFromException(ID, LABEL, err);
  }
}

/** Installed models, or null when the server is unreachable. Cached briefly. */
async function probe(): Promise<string[] | null> {
  const base = baseUrl();
  if (probeCache && probeCache.base === base && Date.now() - probeCache.at < PROBE_CACHE_MS) {
    return probeCache.models;
  }
  let models: string[] | null;
  try {
    models = await fetchTags(PROBE_TIMEOUT_MS);
  } catch {
    models = null;
  }
  probeCache = { base, at: Date.now(), models };
  return models;
}

function buildMessages(request: LLMRequest): OllamaChatMessage[] {
  const out: OllamaChatMessage[] = [];
  if (request.system) out.push({ role: 'system', content: request.system });
  for (const message of request.messages) out.push({ role: message.role, content: message.content });
  if (request.images?.length) {
    let target = -1;
    for (let i = out.length - 1; i >= 0; i--) {
      if (out[i].role === 'user') {
        target = i;
        break;
      }
    }
    if (target === -1) {
      out.push({ role: 'user', content: '' });
      target = out.length - 1;
    }
    out[target].images = request.images.map(image => image.data);
  }
  return out;
}

function buildBody(request: LLMRequest, stream: boolean): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: request.model,
    messages: buildMessages(request),
    stream,
  };
  if (request.json) body.format = 'json';
  const options: Record<string, number> = {};
  if (request.temperature !== undefined) options.temperature = request.temperature;
  if (request.maxTokens !== undefined) options.num_predict = request.maxTokens;
  if (Object.keys(options).length > 0) body.options = options;
  return body;
}

async function post(request: LLMRequest, stream: boolean): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl()}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildBody(request, stream)),
      signal: withTimeout(request.signal),
    });
  } catch (err) {
    throw errorFromException(ID, LABEL, err, request.signal);
  }
  if (!res.ok) throw await errorFromResponse(ID, LABEL, res);
  return res;
}

export const ollamaProvider: LLMProvider = {
  id: ID,
  label: LABEL,

  /** Reachable and at least one model is installed (or OLLAMA_MODEL names one). */
  async isConfigured() {
    const models = await probe();
    if (models === null) return false;
    return models.length > 0 || Boolean(process.env.OLLAMA_MODEL?.trim());
  },

  async listModels() {
    const models = await fetchTags(5_000);
    probeCache = { base: baseUrl(), at: Date.now(), models };
    return models;
  },

  async defaultModel() {
    const configured = process.env.OLLAMA_MODEL?.trim();
    if (configured) return configured;
    const models = await probe();
    if (models === null) throw new ProviderError('Ollama is not reachable', ID, 503);
    if (models.length === 0) throw new ProviderError('No Ollama models are installed', ID, 404);
    return models[0];
  },

  async generate(request): Promise<LLMResult> {
    const start = performance.now();
    const res = await post(request, false);
    let data: OllamaChatResponse;
    try {
      data = (await res.json()) as OllamaChatResponse;
    } catch (err) {
      throw errorFromException(ID, LABEL, err, request.signal);
    }
    if (data.error) throw new ProviderError(`Ollama error: ${redact(data.error)}`, ID, 502);
    const text = data.message?.content;
    if (typeof text !== 'string') throw new ProviderError('Ollama returned no message content', ID, 502);
    const result: LLMResult = {
      text,
      latencyMs: elapsedSince(start),
      model: data.model || request.model,
      provider: ID,
    };
    if (typeof data.prompt_eval_count === 'number' && typeof data.eval_count === 'number') {
      result.usage = { inputTokens: data.prompt_eval_count, outputTokens: data.eval_count };
    }
    return result;
  },

  async *stream(request) {
    const res = await post(request, true);
    if (!res.body) throw new ProviderError('Ollama returned an empty stream', ID, 502);
    try {
      for await (const line of readLines(res.body)) {
        if (!line.trim()) continue;
        let chunk: OllamaChatResponse;
        try {
          chunk = JSON.parse(line) as OllamaChatResponse;
        } catch {
          continue;
        }
        if (chunk.error) throw new ProviderError(`Ollama error: ${redact(chunk.error)}`, ID, 502);
        const delta = chunk.message?.content;
        if (delta) yield delta;
        if (chunk.done) return;
      }
    } catch (err) {
      throw errorFromException(ID, LABEL, err, request.signal);
    }
  },

  /** OLLAMA_EMBEDDING_MODEL, else the first installed model that looks like an embedding model. */
  async defaultEmbeddingModel() {
    const models = await probe();
    if (models === null) return null;
    const configured = process.env.OLLAMA_EMBEDDING_MODEL?.trim();
    if (configured) return configured;
    return models.find(model => EMBEDDING_MODEL.test(model)) ?? null;
  },

  async embed({ model, texts, signal }): Promise<EmbedResult> {
    const embeddingModel = model?.trim() || (await ollamaProvider.defaultEmbeddingModel?.());
    if (!embeddingModel) {
      throw new ProviderError(
        'No Ollama embedding model is installed (set OLLAMA_EMBEDDING_MODEL or pull nomic-embed-text)',
        ID,
        404,
      );
    }
    let data: OllamaEmbedResponse;
    try {
      const res = await fetch(`${baseUrl()}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: embeddingModel, input: texts }),
        signal: withTimeout(signal),
      });
      if (!res.ok) throw await errorFromResponse(ID, LABEL, res);
      data = (await res.json()) as OllamaEmbedResponse;
    } catch (err) {
      throw errorFromException(ID, LABEL, err, signal);
    }
    if (data.error) throw new ProviderError(`Ollama error: ${redact(data.error)}`, ID, 502);
    const result: EmbedResult = {
      vectors: checkVectors(ID, LABEL, data.embeddings ?? [], texts.length),
      model: data.model || embeddingModel,
    };
    if (typeof data.prompt_eval_count === 'number') result.usage = { inputTokens: data.prompt_eval_count };
    return result;
  },
};
