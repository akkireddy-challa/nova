'use client';

import React, { useState, useMemo } from 'react';
import { GenerativeArtifact } from '@/lib/types';
import { 
  evaluateArtifact, 
  ProctorScorecardData, 
  ProctorAuditAssertion 
} from '@/lib/proctor-engine';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  AlertOctagon, 
  Sparkles, 
  RotateCw, 
  Copy, 
  Check, 
  Lock, 
  Calculator, 
  FileSearch, 
  Scale, 
  Flame,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { sound } from '@/lib/sound';

interface Props {
  artifact: GenerativeArtifact;
  onApplyImprovement?: (prompt: string) => void;
}

export function CriticProctorScorecard({ artifact, onApplyImprovement }: Props) {
  const [copied, setCopied] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  const scorecard: ProctorScorecardData = useMemo(() => {
    // refreshKey forces recalculation if triggered by user
    return evaluateArtifact(artifact);
  }, [artifact, refreshKey]);

  const handleCopyAudit = () => {
    sound.playCheck();
    const md = `### Nova Chief Critic & Quality Proctor Audit
- **Artifact:** ${scorecard.artifactType.toUpperCase()} (${scorecard.artifactId})
- **Verdict:** ${scorecard.verdict} (Score: ${scorecard.overallScore}/100, Grade: ${scorecard.grade})
- **Factuality Index:** ${scorecard.metrics.factualityIndex.score}/100
- **Hallucination Risk:** ${scorecard.metrics.hallucinationRisk.score}%
- **Security Guardrail:** ${scorecard.metrics.securityHardening.score}/100
- **Mathematical Sanity:** ${scorecard.metrics.mathSanity.score}/100
- **Completeness & Rigor:** ${scorecard.metrics.completenessRigor.score}/100

#### Audit Assertions (${scorecard.assertions.filter(a => a.passed).length}/${scorecard.assertions.length} Passed):
${scorecard.assertions.map(a => `- [${a.passed ? 'PASS' : 'FAIL'}] [${a.category.toUpperCase()}] ${a.description} (${a.severity.toUpperCase()})`).join('\n')}

#### Recommended Improvements:
${scorecard.recommendedImprovements.map(imp => `- ${imp}`).join('\n') || '- None: All critical standards satisfied.'}
`;

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredAssertions = useMemo(() => {
    if (filterCategory === 'all') return scorecard.assertions;
    if (filterCategory === 'failed') return scorecard.assertions.filter(a => !a.passed);
    return scorecard.assertions.filter(a => a.category === filterCategory);
  }, [scorecard.assertions, filterCategory]);

  const getVerdictStyle = (verdict: string) => {
    switch (verdict) {
      case 'PASS':
        return {
          badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
          accent: 'from-emerald-500 to-teal-500',
        };
      case 'WARN':
        return {
          badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
          accent: 'from-amber-500 to-orange-500',
        };
      default:
        return {
          badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
          icon: <AlertOctagon className="w-4 h-4 text-rose-400" />,
          accent: 'from-rose-500 to-red-600',
        };
    }
  };

  const verdictStyle = getVerdictStyle(scorecard.verdict);

  return (
    <div className="w-full space-y-4 text-slate-200">
      {/* Top Banner: Verdict & Overall Quality Grade */}
      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 backdrop-blur-md shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${verdictStyle.badge} flex items-center justify-center`}>
              {verdictStyle.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${verdictStyle.badge}`}>
                  PROCTOR VERDICT: {scorecard.verdict}
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  Grade {scorecard.grade}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-slate-100 mt-1">
                Nova Chief Critic Quality Scorecard
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Verified against anti-hallucination, math sanity, and security boundaries.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Score Pill */}
            <div className="text-right">
              <div className="text-2xl font-black font-mono tracking-tight text-slate-100">
                {scorecard.overallScore}<span className="text-xs text-slate-500">/100</span>
              </div>
              <span className="text-[10px] font-mono uppercase text-slate-400">Composite Score</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3">
              <button
                type="button"
                onClick={() => {
                  sound.playStart();
                  setRefreshKey(prev => prev + 1);
                }}
                title="Re-run verification audit"
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleCopyAudit}
                title="Copy full audit report"
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden mt-4 border border-slate-800">
          <div 
            className={`h-full bg-gradient-to-r ${verdictStyle.accent} transition-all duration-500`}
            style={{ width: `${scorecard.overallScore}%` }}
          />
        </div>
      </div>

      {/* 5 Core Verification Metric Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
        {/* Metric 1: Factuality Index */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <FileSearch className="w-3.5 h-3.5 text-teal-400" />
              <span>Factuality Index</span>
            </span>
            <span className="font-mono font-bold text-teal-300">
              {scorecard.metrics.factualityIndex.score}%
            </span>
          </div>
          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-teal-400 rounded-full"
              style={{ width: `${scorecard.metrics.factualityIndex.score}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            Ground truth alignment & citation density.
          </p>
        </div>

        {/* Metric 2: Hallucination Risk (Inverted metric: lower is better) */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Hallucination Risk</span>
            </span>
            <span className={`font-mono font-bold ${
              scorecard.metrics.hallucinationRisk.score <= 12 ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {scorecard.metrics.hallucinationRisk.score}%
            </span>
          </div>
          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${
                scorecard.metrics.hallucinationRisk.score <= 12 ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
              style={{ width: `${Math.min(100, scorecard.metrics.hallucinationRisk.score * 2.5)}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            Probability of ungrounded or speculative claims.
          </p>
        </div>

        {/* Metric 3: Mathematical Sanity */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <Calculator className="w-3.5 h-3.5 text-cyan-400" />
              <span>Mathematical Sanity</span>
            </span>
            <span className="font-mono font-bold text-cyan-300">
              {scorecard.metrics.mathSanity.score}%
            </span>
          </div>
          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-cyan-400 rounded-full"
              style={{ width: `${scorecard.metrics.mathSanity.score}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            Zero-division proof, variance bounds, positive weights.
          </p>
        </div>

        {/* Metric 4: Security Hardening */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Security Guardrail</span>
            </span>
            <span className="font-mono font-bold text-emerald-300">
              {scorecard.metrics.securityHardening.score}%
            </span>
          </div>
          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-400 rounded-full"
              style={{ width: `${scorecard.metrics.securityHardening.score}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            Prompt injection, eval evasion, and script defenses.
          </p>
        </div>

        {/* Metric 5: Completeness & Rigor */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <Scale className="w-3.5 h-3.5 text-purple-400" />
              <span>Rigor & Structure</span>
            </span>
            <span className="font-mono font-bold text-purple-300">
              {scorecard.metrics.completenessRigor.score}%
            </span>
          </div>
          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-purple-400 rounded-full"
              style={{ width: `${scorecard.metrics.completenessRigor.score}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            Counter-arguments, takeaways, and structural completeness.
          </p>
        </div>
      </div>

      {/* Itemized Audit Assertions List */}
      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-200 uppercase font-mono">
              Audit Assertions ({scorecard.assertions.filter(a => a.passed).length}/{scorecard.assertions.length})
            </span>
          </div>

          {/* Filter badges */}
          <div className="flex items-center gap-1 text-[10px] font-mono">
            {['all', 'failed', 'factuality', 'math', 'security'].map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCategory(cat)}
                className={`px-2 py-0.5 rounded cursor-pointer transition ${
                  filterCategory === cat
                    ? 'bg-slate-800 text-teal-300 font-semibold border border-slate-700'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {cat.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {filteredAssertions.map((assertion) => (
            <div
              key={assertion.id}
              className={`p-3 rounded-lg border flex items-start gap-3 transition ${
                assertion.passed
                  ? 'bg-slate-900/40 border-slate-800/80 text-slate-300'
                  : assertion.severity === 'critical'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {assertion.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : assertion.severity === 'critical' ? (
                  <AlertOctagon className="w-4 h-4 text-rose-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
              </div>

              <div className="min-w-0 flex-1 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-200">
                    {assertion.description}
                  </span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded uppercase bg-slate-950 border border-slate-800 text-slate-400">
                      {assertion.category}
                    </span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded uppercase ${
                      assertion.severity === 'critical'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : assertion.severity === 'high'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {assertion.severity}
                    </span>
                  </div>
                </div>

                {assertion.details && (
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">
                    {assertion.details}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Improvements */}
      {scorecard.recommendedImprovements.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
          <span className="text-xs font-semibold text-teal-300 uppercase font-mono flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>Critic Proctor Recommendations</span>
          </span>
          <div className="space-y-1.5">
            {scorecard.recommendedImprovements.map((rec, i) => (
              <div 
                key={i}
                className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-teal-400 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-300 text-[11px]">{rec}</p>
                </div>
                {onApplyImprovement && (
                  <button
                    type="button"
                    onClick={() => onApplyImprovement(rec)}
                    className="flex-shrink-0 px-2 py-0.5 rounded bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 text-[10px] font-mono font-medium border border-teal-500/30 transition cursor-pointer"
                  >
                    Apply Fix
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
