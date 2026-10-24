import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import {
  ModelSelectionError,
  NoProviderConfiguredError,
  ProviderError,
  getConfiguredProviders,
  getProvider,
  listAvailableModels,
  parseModelId,
  resetProviderCaches,
  resolveModel,
} from '../src/lib/providers';
import { pickFlashModel } from '../src/lib/providers/gemini';

// `connection()` only works inside a Next.js request scope; make it a no-op for direct handler calls.
const nextServer = await import('next/server');
mock.module('next/server', () => ({ ...nextServer, connection: async () => undefined }));
const { GET: getModels } = await import('../src/app/api/v1/models/route');
const { POST: postCompletions } = await import('../src/app/api/v1/chat/completions/route');

const ENV_KEYS = [
  'GEMINI_API_KEY',
  'GOOGLE_API_KEY',
  'GEMINI_MODEL',
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_MODEL',
  'ANTHROPIC_BASE_URL',
  'ANTHROPIC_AUTH_TOKEN',
  'OPENAI_API_KEY',
  'OPENAI_BASE_URL',
  'OPENAI_MODEL',
  'OLLAMA_BASE_URL',
  'OLLAMA_MODEL',
] as const;

const OLLAMA_URL = 'http://ollama.test:11434';
const GEMINI_KEY = 'AIzaTESTgeminiSecretKey123456';
const ANTHROPIC_KEY = 'sk-ant-test-secret-key-0001';
const OPENAI_KEY = 'sk-test-openai-secret-0002';

interface RecordedCall {
  url: string;
  method: string;
  headers: Headers;
  body: string;
}

type Handler = (call: RecordedCall) => Response | Promise<Response>;

let savedEnv: Record<string, string | undefined> = {};
let originalFetch: typeof fetch;
let calls: RecordedCall[] = [];

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

/** Install a fetch mock. Ollama is unreachable unless the handler answers for it. */
function mockFetch(handler: Handler): void {
  const fake = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = input instanceof Request ? input : null;
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    let body = '';
    if (typeof init?.body === 'string') body = init.body;
    else if (init?.body instanceof Uint8Array) body = new TextDecoder().decode(init.body);
    else if (request) body = await request.clone().text();
    const call: RecordedCall = {
      url,
      method: init?.method ?? request?.method ?? 'GET',
      headers: new Headers(init?.headers ?? request?.headers),
      body,
    };
    calls.push(call);
    return handler(call);
  };
  globalThis.fetch = fake as unknown as typeof fetch;
}

function unreachable(): never {
  throw new TypeError('fetch failed: connection refused');
}

function bodyOf(call: RecordedCall): Record<string, unknown> {
  return JSON.parse(call.body) as Record<string, unknown>;
}

async function expectProviderError(promise: Promise<unknown>): Promise<ProviderError> {
  try {
    await promise;
  } catch (err) {
    expect(err).toBeInstanceOf(ProviderError);
    return err as ProviderError;
  }
  throw new Error('expected a ProviderError');
}

beforeEach(() => {
  savedEnv = {};
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
  process.env.OLLAMA_BASE_URL = OLLAMA_URL;
  originalFetch = globalThis.fetch;
  calls = [];
  resetProviderCaches();
  mockFetch(() => unreachable());
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  resetProviderCaches();
});

