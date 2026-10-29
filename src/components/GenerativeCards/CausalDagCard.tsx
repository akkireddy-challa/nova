"use client";

import React, { useState, useMemo } from "react";
import {
  GitMerge,
  Download,
  Copy,
  Check,
  ShieldCheck,
  Target,
  TrendingDown,
  Info,
  Activity,
  Layers,
  Zap,
} from "lucide-react";
import type { CausalDagArtifact, CausalNode } from "@/lib/types";
import {
  causalDagToCsv,
  causalDagToMarkdown,
} from "@/lib/causal/causal-dag-engine";
import { downloadCsvData } from "@/lib/matrix-calculator";
import { sound } from "@/lib/sound";

interface CausalDagCardProps {
  artifact: CausalDagArtifact;
}

export function CausalDagCard({ artifact }: CausalDagCardProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string>(
    artifact.nodes[0]?.id || "",
  );
  const [activeTab, setActiveTab] = useState<
    "dag" | "counterfactuals" | "paths"
  >("dag");
  const [copiedType, setCopiedType] = useState<"report" | null>(null);

  const selectedNode = useMemo(
    () =>
      artifact.nodes.find((n) => n.id === selectedNodeId) || artifact.nodes[0],
    [artifact.nodes, selectedNodeId],
  );

  const handleCopyMarkdown = () => {
    const md = causalDagToMarkdown(artifact);
    navigator.clipboard.writeText(md);
    setCopiedType("report");
    sound.playPop();
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDownloadCsv = () => {
    const csv = causalDagToCsv(artifact);
    const filename = `${artifact.id || "causal-dag"}.csv`;
    downloadCsvData(csv, filename);
    sound.playSuccess();
  };

  const getNodeColor = (role: CausalNode["role"]) => {
    switch (role) {
      case "treatment":
        return {
          fill: "#3b82f6",
          stroke: "#60a5fa",
          bg: "bg-blue-500/10 text-blue-400 border-blue-500/30",
        };
      case "outcome":
        return {
          fill: "#10b981",
          stroke: "#34d399",
          bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        };
      case "confounder":
        return {
          fill: "#f59e0b",
          stroke: "#fbbf24",
          bg: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        };
      case "mediator":
        return {
          fill: "#a855f7",
          stroke: "#c084fc",
          bg: "bg-purple-500/10 text-purple-400 border-purple-500/30",
        };
      case "instrumental":
        return {
          fill: "#06b6d4",
          stroke: "#22d3ee",
          bg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
        };
      default:
        return {
          fill: "#94a3b8",
          stroke: "#cbd5e1",
          bg: "bg-slate-500/10 text-slate-400 border-slate-500/30",
        };
    }
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md flex flex-col">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
            <GitMerge className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">
                {artifact.hypothesis}
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Backdoor Criterion:{" "}
                {artifact.summary.backdoorCriterionSatisfied
                  ? "Satisfied"
                  : "Violated"}
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-indigo-300">
                {artifact.summary.causalIdentifiability.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Pearlian do-calculus causal identification and counterfactual
              intervention studio
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-300 text-xs font-medium transition-colors"
            title="Copy Full Markdown Report"
          >
            {copiedType === "report" ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>Report</span>
          </button>

          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-300 text-xs font-medium transition-colors"
            title="Download RFC 4180 CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Scorecard Metric Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-800 border-b border-slate-800">
        <div className="p-3.5 bg-slate-900 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
            Average Treatment Effect
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">
              {artifact.summary.averageTreatmentEffect}
            </span>
            <span className="text-xs text-emerald-400 font-medium">
              E[Y|do(T=1)]
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 truncate">
            Target: {artifact.summary.outcomeNode}
          </span>
        </div>

        <div className="p-3.5 bg-slate-900 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            E-Value Robustness
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">
              {artifact.summary.eValue.toFixed(2)}
            </span>
            <span className="text-xs text-indigo-400 font-medium">
              Min Confounder RR
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5">
            Ding &amp; VanderWeele (2016)
          </span>
        </div>

        <div className="p-3.5 bg-slate-900 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-cyan-400" />
            Relative Risk Ratio
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">
              {artifact.summary.relativeRiskRatio.toFixed(2)}x
            </span>
            <span className="text-xs text-cyan-400 font-medium">
              Risk Reduction
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5">
            Controlled for {artifact.summary.confoundersControlled.length}{" "}
            confounders
          </span>
        </div>

        <div className="p-3.5 bg-slate-900 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            Identifiability
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-base font-bold text-emerald-400 uppercase">
              {artifact.summary.causalIdentifiability}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5">
            Backdoor adjustment valid
          </span>
        </div>
      </div>

      {/* Main View Mode Tabs */}
      <div className="px-4 border-b border-slate-800 bg-slate-950/20 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setActiveTab("dag");
              sound.playTap();
            }}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "dag"
                ? "border-emerald-500 text-emerald-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <GitMerge className="w-3.5 h-3.5" />
            Structural Causal Model DAG
          </button>

          <button
            onClick={() => {
              setActiveTab("counterfactuals");
              sound.playTap();
            }}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "counterfactuals"
                ? "border-emerald-500 text-emerald-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Counterfactual &quot;What-If&quot; Interventions (
            {artifact.counterfactuals.length})
          </button>

          <button
            onClick={() => {
              setActiveTab("paths");
              sound.playTap();
            }}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "paths"
                ? "border-emerald-500 text-emerald-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Causal Pathways &amp; Mechanisms ({artifact.edges.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Causal DAG Canvas & Node Details Drawer */}
      {activeTab === "dag" && (
        <div className="p-4 sm:p-5 flex flex-col lg:flex-row gap-5 items-start">
          {/* Interactive DAG SVG */}
          <div className="w-full lg:w-3/5 bg-slate-950/90 border border-slate-800 rounded-xl p-4 flex flex-col items-center shadow-inner relative">
            <div className="w-full flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-mono text-[11px] flex items-center gap-1.5">
                <GitMerge className="w-3.5 h-3.5 text-emerald-400" />
                Directed Causal Pathways &amp; Blocked Backdoors
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Click node to inspect mechanism
              </span>
            </div>

            <svg
              viewBox="0 0 500 480"
              role="graphics-document"
              tabIndex={0}
              aria-label="Structural Causal Model Directed Acyclic Graph"
              className="w-full aspect-square max-h-[460px] border border-slate-800/80 rounded-lg bg-slate-900/40 select-none"
            >
              <defs>
                <marker
                  id="arrowhead-direct"
                  markerWidth="8"
                  markerHeight="6"
                  refX="8"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 8 3, 0 6" fill="#10b981" />
                </marker>
                <marker
                  id="arrowhead-backdoor"
                  markerWidth="8"
                  markerHeight="6"
                  refX="8"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 8 3, 0 6" fill="#f59e0b" />
                </marker>
              </defs>

              {/* Causal Edges / Pathways */}
              {artifact.edges.map((e) => {
                const src = artifact.nodes.find((n) => n.id === e.source);
                const tgt = artifact.nodes.find((n) => n.id === e.target);
                if (!src || !tgt) return null;

                const midX = (src.x + tgt.x) / 2;
                const midY = (src.y + tgt.y) / 2;

                return (
                  <g key={e.id}>
                    <line
                      x1={src.x}
                      y1={src.y}
                      x2={tgt.x}
                      y2={tgt.y}
                      stroke={e.isBackdoorPath ? "#f59e0b" : "#10b981"}
                      strokeWidth={Math.max(1.5, Math.abs(e.coefficient) * 3)}
                      strokeDasharray={e.isBackdoorPath ? "4 4" : undefined}
                      markerEnd={
                        e.isBackdoorPath
                          ? "url(#arrowhead-backdoor)"
                          : "url(#arrowhead-direct)"
                      }
                      opacity={e.isBlocked ? 0.7 : 1.0}
                    />
                    <rect
                      x={midX - 18}
                      y={midY - 9}
                      width="36"
                      height="18"
                      rx="4"
                      fill="#0f172a"
                      stroke={e.isBackdoorPath ? "#f59e0b" : "#10b981"}
                      strokeWidth="1"
                    />
                    <text
                      x={midX}
                      y={midY + 3}
                      textAnchor="middle"
                      fill="#e2e8f0"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {e.coefficient > 0
                        ? `+${e.coefficient.toFixed(2)}`
                        : e.coefficient.toFixed(2)}
                    </text>
                  </g>
                );
              })}

              {/* Causal Nodes */}
              {artifact.nodes.map((n) => {
                const isSelected = n.id === selectedNode?.id;
                const style = getNodeColor(n.role);

                return (
                  <g
                    key={n.id}
                    onClick={() => {
                      setSelectedNodeId(n.id);
                      sound.playTap();
                    }}
                    className="cursor-pointer transition-transform hover:scale-110"
                  >
                    {isSelected && (
                      <circle
                        cx={n.x}
                        cy={n.y}
                        r="26"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                        className="animate-spin"
                      />
                    )}
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r="20"
                      fill="#0f172a"
                      stroke={style.stroke}
                      strokeWidth="2.5"
                    />
                    <text
                      x={n.x}
                      y={n.y + 4}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {n.role === "treatment"
                        ? "T"
                        : n.role === "outcome"
                          ? "Y"
                          : n.role === "confounder"
                            ? "Z"
                            : n.role === "mediator"
                              ? "M"
                              : "I"}
                    </text>
                    <text
                      x={n.x}
                      y={n.y + 36}
                      textAnchor="middle"
                      fill="#cbd5e1"
                      fontSize="9"
                      fontFamily="sans-serif"
                      fontWeight="bold"
                    >
                      {n.label.length > 20
                        ? `${n.label.slice(0, 18)}…`
                        : n.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Legend Bar */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-3">
              <div className="flex items-center gap-1.5 text-[11px] font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-slate-300">Treatment (T)</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-300">Outcome (Y)</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-slate-300">Confounder (Z)</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span className="text-slate-300">Mediator (M)</span>
              </div>
            </div>
          </div>

          {/* Node Inspector Drawer */}
          {selectedNode && (
            <div className="w-full lg:w-2/5 flex flex-col gap-4 bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block">
                    Causal Node Inspector
                  </span>
                  <h3 className="text-sm font-semibold text-white mt-0.5">
                    {selectedNode.label}
                  </h3>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${getNodeColor(selectedNode.role).bg}`}
                >
                  {selectedNode.role.toUpperCase()}
                </span>
              </div>

              {/* Observed Value & Dimension */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">
                    Observed Mean
                  </span>
                  <span className="text-xs font-bold text-slate-200 mt-0.5 block">
                    {selectedNode.observedMean} {selectedNode.unit}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">
                    Coordinates (X, Y)
                  </span>
                  <span className="text-xs font-bold text-slate-200 mt-0.5 block">
                    ({selectedNode.x}, {selectedNode.y})
                  </span>
                </div>
              </div>

              {/* Functional Description */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans">
                <span className="font-semibold text-slate-200 block mb-1">
                  Causal Description:
                </span>
                {selectedNode.description}
              </div>

              {/* Connected Ingress / Egress Causal Paths */}
              <div>
                <span className="text-[11px] font-mono text-slate-400 block mb-2">
                  Connected Structural Equations:
                </span>
                <div className="space-y-1.5">
                  {artifact.edges
                    .filter(
                      (e) =>
                        e.source === selectedNode.id ||
                        e.target === selectedNode.id,
                    )
                    .map((e) => {
                      const other =
                        e.source === selectedNode.id
                          ? artifact.nodes.find((n) => n.id === e.target)
                          : artifact.nodes.find((n) => n.id === e.source);
                      const isOutgoing = e.source === selectedNode.id;

                      return (
                        <div
                          key={e.id}
                          className="p-2 rounded bg-slate-900/80 border border-slate-800 text-[11px] flex items-center justify-between"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 font-mono">
                              {isOutgoing ? "→" : "←"} {other?.label}
                            </span>
                            {e.isBackdoorPath && (
                              <span className="text-[9px] px-1 rounded bg-amber-950 text-amber-300 font-mono">
                                BACKDOOR
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-emerald-400 font-bold">
                            β ={" "}
                            {e.coefficient > 0
                              ? `+${e.coefficient.toFixed(2)}`
                              : e.coefficient.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Counterfactual What-If Scenarios */}
      {activeTab === "counterfactuals" && (
        <div className="p-4 sm:p-5 flex flex-col gap-4">
          <span className="text-xs font-medium text-slate-400">
            Counterfactual Interventions: Estimating outcomes under Pearlian
            do-calculus interventions
          </span>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {artifact.counterfactuals.map((cf) => (
              <div
                key={cf.id}
                className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between gap-3 shadow-sm hover:border-slate-700 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-white">
                      {cf.name}
                    </h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                      ITE:{" "}
                      {cf.individualTreatmentEffect > 0
                        ? `+${cf.individualTreatmentEffect}`
                        : cf.individualTreatmentEffect}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 text-xs">
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase block font-mono">
                        Factual Reality
                      </span>
                      <p className="text-slate-300 mt-0.5 font-sans">
                        {cf.factualCondition} →{" "}
                        <strong className="text-white">
                          {cf.factualOutcome}
                        </strong>
                      </p>
                    </div>

                    <div className="p-2 rounded bg-indigo-950/40 border border-indigo-900/60">
                      <span className="text-[10px] text-indigo-400 uppercase block font-mono">
                        Pearlian Intervention
                      </span>
                      <code className="text-[11px] font-mono text-indigo-300 font-bold block mt-0.5">
                        {cf.intervention}
                      </code>
                    </div>

                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase block font-mono">
                        Counterfactual Outcome
                      </span>
                      <p className="text-emerald-300 font-medium mt-0.5 font-sans">
                        {cf.counterfactualOutcome}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed font-sans border-t border-slate-800/80 pt-2">
                  {cf.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Causal Pathways & Sensitivity Table (Conforming to modern-web-guidance responsive-table) */}
      {activeTab === "paths" && (
        <div className="p-4 sm:p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Structural equation path coefficients (β) and physical mechanisms
            </span>
            <span className="text-xs text-emerald-400 font-mono font-medium">
              Pearl Backdoor Criterion Satisfied
            </span>
          </div>

          <div
            tabIndex={0}
            role="region"
            aria-label="Causal Pathways & Structural Equation Table"
            className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/60 max-h-96"
          >
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-900 text-slate-400 font-medium border-b border-slate-800 z-10">
                <tr>
                  <th scope="col" className="p-3">
                    Source Node
                  </th>
                  <th scope="col" className="p-3">
                    Target Node
                  </th>
                  <th scope="col" className="p-3 text-center">
                    Path Coeff (β)
                  </th>
                  <th scope="col" className="p-3 text-center">
                    p-value
                  </th>
                  <th scope="col" className="p-3 text-center">
                    Backdoor Status
                  </th>
                  <th scope="col" className="p-3">
                    Physical Mechanism
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {artifact.edges.map((e) => {
                  const src = artifact.nodes.find((n) => n.id === e.source);
                  const tgt = artifact.nodes.find((n) => n.id === e.target);
                  return (
                    <tr
                      key={e.id}
                      className="hover:bg-slate-900/40 transition-colors"
                    >
                      <td className="p-3 font-medium text-slate-200">
                        {src?.label || e.source}
                      </td>
                      <td className="p-3 font-medium text-slate-200">
                        {tgt?.label || e.target}
                      </td>
                      <td className="p-3 text-center font-bold text-emerald-400">
                        {e.coefficient > 0
                          ? `+${e.coefficient.toFixed(2)}`
                          : e.coefficient.toFixed(2)}
                      </td>
                      <td className="p-3 text-center text-slate-400">
                        {e.pValue.toFixed(3)}
                      </td>
                      <td className="p-3 text-center">
                        {e.isBackdoorPath ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 font-mono">
                            {e.isBlocked ? "BLOCKED" : "OPEN"}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 font-mono">
                            DIRECT
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-400 font-sans text-xs">
                        {e.mechanism}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer Notes */}
      {artifact.technicalNotes && (
        <div className="px-4 py-3 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{artifact.technicalNotes}</span>
        </div>
      )}
    </div>
  );
}
