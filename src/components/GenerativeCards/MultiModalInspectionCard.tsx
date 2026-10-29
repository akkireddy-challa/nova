"use client";

import React, { useState, useMemo } from "react";
import {
  Eye,
  Camera,
  Layers,
  Sparkles,
  Download,
  Copy,
  Check,
  Clock,
  Target,
  FileCheck,
} from "lucide-react";
import type {
  MultiModalInspectionArtifact,
  SpatialBoundingBox,
} from "@/lib/types";
import {
  multiModalInspectionToCsv,
  multiModalInspectionToMarkdown,
  normalizeCoordinates,
} from "@/lib/multimodal/frame-inspector";
import { downloadCsvData } from "@/lib/matrix-calculator";
import { sound } from "@/lib/sound";

interface MultiModalInspectionCardProps {
  artifact: MultiModalInspectionArtifact;
}

export function MultiModalInspectionCard({
  artifact,
}: MultiModalInspectionCardProps) {
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(0);
  const [hoveredBoxId, setHoveredBoxId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const frames = useMemo(() => artifact.frames || [], [artifact.frames]);
  const activeFrame = frames[selectedFrameIndex] || frames[0];

  const statusBadgeStyle = useMemo(() => {
    switch (artifact.summary.auditStatus) {
      case "verified":
        return {
          bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
          dot: "bg-emerald-400",
          label: "Grounding Verified",
        };
      case "calibrated":
        return {
          bg: "bg-teal-500/10 border-teal-500/30 text-teal-400",
          dot: "bg-teal-400",
          label: "Calibrated",
        };
      case "occluded":
      default:
        return {
          bg: "bg-amber-500/10 border-amber-500/30 text-amber-400",
          dot: "bg-amber-400",
          label: "Partial Occlusion",
        };
    }
  }, [artifact.summary.auditStatus]);

  const handleCopyMarkdown = () => {
    const md = multiModalInspectionToMarkdown(artifact);
    navigator.clipboard.writeText(md);
    setCopied(true);
    sound.playPop();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCsv = () => {
    const csv = multiModalInspectionToCsv(artifact);
    const filename = `${artifact.id || "multimodal-inspection"}.csv`;
    downloadCsvData(csv, filename);
    sound.playSuccess();
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 shadow-2xl overflow-hidden backdrop-blur-md">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              <Eye className="w-3 h-3 text-cyan-400" />
              Multimodal Vision Inspector
            </span>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/50 uppercase">
              {artifact.summary.modalityType}
            </span>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/50 truncate max-w-[200px]">
              {artifact.mediaSource}
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-100 tracking-tight truncate">
            {artifact.topic}
          </h2>
        </div>

        {/* Audit Status Badge */}
        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-xs font-bold uppercase tracking-wider shrink-0 ${statusBadgeStyle.bg}`}
        >
          <span
            className={`w-2 h-2 rounded-full animate-pulse ${statusBadgeStyle.dot}`}
          />
          <span>{statusBadgeStyle.label}</span>
        </div>
      </div>

      {/* Metric Scorecard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-950/30 border-b border-slate-800/60">
        <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800/80">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-0.5">
            Grounding Index
          </div>
          <div className="text-lg font-bold font-mono text-cyan-400">
            {artifact.summary.visualGroundingIndex}%
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800/80">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-0.5">
            Keyframes
          </div>
          <div className="text-lg font-bold font-mono text-slate-200">
            {artifact.summary.totalFrames}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800/80">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-0.5">
            Spatial Regions
          </div>
          <div className="text-lg font-bold font-mono text-indigo-400">
            {artifact.summary.totalRegions}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800/80">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-0.5">
            Avg Confidence
          </div>
          <div className="text-lg font-bold font-mono text-emerald-400">
            {artifact.summary.averageConfidencePct}%
          </div>
        </div>
      </div>

      {/* Frame Timeline Stepper & Action Controls */}
      <div className="px-3 py-2 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-slate-400 ml-1" />
          <span className="text-[11px] font-mono font-semibold text-slate-400 mr-2">
            Keyframes:
          </span>
          {frames.map((f, idx) => {
            const isSelected = selectedFrameIndex === idx;
            const mins = Math.floor(f.timestampMs / 60000);
            const secs = Math.floor((f.timestampMs % 60000) / 1000);
            const timeStr = `${mins}:${secs.toString().padStart(2, "0")}`;
            return (
              <button
                key={f.frameIndex}
                type="button"
                onClick={() => {
                  setSelectedFrameIndex(idx);
                  sound.playTap();
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-colors flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold"
                    : "bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <span>Frame {idx + 1}</span>
                <span className="text-[10px] text-slate-500">[{timeStr}]</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopyMarkdown}
            title="Copy Markdown Report"
            className="p-1.5 rounded-md text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-cyan-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={handleDownloadCsv}
            title="Download RFC 4180 CSV"
            className="p-1.5 rounded-md text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 space-y-4">
        {/* Executive Summary */}
        {artifact.executiveSummary && (
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300 leading-relaxed font-sans">
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-cyan-400 mb-1 font-bold">
              <Sparkles className="w-3 h-3" />
              Inspection Executive Briefing
            </div>
            {artifact.executiveSummary}
          </div>
        )}

        {/* Spatial Bounding Canvas */}
        {activeFrame && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="font-semibold text-slate-200">
                {activeFrame.label}
              </span>
              <div className="flex items-center gap-3 text-[10px]">
                <span>
                  Saliency:{" "}
                  <strong className="text-cyan-400 font-bold">
                    {activeFrame.visualSaliencyPct}%
                  </strong>
                </span>
                <span>
                  Resolution: {activeFrame.width}x{activeFrame.height}
                </span>
              </div>
            </div>

            {/* Interactive Visual Overlay Frame */}
            <div className="relative aspect-video w-full rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-inner flex items-center justify-center">
              {/* Subtle grid pattern background */}
              <div
                className="absolute inset-0 opacity-15"
                style={{
                  backgroundImage:
                    "radial-gradient(#06b6d4 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              />

              {/* Center Wireframe / Media Placeholder */}
              <div className="text-center space-y-1 select-none pointer-events-none opacity-40">
                <Layers className="w-10 h-10 text-cyan-500 mx-auto" />
                <div className="text-xs font-mono text-slate-400 uppercase tracking-widest">
                  Keyframe Ingestion Stream
                </div>
              </div>

              {/* Render Bounding Boxes */}
              {activeFrame.regions.map((box: SpatialBoundingBox) => {
                const coords = normalizeCoordinates(box, 100, 100);
                const isHovered = hoveredBoxId === box.id;
                const strokeColor = box.colorHex || "#06b6d4";

                return (
                  <div
                    key={box.id}
                    onMouseEnter={() => {
                      setHoveredBoxId(box.id);
                      sound.playTap();
                    }}
                    onMouseLeave={() => setHoveredBoxId(null)}
                    style={{
                      left: `${coords.left}%`,
                      top: `${coords.top}%`,
                      width: `${coords.width}%`,
                      height: `${coords.height}%`,
                      borderColor: strokeColor,
                      backgroundColor: isHovered
                        ? `${strokeColor}22`
                        : `${strokeColor}0d`,
                    }}
                    className={`absolute rounded border-2 transition-all cursor-pointer ${
                      isHovered
                        ? "ring-2 ring-white/60 shadow-lg z-20"
                        : "hover:border-white z-10"
                    }`}
                  >
                    {/* Floating label pill */}
                    <div
                      style={{ backgroundColor: strokeColor }}
                      className="absolute -top-3 left-1 px-1.5 py-0.2 text-[9px] font-mono font-bold text-slate-950 rounded shadow-md truncate max-w-[90%] flex items-center gap-1"
                    >
                      <Target className="w-2.5 h-2.5" />
                      <span>{box.label}</span>
                      <span className="opacity-80">({box.confidencePct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Spatial Regions Pill List */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {activeFrame.regions.map((box) => {
                const isHovered = hoveredBoxId === box.id;
                return (
                  <button
                    key={box.id}
                    type="button"
                    onMouseEnter={() => setHoveredBoxId(box.id)}
                    onMouseLeave={() => setHoveredBoxId(null)}
                    className={`px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1.5 transition-colors border ${
                      isHovered
                        ? "bg-slate-800 text-white border-cyan-400 font-bold"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: box.colorHex || "#06b6d4" }}
                    />
                    <span>{box.label}</span>
                    <span className="text-slate-500">
                      [{box.confidencePct}%]
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Visual Citations Grounding Inspector */}
            {activeFrame.citations.length > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
                  Grounded Visual Citations ({activeFrame.citations.length})
                </div>
                <div className="space-y-2">
                  {activeFrame.citations.map((c) => {
                    const isLinkedHovered = hoveredBoxId === c.boxId;
                    return (
                      <div
                        key={c.citationId}
                        onMouseEnter={() => setHoveredBoxId(c.boxId)}
                        onMouseLeave={() => setHoveredBoxId(null)}
                        className={`p-2 rounded text-xs transition-colors border ${
                          isLinkedHovered
                            ? "bg-cyan-500/10 border-cyan-500/40 text-slate-100"
                            : "bg-slate-900/60 border-slate-800/80 text-slate-300"
                        }`}
                      >
                        <div className="font-semibold text-slate-200">
                          &ldquo;{c.claim}&rdquo;
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1">
                          <span className="text-cyan-400 font-bold">
                            Target Region: {c.boxId}
                          </span>
                          <span className="truncate max-w-[220px]">
                            Source: {c.verifiableSource}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Technical Notes Footer */}
        {artifact.technicalNotes && (
          <div className="text-[11px] font-mono text-slate-400 pt-1 flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>{artifact.technicalNotes}</span>
          </div>
        )}
      </div>
    </div>
  );
}
