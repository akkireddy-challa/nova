import { afterEach, describe, expect, it } from "bun:test";
import { NextRequest } from "next/server";
import { mcpRegistry } from "../src/lib/mcp-registry";
import { POST as postToolsRoute } from "../src/app/api/v1/tools/route";

describe("Open API Gateway & MCP Plugin Registry", () => {
  it("should list registered MCP plugins with valid schemas", () => {
    const plugins = mcpRegistry.getAllPlugins();
    expect(plugins.length).toBeGreaterThanOrEqual(3);

    const searchPlugin = plugins.find((p) => p.id === "web-search");
    expect(searchPlugin).toBeDefined();
    expect(searchPlugin?.tools.length).toBeGreaterThan(0);
    expect(searchPlugin?.tools[0].name).toBe("web_search");
  });

  it("should not expose server-side code execution", async () => {
    const result = await mcpRegistry.executeTool("execute_code", {
      code: "return globalThis.process.env",
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
    mcpRegistry.unregisterPlugin("custom-test");
    mcpRegistry.unregisterPlugin("valid-public-plugin");
    mcpRegistry.unregisterPlugin("route-public-plugin");
  });

  function mockFetch(
    handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
  ) {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) =>
      handler(
        String(input instanceof Request ? input.url : input),
        init,
      )) as typeof fetch;
  }

  const ddgHtml = `
    <h2 class="result__title"><a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fmodelcontextprotocol.io%2Fspecification&amp;rut=x">MCP <b>Specification</b></a></h2>
    <a class="result__snippet" href="#">The Model Context Protocol spec.</a>
    <h2 class="result__title"><a rel="nofollow" class="result__a" href="https://github.com/modelcontextprotocol">modelcontextprotocol &middot; GitHub</a></h2>
    <a class="result__snippet" href="#">Org page.</a>`;

  it("should execute web search tool and return real parsed sources", async () => {
    delete process.env.TAVILY_API_KEY;
    delete process.env.BRAVE_API_KEY;
    delete process.env.SEARXNG_URL;
    mockFetch(
      () =>
        new Response(ddgHtml, {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
    );
    const result = await mcpRegistry.executeTool("web_search", {
      query: "Model Context Protocol specification",
      maxResults: 2,
    });

    expect(result.success).toBe(true);
    const output = result.output as {
      query: string;
      provider: string;
      sources: { url: string; title: string }[];
      error?: string;
    };
    expect(output.query).toBe("Model Context Protocol specification");
    expect(output.provider).toBe("DuckDuckGo");
    expect(output.error).toBeUndefined();
    expect(output.sources.map((s) => s.url)).toEqual([
      "https://modelcontextprotocol.io/specification",
      "https://github.com/modelcontextprotocol",
    ]);
    expect(output.sources[0].title).toBe("MCP Specification");
  });

  it("should return an empty list with an error when web search fails", async () => {
    delete process.env.TAVILY_API_KEY;
    delete process.env.BRAVE_API_KEY;
    delete process.env.SEARXNG_URL;
    mockFetch(() => new Response("unavailable", { status: 503 }));
    const result = await mcpRegistry.executeTool("web_search", {
      query: "anything",
    });

    expect(result.success).toBe(true);
    const output = result.output as { sources: unknown[]; error?: string };
    expect(output.sources).toEqual([]);
    expect(output.error).toContain("DuckDuckGo");
  });

  it("should return real GitHub data or an error, never fabricated repo data", async () => {
    mockFetch((url) => {
      if (url.endsWith("/repos/facebook/react")) {
        return Response.json({
          full_name: "facebook/react",
          description: "UI library",
          stargazers_count: 5,
          forks_count: 1,
          open_issues_count: 2,
          license: { spdx_id: "MIT" },
          language: "JavaScript",
          default_branch: "main",
        });
      }
      return new Response("Not Found", { status: 404 });
    });

    const ok = await mcpRegistry.executeTool("inspect_github_repo", {
      repo: "facebook/react",
    });
    expect(ok.success).toBe(true);
    expect((ok.output as { stars: number }).stars).toBe(5);

    const missing = await mcpRegistry.executeTool("inspect_github_repo", {
      repo: "nobody/nothing",
    });
    expect(missing.success).toBe(false);
    expect(missing.output).toBeNull();
    expect(missing.error).toContain("404");
  });

  it("should return an error for custom plugins without a reachable endpoint", async () => {
    await mcpRegistry.registerCustomPlugin({
      id: "custom-test",
      name: "Custom Test",
      description: "test",
      category: "custom",
      version: "0.0.1",
      author: "test",
      icon: "Box",
      enabled: true,
      tools: [
        {
          name: "custom_test_tool",
          description: "x",
          inputSchema: { type: "object", properties: {} },
        },
      ],
    });
    const result = await mcpRegistry.executeTool("custom_test_tool", {});
    expect(result.success).toBe(false);
    expect(result.error).toContain("no endpoint");
  });

  it("should reject registering custom plugins with private or loopback URLs (SSRF protection)", async () => {
    const blockedEndpoints = [
      "http://127.0.0.1:8080/mcp",
      "http://169.254.169.254/mcp",
      "http://localhost:8080/mcp",
      "http://10.0.0.1:8080/mcp",
      "http://172.16.0.1:8080/mcp",
      "http://192.168.1.1:8080/mcp",
      "ftp://example.com/mcp",
      "http://internal-host/mcp",
    ];

    for (const endpoint of blockedEndpoints) {
      const result = await mcpRegistry.registerCustomPlugin({
        id: `blocked-test-${endpoint.replace(/[^a-z0-9]/gi, "")}`,
        name: "Blocked Test",
        description: "Should fail SSRF",
        category: "custom",
        version: "1.0.0",
        author: "test",
        icon: "Server",
        enabled: true,
        endpoint,
        tools: [
          {
            name: `blocked_tool_${endpoint.replace(/[^a-z0-9]/gi, "")}`,
            description: "x",
            inputSchema: { type: "object", properties: {} },
          },
        ],
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/SSRF validation failed/i);
    }

    // Verify unresolved hostnames and private-resolving hostnames are also rejected
    const unresolvedResult = await mcpRegistry.registerCustomPlugin(
      {
        id: "unresolved-test",
        name: "Unresolved",
        description: "fails lookup",
        category: "custom",
        version: "1.0.0",
        author: "test",
        icon: "Server",
        enabled: true,
        endpoint: "https://unresolved-test-domain-123456.invalid/mcp",
        tools: [
          {
            name: "unresolved_tool",
            description: "x",
            inputSchema: { type: "object", properties: {} },
          },
        ],
      },
      async () => [],
    );
    expect(unresolvedResult.success).toBe(false);
    expect(unresolvedResult.error).toContain("host did not resolve");

    const privateHostResult = await mcpRegistry.registerCustomPlugin(
      {
        id: "private-host-test",
        name: "Private Host",
        description: "resolves to private IP",
        category: "custom",
        version: "1.0.0",
        author: "test",
        icon: "Server",
        enabled: true,
        endpoint: "https://private-host.test/mcp",
        tools: [
          {
            name: "private_host_tool",
            description: "x",
            inputSchema: { type: "object", properties: {} },
          },
        ],
      },
      async () => ["10.0.0.5"],
    );
    expect(privateHostResult.success).toBe(false);
    expect(privateHostResult.error).toContain(
      "host resolves to a private address",
    );

    // Ensure none of the blocked tools were added to available tools
    const available = mcpRegistry.getAvailableTools();
    expect(available.some((t) => t.name.startsWith("blocked_tool"))).toBe(
      false,
    );
    expect(available.some((t) => t.name === "unresolved_tool")).toBe(false);
    expect(available.some((t) => t.name === "private_host_tool")).toBe(false);
  });

  it("should reject SSRF and invalid payloads in POST /api/v1/tools register_plugin", async () => {
    // 1. SSRF loopback endpoint rejected with 400
    const ssrfReq = new NextRequest("http://localhost/api/v1/tools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "register_plugin",
        plugin: {
          name: "Malicious Plugin",
          endpoint: "http://127.0.0.1:8080/mcp",
          tools: [{ name: "steal_creds", description: "steal" }],
        },
      }),
    });
    const ssrfResp = await postToolsRoute(ssrfReq);
    expect(ssrfResp.status).toBe(400);
    const ssrfData = await ssrfResp.json();
    expect(ssrfData.success).toBe(false);
    expect(ssrfData.error).toMatch(/SSRF validation failed/i);

    // 2. Metadata SSRF rejected with 400
    const metaReq = new NextRequest("http://localhost/api/v1/tools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "register_plugin",
        plugin: {
          name: "Metadata Exfil",
          endpoint: "http://169.254.169.254/mcp",
          tools: [{ name: "exfil", description: "exfil" }],
        },
      }),
    });
    const metaResp = await postToolsRoute(metaReq);
    expect(metaResp.status).toBe(400);

    // 3. Missing required name
    const noNameReq = new NextRequest("http://localhost/api/v1/tools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "register_plugin",
        plugin: {
          name: "",
          endpoint: "https://example.com/mcp",
          tools: [{ name: "t1", description: "d1" }],
        },
      }),
    });
    const noNameResp = await postToolsRoute(noNameReq);
    expect(noNameResp.status).toBe(400);

    // 4. Missing required endpoint
    const noEndpointReq = new NextRequest("http://localhost/api/v1/tools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "register_plugin",
        plugin: {
          name: "Valid Name",
          endpoint: "",
          tools: [{ name: "t1", description: "d1" }],
        },
      }),
    });
    const noEndpointResp = await postToolsRoute(noEndpointReq);
    expect(noEndpointResp.status).toBe(400);

    // 5. Empty tools array
    const noToolsReq = new NextRequest("http://localhost/api/v1/tools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "register_plugin",
        plugin: {
          name: "Valid Name",
          endpoint: "https://example.com/mcp",
          tools: [],
        },
      }),
    });
    const noToolsResp = await postToolsRoute(noToolsReq);
    expect(noToolsResp.status).toBe(400);
  });

  it("should register custom plugin with valid public URL and make tools available", async () => {
    const regResult = await mcpRegistry.registerCustomPlugin({
      id: "valid-public-plugin",
      name: "Valid Public MCP",
      description: "A verified public MCP service",
      category: "custom",
      version: "1.0.0",
      author: "Nova Community",
      icon: "Server",
      enabled: true,
      endpoint: "http://93.184.216.34/mcp",
      tools: [
        {
          name: "valid_public_echo",
          description: "Echoes message from remote MCP server",
          inputSchema: {
            type: "object",
            properties: {
              message: { type: "string", description: "Text message" },
            },
          },
        },
      ],
    });

    expect(regResult.success).toBe(true);
    expect(regResult.error).toBeUndefined();

    // Verify tool is now available in registry
    const available = mcpRegistry.getAvailableTools();
    const found = available.find((t) => t.name === "valid_public_echo");
    expect(found).toBeDefined();
    expect(found?.description).toBe("Echoes message from remote MCP server");

    // Also verify registration via POST /api/v1/tools route
    const routeReq = new NextRequest("http://localhost/api/v1/tools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "register_plugin",
        plugin: {
          id: "route-public-plugin",
          name: "Route Public Plugin",
          description: "Registered via API route",
          endpoint: "http://93.184.216.34/api/mcp",
          tools: [
            {
              name: "route_tool_test",
              description: "Tool registered via route",
            },
          ],
        },
      }),
    });
    const routeResp = await postToolsRoute(routeReq);
    expect(routeResp.status).toBe(200);
    const routeData = await routeResp.json();
    expect(routeData.success).toBe(true);
    expect(routeData.plugin.name).toBe("Route Public Plugin");
    expect(
      mcpRegistry.getAvailableTools().some((t) => t.name === "route_tool_test"),
    ).toBe(true);
  });

  it("should execute custom tool calling endpoint and handle responses or errors cleanly", async () => {
    // Register custom plugin with valid public IP
    await mcpRegistry.registerCustomPlugin({
      id: "valid-public-plugin",
      name: "Valid Public MCP",
      description: "Testing tool execution",
      category: "custom",
      version: "1.0.0",
      author: "Tester",
      icon: "Server",
      enabled: true,
      endpoint: "http://93.184.216.34/mcp",
      tools: [
        {
          name: "custom_exec_tool",
          description: "Executes remote action",
          inputSchema: { type: "object", properties: {} },
        },
      ],
    });

    // Case 1: Successful response from custom endpoint
    mockFetch((url, init) => {
      expect(url).toBe("http://93.184.216.34/mcp");
      expect(init?.method).toBe("POST");
      return Response.json({
        status: "completed",
        echo: JSON.parse(String(init?.body)),
      });
    });

    const successRes = await mcpRegistry.executeTool("custom_exec_tool", {
      greeting: "hello mcp",
    });
    expect(successRes.success).toBe(true);
    expect(successRes.error).toBeUndefined();
    const output = successRes.output as {
      status: string;
      echo: { tool: string; arguments: { greeting: string } };
    };
    expect(output.status).toBe("completed");
    expect(output.echo.arguments.greeting).toBe("hello mcp");

    // Case 2: Custom endpoint returns HTTP 500 error
    mockFetch(() => new Response("Internal Server Error", { status: 500 }));
    const serverErrRes = await mcpRegistry.executeTool("custom_exec_tool", {});
    expect(serverErrRes.success).toBe(false);
    expect(serverErrRes.error).toContain("HTTP 500");

    // Case 3: Network / connection failure handled cleanly
    mockFetch(() => {
      throw new TypeError("Connection refused");
    });
    const netErrRes = await mcpRegistry.executeTool("custom_exec_tool", {});
    expect(netErrRes.success).toBe(false);
    expect(netErrRes.error).toContain("Connection refused");
  });

  it("should start plugin stats at zero instead of invented numbers", () => {
    for (const plugin of mcpRegistry
      .getAllPlugins()
      .filter((p) => !p.isCustom)) {
      expect(plugin.stats?.totalCalls ?? 0).toBeGreaterThanOrEqual(0);
    }
    expect(mcpRegistry.getPlugin("memory-search")?.stats?.totalCalls).toBe(0);
  });

  it("does not register the removed hardcoded concept graph", () => {
    expect(mcpRegistry.getPlugin("concept-graph")).toBeUndefined();
    expect(mcpRegistry.getAvailableTools().map((t) => t.name)).not.toContain(
      "query_associative_graph",
    );
    for (const plugin of mcpRegistry.getAllPlugins()) {
      expect(`${plugin.description} ${plugin.author}`).not.toMatch(
        /3072|Cognitive Lab/,
      );
    }
  });

  it("should search the memories it is given and report the method used", async () => {
    const saved = {
      openai: process.env.OPENAI_API_KEY,
      gemini: process.env.GEMINI_API_KEY,
      google: process.env.GOOGLE_API_KEY,
      ollama: process.env.OLLAMA_BASE_URL,
    };
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    process.env.OLLAMA_BASE_URL = "http://ollama.invalid:11434";
    mockFetch(() => {
      throw new TypeError("fetch failed");
    });
    try {
      const result = await mcpRegistry.executeTool("vector_semantic_search", {
        query: "deployment checklist",
        topK: 2,
        memories: [
          {
            id: "a",
            title: "Deployment",
            content: "Run the checklist before every deployment.",
          },
          { id: "b", title: "Lunch", content: "Sandwiches on Fridays." },
          "not a memory",
        ],
      });
      expect(result.success).toBe(true);
      const output = result.output as {
        method: string;
        searchedMemories: number;
        results: Array<{ memoryId: string }>;
      };
      expect(output.method).toBe("keyword");
      expect(output.searchedMemories).toBe(2);
      expect(output.results.map((r) => r.memoryId)).toEqual(["a"]);

      const empty = await mcpRegistry.executeTool("vector_semantic_search", {
        query: "anything",
      });
      expect(empty.success).toBe(true);
      expect(
        (empty.output as { results: unknown[]; note?: string }).results,
      ).toEqual([]);
      expect((empty.output as { note?: string }).note).toContain("memories");
    } finally {
      for (const [key, value] of [
        ["OPENAI_API_KEY", saved.openai],
        ["GEMINI_API_KEY", saved.gemini],
        ["GOOGLE_API_KEY", saved.google],
        ["OLLAMA_BASE_URL", saved.ollama],
      ] as const) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  it("should support enabling and disabling plugins gracefully", () => {
    const disabled = mcpRegistry.togglePlugin("github-inspector", false);
    expect(disabled).toBe(true);

    const plugin = mcpRegistry.getPlugin("github-inspector");
    expect(plugin?.enabled).toBe(false);

    // Re-enable
    mcpRegistry.togglePlugin("github-inspector", true);
    expect(mcpRegistry.getPlugin("github-inspector")?.enabled).toBe(true);
  });
});
