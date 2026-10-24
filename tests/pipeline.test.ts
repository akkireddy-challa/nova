import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import type { LLMRequest, LLMResult, ModelSelection } from '../src/lib/providers/types';
import { NoProviderConfiguredError, ProviderError } from '../src/lib/providers/types';
import type { AgentThought, ResearchReport } from '../src/lib/types';
import { runPipeline, PipelineError } from '../src/lib/research/pipeline';
import { assertPublicUrl, isSafePublicUrl, fetchPageText, htmlToText } from '../src/lib/research/fetch-page';
import { searchDuckDuckGo } from '../src/lib/web-grounding';

// --- Provider layer stub (injected via PipelineDeps) ----------------------------

type GenerateRequest = Omit<LLMRequest, 'model'>;
const llmState: {
  configured: boolean;
  responses: (string | Error)[];
  requests: GenerateRequest[];
} = { configured: true, responses: [], requests: [] };

const llm = {
  resolveModel: async (id?: string): Promise<ModelSelection> => {
    if (!llmState.configured) throw new NoProviderConfiguredError();
    if (id) {
      const i = id.indexOf(':');
      return { provider: id.slice(0, i) as ModelSelection['provider'], model: id.slice(i + 1) };
    }
    return { provider: 'anthropic', model: 'claude-test' };
  },
  generate: async (selection: ModelSelection, request: GenerateRequest): Promise<LLMResult> => {
    llmState.requests.push(request);
    const next = llmState.responses.shift();
    if (next === undefined) throw new Error('test: no LLM response queued');
    if (next instanceof Error) throw next;
    return {
      text: next,
      usage: { inputTokens: 100, outputTokens: 50 },
      latencyMs: 500,
      model: selection.model,
      provider: selection.provider,
    };
  },
};

// --- fetch / DNS mocks --------------------------------------------------------

const realFetch = globalThis.fetch;
const fetchedUrls: string[] = [];
const publicLookup = async () => ['93.184.216.34'];
const deps = { ...llm, lookup: publicLookup };

function ddgResult(url: string, title: string, snippet: string): string {
  return `<h2 class="result__title"><a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=${encodeURIComponent(url)}&amp;rut=1">${title}</a></h2>
<a class="result__snippet" href="#">${snippet}</a>`;
}

const SEARCH_HTML = [
  ddgResult('https://alpha.example.org/post', 'Alpha report', 'Alpha says X grew 40%.'),
  ddgResult('https://beta.example.net/article', 'Beta analysis', 'Beta disagrees.'),
  ddgResult('http://127.0.0.1/admin', 'Internal admin', 'should never be fetched'),
].join('\n');

function installFetch(options: { searchFails?: boolean } = {}) {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input instanceof Request ? input.url : input);
    fetchedUrls.push(url);
    if (url.startsWith('https://html.duckduckgo.com/')) {
      if (options.searchFails) throw new TypeError('network down');
      return new Response(SEARCH_HTML, { status: 200, headers: { 'content-type': 'text/html' } });
    }
    if (url.startsWith('https://alpha.example.org/')) {
      return new Response('<html><head><title>Alpha</title><script>var secret=1;</script></head><body><p>Alpha body: X grew 40% in 2025.</p></body></html>', {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    }
    if (url.startsWith('https://beta.example.net/')) {
      return new Response('%PDF', { status: 200, headers: { 'content-type': 'application/pdf' } });
    }
    throw new Error(`test: unexpected fetch ${url}`);
  }) as typeof fetch;
}

const validResearch = (citations: unknown[]) =>
  JSON.stringify({
    content: 'X grew 40% according to [1].',
    research: {
      title: 'Growth of X',
      executiveSummary: 'X grew.',
      keyFindings: [
        { point: 'X grew 40%', description: 'Per Alpha.', confidence: 'high', citations },
        { point: 'Some disagree', description: 'Per Beta.', confidence: 'medium', citations: [2] },
      ],
      contradictionsAndRisks: ['Beta disagrees with Alpha.'],
      recommendation: 'Watch X.',
    },
  });

