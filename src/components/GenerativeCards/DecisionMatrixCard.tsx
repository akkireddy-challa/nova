"use client";

import React, { useState, useMemo } from "react";
import { DecisionMatrix } from "@/lib/types";
import {
  Scale,
  Trophy,
  Check,
  X,
  RotateCcw,
  Download,
  Layers,
} from "lucide-react";
import {
  calculateNormalizedWeights,
  recalculateOptionScores,
  matrixToCsv,
  downloadCsvData,
} from "@/lib/matrix-calculator";
import { GapAnalysisCard } from "./GapAnalysisCard";
import { sound } from "@/lib/sound";

interface Props {
  matrix: DecisionMatrix;
}

export function DecisionMatrixCard({ matrix }: Props) {
  // Tab state: "overview" or "gap-analysis"
  const [activeTab, setActiveTab] = useState<"overview" | "gap-analysis">(
    "overview",
  );

  // Initial default weights from AI synthesis
  const initialWeights = useMemo(() => {
    return matrix.criteria.reduce(
      (acc, c) => ({ ...acc, [c.id]: c.weight }),
      {} as Record<string, number>,
    );
  }, [matrix.criteria]);

  // Dynamic user-adjusted criteria weights
  const [weights, setWeights] =
    useState<Record<string, number>>(initialWeights);

  const isModified = useMemo(() => {
    return matrix.criteria.some(
      (c) => (weights[c.id] ?? c.weight) !== c.weight,
    );
  }, [matrix.criteria, weights]);

  const handleWeightChange = (cid: string, val: number) => {
    setWeights((prev) => ({ ...prev, [cid]: val }));
  };

  const handleResetWeights = () => {
    setWeights(initialWeights);
    sound.playCheck();
  };

  // Normalized criteria weights with percentage contribution
  const normalizedCriteria = useMemo(() => {
    return calculateNormalizedWeights(
      matrix.criteria.map((c) => ({
        ...c,
        weight: weights[c.id] ?? c.weight,
      })),
    );
  }, [matrix.criteria, weights]);

  const percentageMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of normalizedCriteria) {
      if (item.id) {
        map.set(item.id, item.percentage);
      }
    }
    return map;
  }, [normalizedCriteria]);

  // Deterministically recalculate options and standard competition ranks in real-time
  const computedOptions = useMemo(() => {
    return recalculateOptionScores(matrix.options, weights);
  }, [matrix.options, weights]);

  const winner = computedOptions[0];

  // Dynamically constructed matrix with current weights for live Gap Analysis
  const activeMatrix = useMemo(() => {
    return {
      ...matrix,
      criteria: matrix.criteria.map((c) => ({
        ...c,
        weight: weights[c.id] ?? c.weight,
      })),
    };
  }, [matrix, weights]);

  const handleExportCsv = () => {
    const csvContent = matrixToCsv(matrix, weights);
    const filename = `${(matrix.topic || "decision-matrix").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
    downloadCsvData(filename, csvContent);
    sound.playSuccess();
  };

  return (
    <div className="w-full my-4 rounded-xl border border-slate-700/80 bg-slate-900/90 backdrop-blur-md overflow-hidden shadow-2xl transition-all">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm leading-tight">
              {matrix.topic}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Interactive Multi-Variable Decision Matrix & Gap Intelligence
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {winner && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-500/15 text-purple-300 border border-purple-500/30 rounded-full text-xs font-semibold shadow-sm">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Top Choice: {winner.name.split("(")[0]} ({winner.totalScore}/10)
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={handleExportCsv}
            title="Download CSV Data"
            aria-label="Download CSV Data"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-purple-300 hover:bg-slate-800 transition cursor-pointer border border-slate-800"
          >
            <Download className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-900 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setActiveTab("overview");
              sound.playCheck();
            }}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "overview"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Matrix Overview</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("gap-analysis");
              sound.playCheck();
            }}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "gap-analysis"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Deep Gap Analysis</span>
          </button>
        </div>
      </div>

      {/* Weight sliders (Visible to dynamically calibrate weights for both overview and deep gap analysis) */}
      <div className="p-4 bg-slate-950/40 border-b border-slate-800">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[11px] uppercase font-semibold text-slate-400 tracking-wider">
            Adjust Criteria Priority (Dynamic Recalculation)
          </p>
          {isModified && (
            <button
              type="button"
              onClick={handleResetWeights}
              title="Reset to original AI weights"
              aria-label="Reset to original AI weights"
              className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium text-purple-300 hover:text-white bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 text-purple-400" />
              <span>Reset Weights</span>
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {matrix.criteria.map((c) => {
            const currentWeight = weights[c.id] ?? c.weight;
            const pct = percentageMap.get(c.id) ?? 0;
            return (
              <div
                key={c.id}
                className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1.5"
              >
                <div className="flex justify-between items-center text-xs text-slate-300">
                  <span className="truncate font-medium">{c.name}</span>
                  <div className="flex items-center gap-1 font-mono text-[11px]">
                    <span className="text-slate-400 text-[10px]">({pct}%)</span>
                    <span className="font-bold text-purple-400">
                      {currentWeight}x
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={currentWeight}
                  onChange={(e) =>
                    handleWeightChange(c.id, parseInt(e.target.value, 10))
                  }
                  aria-label={`Weight for ${c.name}`}
                  className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === "overview" ? (
        <>
          {/* Comparison Cards / Ranked Options */}
          <div className="p-4 space-y-3">
            {computedOptions.map((opt) => {
              const isWinner = opt.rank === 1;
              return (
                <div
                  key={opt.id || opt.name}
                  className={`p-4 rounded-xl border transition ${
                    isWinner
                      ? "bg-purple-950/25 border-purple-500/50 shadow-lg shadow-purple-900/10"
                      : "bg-slate-950/40 border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isWinner
                            ? "bg-purple-500 text-white shadow-sm"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        #{opt.rank}
                      </span>
                      <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                        <span>{opt.name}</span>
                        {isWinner && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <Trophy className="w-3 h-3 text-amber-400" />
                            <span>Winner</span>
                          </span>
                        )}
                      </h4>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-base font-bold font-mono ${
                          isWinner ? "text-purple-400" : "text-slate-300"
                        }`}
                      >
                        {opt.totalScore} / 10
                      </span>
                    </div>
                  </div>

                  {/* Pros & Cons */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-teal-400 block mb-1">
                        Strengths
                      </span>
                      <ul className="space-y-1">
                        {(opt.pros || []).map((p, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-1.5 text-slate-300"
                          >
                            <Check className="w-3.5 h-3.5 text-teal-400 flex-shrink-0 mt-0.5" />
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-rose-400 block mb-1">
                        Considerations
                      </span>
                      <ul className="space-y-1">
                        {(opt.cons || []).map((c, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-1.5 text-slate-400"
                          >
                            <X className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Verdict */}
          {matrix.verdict && (
            <div className="p-3.5 bg-slate-950/70 border-t border-slate-800 text-xs text-slate-300 leading-relaxed">
              <span className="font-semibold text-purple-400">Verdict: </span>
              {matrix.verdict}
            </div>
          )}
        </>
      ) : (
        /* Deep Gap Analysis Tab */
        <div className="p-3">
          <GapAnalysisCard matrix={activeMatrix} />
        </div>
      )}
    </div>
  );
}
