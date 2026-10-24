import { afterEach, describe, expect, it } from 'bun:test';
import { mcpRegistry } from '../src/lib/mcp-registry';

describe('Open API Gateway & MCP Plugin Registry', () => {
  it('should list registered MCP plugins with valid schemas', () => {
    const plugins = mcpRegistry.getAllPlugins();
    expect(plugins.length).toBeGreaterThanOrEqual(3);

    const searchPlugin = plugins.find(p => p.id === 'web-search');
    expect(searchPlugin).toBeDefined();
    expect(searchPlugin?.tools.length).toBeGreaterThan(0);
    expect(searchPlugin?.tools[0].name).toBe('web_search');
  });

  it('should not expose server-side code execution', async () => {
    const result = await mcpRegistry.executeTool('execute_code', {
      code: 'return globalThis.process.env',
    });

    expect(result.success).toBe(false);
    expect(result.output).toBeNull();
  });

  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
    delete process.env.TAVILY_API_KEY;
    delete process.env.BRAVE_API_KEY;
    delete process.env.SEARXNG_URL;
  });

  function mockFetch(handler: (url: string) => Response | Promise<Response>) {
    globalThis.fetch = (async (input: RequestInfo | URL) => handler(String(input instanceof Request ? input.url : input))) as typeof fetch;
  }

  const ddgHtml = `
    <h2 class="result__title"><a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fmodelcontextprotocol.io%2Fspecification&amp;rut=x">MCP <b>Specification</b></a></h2>
    <a class="result__snippet" href="#">The Model Context Protocol spec.</a>
    <h2 class="result__title"><a rel="nofollow" class="result__a" href="https://github.com/modelcontextprotocol">modelcontextprotocol &middot; GitHub</a></h2>
    <a class="result__snippet" href="#">Org page.</a>`;

  it('should execute web search tool and return real parsed sources', async () => {
    delete process.env.TAVILY_API_KEY;
    delete process.env.BRAVE_API_KEY;
    delete process.env.SEARXNG_URL;
    mockFetch(() => new Response(ddgHtml, { status: 200, headers: { 'content-type': 'text/html' } }));
    const result = await mcpRegistry.executeTool('web_search', {
      query: 'Model Context Protocol specification',
      maxResults: 2,
    });

    expect(result.success).toBe(true);
    const output = result.output as { query: string; provider: string; sources: { url: string; title: string }[]; error?: string };
    expect(output.query).toBe('Model Context Protocol specification');
    expect(output.provider).toBe('DuckDuckGo');
    expect(output.error).toBeUndefined();
    expect(output.sources.map(s => s.url)).toEqual([
      'https://modelcontextprotocol.io/specification',
      'https://github.com/modelcontextprotocol',
    ]);
    expect(output.sources[0].title).toBe('MCP Specification');
  });

  it('should return an empty list with an error when web search fails', async () => {
    delete process.env.TAVILY_API_KEY;
    delete process.env.BRAVE_API_KEY;
    delete process.env.SEARXNG_URL;
    mockFetch(() => new Response('unavailable', { status: 503 }));
    const result = await mcpRegistry.executeTool('web_search', { query: 'anything' });

    expect(result.success).toBe(true);
    const output = result.output as { sources: unknown[]; error?: string };
    expect(output.sources).toEqual([]);
    expect(output.error).toContain('DuckDuckGo');
  });

  it('should return real GitHub data or an error, never fabricated repo data', async () => {
    mockFetch(url => {
      if (url.endsWith('/repos/facebook/react')) {
        return Response.json({
          full_name: 'facebook/react',
          description: 'UI library',
          stargazers_count: 5,
          forks_count: 1,
          open_issues_count: 2,
          license: { spdx_id: 'MIT' },
          language: 'JavaScript',
          default_branch: 'main',
        });
      }
      return new Response('Not Found', { status: 404 });
    });

    const ok = await mcpRegistry.executeTool('inspect_github_repo', { repo: 'facebook/react' });
    expect(ok.success).toBe(true);
    expect((ok.output as { stars: number }).stars).toBe(5);

    const missing = await mcpRegistry.executeTool('inspect_github_repo', { repo: 'nobody/nothing' });
    expect(missing.success).toBe(false);
    expect(missing.output).toBeNull();
    expect(missing.error).toContain('404');
  });

  it('should return an error for custom plugins without a reachable endpoint', async () => {
    mcpRegistry.registerCustomPlugin({
      id: 'custom-test',
      name: 'Custom Test',
      description: 'test',
      category: 'custom',
      version: '0.0.1',
      author: 'test',
      icon: 'Box',
      enabled: true,
      tools: [{ name: 'custom_test_tool', description: 'x', inputSchema: { type: 'object', properties: {} } }],
    });
    const result = await mcpRegistry.executeTool('custom_test_tool', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('no endpoint');
  });

  it('should start plugin stats at zero instead of invented numbers', () => {
    for (const plugin of mcpRegistry.getAllPlugins().filter(p => !p.isCustom)) {
      expect(plugin.stats?.totalCalls ?? 0).toBeGreaterThanOrEqual(0);
    }
    expect(mcpRegistry.getPlugin('memory-search')?.stats?.totalCalls).toBe(0);
  });

  it('does not register the removed hardcoded concept graph', () => {
    expect(mcpRegistry.getPlugin('concept-graph')).toBeUndefined();
    expect(mcpRegistry.getAvailableTools().map(t => t.name)).not.toContain('query_associative_graph');
    for (const plugin of mcpRegistry.getAllPlugins()) {
      expect(`${plugin.description} ${plugin.author}`).not.toMatch(/3072|Cognitive Lab/);
    }
  });

  it('should search the memories it is given and report the method used', async () => {
    const saved = { openai: process.env.OPENAI_API_KEY, gemini: process.env.GEMINI_API_KEY, google: process.env.GOOGLE_API_KEY, ollama: process.env.OLLAMA_BASE_URL };
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    process.env.OLLAMA_BASE_URL = 'http://ollama.invalid:11434';
    mockFetch(() => {
      throw new TypeError('fetch failed');
    });
    try {
      const result = await mcpRegistry.executeTool('vector_semantic_search', {
        query: 'deployment checklist',
        topK: 2,
        memories: [
          { id: 'a', title: 'Deployment', content: 'Run the checklist before every deployment.' },
          { id: 'b', title: 'Lunch', content: 'Sandwiches on Fridays.' },
          'not a memory',
        ],
      });
      expect(result.success).toBe(true);
      const output = result.output as { method: string; searchedMemories: number; results: Array<{ memoryId: string }> };
      expect(output.method).toBe('keyword');
      expect(output.searchedMemories).toBe(2);
      expect(output.results.map(r => r.memoryId)).toEqual(['a']);

      const empty = await mcpRegistry.executeTool('vector_semantic_search', { query: 'anything' });
      expect(empty.success).toBe(true);
      expect((empty.output as { results: unknown[]; note?: string }).results).toEqual([]);
      expect((empty.output as { note?: string }).note).toContain('memories');
    } finally {
      for (const [key, value] of [
        ['OPENAI_API_KEY', saved.openai],
        ['GEMINI_API_KEY', saved.gemini],
        ['GOOGLE_API_KEY', saved.google],
        ['OLLAMA_BASE_URL', saved.ollama],
      ] as const) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  it('should support enabling and disabling plugins gracefully', () => {
    const disabled = mcpRegistry.togglePlugin('github-inspector', false);
    expect(disabled).toBe(true);

    const plugin = mcpRegistry.getPlugin('github-inspector');
    expect(plugin?.enabled).toBe(false);

    // Re-enable
    mcpRegistry.togglePlugin('github-inspector', true);
    expect(mcpRegistry.getPlugin('github-inspector')?.enabled).toBe(true);
  });
});
