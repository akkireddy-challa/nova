"use client";

import React, { useState, useMemo } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertOctagon,
  Copy,
  Check,
  Download,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Terminal,
  Shield,
} from "lucide-react";
import type { RedTeamAuditArtifact } from "@/lib/types";
import {
  redTeamAuditToCsv,
  redTeamAuditToMarkdown,
} from "@/lib/security/red-team-auditor";
import { downloadCsvData } from "@/lib/matrix-calculator";
import { sound } from "@/lib/sound";

interface Props {
  artifact: RedTeamAuditArtifact;
  className?: string;
}

export function RedTeamAuditCard({ artifact, className = "" }: Props) {
  const [expandedChainId, setExpandedChainId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const chains = useMemo(
    () => artifact.attackChains || [],
    [artifact.attackChains],
  );

  const handleCopyMarkdown = async () => {
    try {
      const md = redTeamAuditToMarkdown(artifact);
      await navigator.clipboard.writeText(md);
      setCopied(true);
      sound.playPop();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownloadCsv = () => {
    try {
      const csv = redTeamAuditToCsv(artifact);
      const safeSlug = (artifact.topic || "red-team-audit")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 32);
      downloadCsvData(`nova-redteam-${safeSlug}.csv`, csv);
      setDownloaded(true);
      sound.playSuccess();
      setTimeout(() => setDownloaded(false), 2000);
    } catch {
      // Fallback
    }
  };

  const postureBadgeStyle =
    artifact.summary.defensePosture === "hardened"
      ? "text-emerald-400 bg-emerald-950/80 border-emerald-800/80"
      : artifact.summary.defensePosture === "resilient"
        ? "text-teal-400 bg-teal-950/80 border-teal-800/80"
        : artifact.summary.defensePosture === "vulnerable"
          ? "text-amber-400 bg-amber-950/80 border-amber-800/80"
          : "text-rose-400 bg-rose-950/80 border-rose-800/80";

  return (
    <div
      className={`bg-slate-900/95 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-xl text-slate-100 flex flex-col gap-5 ${className}`}
    >
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-sm">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-bold">
                  Dialectic Red-Team Auditor
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {artifact.targetSystem || "Target System"}
                </span>
              </div>
              <h3 className="text-base font-semibold text-slate-100 line-clamp-1">
                {artifact.topic || "Dialectic Red-Team Security Audit"}
              </h3>
            </div>
          </div>
        </div>

        {/* POSTURE BADGE & ACTIONS */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${postureBadgeStyle}`}
          >
            <div className="flex flex-col text-right">
              <span className="text-[10px] font-mono text-slate-400">
                Posture
              </span>
              <span className="text-xs font-mono font-bold uppercase">
                {artifact.summary.defensePosture}
              </span>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyMarkdown}
              title="Copy Markdown Report"
              aria-label="Copy Markdown Report"
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

      {/* EXECUTIVE SUMMARY */}
      {artifact.executiveSummary && (
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-300 leading-relaxed">
            {artifact.executiveSummary}
          </p>
        </div>
      )}

      {/* METRIC SCORECARD */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="text-[10px] font-mono text-slate-400">
            Immunity Score
          </div>
          <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
            {artifact.summary.immunityScore}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {artifact.summary.neutralizedCount} /{" "}
            {artifact.summary.totalAttackChains} neutralized
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="text-[10px] font-mono text-slate-400">Breaches</div>
          <div
            className={`text-lg font-bold font-mono mt-0.5 ${
              artifact.summary.exploitedCount > 0
                ? "text-rose-400"
                : "text-emerald-400"
            }`}
          >
            {artifact.summary.exploitedCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            successful exploits
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="text-[10px] font-mono text-slate-400">
            Critical Vulns
          </div>
          <div
            className={`text-lg font-bold font-mono mt-0.5 ${
              artifact.summary.criticalVulnerabilities > 0
                ? "text-rose-400"
                : "text-slate-300"
            }`}
          >
            {artifact.summary.criticalVulnerabilities}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            OWASP Top 10 critical
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="text-[10px] font-mono text-slate-400">High Vulns</div>
          <div
            className={`text-lg font-bold font-mono mt-0.5 ${
              artifact.summary.highVulnerabilities > 0
                ? "text-amber-400"
                : "text-slate-300"
            }`}
          >
            {artifact.summary.highVulnerabilities}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            elevated risk vectors
          </div>
        </div>
      </div>

      {/* ATTACK CHAINS LIST */}
      <div className="space-y-3">
        <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-rose-400" />
          <span>Multi-Turn Attack Vectors Tested ({chains.length})</span>
        </div>

        {chains.map((chain) => {
          const isExpanded = expandedChainId === chain.chainId;
          const isNeutralized = chain.status === "neutralized";

          return (
            <div
              key={chain.chainId}
              className={`p-3.5 rounded-xl border transition-all ${
                isNeutralized
                  ? "bg-slate-950/40 border-slate-800/80 hover:border-slate-700"
                  : "bg-rose-950/20 border-rose-800/50 hover:border-rose-700/60"
              }`}
            >
              <div
                className="flex items-start justify-between gap-3 cursor-pointer select-none"
                onClick={() => {
                  sound.playPop();
                  setExpandedChainId(isExpanded ? null : chain.chainId);
                }}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5">
                    {isNeutralized ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertOctagon className="w-4 h-4 text-rose-400" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-400">
                        {chain.chainId}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-slate-800 text-slate-300">
                        {chain.owaspCategory.replace(/_/g, " ")}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.2 rounded font-bold uppercase ${
                          chain.severity === "critical"
                            ? "bg-rose-950 text-rose-300 border border-rose-800/60"
                            : "bg-amber-950 text-amber-300 border border-amber-800/60"
                        }`}
                      >
                        {chain.severity}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.2 rounded font-bold uppercase ${
                          isNeutralized
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                            : "bg-rose-950 text-rose-300 border border-rose-800/60"
                        }`}
                      >
                        {chain.status}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-200">
                      {chain.vectorName}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-[10px] font-mono text-slate-400">
                    {chain.turns.length} turns
                  </div>
                  <div className="text-slate-400">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </div>

              {/* EXPANDABLE MULTI-TURN INSPECTION DRAWER */}
              {isExpanded && (
                <div className="mt-3.5 pt-3 border-t border-slate-800/60 space-y-3.5 text-xs">
                  <div>
                    <div className="text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
                      Vulnerability Analysis
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {chain.vulnerabilityAnalysis}
                    </p>
                  </div>

                  <div>
                    <div className="text-[10px] font-mono uppercase text-slate-400 font-bold mb-2">
                      Multi-Turn Adversarial Probe Dialogue
                    </div>
                    <div className="space-y-2.5">
                      {chain.turns.map((turn) => (
                        <div
                          key={turn.turnNumber}
                          className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="font-bold text-rose-400">
                              Turn {turn.turnNumber}: {turn.attackTactic}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded font-bold ${
                                turn.detectedBreach
                                  ? "bg-rose-950 text-rose-300 border border-rose-800/60"
                                  : "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                              }`}
                            >
                              {turn.detectedBreach ? "BREACHED" : "DEFENDED"}
                            </span>
                          </div>
                          <div className="font-mono text-[10.5px] text-slate-300 bg-slate-950/60 p-2 rounded border border-slate-800/60">
                            <span className="text-rose-400 font-bold">
                              Attacker:
                            </span>{" "}
                            {turn.attackerPrompt}
                          </div>
                          <div className="text-[10.5px] text-slate-300 bg-slate-950/40 p-2 rounded border border-slate-800/40 italic">
                            <span className="text-teal-400 font-bold not-italic">
                              Defender:
                            </span>{" "}
                            &ldquo;{turn.targetResponseSnippet}&rdquo;
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {chain.recommendedGuardrail && (
                    <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/50 text-emerald-200 text-[11px] flex items-start gap-2">
                      <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <strong>Recommended Guardrail:</strong>{" "}
                        {chain.recommendedGuardrail}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RedTeamAuditCard;
