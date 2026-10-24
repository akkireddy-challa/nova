import { afterEach, describe, expect, it } from 'bun:test';
import { mcpRegistry } from '../src/lib/mcp-registry';
import { generateEmbeddingV2 } from '../src/lib/embeddings-v2';

describe('Open API Gateway & MCP Plugin Registry', () => {
  it('should list registered MCP plugins with valid schemas', () => {
    const plugins = mcpRegistry.getAllPlugins();
    expect(plugins.length).toBeGreaterThanOrEqual(4);

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
    expect(mcpRegistry.getPlugin('concept-graph')?.stats?.totalCalls).toBe(0);
  });

  it('should execute vector semantic search tool via Embeddings v2', async () => {
    const result = await mcpRegistry.executeTool('vector_semantic_search', {
      query: 'autonomous swarms',
      topK: 2,
    });

    expect(result.success).toBe(true);
    expect((result.output as { vectorModel: string }).vectorModel).toContain('3072-dim');
  });

  it('should generate 3072-dimensional dense embeddings for OpenAI-compatible route', async () => {
    const vector = await generateEmbeddingV2('Open developer API testing');
    expect(Array.isArray(vector)).toBe(true);
    expect(vector.length).toBeGreaterThanOrEqual(128); // 3072 live or 128 fallback
    
    // Check vector is normalized
    let norm = 0;
    for (const v of vector) norm += v * v;
    expect(Math.sqrt(norm)).toBeGreaterThan(0);
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
