"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Activity,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  ShieldAlert,
  Download,
  Copy,
  Check,
  Zap,
  Flame,
  Radio,
  Clock,
  Sparkles,
} from "lucide-react";
import type {
  ResilienceSimulationArtifact,
  SimulationMetricPoint,
} from "@/lib/types";
import {
  simulationToCsv,
  simulationToMarkdown,
} from "@/lib/research/resilience-simulator";
import { downloadCsvData } from "@/lib/matrix-calculator";
import { sound } from "@/lib/sound";

interface Props {
  simulation: ResilienceSimulationArtifact;
  onApplyHardening?: (rec: string) => void;
}

// Risk badge styling
function getRiskBadge(risk: "low" | "moderate" | "critical") {
  switch (risk) {
    case "low":
      return {
        label: "Low Cascading Risk",
        cls: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
      };
    case "moderate":
      return {
        label: "Moderate Cascading Risk",
        cls: "bg-amber-500/10 text-amber-300 border-amber-500/30",
      };
    case "critical":
      return {
        label: "Critical Blast Radius",
        cls: "bg-rose-500/10 text-rose-300 border-rose-500/30",
      };
  }
}

// Circuit breaker visual state
function getBreakerPill(state: "closed" | "open" | "half_open") {
  switch (state) {
    case "closed":
      return {
        label: "Circuit Breaker: CLOSED (Healthy)",
        cls: "bg-emerald-950/60 text-emerald-300 border-emerald-500/40",
        dotCls: "bg-emerald-400",
      };
    case "open":
      return {
        label: "Circuit Breaker: OPEN (Fast Failing)",
        cls: "bg-rose-950/80 text-rose-300 border-rose-500/50 animate-pulse",
        dotCls: "bg-rose-500",
      };
    case "half_open":
      return {
        label: "Circuit Breaker: HALF-OPEN (Canary Probes)",
        cls: "bg-amber-950/70 text-amber-300 border-amber-500/40",
        dotCls: "bg-amber-400",
      };
  }
}

