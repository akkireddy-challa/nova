"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  Zap,
  Layers,
  Download,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
  Server,
  ArrowRight,
  Clock,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import type { ParetoFrontierArtifact } from "@/lib/types";
import {
  paretoFrontierToCsv,
  paretoFrontierToMarkdown,
} from "@/lib/research/pareto-optimizer";
import { downloadCsvData } from "@/lib/matrix-calculator";
import { sound } from "@/lib/sound";

export interface ParetoFrontierCardProps {
  artifact: ParetoFrontierArtifact;
  className?: string;
}

type ParetoTab = "frontier" | "routing" | "benchmarks";

export function ParetoFrontierCard({
  artifact,
  className = "",
}: ParetoFrontierCardProps) {
  const [activeTab, setActiveTab] = useState<ParetoTab>("frontier");
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(
    artifact.frontierProviderIds[0] || null,
  );
  const [copied, setCopied] = useState<boolean>(false);
  const [downloaded, setDownloaded] = useState<boolean>(false);

  const providers = artifact.providers || [];
  const selectedProvider =
    providers.find((p) => p.providerId === selectedProviderId) || providers[0];

  const handleCopyMarkdown = async () => {
    try {
      const md = paretoFrontierToMarkdown(artifact);
      await navigator.clipboard.writeText(md);
      setCopied(true);
      sound.playPop();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard fallback
    }
  };

  const handleDownloadCsv = () => {
    try {
      const csv = paretoFrontierToCsv(artifact);
      const safeSlug = (artifact.topic || "pareto-frontier")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 32);
      downloadCsvData(`nova-pareto-${safeSlug}.csv`, csv);
      setDownloaded(true);
      sound.playSuccess();
      setTimeout(() => setDownloaded(false), 2000);
    } catch {
      // Download fallback
    }
  };

  // SVG Chart bounds
  const chartWidth = 520;
  const chartHeight = 220;
  const padding = { top: 20, right: 30, bottom: 35, left: 45 };

  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const minLatency = 0;
  const maxLatency = 4500;
  const minQuality = 75;
  const maxQuality = 100;

  // Scale functions
  const scaleX = (latencyMs: number) =>
    padding.left +
    (Math.max(minLatency, Math.min(maxLatency, latencyMs)) / maxLatency) *
      innerWidth;

  const scaleY = (quality: number) =>
    padding.top +
    (1 -
      (Math.max(minQuality, Math.min(maxQuality, quality)) - minQuality) /
        (maxQuality - minQuality)) *
      innerHeight;

  // Sort Pareto frontier points by latency to draw connected frontier curve
  const frontierPoints = providers
    .filter((p) => p.isParetoOptimal)
    .sort((a, b) => a.totalLatencyMs - b.totalLatencyMs);

  const frontierPath =
    frontierPoints.length > 1
      ? frontierPoints
          .map((p, idx) => {
            const x = scaleX(p.totalLatencyMs);
            const y = scaleY(p.qualityScore);
            return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
          })
          .join(" ")
      : "";

  return (
    <div
      className={`bg-slate-900/95 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-xl text-slate-100 flex flex-col gap-5 ${className}`}
    >
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 shadow-sm">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-teal-400 font-bold">
                  Pareto Trade-Off Optimizer
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {artifact.workloadProfile || "Enterprise Routing"}
                </span>
              </div>
              <h3 className="text-base font-semibold text-slate-100 line-clamp-1">
                {artifact.topic || "Multi-Provider Cost-Latency Frontier"}
              </h3>
            </div>
          </div>
        </div>

        {/* FRONTIER COUNTER & ACTION BUTTONS */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="flex flex-col text-right">
              <span className="text-[10px] font-mono text-slate-400">
                Frontier
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {artifact.frontierProviderIds.length} Optimal
              </span>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyMarkdown}
              title="Copy Markdown Report"
              aria-label="Copy Markdown Report"
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700 transition-all hover:scale-105 active:scale-95"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={handleDownloadCsv}
              title="Download RFC 4180 CSV"
              aria-label="Download RFC 4180 CSV"
              className="p-2 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/40 transition-all hover:scale-105 active:scale-95"
            >
              {downloaded ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* STRATEGIC SUMMARY */}
      {artifact.summary && (
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-teal-400 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-300 leading-relaxed">
            {artifact.summary}
          </p>
        </div>
      )}

      {/* VIEW TABS */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
        <button
          type="button"
          onClick={() => {
            sound.playTap();
            setActiveTab("frontier");
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
            activeTab === "frontier"
              ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Frontier Curve</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sound.playTap();
            setActiveTab("routing");
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
            activeTab === "routing"
              ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Routing Strategies</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
            {artifact.recommendations.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            sound.playTap();
            setActiveTab("benchmarks");
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
            activeTab === "benchmarks"
              ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Benchmark Matrix</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
            {providers.length}
          </span>
        </button>
      </div>

      {/* TAB 1: FRONTIER CURVE CHART */}
      {activeTab === "frontier" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col items-center">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full max-w-[540px] overflow-visible"
            >
              {/* Grid Lines */}
              {[75, 80, 85, 90, 95, 100].map((q) => {
                const y = scaleY(q);
                return (
                  <g key={q}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={chartWidth - padding.right}
                      y2={y}
                      stroke="#334155"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={padding.left - 8}
                      y={y + 3}
                      fill="#94a3b8"
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="end"
                    >
                      {q}
                    </text>
                  </g>
                );
              })}

              {/* X Axis Latency Labels */}
              {[0, 1000, 2000, 3000, 4000].map((lat) => {
                const x = scaleX(lat);
                return (
                  <g key={lat}>
                    <line
                      x1={x}
                      y1={padding.top}
                      x2={x}
                      y2={chartHeight - padding.bottom}
                      stroke="#334155"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={x}
                      y={chartHeight - padding.bottom + 14}
                      fill="#94a3b8"
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {lat}ms
                    </text>
                  </g>
                );
              })}

              {/* Axis Titles */}
              <text
                x={chartWidth / 2}
                y={chartHeight - 4}
                fill="#64748b"
                fontSize="10"
                fontFamily="sans-serif"
                textAnchor="middle"
              >
                Total Latency (ms) → Lower is Faster
              </text>
              <text
                x={12}
                y={chartHeight / 2}
                fill="#64748b"
                fontSize="10"
                fontFamily="sans-serif"
                textAnchor="middle"
                transform={`rotate(-90 12 ${chartHeight / 2})`}
              >
                Quality Score (0-100) ↑
              </text>

              {/* Non-Dominated Pareto Frontier Polyline */}
              {frontierPath && (
                <path
                  d={frontierPath}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="4 2"
                />
              )}

              {/* Scatter Points */}
              {providers.map((p) => {
                const cx = scaleX(p.totalLatencyMs);
                const cy = scaleY(p.qualityScore);
                const isSelected = p.providerId === selectedProviderId;

                return (
                  <g
                    key={p.providerId}
                    onClick={() => {
                      sound.playTap();
                      setSelectedProviderId(p.providerId);
                    }}
                    className="cursor-pointer group"
                  >
                    {/* Outer glow ring for selected point */}
                    {isSelected && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r="10"
                        fill="none"
                        stroke={p.isParetoOptimal ? "#34d399" : "#fbbf24"}
                        strokeWidth="2"
                        className="animate-pulse"
                      />
                    )}

                    <circle
                      cx={cx}
                      cy={cy}
                      r={p.isParetoOptimal ? "6" : "4.5"}
                      fill={p.isParetoOptimal ? "#10b981" : "#f59e0b"}
                      stroke="#0f172a"
                      strokeWidth="1.5"
                      className="transition-transform group-hover:scale-125"
                    />

                    {/* Point Label */}
                    <text
                      x={cx}
                      y={cy - 9}
                      fill={p.isParetoOptimal ? "#a7f3d0" : "#fde68a"}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {p.displayName.split(" ")[0]}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* INSPECTED PROVIDER DETAIL CARD */}
          {selectedProvider && (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-teal-400" />
                  <span className="font-bold text-slate-100 text-sm">
                    {selectedProvider.displayName}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                      selectedProvider.isParetoOptimal
                        ? "bg-emerald-950/80 text-emerald-300 border-emerald-700/60"
                        : "bg-amber-950/80 text-amber-300 border-amber-700/60"
                    }`}
                  >
                    {selectedProvider.isParetoOptimal
                      ? "PARETO OPTIMAL"
                      : "DOMINATED"}
                  </span>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Efficiency: {selectedProvider.efficiencyScore}%
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    <span>Latency</span>
                  </span>
                  <div className="text-xs font-bold text-slate-100 mt-0.5">
                    {selectedProvider.totalLatencyMs}ms
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    TTFT: {selectedProvider.timeToFirstTokenMs}ms
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-emerald-400" />
                    <span>Token Cost</span>
                  </span>
                  <div className="text-xs font-bold text-slate-100 mt-0.5">
                    ${selectedProvider.costPer1kInput.toFixed(4)}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    / 1k in | ${selectedProvider.costPer1kOutput.toFixed(4)} out
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Quality</span>
                  </span>
                  <div className="text-xs font-bold text-slate-100 mt-0.5">
                    {selectedProvider.qualityScore}/100
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Reasoning: {selectedProvider.reasoningScore}/100
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-teal-400" />
                    <span>Privacy</span>
                  </span>
                  <div className="text-xs font-bold text-slate-100 mt-0.5">
                    {selectedProvider.privacyComplianceIndex}%
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {selectedProvider.isAirGapped ? "Air-Gapped" : "Cloud"}
                  </div>
                </div>
              </div>

              {!selectedProvider.isParetoOptimal &&
                selectedProvider.dominatedBy.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40 text-xs text-amber-300/90 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      Dominated by:{" "}
                      <strong>{selectedProvider.dominatedBy.join(", ")}</strong>{" "}
                      (better in all dimensions simultaneously).
                    </span>
                  </div>
                )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ROUTING STRATEGIES */}
      {activeTab === "routing" && (
        <div className="space-y-3">
          {artifact.recommendations.map((rec) => (
            <div
              key={rec.strategy}
              className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-teal-400" />
                  <span className="font-bold text-sm text-slate-100">
                    {rec.title}
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
                  {rec.estimatedMonthlySavingsPct}% Cost Reduction
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-teal-300">
                  Primary: {rec.primaryProviderId}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                  Fallback: {rec.fallbackProviderId}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {rec.rationale}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: BENCHMARK MATRIX */}
      {activeTab === "benchmarks" && (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-mono text-[11px]">
                <th className="py-2.5 px-3">Provider</th>
                <th className="py-2.5 px-2 text-center">Tier</th>
                <th className="py-2.5 px-2 text-center">Pareto Status</th>
                <th className="py-2.5 px-2 text-center">Latency</th>
                <th className="py-2.5 px-2 text-center">Cost / 1k</th>
                <th className="py-2.5 px-2 text-center">Quality</th>
                <th className="py-2.5 px-2 text-center">Privacy</th>
                <th className="py-2.5 px-2 text-center">Efficiency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {providers.map((p) => (
                <tr
                  key={p.providerId}
                  className="hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-2.5 px-3 font-medium text-slate-200">
                    {p.displayName}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {p.tier}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        p.isParetoOptimal
                          ? "bg-emerald-950/80 text-emerald-300 border-emerald-700/60 font-bold"
                          : "bg-slate-900 text-slate-400 border-slate-800"
                      }`}
                    >
                      {p.isParetoOptimal ? "OPTIMAL" : "DOMINATED"}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono text-slate-300">
                    {p.totalLatencyMs}ms
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono text-slate-300">
                    ${p.costPer1kInput.toFixed(4)}
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono font-bold text-teal-300">
                    {p.qualityScore}/100
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono text-slate-300">
                    {p.privacyComplianceIndex}%
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono font-bold text-emerald-400">
                    {p.efficiencyScore}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ParetoFrontierCard;
