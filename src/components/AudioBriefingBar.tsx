"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
  Play,
  Pause,
  Square,
  X,
  Volume2,
  SkipBack,
  SkipForward,
  ChevronUp,
  ChevronDown,
  Download,
  Copy,
  Check,
  FileText,
  ListMusic,
  Maximize2,
  Minimize2,
  Sparkles,
  UserCheck,
} from "lucide-react";
import type {
  AudioBriefingArtifact,
  AudioChapterSegment,
  WaveformBar,
} from "@/lib/types";
import {
  formatDurationTimestamp,
  audioBriefingToCsv,
  audioBriefingToVtt,
  audioBriefingToMarkdown,
} from "@/lib/audio/voice-briefing";
import { sound } from "@/lib/sound";

export const PLAYBACK_SPEEDS = [1.0, 1.25, 1.5, 2.0] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

export function getNextPlaybackSpeed(current: number): PlaybackSpeed {
  const tolerance = 0.01;
  const idx = PLAYBACK_SPEEDS.findIndex(
    (s) => Math.abs(s - current) < tolerance,
  );
  if (idx === -1 || idx === PLAYBACK_SPEEDS.length - 1) {
    return PLAYBACK_SPEEDS[0];
  }
  return PLAYBACK_SPEEDS[idx + 1];
}

export interface AudioBriefingBarProps {
  briefing?: AudioBriefingArtifact;
  activeChapterIndex?: number;
  onChapterChange?: (chapterIndex: number) => void;
  onClose?: () => void;

