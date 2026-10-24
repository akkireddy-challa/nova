import {
  batches,
  checkVectors,
  elapsedSince,
  errorFromException,
  errorFromResponse,
  withTimeout,
} from './openai';
import { ProviderError, type EmbedResult, type LLMProvider, type LLMRequest, type LLMResult, type ProviderId } from './types';

const ID: ProviderId = 'gemini';
const LABEL = 'Gemini';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const FALLBACK_MODEL = 'gemini-2.5-flash';
const LIST_CACHE_MS = 5 * 60_000;
const FALLBACK_EMBEDDING_MODEL = 'gemini-embedding-001';
// Models that accept generateContent but are not text chat models (speech, images, music, robotics...).
const NON_CHAT_MODEL = /(tts|image|banana|lyria|transcribe|robotics|computer-use|embedding|aqa|live|audio)/i;

/** batchEmbedContents accepts at most 100 requests per call. */
const EMBED_BATCH = 100;

type GeminiPart =
  | { text: string; thought?: boolean }
  | { inlineData: { mimeType: string; data: string } };

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string; thought?: boolean }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
  };
  modelVersion?: string;
}

interface GeminiEmbedResponse {
  embedding?: { values?: unknown };
  embeddings?: Array<{ values?: unknown }>;
}

interface GeminiModelList {
  models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
  nextPageToken?: string;
}

let listCache: { key: string; at: number; models: string[] } | null = null;

export function resetGeminiCache(): void {
  listCache = null;
}

function apiKey(): string | undefined {
  return process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || undefined;
}

function requireKey(): string {
  const key = apiKey();
  if (!key) throw new ProviderError('Gemini is not configured (GEMINI_API_KEY missing)', ID, 503);
  return key;
}

function stripPrefix(model: string): string {
  return model.startsWith('models/') ? model.slice('models/'.length) : model;
}

/** Pick a sensible general-purpose "flash" model from a list. */
export function pickFlashModel(models: string[]): string | undefined {
  const flash = models.filter(model => /flash/i.test(model));
  const stable = flash.find(model => !/(lite|image|tts|live|preview|exp|thinking|audio|\d{3}$)/i.test(model));
  return stable ?? flash.find(model => !/(image|tts|live|audio)/i.test(model));
}

function buildContents(request: LLMRequest): GeminiContent[] {
  const contents: GeminiContent[] = request.messages.map(message => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.content }],
  }));
  if (request.images?.length) {
    let target = -1;
    for (let i = contents.length - 1; i >= 0; i--) {
      if (contents[i].role === 'user') {
        target = i;
        break;
      }
    }
    if (target === -1) {
      contents.push({ role: 'user', parts: [] });
      target = contents.length - 1;
    }
    for (const image of request.images) {
      contents[target].parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });
    }
  }
  return contents;
}

