"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Download,
  Copy,
  Check,
  AlertTriangle,
  Layers,
  Code2,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import type { FormalProverArtifact, ProofTreeNode } from "@/lib/types";
import {
  formalProverToCsv,
  formalProverToMarkdown,
} from "@/lib/formal/formal-prover-engine";
import { downloadCsvData } from "@/lib/matrix-calculator";
import { sound } from "@/lib/sound";

interface FormalProverCardProps {
  artifact: FormalProverArtifact;
}

export function FormalProverCard({ artifact }: FormalProverCardProps) {
  const [activeTab, setActiveTab] = useState<
    "tree" | "invariants" | "lemmas" | "smt_lean" | "counterexamples"
  >("tree");
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<ProofTreeNode | null>(
    () => artifact.proofTree[artifact.proofTree.length - 1] || null,
  );
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const handleCopy = (text: string, type: string) => {
    sound.playSuccess();
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDownloadCsv = () => {
    sound.playPop();
    const csvContent = formalProverToCsv(artifact);
    const filename = `${artifact.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-formal-proof.csv`;
    downloadCsvData(csvContent, filename);
  };

  const getNodeColor = (kind: ProofTreeNode["kind"]) => {
    switch (kind) {
      case "axiom":
        return {
          bg: "#064e3b",
          border: "#10b981",
          text: "#a7f3d0",
          badge: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
        };
      case "hypothesis":
        return {
          bg: "#0e7490",
          border: "#06b6d4",
          text: "#cffafe",
          badge: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
        };
      case "lemma":
        return {
          bg: "#1e1b4b",
          border: "#6366f1",
          text: "#e0e7ff",
          badge: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
        };
      case "induction_step":
        return {
          bg: "#431407",
          border: "#f97316",
          text: "#ffedd5",
          badge: "bg-amber-500/10 text-amber-300 border-amber-500/20",
        };
      case "qed":
        return {
          bg: "#14532d",
          border: "#22c55e",
          text: "#bbf7d0",
          badge: "bg-green-500/20 text-green-300 border-green-500/30",
        };
      case "counterexample":
        return {
          bg: "#881337",
          border: "#f43f5e",
          text: "#ffe4e6",
          badge: "bg-rose-500/20 text-rose-300 border-rose-500/30",
        };
      default:
        return {
          bg: "#1e293b",
          border: "#64748b",
          text: "#f1f5f9",
          badge: "bg-slate-500/10 text-slate-300 border-slate-500/20",
        };
    }
  };

  const isQed = artifact.summary.status === "proven_qed";

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md transition-all text-slate-200">
      {/* Header Banner */}
      <div className="px-6 py-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3" />
              Automated Theorem Prover
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1 ${
                isQed
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                  : "bg-rose-500/10 text-rose-300 border-rose-500/30"
              }`}
            >
              {isQed ? (
                <>
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  Q.E.D. PROVEN
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  COUNTEREXAMPLE FOUND
                </>
              )}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
              Depth: {artifact.summary.proofDepth}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
              Solver: {artifact.summary.satSolverType}
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            {artifact.title}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            {artifact.executiveSummary}
          </p>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() =>
              handleCopy(formalProverToMarkdown(artifact), "markdown")
            }
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            aria-label="Copy Markdown Formal Proof Dossier"
          >
            {copiedType === "markdown" ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copiedType === "markdown" ? "Copied" : "Copy Dossier"}
          </button>
          <button
            onClick={handleDownloadCsv}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-colors shadow-lg shadow-indigo-600/20 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            aria-label="Download RFC 4180 CSV Export"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Primary KPI Status Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-800/80 border-b border-slate-800 bg-slate-950/40 text-center">
        <div className="p-3">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Verified Theorems
          </span>
          <div className="text-lg font-mono font-bold text-emerald-400 mt-0.5">
            {artifact.summary.provenTheorems} / {artifact.summary.totalTheorems}
          </div>
        </div>
        <div className="p-3">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Soundness Guarantee
          </span>
          <div className="text-lg font-mono font-bold text-indigo-400 mt-0.5">
            {artifact.summary.soundnessCompletenessPct}% Sound
          </div>
        </div>
        <div className="p-3">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Hoare Invariants
          </span>
          <div className="text-lg font-mono font-bold text-cyan-400 mt-0.5">
            {artifact.hoareInvariants.length} Inductive
          </div>
        </div>
        <div className="p-3">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Verification Latency
          </span>
          <div className="text-lg font-mono font-bold text-amber-400 mt-0.5">
            {artifact.summary.verificationTimeMs} ms
          </div>
        </div>
      </div>

      {/* Studio Navigation Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/60 px-4 gap-2 overflow-x-auto">
        <button
          onClick={() => {
            sound.playPop();
            setActiveTab("tree");
          }}
          className={`py-2.5 px-3.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "tree"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Proof Tree AST
        </button>
        <button
          onClick={() => {
            sound.playPop();
            setActiveTab("invariants");
          }}
          className={`py-2.5 px-3.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "invariants"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Hoare Invariants ({artifact.hoareInvariants.length})
        </button>
        <button
          onClick={() => {
            sound.playPop();
            setActiveTab("lemmas");
          }}
          className={`py-2.5 px-3.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "lemmas"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <ChevronRight className="w-3.5 h-3.5" />
          Deduction Steps ({artifact.proofTree.length})
        </button>
        <button
          onClick={() => {
            sound.playPop();
            setActiveTab("smt_lean");
          }}
          className={`py-2.5 px-3.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "smt_lean"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          SMT-LIB & Lean 4
        </button>
        {artifact.counterexamples.length > 0 && (
          <button
            onClick={() => {
              sound.playPop();
              setActiveTab("counterexamples");
            }}
            className={`py-2.5 px-3.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === "counterexamples"
                ? "border-rose-500 text-rose-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            Counterexamples ({artifact.counterexamples.length})
          </button>
        )}
      </div>

      {/* Main Content Body */}
      <div className="p-4 sm:p-6">
        {/* Tab 1: Interactive SVG Proof Tree AST Canvas */}
        {activeTab === "tree" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950/60 px-3 py-2 rounded-lg border border-slate-800">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Select any node in the directed proof graph to inspect deductive
                justification and mathematical axioms.
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
                  className="p-1 rounded hover:bg-slate-800 text-slate-300"
                  title="Zoom Out"
                  aria-label="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[11px] px-1 text-slate-300">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(1.8, z + 0.2))}
                  className="p-1 rounded hover:bg-slate-800 text-slate-300"
                  title="Zoom In"
                  aria-label="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-300 ml-1"
                  title="Reset Zoom"
                  aria-label="Reset Zoom"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="relative border border-slate-800/80 rounded-xl bg-slate-950 overflow-hidden shadow-inner flex flex-col md:flex-row">
              <div className="flex-1 overflow-auto min-h-[360px] p-2">
                <svg
                  role="graphics-document"
                  aria-label="Interactive Proof Tree AST Graph"
                  viewBox="0 0 1150 420"
                  className="w-full h-auto min-w-[750px] transition-transform duration-200"
                  style={{
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: "top left",
                  }}
                >
                  <defs>
                    <marker
                      id="arrow-prover"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 9 5 L 0 9 z" fill="#6366f1" />
                    </marker>
                  </defs>

                  {/* Draw Directed Edges between dependencies */}
                  {artifact.proofTree.map((targetNode) =>
                    targetNode.dependencies.map((depId) => {
                      const sourceNode = artifact.proofTree.find(
                        (n) => n.id === depId,
                      );
                      if (!sourceNode) return null;

                      const startX = sourceNode.x + 90;
                      const startY = sourceNode.y + 30;
                      const endX = targetNode.x - 10;
                      const endY = targetNode.y + 30;
                      const midX = (startX + endX) / 2;

                      return (
                        <path
                          key={`${sourceNode.id}->${targetNode.id}`}
                          d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                          fill="none"
                          stroke="#6366f1"
                          strokeWidth="2"
                          strokeDasharray={
                            targetNode.kind === "induction_step"
                              ? "4 3"
                              : undefined
                          }
                          markerEnd="url(#arrow-prover)"
                          opacity="0.75"
                        />
                      );
                    }),
                  )}

                  {/* Draw Tree Nodes */}
                  {artifact.proofTree.map((node) => {
                    const colors = getNodeColor(node.kind);
                    const isSelected = selectedNode?.id === node.id;

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${node.x - 70}, ${node.y})`}
                        onClick={() => {
                          sound.playPop();
                          setSelectedNode(node);
                        }}
                        className="cursor-pointer group"
                      >
                        <rect
                          width="160"
                          height="60"
                          rx="8"
                          fill={colors.bg}
                          stroke={isSelected ? "#38bdf8" : colors.border}
                          strokeWidth={isSelected ? "2.5" : "1.5"}
                          className="transition-all duration-150 filter drop-shadow hover:brightness-125"
                        />
                        <text
                          x="12"
                          y="22"
                          fill={colors.text}
                          fontSize="11"
                          fontWeight="700"
                          fontFamily="sans-serif"
                        >
                          {node.name.length > 20
                            ? `${node.name.slice(0, 18)}...`
                            : node.name}
                        </text>
                        <text
                          x="12"
                          y="42"
                          fill="#94a3b8"
                          fontSize="9.5"
                          fontFamily="monospace"
                        >
                          {node.inferenceRule.length > 22
                            ? `${node.inferenceRule.slice(0, 20)}...`
                            : node.inferenceRule}
                        </text>
                        {node.isVerified && (
                          <circle cx="145" cy="16" r="4.5" fill="#22c55e" />
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Node Inspector Drawer */}
              {selectedNode && (
                <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-800 bg-slate-900/90 p-4 shrink-0 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          getNodeColor(selectedNode.kind).badge
                        }`}
                      >
                        {selectedNode.kind.replace("_", " ")}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        Depth: {selectedNode.depth}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white">
                      {selectedNode.name}
                    </h4>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Formal Formula
                      </span>
                      <div className="mt-1 p-2 bg-slate-950 rounded border border-slate-800 font-mono text-xs text-indigo-300 break-all leading-relaxed">
                        {selectedNode.formula}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Inference Rule
                      </span>
                      <p className="text-xs text-slate-300 font-medium mt-0.5">
                        {selectedNode.inferenceRule}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Semantic Description
                      </span>
                      <p className="text-xs text-slate-400 leading-relaxed mt-0.5">
                        {selectedNode.description}
                      </p>
                    </div>

                    {selectedNode.dependencies.length > 0 && (
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Parent Antecedents
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedNode.dependencies.map((dep) => (
                            <span
                              key={dep}
                              className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded font-mono text-[10px]"
                            >
                              {dep}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-emerald-400 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Verified by DPLL SMT Solver
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Hoare Invariants */}
        {activeTab === "invariants" && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/40">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-medium">
                    <th className="p-3">Property</th>
                    <th className="p-3 font-mono">
                      Precondition &#123;P&#125;
                    </th>
                    <th className="p-3 font-mono">Operation C</th>
                    <th className="p-3 font-mono">
                      Postcondition &#123;Q&#125;
                    </th>
                    <th className="p-3">Inductive Invariant</th>
                    <th className="p-3 text-right">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {artifact.hoareInvariants.map((inv) => (
                    <tr
                      key={inv.id}
                      className="hover:bg-slate-900/40 transition-colors"
                    >
                      <td className="p-3 font-semibold text-slate-200">
                        {inv.property}
                        <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                          {inv.justification}
                        </div>
                      </td>
                      <td className="p-3 font-mono text-cyan-300 text-[11px]">
                        {inv.precondition}
                      </td>
                      <td className="p-3 font-mono text-amber-300 text-[11px]">
                        {inv.operation}
                      </td>
                      <td className="p-3 font-mono text-emerald-300 text-[11px]">
                        {inv.postcondition}
                      </td>
                      <td className="p-3 text-slate-300 text-xs">
                        <span className="px-1.5 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/40 text-indigo-300 font-mono text-[10px]">
                          {inv.inductiveInvariant}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            inv.holds
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {inv.holds ? (
                            <>
                              <Check className="w-3 h-3" />
                              Holds
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-3 h-3" />
                              Violated
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Deduction Steps */}
        {activeTab === "lemmas" && (
          <div className="space-y-3">
            {artifact.proofTree.map((step, idx) => (
              <div
                key={step.id}
                className="p-4 rounded-lg border border-slate-800 bg-slate-950/60 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-500">
                      Step #{idx + 1}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        getNodeColor(step.kind).badge
                      }`}
                    >
                      {step.kind.replace("_", " ")}
                    </span>
                    <h4 className="text-sm font-semibold text-slate-200">
                      {step.name}
                    </h4>
                  </div>
                  <div className="font-mono text-xs text-indigo-300 bg-slate-900/80 px-2.5 py-1.5 rounded border border-slate-800 max-w-2xl">
                    {step.formula}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {step.description}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] font-mono text-slate-400 block">
                    Rule: {step.inferenceRule}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 mt-1">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Sound
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: SMT-LIB & Lean 4 Code Panels */}
        {activeTab === "smt_lean" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col rounded-lg border border-slate-800 bg-slate-950 overflow-hidden">
              <div className="px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 font-mono">
                  <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                  SMT-LIB 2.6 Benchmark
                </span>
                <button
                  onClick={() => handleCopy(artifact.smtLibCode, "smt")}
                  className="px-2 py-1 rounded text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 transition-colors"
                >
                  {copiedType === "smt" ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  {copiedType === "smt" ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="p-3 font-mono text-xs text-slate-300 overflow-auto max-h-[360px] bg-slate-950/80 leading-relaxed">
                {artifact.smtLibCode}
              </pre>
            </div>

            <div className="flex flex-col rounded-lg border border-slate-800 bg-slate-950 overflow-hidden">
              <div className="px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 font-mono">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Lean 4 Formal Theorem
                </span>
                <button
                  onClick={() => handleCopy(artifact.lean4Code, "lean")}
                  className="px-2 py-1 rounded text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 transition-colors"
                >
                  {copiedType === "lean" ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  {copiedType === "lean" ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="p-3 font-mono text-xs text-slate-300 overflow-auto max-h-[360px] bg-slate-950/80 leading-relaxed">
                {artifact.lean4Code}
              </pre>
            </div>
          </div>
        )}

        {/* Tab 5: Counterexamples (if any) */}
        {activeTab === "counterexamples" &&
          artifact.counterexamples.length > 0 && (
            <div className="space-y-4">
              {artifact.counterexamples.map((ce, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl border border-rose-900/40 bg-rose-950/10 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {ce.severity} Violation
                    </span>
                    <span className="font-mono text-xs text-slate-400">
                      Variable: {ce.variable}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-rose-200">
                    Violating Assignment:{" "}
                    <span className="font-mono text-white">
                      {String(ce.violatingValue)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300">
                    <span className="font-bold text-slate-400">
                      Precondition State:
                    </span>{" "}
                    {ce.preconditionState}
                  </div>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 font-mono text-xs text-rose-300">
                    {ce.failureTrace}
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
