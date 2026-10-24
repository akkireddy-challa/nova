'use client';

import React from 'react';
import { DebateArtifact } from '@/lib/types';
import { Users, CheckCircle, AlertTriangle, ShieldCheck, Sparkles, Scale } from 'lucide-react';

interface Props {
  debate: DebateArtifact;
}

export function DebateCard({ debate }: Props) {
  return (
    <div className="w-full my-4 rounded-xl border border-slate-700/80 bg-slate-900/90 backdrop-blur-md overflow-hidden shadow-2xl transition-all">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm leading-tight">
              {debate.topic}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Dual-Agent Deliberation & Counter-Perspective Analysis
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono uppercase bg-indigo-950/60 text-indigo-300 border border-indigo-800 px-2.5 py-1 rounded-full">
          Multi-Perspective
        </span>
      </div>

      {/* Consensus Summary */}
      <div className="p-4 bg-slate-900/40 border-b border-slate-800 text-xs text-slate-300 leading-relaxed">
        <span className="font-semibold text-teal-400 block mb-1">Deliberation Summary:</span>
        {debate.consensusSummary}
      </div>

      {/* Side-by-Side Perspectives */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800">
        {debate.perspectives.map((p, idx) => {
          const isAdvocate = p.stance === 'Advocate';
          return (
            <div key={idx} className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${isAdvocate ? 'bg-teal-400' : 'bg-rose-400'}`} />
                  <h4 className="font-bold text-slate-100 text-xs">{p.agentName}</h4>
                </div>
                <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border ${
                  isAdvocate 
                    ? 'bg-teal-500/10 text-teal-300 border-teal-500/30' 
                    : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                }`}>
                  {p.stance}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mb-1.5">
                  Core Theses
                </span>
                <ul className="space-y-1.5">
                  {p.arguments.map((arg, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-300 leading-snug">
                      <span className={`mt-0.5 text-xs ${isAdvocate ? 'text-teal-400' : 'text-rose-400'}`}>•</span>
                      <span>{arg}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {p.caveats && p.caveats.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] uppercase font-semibold text-amber-400 tracking-wider block mb-1">
                    Blind Spots & Caveats
                  </span>
                  <ul className="space-y-1">
                    {p.caveats.map((cav, i) => (
                      <li key={i} className="text-[11px] text-slate-400 flex items-start gap-1.5">
                        <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                        <span>{cav}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Synthesis Verdict */}
      <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-start gap-2.5">
        <Scale className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-200 leading-relaxed">
          <span className="font-semibold text-indigo-300">Synthesized Equilibrium Verdict: </span>
          {debate.synthesisVerdict}
        </div>
      </div>
    </div>
  );
}