describe('Gemini provider', () => {
  const gemini = getProvider('gemini');

  it('is configured by GEMINI_API_KEY or GOOGLE_API_KEY', async () => {
    expect(await gemini.isConfigured()).toBe(false);
    process.env.GOOGLE_API_KEY = GEMINI_KEY;
    expect(await gemini.isConfigured()).toBe(true);
  });

  it('sends the key in a header, never in the URL, and parses text + usage', async () => {
    process.env.GEMINI_API_KEY = GEMINI_KEY;
    mockFetch(() =>
      json({
        candidates: [{ content: { parts: [{ text: 'thinking', thought: true }, { text: '{"a":' }, { text: '1}' }] } }],
        usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 5 },
      }),
    );

    const result = await gemini.generate({
      model: 'gemini-2.5-flash',
      system: 'Be brief.',
      messages: [
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'hello' },
        { role: 'user', content: 'describe' },
      ],
      images: [{ mimeType: 'image/png', data: 'iVBORw0KGgo=' }],
      json: true,
      temperature: 0.2,
      maxTokens: 100,
    });

    expect(result).toMatchObject({ text: '{"a":1}', provider: 'gemini', usage: { inputTokens: 12, outputTokens: 5 } });
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);

    const call = calls[0];
    expect(call.url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');
    expect(call.url).not.toContain(GEMINI_KEY);
    expect(call.url).not.toContain('key=');
    expect(call.headers.get('x-goog-api-key')).toBe(GEMINI_KEY);

    const body = bodyOf(call);
    expect(body.systemInstruction).toEqual({ parts: [{ text: 'Be brief.' }] });
    expect(body.generationConfig).toEqual({ temperature: 0.2, maxOutputTokens: 100, responseMimeType: 'application/json' });
    const contents = body.contents as Array<{ role: string; parts: unknown[] }>;
    expect(contents.map(content => content.role)).toEqual(['user', 'model', 'user']);
    expect(contents[2].parts).toEqual([
      { text: 'describe' },
      { inlineData: { mimeType: 'image/png', data: 'iVBORw0KGgo=' } },
    ]);
  });

  it('omits usage when the API does not report it', async () => {
    process.env.GEMINI_API_KEY = GEMINI_KEY;
    mockFetch(() => json({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }));
    const result = await gemini.generate({ model: 'gemini-2.5-flash', messages: [{ role: 'user', content: 'x' }] });
    expect(result.usage).toBeUndefined();
  });

  it('turns HTTP errors into ProviderError without leaking the key or URL', async () => {
    process.env.GEMINI_API_KEY = GEMINI_KEY;
    mockFetch(() =>
      json(
        {
          error: {
            message: `API key ${GEMINI_KEY} not valid for https://generativelanguage.googleapis.com/v1beta/x?key=${GEMINI_KEY}`,
          },
        },
        400,
      ),
    );
    const err = await expectProviderError(
      gemini.generate({ model: 'gemini-2.5-flash', messages: [{ role: 'user', content: 'x' }] }),
    );
    expect(err.status).toBe(400);
    expect(err.provider).toBe('gemini');
    expect(err.message).not.toContain(GEMINI_KEY);
    expect(err.message).not.toContain('googleapis.com');
  });

  it('reports network failures as ProviderError', async () => {
    process.env.GEMINI_API_KEY = GEMINI_KEY;
    const err = await expectProviderError(
      gemini.generate({ model: 'gemini-2.5-flash', messages: [{ role: 'user', content: 'x' }] }),
    );
    expect(err.status).toBe(502);
  });

  it('lists only generateContent models and picks a flash default', async () => {
    process.env.GEMINI_API_KEY = GEMINI_KEY;
    mockFetch(() =>
      json({
        models: [
          { name: 'models/text-embedding-004', supportedGenerationMethods: ['embedContent'] },
          { name: 'models/gemini-2.5-pro', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/gemini-2.5-flash-lite', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent', 'countTokens'] },
        ],
      }),
    );
    expect(await gemini.listModels()).toEqual(['gemini-2.5-pro', 'gemini-2.5-flash-lite', 'gemini-2.5-flash']);
    expect(calls[0].url).not.toContain(GEMINI_KEY);
    expect(calls[0].headers.get('x-goog-api-key')).toBe(GEMINI_KEY);
    expect(await gemini.defaultModel()).toBe('gemini-2.5-flash');
  });

  it('honours GEMINI_MODEL and falls back when listing fails', async () => {
    process.env.GEMINI_API_KEY = GEMINI_KEY;
    mockFetch(() => json({ error: { message: 'nope' } }, 500));
    expect(await gemini.defaultModel()).toBe('gemini-2.5-flash');
    process.env.GEMINI_MODEL = 'gemini-3-pro';
    expect(await gemini.defaultModel()).toBe('gemini-3-pro');
  });

  it('pickFlashModel prefers stable flash models', () => {
    expect(pickFlashModel(['gemini-2.0-flash-exp', 'gemini-2.5-flash-lite', 'gemini-2.5-flash'])).toBe('gemini-2.5-flash');
    expect(pickFlashModel(['gemini-2.5-pro'])).toBeUndefined();
  });
});

