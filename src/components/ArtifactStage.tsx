'use client';

import React, { useState } from 'react';
import { 
  GenerativeArtifact, 
  CodeArtifact, 
  ResearchReport, 
  GoalPlan, 
  ChartArtifact, 
  DecisionMatrix, 
  DebateArtifact 
} from '@/lib/types';
import { 
  X, 
  Maximize2, 
  Minimize2, 
  Copy, 
  Check, 
  Download, 
  Play, 
  FileCode, 
  Sparkles, 
  Share2, 
  ExternalLink,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { sound } from '@/lib/sound';

interface Props {
  artifact: GenerativeArtifact;
  onClose: () => void;
  onRefinePrompt?: (prompt: string) => void;
}

export function ArtifactStage({ artifact, onClose, onRefinePrompt }: Props) {
  const [activeTab, setActiveTab] = useState<'preview' | 'raw'>('preview');
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [matrixWeights, setMatrixWeights] = useState<Record<string, number>>(() => {
    if (artifact.type === 'matrix') {
      const initial: Record<string, number> = {};
      artifact.data.criteria.forEach(c => {
        initial[c.id] = c.weight;
      });
      return initial;
    }
    return {};
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    sound.playCheck();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    let filename = 'nova-artifact';
    let content = '';
    let mimeType = 'text/plain';

    if (artifact.type === 'code') {
      filename = artifact.data.filename || 'code.ts';
      content = artifact.data.code;
    } else if (artifact.type === 'research') {
      filename = `${artifact.data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
      content = `# ${artifact.data.title}\n\n## Executive Summary\n${artifact.data.executiveSummary}\n\n## Key Findings\n` +
        artifact.data.keyFindings.map(f => `### ${f.point}\n${f.description}\n`).join('\n') +
        `\n## Recommendation\n${artifact.data.recommendation}\n`;
      mimeType = 'text/markdown';
    } else {
      filename = `${artifact.type}-artifact.json`;
      content = JSON.stringify(artifact.data, null, 2);
      mimeType = 'application/json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    sound.playSuccess();
  };

  const getTitle = () => {
    switch (artifact.type) {
      case 'code':
        return artifact.data.filename || 'Code';
      case 'research':
        return artifact.data.title || 'Research';
      case 'plan':
        return artifact.data.goal || 'Plan';
      case 'chart':
        return artifact.data.title || 'Chart';
      case 'matrix':
        return artifact.data.topic || 'Comparison';
      case 'debate':
        return artifact.data.topic || 'Debate';
    }
  };

  return (
    <div className={`h-full flex flex-col bg-slate-900 border-l border-slate-800 transition-all duration-300 z-20 ${
      isFullscreen ? 'fixed inset-0 z-50 bg-slate-950' : 'w-full md:w-[480px] lg:w-[560px] xl:w-[640px]'
    }`}>
      {/* Header Bar */}
      <div className="h-14 px-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70 backdrop-blur-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-teal-300 border border-slate-700">
                {artifact.type}
              </span>
              <h3 className="text-xs font-semibold text-slate-200 truncate">
                {getTitle()}
              </h3>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleDownload}
            title="Download artifact"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(prev => !prev)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={onClose}
            title="Close Stage"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 py-2 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => { sound.playCheck(); setActiveTab('preview'); }}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
              activeTab === 'preview'
                ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            Preview
          </button>
          <button
            type="button"
            onClick={() => { sound.playCheck(); setActiveTab('raw'); }}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
              activeTab === 'raw'
                ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            Raw {artifact.type === 'code' ? 'Code' : 'JSON'}
          </button>
        </div>

      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'raw' ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => handleCopy(artifact.type === 'code' ? artifact.data.code : JSON.stringify(artifact.data, null, 2))}
              className="absolute top-2.5 right-2.5 p-1.5 rounded-md bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
              {artifact.type === 'code' ? artifact.data.code : JSON.stringify(artifact.data, null, 2)}
            </pre>
          </div>
        ) : (
          <div>
            {/* CODE ARTIFACT */}
            {artifact.type === 'code' && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                  <span className="font-semibold text-teal-400 block mb-1">Notes:</span>
                  {artifact.data.explanation}
                </div>

                <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                  <div className="h-8 px-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>{artifact.data.filename} ({artifact.data.language})</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(artifact.data.code)}
                      className="flex items-center gap-1 hover:text-slate-200 transition cursor-pointer"
                    >
                      {copied ? <Check className="w-3 h-3 text-teal-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[420px] leading-relaxed">
                    {artifact.data.code}
                  </pre>
                </div>

              </div>
            )}

            {/* RESEARCH ARTIFACT */}
            {artifact.type === 'research' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <h4 className="text-xs font-semibold text-teal-400 mb-1.5 uppercase font-mono">Executive Summary</h4>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {artifact.data.executiveSummary}
                  </p>
                </div>

                {/* Verified Grounding Sources & Origins */}
                {artifact.data.sources && artifact.data.sources.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-teal-300 uppercase font-mono flex items-center justify-between">
                      <span>Sources ({artifact.data.sources.length})</span>
                    </h4>
                    <div className="space-y-2">
                      {artifact.data.sources.map((src) => (
                        <a
                          key={src.id}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-teal-500/40 hover:bg-slate-900/60 transition group block"
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-xs font-semibold text-slate-200 group-hover:text-teal-300 truncate">
                              {src.title}
                            </span>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-teal-400 flex-shrink-0" />
                          </div>
                          <p className="text-[11px] text-slate-400 leading-snug line-clamp-2 mb-1.5">
                            {src.snippet}
                          </p>
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                            <span className="text-teal-400 font-medium">{src.domain}</span>
                            {src.relevanceScore !== undefined && (
                              <span className="px-1.5 py-0.2 rounded bg-slate-900 text-teal-300 border border-slate-800">{src.relevanceScore}% Match</span>
                            )}
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-300 uppercase font-mono">Key findings</h4>
                  {artifact.data.keyFindings.map((finding, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-200">{finding.point}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase ${
                          finding.confidence === 'high' 
                            ? 'bg-teal-500/10 text-teal-300 border border-teal-500/20' 
                            : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                        }`}>
                          {finding.confidence}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{finding.description}</p>
                    </div>
                  ))}
                </div>

                {artifact.data.contradictionsAndRisks && artifact.data.contradictionsAndRisks.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-1 text-xs text-rose-300">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <span>Caveats and risks</span>
                    </div>
                    {artifact.data.contradictionsAndRisks.map((risk, i) => (
                      <p key={i} className="text-[11px] text-rose-300/80">• {risk}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* MATRIX ARTIFACT WITH INTERACTIVE SLIDERS */}
            {artifact.type === 'matrix' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-teal-400" />
                      <span>Criteria weights</span>
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {artifact.data.criteria.map(crit => (
                      <div key={crit.id} className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-300">{crit.name}</span>
                          <span className="font-mono text-teal-400 font-semibold">{matrixWeights[crit.id] ?? crit.weight}x</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          step="1"
                          value={matrixWeights[crit.id] ?? crit.weight}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setMatrixWeights(prev => ({ ...prev, [crit.id]: val }));
                          }}
                          className="w-full accent-teal-400 bg-slate-800 h-1 rounded cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold text-slate-300 uppercase font-mono">Options</h4>
                  {artifact.data.options.map(opt => {
                    let dynamicScore = 0;
                    let totalWeight = 0;
                    artifact.data.criteria.forEach(c => {
                      const w = matrixWeights[c.id] ?? c.weight;
                      totalWeight += w;
                      dynamicScore += (opt.scores[c.id] || 0) * w;
                    });
                    const finalAvg = totalWeight > 0 ? (dynamicScore / totalWeight).toFixed(1) : '0.0';

                    return (
                      <div key={opt.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-100">{opt.name}</span>
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-teal-500/15 text-teal-300 border border-teal-500/30">
                            Score: {finalAvg} / 10
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="text-emerald-400/90 space-y-0.5">
                            <span className="font-semibold block text-[10px] uppercase font-mono">Pros:</span>
                            {opt.pros.map((p, i) => <div key={i}>+ {p}</div>)}
                          </div>
                          <div className="text-rose-400/90 space-y-0.5">
                            <span className="font-semibold block text-[10px] uppercase font-mono">Cons:</span>
                            {opt.cons.map((c, i) => <div key={i}>- {c}</div>)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PLAN ARTIFACT */}
            {artifact.type === 'plan' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10.5px] font-mono text-cyan-400 uppercase font-semibold">Timeframe: {artifact.data.timeframe}</div>
                  <h4 className="text-xs font-semibold text-slate-200 mt-1">{artifact.data.goal}</h4>
                  <p className="text-xs text-slate-400 mt-1">{artifact.data.overview}</p>
                </div>

                <div className="space-y-3">
                  {artifact.data.phases.map(phase => (
                    <div key={phase.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-teal-300">{phase.phaseName}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                          {phase.tasks.length} tasks
                        </span>
                      </div>
                      <div className="space-y-1.5 pt-1">
                        {phase.tasks.map(task => (
                          <div key={task.id} className="flex items-start gap-2 text-xs text-slate-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <span className="font-medium">{task.title}</span>
                              <p className="text-[11px] text-slate-500">{task.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CHART ARTIFACT */}
            {artifact.type === 'chart' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                  <span className="font-semibold text-teal-400 block mb-1">Takeaway:</span>
                  {artifact.data.insight}
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-xs font-semibold text-slate-200 block mb-2 font-mono uppercase">Data</span>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="text-[10.5px] uppercase font-mono text-slate-500 border-b border-slate-800">
                        <tr>
                          <th className="pb-2">Label</th>
                          <th className="pb-2">Value</th>
                          {artifact.data.data[0]?.secondaryValue !== undefined && (
                            <th className="pb-2">Secondary</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {artifact.data.data.map((d, i) => (
                          <tr key={i} className="hover:bg-slate-900/40">
                            <td className="py-2 text-slate-200 font-sans">{d.label}</td>
                            <td className="py-2 text-teal-400 font-semibold">{d.value}</td>
                            {d.secondaryValue !== undefined && (
                              <td className="py-2 text-cyan-400">{d.secondaryValue}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* DEBATE ARTIFACT */}
            {artifact.type === 'debate' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10.5px] font-mono text-teal-400 uppercase font-semibold">Verdict</span>
                  <p className="text-xs text-slate-200 mt-1 leading-relaxed">{artifact.data.synthesisVerdict}</p>
                </div>

                <div className="space-y-3">
                  {artifact.data.perspectives.map((persp, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-200">{persp.agentName}</span>
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-teal-400">
                          {persp.stance}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs text-slate-300">
                        {persp.arguments.map((arg, i) => (
                          <p key={i} className="leading-relaxed">• {arg}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Refine / Iteration Footer */}
      {onRefinePrompt && (
        <div className="p-3 bg-slate-950 border-t border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span className="font-semibold text-slate-300">Follow-ups:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {artifact.type === 'code' ? (
              <>
                <button
                  type="button"
                  onClick={() => onRefinePrompt('Add strict TypeScript error handling, type definitions, and edge case assertions.')}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-teal-300 transition cursor-pointer"
                >
                  + Add TypeScript types
                </button>
                <button
                  type="button"
                  onClick={() => onRefinePrompt('Write unit tests for this code, including edge cases.')}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-teal-300 transition cursor-pointer"
                >
                  + Write unit tests
                </button>
              </>
            ) : artifact.type === 'matrix' ? (
              <>
                <button
                  type="button"
                  onClick={() => onRefinePrompt('Add another relevant option to this comparison.')}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-teal-300 transition cursor-pointer"
                >
                  + Add an option
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onRefinePrompt('Find more sources and cite them for each finding.')}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-teal-300 transition cursor-pointer"
                >
                  + More sources
                </button>
                <button
                  type="button"
                  onClick={() => onRefinePrompt('Highlight counter-arguments and failure modes.')}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-teal-300 transition cursor-pointer"
                >
                  + Counter-arguments
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
