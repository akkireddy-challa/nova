"use client";

import React, { useState, useMemo } from "react";
import {
  Activity,
  Download,
  Copy,
  Check,
  Play,
  Pause,
  Info,
} from "lucide-react";
import type { AudioSpectrogramArtifact, AcousticSegment } from "@/lib/types";
import {
  audioSpectrogramToCsv,
  audioSpectrogramToMarkdown,
} from "@/lib/audio/spectrogram-inspector";
import { downloadCsvData } from "@/lib/matrix-calculator";
import { sound } from "@/lib/sound";

interface AudioSpectrogramCardProps {
  artifact: AudioSpectrogramArtifact;
}

export function AudioSpectrogramCard({ artifact }: AudioSpectrogramCardProps) {
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "waterfall" | "segments" | "bands"
  >("waterfall");
  const [copied, setCopied] = useState(false);

  const segments = useMemo(() => artifact.segments || [], [artifact.segments]);
  const activeSegment: AcousticSegment | undefined =
    segments[selectedSegmentIndex] || segments[0];

  const handleCopyMarkdown = () => {
    const md = audioSpectrogramToMarkdown(artifact);
    navigator.clipboard.writeText(md);
    setCopied(true);
    sound.playPop();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCsv = () => {
    const csv = audioSpectrogramToCsv(artifact);
    const filename = `${artifact.id || "audio-spectrogram"}.csv`;
    downloadCsvData(csv, filename);
    sound.playSuccess();
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
    sound.playTap();
  };

  // Helper for formant bandwidth visualizer
  const getClarityColor = (clarity: string) => {
    switch (clarity) {
      case "pure":
        return "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";
      case "rich":
        return "bg-amber-500/10 text-amber-300 border-amber-500/30";
      case "turbulent":
        return "bg-rose-500/10 text-rose-300 border-rose-500/30";
      case "attenuated":
      default:
        return "bg-slate-500/10 text-slate-300 border-slate-500/30";
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 shadow-2xl overflow-hidden backdrop-blur-md">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
              <Activity className="w-3 h-3 text-amber-400" />
              Acoustic Spectrogram Inspector
            </span>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/50">
              {artifact.summary.durationSeconds}s Duration
            </span>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/50 truncate max-w-[200px]">
              {artifact.audioSource}
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-100 tracking-tight truncate">
            {artifact.topic}
          </h2>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={handleCopyMarkdown}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700/70 bg-slate-800/50 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors"
            title="Copy formatted markdown report"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>{copied ? "Copied" : "Copy MD"}</span>
          </button>
          <button
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-xs font-medium text-amber-300 hover:bg-amber-500/20 transition-colors shadow-sm"
            title="Download spectrogram and segment telemetry as RFC 4180 CSV"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Scorecard Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 border-b border-slate-800/80 bg-slate-900/40 divide-x divide-slate-800/80">
        <div className="p-3">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            SNR (Clarity)
          </div>
          <div className="text-lg font-bold font-mono text-emerald-400">
            {artifact.summary.snrDb} dB
          </div>
        </div>
        <div className="p-3">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Acoustic Conf
          </div>
          <div className="text-lg font-bold font-mono text-amber-300">
            {artifact.summary.averageAcousticConfidencePct}%
          </div>
        </div>
        <div className="p-3">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Speech / Silence
          </div>
          <div className="text-lg font-bold font-mono text-cyan-300">
            {artifact.summary.speechToSilenceRatio}x
          </div>
        </div>
        <div className="p-3">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Dominant F0
          </div>
          <div className="text-lg font-bold font-mono text-slate-100">
            {artifact.summary.dominantFrequencyHz} Hz
          </div>
        </div>
        <div className="p-3 col-span-2 sm:col-span-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Audio Channels
          </div>
          <div className="text-sm font-semibold text-slate-200 truncate mt-0.5">
            {artifact.summary.sampleRateHz} Hz (
            {artifact.summary.channelCount === 2 ? "Stereo" : "Mono"})
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between">
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
          <button
            onClick={() => {
              setActiveTab("waterfall");
              sound.playTap();
            }}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              activeTab === "waterfall"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Waveform & Waterfall
          </button>
          <button
            onClick={() => {
              setActiveTab("segments");
              sound.playTap();
            }}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              activeTab === "segments"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Phonetic Segments ({segments.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("bands");
              sound.playTap();
            }}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              activeTab === "bands"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Spectral Bands ({artifact.spectralBands.length})
          </button>
        </div>

        {/* Audio Playhead Stepper Control */}
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlayback}
            className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 transition-colors"
            title={
              isPlaying ? "Pause audio inspection" : "Play audio inspection"
            }
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Play className="w-3.5 h-3.5 text-amber-400" />
            )}
          </button>
          <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
            Active: Segment {selectedSegmentIndex + 1}/{segments.length}
          </span>
        </div>
      </div>

      {/* Main Body */}
      {activeTab === "waterfall" && (
        <div className="p-4 bg-slate-950/80 space-y-4">
          {/* SVG Spectrogram & Waveform Canvas */}
          <div className="relative rounded-lg border border-slate-800/90 bg-slate-950 p-3 overflow-hidden">
            <svg
              viewBox="0 0 800 220"
              className="w-full h-auto max-h-[260px]"
              role="graphics-document"
              aria-label={`Audio Spectrogram for ${artifact.topic}`}
            >
              <defs>
                <linearGradient
                  id="waveGradient"
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#d97706" stopOpacity="0.2" />
                </linearGradient>
                <linearGradient
                  id="spectrogramGrad"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
                  <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#ec4899" stopOpacity="0.3" />
                </linearGradient>
              </defs>

              {/* Background Spectral Grid Lines */}
              <line
                x1="40"
                y1="30"
                x2="780"
                y2="30"
                stroke="#1e293b"
                strokeDasharray="2 4"
              />
              <line
                x1="40"
                y1="75"
                x2="780"
                y2="75"
                stroke="#1e293b"
                strokeDasharray="2 4"
              />
              <line
                x1="40"
                y1="120"
                x2="780"
                y2="120"
                stroke="#1e293b"
                strokeDasharray="2 4"
              />
              <line
                x1="40"
                y1="165"
                x2="780"
                y2="165"
                stroke="#1e293b"
                strokeDasharray="2 4"
              />

              {/* Frequency Axis Labels (kHz) */}
              <text
                x="32"
                y="34"
                textAnchor="end"
                fill="#64748b"
                fontSize="9"
                fontFamily="monospace"
              >
                8k
              </text>
              <text
                x="32"
                y="79"
                textAnchor="end"
                fill="#64748b"
                fontSize="9"
                fontFamily="monospace"
              >
                4k
              </text>
              <text
                x="32"
                y="124"
                textAnchor="end"
                fill="#64748b"
                fontSize="9"
                fontFamily="monospace"
              >
                1k
              </text>
              <text
                x="32"
                y="169"
                textAnchor="end"
                fill="#64748b"
                fontSize="9"
                fontFamily="monospace"
              >
                200
              </text>

              {/* Waterfall Heatmap Simulation Fill */}
              <rect
                x="40"
                y="10"
                width="740"
                height="170"
                fill="url(#spectrogramGrad)"
                rx="4"
              />

              {/* Waveform Bars */}
              {artifact.waveformEnvelope.map((amp, idx) => {
                const totalBars = artifact.waveformEnvelope.length;
                const barWidth = 720 / totalBars - 3;
                const x = 50 + idx * (barWidth + 3);
                const barHeight = Math.max(8, amp * 120);
                const y = 140 - barHeight / 2;

                return (
                  <rect
                    key={idx}
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx="2"
                    fill="url(#waveGradient)"
                    className="transition-all hover:brightness-125"
                  />
                );
              })}

              {/* Timeline Axis */}
              <line
                x1="40"
                y1="190"
                x2="780"
                y2="190"
                stroke="#475569"
                strokeWidth="1"
              />
              <text
                x="50"
                y="205"
                fill="#94a3b8"
                fontSize="9"
                fontFamily="monospace"
              >
                0.0s
              </text>
              <text
                x="410"
                y="205"
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="9"
                fontFamily="monospace"
              >
                {(artifact.summary.durationSeconds / 2).toFixed(1)}s
              </text>
              <text
                x="770"
                y="205"
                textAnchor="end"
                fill="#94a3b8"
                fontSize="9"
                fontFamily="monospace"
              >
                {artifact.summary.durationSeconds}s
              </text>

              {/* Active Segment Marker */}
              {activeSegment && (
                <g>
                  <rect
                    x={
                      40 +
                      (activeSegment.startMs /
                        (artifact.summary.durationSeconds * 1000)) *
                        740
                    }
                    y="10"
                    width={Math.max(
                      10,
                      ((activeSegment.endMs - activeSegment.startMs) /
                        (artifact.summary.durationSeconds * 1000)) *
                        740,
                    )}
                    height="180"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                    rx="4"
                  />
                </g>
              )}
            </svg>
          </div>

          {/* Active Segment Detailed Drawer */}
          {activeSegment && (
            <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-3.5 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {activeSegment.speakerTag}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    {(activeSegment.startMs / 1000).toFixed(1)}s &mdash;{" "}
                    {(activeSegment.endMs / 1000).toFixed(1)}s
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-400">
                    Confidence:{" "}
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {activeSegment.acousticConfidencePct}%
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-200 leading-relaxed font-sans">
                &ldquo;{activeSegment.transcriptText}&rdquo;
              </p>

              {/* Formants & Evidence Footer */}
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1">
                <div className="flex items-center gap-3">
                  <span>Pitch: {activeSegment.pitchHz} Hz</span>
                  {activeSegment.formants && (
                    <span>
                      Formants: F1 {activeSegment.formants.f1Hz}Hz / F2{" "}
                      {activeSegment.formants.f2Hz}Hz
                    </span>
                  )}
                </div>
                {activeSegment.verifiableEvidence && (
                  <span className="text-teal-400 truncate max-w-xs">
                    Citation: {activeSegment.verifiableEvidence}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Phonetic Segments Tab */}
      {activeTab === "segments" && (
        <div className="p-4 bg-slate-950/80 space-y-2 max-h-[440px] overflow-y-auto custom-scrollbar">
          {segments.map((seg, idx) => (
            <div
              key={seg.id}
              onClick={() => {
                setSelectedSegmentIndex(idx);
                sound.playTap();
              }}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                selectedSegmentIndex === idx
                  ? "border-amber-500/60 bg-slate-900 shadow-md"
                  : "border-slate-800/80 bg-slate-950/60 hover:bg-slate-900/40"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-amber-300">
                    {seg.speakerTag}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {(seg.startMs / 1000).toFixed(1)}s -{" "}
                    {(seg.endMs / 1000).toFixed(1)}s
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-400">
                  {seg.acousticConfidencePct}% Conf
                </span>
              </div>
              <p className="text-xs text-slate-200">{seg.transcriptText}</p>
              {seg.verifiableEvidence && (
                <div className="mt-1.5 text-[10px] font-mono text-teal-400">
                  Evidence: {seg.verifiableEvidence}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Spectral Bands Tab */}
      {activeTab === "bands" && (
        <div className="p-4 bg-slate-950/80 space-y-3">
          {artifact.spectralBands.map((band, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-100 font-mono">
                    {band.bandName}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {band.rangeHz}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase border ${getClarityColor(
                      band.harmonicClarity,
                    )}`}
                  >
                    {band.harmonicClarity}
                  </span>
                  <span className="text-xs font-bold font-mono text-amber-300">
                    {band.energyPct}% Energy
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${band.energyPct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Executive Summary Callout */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
          <Info className="w-3.5 h-3.5 text-amber-400" />
          <span>Acoustic Grounding Synthesis</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          {artifact.executiveSummary}
        </p>
      </div>
    </div>
  );
}