export const geminiProvider: LLMProvider = {
  id: ID,
  label: LABEL,

  async isConfigured() {
    return Boolean(apiKey());
  },

  async listModels() {
    const key = requireKey();
    if (listCache && listCache.key === key && Date.now() - listCache.at < LIST_CACHE_MS) {
      return listCache.models;
    }
    const models: string[] = [];
    let pageToken: string | undefined;
    try {
      for (let page = 0; page < 5; page++) {
        const params = new URLSearchParams({ pageSize: '1000' });
        if (pageToken) params.set('pageToken', pageToken);
        const res = await fetch(`${BASE_URL}/models?${params.toString()}`, {
          headers: { 'x-goog-api-key': key },
          signal: withTimeout(undefined, 10_000),
        });
        if (!res.ok) throw await errorFromResponse(ID, LABEL, res, [key]);
        const data = (await res.json()) as GeminiModelList;
        for (const model of data.models ?? []) {
          if (
            model.name &&
            model.supportedGenerationMethods?.includes('generateContent') &&
            !NON_CHAT_MODEL.test(model.name)
          ) {
            models.push(stripPrefix(model.name));
          }
        }
        pageToken = data.nextPageToken;
        if (!pageToken) break;
      }
    } catch (err) {
      throw errorFromException(ID, LABEL, err);
    }
    listCache = { key, at: Date.now(), models };
    return models;
  },

  async defaultModel() {
    const configured = process.env.GEMINI_MODEL?.trim();
    if (configured) return stripPrefix(configured);
    try {
      const flash = pickFlashModel(await geminiProvider.listModels());
      if (flash) return flash;
    } catch {
      // Listing is optional; fall back to a known model.
    }
    return FALLBACK_MODEL;
  },

  async generate(request): Promise<LLMResult> {
    const key = requireKey();
    const model = stripPrefix(request.model);
    const generationConfig: Record<string, unknown> = {};
    if (request.temperature !== undefined) generationConfig.temperature = request.temperature;
    if (request.maxTokens !== undefined) generationConfig.maxOutputTokens = request.maxTokens;
    if (request.json) generationConfig.responseMimeType = 'application/json';

    const body: Record<string, unknown> = { contents: buildContents(request) };
    if (request.system) body.systemInstruction = { parts: [{ text: request.system }] };
    if (Object.keys(generationConfig).length > 0) body.generationConfig = generationConfig;

    const start = performance.now();
    let data: GeminiResponse;
    try {
      const res = await fetch(`${BASE_URL}/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: withTimeout(request.signal),
      });
      if (!res.ok) throw await errorFromResponse(ID, LABEL, res, [key]);
      data = (await res.json()) as GeminiResponse;
    } catch (err) {
      throw errorFromException(ID, LABEL, err, request.signal);
    }

    const candidate = data.candidates?.[0];
    const text = (candidate?.content?.parts ?? [])
      .filter(part => typeof part.text === 'string' && !part.thought)
      .map(part => part.text)
      .join('');
    if (!text) {
      const reason = data.promptFeedback?.blockReason || candidate?.finishReason;
      throw new ProviderError(`Gemini returned no text${reason ? ` (${reason})` : ''}`, ID, 502);
    }

    const result: LLMResult = {
      text,
      latencyMs: elapsedSince(start),
      model: data.modelVersion || model,
      provider: ID,
    };
    const usage = data.usageMetadata;
    if (usage && typeof usage.promptTokenCount === 'number') {
      result.usage = {
        inputTokens: usage.promptTokenCount,
        outputTokens: (usage.candidatesTokenCount ?? 0) + (usage.thoughtsTokenCount ?? 0),
      };
    }
    return result;
  },

  async defaultEmbeddingModel() {
    if (!apiKey()) return null;
    return stripPrefix(process.env.GEMINI_EMBEDDING_MODEL?.trim() || FALLBACK_EMBEDDING_MODEL);
  },

  async embed({ model, texts, signal }): Promise<EmbedResult> {
    const key = requireKey();
    const embeddingModel = stripPrefix(
      model?.trim() || process.env.GEMINI_EMBEDDING_MODEL?.trim() || FALLBACK_EMBEDDING_MODEL,
    );
    const path = `${BASE_URL}/models/${encodeURIComponent(embeddingModel)}`;
    const vectors: number[][] = [];
    for (const batch of batches(texts, EMBED_BATCH)) {
      const single = batch.length === 1;
      const body = single
        ? { content: { parts: [{ text: batch[0] }] } }
        : {
            requests: batch.map(text => ({
              model: `models/${embeddingModel}`,
              content: { parts: [{ text }] },
            })),
          };
      let data: GeminiEmbedResponse;
      try {
        const res = await fetch(`${path}:${single ? 'embedContent' : 'batchEmbedContents'}`, {
          method: 'POST',
          headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: withTimeout(signal),
        });
        if (!res.ok) throw await errorFromResponse(ID, LABEL, res, [key]);
        data = (await res.json()) as GeminiEmbedResponse;
      } catch (err) {
        throw errorFromException(ID, LABEL, err, signal);
      }
      const values = single ? [data.embedding?.values] : (data.embeddings ?? []).map(item => item.values);
      vectors.push(...checkVectors(ID, LABEL, values, batch.length));
    }
    // The Gemini embeddings API does not report token usage.
    return { vectors, model: embeddingModel };
  },
};
