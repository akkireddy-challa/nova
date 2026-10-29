"use client";

import React, { useState, useMemo } from "react";
import {
  Trophy,
  AlertTriangle,
  Download,
  Copy,
  Check,
  Target,
  BarChart3,
  Radar as RadarIcon,
  Zap,
  TrendingUp,
  Layers,
  Scale,
  Award,
} from "lucide-react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  GapAnalysisReport,
  MatrixInput,
  generateGapAnalysis,
  gapAnalysisToCsv,
  gapAnalysisToMarkdown,
} from "@/lib/research/gap-analysis";
import { downloadCsvData } from "@/lib/matrix-calculator";
import { sound } from "@/lib/sound";

const OPTION_PALETTE = [
  {
    name: "Purple",
    stroke: "#a855f7",
    fill: "#a855f7",
    bg: "bg-purple-500",
    text: "text-purple-400",
    border: "border-purple-500/40",
  },
  {
    name: "Teal",
    stroke: "#14b8a6",
    fill: "#14b8a6",
    bg: "bg-teal-500",
    text: "text-teal-400",
    border: "border-teal-500/40",
  },
  {
    name: "Amber",
    stroke: "#f59e0b",
    fill: "#f59e0b",
    bg: "bg-amber-500",
    text: "text-amber-400",
    border: "border-amber-500/40",
  },
  {
    name: "Blue",
    stroke: "#3b82f6",
    fill: "#3b82f6",
    bg: "bg-blue-500",
    text: "text-blue-400",
    border: "border-blue-500/40",
  },
  {
    name: "Rose",
    stroke: "#f43f5e",
    fill: "#f43f5e",
    bg: "bg-rose-500",
    text: "text-rose-400",
    border: "border-rose-500/40",
  },
];

export interface GapAnalysisCardProps {
  matrix?: MatrixInput;
  report?: GapAnalysisReport;
  className?: string;
}