  // Legacy Chunk-Based Controller Mode (backwards compatibility)
  isPlaying?: boolean;
  isPaused?: boolean;
  currentChunk?: number;
  totalChunks?: number;
  currentSpeed?: number;
  onPlayPause?: () => void;
  onStop?: () => void;
  onSpeedChange?: (speed: number) => void;
  title?: string;
  initialDrawerOpen?: boolean;
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

/**
 * Creates deterministic fallback briefing if legacy props are passed without a full briefing object.
 */
function createFallbackBriefing(
  title: string,
  totalChunks = 3,
): AudioBriefingArtifact {
  const count = Math.max(1, totalChunks);
  const durationPerChunkMs = 30000;
  const totalDurationMs = count * durationPerChunkMs;
  const chapters: AudioChapterSegment[] = [];

  for (let i = 0; i < count; i++) {
    const startMs = i * durationPerChunkMs;
    const endMs = (i + 1) * durationPerChunkMs;
    chapters.push({
      id: `ch-${i + 1}`,
      chapterIndex: i + 1,
      title: `${title} - Section ${i + 1}`,
      speaker: i % 2 === 0 ? "Executive Lead" : "Lead Architect",
      text: `Key briefing points and strategic execution metrics for section ${i + 1}.`,
      estimatedDurationMs: durationPerChunkMs,
      startTimeMs: startMs,
      endTimeMs: endMs,
      keyTakeaways: [
        `Critical metric overview for milestone ${i + 1}`,
        `Actionable strategic guideline`,
      ],
    });
  }

  const waveform: WaveformBar[] = [];
  for (let b = 0; b < 48; b++) {
    const angle = ((b % 16) / 16) * Math.PI;
    const height = Math.round(20 + 70 * Math.sin(angle));
    waveform.push({
      index: b,
      heightPct: Math.max(15, Math.min(100, height)),
      energyLevel: height > 65 ? "high" : height > 35 ? "medium" : "low",
    });
  }

  return {
    title: title || "Audio Overview Briefing",
    totalDurationMs,
    totalWordCount: count * 80,
    chapters,
    waveform,
    fullNarrationScript: chapters
      .map((c) => `[${c.speaker}] ${c.title}:\n${c.text}`)
      .join("\n\n"),
    generatedAt: "2026-10-29T00:00:00.000Z",
  };
}

export function AudioBriefingBar({
  briefing: propBriefing,
  activeChapterIndex: controlledChapterIdx,
  onChapterChange,
  isPlaying: propIsPlaying,
  isPaused: propIsPaused,
  currentChunk: propCurrentChunk,
  totalChunks: propTotalChunks,
  currentSpeed: propCurrentSpeed,
  onPlayPause: propOnPlayPause,
  onStop: propOnStop,
  onSpeedChange: propOnSpeedChange,
  title: propTitle,
  onClose,
  initialDrawerOpen = false,
  className = "",
}: AudioBriefingBarProps) {
  // Resolved briefing object (with deterministic fallback if needed)
  const briefing = useMemo<AudioBriefingArtifact>(() => {
    if (propBriefing) return propBriefing;
    return createFallbackBriefing(
      propTitle || "Audio Overview Briefing",
      propTotalChunks ?? 3,
    );
  }, [propBriefing, propTitle, propTotalChunks]);

  // Internal playback state
  const [internalPlaying, setInternalPlaying] = useState<boolean>(false);
  const [internalPaused, setInternalPaused] = useState<boolean>(false);
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);
  const [userSelectedSpeed, setUserSelectedSpeed] =
    useState<PlaybackSpeed | null>(null);
  const playbackRate: PlaybackSpeed =
    (userSelectedSpeed ?? (propCurrentSpeed as PlaybackSpeed)) || 1.0;
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(initialDrawerOpen);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);

  // Controlled vs uncontrolled determination
  const isPlaying =
    propIsPlaying !== undefined ? propIsPlaying : internalPlaying;
  const isPaused = propIsPaused !== undefined ? propIsPaused : internalPaused;

  const totalDurationMs = briefing.totalDurationMs || 1;

  // Active chapter computation
  const activeChapterIndex = useMemo(() => {
    if (!briefing.chapters || briefing.chapters.length === 0) return 0;
    const effectiveControlled =
      controlledChapterIdx !== undefined
        ? controlledChapterIdx
        : propCurrentChunk;
    if (
      effectiveControlled !== undefined &&
      briefing.chapters[effectiveControlled]
    ) {
      return effectiveControlled;
    }
    const foundIdx = briefing.chapters.findIndex(
      (c) => currentTimeMs >= c.startTimeMs && currentTimeMs < c.endTimeMs,
    );
    if (foundIdx !== -1) return foundIdx;
    if (
      currentTimeMs >= briefing.chapters[briefing.chapters.length - 1].endTimeMs
    ) {
      return briefing.chapters.length - 1;
    }
    return 0;
  }, [
    briefing.chapters,
    controlledChapterIdx,
    propCurrentChunk,
    currentTimeMs,
  ]);

  const activeChapter =
    briefing.chapters[activeChapterIndex] || briefing.chapters[0];

  // Speech synthesis utterance reference
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stop / cleanup all playback
  const stopPlayback = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      typeof SpeechSynthesisUtterance !== "undefined"
    ) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    utteranceRef.current = null;
    setInternalPlaying(false);
    setInternalPaused(false);
  }, []);

  // Browser speech synthesis feature detection
  const isSpeechSupported =
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof SpeechSynthesisUtterance !== "undefined";

  // Start speech or simulated playback for a specific timestamp
  const playFromTimestampRef = useRef<
    (targetMs: number, speed: number) => void
  >(() => {});

  const playFromTimestamp = useCallback(
    (targetMs: number, speed: number) => {
      stopPlayback();
      const clampedMs = Math.max(0, Math.min(targetMs, totalDurationMs));
      setCurrentTimeMs(clampedMs);
      setInternalPlaying(true);
      setInternalPaused(false);

      if (isSpeechSupported) {
        // Speak current chapter
        const targetChapter =
          briefing.chapters.find(
            (c) => clampedMs >= c.startTimeMs && clampedMs < c.endTimeMs,
          ) || briefing.chapters[0];

        if (targetChapter) {
          try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(targetChapter.text);
            utterance.rate = speed;
            utterance.onend = () => {
              // Advance to next chapter if available
              const nextIdx = targetChapter.chapterIndex; // 1-based index is next 0-based
              if (nextIdx < briefing.chapters.length) {
                const nextChapter = briefing.chapters[nextIdx];
                sound.playCheck();
                onChapterChange?.(nextIdx);
                playFromTimestampRef.current(nextChapter.startTimeMs, speed);
              } else {
                sound.playSuccess();
                stopPlayback();
                setCurrentTimeMs(totalDurationMs);
              }
            };
            utterance.onerror = (e) => {
              if (e.error !== "canceled" && e.error !== "interrupted") {
                stopPlayback();
              }
            };
            utteranceRef.current = utterance;
            window.speechSynthesis.speak(utterance);
          } catch {
            // Speech synthesis failed; fallback will be used
          }
        }
      }

      // Interval timer to drive scrubber position smoothly
      const tickIntervalMs = 100;
      let lastTapSecond = Math.floor(clampedMs / 1000);

      timerRef.current = setInterval(() => {
        setCurrentTimeMs((prev) => {
          const next = prev + tickIntervalMs * speed;
          if (next >= totalDurationMs) {
            stopPlayback();
            sound.playSuccess();
            return totalDurationMs;
          }

          // Non-speech haptic ticks at chapter boundaries
          if (!isSpeechSupported) {
            const currentSecond = Math.floor(next / 1000);
            if (currentSecond !== lastTapSecond) {
              lastTapSecond = currentSecond;
              const currentChap = briefing.chapters.find(
                (c) => prev < c.startTimeMs && next >= c.startTimeMs,
              );
              if (currentChap) {
                sound.playCheck();
                onChapterChange?.(currentChap.chapterIndex - 1);
              }
            }
          }

          return next;
        });
      }, tickIntervalMs);
    },
    [
      briefing.chapters,
      isSpeechSupported,
      onChapterChange,
      stopPlayback,
      totalDurationMs,
    ],
  );

  useEffect(() => {
    playFromTimestampRef.current = playFromTimestamp;
  }, [playFromTimestamp]);

  // Play / Pause toggle
  const handleTogglePlayPause = () => {
    sound.playTap();
    if (propOnPlayPause) {
      propOnPlayPause();
      return;
    }

    if (isPlaying && !isPaused) {
      // Pause
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (isSpeechSupported) {
        try {
          window.speechSynthesis.pause();
        } catch {}
      }
      setInternalPaused(true);
    } else if (isPlaying && isPaused) {
      // Resume
      if (isSpeechSupported && window.speechSynthesis.paused) {
        try {
          window.speechSynthesis.resume();
        } catch {}
      }
      playFromTimestamp(currentTimeMs, playbackRate);
    } else {
      // Start from beginning or current time
      const startMs = currentTimeMs >= totalDurationMs ? 0 : currentTimeMs;
      playFromTimestamp(startMs, playbackRate);
    }
  };

  // Stop button
  const handleStop = () => {
    sound.playTap();
    stopPlayback();
    setCurrentTimeMs(0);
    if (propOnStop) {
      propOnStop();
    }
    if (onClose) {
      onClose();
    }
  };

  // Speed multiplier cycle
  const handleCycleSpeed = () => {
    sound.playTap();
    const nextSpeed = getNextPlaybackSpeed(playbackRate);
    setUserSelectedSpeed(nextSpeed);
    if (propOnSpeedChange) {
      propOnSpeedChange(nextSpeed);
    }
    if (isPlaying && !isPaused) {
      playFromTimestamp(currentTimeMs, nextSpeed);
    }
  };

  // Scrubber seek
  const handleSeek = (newTimeMs: number) => {
    sound.playTap();
    setCurrentTimeMs(newTimeMs);
    if (isPlaying && !isPaused) {
      playFromTimestamp(newTimeMs, playbackRate);
    }
  };

  // Chapter jump
  const handleJumpChapter = (direction: "prev" | "next") => {
    sound.playTap();
    if (!briefing.chapters || briefing.chapters.length === 0) return;

    if (direction === "prev") {
      if (activeChapterIndex > 0) {
        const prevChapter = briefing.chapters[activeChapterIndex - 1];
        handleSeek(prevChapter.startTimeMs);
        onChapterChange?.(activeChapterIndex - 1);
      } else {
        handleSeek(0);
      }
    } else {
      if (activeChapterIndex < briefing.chapters.length - 1) {
        const nextChapter = briefing.chapters[activeChapterIndex + 1];
        handleSeek(nextChapter.startTimeMs);
        onChapterChange?.(activeChapterIndex + 1);
      }
    }
  };

  // 1-Click CSV Export
  const handleDownloadCsv = () => {
    sound.playSuccess();
    const csvContent = audioBriefingToCsv(briefing);
    const slug = (briefing.title || "audio-briefing")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    downloadFile(
      `${slug}-transcript.csv`,
      csvContent,
      "text/csv;charset=utf-8;",
    );
  };

  // 1-Click WebVTT Subtitle Export
  const handleDownloadVtt = () => {
    sound.playSuccess();
    const vttContent = audioBriefingToVtt(briefing);
    const slug = (briefing.title || "audio-briefing")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    downloadFile(
      `${slug}-subtitles.vtt`,
      vttContent,
      "text/vtt;charset=utf-8;",
    );
  };

  // 1-Click Markdown Copy
  const handleCopyMarkdown = () => {
    sound.playSuccess();
    const mdContent = audioBriefingToMarkdown(briefing);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(mdContent).catch(() => {});
    }
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  // Progress percentage
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((currentTimeMs / totalDurationMs) * 100)),
  );

  // Minimized Compact Pill Mode
  if (isMinimized) {
    return (
      <div
        role="region"
        aria-label="Audio Overview Player (Minimized)"
        data-testid="audio-briefing-bar-minimized"
        className={`fixed bottom-4 right-4 sm:right-8 z-50 flex items-center gap-3 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-xl border border-indigo-500/30 rounded-full px-4 py-2.5 shadow-2xl shadow-indigo-950/50 text-slate-100 ${className}`}
      >
        <button
          type="button"
          onClick={handleTogglePlayPause}
          className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition shadow-md shadow-indigo-600/30 cursor-pointer"
          title={isPlaying && !isPaused ? "Pause" : "Play"}
          aria-label={isPlaying && !isPaused ? "Pause" : "Play"}
        >
          {isPlaying && !isPaused ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        <div className="flex flex-col min-w-0 max-w-[140px] sm:max-w-[200px]">
          <span className="text-xs font-semibold text-slate-200 truncate">
            {briefing.title}
          </span>
          <span className="text-[10px] font-mono text-indigo-300">
            {formatDurationTimestamp(currentTimeMs)} /{" "}
            {formatDurationTimestamp(totalDurationMs)} ({progressPercent}%)
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            sound.playTap();
            setIsMinimized(false);
          }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          title="Expand player"
          aria-label="Expand player"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={handleStop}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
          title="Close player"
          aria-label="Close audio briefing"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Audio Overview Player"
      data-testid="audio-briefing-bar"
      className={`fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-4xl bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-2xl border border-indigo-500/30 rounded-2xl shadow-2xl shadow-indigo-950/60 text-slate-100 transition-all duration-300 ${className}`}
    >
      {/* Slide-up Chapter & Transcript Drawer */}
      {isDrawerOpen && (
        <div
          data-testid="chapter-drawer"
          className="border-b border-indigo-500/20 max-h-80 overflow-y-auto p-4 sm:p-5 space-y-3 bg-slate-950/80 rounded-t-2xl animate-in slide-in-from-bottom-2 duration-200"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ListMusic className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-slate-200">
                {`Briefing Chapters & Transcript (${briefing.chapters.length})`}
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span>{`${briefing.totalWordCount} words`}</span>
              <span>•</span>
              <span>{formatDurationTimestamp(totalDurationMs)}</span>
            </div>
          </div>

          <div className="space-y-2">
            {briefing.chapters.map((chapter, idx) => {
              const isActive = idx === activeChapterIndex;
              return (
                <div
                  key={chapter.id || idx}
                  data-testid={`drawer-chapter-${chapter.chapterIndex}`}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isActive
                      ? "bg-indigo-950/60 border-indigo-500/60 shadow-lg shadow-indigo-950/40 text-slate-100"
                      : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700 text-slate-300"
                  }`}
                  onClick={() => handleSeek(chapter.startTimeMs)}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                          isActive
                            ? "bg-indigo-500/30 text-indigo-200 border border-indigo-500/40"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {`Chapter ${chapter.chapterIndex}`}
                      </span>
                      <h4 className="text-xs sm:text-sm font-semibold text-slate-100">
                        {chapter.title}
                      </h4>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 font-medium inline-flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-violet-400" />
                        {chapter.speaker}
                      </span>
                    </div>

                    <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
                      {formatDurationTimestamp(chapter.startTimeMs)} -{" "}
                      {formatDurationTimestamp(chapter.endTimeMs)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300/90 leading-relaxed line-clamp-2 mb-2 font-sans">
                    {chapter.text}
                  </p>

                  {chapter.keyTakeaways && chapter.keyTakeaways.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {chapter.keyTakeaways.map((takeaway, tIdx) => (
                        <span
                          key={tIdx}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800/90 text-slate-300 border border-slate-700/60 flex items-center gap-1"
                        >
                          <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                          {takeaway}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Player Bar Body */}
      <div className="p-3 sm:p-4 space-y-3">
        {/* Top Meta Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
              <Volume2 className="w-4 h-4" />
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-slate-100 truncate">
                  {briefing.title}
                </span>
                {activeChapter && (
                  <span className="hidden md:inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 truncate">
                    Ch {activeChapter.chapterIndex}: {activeChapter.title} (
                    {activeChapter.speaker})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Top Right Action Tools */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
            {/* Drawer Toggle */}
            <button
              type="button"
              data-testid="drawer-toggle-btn"
              onClick={() => {
                sound.playTap();
                setIsDrawerOpen(!isDrawerOpen);
              }}
              className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg border transition cursor-pointer ${
                isDrawerOpen
                  ? "bg-indigo-500/20 text-indigo-200 border-indigo-500/40"
                  : "bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-800"
              }`}
              title="Toggle chapter transcript drawer"
              aria-label="Toggle chapter transcript drawer"
            >
              <ListMusic className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Chapters</span>
              {isDrawerOpen ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronUp className="w-3 h-3" />
              )}
            </button>

            {/* CSV Export */}
            <button
              type="button"
              data-testid="export-csv-btn"
              onClick={handleDownloadCsv}
              className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-700 transition cursor-pointer"
              title="Download RFC 4180 CSV transcript"
              aria-label="Download CSV transcript"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {/* WebVTT Subtitle Export */}
            <button
              type="button"
              data-testid="export-vtt-btn"
              onClick={handleDownloadVtt}
              className="hidden sm:flex p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-700 transition cursor-pointer"
              title="Download WebVTT subtitle track (.vtt)"
              aria-label="Download WebVTT subtitles"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>

            {/* Markdown Copy */}
            <button
              type="button"
              data-testid="copy-markdown-btn"
              onClick={handleCopyMarkdown}
              className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-700 transition cursor-pointer"
              title="Copy Markdown briefing dossier"
              aria-label="Copy Markdown briefing"
            >
              {copyFeedback ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Minimize */}
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                setIsMinimized(true);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
              title="Minimize player"
              aria-label="Minimize player"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={handleStop}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
              title="Close briefing"
              aria-label="Close audio briefing"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* SVG Audio Waveform Visualizer */}
        <div
          data-testid="waveform-visualizer"
          className="relative w-full h-9 bg-slate-950/60 rounded-xl px-2 flex items-center border border-slate-800/80 cursor-pointer overflow-hidden"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const ratio = Math.max(0, Math.min(1, clickX / rect.width));
            handleSeek(Math.round(ratio * totalDurationMs));
          }}
          title="Click to seek on waveform"
        >
          <svg
            className="w-full h-full"
            preserveAspectRatio="none"
            viewBox="0 0 400 36"
            aria-hidden="true"
          >
            <defs>
              <linearGradient
                id="activeWaveGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>

            {briefing.waveform.map((bar, i) => {
              const barCount = briefing.waveform.length || 48;
              const barWidth = Math.max(2, 400 / barCount - 2);
              const x = i * (400 / barCount) + 1;
              const height = (bar.heightPct / 100) * 30;
              const y = 33 - height;

              const barTimeMs = (i / barCount) * totalDurationMs;
              const isPlayed = currentTimeMs >= barTimeMs;

              // Subtle height pulsation when active & playing
              const isPulsing = isPlaying && !isPaused && isPlayed;

              return (
                <rect
                  key={bar.index ?? i}
                  data-testid="waveform-bar"
                  x={x}
                  y={y}
                  width={barWidth}
                  height={height}
                  rx={2}
                  ry={2}
                  fill={isPlayed ? "url(#activeWaveGradient)" : "#475569"}
                  opacity={isPlayed ? 0.95 : 0.35}
                  className={`transition-all duration-150 ${
                    isPulsing ? "animate-pulse" : ""
                  }`}
                />
              );
            })}
          </svg>

          {/* Scrubber Playhead Line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)] pointer-events-none transition-all duration-100"
            style={{ left: `${progressPercent}%` }}
          />
        </div>

        {/* Scrub Slider Input */}
        <div className="space-y-1">
          <input
            type="range"
            data-testid="timeline-scrubber"
            min={0}
            max={totalDurationMs}
            value={currentTimeMs}
            onChange={(e) => handleSeek(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            aria-label="Seek briefing timeline"
          />

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>
              {activeChapter
                ? `Ch ${activeChapter.chapterIndex} of ${briefing.chapters.length}`
                : `Progress ${progressPercent}%`}
            </span>
            <span data-testid="time-display">
              {formatDurationTimestamp(currentTimeMs)} /{" "}
              {formatDurationTimestamp(totalDurationMs)}
            </span>
          </div>
        </div>

        {/* Controls Row: Skip Prev, Play/Pause, Skip Next, Stop, Speed Multiplier */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Skip Previous Chapter */}
            <button
              type="button"
              data-testid="skip-prev-btn"
              onClick={() => handleJumpChapter("prev")}
              disabled={activeChapterIndex === 0 && currentTimeMs === 0}
              className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700/60 transition cursor-pointer"
              title="Previous chapter"
              aria-label="Previous chapter"
            >
              <SkipBack className="w-3.5 h-3.5 fill-current" />
            </button>

            {/* Play / Pause Toggle */}
            <button
              type="button"
              data-testid="play-pause-btn"
              onClick={handleTogglePlayPause}
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/40 transition cursor-pointer"
              title={
                isPlaying && !isPaused ? "Pause briefing" : "Play briefing"
              }
              aria-label={
                isPlaying && !isPaused ? "Pause briefing" : "Play briefing"
              }
            >
              {isPlaying && !isPaused ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            {/* Skip Next Chapter */}
            <button
              type="button"
              data-testid="skip-next-btn"
              onClick={() => handleJumpChapter("next")}
              disabled={activeChapterIndex >= briefing.chapters.length - 1}
              className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700/60 transition cursor-pointer"
              title="Next chapter"
              aria-label="Next chapter"
            >
              <SkipForward className="w-3.5 h-3.5 fill-current" />
            </button>

            {/* Stop Button */}
            <button
              type="button"
              data-testid="stop-btn"
              onClick={handleStop}
              className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700/60 hover:border-rose-500/30 transition cursor-pointer"
              title="Stop briefing"
              aria-label="Stop briefing"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          </div>

          {/* Speed Multiplier Cycling Button */}
          <div className="flex items-center gap-1.5">
            <span className="hidden sm:inline text-[11px] font-sans text-slate-400">
              Speed:
            </span>
            <button
              type="button"
              data-testid="speed-multiplier-btn"
              onClick={handleCycleSpeed}
              className="px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-mono font-semibold transition cursor-pointer"
              title="Cycle playback speed (1.0x -> 1.25x -> 1.5x -> 2.0x)"
              aria-label={`Playback speed ${playbackRate.toFixed(1)}x`}
            >
              {playbackRate.toFixed(1)}x
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
