import {
  McpPluginDefinition,
  McpToolDefinition,
  McpToolExecutionResult,
} from "./types";
import { searchMemories, type MemoryInput } from "./memory-search";
import { sanitizeInput } from "./sanitizer";
import { searchWeb, SEARCH_PROVIDER_LABELS } from "./research/search";
import {
  assertPublicUrl,
  assertPublicHost,
  defaultLookup,
  isSafePublicUrl,
  type HostLookup,
} from "./research/fetch-page";

export { isSafePublicUrl };

export async function validatePluginEndpoint(
  endpoint: string,
  lookup: HostLookup = defaultLookup,
): Promise<{ valid: boolean; error?: string }> {
  try {
    const url = assertPublicUrl(endpoint);
    await assertPublicHost(url, lookup);
    return { valid: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { valid: false, error: `SSRF validation failed: ${message}` };
  }
}

// Each built-in tool declares its own argument shape, so the registry stores handlers loosely.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolHandler = (args: any) => Promise<unknown>;

const MAX_TOOL_MEMORIES = 500;

/** Accept {id?, title, content} objects; anything else is ignored. */
function parseMemories(value: unknown): MemoryInput[] {
  if (!Array.isArray(value)) return [];
  const memories: MemoryInput[] = [];
  value.slice(0, MAX_TOOL_MEMORIES).forEach((item: unknown, index) => {
    if (typeof item !== "object" || item === null) return;
    const record = item as Record<string, unknown>;
    if (typeof record.content !== "string" || !record.content.trim()) return;
    memories.push({
      id:
        typeof record.id === "string" && record.id
          ? record.id
          : `memory-${index + 1}`,
      title:
        typeof record.title === "string" ? record.title : `Memory ${index + 1}`,
      content: record.content,
    });
  });
  return memories;
}

class McpRegistry {
  private plugins: Map<string, McpPluginDefinition> = new Map();
  private toolMap: Map<
    string,
    { pluginId: string; tool: McpToolDefinition; handler: ToolHandler }
  > = new Map();

  constructor() {
    this.registerBuiltInPlugins();
  }

  private registerBuiltInPlugins() {
    // 1. Web Search Plugin
    const webSearchPlugin: McpPluginDefinition = {
      id: "web-search",
      name: "Web Search",
      description:
        "Searches the web with Tavily, Brave, or DuckDuckGo (whichever is configured) and returns titles, URLs, and snippets.",
      category: "search",
      version: "1.2.0",
      author: "Nova Open Community",
      icon: "Globe",
      enabled: true,
      stats: { totalCalls: 0, avgLatencyMs: 0 },
      tools: [
        {
          name: "web_search",
          description:
            "Search the web and return result titles, URLs, and snippets.",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query or target topic",
              },
              maxResults: {
                type: "number",
                description: "Maximum number of source results (1-10)",
              },
            },
            required: ["query"],
          },
        },
      ],
    };

    // 2. Memory search over the caller's saved memories
    const memoryPlugin: McpPluginDefinition = {
      id: "memory-search",
      name: "Memory Search",
      description:
        "Search saved memories passed in the request. Uses embeddings when an embeddings provider is configured, otherwise keyword (BM25) scoring.",
      category: "memory",
      version: "3.0.0",
      author: "Nova Open Community",
      icon: "Database",
      enabled: true,
      stats: { totalCalls: 0, avgLatencyMs: 0 },
      tools: [
        {
          name: "vector_semantic_search",
          description:
            'Rank the given memories against a query. The result reports the method used ("embeddings" or "keyword") and the embedding model.',
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query" },
              memories: {
                type: "array",
                description:
                  "Memories to search: objects with id, title and content. Nova keeps memories in the browser, so callers must send them.",
              },
              topK: {
                type: "number",
                description: "Number of results to return (default 3, max 10)",
              },
            },
            required: ["query"],
          },
        },
      ],
    };

    // 3. GitHub Repository Inspector
    const githubPlugin: McpPluginDefinition = {
      id: "github-inspector",
      name: "GitHub Repository Inspector",
      description:
        "Inspect public open-source repositories, release notes, stars, and package manifests.",
      category: "integration",
      version: "1.1.0",
      author: "Nova Open Community",
      icon: "Github",
      enabled: true,
      stats: { totalCalls: 0, avgLatencyMs: 0 },
      tools: [
        {
          name: "inspect_github_repo",
          description:
            "Fetch repository metadata, open issues count, stars, and primary languages for any public repo.",
          inputSchema: {
            type: "object",
            properties: {
              repo: {
                type: "string",
                description:
                  "Repository identifier in owner/repo format (e.g. facebook/react)",
              },
            },
            required: ["repo"],
          },
        },
      ],
    };

    // Register plugins
    this.registerPlugin(webSearchPlugin, {
      web_search: async (args: { query: string; maxResults?: number }) => {
        const cleanQuery = sanitizeInput(args.query || "");
        const limit = Math.max(1, Math.min(args.maxResults || 5, 10));
        const outcome = await searchWeb(cleanQuery, limit);
        return {
          query: cleanQuery,
          provider: outcome.provider
            ? SEARCH_PROVIDER_LABELS[outcome.provider]
            : null,
          sources: outcome.results.map((r) => ({
            title: r.title,
            url: r.url,
            snippet: r.snippet,
          })),
          ...(outcome.provider
            ? {}
            : {
                error: `Web search failed: ${outcome.errors.map((e) => `${SEARCH_PROVIDER_LABELS[e.provider]}: ${e.message}`).join("; ")}`,
              }),
        };
      },
    });

    this.registerPlugin(memoryPlugin, {
      vector_semantic_search: async (args: {
        query?: unknown;
        topK?: unknown;
        memories?: unknown;
      }) => {
        const query = typeof args.query === "string" ? args.query.trim() : "";
        if (!query) throw new Error("query is required.");
        const topK = Math.max(
          1,
          Math.min(typeof args.topK === "number" ? args.topK : 3, 10),
        );
        const memories = parseMemories(args.memories);
        const result = await searchMemories(query, memories, { topK });
        return {
          ...result,
          searchedMemories: memories.length,
          ...(memories.length === 0
            ? {
                note: 'No memories were provided; pass them in the "memories" argument.',
              }
            : {}),
        };
      },
    });

    this.registerPlugin(githubPlugin, {
      inspect_github_repo: async (args: { repo: string }) => {
        const repo = (args.repo || "").trim();
        if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
          throw new Error("Repository must be in owner/repo format.");
        }
        const resp = await fetch(`https://api.github.com/repos/${repo}`, {
          headers: {
            "User-Agent": "Nova-Research-Assistant",
            Accept: "application/vnd.github+json",
          },
          signal: AbortSignal.timeout(6000),
        });
        if (!resp.ok) {
          throw new Error(
            `GitHub API returned HTTP ${resp.status} for ${repo}.`,
          );
        }
        const data = await resp.json();
        return {
          repo: data.full_name,
          description: data.description,
          stars: data.stargazers_count,
          forks: data.forks_count,
          openIssues: data.open_issues_count,
          license: data.license?.spdx_id || "Not specified",
          primaryLanguage: data.language,
          defaultBranch: data.default_branch,
        };
      },
    });
  }

  public registerPlugin(
    plugin: McpPluginDefinition,
    handlers?: Record<string, ToolHandler>,
  ) {
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

  public unregisterPlugin(id: string): boolean {
    const plugin = this.plugins.get(id);
    if (!plugin) return false;
    for (const tool of plugin.tools) {
      this.toolMap.delete(tool.name);
    }
    return this.plugins.delete(id);
  }

  public async registerCustomPlugin(
    plugin: McpPluginDefinition,
    lookupOrOptions?: HostLookup | { lookup?: HostLookup },
  ): Promise<{ success: boolean; error?: string }> {
    const lookup =
      typeof lookupOrOptions === "function"
        ? lookupOrOptions
        : (lookupOrOptions?.lookup ?? defaultLookup);

    if (plugin.endpoint !== undefined) {
      const validation = await validatePluginEndpoint(plugin.endpoint, lookup);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }
    }

    plugin.isCustom = true;
    plugin.stats = { totalCalls: 0, avgLatencyMs: 0 };

    // Register tool handlers for custom plugin
    for (const tool of plugin.tools) {
      this.toolMap.set(tool.name, {
        pluginId: plugin.id,
        tool,
        handler: async (args: Record<string, unknown>) => {
          if (!plugin.endpoint) {
            throw new Error(
              `Custom plugin "${plugin.name}" has no endpoint configured.`,
            );
          }
          const check = await validatePluginEndpoint(plugin.endpoint, lookup);
          if (!check.valid) {
            throw new Error(check.error || "SSRF validation failed");
          }
          const resp = await fetch(plugin.endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tool: tool.name, arguments: args }),
            signal: AbortSignal.timeout(5000),
          });
          if (!resp.ok) {
            throw new Error(
              `Custom MCP endpoint returned HTTP ${resp.status}.`,
            );
          }
          return await resp.json();
        },
      });
    }

    this.plugins.set(plugin.id, plugin);
    return { success: true };
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

  public async executeTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<McpToolExecutionResult> {
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
        plugin.stats.avgLatencyMs = Math.round(
          (plugin.stats.avgLatencyMs * (n - 1) + executionTimeMs) / n,
        );
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
        error:
          (err instanceof Error && err.message) ||
          `Error executing MCP tool "${name}"`,
        executionTimeMs,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

export const mcpRegistry = new McpRegistry();
