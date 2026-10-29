"use client";

import React, { useState, useMemo } from "react";
import {
  FlaskConical,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  Download,
  Sparkles,
  ShieldAlert,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { RegressionEvalArtifact, EvaluationCategory } from "@/lib/types";
import {
  evalSuiteToCsv,
  evalSuiteToMarkdown,
} from "@/lib/eval/regression-evaluator";
import { downloadCsvData } from "@/lib/matrix-calculator";
import { sound } from "@/lib/sound";

interface Props {
  artifact: RegressionEvalArtifact;
  className?: string;
}

export function RegressionEvaluatorCard({ artifact, className = "" }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<
    EvaluationCategory | "all"
  >("all");
  const [expandedScenarioId, setExpandedScenarioId] = useState<string | null>(
    null,
  );
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const scenarios = useMemo(
    () => artifact.scenarios || [],
    [artifact.scenarios],
  );

  // Filter scenarios by category
  const filteredScenarios = useMemo(() => {
    if (selectedCategory === "all") return scenarios;
    return scenarios.filter((s) => s.category === selectedCategory);
  }, [scenarios, selectedCategory]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: scenarios.length,
      adversarial_injection: 0,
      grounding_alignment: 0,
      edge_case_robustness: 0,
      latency_sla: 0,
    };
    for (const s of scenarios) {
      if (counts[s.category] !== undefined) {
        counts[s.category]++;
      }
    }
    return counts;
  }, [scenarios]);

  const handleCopyMarkdown = async () => {
    try {
      const md = evalSuiteToMarkdown(artifact);
      await navigator.clipboard.writeText(md);
      setCopied(true);
      sound.playPop();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownloadCsv = () => {
    try {
      const csv = evalSuiteToCsv(artifact);
      const safeSlug = (artifact.topic || "regression-eval")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 32);
      downloadCsvData(`nova-eval-${safeSlug}.csv`, csv);
      setDownloaded(true);
      sound.playSuccess();
      setTimeout(() => setDownloaded(false), 2000);
    } catch {
      // Fallback
    }
  };

  const gradeColor =
    artifact.summary.healthGrade === "A+" ||
    artifact.summary.healthGrade === "A"
      ? "text-emerald-400 bg-emerald-950/80 border-emerald-800/80"
      : artifact.summary.healthGrade === "B"
        ? "text-teal-400 bg-teal-950/80 border-teal-800/80"
        : artifact.summary.healthGrade === "C"
          ? "text-amber-400 bg-amber-950/80 border-amber-800/80"
          : "text-rose-400 bg-rose-950/80 border-rose-800/80";

  return (
    <div
      className={`bg-slate-900/95 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-xl text-slate-100 flex flex-col gap-5 ${className}`}
    >
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-violet-400 shadow-sm">
              <FlaskConical className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-violet-400 font-bold">
                  Dynamic Regression Evaluator
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {artifact.targetPipeline || "Autonomous Pipeline"}
                </span>
              </div>
              <h3 className="text-base font-semibold text-slate-100 line-clamp-1">
                {artifact.topic || "Regression Test Suite"}
              </h3>
            </div>
          </div>
        </div>

        {/* HEALTH GRADE & ACTIONS */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${gradeColor}`}
          >
            <div className="flex flex-col text-right">
              <span className="text-[10px] font-mono text-slate-400">
                Health
              </span>
              <span className="text-xs font-mono font-bold">
                {artifact.summary.healthGrade} Grade
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
              className="p-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/40 transition-all hover:scale-105 active:scale-95"
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

      {/* EXECUTIVE SUMMARY */}
      {artifact.executiveSummary && (
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-300 leading-relaxed">
            {artifact.executiveSummary}
          </p>
        </div>
      )}

      {/* METRIC SCORECARD */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="text-[10px] font-mono text-slate-400">Pass Rate</div>
          <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
            {artifact.summary.overallPassRatePct}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {artifact.summary.passedCount} / {artifact.summary.totalScenarios}{" "}
            passed
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="text-[10px] font-mono text-slate-400">
            Regressions
          </div>
          <div
            className={`text-lg font-bold font-mono mt-0.5 ${
              artifact.summary.regressedCount > 0
                ? "text-amber-400"
                : "text-slate-300"
            }`}
          >
            {artifact.summary.regressedCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            vs golden baseline
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="text-[10px] font-mono text-slate-400">
            Avg Latency
          </div>
          <div className="text-lg font-bold font-mono text-violet-300 mt-0.5">
            {artifact.summary.averageLatencyMs}ms
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            p95 SLA conformance
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="text-[10px] font-mono text-slate-400">
            Critical Risks
          </div>
          <div
            className={`text-lg font-bold font-mono mt-0.5 ${
              artifact.summary.criticalRisksIdentified > 0
                ? "text-rose-400"
                : "text-emerald-400"
            }`}
          >
            {artifact.summary.criticalRisksIdentified}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            flagged security items
          </div>
        </div>
      </div>

      {/* CATEGORY FILTER TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-800/80">
        {[
          { key: "all", label: "All Scenarios" },
          { key: "adversarial_injection", label: "Adversarial Injection" },
          { key: "grounding_alignment", label: "Grounding Alignment" },
          { key: "edge_case_robustness", label: "Edge-Case Robustness" },
          { key: "latency_sla", label: "Latency SLA" },
        ].map((tab) => {
          const isSelected = selectedCategory === tab.key;
          const count = categoryCounts[tab.key] ?? 0;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                sound.playTap();
                setSelectedCategory(tab.key as EvaluationCategory | "all");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                isSelected
                  ? "bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <span>{tab.label}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* SCENARIOS LIST */}
      <div className="space-y-3">
        {filteredScenarios.map((scenario) => {
          const isExpanded = expandedScenarioId === scenario.scenarioId;
          const isPassed = scenario.status === "passed";
          const isRegressed = scenario.status === "regressed";

          return (
            <div
              key={scenario.scenarioId}
              className={`p-3.5 rounded-xl border transition-all ${
                isPassed
                  ? "bg-slate-950/40 border-slate-800/80 hover:border-slate-700"
                  : isRegressed
                    ? "bg-amber-950/20 border-amber-800/50 hover:border-amber-700/60"
                    : "bg-rose-950/20 border-rose-800/50 hover:border-rose-700/60"
              }`}
            >
              <div
                className="flex items-start justify-between gap-3 cursor-pointer select-none"
                onClick={() => {
                  sound.playPop();
                  setExpandedScenarioId(
                    isExpanded ? null : scenario.scenarioId,
                  );
                }}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5">
                    {isPassed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : isRegressed ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-400">
                        {scenario.scenarioId}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-slate-800/80 text-slate-300 uppercase">
                        {scenario.category.replace(/_/g, " ")}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.2 rounded font-bold uppercase ${
                          isPassed
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                            : isRegressed
                              ? "bg-amber-950 text-amber-300 border border-amber-800/60"
                              : "bg-rose-950 text-rose-300 border border-rose-800/60"
                        }`}
                      >
                        {scenario.status}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-200">
                      {scenario.title}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-slate-200">
                      {scenario.score}%
                    </div>
                    {scenario.regressionDelta !== undefined && (
                      <div
                        className={`text-[10px] font-mono ${
                          scenario.regressionDelta > 0
                            ? "text-emerald-400"
                            : scenario.regressionDelta < 0
                              ? "text-rose-400"
                              : "text-slate-500"
                        }`}
                      >
                        {scenario.regressionDelta > 0
                          ? `+${scenario.regressionDelta}%`
                          : `${scenario.regressionDelta}%`}
                      </div>
                    )}
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{scenario.latencyMs}ms</span>
                    </div>
                  </div>
                  <div className="text-slate-400">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </div>

              {/* EXPANDABLE INSPECTION DRAWER */}
              {isExpanded && (
                <div className="mt-3.5 pt-3 border-t border-slate-800/60 space-y-3 text-xs">
                  <div>
                    <div className="text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
                      Prompt Input
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 whitespace-pre-wrap">
                      {scenario.promptInput}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
                      Expected Assertions
                    </div>
                    <ul className="space-y-1">
                      {scenario.expectedConstraints.map((constraint, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-1.5 text-slate-300 text-[11px]"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{constraint}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <div className="text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
                      Actual Output Snippet
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 leading-relaxed italic">
                      &ldquo;{scenario.actualOutputSnippet}&rdquo;
                    </div>
                  </div>

                  {scenario.remediationAction && (
                    <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-200 text-[11px] flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong>Remediation:</strong>{" "}
                        {scenario.remediationAction}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
export default RegressionEvaluatorCard;
