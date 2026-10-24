'use client';

import React, { useState } from 'react';
import { ProctorScorecardArtifact } from '@/lib/types';
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  FileSearch, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Download,
  Volume2
} from 'lucide-react';
import { sound } from '@/lib/sound';
import { VoiceBriefingPlayer } from '../VoiceBriefing/VoiceBriefingPlayer';

interface Props {
  artifact: ProctorScorecardArtifact;
}

export function CriticProctorScorecardCard({ artifact }: Props) {
  const { scorecard } = artifact;
  const [expanded, setExpanded] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'failed'>('all');
  const [showAudioBriefing, setShowAudioBriefing] = useState(false);

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case 'APPROVED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm shadow-emerald-500/10">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>APPROVED BY PROCTOR</span>
          </span>
        );
      case 'FLAGGED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 shadow-sm shadow-amber-500/10">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>FLAGGED FOR SCRUTINY</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 shadow-sm shadow-rose-500/10">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>PROCTOR QUARANTINED</span>
          </span>
        );
    }
  };

  const filteredAudits = selectedFilter === 'failed' 
    ? scorecard.audits.filter(a => !a.passed)
    : scorecard.audits;

  const spokenBriefing = `Continuous Critic Proctor evaluation for ${artifact.title}. Status: ${scorecard.verdict} with an overall score of ${scorecard.overallScore} out of 100. Factuality index is ${scorecard.factualityIndex} percent. Hallucination risk is rated ${scorecard.hallucinationRisk}. Adversarial critique: ${scorecard.adversarialCritique}.`;

  return (
    <div className="w-full my-4 rounded-xl border border-slate-700/80 bg-slate-900/90 backdrop-blur-md overflow-hidden shadow-2xl transition-all">
      {/* Header bar */}
      <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-base leading-tight">
              {artifact.title}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
              <span>Overall Score: <strong className="text-amber-300">{scorecard.overallScore}/100</strong></span>
              <span>•</span>
              <span>Audit Rules: {scorecard.audits.length}</span>
              <span>•</span>
              <span>{scorecard.timestamp}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {getVerdictBadge(scorecard.verdict)}

          <button
            type="button"
            onClick={() => {
              sound.playTap();
              setShowAudioBriefing(prev => !prev);
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title="Read proctor assessment aloud"
          >
            <Volume2 className="w-4 h-4 text-amber-400" />
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playTap();
              setExpanded(prev => !prev);
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Spoken Proctor Briefing */}
      {showAudioBriefing && (
        <div className="p-4 border-b border-slate-800 bg-slate-950/40 animate-in fade-in">
          <VoiceBriefingPlayer 
            rawBriefingText={spokenBriefing}
            title="Proctor Audit Verbal Readout"
          />
        </div>
      )}

      {expanded && (
        <div className="p-5 space-y-5">
          {/* 4 Core Dimensions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Factuality Triangulation</span>
                <span className="font-mono font-bold text-teal-300">{scorecard.factualityIndex}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-teal-400 rounded-full" 
                  style={{ width: `${scorecard.factualityIndex}%` }} 
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Hallucination Defense</span>
                <span className="font-mono font-bold text-emerald-300 capitalize">{scorecard.hallucinationRisk} Risk</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-400 rounded-full" 
                  style={{ width: `${100 - scorecard.hallucinationRiskScore}%` }} 
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Security & Injection</span>
                <span className="font-mono font-bold text-purple-300">{scorecard.safetyGuardrailScore}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-400 rounded-full" 
                  style={{ width: `${scorecard.safetyGuardrailScore}%` }} 
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Logical Coherence</span>
                <span className="font-mono font-bold text-cyan-300">{scorecard.coherenceScore}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-cyan-400 rounded-full" 
                  style={{ width: `${scorecard.coherenceScore}%` }} 
                />
              </div>
            </div>
          </div>

          {/* Adversarial Critique Commentary */}
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Adversarial Critic Critique</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {scorecard.adversarialCritique}
            </p>
            {scorecard.remediationSteps && scorecard.remediationSteps.length > 0 && (
              <div className="pt-2 border-t border-amber-500/20">
                <span className="text-[11px] font-mono uppercase text-amber-400 block mb-1">
                  Required Remediation Directives:
                </span>
                <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
                  {scorecard.remediationSteps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Rule Audits List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200">Continuous Proctor Rule Audits</span>
              <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedFilter('all')}
                  className={`px-2 py-0.5 rounded text-[11px] transition ${
                    selectedFilter === 'all' ? 'bg-slate-800 text-teal-300 font-medium' : 'text-slate-400'
                  }`}
                >
                  All ({scorecard.audits.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFilter('failed')}
                  className={`px-2 py-0.5 rounded text-[11px] transition ${
                    selectedFilter === 'failed' ? 'bg-slate-800 text-rose-300 font-medium' : 'text-slate-400'
                  }`}
                >
                  Failures ({scorecard.audits.filter(a => !a.passed).length})
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {filteredAudits.map((audit) => (
                <div 
                  key={audit.id}
                  className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 transition ${
                    audit.passed 
                      ? 'bg-slate-950/40 border-slate-800 text-slate-300' 
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                  }`}
                >
                  {audit.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold truncate">{audit.rule}</span>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 text-slate-400">
                        {audit.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{audit.explanation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
