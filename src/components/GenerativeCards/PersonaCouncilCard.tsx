"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Shield,
  TrendingUp,
  Cpu,
  GraduationCap,
  DollarSign,
  Sparkles,
  Download,
  Copy,
  Check,
  ChevronRight,
  UserCheck,
  ShieldAlert,
  Award,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import type {
  PersonaCouncilArtifact,
  PersonaReview,
  CouncilVerdict,
} from "@/lib/types";
import {
  personaCouncilToCsv,
  personaCouncilToMarkdown,
} from "@/lib/research/persona-studio";
import { downloadCsvData } from "@/lib/matrix-calculator";
import { sound } from "@/lib/sound";

interface Props {
  council: PersonaCouncilArtifact;
  onSelectPersona?: (personaId: string) => void;
  onApplyAction?: (action: string) => void;
}

// Icon dictionary for rendering council specialist avatars
function renderPersonaIcon(iconName: string, className = "w-4 h-4") {
  switch (iconName.toLowerCase()) {
    case "cpu":
      return <Cpu className={className} />;
    case "trendingup":
    case "trending-up":
      return <TrendingUp className={className} />;
    case "graduationcap":
    case "graduation-cap":
      return <GraduationCap className={className} />;
    case "dollarsign":
    case "dollar-sign":
      return <DollarSign className={className} />;
    case "shield":
    case "shieldalert":
    case "shield-alert":
      return <Shield className={className} />;
    default:
      return <UserCheck className={className} />;
  }
}

// Verdict banner color styles
function getVerdictBadge(verdict: CouncilVerdict): {
  label: string;
  badgeClass: string;
  borderClass: string;
  description: string;
} {
  switch (verdict) {
    case "unanimous_approval":
      return {
        label: "Unanimous Council Approval",
        badgeClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
        borderClass: "border-emerald-500/30",
        description:
          "All specialist council personas have verified and approved the architectural proposal.",
      };
    case "conditional_consensus":
      return {
        label: "Conditional Council Consensus",
        badgeClass: "bg-teal-500/10 text-teal-300 border-teal-500/30",
        borderClass: "border-teal-500/30",
        description:
          "Majority approval achieved subject to the non-negotiable risk mitigations below.",
      };
    case "divided_council":
      return {
        label: "Divided Council Deliberation",
        badgeClass: "bg-amber-500/10 text-amber-300 border-amber-500/30",
        borderClass: "border-amber-500/30",
        description:
          "Significant variance across architectural, security, or financial dimensions requires executive arbitration.",
      };
    case "rejected_high_risk":
      return {
        label: "Council Veto / High Risk",
        badgeClass: "bg-rose-500/10 text-rose-300 border-rose-500/30",
        borderClass: "border-rose-500/30",
        description:
          "Critical veto flags raised. Proposal must be re-architected before rollout.",
      };
  }
}

// Grade tag coloring
function getGradeColor(grade: string): string {
  switch (grade) {
    case "A+":
    case "A":
      return "text-emerald-400 bg-emerald-950/60 border-emerald-500/30";
    case "B":
      return "text-teal-400 bg-teal-950/60 border-teal-500/30";
    case "C":
      return "text-amber-400 bg-amber-950/60 border-amber-500/30";
    case "D":
    case "F":
      return "text-rose-400 bg-rose-950/60 border-rose-500/30";
    default:
      return "text-slate-400 bg-slate-900 border-slate-700";
  }
}

// Verdict tag styling
function getReviewVerdictTag(verdict: PersonaReview["verdict"]) {
  switch (verdict) {
    case "approve":
      return {
        label: "Approved",
        cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      };
    case "conditional":
      return {
        label: "Conditional",
        cls: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      };
    case "veto":
      return {
        label: "Vetoed",
        cls: "text-rose-400 bg-rose-500/10 border-rose-500/20",
      };
  }
}

