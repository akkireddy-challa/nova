"use client";

import React, { useState, useMemo } from "react";
import {
  Scale,
  ShieldCheck,
  Flame,
  CheckCircle2,
  Trophy,
  Download,
  Copy,
  Check,
  AlertTriangle,
  Award,
  Layers,
  ChevronRight,
} from "lucide-react";
import { DebateArtifact } from "@/lib/types";
import {
  analyzeDialecticDebate,
  debateToCsv,
  debateToMarkdown,
  getPerspectivesByStance,
  IrreconcilableTradeoff,
} from "@/lib/research/dialectic-debate";
import { downloadCsvData } from "@/lib/matrix-calculator";
import { sound } from "@/lib/sound";

export interface DialecticDebateCardProps {
  debate: DebateArtifact;
  initialRound?: 1 | 2 | 3;
}

/** Formats the arbiter ruling winner string into presentation text */
function formatArbiterWinner(winner?: string): string {
  if (!winner) return "Balanced Compromise";
  switch (winner) {
    case "advocate_favored":
      return "Advocate Favored";
    case "critic_favored":
      return "Critic Favored";
    case "balanced_compromise":
      return "Balanced Compromise";
    default:
      return winner
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
  }
}

/** Severity badge styling and attributes for trade-offs */
function getSeverityBadge(
  severity: IrreconcilableTradeoff["severity"] | string,
) {
  const norm = severity?.toLowerCase() || "medium";
  if (norm === "high") {
    return {
      label: "High",
      className: "bg-rose-500/20 text-rose-300 border-rose-500/40",
      dotClass: "bg-rose-400",
    };
  }
  if (norm === "low") {
    return {
      label: "Low",
      className: "bg-slate-700/50 text-slate-300 border-slate-600/40",
      dotClass: "bg-slate-400",
    };
  }
  return {
    label: "Medium",
    className: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    dotClass: "bg-amber-400",
  };
}

/** Color progression styling for consensus gauge: rose (<40%), amber (40-70%), emerald (>70%) */
function getConsensusPalette(score: number) {
  if (score < 40) {
    return {
      stroke: "#f43f5e",
      textClass: "text-rose-400",
      badgeClass: "bg-rose-500/10 text-rose-300 border-rose-500/30",
      tierLabel: "Low Agreement (Divergent)",
    };
  }
  if (score <= 70) {
    return {
      stroke: "#f59e0b",
      textClass: "text-amber-400",
      badgeClass: "bg-amber-500/10 text-amber-300 border-amber-500/30",
      tierLabel: "Moderate Overlap",
    };
  }
  return {
    stroke: "#10b981",
    textClass: "text-emerald-400",
    badgeClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    tierLabel: "Strong Consensus",
  };
}

