import {
  ProviderError,
  type LLMImage,
  type LLMMessage,
  type LLMProvider,
  type LLMRequest,
  type LLMResult,
  type ProviderId,
} from './types';

// ---------------------------------------------------------------------------
// Shared helpers used by every provider module in this directory.
// ---------------------------------------------------------------------------

export const REQUEST_TIMEOUT_MS = 60_000;

/** Combine the caller's signal (if any) with a hard timeout. */
export function withTimeout(signal?: AbortSignal, ms: number = REQUEST_TIMEOUT_MS): AbortSignal {
  const timeout = AbortSignal.timeout(ms);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

const SECRET_PATTERNS: RegExp[] = [
  /https?:\/\/\S+/gi,
  /Bearer\s+\S+/gi,
  /\bsk-[A-Za-z0-9_*-]{6,}/g,
  /\bAIza[0-9A-Za-z_-]{10,}/g,
  /([?&](?:key|api_key|apikey|token)=)[^&\s]+/gi,
];

/**
 * Make a provider-supplied message safe to show: strips known secrets, anything
 * that looks like a key, bearer tokens and URLs, then truncates.
 */
export function redact(text: string, secrets: Array<string | undefined> = []): string {
  let out = text;
  for (const secret of secrets) {
    if (secret && secret.length >= 4) out = out.split(secret).join('[redacted]');
  }
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, '[redacted]');
  }
  out = out.replace(/\s+/g, ' ').trim();
  return out.length > 200 ? `${out.slice(0, 197)}...` : out;
}

function extractErrorDetail(body: string): string {
  if (!body) return '';
  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed && typeof parsed === 'object') {
      const record = parsed as Record<string, unknown>;
      const err = record.error;
      if (typeof err === 'string') return err;
      if (err && typeof err === 'object') {
        const message = (err as Record<string, unknown>).message;
        if (typeof message === 'string') return message;
      }
      if (typeof record.message === 'string') return record.message;
    }
  } catch {
    // Not JSON; fall through to the raw text.
  }
  return body.length > 300 ? body.slice(0, 300) : body;
}

/** Build a ProviderError from a non-2xx HTTP response. */
export async function errorFromResponse(
  provider: ProviderId,
  label: string,
  res: Response,
  secrets: Array<string | undefined> = [],
): Promise<ProviderError> {
  let detail = '';
  try {
    detail = extractErrorDetail(await res.text());
  } catch {
    // Body unreadable; report the status only.
  }
  const safe = detail ? redact(detail, secrets) : '';
  return new ProviderError(
    `${label} request failed (${res.status})${safe ? `: ${safe}` : ''}`,
    provider,
    res.status,
  );
}

/** Convert a thrown fetch/abort/parse error into a ProviderError without leaking details. */
export function errorFromException(
  provider: ProviderId,
  label: string,
  err: unknown,
  callerSignal?: AbortSignal,
): ProviderError {
  if (err instanceof ProviderError) return err;
  const name = err instanceof Error ? err.name : '';
  if (callerSignal?.aborted) {
    return new ProviderError(`${label} request was aborted`, provider, 499);
  }
  if (name === 'TimeoutError' || name === 'AbortError') {
    return new ProviderError(`${label} request timed out`, provider, 504);
  }
  if (err instanceof SyntaxError) {
    return new ProviderError(`${label} returned an invalid response`, provider, 502);
  }
  return new ProviderError(`Could not reach ${label}`, provider, 502);
}

/** Read a fetch body line by line (for SSE and NDJSON streams). */
export async function* readLines(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline = buffer.indexOf('\n');
      while (newline !== -1) {
        const line = buffer.slice(0, newline).replace(/\r$/, '');
        buffer = buffer.slice(newline + 1);
        yield line;
        newline = buffer.indexOf('\n');
      }
    }
    buffer += decoder.decode();
    if (buffer) yield buffer;
  } finally {
    reader.releaseLock();
  }
}

export const JSON_INSTRUCTION =
  'Respond with only a single valid JSON object. Do not include prose, explanations, or markdown code fences.';

export function elapsedSince(start: number): number {
  return Math.round(performance.now() - start);
}

// ---------------------------------------------------------------------------
// OpenAI-compatible provider
// ---------------------------------------------------------------------------

const ID: ProviderId = 'openai';
const LABEL = 'OpenAI';
const FALLBACK_MODEL = 'gpt-4o-mini';

/** Model ids that exist on /models but cannot be used with /chat/completions. */
const NON_CHAT_MODEL = /(embed|whisper|tts|dall-e|moderation|davinci|babbage|transcribe|realtime|audio|image|sora|computer-use)/i;

function apiKey(): string | undefined {
  return process.env.OPENAI_API_KEY?.trim() || undefined;
}

function baseUrl(): string {
  return (process.env.OPENAI_BASE_URL?.trim() || 'https://api.openai.com/v1').replace(/\/+$/, '');
}