const SCRIPTED_PHRASES = [
  'Lead Strategist',
  'Autonomous Crawler',
  'Cross-Verifier',
  'Executive Synthesizer',
  'Dispatched',
  'Deconstructed',
  'Vision Engine',
];

function expectNoScriptedThoughts(thoughts: AgentThought[]) {
  for (const t of thoughts) {
    for (const phrase of SCRIPTED_PHRASES) {
      expect(`${t.agentName} ${t.action}`).not.toContain(phrase);
    }
  }
}

beforeEach(() => {
  llmState.configured = true;
  llmState.responses = [];
  llmState.requests = [];
  fetchedUrls.length = 0;
  delete process.env.TAVILY_API_KEY;
  delete process.env.BRAVE_API_KEY;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('research pipeline', () => {
  it('maps citations to real fetched sources and drops unknown citation ids', async () => {
    installFetch();
    llmState.responses.push(validResearch([1, 'src-1', 7, 'made-up']));

    const res = await runPipeline({ prompt: 'How fast did X grow?', mode: 'research' }, deps);

    expect(res.artifact?.type).toBe('research');
    const report = res.artifact?.data as ResearchReport;
    expect(report.sources.map(s => s.url)).toEqual([
      'https://alpha.example.org/post',
      'https://beta.example.net/article',
      'http://127.0.0.1/admin',
    ]);
    expect(report.keyFindings[0].citationIds).toEqual(['src-1']);
    expect(report.keyFindings[1].citationIds).toEqual(['src-2']);
    const sourceIds = new Set(report.sources.map(s => s.id));
    for (const finding of report.keyFindings) {
      for (const id of finding.citationIds) expect(sourceIds.has(id)).toBe(true);
    }
    expect(report.metrics?.sourcesCrawled).toBe(1);

    // Only the safe pages were fetched; the loopback URL never left the process.
    expect(fetchedUrls.some(u => u.includes('127.0.0.1'))).toBe(false);
    expect(fetchedUrls).toContain('https://alpha.example.org/post');

    // The prompt contains the real page text (scripts stripped) and the source numbering.
    const request = llmState.requests[0];
    expect(request.json).toBe(true);
    expect(request.messages[0].content).toContain('Alpha body: X grew 40% in 2025.');
    expect(request.messages[0].content).not.toContain('secret');
    expect(request.system).toContain('ONLY');

    const actions = res.thoughts.map(t => `${t.agentName}: ${t.action}`);
    expect(actions.some(a => a.startsWith('Web search: Found 3 results via DuckDuckGo'))).toBe(true);
    expect(actions.some(a => a.startsWith('Page fetch: Fetched 1 of 2 pages'))).toBe(true);
    expect(actions.some(a => a.startsWith('LLM: anthropic:claude-test responded in 0.5s'))).toBe(true);
    expect(res.thoughts.find(t => t.agentName === 'Citations')?.details).toBe('7, made-up');
    expectNoScriptedThoughts(res.thoughts);

    expect(res.provider).toBe('anthropic');
    expect(res.telemetry.model).toBe('anthropic:claude-test');
    expect(res.telemetry.tokenCount).toBe(150);
    expect(res.telemetry.tokensPerSec).toBe(100);
  });

  it('retries once with the validation error after invalid JSON, then succeeds', async () => {
    installFetch();
    llmState.responses.push('Sure! Here is your answer: {not json', validResearch([1]));

    const res = await runPipeline({ prompt: 'X?', mode: 'research' }, deps);

    expect(res.artifact?.type).toBe('research');
    expect(llmState.requests.length).toBe(2);
    const retry = llmState.requests[1];
    expect(retry.messages.length).toBe(3);
    expect(retry.messages[1]).toEqual({ role: 'assistant', content: 'Sure! Here is your answer: {not json' });
    expect(retry.messages[2].content).toContain('Invalid JSON');
    expect(res.thoughts.some(t => t.agentName === 'Validation' && t.status === 'warn')).toBe(true);
    expect(res.telemetry.tokenCount).toBe(300);
  });

  it('returns INVALID_OUTPUT after two invalid responses', async () => {
    installFetch();
    llmState.responses.push('{"content": "x"}', '{"content": "x", "research": {}}');

    const err = await runPipeline({ prompt: 'X?', mode: 'research' }, deps).catch(e => e);
    expect(err).toBeInstanceOf(PipelineError);
    expect(err.code).toBe('INVALID_OUTPUT');
    expect(llmState.requests.length).toBe(2);
  });

  it('throws NoProviderConfiguredError before searching when no provider is configured', async () => {
    installFetch();
    llmState.configured = false;
    const err = await runPipeline({ prompt: 'X?', mode: 'research' }, deps).catch(e => e);
    expect(err).toBeInstanceOf(NoProviderConfiguredError);
    expect(fetchedUrls.length).toBe(0);
  });

  it('propagates provider errors', async () => {
    installFetch();
    llmState.responses.push(new ProviderError('rate limited', 'anthropic', 429));
    const err = await runPipeline({ prompt: 'X?', mode: 'coder' }, deps).catch(e => e);
    expect(err).toBeInstanceOf(ProviderError);
  });

  it('records a warn thought and uses no sources when search fails', async () => {
    installFetch({ searchFails: true });
    llmState.responses.push(validResearch([1, 2]));

    const res = await runPipeline({ prompt: 'X?', mode: 'research' }, deps);

    const report = res.artifact?.data as ResearchReport;
    expect(res.sources).toEqual([]);
    expect(report.sources).toEqual([]);
    expect(report.keyFindings.every(f => f.citationIds.length === 0)).toBe(true);
    const warn = res.thoughts.filter(t => t.agentName === 'Web search' && t.status === 'warn');
    expect(warn.length).toBeGreaterThan(0);
    expect(warn[0].action).toContain('DuckDuckGo search failed');
    expect(llmState.requests[0].system).toContain('no usable sources');
    expectNoScriptedThoughts(res.thoughts);
  });

  it('passes images through and puts text attachments in the prompt', async () => {
    llmState.responses.push(
      JSON.stringify({
        content: 'Here is a plan.',
        plan: {
          goal: 'Ship',
          timeframe: '2 weeks',
          overview: 'Do it.',
          phases: [{ phaseName: 'Build', summary: 'Build it', tasks: [{ title: 'Code', description: 'Write code' }] }],
          keySuccessMetrics: ['Shipped'],
        },
      }),
    );
    installFetch();
    const res = await runPipeline({
      prompt: 'Plan this',
      mode: 'planner',
      attachments: [
        { id: '1', name: 'a.png', size: 10, type: 'image/png', content: 'data:image/png;base64,iVBORw0KGgo=' },
        { id: '2', name: 'notes.txt', size: 10, type: 'text/plain', content: 'Deadline is Friday.' },
      ],
    }, llm);
    const request = llmState.requests[0];
    expect(request.images).toEqual([{ mimeType: 'image/png', data: 'iVBORw0KGgo=' }]);
    expect(request.messages[0].content).toContain('Deadline is Friday.');
    expect(fetchedUrls.length).toBe(0); // planner mode does not search
    expect(res.artifact?.type).toBe('plan');
    if (res.artifact?.type === 'plan') {
      expect(res.artifact.data.phases[0].status).toBe('pending');
      expect(res.artifact.data.phases[0].tasks[0].status).toBe('todo');
    }
  });

  it('renders no chart when the model reports no numeric data', async () => {
    installFetch({ searchFails: true });
    llmState.responses.push(JSON.stringify({ content: 'No numbers found.', chart: null }));
    const res = await runPipeline({ prompt: 'Chart X', mode: 'canvas' }, deps);
    expect(res.artifact).toBeUndefined();
    expect(res.content).toBe('No numbers found.');
  });

  it('computes matrix totals from the model scores', async () => {
    installFetch({ searchFails: true });
    llmState.responses.push(
      JSON.stringify({
        content: 'Compare.',
        matrix: {
          topic: 'DBs',
          criteria: [
            { id: 'c1', name: 'Speed', weight: 3 },
            { id: 'c2', name: 'Cost', weight: 1 },
          ],
          options: [
            { name: 'A', scores: { c1: 8, c2: 4 }, pros: [], cons: [] },
            { name: 'B', scores: { c1: 5, c2: 9 }, pros: [], cons: [] },
          ],
          verdict: 'A',
        },
      }),
    );
    const res = await runPipeline({ prompt: 'Pick a DB', mode: 'matrix' }, deps);
    if (res.artifact?.type !== 'matrix') throw new Error('expected matrix');
    expect(res.artifact.data.options.map(o => o.totalWeightedScore)).toEqual([7, 6]);
  });
});

describe('SSRF guard', () => {
  it('rejects non-http(s), loopback, private, and local URLs', () => {
    const blocked = [
      'file:///etc/passwd',
      'ftp://example.com/x',
      'http://localhost/',
      'http://foo.localhost/',
      'http://127.0.0.1/',
      'http://127.1/',
      'http://2130706433/',
      'http://0x7f000001/',
      'http://10.0.0.5/',
      'http://172.16.3.4/',
      'http://192.168.1.1/',
      'http://169.254.169.254/latest/meta-data',
      'http://0.0.0.0/',
      'http://[::1]/',
      'http://[::ffff:127.0.0.1]/',
      'http://[fd00::1]/',
      'http://[fe80::1]/',
      'http://intranet/',
      'http://printer.local/',
      'http://metadata.google.internal/',
      'http://user:pass@example.com/',
    ];
    for (const url of blocked) {
      expect(isSafePublicUrl(url)).toBe(false);
    }
    expect(() => assertPublicUrl('http://127.0.0.1/')).toThrow();
    expect(isSafePublicUrl('https://example.com/page')).toBe(true);
    expect(isSafePublicUrl('http://93.184.216.34/')).toBe(true);
  });

  it('rejects hostnames that resolve to private addresses and redirects to private hosts', async () => {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input instanceof Request ? input.url : input);
      fetchedUrls.push(url);
      return new Response(null, { status: 302, headers: { location: 'http://169.254.169.254/latest' } });
    }) as typeof fetch;

    await expect(fetchPageText('https://evil.example.com/', { lookup: async () => ['10.0.0.1'] })).rejects.toThrow('private');
    expect(fetchedUrls.length).toBe(0);

    await expect(fetchPageText('https://redirector.example.com/', deps)).rejects.toThrow('private');
    expect(fetchedUrls).toEqual(['https://redirector.example.com/']);
  });

  it('caps page size and strips scripts, styles and tags', async () => {
    const big = `<html><head><style>.a{}</style></head><body><p>${'word '.repeat(100000)}</p></body></html>`;
    globalThis.fetch = (async () => new Response(big, { status: 200, headers: { 'content-type': 'text/html' } })) as unknown as typeof fetch;
    const page = await fetchPageText('https://example.com/', deps);
    expect(page.bytes).toBeLessThanOrEqual(200 * 1024);
    expect(page.text.length).toBeLessThanOrEqual(6000);
    expect(page.text).not.toContain('<');
    expect(htmlToText('<script>alert(1)</script><p>Hi &amp; bye</p>').text).toBe('Hi & bye');
  });
});

describe('DuckDuckGo search', () => {
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('reports the bot-check page as an error instead of empty results', async () => {
    globalThis.fetch = (async () =>
      new Response('<div class="anomaly-modal__box">Unfortunately, bots use DuckDuckGo too.</div>', { status: 202 })) as unknown as typeof fetch;
    await expect(searchDuckDuckGo('test', 5)).rejects.toThrow(/bot check/);
  });
});
