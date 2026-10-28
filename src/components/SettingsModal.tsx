"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ThinkingBudget, UserSettings } from "@/lib/types";
import { ModelEntry, ModelsStatus, providerLabel } from "@/lib/client/models";
import {
  Settings,
  X,
  Server,
  KeyRound,
  RefreshCw,
  Loader2,
  Zap,
  Activity,
  Check,
  Copy,
  AlertCircle,
  Globe,
  Cpu,
} from "lucide-react";
import { sound } from "@/lib/sound";
import type {
  ProviderStatus,
  SearchStatus,
  ProviderControlHubResponse,
} from "@/app/api/v1/providers/status/route";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSaveSettings: (settings: UserSettings) => void;
  models: ModelEntry[];
  modelsStatus: ModelsStatus;
  onCheckModels: () => void;
}

const BUDGETS: { id: ThinkingBudget; label: string; desc: string }[] = [
  { id: "quick", label: "Quick", desc: "Fewer sources, shorter answers." },
  { id: "analytical", label: "Analytical", desc: "The default balance." },
  {
    id: "deep",
    label: "Deep",
    desc: "More sources and longer answers; slower.",
  },
];

interface LLMProviderMeta {
  id: "anthropic" | "gemini" | "openai" | "ollama";
  name: string;
  badgeLabel: string;
  envKeys: string;
  desc: string;
}

const LLM_PROVIDERS: LLMProviderMeta[] = [
  {
    id: "anthropic",
    name: "Anthropic",
    badgeLabel: "Claude 3.5 / 3.7",
    envKeys: "ANTHROPIC_API_KEY, ANTHROPIC_MODEL",
    desc: "Frontier reasoning and code architecture models via official Anthropic SDK.",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    badgeLabel: "Gemini 2.5 Flash / Pro",
    envKeys: "GEMINI_API_KEY (or GOOGLE_API_KEY), GEMINI_MODEL",
    desc: "Multimodal and fast token generation with Google DeepMind generative endpoints.",
  },
  {
    id: "openai",
    name: "OpenAI / Local Compatible",
    badgeLabel: "GPT-4o & Local Endpoints",
    envKeys: "OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL",
    desc: "Standard OpenAI endpoint or any OpenAI-compatible runner (LM Studio, vLLM, Ollama).",
  },
  {
    id: "ollama",
    name: "Ollama",
    badgeLabel: "Local Native Daemon",
    envKeys: "OLLAMA_BASE_URL, OLLAMA_MODEL",
    desc: "Zero-latency local daemon for running quantized open models directly on your hardware.",
  },
];

interface SearchProviderMeta {
  id: "tavily" | "exa" | "brave" | "searxng" | "duckduckgo";
  name: string;
  envKey: string;
  desc: string;
}

const SEARCH_PROVIDERS: SearchProviderMeta[] = [
  {
    id: "tavily",
    name: "Tavily Search",
    envKey: "TAVILY_API_KEY",
    desc: "AI-optimized search returning parsed content extracts and relevance scores.",
  },
  {
    id: "exa",
    name: "Exa Neural Search",
    envKey: "EXA_API_KEY",
    desc: "Semantic neural embeddings for retrieving precise academic and technical web data.",
  },
  {
    id: "brave",
    name: "Brave Search",
    envKey: "BRAVE_API_KEY",
    desc: "Independent, private web index providing comprehensive search coverage.",
  },
  {
    id: "searxng",
    name: "SearXNG (Self-Hosted)",
    envKey: "SEARXNG_URL",
    desc: "Private metasearch aggregator combining 70+ engines with no tracking.",
  },
  {
    id: "duckduckgo",
    name: "DuckDuckGo",
    envKey: "Built-in (No key needed)",
    desc: "Default keyless fallback web grounding. Works out of the box with zero setup.",
  },
];

