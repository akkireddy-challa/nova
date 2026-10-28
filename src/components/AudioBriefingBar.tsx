"use client";

import React from "react";
import { Play, Pause, Square, X, Volume2 } from "lucide-react";

interface AudioBriefingBarProps {
  isPlaying: boolean;
  isPaused: boolean;
  currentChunk: number;
  totalChunks: number;
  currentSpeed: number;
  onPlayPause: () => void;
  onStop: () => void;
  onSpeedChange: (speed: number) => void;
  title?: string;
}

export function AudioBriefingBar({
  isPlaying,
  isPaused,
  currentChunk,
  totalChunks,
  currentSpeed,
  onPlayPause,
  onStop,
  onSpeedChange,
  title = "Audio Overview Briefing",
}: AudioBriefingBarProps) {
  const speeds = [1, 1.25, 1.5];
  const currentNum = Math.min(currentChunk + 1, totalChunks);
  const progressPercent =
    totalChunks > 0 ? Math.round((currentNum / totalChunks) * 100) : 0;

  return (
    <div
      role="region"
      aria-label="Audio Overview Player"
      className="fixed bottom-24 right-4 sm:right-8 z-40 w-[calc(100%-2rem)] sm:w-96 bg-slate-900/95 backdrop-blur-md border border-teal-500/30 rounded-2xl p-3.5 shadow-2xl shadow-teal-950/40 text-slate-100 animate-in slide-in-from-bottom-4 duration-200"
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 flex-shrink-0">
            <Volume2 className="w-3.5 h-3.5" />
          </div>

          {/* Soundwave equalizer indicator */}
          <div
            className="flex items-center gap-0.5 h-3 px-1"
            aria-hidden="true"
          >
            <span
              className={`w-0.5 rounded-full bg-teal-400 transition-all ${
                isPlaying && !isPaused
                  ? "animate-[pulse_0.6s_ease-in-out_infinite] h-3"
                  : "h-1 bg-slate-600"
              }`}
            />
            <span
              className={`w-0.5 rounded-full bg-teal-400 transition-all ${
                isPlaying && !isPaused
                  ? "animate-[pulse_0.8s_ease-in-out_infinite_150ms] h-4"
                  : "h-2 bg-slate-600"
              }`}
            />
            <span
              className={`w-0.5 rounded-full bg-teal-400 transition-all ${
                isPlaying && !isPaused
                  ? "animate-[pulse_0.5s_ease-in-out_infinite_300ms] h-2.5"
                  : "h-1 bg-slate-600"
              }`}
            />
            <span
              className={`w-0.5 rounded-full bg-teal-400 transition-all ${
                isPlaying && !isPaused
                  ? "animate-[pulse_0.7s_ease-in-out_infinite_75ms] h-3.5"
                  : "h-2 bg-slate-600"
              }`}
            />
          </div>

          <span className="text-xs font-semibold text-slate-200 truncate font-sans">
            {title}
          </span>
        </div>

        <button
          type="button"
          onClick={onStop}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          title="Close briefing"
          aria-label="Close audio briefing"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1 mb-2.5">
        <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-teal-500 to-cyan-400 h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10.5px] font-mono text-slate-400">
          <span>
            {isPaused
              ? "Paused"
              : `Section ${currentNum} of ${totalChunks || 1}`}
          </span>
          <span>{progressPercent}%</span>
        </div>
      </div>

      {/* Controls: Play/Pause, Stop, and Speed Pills */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onPlayPause}
            className="flex items-center justify-center w-7 h-7 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 transition cursor-pointer"
            title={isPaused ? "Resume briefing" : "Pause briefing"}
            aria-label={isPaused ? "Resume briefing" : "Pause briefing"}
          >
            {isPaused ? (
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            ) : (
              <Pause className="w-3.5 h-3.5 fill-current" />
            )}
          </button>

          <button
            type="button"
            onClick={onStop}
            className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-800/60 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-800 hover:border-rose-500/30 transition cursor-pointer"
            title="Stop briefing"
            aria-label="Stop briefing"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>

        {/* Speed Pill Selector */}
        <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10.5px] font-mono">
          {speeds.map((s) => {
            const isSelected = currentSpeed === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => onSpeedChange(s)}
                className={`px-2 py-0.5 rounded transition cursor-pointer ${
                  isSelected
                    ? "bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/30"
                    : "text-slate-400 hover:text-slate-200 border border-transparent"
                }`}
                aria-pressed={isSelected}
              >
                {s}x
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