describe('Anthropic provider', () => {
  const anthropic = getProvider('anthropic');

  const message = {
    id: 'msg_1',
    type: 'message',
    role: 'assistant',
    model: 'claude-sonnet-5-5',
    content: [{ type: 'text', text: '{"answer":' }, { type: 'text', text: '42}' }],
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: 20, output_tokens: 7 },
  };

  it('is configured only with ANTHROPIC_API_KEY and defaults to claude-sonnet-5-5', async () => {
    expect(await anthropic.isConfigured()).toBe(false);
    process.env.ANTHROPIC_API_KEY = ANTHROPIC_KEY;
    expect(await anthropic.isConfigured()).toBe(true);
    expect(await anthropic.defaultModel()).toBe('claude-sonnet-5-5');
    process.env.ANTHROPIC_MODEL = 'claude-opus-5-5';
    expect(await anthropic.defaultModel()).toBe('claude-opus-5-5');
  });

  it('sends a Messages API request through the SDK and parses text + usage', async () => {
    process.env.ANTHROPIC_API_KEY = ANTHROPIC_KEY;
    mockFetch(() => json(message));

    const result = await anthropic.generate({
      model: 'claude-sonnet-5-5',
      system: 'You are Nova.',
      messages: [{ role: 'user', content: 'What is the answer?' }],
      images: [{ mimeType: 'image/jpeg', data: '/9j/4AAQ' }],
      json: true,
      temperature: 0.5,
      maxTokens: 512,
    });

    expect(result).toMatchObject({
      text: '{"answer":42}',
      provider: 'anthropic',
      model: 'claude-sonnet-5-5',
      usage: { inputTokens: 20, outputTokens: 7 },
    });

    const call = calls[0];
    expect(call.url).toBe('https://api.anthropic.com/v1/messages');
    expect(call.method).toBe('POST');
    const authHeaders = `${call.headers.get('x-api-key') ?? ''} ${call.headers.get('authorization') ?? ''}`;
    expect(authHeaders).toContain(ANTHROPIC_KEY);

    const body = bodyOf(call);
    expect(body.model).toBe('claude-sonnet-5-5');
    expect(body.max_tokens).toBe(512);
    expect(body.temperature).toBeUndefined();
    expect(body.system).toContain('You are Nova.');
    expect(body.system).toContain('JSON object');
    const messages = body.messages as Array<{ role: string; content: unknown }>;
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toEqual([
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: '/9j/4AAQ' } },
      { type: 'text', text: 'What is the answer?' },
    ]);
  });

  it('maps API errors to ProviderError without the key', async () => {
    process.env.ANTHROPIC_API_KEY = ANTHROPIC_KEY;
    mockFetch(() =>
      json({ type: 'error', error: { type: 'authentication_error', message: `invalid x-api-key ${ANTHROPIC_KEY}` } }, 401),
    );
    const err = await expectProviderError(
      anthropic.generate({ model: 'claude-sonnet-5-5', messages: [{ role: 'user', content: 'x' }] }),
    );
    expect(err.status).toBe(401);
    expect(err.message).not.toContain(ANTHROPIC_KEY);
    expect(err.message).toContain('401');
  });

  it('rejects unsupported image types', async () => {
    process.env.ANTHROPIC_API_KEY = ANTHROPIC_KEY;
    const err = await expectProviderError(
      anthropic.generate({
        model: 'claude-sonnet-5-5',
        messages: [{ role: 'user', content: 'x' }],
        images: [{ mimeType: 'image/tiff', data: 'AAAA' }],
      }),
    );
    expect(err.status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it('lists models via the SDK', async () => {
    process.env.ANTHROPIC_API_KEY = ANTHROPIC_KEY;
    mockFetch(() =>
      json({
        data: [
          { id: 'claude-opus-5-5', type: 'model', display_name: 'Opus', created_at: '2026-01-01T00:00:00Z' },
          { id: 'claude-sonnet-5-5', type: 'model', display_name: 'Sonnet', created_at: '2026-01-01T00:00:00Z' },
        ],
        has_more: false,
        first_id: 'claude-opus-5-5',
        last_id: 'claude-sonnet-5-5',
      }),
    );
    expect(await anthropic.listModels()).toEqual(['claude-opus-5-5', 'claude-sonnet-5-5']);
    expect(calls[0].url).toStartWith('https://api.anthropic.com/v1/models');
    expect(calls[0].url).not.toContain(ANTHROPIC_KEY);
  });
});

describe('OpenAI-compatible provider', () => {
  const openai = getProvider('openai');

  it('posts to OPENAI_BASE_URL/chat/completions with a bearer token and parses usage', async () => {
    process.env.OPENAI_API_KEY = OPENAI_KEY;
    process.env.OPENAI_BASE_URL = 'https://openrouter.test/api/v1/';
    mockFetch(() =>
      json({
        model: 'gpt-4o-mini-2024',
        choices: [{ message: { role: 'assistant', content: '{"ok":true}' } }],
        usage: { prompt_tokens: 9, completion_tokens: 3, total_tokens: 12 },
      }),
    );

    const result = await openai.generate({
      model: 'gpt-4o-mini',
      system: 'Answer.',
      messages: [{ role: 'user', content: 'look' }],
      images: [{ mimeType: 'image/png', data: 'AAAA' }],
      json: true,
      maxTokens: 50,
      temperature: 0,
    });

    expect(result).toMatchObject({ text: '{"ok":true}', model: 'gpt-4o-mini-2024', usage: { inputTokens: 9, outputTokens: 3 } });
    const call = calls[0];
    expect(call.url).toBe('https://openrouter.test/api/v1/chat/completions');
    expect(call.url).not.toContain(OPENAI_KEY);
    expect(call.headers.get('authorization')).toBe(`Bearer ${OPENAI_KEY}`);
    const body = bodyOf(call);
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(body.max_tokens).toBe(50);
    expect(body.temperature).toBe(0);
    const messages = body.messages as Array<{ role: string; content: unknown }>;
    expect(messages[0].role).toBe('system');
    expect(String(messages[0].content)).toMatch(/JSON/);
    expect(messages[1].content).toEqual([
      { type: 'text', text: 'look' },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,AAAA' } },
    ]);
  });

  it('redacts keys echoed back in error messages', async () => {
    process.env.OPENAI_API_KEY = OPENAI_KEY;
    mockFetch(() =>
      json({ error: { message: `Incorrect API key provided: ${OPENAI_KEY.slice(0, 10)}****0002. See https://platform.openai.com/account/api-keys.` } }, 401),
    );
    const err = await expectProviderError(openai.generate({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'x' }] }));
    expect(err.status).toBe(401);
    expect(err.message).not.toContain(OPENAI_KEY.slice(0, 10));
    expect(err.message).not.toContain('https://');
  });

  it('chooses OPENAI_MODEL, else a listed chat model, else gpt-4o-mini', async () => {
    process.env.OPENAI_API_KEY = OPENAI_KEY;
    mockFetch(() => json({ data: [{ id: 'text-embedding-3-small' }, { id: 'llama-3.3-70b' }, { id: 'whisper-1' }] }));
    expect(await openai.listModels()).toEqual(['llama-3.3-70b']);
    expect(await openai.defaultModel()).toBe('llama-3.3-70b');
    process.env.OPENAI_MODEL = 'gpt-5';
    expect(await openai.defaultModel()).toBe('gpt-5');
    delete process.env.OPENAI_MODEL;
    mockFetch(() => json({ error: 'down' }, 503));
    expect(await openai.defaultModel()).toBe('gpt-4o-mini');
  });

  it('streams SSE deltas', async () => {
    process.env.OPENAI_API_KEY = OPENAI_KEY;
    const sse = [
      'data: {"choices":[{"delta":{"role":"assistant","content":""}}]}',
      'data: {"choices":[{"delta":{"content":"Hel"}}]}',
      '',
      'data: {"choices":[{"delta":{"content":"lo"}}]}',
      'data: [DONE]',
      '',
    ].join('\n');
    mockFetch(() => new Response(sse, { headers: { 'Content-Type': 'text/event-stream' } }));
    const parts: string[] = [];
    const stream = openai.stream;
    if (!stream) throw new Error('openai.stream missing');
    for await (const part of stream({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'x' }] })) parts.push(part);
    expect(parts).toEqual(['Hel', 'lo']);
    expect(bodyOf(calls[0]).stream).toBe(true);
  });
});

