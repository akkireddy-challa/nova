'use client';

import React, { useState } from 'react';
import { DecisionMatrix } from '@/lib/types';
import { Scale, Trophy, Check, X } from 'lucide-react';

interface Props {
  matrix: DecisionMatrix;
}

export function DecisionMatrixCard({ matrix }: Props) {
  // Allow user to dynamically adjust weights to see scores update in real time!
  const [weights, setWeights] = useState<Record<string, number>>(
    matrix.criteria.reduce((acc, c) => ({ ...acc, [c.id]: c.weight }), {})
  );

  const handleWeightChange = (cid: string, val: number) => {
    setWeights(prev => ({ ...prev, [cid]: val }));
  };

  // Recalculate options based on current weights
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
  const computedOptions = matrix.options.map(opt => {
    let scoreSum = 0;
    matrix.criteria.forEach(c => {
      const w = weights[c.id] ?? c.weight;
      const s = opt.scores[c.id] ?? 5;
      scoreSum += s * w;
    });
    const weightedAvg = (scoreSum / totalWeight).toFixed(1);
    return {
      ...opt,
      currentScore: parseFloat(weightedAvg),
    };
  }).sort((a, b) => b.currentScore - a.currentScore);

  const winner = computedOptions[0];

  return (
    <div className="w-full my-4 rounded-xl border border-slate-700/80 bg-slate-900/90 backdrop-blur-md overflow-hidden shadow-2xl transition-all">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm leading-tight">
              {matrix.topic}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Interactive Multi-Variable Decision Matrix
            </p>
          </div>
        </div>

        {winner && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-full text-xs font-semibold">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Leader: {winner.name.split('(')[0]} ({winner.currentScore}/10)</span>
          </div>
        )}
      </div>

      {/* Weight sliders */}
      <div className="p-4 bg-slate-950/40 border-b border-slate-800">
        <p className="text-[11px] uppercase font-semibold text-slate-400 mb-2">
          Adjust Criteria Priority (Dynamic Recalculation)
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {matrix.criteria.map(c => (
            <div key={c.id} className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span className="truncate">{c.name}</span>
                <span className="font-bold text-purple-400 font-mono">{weights[c.id]}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={weights[c.id]}
                onChange={e => handleWeightChange(c.id, parseInt(e.target.value))}
                className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Comparison Cards / Table */}
      <div className="p-4 space-y-3">
        {computedOptions.map((opt, rank) => {
          const isTop = rank === 0;
          return (
            <div
              key={opt.id}
              className={`p-4 rounded-xl border transition ${
                isTop 
                  ? 'bg-purple-950/20 border-purple-500/40 shadow-lg' 
                  : 'bg-slate-950/40 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isTop ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    #{rank + 1}
                  </span>
                  <h4 className="text-sm font-semibold text-slate-100">{opt.name}</h4>
                </div>
                <div className="text-right">
                  <span className={`text-base font-bold font-mono ${
                    isTop ? 'text-purple-400' : 'text-slate-300'
                  }`}>
                    {opt.currentScore} / 10
                  </span>
                </div>
              </div>

              {/* Pros & Cons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-teal-400 block mb-1">
                    Strengths
                  </span>
                  <ul className="space-y-1">
                    {opt.pros.map((p, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-slate-300">
                        <Check className="w-3.5 h-3.5 text-teal-400 flex-shrink-0 mt-0.5" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-rose-400 block mb-1">
                    Considerations
                  </span>
                  <ul className="space-y-1">
                    {opt.cons.map((c, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-slate-400">
                        <X className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Verdict */}
      <div className="p-3.5 bg-slate-950/70 border-t border-slate-800 text-xs text-slate-300 leading-relaxed">
        <span className="font-semibold text-purple-400">Verdict: </span>
        {matrix.verdict}
      </div>
    </div>
  );
}