export function GapAnalysisCard({
  matrix,
  report: propReport,
  className = "",
}: GapAnalysisCardProps) {
  const [viewMode, setViewMode] = useState<"bars" | "radar">("bars");
  const [copied, setCopied] = useState(false);

  // Compute gap analysis live if matrix is provided, or use precomputed report
  const report: GapAnalysisReport | null = useMemo(() => {
    if (propReport) return propReport;
    if (matrix) return generateGapAnalysis(matrix);
    return null;
  }, [matrix, propReport]);

  // Contenders palette map
  const optionNames = useMemo(() => {
    if (!report) return [];
    const names = new Set<string>();
    report.criteriaStats.forEach((c) => {
      Object.keys(c.scores).forEach((n) => names.add(n));
    });
    return Array.from(names);
  }, [report]);

  const optionColorMap = useMemo(() => {
    const map = new Map<string, (typeof OPTION_PALETTE)[number]>();
    optionNames.forEach((name, i) => {
      map.set(name, OPTION_PALETTE[i % OPTION_PALETTE.length]);
    });
    return map;
  }, [optionNames]);

  // Radar chart formatted data
  const radarData = useMemo(() => {
    if (!report) return [];
    return report.criteriaStats.map((c) => {
      const entry: Record<string, string | number> = {
        criterion: c.criterionName,
      };
      optionNames.forEach((opt) => {
        entry[opt] = c.scores[opt] ?? 0;
      });
      return entry;
    });
  }, [report, optionNames]);

  if (!report || report.criteriaStats.length === 0) {
    return (
      <div
        className={`w-full p-6 rounded-xl border border-slate-800 bg-slate-950/60 text-center text-slate-400 ${className}`}
      >
        <Scale className="w-8 h-8 mx-auto mb-2 text-slate-600 animate-pulse" />
        <p className="text-sm font-medium">
          Insufficient criteria data to synthesize gap analysis.
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Provide at least 1 criterion and 2 options to compute feature moats
          and vulnerabilities.
        </p>
      </div>
    );
  }

  const handleExportCsv = () => {
    const csv = gapAnalysisToCsv(report);
    const sanitizedTopic = (report.topic || "gap-analysis")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    downloadCsvData(`${sanitizedTopic}-gap-analysis.csv`, csv);
    sound.playSuccess();
  };

  const handleCopyMarkdown = () => {
    const md = gapAnalysisToMarkdown(report);
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(md).then(() => {
        setCopied(true);
        sound.playCheck();
        setTimeout(() => setCopied(false), 2200);
      });
    }
  };

  return (
    <div
      className={`w-full rounded-xl border border-slate-700/80 bg-slate-900/90 backdrop-blur-md overflow-hidden shadow-2xl transition-all space-y-0 ${className}`}
      data-testid="gap-analysis-card"
    >
      {/* Top Banner Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-100 text-sm leading-tight">
                {report.topic}
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30">
                Gap Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated Feature Disparity, Competitive Moats & Actionable
              Roadmap
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyMarkdown}
            title="Copy Markdown Summary"
            aria-label="Copy Markdown Summary"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/90 transition cursor-pointer border border-slate-700"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Markdown Summary</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            title="Export Gap Analysis (.csv)"
            aria-label="Export Gap Analysis (.csv)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-purple-300 hover:text-white bg-purple-500/15 hover:bg-purple-500/25 transition cursor-pointer border border-purple-500/30 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-purple-400" />
            <span>Export Gap Analysis (.csv)</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Pills */}
      <div className="px-4 py-3 bg-slate-950/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/70 text-slate-300 border border-slate-700/60">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>Overall Leader:</span>
            <strong className="text-amber-300">
              {report.overallLeader.name}
            </strong>
            <span className="text-slate-400 font-mono text-[11px]">
              ({report.overallLeader.totalWeightedScore}/10)
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
            <Trophy className="w-3.5 h-3.5 text-emerald-400" />
            <span>Differentiating Moats:</span>
            <strong className="font-mono text-white">
              {report.summary.moatsCount}
            </strong>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/25">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>Critical Vulnerabilities:</span>
            <strong className="font-mono text-white">
              {report.summary.vulnerabilitiesCount}
            </strong>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setViewMode("bars")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
              viewMode === "bars"
                ? "bg-purple-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <BarChart3 className="w-3 h-3" />
            <span>Feature Bars</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("radar")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
              viewMode === "radar"
                ? "bg-purple-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <RadarIcon className="w-3 h-3" />
            <span>Radar Topology</span>
          </button>
        </div>
      </div>

      {/* Feature Breakdown: Bars or Radar */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/40">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
            <span>Comparative Feature Disparity Across Criteria</span>
          </h4>
          <span className="text-[11px] text-slate-400">
            Spread reflects difference between leader and laggard
          </span>
        </div>

        {viewMode === "bars" ? (
          <div className="space-y-3.5">
            {report.criteriaStats.map((c) => (
              <div
                key={c.criterionId}
                className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/90 space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">
                      {c.criterionName}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
                      {c.weight}x Priority
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                    <span>
                      Avg:{" "}
                      <strong className="text-slate-300">{c.mean}/10</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-purple-300 border border-slate-800">
                      Spread:{" "}
                      <strong className="text-white">{c.spread} pts</strong>
                    </span>
                  </div>
                </div>

                {/* Contender score bars */}
                <div className="space-y-1.5 pt-1">
                  {optionNames.map((optName) => {
                    const score = c.scores[optName] ?? 0;
                    const isLeader = c.leader.name === optName && c.spread > 0;
                    const isLaggard =
                      c.laggard.name === optName &&
                      c.spread > 0 &&
                      optionNames.length > 1;
                    const optColor =
                      optionColorMap.get(optName) || OPTION_PALETTE[0];

                    return (
                      <div
                        key={optName}
                        className="flex items-center gap-3 text-xs"
                      >
                        <div className="w-28 sm:w-36 truncate flex items-center gap-1.5 flex-shrink-0">
                          <span
                            className={`w-2 h-2 rounded-full ${optColor.bg}`}
                          />
                          <span
                            className="text-slate-300 truncate"
                            title={optName}
                          >
                            {optName}
                          </span>
                        </div>
                        <div className="flex-1 h-2.5 bg-slate-800/90 rounded-full overflow-hidden relative">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${optColor.bg}`}
                            style={{
                              width: `${Math.min(100, Math.max(0, (score / 10) * 100))}%`,
                            }}
                          />
                        </div>
                        <div className="w-16 flex items-center justify-end gap-1.5 flex-shrink-0 font-mono text-[11px]">
                          <span className="font-bold text-slate-200">
                            {score}
                          </span>
                          <span className="text-slate-500">/10</span>
                          {isLeader && (
                            <span
                              title="Category Leader"
                              className="inline-flex items-center"
                            >
                              <Trophy className="w-3 h-3 text-amber-400" />
                            </span>
                          )}
                          {isLaggard && (
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-rose-500"
                              title="Category Laggard"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-72 w-full flex items-center justify-center p-2 bg-slate-950/40 rounded-lg border border-slate-800">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis
                  dataKey="criterion"
                  stroke="#94a3b8"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 10]}
                  stroke="#475569"
                  tick={{ fill: "#64748b", fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#020617",
                    borderColor: "#334155",
                    borderRadius: "8px",
                    color: "#f8fafc",
                    fontSize: "12px",
                  }}
                />
                {optionNames.map((optName) => {
                  const optColor =
                    optionColorMap.get(optName) || OPTION_PALETTE[0];
                  return (
                    <Radar
                      key={optName}
                      name={optName}
                      dataKey={optName}
                      stroke={optColor.stroke}
                      fill={optColor.fill}
                      fillOpacity={0.2}
                    />
                  );
                })}
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Moats & Vulnerabilities 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 border-b border-slate-800">
        {/* Differentiating Moats Section */}
        <div className="p-4 space-y-3 bg-slate-950/30">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Moats & Differentiators</span>
            </h4>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold">
              {report.moats.length} Detected
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Criteria where contenders lead runner-up by ≥ 15% or achieve score ≥
            9.0
          </p>

          {report.moats.length === 0 ? (
            <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
              No asymmetrical moats detected. Contenders perform within parity
              margins.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {report.moats.map((moat, i) => {
                const optColor =
                  optionColorMap.get(moat.optionName) || OPTION_PALETTE[0];
                return (
                  <div
                    key={`${moat.optionName}-${moat.criterionId}-${i}`}
                    className="p-3 rounded-lg bg-slate-900/80 border border-amber-500/30 shadow-sm space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${optColor.bg}`}
                        />
                        <strong className="text-slate-100 font-semibold">
                          {moat.optionName}
                        </strong>
                        <span className="text-slate-400 text-[11px]">in</span>
                        <span className="text-amber-300 font-medium">
                          {moat.criterionName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          {moat.score}/10
                        </span>
                        {moat.significance === "dominant" && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
                            Dominant
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {moat.reason}
                    </p>
                    {moat.leadMargin > 0 && moat.secondPlaceContender && (
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                        <span>Margin:</span>
                        <span className="text-emerald-400 font-bold">
                          +{moat.leadMargin} pts
                        </span>
                        <span>
                          over {moat.secondPlaceContender.name} (
                          {moat.secondPlaceContender.score}/10)
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Vulnerabilities & Risks Section */}
        <div className="p-4 space-y-3 bg-slate-950/30">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Vulnerabilities & Competitor Risks</span>
            </h4>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30 font-semibold">
              {report.vulnerabilities.length} Detected
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Criteria where contenders score ≤ 4.0 or fall ≥ 20% below the
            category average
          </p>

          {report.vulnerabilities.length === 0 ? (
            <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
              Zero critical vulnerabilities detected. All contenders meet safety
              floor baselines.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {report.vulnerabilities.map((vuln, i) => {
                const optColor =
                  optionColorMap.get(vuln.optionName) || OPTION_PALETTE[0];
                const isCritical = vuln.severity === "critical";

                return (
                  <div
                    key={`${vuln.optionName}-${vuln.criterionId}-${i}`}
                    className={`p-3 rounded-lg bg-slate-900/80 border shadow-sm space-y-1.5 ${
                      isCritical
                        ? "border-rose-500/40 bg-rose-950/10"
                        : "border-amber-500/30"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${optColor.bg}`}
                        />
                        <strong className="text-slate-100 font-semibold">
                          {vuln.optionName}
                        </strong>
                        <span className="text-slate-400 text-[11px]">in</span>
                        <span className="text-rose-300 font-medium">
                          {vuln.criterionName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          {vuln.score}/10
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                            isCritical
                              ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                              : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          }`}
                        >
                          {isCritical ? "Critical" : "Warning"}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {vuln.reason}
                    </p>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                      <span>Deficit vs Average ({vuln.meanScore}/10):</span>
                      <span className="text-rose-400 font-bold">
                        -{vuln.deficitPercent}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Strategic Tradeoffs Section */}
      {report.tradeoffs.length > 0 && (
        <div className="p-4 border-b border-slate-800 bg-slate-950/50 space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Strategic Tradeoff Insights</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {report.tradeoffs.map((t, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 space-y-1 text-xs"
              >
                <div className="font-semibold text-purple-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span>{t.title}</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  {t.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strategic Action Items Roadmap */}
      <div className="p-4 bg-slate-950/70 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Target className="w-4 h-4 text-purple-400" />
            <span>Strategic Action Items Roadmap</span>
          </h4>
          <span className="text-[11px] text-slate-400">
            Ranked by weighted business impact
          </span>
        </div>

        {report.recommendations.length === 0 ? (
          <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
            No critical intervention required. Contenders maintain strong
            parity.
          </div>
        ) : (
          <div className="space-y-2.5">
            {report.recommendations.map((rec) => {
              const isHigh = rec.priority === "High Priority";
              const isMedium = rec.priority === "Medium Priority";

              return (
                <div
                  key={rec.id}
                  className={`p-3 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isHigh
                      ? "bg-rose-950/15 border-rose-500/40"
                      : isMedium
                        ? "bg-amber-950/15 border-amber-500/30"
                        : "bg-slate-900/60 border-slate-800"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                          isHigh
                            ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                            : isMedium
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                              : "bg-slate-800 text-slate-300 border-slate-700"
                        }`}
                      >
                        {rec.priority}
                      </span>
                      <strong className="text-xs font-semibold text-slate-100">
                        {rec.action}
                      </strong>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {rec.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center flex-shrink-0 font-mono text-xs">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block uppercase">
                        Impact Score
                      </span>
                      <span className="font-bold text-purple-300">
                        {rec.impactScore} pts
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
