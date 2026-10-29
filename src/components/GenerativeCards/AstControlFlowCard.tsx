"use client";

import React, { useState } from "react";
import {
  Code2,
  Download,
  Copy,
  Check,
  Award,
  Layers,
  Activity,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  GitBranch,
  ShieldAlert,
  Terminal,
} from "lucide-react";
import type { AstControlFlowArtifact, BasicBlockNode } from "@/lib/types";
import { cfgToCsv, cfgToMarkdown } from "@/lib/ast/cfg-decompiler-engine";
import { downloadCsvData } from "@/lib/matrix-calculator";
import { sound } from "@/lib/sound";

interface AstControlFlowCardProps {
  artifact: AstControlFlowArtifact;
}

export function AstControlFlowCard({ artifact }: AstControlFlowCardProps) {
  const [activeTab, setActiveTab] = useState<
    "canvas" | "blocks" | "dominators" | "defuse" | "decompiled"
  >("canvas");
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<BasicBlockNode | null>(
    () => artifact.basicBlocks[0] || null,
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
    const csvContent = cfgToCsv(artifact);
    const filename = `${artifact.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-cfg.csv`;
    downloadCsvData(csvContent, filename);
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md transition-all text-slate-200">
      {/* Header Banner */}
      <div className="px-6 py-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-sky-950/20 to-slate-900">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center gap-1.5">
              <GitBranch className="w-3 h-3" />
              CFG &amp; Symbolic Decompiler Studio
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <Award className="w-3 h-3 text-emerald-400" />
              Complexity: {artifact.summary.cyclomaticComplexity} (
              {artifact.summary.complexityGrade})
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              Blocks: {artifact.summary.totalBasicBlocks}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
              Loops: {artifact.summary.naturalLoopCount}
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            {artifact.title}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            {artifact.executiveSummary}
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleCopy(cfgToMarkdown(artifact), "markdown")}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors focus:ring-2 focus:ring-sky-500 focus:outline-none"
            aria-label="Copy Markdown Dossier"
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
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1.5 transition-colors shadow-lg shadow-sky-600/20 focus:ring-2 focus:ring-sky-400 focus:outline-none"
            aria-label="Download RFC 4180 CSV Export"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-800/80 border-b border-slate-800 bg-slate-950/40 text-center">
        <div className="p-3">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Cyclomatic Complexity
          </span>
          <div className="text-lg font-bold text-sky-400 mt-0.5">
            M = {artifact.summary.cyclomaticComplexity}
          </div>
          <span className="text-[10px] text-slate-500">
            {artifact.summary.complexityGrade}
          </span>
        </div>
        <div className="p-3">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Basic Blocks
          </span>
          <div className="text-lg font-bold text-emerald-400 mt-0.5">
            {artifact.summary.totalBasicBlocks}
          </div>
          <span className="text-[10px] text-slate-500">
            {artifact.summary.totalEdges} Directed Edges
          </span>
        </div>
        <div className="p-3">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Natural Loops
          </span>
          <div className="text-lg font-bold text-amber-400 mt-0.5">
            {artifact.summary.naturalLoopCount}
          </div>
          <span className="text-[10px] text-slate-500">Back-edge Cycles</span>
        </div>
        <div className="p-3">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Dead Store Status
          </span>
          <div
            className={`text-lg font-bold mt-0.5 ${
              artifact.summary.hasDeadCode
                ? "text-rose-400"
                : "text-emerald-400"
            }`}
          >
            {artifact.summary.hasDeadCode
              ? "Alert: Dead Store"
              : "Clean Def-Use"}
          </div>
          <span className="text-[10px] text-slate-500">SSA Variable Audit</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-800 bg-slate-900/60 px-4 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab("canvas")}
          className={`py-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === "canvas"
              ? "border-sky-400 text-sky-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          Control Flow Graph Canvas
        </button>
        <button
          onClick={() => setActiveTab("blocks")}
          className={`py-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === "blocks"
              ? "border-sky-400 text-sky-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Basic Blocks ({artifact.basicBlocks.length})
        </button>
        <button
          onClick={() => setActiveTab("dominators")}
          className={`py-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === "dominators"
              ? "border-sky-400 text-sky-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Dominator Tree &amp; Loops
        </button>
        <button
          onClick={() => setActiveTab("defuse")}
          className={`py-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === "defuse"
              ? "border-sky-400 text-sky-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          SSA &amp; Def-Use Chains
        </button>
        <button
          onClick={() => setActiveTab("decompiled")}
          className={`py-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === "decompiled"
              ? "border-sky-400 text-sky-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          Decompiler Pseudocode
        </button>
      </div>

      {/* Tab Content Panels */}
      <div className="p-6">
        {activeTab === "canvas" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* SVG Interactive CFG Canvas */}
            <div className="lg:col-span-2 bg-slate-950/60 rounded-xl p-4 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-medium text-slate-400 flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-sky-400" />
                  CFG Basic Block Topology: {artifact.summary.functionName}
                </div>
                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-1">
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                    title="Zoom Out"
                    aria-label="Zoom Out CFG"
                  >
                    <ZoomOut className="w-3 h-3" />
                  </button>
                  <span className="text-[10px] font-mono px-1 text-slate-400">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(1.8, z + 0.2))}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                    title="Zoom In"
                    aria-label="Zoom In CFG"
                  >
                    <ZoomIn className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setZoomLevel(1)}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                    title="Reset Zoom"
                    aria-label="Reset CFG Zoom"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto flex justify-center py-4">
                <div
                  style={{
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: "top center",
                  }}
                  className="transition-transform duration-200"
                >
                  <svg
                    width="560"
                    height="680"
                    viewBox="0 0 560 680"
                    className="select-none"
                    role="graphics-document"
                    aria-label="Control Flow Graph Canvas"
                  >
                    <defs>
                      <marker
                        id="cfg-arrow"
                        viewBox="0 0 10 10"
                        refX="8"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto"
                      >
                        <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
                      </marker>
                      <marker
                        id="cfg-back-arrow"
                        viewBox="0 0 10 10"
                        refX="8"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto"
                      >
                        <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
                      </marker>
                      <marker
                        id="cfg-revert-arrow"
                        viewBox="0 0 10 10"
                        refX="8"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto"
                      >
                        <path d="M 0 1 L 10 5 L 0 9 z" fill="#f43f5e" />
                      </marker>
                    </defs>

                    {/* Render Edges */}
                    {artifact.edges.map((edge) => {
                      const fromNode = artifact.basicBlocks.find(
                        (b) => b.id === edge.fromBlockId,
                      );
                      const toNode = artifact.basicBlocks.find(
                        (b) => b.id === edge.toBlockId,
                      );
                      if (!fromNode || !toNode) return null;

                      const isBackEdge = edge.kind === "back_edge";
                      const isRevert = edge.toBlockId.includes("revert");

                      const startX = fromNode.x + 70;
                      const startY = fromNode.y + 70;
                      const endX = toNode.x + 70;
                      const endY = toNode.y;

                      let d = "";
                      if (isBackEdge) {
                        // Loop back-edge arc curving to the left
                        d = `M ${startX - 70} ${startY - 35} C ${startX - 120} ${startY - 35}, ${endX - 120} ${endY + 35}, ${endX - 70} ${endY + 35}`;
                      } else {
                        // Forward Bézier curve
                        const midY = (startY + endY) / 2;
                        d = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
                      }

                      return (
                        <g key={edge.id}>
                          <path
                            d={d}
                            fill="none"
                            stroke={
                              isBackEdge
                                ? "#f59e0b"
                                : isRevert
                                  ? "#f43f5e"
                                  : "#0284c7"
                            }
                            strokeWidth={isBackEdge ? "2" : "1.5"}
                            strokeDasharray={
                              edge.kind === "false_branch" ? "4 4" : undefined
                            }
                            markerEnd={
                              isBackEdge
                                ? "url(#cfg-back-arrow)"
                                : isRevert
                                  ? "url(#cfg-revert-arrow)"
                                  : "url(#cfg-arrow)"
                            }
                            className="transition-all duration-200"
                          />
                          {edge.conditionText && (
                            <text
                              x={(startX + endX) / 2 + (isBackEdge ? -60 : 10)}
                              y={(startY + endY) / 2}
                              fill="#94a3b8"
                              fontSize="9"
                              fontFamily="monospace"
                              textAnchor="middle"
                            >
                              {edge.conditionText}
                            </text>
                          )}
                        </g>
                      );
                    })}

                    {/* Render Basic Block Nodes */}
                    {artifact.basicBlocks.map((block) => {
                      const isSelected = selectedBlock?.id === block.id;
                      const isEntry = block.isEntry;
                      const isExit = block.isExit;
                      const isLoop = block.isLoopHeader;
                      const isRevert = block.id.includes("revert");

                      return (
                        <g
                          key={block.id}
                          transform={`translate(${block.x}, ${block.y})`}
                          onClick={() => {
                            sound.playPop();
                            setSelectedBlock(block);
                          }}
                          className="cursor-pointer transition-all duration-150"
                        >
                          <rect
                            width="140"
                            height="70"
                            rx="8"
                            fill={
                              isEntry
                                ? "#082f49"
                                : isExit
                                  ? "#1e1b4b"
                                  : isLoop
                                    ? "#451a03"
                                    : isRevert
                                      ? "#4c0519"
                                      : "#0f172a"
                            }
                            stroke={
                              isSelected
                                ? "#38bdf8"
                                : isEntry
                                  ? "#0ea5e9"
                                  : isLoop
                                    ? "#f59e0b"
                                    : isRevert
                                      ? "#f43f5e"
                                      : isExit
                                        ? "#818cf8"
                                        : "#334155"
                            }
                            strokeWidth={isSelected ? "2.5" : "1.5"}
                          />

                          {/* Block Label Header */}
                          <text
                            x="10"
                            y="20"
                            fill={
                              isEntry
                                ? "#38bdf8"
                                : isLoop
                                  ? "#fde68a"
                                  : isRevert
                                    ? "#fda4af"
                                    : "#f1f5f9"
                            }
                            fontSize="10"
                            fontWeight="bold"
                            fontFamily="monospace"
                          >
                            {block.label}
                          </text>

                          {/* Instructions Preview */}
                          <text
                            x="10"
                            y="38"
                            fill="#94a3b8"
                            fontSize="8"
                            fontFamily="monospace"
                          >
                            {block.instructions[0]?.rawText.slice(0, 22) || "-"}
                          </text>
                          <text
                            x="10"
                            y="52"
                            fill="#64748b"
                            fontSize="8"
                            fontFamily="monospace"
                          >
                            {block.instructions[1]?.rawText.slice(0, 22) ||
                              `${block.instructions.length} instrs`}
                          </text>

                          {/* Status Badge */}
                          {isLoop && (
                            <g transform="translate(100, 6)">
                              <rect
                                width="32"
                                height="12"
                                rx="3"
                                fill="#78350f"
                              />
                              <text
                                x="16"
                                y="9"
                                fill="#fef3c7"
                                fontSize="7"
                                fontWeight="bold"
                                textAnchor="middle"
                              >
                                LOOP
                              </text>
                            </g>
                          )}
                          {isEntry && (
                            <g transform="translate(95, 6)">
                              <rect
                                width="38"
                                height="12"
                                rx="3"
                                fill="#0369a1"
                              />
                              <text
                                x="19"
                                y="9"
                                fill="#e0f2fe"
                                fontSize="7"
                                fontWeight="bold"
                                textAnchor="middle"
                              >
                                ENTRY
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 px-2">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-sky-500/30 border border-sky-500"></span>
                    Entry / Normal
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-amber-500/30 border border-amber-500"></span>
                    Loop Header (Back-edge)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-rose-500/30 border border-rose-500"></span>
                    Revert Handler
                  </span>
                </div>
                <div>
                  Click basic block to inspect instructions &amp; dominators
                </div>
              </div>
            </div>

            {/* Block Inspection Drawer */}
            <div className="bg-slate-950/60 rounded-xl p-5 border border-slate-800 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <Award className="w-4 h-4 text-sky-400" />
                  Basic Block Inspection
                </h3>
                {selectedBlock ? (
                  <div className="space-y-4">
                    <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
                      <div className="text-[10px] uppercase font-bold text-slate-500">
                        Block Identifier
                      </div>
                      <div className="text-sm font-bold text-sky-300 mt-0.5 font-mono">
                        {selectedBlock.id} ({selectedBlock.label})
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">
                          Predecessors
                        </span>
                        <div className="text-sm font-bold text-white mt-1 font-mono">
                          {selectedBlock.predecessorIds.length > 0
                            ? selectedBlock.predecessorIds.join(", ")
                            : "None (Root)"}
                        </div>
                      </div>
                      <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">
                          Successors
                        </span>
                        <div className="text-sm font-bold text-white mt-1 font-mono">
                          {selectedBlock.successorIds.length > 0
                            ? selectedBlock.successorIds.join(", ")
                            : "None (Exit)"}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between py-1 border-b border-slate-800">
                        <span className="text-slate-400">
                          Immediate Dominator (idom):
                        </span>
                        <span className="font-mono font-bold text-amber-300">
                          {selectedBlock.immediateDominatorId ||
                            "*(Entry Root)*"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-slate-800">
                        <span className="text-slate-400">
                          Dominance Frontier:
                        </span>
                        <span className="font-mono text-cyan-300">
                          {selectedBlock.dominanceFrontier.join(", ") ||
                            "∅ (Empty)"}
                        </span>
                      </div>
                    </div>

                    {/* Disassembled Instructions inside block */}
                    <div className="space-y-2">
                      <div className="text-[11px] font-semibold text-slate-400">
                        Disassembled Instructions (
                        {selectedBlock.instructions.length}):
                      </div>
                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {selectedBlock.instructions.map((instr) => (
                          <div
                            key={instr.id}
                            className="bg-slate-900/90 p-2 rounded border border-slate-800 text-[11px] font-mono flex items-start gap-2"
                          >
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 text-slate-400 shrink-0">
                              {instr.opcode}
                            </span>
                            <span className="text-slate-200 break-all leading-tight">
                              {instr.rawText}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 py-8 text-center">
                    Select a basic block in the canvas to view instructions.
                  </div>
                )}
              </div>

              <div className="text-[10px] text-slate-500 border-t border-slate-800 pt-3 mt-4">
                Iterative fixed-point dominators computed over directed basic
                block flow.
              </div>
            </div>
          </div>
        )}

        {activeTab === "blocks" && (
          <div className="space-y-4">
            <div className="text-xs text-slate-400">
              Disassembled Basic Blocks and Intermediate Representation (IR)
              instructions:
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {artifact.basicBlocks.map((block) => (
                <div
                  key={block.id}
                  className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5" />
                        {block.id}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          block.isEntry
                            ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                            : block.isExit
                              ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                              : block.isLoopHeader
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-slate-800 text-slate-400 border border-slate-700"
                        }`}
                      >
                        {block.label}
                      </span>
                    </div>

                    <div className="space-y-2 bg-slate-900/80 p-3 rounded-lg border border-slate-800 mb-3 font-mono text-xs">
                      {block.instructions.map((instr) => (
                        <div
                          key={instr.id}
                          className="flex items-center justify-between border-b border-slate-800/60 pb-1"
                        >
                          <span className="text-slate-300">
                            {instr.rawText}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold">
                            {instr.opcode}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>Preds: {block.predecessorIds.length}</span>
                    <span>Succs: {block.successorIds.length}</span>
                    <span>idom: {block.immediateDominatorId || "none"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "dominators" && (
          <div className="space-y-4">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-400" />
              Dominator Tree &amp; Dominance Frontier Analysis:
            </div>

            <div className="bg-slate-950/60 rounded-xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Block ID</th>
                    <th className="py-3 px-4">Label</th>
                    <th className="py-3 px-4">Immediate Dominator (idom)</th>
                    <th className="py-3 px-4">Dominance Frontier (DF)</th>
                    <th className="py-3 px-4">Loop Header</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                  {artifact.basicBlocks.map((bb) => (
                    <tr
                      key={bb.id}
                      className="hover:bg-slate-900/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                        {bb.id}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">{bb.label}</td>
                      <td className="py-3.5 px-4 text-amber-300">
                        {bb.immediateDominatorId || "*(Entry Root)*"}
                      </td>
                      <td className="py-3.5 px-4 text-cyan-300">
                        {bb.dominanceFrontier.join(", ") || "∅"}
                      </td>
                      <td className="py-3.5 px-4">
                        {bb.isLoopHeader ? (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30">
                            Natural Loop Head
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "defuse" && (
          <div className="space-y-4">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Variable Definition-Use (Def-Use) Chains &amp; Dead Store
              Vulnerability Audit:
            </div>

            <div className="bg-slate-950/60 rounded-xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Variable</th>
                    <th className="py-3 px-4">Definition Block</th>
                    <th className="py-3 px-4">Instruction</th>
                    <th className="py-3 px-4">Use Blocks</th>
                    <th className="py-3 px-4">Store Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                  {artifact.defUseChains.map((du) => (
                    <tr
                      key={du.variable}
                      className="hover:bg-slate-900/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            du.isDeadStore ? "bg-rose-500" : "bg-emerald-400"
                          }`}
                        ></span>
                        {du.variable}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {du.definitionBlockId}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {du.definitionInstruction}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {du.useBlockIds.join(", ") || "*(None)*"}
                      </td>
                      <td className="py-3.5 px-4">
                        {du.isDeadStore ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            DEAD STORE ALERT
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            Active Used
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "decompiled" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-sky-400" />
                Structured TypeScript Decompiled from Control Flow Graph:
              </span>
              <button
                onClick={() => handleCopy(artifact.decompiledCode, "code")}
                className="px-2.5 py-1 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors"
                aria-label="Copy Decompiled Code"
              >
                {copiedType === "code" ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copiedType === "code" ? "Copied" : "Copy Code"}
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto">
              <pre className="font-mono text-xs text-sky-300 leading-relaxed">
                <code>{artifact.decompiledCode}</code>
              </pre>
            </div>

            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 leading-relaxed">
              <strong>Control Flow Reconstruction Guarantee:</strong> Eliminates
              unstructured jumps by recognizing canonical while-loop back-edges,
              nested conditionals, and dominance-driven phi-node merges.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
