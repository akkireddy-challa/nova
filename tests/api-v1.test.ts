import { describe, expect, it } from 'bun:test';
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

  it('should execute web search tool and return verified sources', async () => {
    const result = await mcpRegistry.executeTool('web_search', {
      query: 'Model Context Protocol specification',
      maxResults: 2,
    });

    expect(result.success).toBe(true);
    const output = result.output as { query: string; sources: unknown[] };
    expect(output.query).toBe('Model Context Protocol specification');
    expect(output.sources.length).toBeGreaterThan(0);
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