describe('Ollama provider', () => {
  const ollama = getProvider('ollama');
  const tags = { models: [{ name: 'llama3.2:3b' }, { name: 'qwen2.5:7b' }] };

  it('is not configured when the server is unreachable', async () => {
    expect(await ollama.isConfigured()).toBe(false);
  });

  it('is configured when /api/tags answers with models, and caches the probe', async () => {
    mockFetch(call => (call.url === `${OLLAMA_URL}/api/tags` ? json(tags) : unreachable()));
    expect(await ollama.isConfigured()).toBe(true);
    expect(await ollama.isConfigured()).toBe(true);
    expect(calls).toHaveLength(1);
    expect(await ollama.listModels()).toEqual(['llama3.2:3b', 'qwen2.5:7b']);
    expect(await ollama.defaultModel()).toBe('llama3.2:3b');
    process.env.OLLAMA_MODEL = 'qwen2.5:7b';
    expect(await ollama.defaultModel()).toBe('qwen2.5:7b');
  });

  it('is not configured when no models are installed', async () => {
    mockFetch(() => json({ models: [] }));
    expect(await ollama.isConfigured()).toBe(false);
  });

  it('calls /api/chat with stream:false and maps usage', async () => {
    mockFetch(() =>
      json({ model: 'llama3.2:3b', message: { role: 'assistant', content: '{"x":1}' }, done: true, prompt_eval_count: 30, eval_count: 4 }),
    );
    const result = await ollama.generate({
      model: 'llama3.2:3b',
      system: 'sys',
      messages: [{ role: 'user', content: 'q' }],
      images: [{ mimeType: 'image/png', data: 'AAAA' }],
      json: true,
      maxTokens: 64,
    });
    expect(result).toMatchObject({ text: '{"x":1}', provider: 'ollama', usage: { inputTokens: 30, outputTokens: 4 } });
    expect(calls[0].url).toBe(`${OLLAMA_URL}/api/chat`);
    const body = bodyOf(calls[0]);
    expect(body).toMatchObject({ model: 'llama3.2:3b', stream: false, format: 'json', options: { num_predict: 64 } });
    expect(body.messages).toEqual([
      { role: 'system', content: 'sys' },
      { role: 'user', content: 'q', images: ['AAAA'] },
    ]);
  });

  it('reports HTTP errors as ProviderError', async () => {
    mockFetch(() => json({ error: 'model "nope" not found, try pulling it first' }, 404));
    const err = await expectProviderError(ollama.generate({ model: 'nope', messages: [{ role: 'user', content: 'q' }] }));
    expect(err.status).toBe(404);
    expect(err.message).toContain('not found');
  });

  it('streams NDJSON deltas', async () => {
    const ndjson = [
      '{"message":{"content":"a"},"done":false}',
      '{"message":{"content":"b"},"done":false}',
      '{"message":{"content":""},"done":true,"eval_count":2}',
    ].join('\n');
    mockFetch(() => new Response(ndjson));
    const stream = ollama.stream;
    if (!stream) throw new Error('ollama.stream missing');
    const parts: string[] = [];
    for await (const part of stream({ model: 'llama3.2:3b', messages: [{ role: 'user', content: 'q' }] })) parts.push(part);
    expect(parts).toEqual(['a', 'b']);
  });
});

