"use client";

import React, { useState } from "react";
import {
  Workflow,
  Download,
  Copy,
  Check,
  ShieldCheck,
  Play,
  RotateCcw,
  Layers,
  Activity,
  Code2,
  ChevronRight,
  Terminal,
} from "lucide-react";
import type {
  WorkflowOrchestratorArtifact,
  WorkflowStateNode,
} from "@/lib/types";
import {
  workflowOrchestratorToCsv,
  workflowOrchestratorToMarkdown,
} from "@/lib/workflow/orchestrator-engine";
import { downloadCsvData } from "@/lib/matrix-calculator";
import { sound } from "@/lib/sound";

interface WorkflowOrchestratorCardProps {
  artifact: WorkflowOrchestratorArtifact;
}

export function WorkflowOrchestratorCard({
  artifact,
}: WorkflowOrchestratorCardProps) {
  const [activeTab, setActiveTab] = useState<
    "diagram" | "states" | "transitions" | "trace" | "xstate"
  >("diagram");
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<WorkflowStateNode | null>(
    () => artifact.states[0] || null,
  );

  const handleCopy = (text: string, type: string) => {
    sound.playSuccess();
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDownloadCsv = () => {
    sound.playPop();
    const csvContent = workflowOrchestratorToCsv(artifact);
    const filename = `${artifact.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-transitions.csv`;
    downloadCsvData(csvContent, filename);
  };

  // State type styling
  const getStateColor = (type: WorkflowStateNode["type"]) => {
    switch (type) {
      case "initial":
        return {
          bg: "#0e7490",
          border: "#06b6d4",
          text: "#cffafe",
          badge: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
        };
      case "active":
        return {
          bg: "#1e1b4b",
          border: "#6366f1",
          text: "#e0e7ff",
          badge: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
        };
      case "parallel":
        return {
          bg: "#2e1065",
          border: "#a855f7",
          text: "#f3e8ff",
          badge: "bg-purple-500/10 text-purple-300 border-purple-500/20",
        };
      case "success":
        return {
          bg: "#064e3b",
          border: "#10b981",
          text: "#d1fae5",
          badge: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
        };
      case "failure":
        return {
          bg: "#881337",
          border: "#f43f5e",
          text: "#ffe4e6",
          badge: "bg-rose-500/10 text-rose-300 border-rose-500/20",
        };
      default:
        return {
          bg: "#1e293b",
          border: "#64748b",
          text: "#f1f5f9",
          badge: "bg-slate-800 text-slate-300 border-slate-700",
        };
    }
  };

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Top Banner & Header */}
      <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
            <Workflow className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20 font-semibold">
                Workflow Orchestrator
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {artifact.summary.workflowName}
              </span>
            </div>
            <h2 className="text-sm font-semibold text-white tracking-tight mt-0.5">
              {artifact.title}
            </h2>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              handleCopy(artifact.xstateDefinitionJson, "xstate_json")
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-300 text-xs font-medium transition-colors"
            title="Copy XState v5 JSON Definition"
          >
            {copiedType === "xstate_json" ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Code2 className="w-3.5 h-3.5" />
            )}
            <span>XState</span>
          </button>

          <button
            onClick={() =>
              handleCopy(workflowOrchestratorToMarkdown(artifact), "report")
            }
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

      {/* 4-Metric Scorecard Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-800 border-b border-slate-800">
        <div className="p-3.5 bg-slate-900 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            Orchestrated States
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">
              {artifact.summary.totalStates}
            </span>
            <span className="text-xs text-cyan-400 font-mono">
              finite states
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 truncate">
            Initial: {artifact.summary.initialState}
          </span>
        </div>

        <div className="p-3.5 bg-slate-900 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-violet-400" />
            Event Transitions
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">
              {artifact.summary.totalTransitions}
            </span>
            <span className="text-xs text-violet-400 font-mono">pathways</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 truncate">
            SCC Components: {artifact.summary.stronglyConnectedComponentsCount}
          </span>
        </div>

        <div className="p-3.5 bg-slate-900 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Reachability Score
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-emerald-400">
              {artifact.summary.reachabilityScorePct}%
            </span>
            <span className="text-xs text-emerald-400 font-semibold">
              Grade {artifact.summary.resilienceGrade}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 truncate">
            Deadlocks: {artifact.summary.deadlocksDetected} detected
          </span>
        </div>

        <div className="p-3.5 bg-slate-900 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Play className="w-3.5 h-3.5 text-amber-400" />
            E2E Execution Time
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">
              {(artifact.summary.estimatedEndToEndDurationMs / 1000).toFixed(2)}
              s
            </span>
            <span className="text-xs text-slate-400">simulated</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 truncate">
            {artifact.simulationTrace.length} execution steps
          </span>
        </div>
      </div>

      {/* Navigation View Tabs */}
      <div className="px-4 border-b border-slate-800 bg-slate-950/40 flex items-center gap-1 overflow-x-auto">
        <button
          onClick={() => {
            sound.playTap();
            setActiveTab("diagram");
          }}
          className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "diagram"
              ? "border-violet-400 text-violet-300 bg-violet-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Workflow className="w-3.5 h-3.5" />
          <span>FSM Workflow Diagram</span>
        </button>

        <button
          onClick={() => {
            sound.playTap();
            setActiveTab("states");
          }}
          className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "states"
              ? "border-violet-400 text-violet-300 bg-violet-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>State Catalog ({artifact.states.length})</span>
        </button>

        <button
          onClick={() => {
            sound.playTap();
            setActiveTab("transitions");
          }}
          className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "transitions"
              ? "border-violet-400 text-violet-300 bg-violet-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Event Transitions ({artifact.transitions.length})</span>
        </button>

        <button
          onClick={() => {
            sound.playTap();
            setActiveTab("trace");
          }}
          className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "trace"
              ? "border-violet-400 text-violet-300 bg-violet-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Execution Trace ({artifact.simulationTrace.length})</span>
        </button>

        <button
          onClick={() => {
            sound.playTap();
            setActiveTab("xstate");
          }}
          className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "xstate"
              ? "border-violet-400 text-violet-300 bg-violet-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>XState &amp; Mermaid</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="p-4">
        {/* TAB 1: INTERACTIVE FSM DIAGRAM */}
        {activeTab === "diagram" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono text-[11px] text-violet-400/90 flex items-center gap-1.5">
                <Workflow className="w-3.5 h-3.5 text-violet-400" />
                Deterministic Finite State Automaton
              </span>
              <div className="flex items-center gap-3 text-[10px] font-mono">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  Initial
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  Active
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Success
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  Rollback Saga
                </span>
              </div>
            </div>

            {/* Interactive SVG Canvas */}
            <div className="relative bg-slate-950 rounded-xl border border-slate-800 p-2 overflow-hidden">
              <svg
                viewBox="0 0 820 300"
                className="w-full h-auto"
                role="graphics-document"
                aria-label="Workflow State Machine Diagram"
              >
                <defs>
                  <marker
                    id="wfArrow"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
                  </marker>
                  <marker
                    id="wfArrowComp"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#f43f5e" />
                  </marker>
                </defs>

                {/* Transition Edges */}
                {artifact.transitions.map((t) => {
                  const src = artifact.states.find((s) => s.id === t.source);
                  const tgt = artifact.states.find((s) => s.id === t.target);
                  if (!src || !tgt) return null;

                  const isComp = !!t.compensationAction;

                  // Curved path
                  const midX = (src.x + tgt.x) / 2;
                  const midY = (src.y + tgt.y) / 2 + (isComp ? 35 : -15);
                  const path = `M ${src.x + 35} ${src.y + 18} Q ${midX} ${midY} ${tgt.x - 5} ${tgt.y + 18}`;

                  return (
                    <g key={t.id} className="transition-opacity">
                      <path
                        d={path}
                        fill="none"
                        stroke={isComp ? "#f43f5e" : "#475569"}
                        strokeWidth={isComp ? 1.5 : 1.2}
                        strokeDasharray={isComp ? "3 3" : undefined}
                        markerEnd={
                          isComp ? "url(#wfArrowComp)" : "url(#wfArrow)"
                        }
                      />
                      <text
                        x={midX}
                        y={midY - 4}
                        textAnchor="middle"
                        fill={isComp ? "#fda4af" : "#94a3b8"}
                        fontSize="8"
                        fontFamily="monospace"
                      >
                        {t.event}
                      </text>
                    </g>
                  );
                })}

                {/* State Nodes */}
                {artifact.states.map((state) => {
                  const isSelected = selectedState?.id === state.id;
                  const color = getStateColor(state.type);
                  return (
                    <g
                      key={state.id}
                      className="cursor-pointer transition-transform"
                      onClick={() => {
                        sound.playPop();
                        setSelectedState(state);
                      }}
                    >
                      <rect
                        x={state.x - 45}
                        y={state.y}
                        width="90"
                        height="38"
                        rx="8"
                        fill={color.bg}
                        stroke={isSelected ? "#38bdf8" : color.border}
                        strokeWidth={isSelected ? 2 : 1}
                        fillOpacity="0.85"
                      />
                      <text
                        x={state.x}
                        y={state.y + 16}
                        textAnchor="middle"
                        fill={color.text}
                        fontSize="9"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {state.name.length > 15
                          ? state.name.slice(0, 13) + "…"
                          : state.name}
                      </text>
                      <text
                        x={state.x}
                        y={state.y + 28}
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="7.5"
                        fontFamily="monospace"
                      >
                        {state.type.toUpperCase()}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Selected State Details Drawer */}
            {selectedState && (
              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div
                    className={`px-2 py-1 rounded-md text-[10px] font-mono uppercase font-bold ${getStateColor(selectedState.type).badge}`}
                  >
                    {selectedState.type}
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">
                      {selectedState.name} ({selectedState.id})
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {selectedState.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  {selectedState.retryPolicy && (
                    <div>
                      <span className="text-slate-500 text-[10px] block">
                        Retry Policy
                      </span>
                      <span className="text-slate-300">
                        {selectedState.retryPolicy.maxRetries}x /{" "}
                        {selectedState.retryPolicy.timeoutMs / 1000}s timeout
                      </span>
                    </div>
                  )}
                  {selectedState.entryAction && (
                    <div>
                      <span className="text-slate-500 text-[10px] block">
                        Entry Hook
                      </span>
                      <span className="text-cyan-400">
                        {selectedState.entryAction}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: STATE CATALOG */}
        {activeTab === "states" && (
          <div className="space-y-3">
            <div
              className="overflow-x-auto rounded-xl border border-slate-800"
              role="region"
              tabIndex={0}
              aria-label="Finite State Catalog"
            >
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 text-[11px] font-mono text-slate-400 border-b border-slate-800">
                    <th className="p-3">State Identifier</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Entry / Exit Hooks</th>
                    <th className="p-3">Retry Policy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {artifact.states.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => {
                        sound.playPop();
                        setSelectedState(s);
                      }}
                      className="hover:bg-slate-800/30 cursor-pointer transition-colors"
                    >
                      <td className="p-3 font-semibold text-white flex items-center gap-1.5">
                        <ChevronRight className="w-3 h-3 text-violet-400" />
                        {s.name} ({s.id})
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold ${getStateColor(s.type).badge}`}
                        >
                          {s.type}
                        </span>
                      </td>
                      <td className="p-3 text-slate-300 font-sans">
                        {s.description}
                      </td>
                      <td className="p-3 text-cyan-300">
                        {s.entryAction ? `entry: ${s.entryAction}` : "-"}
                      </td>
                      <td className="p-3 text-slate-400">
                        {s.retryPolicy
                          ? `${s.retryPolicy.maxRetries}x (${s.retryPolicy.timeoutMs / 1000}s)`
                          : "None"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: EVENT TRANSITIONS */}
        {activeTab === "transitions" && (
          <div className="space-y-3">
            <div
              className="overflow-x-auto rounded-xl border border-slate-800"
              role="region"
              tabIndex={0}
              aria-label="Event-Driven State Transitions"
            >
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 text-[11px] font-mono text-slate-400 border-b border-slate-800">
                    <th className="p-3">Trigger Event</th>
                    <th className="p-3">Source State → Target State</th>
                    <th className="p-3">Guard Condition</th>
                    <th className="p-3">Compensation Saga</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {artifact.transitions.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="p-3 font-semibold text-violet-300 flex items-center gap-1.5">
                        <Activity className="w-3 h-3 text-violet-400" />
                        {t.event}
                      </td>
                      <td className="p-3 text-slate-300">
                        <code>{t.source}</code> → <code>{t.target}</code>
                      </td>
                      <td className="p-3 text-emerald-400 font-mono text-[10px]">
                        {t.guardCondition ? t.guardCondition : "Unconditional"}
                      </td>
                      <td className="p-3 text-rose-400 font-mono text-[10px]">
                        {t.compensationAction ? (
                          <span className="flex items-center gap-1">
                            <RotateCcw className="w-3 h-3" />
                            {t.compensationAction}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: SIMULATION TRACE */}
        {activeTab === "trace" && (
          <div className="space-y-3">
            <div className="space-y-2">
              {artifact.simulationTrace.map((tr) => (
                <div
                  key={tr.step}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center justify-center font-mono font-bold text-[10px]">
                      #{tr.step}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-semibold text-white">
                          {tr.event}
                        </span>
                        <span className="text-slate-500">
                          ({tr.fromState} → {tr.toState})
                        </span>
                      </div>
                      <p className="text-slate-300 text-xs mt-1 font-sans">
                        {tr.log}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-[11px] flex-shrink-0">
                    <span className="text-slate-400">{tr.durationMs}ms</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      {tr.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: XSTATE & MERMAID */}
        {activeTab === "xstate" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">
                XState v5 Machine Definition (JSON)
              </span>
              <button
                onClick={() =>
                  handleCopy(artifact.xstateDefinitionJson, "xstate_tab")
                }
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition"
              >
                {copiedType === "xstate_tab" ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>Copy XState</span>
              </button>
            </div>
            <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-violet-200 overflow-x-auto leading-relaxed max-h-72">
              {artifact.xstateDefinitionJson}
            </pre>

            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-slate-400 font-mono">
                Mermaid stateDiagram-v2
              </span>
              <button
                onClick={() =>
                  handleCopy(artifact.mermaidStateDiagram, "mermaid_tab")
                }
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition"
              >
                {copiedType === "mermaid_tab" ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>Copy Mermaid</span>
              </button>
            </div>
            <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-cyan-200 overflow-x-auto leading-relaxed">
              {artifact.mermaidStateDiagram}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
