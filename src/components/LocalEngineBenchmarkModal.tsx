"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Zap,
  Clock,
  Coins,
  Cpu,
  Server,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Activity,
} from "lucide-react";
import type {
  DiscoveredEngine,
  CostSavings,
} from "@/lib/providers/local-engine-probe";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialModel?: string;
}

interface BenchmarkResultData {
  model: string;
  ttftMs: number;
  totalTimeMs: number;
  tokenCount: number;
  tokensPerSecond: number;
  costSavings: CostSavings;
  text: string;
}

interface ModelOption {
  id: string;
  label: string;
  provider: string;
  isLocal: boolean;
}

export function LocalEngineBenchmarkModal({
  isOpen,
  onClose,
  initialModel,
}: Props) {
  const [engines, setEngines] = useState<DiscoveredEngine[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<BenchmarkResultData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Scan local runtimes (Ollama, LM Studio, vLLM)
  const scanEngines = useCallback(async () => {
    setIsScanning(true);
    try {
      const res = await fetch("/api/v1/providers/benchmark");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.engines)) {
          setEngines(data.engines);

          // Populate local models
          const localModels: ModelOption[] = [];
          data.engines.forEach((eng: DiscoveredEngine) => {
            if (eng.reachable && eng.models.length > 0) {
              eng.models.forEach((m) => {
                localModels.push({
                  id: `${eng.id}:${m}`,
                  label: `${m} (${eng.name})`,
                  provider: eng.id,
                  isLocal: true,
                });
              });
            }
          });

          // Fetch cloud / configured models
          try {
            const modelsRes = await fetch("/api/v1/models");
            if (modelsRes.ok) {
              const modelsData = await modelsRes.json();
              const cloudModels: ModelOption[] = (modelsData.models || []).map(
                (m: {
                  id: string;
                  model: string;
                  providerLabel?: string;
                  provider?: string;
                }) => ({
                  id: m.id,
                  label: `${m.model} (${m.providerLabel || m.provider || "Hosted"})`,
                  provider: m.provider || "cloud",
                  isLocal: m.provider === "ollama",
                }),
              );

              // Deduplicate
              const combined = [...localModels];
              cloudModels.forEach((cm) => {
                if (!combined.some((item) => item.id === cm.id)) {
                  combined.push(cm);
                }
              });

              setAvailableModels(combined);

              if (combined.length > 0 && !selectedModel) {
                const defaultChoice =
                  combined.find((m) => m.id === initialModel) || combined[0];
                setSelectedModel(defaultChoice.id);
                setSelectedProvider(defaultChoice.provider);
              }
            } else {
              setAvailableModels(localModels);
              if (localModels.length > 0 && !selectedModel) {
                setSelectedModel(localModels[0].id);
                setSelectedProvider(localModels[0].provider);
              }
            }
          } catch {
            setAvailableModels(localModels);
            if (localModels.length > 0 && !selectedModel) {
              setSelectedModel(localModels[0].id);
              setSelectedProvider(localModels[0].provider);
            }
          }
        }
      }
    } catch (err) {
      console.warn("Failed to discover local engines:", err);
    } finally {
      setIsScanning(false);
    }
  }, [initialModel, selectedModel]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      scanEngines();
    }, 0);
    return () => clearTimeout(timer);
  }, [isOpen, scanEngines]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isRunning) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isRunning, onClose]);

  const handleRunBenchmark = async () => {
    if (!selectedModel || isRunning) return;

    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const parts = selectedModel.split(":");
      const rawModel =
        parts.length > 1 ? parts.slice(1).join(":") : selectedModel;
      const provider =
        selectedProvider || (parts.length > 1 ? parts[0] : undefined);

      const res = await fetch("/api/v1/providers/benchmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: rawModel,
          provider,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Benchmark request failed");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRunning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-inner">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-100 text-base">
                  Local Engine Hub & Live Benchmark
                </h3>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Telemetry
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Live empirical TTFT, tokens-per-second, and local hardware
                cost-savings
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={scanEngines}
              disabled={isScanning || isRunning}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition flex items-center gap-1.5 disabled:opacity-50"
              title="Rescan local engines"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isScanning ? "animate-spin text-cyan-400" : ""}`}
              />
              <span>Rescan</span>
            </button>
            <button
              onClick={onClose}
              disabled={isRunning}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          {/* Engine Status Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-cyan-400" />
                Auto-Discovered Local Runtimes
              </h4>
              <span className="text-xs text-slate-500">
                {engines.filter((e) => e.reachable).length} of {engines.length}{" "}
                reachable
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {engines.map((engine) => (
                <div
                  key={engine.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    engine.reachable
                      ? "bg-slate-800/60 border-cyan-500/30 hover:border-cyan-500/60 shadow-sm"
                      : "bg-slate-950/40 border-slate-800/80 opacity-70"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-100">
                          {engine.name}
                        </span>
                        {engine.reachable ? (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            Online
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                            Offline
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-slate-400 mt-1 truncate">
                        {engine.endpoint}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    {engine.reachable ? (
                      <>
                        <span className="text-slate-400 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3 text-cyan-400" />
                          {engine.latencyMs}ms ping
                        </span>
                        <span className="text-cyan-300 font-medium">
                          {engine.models.length}{" "}
                          {engine.models.length === 1 ? "model" : "models"}
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-500 text-[11px] truncate">
                        {engine.error || "Port unreachable"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Benchmark Controls */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  Select Model for Benchmark
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => {
                    setSelectedModel(e.target.value);
                    const opt = availableModels.find(
                      (m) => m.id === e.target.value,
                    );
                    if (opt) setSelectedProvider(opt.provider);
                  }}
                  disabled={isRunning}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition"
                >
                  {availableModels.length === 0 ? (
                    <option value="">
                      No models detected — start Ollama or configure an API key
                    </option>
                  ) : (
                    <>
                      <optgroup label="Local Engine Models">
                        {availableModels
                          .filter((m) => m.isLocal)
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              ⚡ {m.label}
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="Cloud & Configured Models">
                        {availableModels
                          .filter((m) => !m.isLocal)
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              ☁️ {m.label}
                            </option>
                          ))}
                      </optgroup>
                    </>
                  )}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleRunBenchmark}
                  disabled={isRunning || !selectedModel}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg font-medium text-sm text-white bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 active:scale-[0.99] border border-cyan-400/30 shadow-lg shadow-cyan-950/50 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isRunning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Benchmarking Model...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-cyan-200" />
                      <span>Run Live Benchmark</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Telemetry Output Display */}
          {result && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Speedometer / TPS meter */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-cyan-950/40 border border-cyan-500/40 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span className="font-medium flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-400" />
                      Tokens Per Second
                    </span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                      TPS
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl font-extrabold text-white tracking-tight">
                      ⚡ {result.tokensPerSecond}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      tokens/sec
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] text-cyan-300/80 font-mono">
                    {result.tokenCount} tokens generated in {result.totalTimeMs}
                    ms
                  </div>
                </div>

                {/* TTFT Badge */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-indigo-500/40 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span className="font-medium flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-indigo-400" />
                      Time to First Token
                    </span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                      TTFT
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl font-extrabold text-white tracking-tight">
                      ⏱️ {result.ttftMs}ms
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      latency
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] text-indigo-300/80 font-mono">
                    Total roundtrip: {result.totalTimeMs}ms
                  </div>
                </div>

                {/* Cost Savings Counter */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-emerald-950/40 border border-emerald-500/40 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span className="font-medium flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-emerald-400" />
                      Hardware Cost Savings
                    </span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                      Telemetry
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl font-extrabold text-emerald-400 tracking-tight">
                      ${result.costSavings.savingsUsd.toFixed(5)}
                    </span>
                    <span className="text-xs text-emerald-400/80 font-medium">
                      saved
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] text-emerald-300/80 font-mono">
                    Hosted: ${result.costSavings.hostedCostUsd.toFixed(5)} vs
                    Local: $0.00
                  </div>
                </div>
              </div>

              {/* Standardized Benchmark Output */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-medium text-slate-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Standardization Benchmark Response
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">
                    Model: {result.model}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 font-sans text-sm text-slate-200 leading-relaxed">
                  {result.text || "(Model returned empty output)"}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>
              Standardization Prompt: 40 words concurrency vs parallelism
            </span>
          </div>
          <button
            onClick={onClose}
            disabled={isRunning}
            className="px-3.5 py-1.5 rounded-lg text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