export function PersonaCouncilCard({
  council,
  onSelectPersona,
  onApplyAction,
}: Props) {
  const [selectedPersonaId, setSelectedPersonaId] =
    useState<string>("overview");
  const [completedActions, setCompletedActions] = useState<Set<number>>(
    new Set(),
  );
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const verdictMeta = getVerdictBadge(council.councilVerdict);

  // SVG Gauge calculations
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (council.alignmentIndex / 100) * circumference;

  const gaugeColor =
    council.alignmentIndex >= 75
      ? "#10b981" // emerald
      : council.alignmentIndex >= 50
        ? "#f59e0b" // amber
        : "#f43f5e"; // rose

  const handleCopyMarkdown = () => {
    try {
      const md = personaCouncilToMarkdown(council);
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
      const csv = personaCouncilToCsv(council);
      const safeTopic = (council.topic || "council")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 32);
      downloadCsvData(csv, `nova-council-${safeTopic}.csv`);
      setDownloaded(true);
      sound.playSuccess();
      setTimeout(() => setDownloaded(false), 2000);
    } catch (err) {
      console.warn("Failed to download CSV:", err);
    }
  };

  const toggleAction = (idx: number) => {
    sound.playCheck();
    setCompletedActions((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const activeReview = council.reviews.find(
    (r) => r.personaId === selectedPersonaId,
  );

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
      {/* 1. Header Banner & Council Verdict */}
      <div className="p-5 md:p-6 border-b border-slate-800/80 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/20">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium tracking-wide uppercase bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 flex items-center gap-1.5">
                <UserCheck className="w-3 h-3" />
                Executive Council Review
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${verdictMeta.badgeClass}`}
              >
                {verdictMeta.label}
              </span>
            </div>
            <h3 className="text-lg md:text-xl font-bold text-slate-100 tracking-tight leading-snug">
              {council.topic}
            </h3>
            <p className="text-xs md:text-sm text-slate-400 mt-1 line-clamp-2">
              {council.verdictSummary || verdictMeta.description}
            </p>
          </div>

          {/* Alignment Index Circular Gauge & Actions */}
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
                    {`${council.alignmentIndex}%`}
                  </span>
                  <span className="text-[9px] font-mono uppercase text-slate-400 tracking-tight mt-0.5">
                    Align
                  </span>
                </div>
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold text-slate-300">
                  Council Index
                </div>
                <div className="text-[11px] text-slate-500">
                  {`Mean: ${council.meanScore}/100`}
                </div>
              </div>
            </div>

            {/* Quick Export Actions */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleDownloadCsv}
                title="Download RFC 4180 CSV"
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
                title="Copy Executive Markdown Briefing"
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

      {/* 2. Council Persona Selector Tabs */}
      <div className="px-5 md:px-6 pt-4 pb-2 border-b border-slate-800/60 bg-slate-950/40 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 min-w-max">
          <button
            onClick={() => {
              sound.playTap();
              setSelectedPersonaId("overview");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2 transition-all border ${
              selectedPersonaId === "overview"
                ? "bg-indigo-600/20 text-indigo-200 border-indigo-500/40 shadow-sm"
                : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Council Overview</span>
          </button>

          {council.reviews.map((rev) => {
            const isSelected = selectedPersonaId === rev.personaId;
            return (
              <button
                key={rev.personaId}
                onClick={() => {
                  sound.playTap();
                  setSelectedPersonaId(rev.personaId);
                  onSelectPersona?.(rev.personaId);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2 transition-all border ${
                  isSelected
                    ? "bg-slate-800 text-slate-100 border-indigo-500/50 shadow-sm"
                    : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                <span className="text-slate-300">
                  {renderPersonaIcon(rev.avatarIcon, "w-3.5 h-3.5")}
                </span>
                <span className="font-medium">{rev.personaName}</span>
                <span
                  className={`px-1.5 py-0.2 rounded font-mono text-[10px] font-semibold border ${getGradeColor(
                    rev.grade,
                  )}`}
                >
                  {rev.grade}
                </span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    rev.verdict === "approve"
                      ? "bg-emerald-400"
                      : rev.verdict === "conditional"
                        ? "bg-amber-400"
                        : "bg-rose-400"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Main Content View */}
      <div className="p-5 md:p-6 space-y-6">
        {selectedPersonaId === "overview" ? (
          /* --- A: COUNCIL OVERVIEW VIEW --- */
          <div className="space-y-6">
            {/* Reviews Matrix Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {council.reviews.map((rev) => {
                const verdictTag = getReviewVerdictTag(rev.verdict);
                return (
                  <div
                    key={rev.personaId}
                    onClick={() => {
                      sound.playTap();
                      setSelectedPersonaId(rev.personaId);
                    }}
                    className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/90 hover:border-slate-700 transition cursor-pointer flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-slate-800/80 text-slate-300">
                            {renderPersonaIcon(rev.avatarIcon, "w-4 h-4")}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                              {rev.personaName}
                            </div>
                            <div className="text-[10px] text-slate-400 line-clamp-1">
                              {rev.roleTitle}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-md font-mono text-xs font-bold border ${getGradeColor(
                            rev.grade,
                          )}`}
                        >
                          {rev.grade} ({rev.score})
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 line-clamp-2 my-2 italic">
                        &ldquo;{rev.coreEndorsement}&rdquo;
                      </p>

                      {rev.criticalObjections.length > 0 && (
                        <div className="text-[11px] text-rose-400/90 flex items-start gap-1 mt-2 line-clamp-1">
                          <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                          <span>{rev.criticalObjections[0]}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800/50 text-[11px]">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium border ${verdictTag.cls}`}
                      >
                        {verdictTag.label}
                      </span>
                      <span className="text-slate-500 group-hover:text-slate-300 flex items-center gap-0.5">
                        Inspect <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Fatal Blindspots & Red-Team Risks */}
            {council.fatalBlindspots && council.fatalBlindspots.length > 0 && (
              <div className="p-4 md:p-5 rounded-xl bg-rose-950/20 border border-rose-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <h4 className="text-sm font-semibold text-rose-200">
                    {`Council Fatal Blindspots & Risks (${council.fatalBlindspots.length})`}
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {council.fatalBlindspots.map((blind, bIdx) => (
                    <div
                      key={bIdx}
                      className="p-3 rounded-lg bg-slate-900/80 border border-rose-500/20 text-xs"
                    >
                      <div className="flex items-center justify-between text-[11px] font-semibold text-rose-300 mb-1">
                        <span>{blind.dimension}</span>
                        <span className="text-slate-400 font-normal">
                          Flagged by {blind.flaggedBy}
                        </span>
                      </div>
                      <div className="text-slate-300 mb-2">{blind.risk}</div>
                      <div className="text-emerald-400/90 text-[11px] flex items-start gap-1.5 bg-emerald-950/30 p-2 rounded border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
                        <span>
                          <strong className="text-emerald-300">
                            Mitigation:
                          </strong>{" "}
                          {blind.mitigation}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strategic Compromise Blueprint */}
            {council.strategicCompromise && (
              <div className="p-4 md:p-5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center gap-2 mb-2 text-indigo-300">
                  <Sparkles className="w-4 h-4" />
                  <h4 className="text-sm font-semibold text-slate-200">
                    Unified Strategic Compromise Blueprint
                  </h4>
                </div>
                <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                  {council.strategicCompromise}
                </p>
              </div>
            )}

            {/* Action Items Checklist */}
            {council.actionItems && council.actionItems.length > 0 && (
              <div className="p-4 md:p-5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-sm font-semibold text-slate-200">
                      Council Action Items & Execution Gates
                    </h4>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    {`${completedActions.size} / ${council.actionItems.length} Signed Off`}
                  </span>
                </div>
                <div className="space-y-2">
                  {council.actionItems.map((item, idx) => {
                    const isDone = completedActions.has(idx);
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleAction(idx)}
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
                          <span>{item}</span>
                        </div>
                        {onApplyAction && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              sound.playCheck();
                              onApplyAction(item);
                            }}
                            className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5 shrink-0"
                          >
                            <span>Trigger</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : activeReview ? (
          /* --- B: INDIVIDUAL PERSONA SCORECARD VIEW --- */
          <div className="space-y-5">
            {/* Persona Header Card */}
            <div className="p-4 md:p-5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  {renderPersonaIcon(activeReview.avatarIcon, "w-6 h-6")}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-slate-100">
                      {activeReview.personaName}
                    </h4>
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-xs font-bold border ${getGradeColor(
                        activeReview.grade,
                      )}`}
                    >
                      Grade {activeReview.grade}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium border ${
                        getReviewVerdictTag(activeReview.verdict).cls
                      }`}
                    >
                      {getReviewVerdictTag(activeReview.verdict).label}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {activeReview.roleTitle}
                  </div>
                </div>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-slate-100">
                  {activeReview.score}
                </span>
                <span className="text-xs font-mono text-slate-400">/ 100</span>
              </div>
            </div>

            {/* Criteria Breakdown Progress Bars */}
            {activeReview.criteriaScores &&
              activeReview.criteriaScores.length > 0 && (
                <div className="p-4 md:p-5 rounded-xl bg-slate-950/50 border border-slate-800 space-y-3">
                  <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                    Specialist Criteria Breakdown
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {activeReview.criteriaScores.map((c, cIdx) => (
                      <div key={cIdx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300 font-medium">
                            {c.criterion}
                          </span>
                          <span className="font-mono text-slate-400">
                            {c.score}% (wt: {c.weight})
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              c.score >= 80
                                ? "bg-emerald-500"
                                : c.score >= 60
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                            }`}
                            style={{
                              width: `${Math.max(4, Math.min(100, c.score))}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Core Endorsement Highlight */}
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
              <div className="flex items-center gap-2 mb-1.5 text-emerald-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Specialist Endorsement</span>
              </div>
              <p className="text-xs md:text-sm text-slate-200 italic leading-relaxed">
                &ldquo;{activeReview.coreEndorsement}&rdquo;
              </p>
            </div>

            {/* Critical Objections / Veto Risks */}
            {activeReview.criticalObjections &&
              activeReview.criticalObjections.length > 0 && (
                <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-rose-300 text-xs font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>
                      Critical Objections & Risks (
                      {activeReview.criticalObjections.length})
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {activeReview.criticalObjections.map((obj, oIdx) => (
                      <li key={oIdx} className="flex items-start gap-2">
                        <span className="text-rose-400 font-bold">•</span>
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {/* Non-Negotiable Requirements */}
            {activeReview.nonNegotiables &&
              activeReview.nonNegotiables.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-cyan-300 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      Mandatory Non-Negotiables (
                      {activeReview.nonNegotiables.length})
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {activeReview.nonNegotiables.map((req, rIdx) => (
                      <li key={rIdx} className="flex items-start gap-2">
                        <span className="text-cyan-400 font-bold">✓</span>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
