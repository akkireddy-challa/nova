"use client";

import React, { useState, useMemo } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  Lock,
  Copy,
  Check,
  Download,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Sliders,
  Eye,
} from "lucide-react";
import type { SemanticGuardrailArtifact } from "@/lib/types";
import {
  guardrailsPolicyToCsv,
  guardrailsPolicyToMarkdown,
} from "@/lib/security/semantic-guardrails";
import { downloadCsvData } from "@/lib/matrix-calculator";
import { sound } from "@/lib/sound";

interface GuardrailPolicyCardProps {
  artifact: SemanticGuardrailArtifact;
}

export function GuardrailPolicyCard({ artifact }: GuardrailPolicyCardProps) {
  const [activeTab, setActiveTab] = useState<
    "preview" | "rules" | "violations"
  >("preview");
  const [copied, setCopied] = useState(false);
  const [expandedViolationId, setExpandedViolationId] = useState<string | null>(
    null,
  );

  const appliedRules = useMemo(
    () => artifact.appliedRules || [],
    [artifact.appliedRules],
  );
  const violations = useMemo(
    () => artifact.violations || [],
    [artifact.violations],
  );

  const riskBadgeStyle = useMemo(() => {
    switch (artifact.summary.riskGrade) {
      case "A+":
      case "A":
        return {
          bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
          dot: "bg-emerald-400",
          label: `Grade ${artifact.summary.riskGrade} (Compliant)`,
        };
      case "B":
        return {
          bg: "bg-teal-500/10 border-teal-500/30 text-teal-400",
          dot: "bg-teal-400",
          label: "Grade B (Minor Drift)",
        };
      case "C":
        return {
          bg: "bg-amber-500/10 border-amber-500/30 text-amber-400",
          dot: "bg-amber-400",
          label: "Grade C (Elevated Risk)",
        };
      case "F":
      default:
        return {
          bg: "bg-rose-500/10 border-rose-500/30 text-rose-400",
          dot: "bg-rose-400",
          label: "Grade F (Breach Detected)",
        };
    }
  }, [artifact.summary.riskGrade]);

  const handleCopyMarkdown = () => {
    const md = guardrailsPolicyToMarkdown(artifact);
    navigator.clipboard.writeText(md);
    setCopied(true);
    sound.playPop();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCsv = () => {
    const csv = guardrailsPolicyToCsv(artifact);
    const filename = `${artifact.id || "semantic-guardrail-policy"}.csv`;
    downloadCsvData(csv, filename);
    sound.playSuccess();
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 shadow-2xl overflow-hidden backdrop-blur-md">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              <Lock className="w-3 h-3 text-emerald-400" />
              Guardrail Policy
            </span>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/50">
              {artifact.policyVersion}
            </span>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/50 truncate max-w-[200px]">
              {artifact.targetChannel}
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-100 tracking-tight truncate">
            {artifact.topic}
          </h2>
        </div>

        {/* Risk Grade Badge */}
        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-xs font-bold uppercase tracking-wider shrink-0 ${riskBadgeStyle.bg}`}
        >
          <span
            className={`w-2 h-2 rounded-full animate-pulse ${riskBadgeStyle.dot}`}
          />
          <span>{riskBadgeStyle.label}</span>
        </div>
      </div>

      {/* Metric Scorecard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-950/30 border-b border-slate-800/60">
        <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800/80">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-0.5">
            Clean Tokens
          </div>
          <div className="text-lg font-bold font-mono text-emerald-400">
            {artifact.summary.cleanTokensPct}%
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800/80">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-0.5">
            Violations
          </div>
          <div className="text-lg font-bold font-mono text-amber-400">
            {artifact.summary.totalViolations}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800/80">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-0.5">
            Redacted Tokens
          </div>
          <div className="text-lg font-bold font-mono text-indigo-400">
            {artifact.summary.redactedCount}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800/80">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-0.5">
            Blocked Payloads
          </div>
          <div className="text-lg font-bold font-mono text-rose-400">
            {artifact.summary.blockedCount}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-3 pt-2 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab("preview");
              sound.playTap();
            }}
            className={`px-3 py-1.5 rounded-t-lg text-xs font-medium font-mono flex items-center gap-1.5 transition-colors border-t border-x ${
              activeTab === "preview"
                ? "bg-slate-900 text-emerald-400 border-slate-700/80 font-bold"
                : "text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/40"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Sanitized Output ({artifact.summary.cleanTokensPct}%)
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("rules");
              sound.playTap();
            }}
            className={`px-3 py-1.5 rounded-t-lg text-xs font-medium font-mono flex items-center gap-1.5 transition-colors border-t border-x ${
              activeTab === "rules"
                ? "bg-slate-900 text-teal-400 border-slate-700/80 font-bold"
                : "text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/40"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Policy Rules ({appliedRules.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("violations");
              sound.playTap();
            }}
            className={`px-3 py-1.5 rounded-t-lg text-xs font-medium font-mono flex items-center gap-1.5 transition-colors border-t border-x ${
              activeTab === "violations"
                ? "bg-slate-900 text-amber-400 border-slate-700/80 font-bold"
                : "text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/40"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Interceptions ({violations.length})
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 pb-1">
          <button
            type="button"
            onClick={handleCopyMarkdown}
            title="Copy Markdown Report"
            className="p-1.5 rounded-md text-slate-400 hover:text-emerald-300 hover:bg-slate-800 transition"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
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

      {/* Tab Contents */}
      <div className="p-4 space-y-4">
        {/* Executive Summary */}
        {artifact.executiveSummary && (
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300 leading-relaxed font-sans">
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-emerald-400 mb-1 font-bold">
              <Sparkles className="w-3 h-3" />
              Policy Summary
            </div>
            {artifact.executiveSummary}
          </div>
        )}

        {/* Tab 1: Sanitization Preview */}
        {activeTab === "preview" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Sanitized Output Stream</span>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Redactions Active
              </span>
            </div>
            <pre className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {artifact.sanitizedPreview}
            </pre>
          </div>
        )}

        {/* Tab 2: Enforced Rules */}
        {activeTab === "rules" && (
          <div className="space-y-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-800 border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                    <th className="p-2 border-r border-slate-800/80">
                      Rule ID
                    </th>
                    <th className="p-2 border-r border-slate-800/80">Name</th>
                    <th className="p-2 border-r border-slate-800/80 text-center">
                      Severity
                    </th>
                    <th className="p-2 border-r border-slate-800/80 text-center">
                      Action
                    </th>
                    <th className="p-2 text-center">Triggers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {appliedRules.map((r) => (
                    <tr
                      key={r.ruleId}
                      className="text-slate-200 hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="p-2 font-mono text-[10px] text-slate-400 border-r border-slate-800/80">
                        {r.ruleId}
                      </td>
                      <td className="p-2 font-semibold border-r border-slate-800/80">
                        <div>{r.name}</div>
                        <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                          {r.description}
                        </div>
                      </td>
                      <td className="p-2 text-center font-mono text-[10px] uppercase border-r border-slate-800/80 font-bold">
                        <span
                          className={`px-1.5 py-0.5 rounded border ${
                            r.severity === "critical"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                              : r.severity === "high"
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                : "bg-teal-500/10 text-teal-400 border-teal-500/30"
                          }`}
                        >
                          {r.severity}
                        </span>
                      </td>
                      <td className="p-2 text-center font-mono text-[10px] uppercase border-r border-slate-800/80 font-bold">
                        <span
                          className={`px-1.5 py-0.5 rounded ${
                            r.action === "block"
                              ? "bg-rose-500/20 text-rose-300"
                              : r.action === "redact"
                                ? "bg-indigo-500/20 text-indigo-300"
                                : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {r.action}
                        </span>
                      </td>
                      <td className="p-2 text-center font-mono font-bold text-slate-100">
                        {r.triggerCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Violations Interceptions */}
        {activeTab === "violations" && (
          <div className="space-y-2">
            {violations.length === 0 ? (
              <div className="p-6 rounded-lg bg-slate-950/40 border border-slate-800 text-center text-xs text-slate-400 font-mono">
                <ShieldCheck className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                Zero violations detected. All scanned content complies with
                active guardrail policies.
              </div>
            ) : (
              violations.map((v) => {
                const isExpanded = expandedViolationId === v.id;
                return (
                  <div
                    key={v.id}
                    className="rounded-lg border border-slate-800/80 bg-slate-950/60 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedViolationId(isExpanded ? null : v.id);
                        sound.playTap();
                      }}
                      className="w-full p-2.5 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                            v.severity === "critical"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                              : v.severity === "high"
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                : "bg-teal-500/10 text-teal-400 border-teal-500/30"
                          }`}
                        >
                          {v.severity}
                        </span>
                        <span className="text-xs font-semibold text-slate-200 truncate">
                          {v.description}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono text-slate-400">
                          [{v.offsetStart} - {v.offsetEnd}]
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-3 border-t border-slate-800/60 bg-slate-950/80 space-y-2 text-xs font-mono">
                        <div>
                          <div className="text-[10px] uppercase text-slate-500 mb-0.5">
                            Matched Pattern
                          </div>
                          <div className="p-2 rounded bg-slate-900 border border-slate-800 text-rose-300 break-all">
                            {v.matchedPattern}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] uppercase text-slate-500 mb-0.5">
                            Redacted Substitution
                          </div>
                          <div className="p-2 rounded bg-slate-900 border border-slate-800 text-emerald-300 break-all font-bold">
                            {v.redactedReplacement}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