describe('provider registry', () => {
  it('parses provider:model ids', () => {
    expect(parseModelId('anthropic:claude-sonnet-5-5')).toEqual({ provider: 'anthropic', model: 'claude-sonnet-5-5' });
    expect(parseModelId('ollama:llama3.2:3b')).toEqual({ provider: 'ollama', model: 'llama3.2:3b' });
    expect(parseModelId('gpt-4o')).toBeNull();
    expect(parseModelId('mistral:large')).toBeNull();
    expect(parseModelId('openai:')).toBeNull();
    expect(parseModelId(':model')).toBeNull();
  });

  it('throws NoProviderConfiguredError when nothing is configured', async () => {
    expect(await getConfiguredProviders()).toEqual([]);
    expect(await listAvailableModels()).toEqual([]);
    await expect(resolveModel()).rejects.toBeInstanceOf(NoProviderConfiguredError);
    await expect(resolveModel('openai:gpt-4o')).rejects.toBeInstanceOf(NoProviderConfiguredError);
  });

  it('defaults in order anthropic, openai, gemini, ollama', async () => {
    process.env.GEMINI_API_KEY = GEMINI_KEY;
    process.env.GEMINI_MODEL = 'gemini-2.5-flash';
    process.env.OPENAI_API_KEY = OPENAI_KEY;
    process.env.OPENAI_MODEL = 'gpt-5';
    expect(await resolveModel()).toEqual({ provider: 'openai', model: 'gpt-5' });
    process.env.ANTHROPIC_API_KEY = ANTHROPIC_KEY;
    expect(await resolveModel()).toEqual({ provider: 'anthropic', model: 'claude-sonnet-5-5' });
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    expect(await resolveModel()).toEqual({ provider: 'gemini', model: 'gemini-2.5-flash' });
  });

  it('accepts explicit ids only for configured providers', async () => {
    process.env.GEMINI_API_KEY = GEMINI_KEY;
    expect(await resolveModel('gemini:gemini-2.5-pro')).toEqual({ provider: 'gemini', model: 'gemini-2.5-pro' });
    await expect(resolveModel('anthropic:claude-sonnet-5-5')).rejects.toBeInstanceOf(ModelSelectionError);
    await expect(resolveModel('not-a-model')).rejects.toBeInstanceOf(ModelSelectionError);
  });

  it('lists models with exactly one default and falls back to the default model when listing fails', async () => {
    process.env.GEMINI_API_KEY = GEMINI_KEY;
    process.env.OPENAI_API_KEY = OPENAI_KEY;
    process.env.OPENAI_MODEL = 'gpt-5';
    mockFetch(call => {
      if (call.url.includes('generativelanguage')) {
        return json({
          models: [
            { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/gemini-2.5-pro', supportedGenerationMethods: ['generateContent'] },
          ],
        });
      }
      if (call.url.includes('api.openai.com')) return json({ error: 'forbidden' }, 403);
      return unreachable();
    });

    const models = await listAvailableModels();
    expect(models.map(model => model.id)).toEqual(['openai:gpt-5', 'gemini:gemini-2.5-flash', 'gemini:gemini-2.5-pro']);
    expect(models.filter(model => model.isDefault).map(model => model.id)).toEqual(['openai:gpt-5']);
    expect(models[1].providerLabel).toBe('Gemini');
  });
});

describe('GET /api/v1/models', () => {
  it('returns an empty list when nothing is configured', async () => {
    const res = await getModels();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ object: 'list', data: [] });
  });

  it('returns the contract shape', async () => {
    process.env.ANTHROPIC_API_KEY = ANTHROPIC_KEY;
    mockFetch(call => (call.url.includes('anthropic.com') ? json({ error: { message: 'x' } }, 500) : unreachable()));
    const res = await getModels();
    expect(await res.json()).toEqual({
      object: 'list',
      data: [
        {
          id: 'anthropic:claude-sonnet-5-5',
          object: 'model',
          provider: 'anthropic',
          model: 'claude-sonnet-5-5',
          owned_by: 'Anthropic',
          is_default: true,
        },
      ],
    });
  });
});

