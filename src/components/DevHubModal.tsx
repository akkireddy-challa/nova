"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Code2,
  Layers,
  Terminal,
  X,
  BookOpen,
  Play,
  Radio,
  Copy,
  Check,
  Send,
  Cpu,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Globe,
  ShieldCheck,
  Search,
} from "lucide-react";
import { sound } from "@/lib/sound";
import {
  TunnelTool,
  TUNNEL_CONFIGS,
  generateTunnelCommand,
  isValidPort,
  parsePort,
  API_SANDBOX_ENDPOINTS,
  ApiSandboxEndpoint,
  formatCurlCommand,
  validateJsonPayload,
} from "@/lib/devhub";
import { McpPluginDefinition, McpToolDefinition } from "@/lib/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface ProviderControlHubResponse {
  providers?: Record<
    string,
    { configured: boolean; latencyMs?: number; error?: string }
  >;
  search?: Record<
    string,
    { configured: boolean; latencyMs?: number; error?: string }
  >;
}

interface ToolsApiResponse {
  plugins?: McpPluginDefinition[];
  tools?: McpToolDefinition[];
  totalPlugins?: number;
  activePlugins?: number;
  totalTools?: number;
}

export function DevHubModal({ isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<
    "tunnels" | "sandbox" | "mcp" | "guide" | "components" | "architecture"
  >("tunnels");

  // Tunnel Launcher State
  const [portInput, setPortInput] = useState<string>("3000");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Status Checklist State
  const [checklistLoading, setChecklistLoading] = useState<boolean>(false);
  const [providersData, setProvidersData] =
    useState<ProviderControlHubResponse | null>(null);
  const [toolsData, setToolsData] = useState<ToolsApiResponse | null>(null);
  const [serverReachable, setServerReachable] = useState<boolean | null>(null);

  // API Sandbox State
  const [selectedEndpointId, setSelectedEndpointId] =
    useState<string>("chat-completions");
  const [requestBody, setRequestBody] = useState<string>(
    API_SANDBOX_ENDPOINTS[0].defaultBody || "",
  );
  const [sandboxLoading, setSandboxLoading] = useState<boolean>(false);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseLatencyMs, setResponseLatencyMs] = useState<number | null>(
    null,
  );
  const [responseData, setResponseData] = useState<string | null>(null);
  const [responseError, setResponseError] = useState<string | null>(null);
  const [copiedCurl, setCopiedCurl] = useState<boolean>(false);
  const [copiedResponse, setCopiedResponse] = useState<boolean>(false);

  // MCP Registry State
  const [mcpSearch, setMcpSearch] = useState<string>("");
  const [expandedPlugin, setExpandedPlugin] = useState<string | null>(null);

  const selectedEndpoint: ApiSandboxEndpoint =
    API_SANDBOX_ENDPOINTS.find((e) => e.id === selectedEndpointId) ||
    API_SANDBOX_ENDPOINTS[0];

  // Fetch live demo status
  const fetchDemoStatus = useCallback(async () => {
    setChecklistLoading(true);
    try {
      const [provRes, toolsRes] = await Promise.all([
        fetch("/api/v1/providers/status?probe=false").catch(() => null),
        fetch("/api/v1/tools").catch(() => null),
      ]);

      if (provRes && provRes.ok) {
        const json = await provRes.json();
        setProvidersData(json);
        setServerReachable(true);
      } else {
        setServerReachable(false);
      }

      if (toolsRes && toolsRes.ok) {
        const json = await toolsRes.json();
        setToolsData(json);
      }
    } catch {
      setServerReachable(false);
    } finally {
      setChecklistLoading(false);
    }
  }, []);

  // When modal opens, refresh live status
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      fetchDemoStatus();
    }, 0);
    return () => clearTimeout(timer);
  }, [isOpen, fetchDemoStatus]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Sync default body when endpoint changes
  const handleSelectEndpoint = (id: string) => {
    setSelectedEndpointId(id);
    const target = API_SANDBOX_ENDPOINTS.find((e) => e.id === id);
    if (target) {
      setRequestBody(target.defaultBody || "");
      setResponseData(null);
      setResponseStatus(null);
      setResponseLatencyMs(null);
      setResponseError(null);
    }
  };

  const handleCopyCommand = (key: string, text: string) => {
    sound.playCheck();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2200);
  };

  const handleCopyCurl = () => {
    const curl = formatCurlCommand({
      method: selectedEndpoint.method,
      path: selectedEndpoint.path,
      baseUrl:
        typeof window !== "undefined"
          ? window.location.origin
          : "http://localhost:3000",
      body: selectedEndpoint.method === "POST" ? requestBody : undefined,
    });
    sound.playCheck();
    navigator.clipboard.writeText(curl);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const handleCopyResponse = () => {
    if (!responseData) return;
    sound.playCheck();
    navigator.clipboard.writeText(responseData);
    setCopiedResponse(true);
    setTimeout(() => setCopiedResponse(false), 2000);
  };

  const handleSendLiveRequest = async () => {
    sound.playStart();
    setSandboxLoading(true);
    setResponseError(null);
    setResponseData(null);
    setResponseStatus(null);
    setResponseLatencyMs(null);

    const startTime = performance.now();
    try {
      const isPost = selectedEndpoint.method === "POST";
      const headers: Record<string, string> = {};
      if (isPost) {
        headers["Content-Type"] = "application/json";
      }

      const res = await fetch(selectedEndpoint.path, {
        method: selectedEndpoint.method,
        headers,
        body: isPost ? requestBody : undefined,
      });

      const elapsed = Math.round(performance.now() - startTime);
      setResponseLatencyMs(elapsed);
      setResponseStatus(res.status);

      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const json = await res.json();
        setResponseData(JSON.stringify(json, null, 2));
      } else {
        const text = await res.text();
        setResponseData(text);
      }
      sound.playSuccess();
    } catch (err) {
      const elapsed = Math.round(performance.now() - startTime);
      setResponseLatencyMs(elapsed);
      setResponseError(err instanceof Error ? err.message : String(err));
    } finally {
      setSandboxLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentPort = parsePort(portInput, 3000);
  const activeProvidersCount = providersData?.providers
    ? Object.values(providersData.providers).filter((p) => p.configured).length
    : 0;
  const activeSearchCount = providersData?.search
    ? Object.values(providersData.search).filter((s) => s.configured).length
    : 0;

  const filteredPlugins = (toolsData?.plugins || []).filter((p) => {
    if (!mcpSearch.trim()) return true;
    const q = mcpSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tools.some(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q),
      )
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 flex-shrink-0">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-100 text-sm sm:text-base">
                  Nova Developer Hub & Tunnel Studio
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30">
                  ⌘D
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Instant live public tunnels, API Gateway Sandbox, and MCP
                Registry inspector.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close Developer Hub"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-4 sm:px-5 border-b border-slate-800 bg-slate-900/60 text-xs overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("tunnels")}
            className={`py-3 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "tunnels"
                ? "border-teal-400 text-teal-300 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-teal-400" />
            Live Demo & Tunnels
          </button>
          <button
            onClick={() => setActiveTab("sandbox")}
            className={`py-3 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "sandbox"
                ? "border-teal-400 text-teal-300 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Send className="w-3.5 h-3.5 text-teal-400" />
            API Gateway Sandbox
          </button>
          <button
            onClick={() => setActiveTab("mcp")}
            className={`py-3 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "mcp"
                ? "border-teal-400 text-teal-300 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-teal-400" />
            MCP Tool Registry
          </button>
          <button
            onClick={() => setActiveTab("guide")}
            className={`py-3 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "guide"
                ? "border-teal-400 text-teal-300 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-teal-400" />
            Developer Guide
          </button>
          <button
            onClick={() => setActiveTab("components")}
            className={`py-3 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "components"
                ? "border-teal-400 text-teal-300 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-teal-400" />
            Artifact Cards
          </button>
          <button
            onClick={() => setActiveTab("architecture")}
            className={`py-3 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "architecture"
                ? "border-teal-400 text-teal-300 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-teal-400" />
            Research Pipeline
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs text-slate-300">
          {/* TAB 1: LIVE DEMO & TUNNELS */}
          {activeTab === "tunnels" && (
            <div className="space-y-6">
              {/* Top Banner */}
              <div className="p-4 rounded-xl border border-teal-500/20 bg-teal-950/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-teal-400 animate-pulse" />
                    <h4 className="font-semibold text-slate-100 text-sm">
                      Instant Live Demo Tunnels
                    </h4>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed max-w-2xl">
                    Expose your local Nova instance to a secure public HTTPS
                    URL. Perfect for judges, mobile device testing, and webhook
                    integration without server deployment.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-center">
                  <label className="text-slate-400 text-xs font-mono">
                    Port:
                  </label>
                  <input
                    type="text"
                    value={portInput}
                    onChange={(e) => setPortInput(e.target.value)}
                    className={`w-20 px-2.5 py-1.5 rounded-lg bg-slate-950 border font-mono text-xs text-teal-300 text-center focus:outline-none ${
                      isValidPort(portInput)
                        ? "border-slate-700 focus:border-teal-400"
                        : "border-rose-500/60 focus:border-rose-500"
                    }`}
                    placeholder="3000"
                  />
                </div>
              </div>

              {/* 1-Click Launchers Grid */}
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
                  <span>1-Click Launch Commands</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    (Targeting http://localhost:{currentPort})
                  </span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {(
                    ["cloudflared", "localtunnel", "ngrok"] as TunnelTool[]
                  ).map((tool) => {
                    const cfg = TUNNEL_CONFIGS[tool];
                    const command = generateTunnelCommand(tool, currentPort);
                    const isCopied = copiedKey === tool;

                    return (
                      <div
                        key={tool}
                        className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 hover:border-slate-700 transition flex flex-col justify-between space-y-3"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-semibold text-slate-100 text-xs flex items-center gap-1.5">
                              {cfg.name}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-teal-300 border border-slate-700">
                              HTTPS
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-snug mb-2">
                            {cfg.recommendedFor}
                          </p>
                          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-teal-300 select-all break-all">
                            {command}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-900 flex items-center justify-between gap-2">
                          <span
                            className="text-[10px] text-slate-500 truncate"
                            title={cfg.installHint}
                          >
                            {cfg.installHint}
                          </span>
                          <button
                            onClick={() => handleCopyCommand(tool, command)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 transition cursor-pointer flex-shrink-0"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-teal-400" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status Checklist for Public Demos */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Public Demo Readiness Checklist
                  </h4>
                  <button
                    onClick={fetchDemoStatus}
                    disabled={checklistLoading}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-3 h-3 ${checklistLoading ? "animate-spin" : ""}`}
                    />
                    <span>Re-check</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Local Server */}
                  <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium text-[11px]">
                        Local Server
                      </span>
                      {serverReachable === true ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : serverReachable === false ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-500 animate-ping" />
                      )}
                    </div>
                    <p className="font-mono text-xs text-slate-200">
                      Port {currentPort}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {serverReachable
                        ? "Ready for public tunnel"
                        : "Checking port reachability..."}
                    </p>
                  </div>

                  {/* Active Providers */}
                  <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium text-[11px]">
                        LLM Providers
                      </span>
                      {activeProvidersCount > 0 ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      )}
                    </div>
                    <p className="font-mono text-xs text-slate-200">
                      {activeProvidersCount} Active
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {providersData?.providers
                        ? Object.keys(providersData.providers)
                            .filter(
                              (k) => providersData.providers?.[k].configured,
                            )
                            .join(", ") || "None configured"
                        : "Detecting..."}
                    </p>
                  </div>

                  {/* MCP Tool Registry */}
                  <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium text-[11px]">
                        MCP Tools
                      </span>
                      {(toolsData?.totalTools ?? 0) > 0 ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      )}
                    </div>
                    <p className="font-mono text-xs text-slate-200">
                      {toolsData?.totalTools ?? 0} Tools
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {toolsData?.activePlugins ?? 0} active plugins loaded
                    </p>
                  </div>

                  {/* Search Engine */}
                  <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium text-[11px]">
                        Search Engine
                      </span>
                      {activeSearchCount > 0 ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      )}
                    </div>
                    <p className="font-mono text-xs text-slate-200">
                      {activeSearchCount} Search Engine
                      {activeSearchCount === 1 ? "" : "s"}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {providersData?.search
                        ? Object.keys(providersData.search)
                            .filter((k) => providersData.search?.[k].configured)
                            .join(", ") || "DuckDuckGo fallback"
                        : "Detecting..."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: API GATEWAY SANDBOX */}
          {activeTab === "sandbox" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
                <div>
                  <h4 className="font-semibold text-slate-100 text-sm">
                    Interactive API Gateway Sandbox
                  </h4>
                  <p className="text-slate-400 text-xs">
                    Send live HTTP queries against Nova’s open endpoints,
                    inspect payloads, and copy curl commands.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyCurl}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
                  >
                    {copiedCurl ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-teal-400" />
                        <span>cURL Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy cURL</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleSendLiveRequest}
                    disabled={sandboxLoading}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-slate-950 transition cursor-pointer disabled:opacity-50"
                  >
                    {sandboxLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Send Live Request</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Endpoint Selection Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                {API_SANDBOX_ENDPOINTS.map((endpoint) => {
                  const isSelected = selectedEndpointId === endpoint.id;
                  return (
                    <button
                      key={endpoint.id}
                      onClick={() => handleSelectEndpoint(endpoint.id)}
                      className={`p-3 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "border-teal-400 bg-teal-950/20 ring-1 ring-teal-400/30"
                          : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                            endpoint.method === "POST"
                              ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          }`}
                        >
                          {endpoint.method}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 truncate">
                          {endpoint.id}
                        </span>
                      </div>
                      <span className="font-semibold text-xs text-slate-200 block truncate">
                        {endpoint.label}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 truncate">
                        {endpoint.path}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Request & Response Split Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Request Side */}
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 text-xs">
                      Request Configuration
                    </span>
                    <span className="text-[10px] font-mono text-teal-400">
                      {selectedEndpoint.method} {selectedEndpoint.path}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    {selectedEndpoint.description}
                  </p>

                  {selectedEndpoint.method === "POST" ? (
                    <div className="flex-1 flex flex-col space-y-1.5 pt-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Payload JSON:</span>
                        {(() => {
                          const v = validateJsonPayload(requestBody);
                          return v.valid ? (
                            <span className="text-emerald-400 text-[10px]">
                              Valid JSON
                            </span>
                          ) : (
                            <span className="text-rose-400 text-[10px]">
                              Invalid JSON
                            </span>
                          );
                        })()}
                      </div>
                      <textarea
                        value={requestBody}
                        onChange={(e) => setRequestBody(e.target.value)}
                        rows={10}
                        className="w-full flex-1 p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-200 focus:outline-none focus:border-teal-400 resize-none"
                        spellCheck={false}
                      />
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-500 font-mono text-xs border border-dashed border-slate-800 rounded-lg my-2">
                      GET endpoint requires no request body. Click &quot;Send
                      Live Request&quot; to test.
                    </div>
                  )}
                </div>

                {/* Response Side */}
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2 flex flex-col">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200 text-xs">
                        Live Response
                      </span>
                      {responseStatus !== null && (
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                            responseStatus >= 200 && responseStatus < 300
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                              : responseStatus >= 400 && responseStatus < 500
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                          }`}
                        >
                          HTTP {responseStatus}
                        </span>
                      )}
                      {responseLatencyMs !== null && (
                        <span className="text-[10px] font-mono text-slate-400">
                          {responseLatencyMs}ms
                        </span>
                      )}
                    </div>
                    {responseData && (
                      <button
                        onClick={handleCopyResponse}
                        className="text-[10px] text-teal-400 hover:text-teal-300 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedResponse ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedResponse ? "Copied" : "Copy"}</span>
                      </button>
                    )}
                  </div>

                  {responseError && (
                    <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                      <span>{responseError}</span>
                    </div>
                  )}

                  <div className="flex-1 min-h-[220px] max-h-[360px] overflow-auto rounded-lg bg-slate-900 border border-slate-800 p-3 font-mono text-[11px] text-slate-300">
                    {responseData ? (
                      <pre className="whitespace-pre-wrap break-all">
                        {responseData}
                      </pre>
                    ) : sandboxLoading ? (
                      <div className="h-full flex items-center justify-center text-slate-400 gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-teal-400" />
                        <span>Streaming live response...</span>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-500 text-center p-4">
                        Click &quot;Send Live Request&quot; above to inspect the
                        real API output.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MCP TOOL REGISTRY */}
          {activeTab === "mcp" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
                <div>
                  <h4 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-teal-400" />
                    Model Context Protocol (MCP) Registry
                  </h4>
                  <p className="text-slate-400 text-xs">
                    Inspect active pluggable tool definitions available for the
                    research pipeline and agent loops.
                  </p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={mcpSearch}
                    onChange={(e) => setMcpSearch(e.target.value)}
                    placeholder="Filter tools..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-teal-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {filteredPlugins.map((plugin) => {
                  const isExpanded = expandedPlugin === plugin.id;
                  return (
                    <div
                      key={plugin.id}
                      className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 flex-shrink-0 mt-0.5">
                            {plugin.category === "search" ? (
                              <Globe className="w-4 h-4" />
                            ) : plugin.category === "integration" ? (
                              <Code2 className="w-4 h-4" />
                            ) : (
                              <Cpu className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="font-semibold text-slate-100 text-xs">
                                {plugin.name}
                              </h5>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                v{plugin.version}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30 uppercase">
                                {plugin.category}
                              </span>
                              {plugin.enabled && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1">
                              {plugin.description}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            setExpandedPlugin(isExpanded ? null : plugin.id)
                          }
                          className="text-[11px] text-teal-400 hover:text-teal-300 font-mono flex-shrink-0 cursor-pointer"
                        >
                          {isExpanded
                            ? "Collapse"
                            : `Tools (${plugin.tools.length})`}
                        </button>
                      </div>

                      {/* Tools inside this plugin */}
                      <div className="space-y-2 pt-2 border-t border-slate-900">
                        {plugin.tools.map((t) => (
                          <div
                            key={t.name}
                            className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-xs text-teal-300 font-semibold">
                                {t.name}
                              </span>
                              <button
                                onClick={() =>
                                  handleCopyCommand(t.name, t.name)
                                }
                                className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                              >
                                {copiedKey === t.name ? (
                                  <Check className="w-3 h-3 text-teal-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                                <span>Copy ID</span>
                              </button>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-snug">
                              {t.description}
                            </p>
                            {t.inputSchema && (
                              <div className="mt-1 pt-1 border-t border-slate-800/60 text-[10px] font-mono text-slate-500">
                                Params:{" "}
                                {Object.keys(
                                  t.inputSchema.properties || {},
                                ).join(", ") || "None"}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: DEVELOPER GUIDE */}
          {activeTab === "guide" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-teal-500/20 bg-teal-950/10">
                <h4 className="font-semibold text-slate-100 text-sm mb-1 flex items-center gap-2">
                  <Play className="w-4 h-4 text-teal-400" />
                  Quick Start in 3 Commands
                </h4>
                <p className="text-slate-400 leading-relaxed mb-3">
                  Nova runs completely self-hosted with any provider of your
                  choice (Gemini, Claude, OpenAI, or local Ollama).
                </p>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-teal-300 space-y-1">
                  <p>bun install</p>
                  <p>cp .env.example .env</p>
                  <p>bun dev</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-slate-100">
                  Configurable Providers
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="font-semibold text-teal-400 block mb-1">
                      Google Gemini
                    </span>
                    <p className="text-slate-400">
                      Set <code>GEMINI_API_KEY</code> (or{" "}
                      <code>GOOGLE_API_KEY</code>); optional{" "}
                      <code>GEMINI_MODEL</code>.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="font-semibold text-teal-400 block mb-1">
                      Anthropic Claude
                    </span>
                    <p className="text-slate-400">
                      Set <code>ANTHROPIC_API_KEY</code>; optional{" "}
                      <code>ANTHROPIC_MODEL</code>.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="font-semibold text-teal-400 block mb-1">
                      OpenAI Compatible
                    </span>
                    <p className="text-slate-400">
                      Set <code>OPENAI_API_KEY</code> and optional{" "}
                      <code>OPENAI_BASE_URL</code> (OpenAI, OpenRouter, Groq).
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="font-semibold text-teal-400 block mb-1">
                      Local Ollama
                    </span>
                    <p className="text-slate-400">
                      Run <code>ollama serve</code> and pull a model. Uses{" "}
                      <code>OLLAMA_BASE_URL</code> (default{" "}
                      <code>http://localhost:11434</code>).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ARTIFACT CARDS */}
          {activeTab === "components" && (
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-100">
                Visual Artifact Card Types
              </h4>
              <p className="text-slate-400">
                Instead of unstructured walls of text, Nova parses LLM output
                into structured, verifiable interactive cards:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="font-semibold text-teal-400 block mb-1">
                    Research Report Card
                  </span>
                  <p className="text-slate-400">
                    Summary, findings, risks, evidence verification audit, and
                    clickable citations linked to the fetched web sources.
                  </p>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="font-semibold text-teal-400 block mb-1">
                    Comparison Matrix
                  </span>
                  <p className="text-slate-400">
                    Weighted decision matrix evaluating candidate technologies
                    or strategies with interactive scoring.
                  </p>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="font-semibold text-teal-400 block mb-1">
                    Plan
                  </span>
                  <p className="text-slate-400">
                    Hierarchical milestone phases with checkable task
                    progression.
                  </p>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="font-semibold text-teal-400 block mb-1">
                    Data Chart
                  </span>
                  <p className="text-slate-400">
                    Interactive Recharts bar/line visualization built strictly
                    from numbers in the research sources.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: RESEARCH PIPELINE */}
          {activeTab === "architecture" && (
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-100">
                Research pipeline
              </h4>
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] space-y-2 text-slate-300">
                <p>
                  <span className="text-teal-400 font-bold">
                    1. Query Decomposition:
                  </span>{" "}
                  Extract search terms and criteria.
                </p>
                <p>
                  <span className="text-blue-400 font-bold">
                    2. Pluggable Search:
                  </span>{" "}
                  Query Tavily, Brave, or DuckDuckGo HTML fallback.
                </p>
                <p>
                  <span className="text-amber-400 font-bold">
                    3. Page Extraction:
                  </span>{" "}
                  Fetch top pages with 8s timeout and HTML-to-text cleaner.
                </p>
                <p>
                  <span className="text-purple-400 font-bold">
                    4. Strict LLM Synthesis:
                  </span>{" "}
                  Ask provider to answer ONLY from extracted sources with
                  citation IDs.
                </p>
                <p>
                  <span className="text-emerald-400 font-bold">
                    5. Zod Schema Validation:
                  </span>{" "}
                  Validate JSON against schema; retry once on error; render
                  interactive card.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