function headers(key: string): Record<string, string> {
  return { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

function requireKey(): string {
  const key = apiKey();
  if (!key) throw new ProviderError('OpenAI is not configured (OPENAI_API_KEY missing)', ID, 503);
  return key;
}

type OpenAIContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | OpenAIContentPart[];
}

interface OpenAIChatResponse {
  model?: string;
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

interface OpenAIStreamChunk {
  choices?: Array<{ delta?: { content?: string | null } }>;
}

function lastUserIndex(messages: LLMMessage[]): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') return i;
  }
  return -1;
}

function buildMessages(request: LLMRequest): OpenAIChatMessage[] {
  const out: OpenAIChatMessage[] = [];
  let system = request.system ?? '';
  if (request.json && !/json/i.test(system)) {
    system = system ? `${system}\n\n${JSON_INSTRUCTION}` : JSON_INSTRUCTION;
  }
  if (system) out.push({ role: 'system', content: system });

  const imageTarget = request.images?.length ? lastUserIndex(request.messages) : -1;
  request.messages.forEach((message, index) => {
    if (index === imageTarget && request.images) {
      out.push({
        role: 'user',
        content: [
          { type: 'text', text: message.content },
          ...request.images.map((image: LLMImage): OpenAIContentPart => ({
            type: 'image_url',
            image_url: { url: `data:${image.mimeType};base64,${image.data}` },
          })),
        ],
      });
    } else {
      out.push({ role: message.role, content: message.content });
    }
  });
  return out;
}

function buildBody(request: LLMRequest, stream: boolean): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: request.model,
    messages: buildMessages(request),
  };
  if (stream) body.stream = true;
  if (request.maxTokens !== undefined) body.max_tokens = request.maxTokens;
  if (request.temperature !== undefined) body.temperature = request.temperature;
  if (request.json) body.response_format = { type: 'json_object' };
  return body;
}

async function post(request: LLMRequest, stream: boolean): Promise<Response> {
  const key = requireKey();
  let res: Response;
  try {
    res = await fetch(`${baseUrl()}/chat/completions`, {
      method: 'POST',
      headers: headers(key),
      body: JSON.stringify(buildBody(request, stream)),
      signal: withTimeout(request.signal),
    });
  } catch (err) {
    throw errorFromException(ID, LABEL, err, request.signal);
  }
  if (!res.ok) throw await errorFromResponse(ID, LABEL, res, [key]);
  return res;
}

export const openaiProvider: LLMProvider = {
  id: ID,
  label: LABEL,

  async isConfigured() {
    return Boolean(apiKey());
  },

  async listModels() {
    const key = requireKey();
    let res: Response;
    try {
      res = await fetch(`${baseUrl()}/models`, {
        headers: headers(key),
        signal: withTimeout(undefined, 10_000),
      });
    } catch (err) {
      throw errorFromException(ID, LABEL, err);
    }
    if (!res.ok) throw await errorFromResponse(ID, LABEL, res, [key]);
    try {
      const data = (await res.json()) as { data?: Array<{ id?: unknown }> };
      return (data.data ?? [])
        .map(model => model.id)
        .filter((id): id is string => typeof id === 'string' && !NON_CHAT_MODEL.test(id));
    } catch (err) {
      throw errorFromException(ID, LABEL, err);
    }
  },

  async defaultModel() {
    const configured = process.env.OPENAI_MODEL?.trim();
    if (configured) return configured;
    try {
      const models = await openaiProvider.listModels();
      if (models.includes(FALLBACK_MODEL)) return FALLBACK_MODEL;
      if (models.length > 0) return models[0];
    } catch {
      // Listing is optional; fall back to a widely available model.
    }
    return FALLBACK_MODEL;
  },

  async generate(request): Promise<LLMResult> {
    const start = performance.now();
    const res = await post(request, false);
    let data: OpenAIChatResponse;
    try {
      data = (await res.json()) as OpenAIChatResponse;
    } catch (err) {
      throw errorFromException(ID, LABEL, err, request.signal);
    }
    const text = data.choices?.[0]?.message?.content;
    if (typeof text !== 'string') {
      throw new ProviderError('OpenAI returned no message content', ID, 502);
    }
    const result: LLMResult = {
      text,
      latencyMs: elapsedSince(start),
      model: data.model || request.model,
      provider: ID,
    };
    const usage = data.usage;
    if (usage && typeof usage.prompt_tokens === 'number' && typeof usage.completion_tokens === 'number') {
      result.usage = { inputTokens: usage.prompt_tokens, outputTokens: usage.completion_tokens };
    }
    return result;
  },

  async *stream(request) {
    const res = await post(request, true);
    if (!res.body) throw new ProviderError('OpenAI returned an empty stream', ID, 502);
    try {
      for await (const line of readLines(res.body)) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;
        if (payload === '[DONE]') return;
        let chunk: OpenAIStreamChunk;
        try {
          chunk = JSON.parse(payload) as OpenAIStreamChunk;
        } catch {
          continue;
        }
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      }
    } catch (err) {
      throw errorFromException(ID, LABEL, err, request.signal);
    }
  },
};