describe('POST /api/v1/chat/completions', () => {
  function post(body: unknown): Promise<Response> {
    return postCompletions(
      new Request('http://localhost/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );
  }

  it('returns 503 when no provider is configured', async () => {
    const res = await post({ messages: [{ role: 'user', content: 'hi' }] });
    expect(res.status).toBe(503);
    const data = (await res.json()) as { error: { code: string } };
    expect(data.error.code).toBe('no_provider');
  });

  it('returns 400 for a missing messages array', async () => {
    const res = await post({ model: 'openai:gpt-5' });
    expect(res.status).toBe(400);
  });

  it('proxies a non-streaming completion with real usage and mapped system prompt', async () => {
    process.env.OPENAI_API_KEY = OPENAI_KEY;
    process.env.OPENAI_MODEL = 'gpt-5';
    mockFetch(() =>
      json({ model: 'gpt-5', choices: [{ message: { content: 'Hello!' } }], usage: { prompt_tokens: 4, completion_tokens: 2 } }),
    );
    const res = await post({
      messages: [
        { role: 'system', content: 'Be nice.' },
        { role: 'user', content: 'hi' },
      ],
      max_tokens: 20,
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data).toMatchObject({
      object: 'chat.completion',
      model: 'openai:gpt-5',
      choices: [{ index: 0, message: { role: 'assistant', content: 'Hello!' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 4, completion_tokens: 2, total_tokens: 6 },
    });
    const chatCall = calls.find(call => call.url.endsWith('/chat/completions'));
    if (!chatCall) throw new Error('no chat call recorded');
    const sent = bodyOf(chatCall);
    expect(sent.messages).toEqual([
      { role: 'system', content: 'Be nice.' },
      { role: 'user', content: 'hi' },
    ]);
    expect(sent.max_tokens).toBe(20);
  });

  it('omits usage when the provider does not report it', async () => {
    process.env.OPENAI_API_KEY = OPENAI_KEY;
    process.env.OPENAI_MODEL = 'gpt-5';
    mockFetch(() => json({ choices: [{ message: { content: 'x' } }] }));
    const data = (await (await post({ messages: [{ role: 'user', content: 'hi' }] })).json()) as Record<string, unknown>;
    expect(data.usage).toBeUndefined();
  });

  it('streams chat.completion.chunk events ending with [DONE]', async () => {
    process.env.OPENAI_API_KEY = OPENAI_KEY;
    const sse = 'data: {"choices":[{"delta":{"content":"Hi"}}]}\n\ndata: {"choices":[{"delta":{"content":" there"}}]}\n\ndata: [DONE]\n\n';
    mockFetch(() => new Response(sse));
    const res = await post({ model: 'openai:gpt-5', stream: true, messages: [{ role: 'user', content: 'hi' }] });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const text = await res.text();
    const events = text.split('\n\n').filter(Boolean);
    expect(events[events.length - 1]).toBe('data: [DONE]');
    const chunks = events.slice(0, -1).map(event => JSON.parse(event.slice(6)) as {
      object: string;
      choices: Array<{ delta: { content?: string }; finish_reason: string | null }>;
    });
    expect(chunks.every(chunk => chunk.object === 'chat.completion.chunk')).toBe(true);
    expect(chunks.map(chunk => chunk.choices[0].delta.content ?? '').join('')).toBe('Hi there');
    expect(chunks[chunks.length - 1].choices[0].finish_reason).toBe('stop');
  });

  it('returns an OpenAI-style error without leaking the key when the provider fails', async () => {
    process.env.OPENAI_API_KEY = OPENAI_KEY;
    mockFetch(() => json({ error: { message: `bad key ${OPENAI_KEY}` } }, 401));
    const res = await post({ model: 'openai:gpt-5', messages: [{ role: 'user', content: 'hi' }] });
    expect(res.status).toBe(502);
    const raw = await res.text();
    expect(raw).not.toContain(OPENAI_KEY);
    expect((JSON.parse(raw) as { error: { type: string } }).error.type).toBe('provider_error');
  });

  it('rejects models for unconfigured providers', async () => {
    process.env.OPENAI_API_KEY = OPENAI_KEY;
    const res = await post({ model: 'anthropic:claude-sonnet-5-5', messages: [{ role: 'user', content: 'hi' }] });
    expect(res.status).toBe(400);
  });
});
