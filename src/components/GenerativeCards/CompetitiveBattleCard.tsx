"use client";

import React, { useState } from "react";
import {
  Swords,
  ShieldCheck,
  Scale,
  Trophy,
  Download,
  Copy,
  Check,
  Building2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Target,
  FileText,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import type { CompetitiveBattleCardArtifact } from "@/lib/types";
import {
  battleCardToCsv,
  battleCardToMarkdown,
  calculateMoatScore,
} from "@/lib/competitive/battle-card";
import { downloadCsvData } from "@/lib/matrix-calculator";
import { sound } from "@/lib/sound";

export interface CompetitiveBattleCardProps {
  battleCard: CompetitiveBattleCardArtifact;
  className?: string;
}

type BattleCardViewTab = "matrix" | "battlecards" | "winthemes";

function getRatingColor(rating: number): string {
  if (rating >= 5)
    return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
  if (rating >= 4) return "bg-teal-500/20 text-teal-300 border-teal-500/40";
  if (rating === 3) return "bg-blue-500/20 text-blue-300 border-blue-500/40";
  if (rating === 2) return "bg-amber-500/20 text-amber-300 border-amber-500/40";
  return "bg-rose-500/20 text-rose-300 border-rose-500/40";
}

function getMoatBadge(score: number): {
  label: string;
  color: string;
  border: string;
} {
  if (score >= 80) {
    return {
      label: "Dominant Moat",
      color: "text-emerald-400 bg-emerald-950/80",
      border: "border-emerald-700/60",
    };
  }
  if (score >= 65) {
    return {
      label: "Strong Advantage",
      color: "text-teal-400 bg-teal-950/80",
      border: "border-teal-700/60",
    };
  }
  return {
    label: "Competitive Parity",
    color: "text-amber-400 bg-amber-950/80",
    border: "border-amber-700/60",
  };
}

export function CompetitiveBattleCard({
  battleCard,
  className = "",
}: CompetitiveBattleCardProps) {
  const [activeTab, setActiveTab] = useState<BattleCardViewTab>("matrix");
  const [selectedCompetitorIdx, setSelectedCompetitorIdx] = useState<number>(0);
  const [expandedDimension, setExpandedDimension] = useState<string | null>(
    null,
  );
  const [copied, setCopied] = useState<boolean>(false);
  const [downloaded, setDownloaded] = useState<boolean>(false);

  const moatInfo = calculateMoatScore(battleCard.dimensions);
  const moatBadge = getMoatBadge(battleCard.novaMoatScore);
  const competitors = battleCard.competitorProfiles || [];
  const activeCompetitor = competitors[selectedCompetitorIdx] || competitors[0];

  const handleCopyMarkdown = async () => {
    try {
      const md = battleCardToMarkdown(battleCard);
      await navigator.clipboard.writeText(md);
      setCopied(true);
      sound.playPop();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard fallback
    }
  };

  const handleDownloadCsv = () => {
    try {
      const csv = battleCardToCsv(battleCard);
      const safeTopic = (battleCard.topic || "competitive-battlecard")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 32);
      downloadCsvData(`nova-battlecard-${safeTopic}.csv`, csv);
      setDownloaded(true);
      sound.playSuccess();
      setTimeout(() => setDownloaded(false), 2000);
    } catch {
      // Download fallback
    }
  };

  return (
    <div
      className={`bg-slate-900/95 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-xl text-slate-100 flex flex-col gap-5 ${className}`}
    >
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-sm">
              <Swords className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-bold">
                  Competitive Moat Battle-Card
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {battleCard.targetSector || "Enterprise AI"}
                </span>
              </div>
              <h3 className="text-base font-semibold text-slate-100 line-clamp-1">
                {battleCard.topic || "Enterprise Strategic Evaluation"}
              </h3>
            </div>
          </div>
        </div>

        {/* MOAT DEFENSE GAUGE & ACTION BUTTONS */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="flex flex-col text-right">
              <span className="text-[10px] font-mono text-slate-400">
                Moat Index
              </span>
              <span
                className={`text-xs font-mono font-bold px-1.5 py-0.2 rounded border ${moatBadge.color} ${moatBadge.border}`}
              >
                {moatBadge.label}
              </span>
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-emerald-500/40 bg-emerald-950/40 flex items-center justify-center text-xs font-mono font-bold text-emerald-400">
              {battleCard.novaMoatScore}%
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyMarkdown}
              title="Copy Markdown Battle-Card"
              aria-label="Copy Markdown Battle-Card"
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700 transition-all hover:scale-105 active:scale-95"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={handleDownloadCsv}
              title="Download RFC 4180 CSV"
              aria-label="Download RFC 4180 CSV"
              className="p-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 transition-all hover:scale-105 active:scale-95"
            >
              {downloaded ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* STRATEGIC SUMMARY CALLOUT */}
      {battleCard.strategicSummary && (
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-300 leading-relaxed">
            {battleCard.strategicSummary}
          </p>
        </div>
      )}

      {/* VIEW TABS */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
        <button
          type="button"
          onClick={() => {
            sound.playTap();
            setActiveTab("matrix");
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
            activeTab === "matrix"
              ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>Feature Matrix</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
            {battleCard.dimensions.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            sound.playTap();
            setActiveTab("battlecards");
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
            activeTab === "battlecards"
              ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <Swords className="w-3.5 h-3.5" />
          <span>Competitor Battle-Cards</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
            {competitors.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            sound.playTap();
            setActiveTab("winthemes");
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
            activeTab === "winthemes"
              ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Win Themes</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
            {battleCard.keyWinThemes.length}
          </span>
        </button>
      </div>

      {/* TAB 1: FEATURE MATRIX */}
      {activeTab === "matrix" && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-mono text-[11px]">
                  <th className="py-2.5 px-3">Evaluation Dimension</th>
                  <th className="py-2.5 px-2 text-center">Category</th>
                  <th className="py-2.5 px-3 text-center">Nova</th>
                  {competitors.map((c) => (
                    <th key={c.name} className="py-2.5 px-3 text-center">
                      {c.name}
                    </th>
                  ))}
                  <th className="py-2.5 px-2 text-center">Advantage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {battleCard.dimensions.map((dim) => {
                  const isExpanded = expandedDimension === dim.dimensionKey;
                  return (
                    <React.Fragment key={dim.dimensionKey}>
                      <tr
                        onClick={() => {
                          sound.playTap();
                          setExpandedDimension(
                            isExpanded ? null : dim.dimensionKey,
                          );
                        }}
                        className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                      >
                        <td className="py-2.5 px-3 font-medium text-slate-200 flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span>{dim.label}</span>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700/60">
                            {dim.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-bold border ${getRatingColor(
                              dim.novaRating,
                            )}`}
                          >
                            {dim.novaRating}/5
                          </span>
                        </td>
                        {competitors.map((c) => {
                          const cRating =
                            dim.competitorRatings[c.name]?.rating ?? 3;
                          return (
                            <td
                              key={c.name}
                              className="py-2.5 px-3 text-center"
                            >
                              <span
                                className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-medium border ${getRatingColor(
                                  cRating,
                                )}`}
                              >
                                {cRating}/5
                              </span>
                            </td>
                          );
                        })}
                        <td className="py-2.5 px-2 text-center">
                          <span className="text-[10px] font-mono text-emerald-400 font-semibold flex items-center justify-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Leader</span>
                          </span>
                        </td>
                      </tr>

                      {/* EXPANDABLE DETAIL ROW */}
                      {isExpanded && (
                        <tr className="bg-slate-900/40 border-b border-slate-800/80">
                          <td
                            colSpan={4 + competitors.length}
                            className="p-3.5 space-y-2"
                          >
                            <div className="text-xs text-slate-300">
                              <strong className="text-emerald-400 font-mono">
                                Nova Advantage Note:
                              </strong>{" "}
                              {dim.novaNote}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1 border-t border-slate-800/60">
                              {Object.entries(dim.competitorRatings).map(
                                ([compName, compVal]) => (
                                  <div
                                    key={compName}
                                    className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/60 text-[11px]"
                                  >
                                    <div className="font-medium text-slate-300 font-mono">
                                      {compName} ({compVal.rating}/5):
                                    </div>
                                    <div className="text-slate-400 text-[10px] mt-0.5">
                                      {compVal.note}
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-1">
            <span>
              Moat Gap:{" "}
              <strong className="text-emerald-400">
                +{moatInfo.moatGap} pts
              </strong>{" "}
              vs industry mean
            </span>
            <span>Click any dimension row to inspect empirical notes</span>
          </div>
        </div>
      )}

      {/* TAB 2: COMPETITOR BATTLE-CARDS */}
      {activeTab === "battlecards" && (
        <div className="space-y-4">
          {/* COMPETITOR SELECTOR PILLS */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {competitors.map((comp, idx) => (
              <button
                key={comp.name}
                type="button"
                onClick={() => {
                  sound.playTap();
                  setSelectedCompetitorIdx(idx);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all border ${
                  selectedCompetitorIdx === idx
                    ? "bg-slate-800 text-slate-100 border-rose-500/50 shadow-sm"
                    : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>{comp.name}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-950 text-slate-400 uppercase">
                  {comp.tier}
                </span>
              </button>
            ))}
          </div>

          {activeCompetitor && (
            <div className="space-y-4">
              {/* COMPETITOR OVERVIEW HEADER */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-100">
                      {activeCompetitor.name}
                    </h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800/60 uppercase">
                      {activeCompetitor.tier} Tier
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    {activeCompetitor.marketPosition}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {activeCompetitor.summary}
                </p>
              </div>

              {/* TWO COLUMN: STRENGTHS VS ARCHITECTURAL WEAKNESSES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                  <span className="text-[11px] font-mono text-slate-400 font-semibold uppercase flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                    <span>Claimed Strengths</span>
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {activeCompetitor.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-teal-400 mt-0.5">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/40 space-y-2">
                  <span className="text-[11px] font-mono text-rose-300 font-semibold uppercase flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Architectural Weaknesses</span>
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {activeCompetitor.weaknesses.map((w, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-rose-400 mt-0.5">⚠️</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* LANDMINES TO LAY */}
              {activeCompetitor.landmineQuestions &&
                activeCompetitor.landmineQuestions.length > 0 && (
                  <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-900/40 space-y-2.5">
                    <span className="text-[11px] font-mono text-amber-300 font-bold uppercase flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        Landmine Discovery Questions (Expose Their Flaws)
                      </span>
                    </span>
                    <div className="space-y-2">
                      {activeCompetitor.landmineQuestions.map((q, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-lg bg-slate-900/80 border border-amber-800/30 text-xs text-amber-200/90 italic"
                        >
                          &ldquo;{q}&rdquo;
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* OBJECTION HANDLING MATRIX */}
              {activeCompetitor.objectionHandling &&
                activeCompetitor.objectionHandling.length > 0 && (
                  <div className="space-y-2.5">
                    <span className="text-[11px] font-mono text-slate-400 font-bold uppercase flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-rose-400" />
                      <span>Objection Handling Matrix</span>
                    </span>
                    <div className="space-y-2.5">
                      {activeCompetitor.objectionHandling.map((obj, i) => (
                        <div
                          key={i}
                          className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2"
                        >
                          <div className="text-xs font-semibold text-rose-300">
                            Prospect Objection: &ldquo;{obj.objection}&rdquo;
                          </div>
                          <div className="text-xs text-slate-300 pl-2 border-l-2 border-teal-500/60 space-y-1">
                            <div>
                              <strong className="text-teal-400">
                                Counter-Narrative:
                              </strong>{" "}
                              {obj.counterArgument}
                            </div>
                            <div className="text-[11px] text-slate-400 pt-0.5">
                              <strong className="text-amber-400 font-mono">
                                Empirical Proof:
                              </strong>{" "}
                              {obj.evidenceProof}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: WIN THEMES */}
      {activeTab === "winthemes" && (
        <div className="space-y-3">
          {battleCard.keyWinThemes.map((theme, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3"
            >
              <div className="w-6 h-6 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-xs font-mono font-bold text-rose-400 shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-200 leading-relaxed">
                  {theme}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CompetitiveBattleCard;