export function ResilienceSimulationCard({
  simulation,
  onApplyHardening,
}: Props) {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [completedHardening, setCompletedHardening] = useState<Set<number>>(
    new Set(),
  );
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const series = simulation.telemetrySeries || [];
  const currentPoint: SimulationMetricPoint = series[currentStepIndex] ||
    series[0] || {
      step: 1,
      timestampSeconds: 0,
      throughputRps: simulation.baselineRps,
      latencyP99Ms: 45,
      errorRatePct: 0,
      cpuSaturationPct: 20,
      circuitBreakerState: "closed",
      activeIncident: null,
    };

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= series.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 750);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, series.length]);

  const handlePlayPause = () => {
    sound.playPop();
    if (!isPlaying && currentStepIndex >= series.length - 1) {
      setCurrentStepIndex(0);
    }
    setIsPlaying((prev) => !prev);
  };

  const handleReset = () => {
    sound.playPop();
    setIsPlaying(false);
    setCurrentStepIndex(0);
  };

  const handleStepForward = () => {
    sound.playPop();
    setIsPlaying(false);
    setCurrentStepIndex((prev) => Math.min(series.length - 1, prev + 1));
  };

  const handleCopyMarkdown = () => {
    try {
      const md = simulationToMarkdown(simulation);
      navigator.clipboard.writeText(md);
      setCopied(true);
      sound.playSuccess();
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn("Failed to copy markdown:", err);
    }
  };

  const handleDownloadCsv = () => {
    try {
      const csv = simulationToCsv(simulation);
      const safeTitle = (simulation.title || "resilience-simulation")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 32);
      downloadCsvData(csv, `nova-sim-${safeTitle}.csv`);
      setDownloaded(true);
      sound.playSuccess();
      setTimeout(() => setDownloaded(false), 2000);
    } catch (err) {
      console.warn("Failed to download CSV:", err);
    }
  };

  const toggleHardening = (idx: number) => {
    sound.playCheck();
    setCompletedHardening((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const riskBadge = getRiskBadge(simulation.summary.cascadingFailureRisk);
  const breakerPill = getBreakerPill(currentPoint.circuitBreakerState);

  // Gauge calculations
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const score = simulation.summary.resilienceScore;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const gaugeColor =
    score >= 75
      ? "#10b981" // emerald
      : score >= 50
        ? "#f59e0b" // amber
        : "#f43f5e"; // rose

  // Chart coordinate calculations
  const chartWidth = 560;
  const chartHeight = 110;
  const maxRps = Math.max(
    ...series.map((p) => p.throughputRps),
    simulation.baselineRps * 1.5,
  );
  const maxLatency = Math.max(...series.map((p) => p.latencyP99Ms), 200);

  // SVG polyline points
  const rpsPoints = series
    .map((p, i) => {
      const x = (i / Math.max(1, series.length - 1)) * chartWidth;
      const y = chartHeight - (p.throughputRps / maxRps) * (chartHeight - 16);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const latencyPoints = series
    .map((p, i) => {
      const x = (i / Math.max(1, series.length - 1)) * chartWidth;
      const y =
        chartHeight - (p.latencyP99Ms / maxLatency) * (chartHeight - 16);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const scrubberX =
    (currentStepIndex / Math.max(1, series.length - 1)) * chartWidth;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
      {/* 1. Header Banner & Resilience Summary */}
      <div className="p-5 md:p-6 border-b border-slate-800/80 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/20">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium tracking-wide uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1.5">
                <Activity className="w-3 h-3" />
                Chaos & Resilience Simulator
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${riskBadge.cls}`}
              >
                {riskBadge.label}
              </span>
            </div>
            <h3 className="text-lg md:text-xl font-bold text-slate-100 tracking-tight leading-snug">
              {simulation.title}
            </h3>
            <p className="text-xs md:text-sm text-slate-400 mt-1 line-clamp-2">
              {simulation.description || simulation.summary.bottleneckDiagnosis}
            </p>
          </div>

          {/* Resilience Gauge & Export Actions */}
          <div className="flex items-center gap-5 w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center gap-3">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <svg
                  className="w-16 h-16 transform -rotate-90"
                  viewBox="0 0 96 96"
                >
                  <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    stroke="#1e293b"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    stroke={gaugeColor}
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-sm font-bold font-mono text-slate-100 leading-none">
                    {`${score}%`}
                  </span>
                  <span className="text-[9px] font-mono uppercase text-slate-400 tracking-tight mt-0.5">
                    Resilience
                  </span>
                </div>
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold text-slate-300">
                  Stress Tolerance
                </div>
                <div className="text-[11px] text-slate-500">
                  {`Recovery: ${simulation.summary.recoveryTimeSteps} steps`}
                </div>
              </div>
            </div>

            {/* Quick Export Actions */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleDownloadCsv}
                title="Download RFC 4180 CSV Telemetry"
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                {downloaded ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span className="hidden sm:inline">CSV</span>
              </button>
              <button
                onClick={handleCopyMarkdown}
                title="Copy Markdown Report"
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span className="hidden sm:inline">Copy</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Simulation Controller & Scrub Bar */}
      <div className="p-4 md:p-5 border-b border-slate-800/80 bg-slate-950/60 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePlayPause}
              className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1.5 transition shadow-sm text-xs"
              title={isPlaying ? "Pause Simulation" : "Play Simulation"}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Play</span>
                </>
              )}
            </button>
            <button
              onClick={handleStepForward}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs flex items-center gap-1"
              title="Step Forward"
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Step</span>
            </button>
            <button
              onClick={handleReset}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs"
              title="Reset Timeline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Step Time Marker */}
            <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 ml-2">
              {`Step ${currentPoint.step} / ${series.length} (${currentPoint.timestampSeconds}s)`}
            </span>
          </div>

          {/* Circuit Breaker Status Pill */}
          <div
            className={`px-3 py-1 rounded-xl border text-xs font-mono flex items-center gap-2 ${breakerPill.cls}`}
          >
            <span className={`w-2 h-2 rounded-full ${breakerPill.dotCls}`} />
            <span>{breakerPill.label}</span>
          </div>
        </div>

        {/* Scrub Slider */}
        <div className="space-y-1">
          <input
            type="range"
            min={0}
            max={Math.max(0, series.length - 1)}
            value={currentStepIndex}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentStepIndex(Number(e.target.value));
            }}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>

        {/* Active Incident Warning Callout */}
        {currentPoint.activeIncident && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2.5 animate-pulse">
            <Flame className="w-4 h-4 text-rose-400 shrink-0" />
            <div className="flex-1">
              <strong className="text-rose-300">
                Active Incident Triggered:
              </strong>{" "}
              {currentPoint.activeIncident}
            </div>
          </div>
        )}
      </div>

      {/* 3. Real-Time Telemetry Metrics Gauges */}
      <div className="p-4 md:p-6 grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950/40 border-b border-slate-800/60">
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
          <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between mb-1">
            <span>Throughput</span>
            <Radio className="w-3 h-3 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-cyan-300">
            {`${currentPoint.throughputRps.toLocaleString()} rps`}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {`Baseline: ${simulation.baselineRps} rps`}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
          <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between mb-1">
            <span>p99 Latency</span>
            <Clock className="w-3 h-3 text-amber-400" />
          </div>
          <div
            className={`text-xl font-bold font-mono ${
              currentPoint.latencyP99Ms >= 300
                ? "text-rose-400"
                : currentPoint.latencyP99Ms >= 120
                  ? "text-amber-400"
                  : "text-emerald-400"
            }`}
          >
            {`${currentPoint.latencyP99Ms} ms`}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {`Peak: ${simulation.summary.peakP99LatencyMs} ms`}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
          <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between mb-1">
            <span>Error Rate</span>
            <AlertTriangle className="w-3 h-3 text-rose-400" />
          </div>
          <div
            className={`text-xl font-bold font-mono ${
              currentPoint.errorRatePct > 10
                ? "text-rose-400"
                : currentPoint.errorRatePct > 0
                  ? "text-amber-400"
                  : "text-slate-200"
            }`}
          >
            {`${currentPoint.errorRatePct.toFixed(1)}%`}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {`Max: ${simulation.summary.maxErrorRatePct.toFixed(1)}%`}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
          <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between mb-1">
            <span>CPU Saturation</span>
            <Zap className="w-3 h-3 text-purple-400" />
          </div>
          <div
            className={`text-xl font-bold font-mono ${
              currentPoint.cpuSaturationPct >= 85
                ? "text-rose-400"
                : currentPoint.cpuSaturationPct >= 65
                  ? "text-amber-400"
                  : "text-purple-300"
            }`}
          >
            {`${currentPoint.cpuSaturationPct.toFixed(0)}%`}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {currentPoint.cpuSaturationPct >= 85
              ? "Near Capacity"
              : "Optimal headroom"}
          </div>
        </div>
      </div>

      {/* 4. Telemetry Multi-Series SVG Curve */}
      <div className="p-4 md:p-6 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-cyan-400 rounded-full" />
              <span>Throughput (RPS)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-rose-400 rounded-full" />
              <span>p99 Latency (ms)</span>
            </span>
          </div>
          <span>Timeline Horizon (25 steps)</span>
        </div>

        <div className="w-full bg-slate-950/80 rounded-xl p-3 border border-slate-800/80 overflow-hidden">
          <svg
            className="w-full h-28 overflow-visible"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="none"
          >
            {/* Horizontal Grid lines */}
            <line
              x1="0"
              y1={chartHeight * 0.25}
              x2={chartWidth}
              y2={chartHeight * 0.25}
              stroke="#1e293b"
              strokeDasharray="4 4"
            />
            <line
              x1="0"
              y1={chartHeight * 0.5}
              x2={chartWidth}
              y2={chartHeight * 0.5}
              stroke="#1e293b"
              strokeDasharray="4 4"
            />
            <line
              x1="0"
              y1={chartHeight * 0.75}
              x2={chartWidth}
              y2={chartHeight * 0.75}
              stroke="#1e293b"
              strokeDasharray="4 4"
            />

            {/* Throughput Curve */}
            <polyline
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2.5"
              points={rpsPoints}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Latency Curve */}
            <polyline
              fill="none"
              stroke="#f43f5e"
              strokeWidth="2.5"
              points={latencyPoints}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Active Scrub Marker Vertical Line */}
            <line
              x1={scrubberX}
              y1="0"
              x2={scrubberX}
              y2={chartHeight}
              stroke="#10b981"
              strokeWidth="2"
              strokeDasharray="3 3"
            />
            <circle
              cx={scrubberX}
              cy={
                chartHeight -
                (currentPoint.throughputRps / maxRps) * (chartHeight - 16)
              }
              r="4"
              fill="#06b6d4"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
            <circle
              cx={scrubberX}
              cy={
                chartHeight -
                (currentPoint.latencyP99Ms / maxLatency) * (chartHeight - 16)
              }
              r="4"
              fill="#f43f5e"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          </svg>
        </div>
      </div>

      {/* 5. Injected Chaos Scenarios & Bottleneck Diagnosis */}
      <div className="p-4 md:p-6 space-y-4 border-t border-slate-800/80">
        {/* Active Chaos Injections list */}
        {simulation.activeInjections &&
          simulation.activeInjections.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-xs font-semibold uppercase tracking-wider font-mono text-slate-300 mb-2 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span>Configured Chaos & Stress Events</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {simulation.activeInjections.map((inj) => (
                  <div
                    key={inj.id}
                    className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-200">
                        {inj.name}
                      </span>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-rose-950/80 text-rose-300 border border-rose-800/60 font-bold">
                        {inj.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {inj.description}
                    </p>
                    <div className="text-[10px] font-mono text-slate-500 mt-1">
                      {`Trigger: Step ${inj.triggerStep} (Duration: ${inj.durationSteps} steps)`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* Bottleneck Diagnosis */}
        <div className="p-4 md:p-5 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-1.5">
          <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
            <ShieldAlert className="w-4 h-4" />
            <span>Bottleneck & Failure Mode Diagnosis</span>
          </div>
          <p className="text-xs md:text-sm text-slate-200 leading-relaxed">
            {simulation.summary.bottleneckDiagnosis}
          </p>
        </div>

        {/* Hardening Checklist */}
        {simulation.summary.hardeningRecommendations &&
          simulation.summary.hardeningRecommendations.length > 0 && (
            <div className="p-4 md:p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Recommended Architectural Hardening Gates</span>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  {`${completedHardening.size} / ${simulation.summary.hardeningRecommendations.length} Signed Off`}
                </span>
              </div>
              <div className="space-y-2">
                {simulation.summary.hardeningRecommendations.map(
                  (rec, rIdx) => {
                    const isDone = completedHardening.has(rIdx);
                    return (
                      <div
                        key={rIdx}
                        onClick={() => toggleHardening(rIdx)}
                        className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-3 cursor-pointer transition ${
                          isDone
                            ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-200 line-through opacity-80"
                            : "bg-slate-900/70 border-slate-800 text-slate-200 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isDone}
                            onChange={() => {}}
                            className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                          />
                          <span>{rec}</span>
                        </div>
                        {onApplyHardening && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              sound.playCheck();
                              onApplyHardening(rec);
                            }}
                            className="text-[11px] text-cyan-400 hover:text-cyan-300"
                          >
                            Apply
                          </button>
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
