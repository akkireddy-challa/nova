"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Sliders,
  Download,
  Copy,
  Check,
  TrendingUp,
  Cpu,
  Zap,
  Target,
  FileCode,
  Activity,
  Layers,
  ChevronRight,
} from "lucide-react";
import type { BayesianOptArtifact, BayesianTrial } from "@/lib/types";
import {
  bayesianOptToCsv,
  bayesianOptToMarkdown,
} from "@/lib/optimization/bayesian-opt-engine";
import { downloadCsvData } from "@/lib/matrix-calculator";
import { sound } from "@/lib/sound";

interface BayesianOptCardProps {
  artifact: BayesianOptArtifact;
}

export function BayesianOptCard({ artifact }: BayesianOptCardProps) {
  const [activeTab, setActiveTab] = useState<
    "surface" | "parameters" | "trials" | "config"
  >("surface");
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [selectedTrial, setSelectedTrial] = useState<BayesianTrial | null>(
    () =>
      artifact.trials.find((t) => t.isOptimal) || artifact.trials[0] || null,
  );

  const handleCopy = (text: string, type: string) => {
    sound.playSuccess();
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDownloadCsv = () => {
    sound.playPop();
    const csvContent = bayesianOptToCsv(artifact);
    const filename = `${artifact.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-bayesian-trials.csv`;
    downloadCsvData(csvContent, filename);
  };

  // SVG dimensions & coordinate scales
  const svgWidth = 600;
  const svgHeight = 220;
  const padding = { top: 25, right: 30, bottom: 40, left: 55 };

  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  const { xMin, xMax, yMin, yMax } = useMemo(() => {
    const xs = artifact.surrogateCurve.map((p) => p.x);
    const upperBounds = artifact.surrogateCurve.map(
      (p) => p.upperConfidenceBound,
    );
    const lowerBounds = artifact.surrogateCurve.map(
      (p) => p.lowerConfidenceBound,
    );
    const trialObjs = artifact.trials
      .filter((t) => t.objectiveValue > 0)
      .map((t) => t.objectiveValue);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.floor(Math.min(...lowerBounds, ...trialObjs) * 0.9);
    const maxY = Math.ceil(Math.max(...upperBounds, ...trialObjs) * 1.08);

    return { xMin: minX, xMax: maxX, yMin: Math.max(0, minY), yMax: maxY };
  }, [artifact]);

  const scaleX = useCallback(
    (x: number) => {
      if (xMax === xMin) return padding.left + plotWidth / 2;
      return padding.left + ((x - xMin) / (xMax - xMin)) * plotWidth;
    },
    [xMax, xMin, padding.left, plotWidth],
  );

  const scaleY = useCallback(
    (y: number) => {
      if (yMax === yMin) return padding.top + plotHeight / 2;
      return (
        padding.top + plotHeight - ((y - yMin) / (yMax - yMin)) * plotHeight
      );
    },
    [yMax, yMin, padding.top, plotHeight],
  );

  // Upper & lower confidence interval polygon
  const confidencePolygonPath = useMemo(() => {
    if (artifact.surrogateCurve.length === 0) return "";
    const pts = artifact.surrogateCurve;

    let path = `M ${scaleX(pts[0].x)} ${scaleY(pts[0].upperConfidenceBound)}`;
    for (let i = 1; i < pts.length; i++) {
      path += ` L ${scaleX(pts[i].x)} ${scaleY(pts[i].upperConfidenceBound)}`;
    }
    for (let i = pts.length - 1; i >= 0; i--) {
      path += ` L ${scaleX(pts[i].x)} ${scaleY(pts[i].lowerConfidenceBound)}`;
    }
    path += " Z";
    return path;
  }, [artifact, scaleX, scaleY]);

  // Mean prediction line
  const meanLinePath = useMemo(() => {
    if (artifact.surrogateCurve.length === 0) return "";
    const pts = artifact.surrogateCurve;
    let path = `M ${scaleX(pts[0].x)} ${scaleY(pts[0].mean)}`;
    for (let i = 1; i < pts.length; i++) {
      path += ` L ${scaleX(pts[i].x)} ${scaleY(pts[i].mean)}`;
    }
    return path;
  }, [artifact, scaleX, scaleY]);

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Top Banner & Header */}
      <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">
                Bayesian Optimization
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {artifact.targetModel}
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
              handleCopy(artifact.configSnippetYaml, "yaml_config")
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-300 text-xs font-medium transition-colors"
            title="Copy YAML Production Config"
          >
            {copiedType === "yaml_config" ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <FileCode className="w-3.5 h-3.5" />
            )}
            <span>YAML</span>
          </button>

          <button
            onClick={() =>
              handleCopy(bayesianOptToMarkdown(artifact), "report")
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
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            Peak Objective
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">
              {artifact.summary.bestObjectiveValue}
            </span>
            <span className="text-xs text-emerald-400 font-semibold">
              +{artifact.summary.improvementPct}%
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 truncate">
            Baseline: {artifact.summary.baselineObjectiveValue}
          </span>
        </div>

        <div className="p-3.5 bg-slate-900 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-amber-400" />
            Acquisition Peak
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-amber-300">
              {artifact.summary.nextExpectedAcquisitionValue}
            </span>
            <span className="text-xs text-slate-400">EI score</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 truncate">
            Suggested {artifact.summary.primaryParameter}:{" "}
            {
              artifact.summary.nextSuggestedPoint[
                artifact.summary.primaryParameter
              ]
            }
          </span>
        </div>

        <div className="p-3.5 bg-slate-900 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            Evaluated Trials
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">
              {artifact.trials.filter((t) => t.status !== "proposed").length}
            </span>
            <span className="text-xs text-slate-400">
              / {artifact.trials.length} total
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 truncate">
            Surrogate: Gaussian Process (RBF)
          </span>
        </div>

        <div className="p-3.5 bg-slate-900 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            Tuned Dimensions
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">
              {artifact.parameters.length}
            </span>
            <span className="text-xs text-cyan-400 font-mono">dimensions</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 truncate">
            Primary: {artifact.summary.primaryParameter}
          </span>
        </div>
      </div>

      {/* Navigation View Tabs */}
      <div className="px-4 border-b border-slate-800 bg-slate-950/40 flex items-center gap-1 overflow-x-auto">
        <button
          onClick={() => {
            sound.playTap();
            setActiveTab("surface");
          }}
          className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "surface"
              ? "border-amber-400 text-amber-300 bg-amber-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Surrogate Response Surface</span>
        </button>

        <button
          onClick={() => {
            sound.playTap();
            setActiveTab("parameters");
          }}
          className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "parameters"
              ? "border-amber-400 text-amber-300 bg-amber-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Hyperparameter Space ({artifact.parameters.length})</span>
        </button>

        <button
          onClick={() => {
            sound.playTap();
            setActiveTab("trials");
          }}
          className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "trials"
              ? "border-amber-400 text-amber-300 bg-amber-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Sequential Trials ({artifact.trials.length})</span>
        </button>

        <button
          onClick={() => {
            sound.playTap();
            setActiveTab("config");
          }}
          className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "config"
              ? "border-amber-400 text-amber-300 bg-amber-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>Production Config</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="p-4">
        {/* TAB 1: RESPONSE SURFACE SVG */}
        {activeTab === "surface" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono text-[11px] text-amber-400/90 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Target: {artifact.summary.targetObjective}
              </span>
              <div className="flex items-center gap-4 text-[10px] font-mono">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-0.5 bg-amber-400 inline-block" />
                  GP Mean μ(x)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2 bg-amber-500/20 border border-amber-500/40 inline-block" />
                  95% Credible Interval (±1.96σ)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  Optimal Sample
                </span>
              </div>
            </div>

            {/* Interactive SVG Surface */}
            <div className="relative bg-slate-950 rounded-xl border border-slate-800 p-2 overflow-hidden">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-auto"
                role="graphics-document"
                aria-label="Bayesian Gaussian Process Response Surface"
              >
                <defs>
                  <linearGradient
                    id="bayesConfidenceGrad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                    <stop
                      offset="100%"
                      stopColor="#f59e0b"
                      stopOpacity="0.05"
                    />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                {[0.25, 0.5, 0.75].map((frac, idx) => {
                  const yVal = yMin + frac * (yMax - yMin);
                  const yPos = scaleY(yVal);
                  return (
                    <g key={idx}>
                      <line
                        x1={padding.left}
                        y1={yPos}
                        x2={svgWidth - padding.right}
                        y2={yPos}
                        stroke="#334155"
                        strokeDasharray="3 3"
                        strokeOpacity="0.4"
                      />
                      <text
                        x={padding.left - 8}
                        y={yPos + 3}
                        textAnchor="end"
                        fill="#64748b"
                        fontSize="9"
                        fontFamily="monospace"
                      >
                        {Math.round(yVal)}
                      </text>
                    </g>
                  );
                })}

                {/* Shaded 95% Credible Interval */}
                {confidencePolygonPath && (
                  <path
                    d={confidencePolygonPath}
                    fill="url(#bayesConfidenceGrad)"
                    stroke="#f59e0b"
                    strokeWidth="0.75"
                    strokeOpacity="0.4"
                  />
                )}

                {/* Mean Regression Curve */}
                {meanLinePath && (
                  <path
                    d={meanLinePath}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                )}

                {/* Evaluated Sample Points */}
                {artifact.trials.map((trial) => {
                  const xVal = Number(
                    trial.parameters[artifact.summary.primaryParameter] ?? 0,
                  );
                  const cx = scaleX(xVal);
                  const cy = scaleY(trial.objectiveValue);
                  const isSelected =
                    selectedTrial?.iteration === trial.iteration;

                  if (trial.status === "proposed") {
                    const proposedCy = scaleY(
                      artifact.surrogateCurve.find(
                        (p) => Math.abs(p.x - xVal) < 0.3,
                      )?.mean || yMax * 0.7,
                    );
                    return (
                      <g key={trial.iteration}>
                        <circle
                          cx={cx}
                          cy={proposedCy}
                          r={7}
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="2"
                          strokeDasharray="2 2"
                        />
                        <text
                          x={cx}
                          y={proposedCy - 11}
                          textAnchor="middle"
                          fill="#38bdf8"
                          fontSize="9"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          Next Trial (#{trial.iteration})
                        </text>
                      </g>
                    );
                  }

                  return (
                    <g
                      key={trial.iteration}
                      className="cursor-pointer transition-transform"
                      onClick={() => {
                        sound.playPop();
                        setSelectedTrial(trial);
                      }}
                    >
                      {trial.isOptimal && (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={10}
                          fill="#10b981"
                          fillOpacity="0.25"
                          className="animate-ping"
                        />
                      )}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={trial.isOptimal ? 6 : isSelected ? 5.5 : 4.5}
                        fill={
                          trial.isOptimal
                            ? "#10b981"
                            : isSelected
                              ? "#f59e0b"
                              : "#94a3b8"
                        }
                        stroke="#0f172a"
                        strokeWidth="1.5"
                      />
                      <text
                        x={cx}
                        y={cy + (trial.isOptimal ? -10 : 13)}
                        textAnchor="middle"
                        fill={trial.isOptimal ? "#10b981" : "#94a3b8"}
                        fontSize="8.5"
                        fontFamily="monospace"
                        fontWeight={trial.isOptimal ? "bold" : "normal"}
                      >
                        {trial.isOptimal ? "★ Opt" : `#${trial.iteration}`}
                      </text>
                    </g>
                  );
                })}

                {/* X Axis Coordinates */}
                <line
                  x1={padding.left}
                  y1={scaleY(yMin)}
                  x2={svgWidth - padding.right}
                  y2={scaleY(yMin)}
                  stroke="#475569"
                  strokeWidth="1"
                />
                {[1, 3, 5, 7, 9, 11].map((val) => {
                  if (val < xMin || val > xMax) return null;
                  return (
                    <text
                      key={val}
                      x={scaleX(val)}
                      y={scaleY(yMin) + 16}
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {val}
                    </text>
                  );
                })}
              </svg>
            </div>

            {/* Selected Trial Inspector Drawer */}
            {selectedTrial && (
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                      selectedTrial.isOptimal
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    #{selectedTrial.iteration}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">
                        {selectedTrial.isOptimal
                          ? "Optimal Hyperparameter Setting"
                          : `Iteration ${selectedTrial.iteration}`}
                      </span>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                        {selectedTrial.status}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {artifact.summary.primaryParameter}:{" "}
                      {
                        selectedTrial.parameters[
                          artifact.summary.primaryParameter
                        ]
                      }{" "}
                      tokens • Output:{" "}
                      {selectedTrial.objectiveValue > 0
                        ? `${selectedTrial.objectiveValue} tps`
                        : "Pending evaluation"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 text-[10px] block">
                      SE Uncertainty
                    </span>
                    <span className="text-slate-300">
                      ±{selectedTrial.standardError} tps
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">
                      Acquisition EI
                    </span>
                    <span className="text-amber-400 font-semibold">
                      {selectedTrial.acquisitionValue.toFixed(3)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: HYPERPARAMETER SPACE */}
        {activeTab === "parameters" && (
          <div className="space-y-3">
            <div
              className="overflow-x-auto rounded-xl border border-slate-800"
              role="region"
              tabIndex={0}
              aria-label="Hyperparameter Search Space"
            >
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 text-[11px] font-mono text-slate-400 border-b border-slate-800">
                    <th className="p-3">Parameter Name</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Search Domain / Choices</th>
                    <th className="p-3 text-right">Optimal Target</th>
                    <th className="p-3">Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {artifact.parameters.map((param) => (
                    <tr
                      key={param.name}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="p-3 font-semibold text-white flex items-center gap-1.5">
                        <ChevronRight className="w-3 h-3 text-amber-400" />
                        {param.name}
                      </td>
                      <td className="p-3 text-slate-400 uppercase">
                        {param.type}
                      </td>
                      <td className="p-3 text-slate-300">
                        {param.choices
                          ? param.choices.join(", ")
                          : `[${param.min ?? "-"}, ${param.max ?? "-"}] (step: ${param.step ?? 1})`}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-400">
                        {param.optimalValue}
                      </td>
                      <td className="p-3 text-slate-400">{param.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: SEQUENTIAL TRIALS */}
        {activeTab === "trials" && (
          <div className="space-y-3">
            <div
              className="overflow-x-auto rounded-xl border border-slate-800"
              role="region"
              tabIndex={0}
              aria-label="Sequential Bayesian Optimization Trials"
            >
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 text-[11px] font-mono text-slate-400 border-b border-slate-800">
                    <th className="p-3">#</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Primary Parameter</th>
                    <th className="p-3 text-right">Objective Value</th>
                    <th className="p-3 text-right">SE (Uncertainty)</th>
                    <th className="p-3 text-right">Acquisition Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {artifact.trials.map((trial) => (
                    <tr
                      key={trial.iteration}
                      onClick={() => {
                        sound.playPop();
                        setSelectedTrial(trial);
                      }}
                      className={`hover:bg-slate-800/30 cursor-pointer transition-colors ${
                        trial.isOptimal ? "bg-emerald-500/5" : ""
                      }`}
                    >
                      <td className="p-3 font-semibold text-slate-300">
                        #{trial.iteration}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold ${
                            trial.isOptimal
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : trial.status === "proposed"
                                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {trial.status}
                          {trial.isOptimal ? " ★" : ""}
                        </span>
                      </td>
                      <td className="p-3 text-slate-300">
                        {artifact.summary.primaryParameter} ={" "}
                        <strong className="text-white">
                          {trial.parameters[artifact.summary.primaryParameter]}
                        </strong>
                      </td>
                      <td className="p-3 text-right font-bold text-white">
                        {trial.objectiveValue > 0
                          ? `${trial.objectiveValue.toFixed(1)} tps`
                          : "Pending"}
                      </td>
                      <td className="p-3 text-right text-slate-400">
                        {trial.standardError > 0
                          ? `±${trial.standardError.toFixed(1)}`
                          : "-"}
                      </td>
                      <td className="p-3 text-right text-amber-400 font-semibold">
                        {trial.acquisitionValue.toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: PRODUCTION CONFIG */}
        {activeTab === "config" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">
                vLLM / Server Runtime YAML Configuration
              </span>
              <button
                onClick={() =>
                  handleCopy(artifact.configSnippetYaml, "yaml_tab")
                }
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition"
              >
                {copiedType === "yaml_tab" ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>Copy YAML</span>
              </button>
            </div>
            <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-amber-200 overflow-x-auto leading-relaxed">
              {artifact.configSnippetYaml}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
