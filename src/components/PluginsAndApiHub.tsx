'use client';

import React, { useState, useEffect } from 'react';
import { 
  Puzzle, 
  Terminal, 
  Globe, 
  Database, 
  Network, 
  GitBranch, 
  Play, 
  Copy, 
  Check, 
  Code2, 
  Cpu, 
  Plus, 
  ExternalLink,
  Sparkles,
  Zap,
  Activity,
  ShieldCheck,
  Server,
  Layers
} from 'lucide-react';
import { sound } from '@/lib/sound';
import { McpPluginDefinition, McpToolDefinition, McpToolExecutionResult } from '@/lib/types';

export function PluginsAndApiHub() {
  const [activeTab, setActiveTab] = useState<'plugins' | 'api' | 'contribute'>('plugins');
  const [plugins, setPlugins] = useState<McpPluginDefinition[]>([]);
  const [loadingPlugins, setLoadingPlugins] = useState(true);
  
  // Plugin execution state
  const [executingTool, setExecutingTool] = useState<string | null>(null);
  const [toolInputs, setToolInputs] = useState<Record<string, Record<string, string>>>({
    web_search: { query: 'Model Context Protocol 2026 adoption' },
    execute_code: { code: 'const nums = [1, 2, 3, 4, 5];\nconsole.log("Sum:", nums.reduce((a, b) => a + b, 0));\nreturn nums.map(n => n * 2);' },
    vector_semantic_search: { query: 'autonomous multi-agent swarm division of labor' },
    query_associative_graph: { concept: 'mcp' },
    inspect_github_repo: { repo: 'facebook/react' }
  });
  const [executionResults, setExecutionResults] = useState<Record<string, McpToolExecutionResult | null>>({});

  // Custom MCP modal
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customEndpoint, setCustomEndpoint] = useState('http://localhost:8080/mcp');
  const [customToolName, setCustomToolName] = useState('custom_tool');

  // API Playground state
  const [apiEndpoint, setApiEndpoint] = useState<'/api/v1/chat/completions' | '/api/v1/embeddings' | '/api/v1/models' | '/api/v1/tools' | '/api/v1/mlops'>('/api/v1/chat/completions');
  const [apiModel, setApiModel] = useState('gemini-3-flash-preview');
  const [apiPrompt, setApiPrompt] = useState('What makes Model Context Protocol (MCP) and Embeddings v2 better than legacy proprietary plugins?');
  const [apiIsSending, setApiIsSending] = useState(false);
  const [apiResponse, setApiResponse] = useState<string | null>(null);
  const [apiLatency, setApiLatency] = useState<number | null>(null);
  const [apiStatusCode, setApiStatusCode] = useState<number | null>(null);
  const [codeSnippetLanguage, setCodeSnippetLanguage] = useState<'python' | 'typescript' | 'curl' | 'langchain'>('python');
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Contributor scaffolding state
  const [scaffoldName, setScaffoldName] = useState('MyCustomIntegration');
  const [scaffoldToolName, setScaffoldToolName] = useState('fetch_external_data');
  const [copiedScaffold, setCopiedScaffold] = useState(false);

  // Fetch plugins on mount
  useEffect(() => {
    fetchPlugins();
  }, []);

  const fetchPlugins = async () => {
    try {
      setLoadingPlugins(true);
      const res = await fetch('/api/v1/tools');
      if (res.ok) {
        const data = await res.json();
        setPlugins(data.plugins || []);
      }
    } catch (err) {
      console.error('Failed to load plugins:', err);
    } finally {
      setLoadingPlugins(false);
    }
  };

  const handleTogglePlugin = async (pluginId: string, currentEnabled: boolean) => {
    sound.tap();
    const newEnabled = !currentEnabled;
    setPlugins(prev => prev.map(p => p.id === pluginId ? { ...p, enabled: newEnabled } : p));

    try {
      await fetch('/api/v1/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_plugin', pluginId, enabled: newEnabled })
      });
      sound.completion();
    } catch {
      // Revert on error
      setPlugins(prev => prev.map(p => p.id === pluginId ? { ...p, enabled: currentEnabled } : p));
    }
  };

  const handleExecuteTool = async (tool: McpToolDefinition) => {
    sound.tap();
    setExecutingTool(tool.name);
    const args = toolInputs[tool.name] || {};

    try {
      const res = await fetch('/api/v1/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: tool.name, arguments: args })
      });
      const data = await res.json();
      setExecutionResults(prev => ({ ...prev, [tool.name]: data }));
      sound.success();
    } catch (err: any) {
      setExecutionResults(prev => ({
        ...prev,
        [tool.name]: {
          success: false,
          output: null,
          error: err.message || 'Execution failed',
          executionTimeMs: 0,
          timestamp: new Date().toISOString()
        }
      }));
    } finally {
      setExecutingTool(null);
    }
  };

  const handleSendApiPlayground = async () => {
    sound.tap();
    setApiIsSending(true);
    setApiResponse(null);
    setApiStatusCode(null);
    const start = performance.now();

    try {
      let body: any = null;
      let method = 'POST';

      if (apiEndpoint === '/api/v1/chat/completions') {
        body = JSON.stringify({
          model: apiModel,
          messages: [{ role: 'user', content: apiPrompt }],
          temperature: 0.7,
        });
      } else if (apiEndpoint === '/api/v1/embeddings') {
        body = JSON.stringify({
          input: apiPrompt,
          model: 'gemini-embedding-2'
        });
      } else if (apiEndpoint === '/api/v1/models') {
        method = 'GET';
      } else if (apiEndpoint === '/api/v1/tools') {
        method = 'GET';
      } else if (apiEndpoint === '/api/v1/mlops') {
        method = 'GET';
      }

      const res = await fetch(apiEndpoint, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body || undefined,
      });

      const elapsed = Math.round(performance.now() - start);
      setApiLatency(elapsed);
      setApiStatusCode(res.status);

      const json = await res.json();
      setApiResponse(JSON.stringify(json, null, 2));
      sound.success();
    } catch (err: any) {
      setApiResponse(JSON.stringify({ error: err.message }, null, 2));
      setApiStatusCode(500);
    } finally {
      setApiIsSending(false);
    }
  };

  const getPluginIcon = (name: string) => {
    switch (name) {
      case 'Globe': return <Globe className="w-5 h-5 text-teal-400" />;
      case 'Terminal': return <Terminal className="w-5 h-5 text-emerald-400" />;
      case 'Database': return <Database className="w-5 h-5 text-purple-400" />;
      case 'Network': return <Network className="w-5 h-5 text-cyan-400" />;
      case 'Github': return <GitBranch className="w-5 h-5 text-amber-400" />;
      default: return <Puzzle className="w-5 h-5 text-teal-400" />;
    }
  };

  const pythonSnippet = `from openai import OpenAI

# Drop-in replacement for OpenAI SDK pointing directly to Nova!
client = OpenAI(
    base_url="http://localhost:3000/api/v1",
    api_key="nova-local-key"
)

# 1. Chat Completion with 4-Layer Metacognitive Reasoning
response = client.chat.completions.create(
    model="gemini-3-flash-preview",
    messages=[
        {"role": "system", "content": "You are a senior systems engineer."},
        {"role": "user", "content": "${apiPrompt}"}
    ]
)
print(response.choices[0].message.content)

# 2. Embeddings v2 (3072 dimensions with sliding chunk overlap)
embedding_resp = client.embeddings.create(
    model="gemini-embedding-2",
    input="Autonomous agent swarm architecture"
)
print("Vector length:", len(embedding_resp.data[0].embedding))`;

  const tsSnippet = `import OpenAI from 'openai';

// Point any TypeScript / Next.js app to Nova
const openai = new OpenAI({
  baseURL: 'http://localhost:3000/api/v1',
  apiKey: 'nova-local-key',
});

async function run() {
  const completion = await openai.chat.completions.create({
    model: 'gemini-3-flash-preview',
    messages: [{ role: 'user', content: '${apiPrompt}' }],
  });
  console.log(completion.choices[0].message.content);
}

run();`;

  const curlSnippet = `curl -X POST http://localhost:3000/api/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer nova-local-key" \\
  -d '{
    "model": "gemini-3-flash-preview",
    "messages": [
      {"role": "user", "content": "${apiPrompt}"}
    ]
  }'`;

  const langchainSnippet = `from langchain_openai import ChatOpenAI

# Drop-in LLM for LangChain agents
llm = ChatOpenAI(
    model="gemini-3-flash-preview",
    openai_api_base="http://localhost:3000/api/v1",
    openai_api_key="nova-local-key",
    temperature=0.7
)

response = llm.invoke("${apiPrompt}")
print(response.content)`;

  const getActiveSnippet = () => {
    switch (codeSnippetLanguage) {
      case 'python': return pythonSnippet;
      case 'typescript': return tsSnippet;
      case 'curl': return curlSnippet;
      case 'langchain': return langchainSnippet;
    }
  };

  const copyToClipboard = (text: string, setter: (val: boolean) => void) => {
    sound.tap();
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const contributorBoilerplate = `// Step 1: Define your custom MCP Plugin in Nova
import { McpPluginDefinition } from '@/lib/types';

export const ${scaffoldName}Plugin: McpPluginDefinition = {
  id: '${scaffoldName.toLowerCase()}',
  name: '${scaffoldName} Toolset',
  description: 'Community-contributed tool connecting external data to Nova.',
  category: 'integration',
  version: '1.0.0',
  author: 'Open Source Contributor',
  icon: 'Zap',
  enabled: true,
  tools: [
    {
      name: '${scaffoldToolName}',
      description: 'Executes ${scaffoldToolName} against target service.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Target query parameter' },
        },
        required: ['query'],
      },
    },
  ],
};

// Step 2: Register in mcpRegistry (src/lib/mcp-registry.ts)
// mcpRegistry.registerPlugin(${scaffoldName}Plugin, {
//   ${scaffoldToolName}: async (args) => {
//     return { success: true, result: "Processed: " + args.query };
//   }
// });`;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B0F17] text-slate-100 overflow-y-auto">
      {/* Top Banner */}
      <div className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-8 py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-7xl mx-auto">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center gap-1.5">
                <Puzzle className="w-3.5 h-3.5" /> Model Context Protocol (MCP) & Open APIs
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
                Embeddings v2 Ready
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Plugin Ecosystem & Developer Gateway
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Equip your swarms with live MCP tools or drop Nova into Cursor, LangChain, and Python code via standard OpenAI-compatible endpoints.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => { sound.tap(); setShowCustomModal(true); }}
              className="px-3.5 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-teal-400" />
              Add Custom MCP Server
            </button>
            <a
              href="https://github.com/nova-autonomous/nova"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-lg text-xs font-medium bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 transition flex items-center gap-1.5 cursor-pointer"
            >
              <GitBranch className="w-3.5 h-3.5" />
              Contribute Plugin
            </a>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 max-w-7xl mx-auto border-b border-slate-800/80 -mb-6 pb-2">
          <button
            onClick={() => { sound.tap(); setActiveTab('plugins'); }}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'plugins' 
                ? 'bg-teal-500/10 text-teal-300 border border-teal-500/30 shadow-sm' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Puzzle className="w-4 h-4" />
            MCP Plugins ({plugins.length})
          </button>
          <button
            onClick={() => { sound.tap(); setActiveTab('api'); }}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'api' 
                ? 'bg-teal-500/10 text-teal-300 border border-teal-500/30 shadow-sm' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Code2 className="w-4 h-4" />
            Open API Playground (/api/v1/)
          </button>
          <button
            onClick={() => { sound.tap(); setActiveTab('contribute'); }}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'contribute' 
                ? 'bg-teal-500/10 text-teal-300 border border-teal-500/30 shadow-sm' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Zap className="w-4 h-4" />
            Contributor Guide & Scaffold
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
        
        {/* ================= TAB 1: PLUGINS ================= */}
        {activeTab === 'plugins' && (
          <div className="space-y-6">
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-teal-500/10 text-teal-400">
                  <Puzzle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xl font-bold text-white">{plugins.filter(p => p.enabled).length} / {plugins.length}</div>
                  <div className="text-xs text-slate-400">Active MCP Plugins</div>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xl font-bold text-white">3072-dim</div>
                  <div className="text-xs text-slate-400">Embeddings v2 Vectors</div>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xl font-bold text-white">180ms</div>
                  <div className="text-xs text-slate-400">Average Tool Latency</div>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xl font-bold text-white">Zero Lock-In</div>
                  <div className="text-xs text-slate-400">Standard MCP Protocol</div>
                </div>
              </div>
            </div>

            {/* Plugin Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {plugins.map(plugin => {
                const isCustom = plugin.isCustom;
                return (
                  <div 
                    key={plugin.id} 
                    className={`bg-slate-900/70 border rounded-xl p-5 flex flex-col justify-between transition ${
                      plugin.enabled ? 'border-slate-800 hover:border-slate-700' : 'border-slate-800/40 opacity-70'
                    }`}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700/80">
                            {getPluginIcon(plugin.icon)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-white text-base">{plugin.name}</h3>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                                v{plugin.version}
                              </span>
                              {isCustom && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                                  Custom MCP
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">By {plugin.author}</div>
                          </div>
                        </div>

                        {/* Toggle Switch */}
                        <button
                          onClick={() => handleTogglePlugin(plugin.id, plugin.enabled)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition cursor-pointer ${
                            plugin.enabled ? 'bg-teal-500' : 'bg-slate-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${
                              plugin.enabled ? 'translate-x-4' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                        {plugin.description}
                      </p>

                      {/* Tool Definition & Live Tester */}
                      <div className="mt-4 space-y-3">
                        {plugin.tools.map(tool => {
                          const result = executionResults[tool.name];
                          const isExecuting = executingTool === tool.name;

                          return (
                            <div key={tool.name} className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 text-xs">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-mono text-teal-400 font-semibold">{tool.name}()</span>
                                <span className="text-[10px] text-slate-500">MCP Tool</span>
                              </div>
                              <p className="text-slate-400 text-[11px] mb-2">{tool.description}</p>

                              {/* Interactive Inputs */}
                              <div className="space-y-1.5 pt-1 border-t border-slate-800/60">
                                {Object.entries(tool.inputSchema.properties).map(([paramName, paramSchema]) => (
                                  <div key={paramName} className="flex flex-col gap-1">
                                    <label className="text-[10px] font-mono text-slate-400">
                                      {paramName} <span className="text-slate-500">({paramSchema.type})</span>
                                    </label>
                                    {paramName === 'code' ? (
                                      <textarea
                                        rows={3}
                                        value={toolInputs[tool.name]?.[paramName] || ''}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setToolInputs(prev => ({
                                            ...prev,
                                            [tool.name]: { ...(prev[tool.name] || {}), [paramName]: val }
                                          }));
                                        }}
                                        className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 font-mono text-[11px] text-slate-200 focus:outline-none focus:border-teal-500"
                                      />
                                    ) : (
                                      <input
                                        type="text"
                                        value={toolInputs[tool.name]?.[paramName] || ''}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setToolInputs(prev => ({
                                            ...prev,
                                            [tool.name]: { ...(prev[tool.name] || {}), [paramName]: val }
                                          }));
                                        }}
                                        className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 font-mono text-[11px] text-slate-200 focus:outline-none focus:border-teal-500"
                                      />
                                    )}
                                  </div>
                                ))}

                                <div className="flex items-center justify-between pt-2">
                                  <button
                                    onClick={() => handleExecuteTool(tool)}
                                    disabled={!plugin.enabled || isExecuting}
                                    className="px-2.5 py-1 rounded bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 transition text-[11px] font-medium flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                  >
                                    <Play className="w-3 h-3" />
                                    {isExecuting ? 'Executing...' : 'Run Tool'}
                                  </button>

                                  {result && (
                                    <span className="text-[10px] font-mono text-slate-400">
                                      {result.executionTimeMs}ms • {result.success ? '✓ 200 OK' : '✗ Failed'}
                                    </span>
                                  )}
                                </div>

                                {/* Result Preview */}
                                {result && (
                                  <div className="mt-2 p-2 rounded bg-slate-900/90 border border-slate-800 font-mono text-[10.5px] max-h-36 overflow-y-auto">
                                    <pre className="text-slate-300 whitespace-pre-wrap">
                                      {JSON.stringify(result.output || result.error, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Footer Stats */}
                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Total Calls: <strong className="text-slate-200">{plugin.stats?.totalCalls || 0}</strong></span>
                      <span>Avg Latency: <strong className="text-slate-200">{plugin.stats?.avgLatencyMs || 0}ms</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= TAB 2: OPEN API PLAYGROUND ================= */}
        {activeTab === 'api' && (
          <div className="space-y-6">
            {/* Header info */}
            <div className="bg-gradient-to-r from-teal-950/40 via-slate-900 to-purple-950/30 border border-teal-500/30 rounded-xl p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" /> OpenAI Drop-in Standard
                  </span>
                  <h2 className="text-xl font-bold text-white mt-1">Open Nova API Gateway</h2>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                    Connect Cursor, Claude Code, Windsurf, LangChain, or your custom Python/Node scripts directly to Nova. No code rewrites needed.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-xs text-teal-300">
                    Base URL: <strong className="text-white">http://localhost:3000/api/v1</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Request Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Request Form */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-teal-400" />
                    Request Parameters
                  </h3>
                  <span className="text-xs text-slate-400">Interactive Console</span>
                </div>

                {/* Endpoint selector */}
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Target Endpoint</label>
                  <select
                    value={apiEndpoint}
                    onChange={(e) => setApiEndpoint(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-mono text-teal-300 focus:outline-none focus:border-teal-500"
                  >
                    <option value="/api/v1/chat/completions">POST /api/v1/chat/completions (Multi-Model Chat)</option>
                    <option value="/api/v1/embeddings">POST /api/v1/embeddings (Embeddings v2 3072-dim)</option>
                    <option value="/api/v1/models">GET /api/v1/models (List Active Frontier Models)</option>
                    <option value="/api/v1/tools">GET /api/v1/tools (List Registered MCP Tools)</option>
                    <option value="/api/v1/mlops">GET /api/v1/mlops (MLOps Platform Telemetry & Circuit Breaker)</option>
                  </select>
                </div>

                {/* Model selector (for chat) */}
                {apiEndpoint === '/api/v1/chat/completions' && (
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">Model Engine</label>
                    <select
                      value={apiModel}
                      onChange={(e) => setApiModel(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500"
                    >
                      <option value="gemini-3-flash-preview">gemini-3-flash-preview (Ultra-fast Frontier Reasoning)</option>
                      <option value="gemini-2.5-flash">gemini-2.5-flash (Production Multi-Turn)</option>
                      <option value="claude-3-7-sonnet">claude-3-7-sonnet (Hybrid Reasoning)</option>
                      <option value="deepseek-r1">deepseek-r1 (Open Weights Reasoning)</option>
                      <option value="llama-3.3-70b-instruct">llama-3.3-70b-instruct (Local / Open-Source)</option>
                      <option value="ollama-local">ollama-local (Zero-Cost Offline)</option>
                    </select>
                  </div>
                )}

                {/* Prompt / Input Area */}
                {(apiEndpoint === '/api/v1/chat/completions' || apiEndpoint === '/api/v1/embeddings') && (
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      {apiEndpoint === '/api/v1/embeddings' ? 'Input Text to Embed' : 'User Message Prompt'}
                    </label>
                    <textarea
                      rows={4}
                      value={apiPrompt}
                      onChange={(e) => setApiPrompt(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500 font-mono"
                    />
                  </div>
                )}

                {/* Send Button */}
                <button
                  onClick={handleSendApiPlayground}
                  disabled={apiIsSending}
                  className="w-full py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-current" />
                  {apiIsSending ? 'Sending Request...' : 'Send API Request'}
                </button>
              </div>

              {/* Right Column: Response Viewer */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-purple-400" />
                      Live Response Stream
                    </h3>
                    <div className="flex items-center gap-2">
                      {apiStatusCode && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                          apiStatusCode === 200 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400'
                        }`}>
                          HTTP {apiStatusCode}
                        </span>
                      )}
                      {apiLatency && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                          {apiLatency}ms
                        </span>
                      )}
                    </div>
                  </div>

                  {/* JSON Display */}
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-[11px] h-[280px] overflow-y-auto">
                    {apiResponse ? (
                      <pre className="text-teal-300 whitespace-pre-wrap">{apiResponse}</pre>
                    ) : (
                      <div className="text-slate-500 h-full flex items-center justify-center text-center">
                        Hit &quot;Send API Request&quot; to test Nova&apos;s live response payload.
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span>Protocol: <strong>HTTP/1.1 REST + SSE</strong></span>
                  <span>Auth: <strong>Bearer Optional</strong></span>
                </div>
              </div>
            </div>

            {/* 1-Click Code Integration Snippets */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-cyan-400" />
                    1-Click Client SDK Snippets
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Copy and run directly in your terminal, IDE, or repository.
                  </p>
                </div>

                {/* Language switcher */}
                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  {(['python', 'typescript', 'curl', 'langchain'] as const).map(lang => (
                    <button
                      key={lang}
                      onClick={() => { sound.tap(); setCodeSnippetLanguage(lang); }}
                      className={`px-2.5 py-1 rounded text-xs font-mono transition cursor-pointer capitalize ${
                        codeSnippetLanguage === lang
                          ? 'bg-teal-500/20 text-teal-300 font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              {/* Code display */}
              <div className="relative">
                <pre className="bg-slate-950 border border-slate-800/80 rounded-lg p-4 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed">
                  {getActiveSnippet()}
                </pre>
                <button
                  onClick={() => copyToClipboard(getActiveSnippet(), setCopiedSnippet)}
                  className="absolute top-3 right-3 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSnippet ? 'Copied!' : 'Copy Code'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: CONTRIBUTOR GUIDE ================= */}
        {activeTab === 'contribute' && (
          <div className="space-y-6">
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> Open Source Extensibility
              </span>
              <h2 className="text-xl font-bold text-white mt-1">Why Nova is Built for Contributors</h2>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed max-w-3xl">
                Unlike closed-source assistants, Nova is designed so any developer can contribute a brand new Model Context Protocol (MCP) tool or LLM gateway in less than 50 lines of code. There are zero proprietary APIs, zero locked-in SDKs, and zero paywalls.
              </p>

              {/* 3 Steps */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4">
                  <div className="text-teal-400 font-bold text-sm mb-1">1. Define Schema</div>
                  <p className="text-xs text-slate-400">
                    Write standard JSON Schema for your tool inputs and outputs. Works with any MCP client.
                  </p>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4">
                  <div className="text-purple-400 font-bold text-sm mb-1">2. Implement Handler</div>
                  <p className="text-xs text-slate-400">
                    Write your async execution handler (API fetch, database query, CLI command, or ML model).
                  </p>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4">
                  <div className="text-cyan-400 font-bold text-sm mb-1">3. Submit PR</div>
                  <p className="text-xs text-slate-400">
                    Run <code className="text-teal-300">bun test</code> and open a Pull Request. CI validates it automatically!
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive Plugin Generator */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 space-y-4">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Live Plugin Boilerplate Generator
              </h3>
              <p className="text-xs text-slate-400">
                Type your plugin and tool name to generate ready-to-commit TypeScript code.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Plugin Name</label>
                  <input
                    type="text"
                    value={scaffoldName}
                    onChange={(e) => setScaffoldName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500"
                    placeholder="e.g. PostgresConnector"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Primary Tool Function Name</label>
                  <input
                    type="text"
                    value={scaffoldToolName}
                    onChange={(e) => setScaffoldToolName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500"
                    placeholder="e.g. query_database"
                  />
                </div>
              </div>

              <div className="relative mt-4">
                <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-teal-300 overflow-x-auto leading-relaxed">
                  {contributorBoilerplate}
                </pre>
                <button
                  onClick={() => copyToClipboard(contributorBoilerplate, setCopiedScaffold)}
                  className="absolute top-3 right-3 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedScaffold ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedScaffold ? 'Copied!' : 'Copy Boilerplate'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Modal: Add Custom MCP Server */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-teal-400" />
                Add Custom MCP Server
              </h3>
              <button
                onClick={() => setShowCustomModal(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Connect an external stdio or HTTP/SSE MCP server endpoint to Nova&apos;s multi-agent swarm.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Server Name</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Local SQLite MCP"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Endpoint URL (SSE / HTTP)</label>
                <input
                  type="text"
                  value={customEndpoint}
                  onChange={(e) => setCustomEndpoint(e.target.value)}
                  placeholder="http://localhost:8080/mcp"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Tool Identifier</label>
                <input
                  type="text"
                  value={customToolName}
                  onChange={(e) => setCustomToolName(e.target.value)}
                  placeholder="e.g. execute_query"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowCustomModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  sound.tap();
                  const newPlugin: McpPluginDefinition = {
                    id: customName.toLowerCase().replace(/\s+/g, '-'),
                    name: customName || 'Custom MCP Server',
                    description: `User-connected external MCP server at ${customEndpoint}`,
                    category: 'custom',
                    version: '1.0.0',
                    author: 'Local User',
                    icon: 'Server',
                    enabled: true,
                    isCustom: true,
                    endpoint: customEndpoint,
                    tools: [
                      {
                        name: customToolName || 'custom_tool',
                        description: `Custom tool hosted on ${customEndpoint}`,
                        inputSchema: {
                          type: 'object',
                          properties: {
                            payload: { type: 'string', description: 'Arguments payload' }
                          }
                        }
                      }
                    ]
                  };
                  setPlugins(prev => [...prev, newPlugin]);
                  setShowCustomModal(false);
                  sound.success();
                }}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-teal-500 text-slate-950 hover:bg-teal-400 cursor-pointer"
              >
                Register MCP Server
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