const LOCAL_PRESETS = [
  {
    id: "ollama",
    name: "Ollama",
    url: "http://127.0.0.1:11434",
    envSnippet: "OLLAMA_BASE_URL=http://127.0.0.1:11434",
    desc: "Standard port for local Ollama service.",
  },
  {
    id: "lmstudio",
    name: "LM Studio",
    url: "http://127.0.0.1:1234/v1",
    envSnippet:
      "OPENAI_BASE_URL=http://127.0.0.1:1234/v1\nOPENAI_API_KEY=lm-studio",
    desc: "Local server mode with OpenAI compatibility.",
  },
  {
    id: "vllm",
    name: "vLLM",
    url: "http://127.0.0.1:8000/v1",
    envSnippet: "OPENAI_BASE_URL=http://127.0.0.1:8000/v1\nOPENAI_API_KEY=vllm",
    desc: "High-throughput GPU inference server.",
  },
];

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  models,
  modelsStatus,
  onCheckModels,
}: Props) {
  const [budget, setBudget] = useState<ThinkingBudget>(
    settings.defaultThinkingBudget,
  );
  const [providerStatuses, setProviderStatuses] = useState<
    Record<string, ProviderStatus>
  >({});
  const [searchStatuses, setSearchStatuses] = useState<
    Record<string, SearchStatus>
  >({});
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [pinging, setPinging] = useState<Record<string, boolean>>({});
  const [copiedPreset, setCopiedPreset] = useState<string | null>(null);

  const fetchStatuses = useCallback(async () => {
    setIsLoadingStatus(true);
    try {
      const res = await fetch("/api/v1/providers/status");
      if (res.ok) {
        const data: ProviderControlHubResponse = await res.json();
        setProviderStatuses(data.providers || {});
        setSearchStatuses(data.search || {});
      }
    } catch (err) {
      console.error("Failed to fetch provider statuses:", err);
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    if (!isOpen) return;

    fetch("/api/v1/providers/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ProviderControlHubResponse | null) => {
        if (!ignore && data) {
          setProviderStatuses(data.providers || {});
          setSearchStatuses(data.search || {});
        }
      })
      .catch((err) => {
        console.error("Failed to fetch provider statuses:", err);
      });

    return () => {
      ignore = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    sound.playSuccess();
    onSaveSettings({ ...settings, defaultThinkingBudget: budget });
    onClose();
  };

  const handlePing = async (providerId: string, isSearch = false) => {
    setPinging((prev) => ({ ...prev, [providerId]: true }));
    try {
      const res = await fetch(
        `/api/v1/providers/status?provider=${encodeURIComponent(providerId)}`,
      );
      if (res.ok) {
        const data: ProviderControlHubResponse = await res.json();
        if (!isSearch && data.providers[providerId]) {
          setProviderStatuses((prev) => ({
            ...prev,
            [providerId]: data.providers[providerId],
          }));
        } else if (isSearch && data.search[providerId]) {
          setSearchStatuses((prev) => ({
            ...prev,
            [providerId]: data.search[providerId],
          }));
        }
        sound.playCheck();
      }
    } catch (err) {
      console.error(`Failed to ping ${providerId}:`, err);
    } finally {
      setPinging((prev) => ({ ...prev, [providerId]: false }));
    }
  };

  const handleRefreshAll = () => {
    sound.playCheck();
    fetchStatuses();
    onCheckModels();
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    sound.playCheck();
    setCopiedPreset(id);
    setTimeout(() => {
      setCopiedPreset(null);
    }, 2000);
  };

  // Group models by provider
  const byProvider = new Map<string, ModelEntry[]>();
  for (const m of models) {
    byProvider.set(m.provider, [...(byProvider.get(m.provider) ?? []), m]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-inner">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-100 text-sm">
                  Provider & Health Control Hub
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  Live Status
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Real-time endpoint reachability, latency diagnostics, and local
                LLM presets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshAll}
              disabled={isLoadingStatus || modelsStatus === "loading"}
              title="Refresh all provider diagnostics"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white text-xs font-medium transition disabled:opacity-50 cursor-pointer shadow-sm"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoadingStatus || modelsStatus === "loading" ? "animate-spin text-teal-400" : ""}`}
              />
              <span>Refresh All</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Section 1: AI Model Providers */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-teal-400" />
                <span className="font-semibold text-slate-100 text-sm">
                  AI Model Providers
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Active LLM backends & live latency
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {LLM_PROVIDERS.map((provider) => {
                const status = providerStatuses[provider.id];
                const isPinging = pinging[provider.id] || false;
                const providerModels = byProvider.get(provider.id) || [];
                const isConfigured = status?.configured ?? false;
                const hasError = Boolean(status?.error);
                const latency = status?.latencyMs;
                const count = status?.modelCount ?? providerModels.length;

                return (
                  <div
                    key={provider.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      hasError
                        ? "bg-rose-950/20 border-rose-800/40"
                        : isConfigured
                          ? "bg-slate-950/60 border-slate-700/80 hover:border-slate-600 shadow-sm"
                          : "bg-slate-950/20 border-slate-800/60 opacity-80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`p-1.5 rounded-lg border ${
                            isConfigured
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                              : "bg-slate-800 border-slate-700 text-slate-400"
                          }`}
                        >
                          <Server className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-200">
                              {provider.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({provider.badgeLabel})
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-1">
                            {provider.desc}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handlePing(provider.id, false)}
                        disabled={isPinging || !isConfigured}
                        title={
                          !isConfigured
                            ? "Configure provider key to ping"
                            : `Ping ${provider.name}`
                        }
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                          isPinging
                            ? "bg-teal-500/10 border-teal-500/30 text-teal-300"
                            : "bg-slate-800 border-slate-700 hover:bg-slate-750 text-slate-300 hover:text-white"
                        }`}
                      >
                        {isPinging ? (
                          <Loader2 className="w-3 h-3 animate-spin text-teal-400" />
                        ) : (
                          <Activity className="w-3 h-3 text-teal-400" />
                        )}
                        <span>Ping</span>
                      </button>
                    </div>

                    {/* Status & Latency Badges */}
                    <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-slate-800/60">
                      {hasError ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/10 border border-rose-500/25 text-rose-400">
                          <AlertCircle className="w-3 h-3 text-rose-400" />
                          <span>Error</span>
                        </span>
                      ) : isConfigured ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span>Connected</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800/80 border border-slate-700/60 text-slate-400">
                          <span>Not Configured</span>
                        </span>
                      )}

                      {typeof latency === "number" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-teal-500/10 border border-teal-500/20 text-teal-300">
                          <Zap className="w-2.5 h-2.5 text-teal-400" />
                          {latency}ms
                        </span>
                      )}

                      {isConfigured && count > 0 && (
                        <span className="text-[10px] font-mono text-slate-400 ml-auto">
                          {count} {count === 1 ? "model" : "models"}
                        </span>
                      )}
                    </div>

                    {/* Error message detail if present */}
                    {status?.error && (
                      <p className="mt-2 text-[10px] font-mono text-rose-300 bg-rose-950/40 p-1.5 rounded border border-rose-800/50 break-words">
                        {status.error}
                      </p>
                    )}

                    {/* Available Models Preview Chips */}
                    {providerModels.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {providerModels.slice(0, 3).map((m) => (
                          <span
                            key={m.id}
                            className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-[10px] text-slate-300"
                          >
                            {m.model}
                            {m.isDefault && (
                              <span className="text-teal-400"> (def)</span>
                            )}
                          </span>
                        ))}
                        {providerModels.length > 3 && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 font-mono text-[10px]">
                            +{providerModels.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section 2: Search Providers */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-teal-400" />
                <span className="font-semibold text-slate-100 text-sm">
                  Search & Grounding Providers
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Web intelligence engines for real-time citations
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {SEARCH_PROVIDERS.map((search) => {
                const status = searchStatuses[search.id];
                const isPinging = pinging[search.id] || false;
                const isConfigured = status?.configured ?? false;
                const hasError = Boolean(status?.error);
                const latency = status?.latencyMs;

                return (
                  <div
                    key={search.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isConfigured
                        ? "bg-slate-950/50 border-slate-800 hover:border-slate-700"
                        : "bg-slate-950/20 border-slate-800/60 opacity-80"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-200">
                          {search.name}
                        </span>
                        {isConfigured ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-slate-800 border border-slate-700 text-slate-400">
                            Not Configured
                          </span>
                        )}
                        {typeof latency === "number" && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-mono bg-teal-500/10 border border-teal-500/20 text-teal-300">
                            <Zap className="w-2.5 h-2.5 text-teal-400" />
                            {latency}ms
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handlePing(search.id, true)}
                        disabled={isPinging || !isConfigured}
                        title={`Test ${search.name}`}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 border border-slate-700 hover:bg-slate-750 text-slate-300 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isPinging ? (
                          <Loader2 className="w-2.5 h-2.5 animate-spin text-teal-400" />
                        ) : (
                          <Activity className="w-2.5 h-2.5 text-teal-400" />
                        )}
                        <span>Test</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-snug mb-2">
                      {search.desc}
                    </p>

                    <div className="text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2 py-1 rounded border border-slate-800 flex items-center justify-between">
                      <span className="truncate">Env: {search.envKey}</span>
                      {hasError && (
                        <span className="text-rose-400 text-[10px] font-sans">
                          Failed probe
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section 3: Preset Guidance for Local LLM Engines */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-teal-400" />
              <span className="font-semibold text-slate-100 text-sm">
                Local LLM Presets & Self-Hosting
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {LOCAL_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between space-y-2 hover:border-slate-700 transition"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-200">
                        {preset.name}
                      </span>
                      <button
                        onClick={() =>
                          copyToClipboard(preset.envSnippet, preset.id)
                        }
                        title="Copy configuration snippet"
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[10px] transition cursor-pointer"
                      >
                        {copiedPreset === preset.id ? (
                          <>
                            <Check className="w-2.5 h-2.5 text-teal-400" />
                            <span className="text-teal-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-2.5 h-2.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400">{preset.desc}</p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded p-1.5 font-mono text-[10px] text-teal-300 break-all select-all">
                    {preset.url}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 4: Environment Variables Reference */}
          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 space-y-2 text-slate-300">
            <div className="flex items-center gap-2 font-semibold text-slate-200">
              <KeyRound className="w-3.5 h-3.5 text-teal-400" />
              <span>Environment Configuration Guide</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              API keys are read securely on the server from{" "}
              <code className="font-mono text-teal-300">.env</code> and never
              transmitted to client browsers. Set variables, restart Nova, and
              click Refresh All to connect.
            </p>
            <ul className="space-y-1 font-mono text-[11px]">
              {LLM_PROVIDERS.map((v) => (
                <li key={v.id}>
                  <span className="text-slate-200">{providerLabel(v.id)}:</span>{" "}
                  <span className="text-slate-400">{v.envKeys}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Section 5: Thinking Budget Selector */}
          <section className="space-y-2 pt-2 border-t border-slate-800/60">
            <span className="font-semibold text-slate-100 block">
              Default Depth & Thinking Budget
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {BUDGETS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    sound.playCheck();
                    setBudget(b.id);
                  }}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    budget === b.id
                      ? "bg-slate-950 border-teal-500/40 text-slate-100 shadow-sm"
                      : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <span className="font-semibold block">{b.label}</span>
                  <span className="text-[11px] text-slate-400">{b.desc}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-end gap-2 text-xs">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold transition shadow-lg shadow-teal-500/10 cursor-pointer"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
