"use client";

import React, { useState, useMemo } from "react";
import {
  Sparkles,
  Download,
  Copy,
  Check,
  Zap,
  Target,
  FileCode,
  Layers,
  ArrowRight,
  TrendingUp,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import type { PromptOptimizationArtifact, PromptTestCase } from "@/lib/types";
import {
  computePromptDiff,
  promptOptimizationToCsv,
  promptOptimizationToMarkdown,
} from "@/lib/optimization/prompt-optimizer";
import { downloadCsvData } from "@/lib/matrix-calculator";
import { sound } from "@/lib/sound";

interface PromptOptimizerCardProps {
  artifact: PromptOptimizationArtifact;
}

export function PromptOptimizerCard({ artifact }: PromptOptimizerCardProps) {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(
    artifact.summary.bestCandidateId || artifact.candidates[0]?.id || "",
  );
  const [activeTab, setActiveTab] = useState<
    "candidates" | "testcases" | "lineage"
  >("candidates");
  const [viewMode, setViewMode] = useState<"diff" | "raw">("diff");
  const [copiedType, setCopiedType] = useState<
    "metaprompt" | "report" | "prompt" | null
  >(null);

  const baselineCandidate = useMemo(
    () =>
      artifact.candidates.find((c) => c.iteration === 0) ||
      artifact.candidates[0],
    [artifact.candidates],
  );

  const selectedCandidate = useMemo(
    () =>
      artifact.candidates.find((c) => c.id === selectedCandidateId) ||
      artifact.candidates[0],
    [artifact.candidates, selectedCandidateId],
  );

  const diffLines = useMemo(() => {
    if (!baselineCandidate || !selectedCandidate) return [];
    if (baselineCandidate.id === selectedCandidate.id) {
      return selectedCandidate.promptText
        .split("\n")
        .map((text) => ({ type: "unchanged" as const, text }));
    }
    return computePromptDiff(
      baselineCandidate.promptText,
      selectedCandidate.promptText,
    );
  }, [baselineCandidate, selectedCandidate]);

  const handleCopyMetaprompt = () => {
    navigator.clipboard.writeText(artifact.metapromptTemplate);
    setCopiedType("metaprompt");
    sound.playPop();
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyPrompt = () => {
    if (!selectedCandidate) return;
    navigator.clipboard.writeText(selectedCandidate.promptText);
    setCopiedType("prompt");
    sound.playPop();
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyMarkdown = () => {
    const md = promptOptimizationToMarkdown(artifact);
    navigator.clipboard.writeText(md);
    setCopiedType("report");
    sound.playPop();
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDownloadCsv = () => {
    const csv = promptOptimizationToCsv(artifact);
    const filename = `${artifact.id || "prompt-optimization"}.csv`;
    downloadCsvData(csv, filename);
    sound.playSuccess();
  };

  const getTechniqueBadge = (technique: string) => {
    switch (technique) {
      case "few_shot_bootstrap":
        return {
          label: "Few-Shot Bootstrap",
          bg: "bg-blue-500/10 text-blue-400 border-blue-500/30",
        };
      case "chain_of_thought_anchoring":
        return {
          label: "Chain-of-Thought",
          bg: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        };
      case "constraint_hardening":
        return {
          label: "Constraint Hardening",
          bg: "bg-rose-500/10 text-rose-400 border-rose-500/30",
        };
      case "token_pruning":
        return {
          label: "Token Pruning",
          bg: "bg-purple-500/10 text-purple-400 border-purple-500/30",
        };
      case "hybrid_dspy_opt":
        return {
          label: "DSPy Optimal Hybrid",
          bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        };
      default:
        return {
          label: "Role Grounding",
          bg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
        };
    }
  };

  const getStatusIcon = (status: PromptTestCase["status"]) => {
    switch (status) {
      case "improved":
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case "passed":
        return <CheckCircle2 className="w-4 h-4 text-blue-400" />;
      case "regressed":
        return <AlertCircle className="w-4 h-4 text-rose-400" />;
      default:
        return <HelpCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md flex flex-col">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-inner">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">
                {artifact.targetTask}
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-indigo-300">
                {artifact.summary.baseModel}
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />+
                {artifact.summary.netScoreGainPct}% Eval Score
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              DSPy-style evolutionary metaprompt optimization and token economy
              frontier
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyMetaprompt}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-medium transition-colors"
            title="Copy Production Metaprompt Template"
          >
            {copiedType === "metaprompt" ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Zap className="w-3.5 h-3.5" />
            )}
            <span>Metaprompt</span>
          </button>

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
            title="Download CSV Validation Benchmarks"
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
            <Target className="w-3.5 h-3.5 text-indigo-400" />
            Eval Accuracy
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">
              {artifact.summary.optimizedScore.toFixed(1)}%
            </span>
            <span className="text-xs text-emerald-400 font-medium">
              +{artifact.summary.netScoreGainPct}%
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5">
            Baseline: {artifact.summary.baselineScore.toFixed(1)}%
          </span>
        </div>

        <div className="p-3.5 bg-slate-900 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            Token Footprint
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">
              {artifact.summary.optimizedTokens}
            </span>
            <span className="text-xs text-emerald-400 font-medium">
              {artifact.summary.tokenSavingsPct > 0
                ? `-${artifact.summary.tokenSavingsPct}%`
                : `+${Math.abs(artifact.summary.tokenSavingsPct)}%`}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5">
            Baseline: {artifact.summary.baselineTokens} tokens
          </span>
        </div>

        <div className="p-3.5 bg-slate-900 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            Pareto Frontier
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">
              {artifact.summary.paretoEfficientCount}
            </span>
            <span className="text-xs text-cyan-400 font-medium">
              Candidates
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5">
            Across {artifact.summary.totalIterations} iterations
          </span>
        </div>

        <div className="p-3.5 bg-slate-900 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            Cost Efficiency
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">
              {artifact.summary.estimatedCostSavingsPct}%
            </span>
            <span className="text-xs text-amber-400 font-medium">
              Saved / 1k req
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5">
            Target: {artifact.summary.baseModel}
          </span>
        </div>
      </div>

      {/* Main View Mode Tabs */}
      <div className="px-4 border-b border-slate-800 bg-slate-950/20 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setActiveTab("candidates");
              sound.playTap();
            }}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "candidates"
                ? "border-indigo-500 text-indigo-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Prompt Candidates & Diff
          </button>

          <button
            onClick={() => {
              setActiveTab("testcases");
              sound.playTap();
            }}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "testcases"
                ? "border-indigo-500 text-indigo-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Evaluation Test Bench ({artifact.testCases.length})
          </button>

          <button
            onClick={() => {
              setActiveTab("lineage");
              sound.playTap();
            }}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "lineage"
                ? "border-indigo-500 text-indigo-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Evolution Trajectory
          </button>
        </div>

        {activeTab === "candidates" && (
          <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60 my-1">
            <button
              onClick={() => {
                setViewMode("diff");
                sound.playTap();
              }}
              className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                viewMode === "diff"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Diff vs Baseline
            </button>
            <button
              onClick={() => {
                setViewMode("raw");
                sound.playTap();
              }}
              className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                viewMode === "raw"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Raw Prompt
            </button>
          </div>
        )}
      </div>

      {/* Tab 1: Candidates & Diff Inspector */}
      {activeTab === "candidates" && selectedCandidate && (
        <div className="p-4 sm:p-5 flex flex-col gap-4">
          {/* Candidate Selection Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {artifact.candidates.map((c) => {
              const isSelected = c.id === selectedCandidate.id;
              const badge = getTechniqueBadge(c.technique);
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedCandidateId(c.id);
                    sound.playTap();
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all shrink-0 ${
                    isSelected
                      ? "bg-indigo-950/60 border-indigo-500/80 ring-1 ring-indigo-500/50 shadow-md"
                      : "bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 text-slate-400"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-white">
                        {c.label}
                      </span>
                      {c.selected && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                          BEST
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                      <span className="text-emerald-400 font-mono">
                        {c.evalScore.toFixed(1)}%
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400 font-mono">
                        {c.tokenCount} tok
                      </span>
                      <span className="text-slate-500">•</span>
                      <span
                        className={`text-[10px] px-1 rounded border ${badge.bg}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Candidate Meta Info Callout */}
          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-300">
                Rationale:
              </span>
              <span className="text-xs text-slate-400">
                {selectedCandidate.rationale}
              </span>
            </div>
            <button
              onClick={handleCopyPrompt}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium shrink-0"
            >
              {copiedType === "prompt" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied Prompt!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Prompt</span>
                </>
              )}
            </button>
          </div>

          {/* Prompt Diff or Raw Text View */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/90 overflow-hidden">
            <div className="px-3.5 py-2 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs font-mono text-slate-300 font-medium">
                  {viewMode === "diff"
                    ? `Diff: Baseline → ${selectedCandidate.label}`
                    : `Prompt Body: ${selectedCandidate.label}`}
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                {selectedCandidate.tokenCount} tokens (~
                {selectedCandidate.latencyMs}ms p99)
              </span>
            </div>

            <div className="p-4 font-mono text-xs max-h-96 overflow-y-auto space-y-1">
              {viewMode === "diff" ? (
                diffLines.map((line, idx) => {
                  if (line.type === "added") {
                    return (
                      <div
                        key={idx}
                        className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border-l-2 border-emerald-500 flex items-start gap-2"
                      >
                        <span className="text-emerald-500 select-none">+</span>
                        <span className="whitespace-pre-wrap">{line.text}</span>
                      </div>
                    );
                  }
                  if (line.type === "removed") {
                    return (
                      <div
                        key={idx}
                        className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border-l-2 border-rose-500 line-through opacity-80 flex items-start gap-2"
                      >
                        <span className="text-rose-500 select-none">-</span>
                        <span className="whitespace-pre-wrap">{line.text}</span>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={idx}
                      className="px-2 py-0.5 text-slate-400 flex items-start gap-2"
                    >
                      <span className="text-slate-600 select-none"> </span>
                      <span className="whitespace-pre-wrap">{line.text}</span>
                    </div>
                  );
                })
              ) : (
                <div className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {selectedCandidate.promptText}
                </div>
              )}
            </div>

            {/* System Instruction Drawer */}
            <div className="border-t border-slate-800 bg-slate-900/40 p-3">
              <span className="text-[11px] font-mono text-indigo-400 font-semibold block mb-1">
                SYSTEM INSTRUCTION:
              </span>
              <p className="text-xs font-mono text-slate-300">
                {selectedCandidate.systemInstruction}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Test Cases Benchmark Table */}
      {activeTab === "testcases" && (
        <div className="p-4 sm:p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Evaluated against {artifact.testCases.length} targeted behavioral
              test scenarios
            </span>
            <span className="text-xs text-emerald-400 font-mono font-medium">
              100% Passing Score
            </span>
          </div>

          {/* Table Container conforming to modern-web-guidance responsive-table pattern */}
          <div
            tabIndex={0}
            role="region"
            aria-label="Prompt Evaluation Benchmarks"
            className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/60 max-h-96"
          >
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-900 text-slate-400 font-medium border-b border-slate-800 z-10">
                <tr>
                  <th scope="col" className="p-3">
                    Scenario
                  </th>
                  <th scope="col" className="p-3">
                    Expected Behavior
                  </th>
                  <th scope="col" className="p-3 text-center">
                    Baseline
                  </th>
                  <th scope="col" className="p-3 text-center">
                    Optimized
                  </th>
                  <th scope="col" className="p-3 text-center">
                    Verdict
                  </th>
                  <th scope="col" className="p-3">
                    Audit Note
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {artifact.testCases.map((tc) => (
                  <tr
                    key={tc.id}
                    className="hover:bg-slate-900/40 transition-colors"
                  >
                    <td className="p-3 font-medium text-slate-200">
                      {tc.input}
                    </td>
                    <td className="p-3 text-slate-400 font-sans text-xs">
                      {tc.expectedBehavior}
                    </td>
                    <td className="p-3 text-center text-slate-400">
                      {tc.baselineScore.toFixed(1)}%
                    </td>
                    <td className="p-3 text-center text-emerald-400 font-bold">
                      {tc.optimizedScore.toFixed(1)}%
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {getStatusIcon(tc.status)}
                        <span className="capitalize text-slate-300 font-sans text-[11px]">
                          {tc.status}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-slate-400 font-sans text-xs">
                      {tc.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Pareto Evolution Lineage */}
      {activeTab === "lineage" && (
        <div className="p-4 sm:p-5 flex flex-col gap-4">
          <span className="text-xs font-medium text-slate-400">
            Multi-Objective Pareto Evolution Trajectory (Eval Accuracy vs Token
            Footprint)
          </span>

          <div className="flex flex-col gap-3 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-slate-800">
            {artifact.paretoLineage.map((step, idx) => {
              const candidate = artifact.candidates.find(
                (c) => c.id === step.candidateId,
              );
              return (
                <div
                  key={idx}
                  className="flex items-start gap-4 relative z-10 pl-2"
                >
                  <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shadow">
                    {step.iteration}
                  </div>
                  <div className="flex-1 p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-semibold text-white">
                        {candidate?.label || step.candidateId}
                      </span>
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-emerald-400 font-bold">
                          {step.score.toFixed(1)}% Score
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-300 font-medium">
                          {step.tokenCount} tokens
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer Notes */}
      {artifact.technicalNotes && (
        <div className="px-4 py-3 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
          <ArrowRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>{artifact.technicalNotes}</span>
        </div>
      )}
    </div>
  );
}
