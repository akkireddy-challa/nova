"use client";

import React, { useState } from "react";
import {
  Gamepad2,
  Download,
  Copy,
  Check,
  Award,
  Layers,
  Scale,
  Activity,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  BookOpen,
  Trophy,
  Compass,
} from "lucide-react";
import type { GameTheoryArtifact, StrategyPayoffCell } from "@/lib/types";
import {
  gameTheoryToCsv,
  gameTheoryToMarkdown,
} from "@/lib/gametheory/game-theory-engine";
import { downloadCsvData } from "@/lib/matrix-calculator";
import { sound } from "@/lib/sound";

interface GameTheoryCardProps {
  artifact: GameTheoryArtifact;
}

export function GameTheoryCard({ artifact }: GameTheoryCardProps) {
  const [activeTab, setActiveTab] = useState<
    "matrix" | "nash" | "shapley" | "iesds" | "mechanism"
  >("matrix");
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<StrategyPayoffCell | null>(
    () => artifact.payoffMatrix[0] || null,
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
    const csvContent = gameTheoryToCsv(artifact);
    const filename = `${artifact.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-gametheory.csv`;
    downloadCsvData(csvContent, filename);
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md transition-all text-slate-200">
      {/* Header Banner */}
      <div className="px-6 py-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
              <Gamepad2 className="w-3 h-3" />
              Strategic Mechanism Design Studio
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <Trophy className="w-3 h-3 text-emerald-400" />
              Pure Nash: {artifact.summary.totalPureNashCount}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              PoA: {artifact.summary.priceOfAnarchy}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
              Class: {artifact.summary.gameClass}
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
            onClick={() =>
              handleCopy(gameTheoryToMarkdown(artifact), "markdown")
            }
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors focus:ring-2 focus:ring-amber-500 focus:outline-none"
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
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 transition-colors shadow-lg shadow-amber-600/20 focus:ring-2 focus:ring-amber-400 focus:outline-none"
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
            Price of Anarchy (PoA)
          </span>
          <div className="text-lg font-bold text-amber-400 mt-0.5">
            {artifact.summary.priceOfAnarchy}x
          </div>
          <span className="text-[10px] text-slate-500">
            Optimum / Worst Nash
          </span>
        </div>
        <div className="p-3">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Price of Stability (PoS)
          </span>
          <div className="text-lg font-bold text-cyan-400 mt-0.5">
            {artifact.summary.priceOfStability}x
          </div>
          <span className="text-[10px] text-slate-500">
            Optimum / Best Nash
          </span>
        </div>
        <div className="p-3">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Pure Nash Count
          </span>
          <div className="text-lg font-bold text-emerald-400 mt-0.5">
            {artifact.summary.totalPureNashCount}
          </div>
          <span className="text-[10px] text-slate-500">
            Stable pure profiles
          </span>
        </div>
        <div className="p-3">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Mixed Equilibrium
          </span>
          <div className="text-lg font-bold text-indigo-400 mt-0.5">
            {artifact.summary.hasMixedNash
              ? "Active (2x2)"
              : "None / Degenerate"}
          </div>
          <span className="text-[10px] text-slate-500">
            Indifference randomized
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-800 bg-slate-900/60 px-4 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab("matrix")}
          className={`py-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === "matrix"
              ? "border-amber-400 text-amber-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Payoff Matrix Heatmap
        </button>
        <button
          onClick={() => setActiveTab("nash")}
          className={`py-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === "nash"
              ? "border-amber-400 text-amber-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          Nash Equilibria ({artifact.equilibria.length})
        </button>
        <button
          onClick={() => setActiveTab("shapley")}
          className={`py-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === "shapley"
              ? "border-amber-400 text-amber-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          Cooperative Shapley Values
        </button>
        <button
          onClick={() => setActiveTab("iesds")}
          className={`py-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === "iesds"
              ? "border-amber-400 text-amber-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          IESDS Elimination Trace
        </button>
        <button
          onClick={() => setActiveTab("mechanism")}
          className={`py-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === "mechanism"
              ? "border-amber-400 text-amber-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Strategic Mechanism Design
        </button>
      </div>

      {/* Tab Content Panels */}
      <div className="p-6">
        {activeTab === "matrix" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* SVG Interactive Payoff Matrix */}
            <div className="lg:col-span-2 bg-slate-950/60 rounded-xl p-4 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-medium text-slate-400 flex items-center gap-2">
                  <Compass className="w-3.5 h-3.5 text-amber-400" />
                  Bimatrix Payoff Normal Form: {
                    artifact.summary.player1Name
                  }{" "}
                  (Rows) vs {artifact.summary.player2Name} (Cols)
                </div>
                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-1">
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                    title="Zoom Out"
                    aria-label="Zoom Out Matrix"
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
                    aria-label="Zoom In Matrix"
                  >
                    <ZoomIn className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setZoomLevel(1)}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                    title="Reset Zoom"
                    aria-label="Reset Matrix Zoom"
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
                    width="480"
                    height="320"
                    viewBox="0 0 480 320"
                    className="select-none"
                    role="graphics-document"
                    aria-label="Payoff Matrix Heatmap Canvas"
                  >
                    {/* Definitions for Gradients and Glows */}
                    <defs>
                      <linearGradient
                        id="neGlow"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                      >
                        <stop
                          offset="0%"
                          stopColor="#10b981"
                          stopOpacity="0.25"
                        />
                        <stop
                          offset="100%"
                          stopColor="#059669"
                          stopOpacity="0.05"
                        />
                      </linearGradient>
                      <linearGradient
                        id="paretoGlow"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                      >
                        <stop
                          offset="0%"
                          stopColor="#f59e0b"
                          stopOpacity="0.2"
                        />
                        <stop
                          offset="100%"
                          stopColor="#d97706"
                          stopOpacity="0.05"
                        />
                      </linearGradient>
                    </defs>

                    {/* Column Headers */}
                    <text
                      x="210"
                      y="30"
                      fill="#94a3b8"
                      fontSize="11"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {artifact.payoffMatrix[0]?.colStrategy || "Strategy C1"}
                    </text>
                    <text
                      x="370"
                      y="30"
                      fill="#94a3b8"
                      fontSize="11"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {artifact.payoffMatrix[1]?.colStrategy || "Strategy C2"}
                    </text>

                    {/* Row Headers */}
                    <text
                      x="120"
                      y="115"
                      fill="#94a3b8"
                      fontSize="11"
                      fontWeight="600"
                      textAnchor="end"
                    >
                      {artifact.payoffMatrix[0]?.rowStrategy || "Strategy R1"}
                    </text>
                    <text
                      x="120"
                      y="235"
                      fill="#94a3b8"
                      fontSize="11"
                      fontWeight="600"
                      textAnchor="end"
                    >
                      {artifact.payoffMatrix[2]?.rowStrategy || "Strategy R2"}
                    </text>

                    {/* Matrix Cells */}
                    {artifact.payoffMatrix.map((cell, idx) => {
                      const col = idx % 2;
                      const row = Math.floor(idx / 2);
                      const x = 135 + col * 160;
                      const y = 50 + row * 120;
                      const isSelected =
                        selectedCell?.rowStrategy === cell.rowStrategy &&
                        selectedCell?.colStrategy === cell.colStrategy;

                      return (
                        <g
                          key={`${cell.rowStrategy}-${cell.colStrategy}`}
                          onClick={() => {
                            sound.playPop();
                            setSelectedCell(cell);
                          }}
                          className="cursor-pointer transition-all duration-150"
                        >
                          {/* Cell Background */}
                          <rect
                            x={x}
                            y={y}
                            width="150"
                            height="110"
                            rx="8"
                            fill={
                              cell.isNashEquilibrium
                                ? "url(#neGlow)"
                                : cell.isParetoOptimal
                                  ? "url(#paretoGlow)"
                                  : "#0f172a"
                            }
                            stroke={
                              isSelected
                                ? "#f59e0b"
                                : cell.isNashEquilibrium
                                  ? "#10b981"
                                  : cell.isParetoOptimal
                                    ? "#d97706"
                                    : "#334155"
                            }
                            strokeWidth={
                              isSelected
                                ? "2.5"
                                : cell.isNashEquilibrium
                                  ? "2"
                                  : "1"
                            }
                            strokeDasharray={isSelected ? "none" : undefined}
                          />

                          {/* Diagonal divider */}
                          <line
                            x1={x}
                            y1={y + 110}
                            x2={x + 150}
                            y2={y}
                            stroke="#334155"
                            strokeWidth="1"
                            strokeDasharray="3 3"
                          />

                          {/* Player 1 Payoff (Lower Left) */}
                          <text
                            x={x + 35}
                            y={y + 80}
                            fill="#38bdf8"
                            fontSize="20"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            {cell.player1Payoff}
                          </text>
                          <text
                            x={x + 35}
                            y={y + 98}
                            fill="#64748b"
                            fontSize="9"
                            textAnchor="middle"
                          >
                            P1
                          </text>

                          {/* Player 2 Payoff (Upper Right) */}
                          <text
                            x={x + 115}
                            y={y + 40}
                            fill="#f472b6"
                            fontSize="20"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            {cell.player2Payoff}
                          </text>
                          <text
                            x={x + 115}
                            y={y + 58}
                            fill="#64748b"
                            fontSize="9"
                            textAnchor="middle"
                          >
                            P2
                          </text>

                          {/* Status Badges in Cell */}
                          {cell.isNashEquilibrium && (
                            <g transform={`translate(${x + 6}, ${y + 6})`}>
                              <rect
                                width="52"
                                height="16"
                                rx="4"
                                fill="#065f46"
                              />
                              <text
                                x="26"
                                y="11"
                                fill="#6ee7b7"
                                fontSize="8"
                                fontWeight="bold"
                                textAnchor="middle"
                              >
                                ★ NASH
                              </text>
                            </g>
                          )}
                          {cell.isParetoOptimal && !cell.isNashEquilibrium && (
                            <g transform={`translate(${x + 6}, ${y + 6})`}>
                              <rect
                                width="64"
                                height="16"
                                rx="4"
                                fill="#78350f"
                              />
                              <text
                                x="32"
                                y="11"
                                fill="#fde68a"
                                fontSize="8"
                                fontWeight="bold"
                                textAnchor="middle"
                              >
                                PARETO OPT
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
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500/30 border border-emerald-500"></span>
                    Nash Equilibrium (★)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-amber-500/30 border border-amber-500"></span>
                    Pareto Optimum
                  </span>
                </div>
                <div>Click cell to inspect payoff decomposition</div>
              </div>
            </div>

            {/* Cell Inspection Drawer */}
            <div className="bg-slate-950/60 rounded-xl p-5 border border-slate-800 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  Strategy Cell Inspection
                </h3>
                {selectedCell ? (
                  <div className="space-y-4">
                    <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
                      <div className="text-[10px] uppercase font-bold text-slate-500">
                        Profile Coordinates
                      </div>
                      <div className="text-sm font-bold text-amber-300 mt-0.5">
                        {selectedCell.rowStrategy} × {selectedCell.colStrategy}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-center">
                        <span className="text-[10px] text-sky-400 font-bold uppercase">
                          Player 1 Payoff
                        </span>
                        <div className="text-2xl font-bold text-white mt-1">
                          {selectedCell.player1Payoff}
                        </div>
                      </div>
                      <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-center">
                        <span className="text-[10px] text-pink-400 font-bold uppercase">
                          Player 2 Payoff
                        </span>
                        <div className="text-2xl font-bold text-white mt-1">
                          {selectedCell.player2Payoff}
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                      <div className="text-[10px] uppercase font-bold text-slate-500">
                        Aggregate Social Welfare
                      </div>
                      <div className="text-lg font-bold text-emerald-400 mt-0.5">
                        {selectedCell.player1Payoff +
                          selectedCell.player2Payoff}{" "}
                        Points
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between py-1 border-b border-slate-800">
                        <span className="text-slate-400">
                          Pure Nash Status:
                        </span>
                        <span
                          className={`font-semibold ${
                            selectedCell.isNashEquilibrium
                              ? "text-emerald-400"
                              : "text-slate-500"
                          }`}
                        >
                          {selectedCell.isNashEquilibrium
                            ? "Strict Nash Equilibrium"
                            : "Suboptimal Deviation"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-slate-800">
                        <span className="text-slate-400">Pareto Optimal:</span>
                        <span
                          className={`font-semibold ${
                            selectedCell.isParetoOptimal
                              ? "text-amber-400"
                              : "text-slate-500"
                          }`}
                        >
                          {selectedCell.isParetoOptimal ? "Yes" : "No"}
                        </span>
                      </div>
                    </div>

                    {selectedCell.notes && (
                      <div className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 italic">
                        &ldquo;{selectedCell.notes}&rdquo;
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 py-8 text-center">
                    Select a cell in the matrix to view strategic metrics.
                  </div>
                )}
              </div>

              <div className="text-[10px] text-slate-500 border-t border-slate-800 pt-3 mt-4">
                Strict best-response condition evaluated across all normal form
                combinations.
              </div>
            </div>
          </div>
        )}

        {activeTab === "nash" && (
          <div className="space-y-4">
            <div className="text-xs text-slate-400">
              Formally computed Nash Equilibria where no player can unilaterally
              deviate to increase their expected payoff:
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {artifact.equilibria.map((eq) => (
                <div
                  key={eq.id}
                  className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5" />
                        {eq.id}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          eq.type === "pure"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                        }`}
                      >
                        {eq.type.toUpperCase()} EQUILIBRIUM
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed mb-4">
                      {eq.description}
                    </p>

                    <div className="space-y-3 bg-slate-900/80 p-3 rounded-lg border border-slate-800 mb-3">
                      <div className="text-[11px] font-semibold text-slate-400">
                        Player 1 Strategy Distribution
                      </div>
                      <div className="space-y-1 text-xs font-mono">
                        {Object.entries(eq.player1StrategyProbabilities).map(
                          ([strat, prob]) => (
                            <div
                              key={strat}
                              className="flex justify-between items-center"
                            >
                              <span className="text-slate-300 truncate max-w-[200px]">
                                {strat}:
                              </span>
                              <span className="text-sky-400 font-bold">
                                {(prob * 100).toFixed(1)}%
                              </span>
                            </div>
                          ),
                        )}
                      </div>

                      <div className="text-[11px] font-semibold text-slate-400 pt-2 border-t border-slate-800">
                        Player 2 Strategy Distribution
                      </div>
                      <div className="space-y-1 text-xs font-mono">
                        {Object.entries(eq.player2StrategyProbabilities).map(
                          ([strat, prob]) => (
                            <div
                              key={strat}
                              className="flex justify-between items-center"
                            >
                              <span className="text-slate-300 truncate max-w-[200px]">
                                {strat}:
                              </span>
                              <span className="text-pink-400 font-bold">
                                {(prob * 100).toFixed(1)}%
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      Expected Payoffs: P1 ={" "}
                      <strong className="text-sky-400">
                        {eq.expectedPayoffPlayer1}
                      </strong>
                      , P2 ={" "}
                      <strong className="text-pink-400">
                        {eq.expectedPayoffPlayer2}
                      </strong>
                    </span>
                    <span className="text-slate-400">
                      Stability:{" "}
                      <strong className="text-emerald-400">
                        {eq.stabilityIndexPct}%
                      </strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "shapley" && (
          <div className="space-y-4">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-400" />
              Cooperative Game Theory: Axiomatic Shapley Value Profit & Risk
              Attribution ($v(S)$ Grand Coalition: 60 points)
            </div>

            <div className="bg-slate-950/60 rounded-xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Agent Identifier</th>
                    <th className="py-3 px-4">Cooperative Role</th>
                    <th className="py-3 px-4 text-right">
                      Marginal Contribution
                    </th>
                    <th className="py-3 px-4 text-right">
                      Shapley Allocation %
                    </th>
                    <th className="py-3 px-4">Fair Share Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {artifact.shapleyValues.map((sv) => (
                    <tr
                      key={sv.playerId}
                      className="hover:bg-slate-900/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-medium text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        {sv.playerName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {sv.cooperativeRole}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-cyan-400">
                        +{sv.marginalContributionValue} pts
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-300">
                        {sv.shapleySharePct}%
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full transition-all duration-300"
                            style={{ width: `${sv.shapleySharePct}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 leading-relaxed">
              <strong>Shapley Axiom Guarantee:</strong> Evaluates all $N! = 6$
              arrival permutations to guarantee Efficiency, Symmetry, Linearity,
              and Null-Player fairness in reward distribution.
            </div>
          </div>
        )}

        {activeTab === "iesds" && (
          <div className="space-y-4">
            <div className="text-xs text-slate-400">
              Iterated Elimination of Strictly Dominated Strategies (IESDS)
              Trace:
            </div>
            <div className="space-y-3">
              {artifact.iesdsEliminationSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl flex items-start gap-3"
                >
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                    Step {idx + 1}
                  </span>
                  <div className="text-xs text-slate-300 leading-relaxed font-mono">
                    {step}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "mechanism" && (
          <div className="space-y-6">
            <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-400">
                <Sparkles className="w-4 h-4" />
                Strategic Mechanism Recommendation
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {artifact.summary.strategicRecommendation}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div className="text-[10px] uppercase font-bold text-slate-500">
                  Player 1 Dominant Strategy
                </div>
                <div className="text-sm font-bold text-white mt-1">
                  {artifact.summary.dominantStrategyPlayer1 ||
                    "None (Mixed or Dependent)"}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Yields higher or equal payoff regardless of opponent choice.
                </p>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div className="text-[10px] uppercase font-bold text-slate-500">
                  Player 2 Dominant Strategy
                </div>
                <div className="text-sm font-bold text-white mt-1">
                  {artifact.summary.dominantStrategyPlayer2 ||
                    "None (Mixed or Dependent)"}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Yields higher or equal payoff regardless of opponent choice.
                </p>
              </div>
            </div>

            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                Formal Mathematical Notes
              </div>
              <p className="text-xs text-slate-400 font-mono leading-relaxed">
                {artifact.mathematicalNotes}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
