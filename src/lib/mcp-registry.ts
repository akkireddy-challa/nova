import { McpPluginDefinition, McpToolDefinition, McpToolExecutionResult } from './types';
import { embeddingsV2Store } from './embeddings-v2';
import { sanitizeInput } from './sanitizer';
import { searchWeb, SEARCH_PROVIDER_LABELS } from './research/search';

// Each built-in tool declares its own argument shape, so the registry stores handlers loosely.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolHandler = (args: any) => Promise<unknown>;

class McpRegistry {
  private plugins: Map<string, McpPluginDefinition> = new Map();
  private toolMap: Map<string, { pluginId: string; tool: McpToolDefinition; handler: ToolHandler }> = new Map();

  constructor() {
    this.registerBuiltInPlugins();
  }

  private registerBuiltInPlugins() {
    // 1. Web Search Plugin
    const webSearchPlugin: McpPluginDefinition = {
      id: 'web-search',
      name: 'Verified Web Crawler & Search',
      description: 'Ground-truth search across live web sources, technical documentation, and academic repositories.',
      category: 'search',
      version: '1.2.0',
      author: 'Nova Open Community',
      icon: 'Globe',
      enabled: true,
      stats: { totalCalls: 0, avgLatencyMs: 0 },
      tools: [
        {
          name: 'web_search',
          description: 'Search the live web for verified citations, current benchmarks, and technical documentation.',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'The search query or target topic' },
              maxResults: { type: 'number', description: 'Maximum number of source results (1-10)' }
            },
            required: ['query']
          }
        }
      ]
    };

    // 3. Embeddings v2 Vector Store
    const vectorPlugin: McpPluginDefinition = {
      id: 'embeddings-v2-vector',
      name: 'Embeddings v2 Dense Memory',
      description: '3072-dimensional vector search powered by gemini-embedding-2 with sliding chunk boundary overlap.',
      category: 'memory',
      version: '2.4.0',
      author: 'Nova Cognitive Lab',
      icon: 'Database',
      enabled: true,
      stats: { totalCalls: 0, avgLatencyMs: 0 },
      tools: [
        {
          name: 'vector_semantic_search',
          description: 'Query indexed knowledge memories and document chunks by geometric cosine similarity.',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Semantic search query string' },
              topK: { type: 'number', description: 'Number of top similar chunks to return (default 3)' }
            },
            required: ['query']
          }
        }
      ]
    };

    // 4. Associative Concept Graph
    const graphPlugin: McpPluginDefinition = {
      id: 'concept-graph',
      name: 'Layer 3 Associative Graph',
      description: 'Connects entity nodes, project guidelines, and recurring cross-workspace conceptual clusters.',
      category: 'memory',
      version: '1.0.0',
      author: 'Nova Cognitive Lab',
      icon: 'Network',
      enabled: true,
      stats: { totalCalls: 0, avgLatencyMs: 0 },
      tools: [
        {
          name: 'query_associative_graph',
          description: 'Discover connected topic clusters and cross-references for a specific concept node.',
          inputSchema: {
            type: 'object',
            properties: {
              concept: { type: 'string', description: 'Concept label or entity name to trace in the graph' }
            },
            required: ['concept']
          }
        }
      ]
    };

    // 5. GitHub Repository Inspector
    const githubPlugin: McpPluginDefinition = {
      id: 'github-inspector',
      name: 'GitHub Repository Inspector',
      description: 'Inspect public open-source repositories, release notes, stars, and package manifests.',
      category: 'integration',
      version: '1.1.0',
      author: 'Nova Open Community',
      icon: 'Github',
      enabled: true,
      stats: { totalCalls: 0, avgLatencyMs: 0 },
      tools: [
        {
          name: 'inspect_github_repo',
          description: 'Fetch repository metadata, open issues count, stars, and primary languages for any public repo.',
          inputSchema: {
            type: 'object',
            properties: {
              repo: { type: 'string', description: 'Repository identifier in owner/repo format (e.g. facebook/react)' }
            },
            required: ['repo']
          }
        }
      ]
    };

    // Register plugins
    this.registerPlugin(webSearchPlugin, {
      web_search: async (args: { query: string; maxResults?: number }) => {
        const cleanQuery = sanitizeInput(args.query || '');
        const limit = Math.max(1, Math.min(args.maxResults || 5, 10));
        const outcome = await searchWeb(cleanQuery, limit);
        return {
          query: cleanQuery,
          provider: outcome.provider ? SEARCH_PROVIDER_LABELS[outcome.provider] : null,
          sources: outcome.results.map(r => ({
            title: r.title,
            url: r.url,
            snippet: r.snippet,
          })),
          ...(outcome.provider
            ? {}
            : { error: `Web search failed: ${outcome.errors.map(e => `${SEARCH_PROVIDER_LABELS[e.provider]}: ${e.message}`).join('; ')}` }),
        };
      }
    });

    this.registerPlugin(vectorPlugin, {
      vector_semantic_search: async (args: { query: string; topK?: number }) => {
        const query = args.query || '';
        const topK = Math.min(args.topK || 3, 10);
        const results = await embeddingsV2Store.search(query, topK);
        return {
          query,
          matchCount: results.length,
          topMatches: results.map(r => ({
            title: r.sourceTitle,
            text: r.text.slice(0, 160) + (r.text.length > 160 ? '...' : ''),
            cosineSimilarity: Math.round((r.similarity ?? 0) * 100) / 100,
            chunkIndex: r.chunkIndex,
          })),
          vectorModel: 'gemini-embedding-2 (3072-dim)',
        };
      }
    });

    this.registerPlugin(graphPlugin, {
      query_associative_graph: async (args: { concept: string }) => {
        const concept = (args.concept || '').toLowerCase();
        const nodes = [
          { id: 'mcp', label: 'Model Context Protocol', category: 'Standard', connections: ['Agent Swarms', 'Tool Registry', 'Open APIs'] },
          { id: 'embeddings-v2', label: '3072-dim Vector Index', category: 'Memory', connections: ['Sliding Overlap', 'Cosine Ranking', 'Working Buffer'] },
          { id: 'multi-agent', label: 'Autonomous Swarm Deliberation', category: 'Architecture', connections: ['Lead Strategist', 'Cross-Verifier', 'Executive Synthesizer'] },
          { id: 'byom', label: 'Bring Your Own Model', category: 'Infrastructure', connections: ['Gemini 3.0', 'Claude 3.7', 'Ollama Local', 'DeepSeek R1'] },
        ];
        
        const matched = nodes.filter(n => n.id.includes(concept) || n.label.toLowerCase().includes(concept) || n.connections.some(c => c.toLowerCase().includes(concept)));
        return {
          searchedConcept: args.concept,
          totalNodesInGraph: nodes.length,
          matchingClusters: matched,
        };
      }
    });

    this.registerPlugin(githubPlugin, {
      inspect_github_repo: async (args: { repo: string }) => {
        const repo = (args.repo || '').trim();
        if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
          throw new Error('Repository must be in owner/repo format.');
        }
        const resp = await fetch(`https://api.github.com/repos/${repo}`, {
          headers: { 'User-Agent': 'Nova-Research-Assistant', Accept: 'application/vnd.github+json' },
          signal: AbortSignal.timeout(6000),
        });
        if (!resp.ok) {
          throw new Error(`GitHub API returned HTTP ${resp.status} for ${repo}.`);
        }
        const data = await resp.json();
        return {
          repo: data.full_name,
          description: data.description,
          stars: data.stargazers_count,
          forks: data.forks_count,
          openIssues: data.open_issues_count,
          license: data.license?.spdx_id || 'Not specified',
          primaryLanguage: data.language,
          defaultBranch: data.default_branch,
        };
      }
    });
  }

  public registerPlugin(plugin: McpPluginDefinition, handlers?: Record<string, ToolHandler>) {
    this.plugins.set(plugin.id, plugin);
    if (handlers) {
      for (const tool of plugin.tools) {
        if (handlers[tool.name]) {
          this.toolMap.set(tool.name, {
            pluginId: plugin.id,
            tool,
            handler: handlers[tool.name],
          });
        }
      }
    }
  }

  public getAllPlugins(): McpPluginDefinition[] {
    return Array.from(this.plugins.values());
  }

  public getPlugin(id: string): McpPluginDefinition | undefined {
    return this.plugins.get(id);
  }

  public togglePlugin(id: string, enabled: boolean): boolean {
    const plugin = this.plugins.get(id);
    if (plugin) {
      plugin.enabled = enabled;
      return true;
    }
    return false;
  }

  public registerCustomPlugin(plugin: McpPluginDefinition): void {
    plugin.isCustom = true;
    plugin.stats = { totalCalls: 0, avgLatencyMs: 0 };
    
    // Register tool handlers for custom plugin
    for (const tool of plugin.tools) {
      this.toolMap.set(tool.name, {
        pluginId: plugin.id,
        tool,
        handler: async (args: Record<string, unknown>) => {
          if (!plugin.endpoint) {
            throw new Error(`Custom plugin "${plugin.name}" has no endpoint configured.`);
          }
          const resp = await fetch(plugin.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tool: tool.name, arguments: args }),
            signal: AbortSignal.timeout(5000),
          });
          if (!resp.ok) {
            throw new Error(`Custom MCP endpoint returned HTTP ${resp.status}.`);
          }
          return await resp.json();
        }
      });
    }

    this.plugins.set(plugin.id, plugin);
  }

  public getAvailableTools(): McpToolDefinition[] {
    const tools: McpToolDefinition[] = [];
    for (const plugin of this.plugins.values()) {
      if (plugin.enabled) {
        tools.push(...plugin.tools);
      }
    }
    return tools;
  }

  public async executeTool(name: string, args: Record<string, unknown>): Promise<McpToolExecutionResult> {
    const startTime = performance.now();
    const entry = this.toolMap.get(name);

    if (!entry) {
      return {
        success: false,
        output: null,
        error: `Tool "${name}" is not registered in the MCP Registry.`,
        executionTimeMs: Math.round(performance.now() - startTime),
        timestamp: new Date().toISOString(),
      };
    }

    const plugin = this.plugins.get(entry.pluginId);
    if (plugin && !plugin.enabled) {
      return {
        success: false,
        output: null,
        error: `Tool "${name}" is part of plugin "${plugin.name}" which is currently disabled.`,
        executionTimeMs: Math.round(performance.now() - startTime),
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const output = await entry.handler(args);
      const executionTimeMs = Math.round(performance.now() - startTime);
      
      // Update telemetry
      if (plugin?.stats) {
        plugin.stats.totalCalls += 1;
        const n = plugin.stats.totalCalls;
        plugin.stats.avgLatencyMs = Math.round((plugin.stats.avgLatencyMs * (n - 1) + executionTimeMs) / n);
        plugin.stats.lastExecuted = new Date().toISOString();
      }

      return {
        success: true,
        output,
        executionTimeMs,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      const executionTimeMs = Math.round(performance.now() - startTime);
      return {
        success: false,
        output: null,
        error: (err instanceof Error && err.message) || `Error executing MCP tool "${name}"`,
        executionTimeMs,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

export const mcpRegistry = new McpRegistry();
