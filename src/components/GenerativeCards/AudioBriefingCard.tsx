"use client";

import React, { useState } from "react";
import {
  Headphones,
  Play,
  Download,
  Copy,
  Check,
  FileText,
  Clock,
  Sparkles,
  BookOpen,
  ListMusic,
  UserCheck,
  Mic,
  Layers,
} from "lucide-react";
import type { AudioBriefingArtifact } from "@/lib/types";
import {
  formatDurationTimestamp,
  audioBriefingToCsv,
  audioBriefingToVtt,
  audioBriefingToMarkdown,
} from "@/lib/audio/voice-briefing";
import { sound } from "@/lib/sound";

export interface AudioBriefingCardProps {
  briefing: AudioBriefingArtifact;
  onPlay?: (startChapterIndex?: number) => void;
  className?: string;
}

/**
 * Downloads a file in browser environment safely.
 */
function downloadFile(
  filename: string,
  content: string,
  mimeType: string,
): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function AudioBriefingCard({
  briefing,
  onPlay,
  className = "",
}: AudioBriefingCardProps) {
  const [activeTab, setActiveTab] = useState<"chapters" | "script">("chapters");
  const [copiedMd, setCopiedMd] = useState<boolean>(false);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [hoveredChapter, setHoveredChapter] = useState<number | null>(null);

  const totalDurationMs = briefing.totalDurationMs || 1;

  // 1-Click CSV Export
  const handleDownloadCsv = () => {
    sound.playSuccess();
    const csv = audioBriefingToCsv(briefing);
    const slug = (briefing.title || "audio-briefing")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    downloadFile(`${slug}-transcript.csv`, csv, "text/csv;charset=utf-8;");
  };

  // 1-Click WebVTT Subtitle Export
  const handleDownloadVtt = () => {
    sound.playSuccess();
    const vtt = audioBriefingToVtt(briefing);
    const slug = (briefing.title || "audio-briefing")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    downloadFile(`${slug}-subtitles.vtt`, vtt, "text/vtt;charset=utf-8;");
  };

  // 1-Click Markdown Briefing Copy
  const handleCopyMarkdown = () => {
    sound.playSuccess();
    const md = audioBriefingToMarkdown(briefing);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(md).catch(() => {});
    }
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  };

  // Copy Full Narration Script
  const handleCopyScript = () => {
    sound.playSuccess();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard
        .writeText(briefing.fullNarrationScript)
        .catch(() => {});
    }
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div
      role="region"
      aria-label="Audio Briefing Card"
      data-testid="audio-briefing-card"
      className={`rounded-2xl border border-indigo-500/30 bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur-xl shadow-2xl shadow-indigo-950/30 overflow-hidden text-slate-100 ${className}`}
    >
      {/* Header Section */}
      <div className="p-5 sm:p-6 border-b border-indigo-500/20 bg-gradient-to-br from-indigo-950/40 via-slate-900/40 to-slate-950/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-md shadow-indigo-500/20 flex-shrink-0">
                <Headphones className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-400 font-semibold block">
                  Multimodal Audio Briefing Engine
                </span>
                <h2
                  data-testid="briefing-title"
                  className="text-lg sm:text-xl font-bold text-slate-100 truncate"
                >
                  {briefing.title}
                </h2>
              </div>
            </div>

            {/* Meta Pills: Duration, Word Count, Chapters */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span
                data-testid="duration-pill"
                className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
              >
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                {formatDurationTimestamp(briefing.totalDurationMs)}
              </span>

              <span
                data-testid="word-count-pill"
                className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700"
              >
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                {`${briefing.totalWordCount.toLocaleString()} words`}
              </span>

              <span
                data-testid="chapters-count-pill"
                className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700"
              >
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                {`${briefing.chapters.length} Chapters`}
              </span>
            </div>
          </div>

          {/* Action CTAs: Play Briefing & Export Suite */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-shrink-0">
            <button
              type="button"
              data-testid="play-briefing-btn"
              onClick={() => {
                sound.playSuccess();
                onPlay?.(1);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 border border-indigo-400/30 transition-all cursor-pointer"
              title="Start listening to briefing"
            >
              <Play className="w-4 h-4 fill-current ml-0.5" />
              <span>Play Briefing</span>
            </button>

            <button
              type="button"
              data-testid="card-export-csv-btn"
              onClick={handleDownloadCsv}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-medium transition cursor-pointer"
              title="Download RFC 4180 CSV transcript"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>

            <button
              type="button"
              data-testid="card-export-vtt-btn"
              onClick={handleDownloadVtt}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-medium transition cursor-pointer"
              title="Download WebVTT subtitle track (.vtt)"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>VTT</span>
            </button>

            <button
              type="button"
              data-testid="card-copy-md-btn"
              onClick={handleCopyMarkdown}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-medium transition cursor-pointer"
              title="Copy executive Markdown briefing report"
            >
              {copiedMd ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedMd ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Waveform Preview Banner with Chapter Markers */}
      <div className="p-4 sm:p-5 bg-slate-950/60 border-b border-indigo-500/20 space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5 text-indigo-400" />
            Synthetic Audio Waveform &amp; Pacing
          </span>
          <span>
            Timeline (00:00 - {formatDurationTimestamp(totalDurationMs)})
          </span>
        </div>

        {/* SVG Waveform Visualizer */}
        <div
          data-testid="card-waveform-banner"
          className="relative w-full h-14 bg-slate-900/80 rounded-xl p-2 border border-slate-800 flex items-center overflow-hidden"
        >
          <svg
            className="w-full h-full"
            preserveAspectRatio="none"
            viewBox="0 0 600 48"
            aria-hidden="true"
          >
            <defs>
              <linearGradient
                id="cardWaveGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="50%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
            </defs>

            {briefing.waveform.map((bar, i) => {
              const count = briefing.waveform.length || 48;
              const barWidth = Math.max(3, 600 / count - 3);
              const x = i * (600 / count) + 1.5;
              const height = (bar.heightPct / 100) * 40;
              const y = 44 - height;

              return (
                <rect
                  key={bar.index ?? i}
                  x={x}
                  y={y}
                  width={barWidth}
                  height={height}
                  rx={2.5}
                  ry={2.5}
                  fill="url(#cardWaveGradient)"
                  opacity={0.85}
                  className="hover:opacity-100 transition-opacity"
                />
              );
            })}
          </svg>

          {/* Chapter Markers */}
          {briefing.chapters.map((chapter) => {
            const leftPct = (chapter.startTimeMs / totalDurationMs) * 100;
            const isHovered = hoveredChapter === chapter.chapterIndex;

            return (
              <div
                key={chapter.id || chapter.chapterIndex}
                data-testid={`chapter-marker-${chapter.chapterIndex}`}
                className="absolute top-0 bottom-0 pointer-events-auto cursor-pointer group"
                style={{ left: `${leftPct}%` }}
                onClick={() => {
                  sound.playTap();
                  onPlay?.(chapter.chapterIndex);
                }}
                onMouseEnter={() => setHoveredChapter(chapter.chapterIndex)}
                onMouseLeave={() => setHoveredChapter(null)}
              >
                {/* Vertical Marker Line */}
                <div className="w-0.5 h-full bg-amber-400/80 group-hover:bg-amber-300 transition-colors shadow-[0_0_6px_rgba(251,191,36,0.6)]" />

                {/* Marker Flag Pill */}
                <div
                  className={`absolute top-1 left-1 transform -translate-x-1/2 whitespace-nowrap text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900/90 text-amber-300 border border-amber-500/50 shadow-md transition-opacity pointer-events-none ${
                    isHovered ? "opacity-100 z-20 scale-105" : "opacity-75 z-10"
                  }`}
                >
                  {`Ch ${chapter.chapterIndex} (${formatDurationTimestamp(chapter.startTimeMs)})`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs Navigation: Chapters vs Full Script */}
      <div className="px-5 pt-4 pb-0 border-b border-slate-800 flex items-center gap-4">
        <button
          type="button"
          data-testid="tab-chapters-btn"
          onClick={() => {
            sound.playTap();
            setActiveTab("chapters");
          }}
          className={`flex items-center gap-2 pb-3 text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer ${
            activeTab === "chapters"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <ListMusic className="w-4 h-4" />
          <span>Chapters Breakdown ({briefing.chapters.length})</span>
        </button>

        <button
          type="button"
          data-testid="tab-script-btn"
          onClick={() => {
            sound.playTap();
            setActiveTab("script");
          }}
          className={`flex items-center gap-2 pb-3 text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer ${
            activeTab === "script"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Full Narration Script</span>
        </button>
      </div>

      {/* Tab 1: Chapters Breakdown List */}
      {activeTab === "chapters" && (
        <div data-testid="chapters-list" className="p-5 space-y-3.5">
          {briefing.chapters.map((chapter) => (
            <div
              key={chapter.id || chapter.chapterIndex}
              data-testid={`chapter-card-${chapter.chapterIndex}`}
              className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 hover:border-indigo-500/40 hover:bg-slate-900/80 transition-all space-y-2.5"
            >
              {/* Header: Title, Speaker Badge, Duration, Play Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {`Chapter ${chapter.chapterIndex}`}
                  </span>

                  <h3 className="text-sm sm:text-base font-bold text-slate-100">
                    {chapter.title}
                  </h3>

                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30 font-medium inline-flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-violet-400" />
                    {chapter.speaker}
                  </span>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                  <span className="text-xs font-mono text-slate-400">
                    {formatDurationTimestamp(chapter.startTimeMs)} -{" "}
                    {formatDurationTimestamp(chapter.endTimeMs)} (
                    {Math.round(chapter.estimatedDurationMs / 1000)}s)
                  </span>

                  <button
                    type="button"
                    data-testid={`play-chapter-btn-${chapter.chapterIndex}`}
                    onClick={() => {
                      sound.playSuccess();
                      onPlay?.(chapter.chapterIndex);
                    }}
                    className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white shadow-sm transition cursor-pointer"
                    title={`Play from Chapter ${chapter.chapterIndex}`}
                  >
                    <Play className="w-3 h-3 fill-current ml-0.5" />
                    <span>Play</span>
                  </button>
                </div>
              </div>

              {/* Script Excerpt */}
              <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed font-sans">
                {chapter.text}
              </p>

              {/* Key Takeaways Pills */}
              {chapter.keyTakeaways && chapter.keyTakeaways.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-indigo-400" />
                    Key Takeaways:
                  </span>
                  {chapter.keyTakeaways.map((takeaway, tIdx) => (
                    <span
                      key={tIdx}
                      data-testid="takeaway-pill"
                      className="text-[11px] px-2.5 py-0.5 rounded-md bg-slate-800/90 text-slate-200 border border-slate-700/70"
                    >
                      {takeaway}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Full Narration Script Accordion */}
      {activeTab === "script" && (
        <div data-testid="narration-script-view" className="p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span className="text-xs sm:text-sm font-semibold text-slate-200">
                Complete Executive Briefing Script
              </span>
            </div>

            <button
              type="button"
              data-testid="copy-script-btn"
              onClick={handleCopyScript}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer"
            >
              {copiedScript ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>
                {copiedScript ? "Script Copied!" : "Copy Full Script"}
              </span>
            </button>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {briefing.chapters.map((chapter) => (
              <div
                key={chapter.id || chapter.chapterIndex}
                className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2 text-xs font-mono">
                  <span className="text-indigo-400 font-semibold">
                    [{formatDurationTimestamp(chapter.startTimeMs)} -{" "}
                    {formatDurationTimestamp(chapter.endTimeMs)}] Chapter{" "}
                    {chapter.chapterIndex}: {chapter.title}
                  </span>
                  <span className="text-violet-300">
                    Speaker: {chapter.speaker}
                  </span>
                </div>
                <blockquote className="text-xs sm:text-sm text-slate-200 leading-relaxed pl-3 border-l-2 border-indigo-500/50 italic">
                  {chapter.text}
                </blockquote>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