export function DialecticDebateCard({
  debate,
  initialRound = 1,
}: DialecticDebateCardProps) {
  const [activeRound, setActiveRound] = useState<1 | 2 | 3>(initialRound);
  const [copied, setCopied] = useState(false);

  // Pure deterministic analysis derived from the debate artifact
  const analysis = useMemo(() => {
    return analyzeDialecticDebate(
      debate || {
        topic: "",
        consensusSummary: "",
        perspectives: [],
        synthesisVerdict: "",
      },
    );
  }, [debate]);

  const {
    consensusScore,
    sharedAgreements,
    irreconcilableTradeoffs,
    arbiterRuling,
    debateRounds,
  } = analysis;

  // Stance perspectives with defensive fallbacks
  const { advocate: foundAdvocate, critic: foundCritic } = useMemo(() => {
    return getPerspectivesByStance(
      debate || {
        topic: "",
        consensusSummary: "",
        perspectives: [],
        synthesisVerdict: "",
      },
    );
  }, [debate]);

  const perspectives = debate?.perspectives ?? [];
  const advocate =
    foundAdvocate ||
    perspectives.find((p) => p.stance === "Advocate") ||
    perspectives[0];
  const critic =
    foundCritic ||
    perspectives.find((p) => p.stance === "Critic") ||
    (perspectives.length > 1 ? perspectives[1] : undefined);

  const consensusPalette = getConsensusPalette(consensusScore);

  // SVG Dial Meter geometry
  const radius = 20;
  const circumference = 2 * Math.PI * radius; // ~125.66
  const strokeOffset =
    circumference -
    (Math.max(0, Math.min(100, consensusScore)) / 100) * circumference;

  const handleRoundChange = (round: 1 | 2 | 3) => {
    sound.playCheck();
    setActiveRound(round);
  };

  const handleDownloadCsv = () => {
    sound.playSuccess();
    const csvContent = debateToCsv(debate, analysis);
    const slug =
      (debate?.topic || "dialectic-debate")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "dialectic-debate";
    downloadCsvData(`${slug}-debate.csv`, csvContent);
  };

  const handleCopyMarkdown = async () => {
    sound.playCheck();
    const mdContent = debateToMarkdown(debate, analysis);
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(mdContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  };

  const round1Data = debateRounds.find((r) => r.round === 1);
  const round2Data = debateRounds.find((r) => r.round === 2);
  const round3Data = debateRounds.find((r) => r.round === 3);

  return (
    <div className="w-full my-4 rounded-xl border border-slate-700/80 bg-slate-900/90 backdrop-blur-md overflow-hidden shadow-2xl transition-all">
      {/* 1. TOP HEADER */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Topic Title & Scale Icon */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
            <Scale className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold">
                Dialectic Debate Arena
              </span>
            </div>
            <h3 className="font-semibold text-slate-100 text-sm md:text-base leading-tight mt-1 truncate">
              {debate?.topic || "Autonomous Dialectic Deliberation"}
            </h3>
          </div>
        </div>

        {/* Live Consensus Gauge & Actions */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Live Consensus Gauge (SVG Dial) */}
          <div className="flex items-center gap-3 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
            <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
              <svg
                className="w-12 h-12 -rotate-90 shrink-0"
                viewBox="0 0 48 48"
              >
                <circle
                  cx="24"
                  cy="24"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  className="text-slate-800 stroke-current"
                />
                <circle
                  cx="24"
                  cy="24"
                  r={radius}
                  fill="none"
                  stroke={consensusPalette.stroke}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeOffset}
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span
                  className={`text-[11px] font-bold font-mono leading-none ${consensusPalette.textClass}`}
                >
                  {consensusScore}%
                </span>
              </div>
            </div>

            <div className="flex flex-col">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${consensusPalette.badgeClass}`}
              >
                {consensusScore}% Consensus
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">
                {consensusPalette.tierLabel}
              </span>
            </div>
          </div>

          {/* Action Buttons: Download CSV & Copy Markdown Report */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 text-xs font-medium transition-all shadow-sm active:scale-95"
              title="Download RFC 4180 CSV Debate Matrix"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Download CSV</span>
            </button>

            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 text-xs font-medium transition-all shadow-sm active:scale-95"
              title="Copy Formatted Markdown Report"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Markdown Report</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ROUND SELECTOR TABS */}
      <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-lg border border-slate-800/90">
          <button
            type="button"
            onClick={() => handleRoundChange(1)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
              activeRound === 1
                ? "bg-slate-800 text-slate-100 shadow-sm border border-slate-700/80 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-850"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Round 1: Assertions</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoundChange(2)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
              activeRound === 2
                ? "bg-slate-800 text-slate-100 shadow-sm border border-slate-700/80 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-850"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Round 2: Cross-Examination</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoundChange(3)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
              activeRound === 3
                ? "bg-slate-800 text-slate-100 shadow-sm border border-slate-700/80 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-850"
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-purple-400" />
            <span>Round 3: Arbiter Verdict</span>
          </button>
        </div>

        {/* Round Phase Badge */}
        <span className="text-[11px] font-mono text-slate-400">
          Stage:{" "}
          {activeRound === 1
            ? "1 of 3 (Opening Theses)"
            : activeRound === 2
              ? "2 of 3 (Stress Testing)"
              : "3 of 3 (Final Adjudication)"}
        </span>
      </div>

      {/* 2. ROUND 1 VIEW: ASSERTIONS */}
      {activeRound === 1 && (
        <div className="p-5 space-y-5">
          {/* Round 1 Opening Statements Callout */}
          {round1Data && (
            <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-start gap-3">
              <Scale className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300 space-y-1">
                <span className="font-semibold text-slate-200 block">
                  Round 1: Assertions & Theses Overview
                </span>
                <p className="text-slate-400 leading-relaxed">
                  Both sides present baseline architectural theses and initial
                  evidence.
                </p>
              </div>
            </div>
          )}

          {/* Dual-column side-by-side comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left: Advocate Column */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Advocate Header */}
                <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-100 text-xs md:text-sm">
                        {advocate?.agentName || "Advocate"}
                      </h4>
                      <p className="text-[10px] text-emerald-400/80">
                        Primary Proponent
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded border bg-emerald-500/10 text-emerald-300 border-emerald-500/30 font-semibold">
                    {advocate?.stance || "Advocate"}
                  </span>
                </div>

                {/* Opening Assertion Statement */}
                {round1Data?.advocateStatement && (
                  <div className="p-2.5 rounded-lg bg-slate-900/90 border border-emerald-500/20 text-xs text-emerald-200 leading-snug">
                    <span className="font-semibold text-[10px] uppercase text-emerald-400 block mb-0.5">
                      Opening Assertion:
                    </span>
                    &ldquo;{round1Data.advocateStatement}&rdquo;
                  </div>
                )}

                {/* Argument Chips */}
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mb-2">
                    Core Assertions ({advocate?.arguments?.length || 0})
                  </span>
                  <div className="space-y-2">
                    {advocate?.arguments && advocate.arguments.length > 0 ? (
                      advocate.arguments.map((arg, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg bg-slate-900/80 border border-emerald-500/20 text-xs text-slate-200 leading-relaxed flex items-start gap-2.5 shadow-sm"
                        >
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold shrink-0 mt-0.5">
                            #{idx + 1}
                          </span>
                          <span className="leading-snug">{arg}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 italic">
                        No advocate arguments recorded.
                      </p>
                    )}
                  </div>
                </div>

                {/* Caveats / Blind spots acknowledged */}
                {advocate?.caveats && advocate.caveats.length > 0 && (
                  <div className="pt-3 border-t border-emerald-500/20">
                    <span className="text-[10px] uppercase font-semibold text-amber-400 tracking-wider block mb-2">
                      Acknowledged Concessions & Blind Spots
                    </span>
                    <div className="space-y-1.5">
                      {advocate.caveats.map((cav, idx) => (
                        <div
                          key={idx}
                          className="text-[11px] text-slate-300 flex items-start gap-2 p-2 rounded bg-slate-900/60 border border-amber-500/20"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span>{cav}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Critic / Red Team Column */}
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Critic Header */}
                <div className="flex items-center justify-between pb-3 border-b border-rose-500/20">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
                      <Flame className="w-4 h-4 text-rose-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-100 text-xs md:text-sm">
                        {critic?.agentName || "Critic / Red Team"}
                      </h4>
                      <p className="text-[10px] text-rose-400/80">
                        Counter-Perspective & Adversarial Review
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded border bg-rose-500/10 text-rose-300 border-rose-500/30 font-semibold">
                    {critic?.stance || "Critic"}
                  </span>
                </div>

                {/* Opening Counter Statement */}
                {round1Data?.criticStatement && (
                  <div className="p-2.5 rounded-lg bg-slate-900/90 border border-rose-500/20 text-xs text-rose-200 leading-snug">
                    <span className="font-semibold text-[10px] uppercase text-rose-400 block mb-0.5">
                      Counter-Assertion:
                    </span>
                    &ldquo;{round1Data.criticStatement}&rdquo;
                  </div>
                )}

                {/* Counter-Assertions & Risks */}
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mb-2">
                    Counter-Assertions & Risks ({critic?.arguments?.length || 0}
                    )
                  </span>
                  <div className="space-y-2">
                    {critic?.arguments && critic.arguments.length > 0 ? (
                      critic.arguments.map((arg, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg bg-slate-900/80 border border-rose-500/20 text-xs text-slate-200 leading-relaxed flex items-start gap-2.5 shadow-sm"
                        >
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[10px] font-bold shrink-0 mt-0.5">
                            #{idx + 1}
                          </span>
                          <span className="leading-snug">{arg}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 italic">
                        No critic counter-assertions recorded.
                      </p>
                    )}
                  </div>
                </div>

                {/* Additional Critic Risks / Caveats */}
                {critic?.caveats && critic.caveats.length > 0 && (
                  <div className="pt-3 border-t border-rose-500/20">
                    <span className="text-[10px] uppercase font-semibold text-rose-400 tracking-wider block mb-2">
                      Identified Vulnerabilities & Risks
                    </span>
                    <div className="space-y-1.5">
                      {critic.caveats.map((cav, idx) => (
                        <div
                          key={idx}
                          className="text-[11px] text-slate-300 flex items-start gap-2 p-2 rounded bg-slate-900/60 border border-rose-500/20"
                        >
                          <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                          <span>{cav}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. ROUND 2 VIEW: CROSS-EXAMINATION & STRESS TESTS */}
      {activeRound === 2 && (
        <div className="p-5 space-y-6">
          {/* Round 2 Callout */}
          {round2Data && (
            <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-start gap-3">
              <Layers className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300 space-y-1">
                <span className="font-semibold text-slate-200 block">
                  Round 2: Cross-Examination & Stress Tests
                </span>
                <p className="text-slate-400 leading-relaxed">
                  Opposing positions clash over architectural trade-offs,
                  surfacing non-negotiable constraints and points of agreement.
                </p>
              </div>
            </div>
          )}

          {/* Interactive Matrix of Irreconcilable Trade-Offs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h4 className="font-bold text-slate-100 text-xs uppercase tracking-wider">
                  Irreconcilable Trade-Offs ({irreconcilableTradeoffs.length})
                </h4>
              </div>
              <span className="text-[10px] text-slate-400">
                Sorted by severity
              </span>
            </div>

            {irreconcilableTradeoffs.length > 0 ? (
              <div className="space-y-3">
                {irreconcilableTradeoffs.map((tradeoff, idx) => {
                  const severityBadge = getSeverityBadge(tradeoff.severity);
                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/90 shadow-md space-y-3 transition-all hover:border-slate-700"
                    >
                      {/* Tradeoff Dimension Header & Severity Badge */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-400">
                            #{idx + 1}
                          </span>
                          <h5 className="font-semibold text-slate-100 text-xs md:text-sm">
                            {tradeoff.dimension}
                          </h5>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider border ${severityBadge.className}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${severityBadge.dotClass}`}
                          />
                          <span>{severityBadge.label}</span>
                        </span>
                      </div>

                      {/* Side-by-side Advantage vs Risk */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {/* Advocate Advantage */}
                        <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-xs space-y-1">
                          <span className="text-[10px] uppercase font-semibold text-emerald-400 tracking-wider flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            Advocate Advantage
                          </span>
                          <p className="text-slate-200 leading-snug">
                            {tradeoff.advocateAdvantage}
                          </p>
                        </div>

                        {/* Critic Risk */}
                        <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/20 text-xs space-y-1">
                          <span className="text-[10px] uppercase font-semibold text-rose-400 tracking-wider flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5 text-rose-400" />
                            Critic Risk
                          </span>
                          <p className="text-slate-200 leading-snug">
                            {tradeoff.criticRisk}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-xs text-slate-400 italic">
                No irreconcilable trade-offs detected. Opposing perspectives are
                aligned or unconflicted.
              </div>
            )}
          </div>

          {/* Shared Agreements Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-400" />
              <h4 className="font-bold text-slate-100 text-xs uppercase tracking-wider">
                Discovered Points of Consensus ({sharedAgreements.length})
              </h4>
            </div>

            {sharedAgreements.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sharedAgreements.map((agreement, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg bg-slate-950/70 border border-teal-500/20 text-xs text-slate-200 flex items-start gap-2.5 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{agreement}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-xs text-slate-400 italic">
                No mutual agreements identified between perspectives.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. ROUND 3 VIEW: ARBITER VERDICT */}
      {activeRound === 3 && (
        <div className="p-5 space-y-6">
          {/* Arbiter Adjudication Decision Card */}
          <div className="rounded-xl border border-purple-500/40 bg-purple-950/20 p-5 space-y-5 shadow-xl">
            {/* Arbiter Header */}
            <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-purple-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
                  <Trophy className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-purple-300 font-semibold block">
                    Neutral Arbiter Ruling
                  </span>
                  <h4 className="font-bold text-slate-100 text-base md:text-lg">
                    {formatArbiterWinner(arbiterRuling.winner)}
                  </h4>
                </div>
              </div>

              {/* Arbiter Confidence Score & Convergence */}
              <div className="flex items-center gap-2">
                {round3Data && round3Data.consensusDelta > 0 && (
                  <div className="flex items-center gap-1.5 bg-slate-900/90 px-3 py-1.5 rounded-lg border border-purple-500/20">
                    <span className="text-[10px] uppercase font-mono text-slate-400">
                      Convergence:
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      +{round3Data.consensusDelta}%
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-lg border border-purple-500/30">
                  <Award className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-mono font-bold text-purple-300">
                    {arbiterRuling.confidenceScore}% Confidence
                  </span>
                </div>
              </div>
            </div>

            {/* Strategic Recommendation Banner with Bold Callout */}
            <div className="p-4 rounded-xl border border-purple-500/40 bg-gradient-to-r from-purple-950/60 to-slate-900/90 shadow-md">
              <div className="flex items-start gap-3">
                <Award className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-purple-300 block">
                    Strategic Recommendation
                  </span>
                  <p className="text-sm font-semibold text-slate-100 leading-relaxed">
                    {arbiterRuling.strategicRecommendation}
                  </p>
                </div>
              </div>
            </div>

            {/* Decisive Factors Checklist */}
            <div className="space-y-3">
              <h5 className="font-semibold text-slate-200 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <ChevronRight className="w-3.5 h-3.5 text-purple-400" />
                Decisive Factors ({arbiterRuling.decisiveFactors.length})
              </h5>
              <div className="space-y-2">
                {arbiterRuling.decisiveFactors.map((factor, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-slate-900/80 border border-purple-500/20 text-xs text-slate-200 flex items-start gap-2.5 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <span className="leading-snug">{factor}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Synthesis Verdict Callout */}
          {debate?.synthesisVerdict && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-3">
              <Scale className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-200 leading-relaxed space-y-1">
                <span className="font-semibold text-indigo-300 block">
                  Synthesis Verdict:
                </span>
                <p className="text-slate-300">{debate.synthesisVerdict}</p>
              </div>
            </div>
          )}

          {/* Consensus Summary */}
          {debate?.consensusSummary && (
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-xs text-slate-300 space-y-1">
              <span className="font-semibold text-teal-400 block">
                Consensus Summary:
              </span>
              <p className="leading-relaxed">{debate.consensusSummary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DialecticDebateCard;
