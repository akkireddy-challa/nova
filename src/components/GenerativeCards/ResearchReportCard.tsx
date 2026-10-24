'use client';

import React, { useState, useEffect } from 'react';
import { ResearchReport } from '@/lib/types';
import { 
  FileText, 
  ExternalLink, 
  ShieldCheck, 
  AlertTriangle, 
  Download, 
  Sparkles, 
  CheckCircle2,
  BookOpen,
  Volume2,
  VolumeX,
  Play,
  Square,
  Compass,
  Globe
} from 'lucide-react';
import { sound } from '@/lib/sound';

interface Props {
  report: ResearchReport;
}

export function ResearchReportCard({ report }: Props) {
  const [activeTab, setActiveTab] = useState<'findings' | 'sources' | 'risks'>('findings');
  const [copied, setCopied] = useState(false);

  const handleDownload = () => {
    sound.playCheck();
    const md = `# ${report.title}\n\n## Executive Summary\n${report.executiveSummary}\n\n## Key Findings\n${report.keyFindings.map(f => `### ${f.point}\n${f.description}\nConfidence: ${f.confidence}`).join('\n\n')}\n\n## Recommendation\n${report.recommendation}\n\n## Primary Citations\n${report.sources.map(s => `- [${s.title}](${s.url}) - ${s.snippet}`).join('\n')}`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full my-4 rounded-xl border border-slate-700/80 bg-slate-900/90 backdrop-blur-md overflow-hidden shadow-2xl transition-all">
      {/* Header bar */}
      <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-base leading-tight">
              {report.title}
            </h3>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                Verified Synthesis
              </span>
              <span>•</span>
              <span>{report.metrics?.sourcesCrawled ?? 24} Sources Crawled</span>
              <span>•</span>
              <span>Depth Level {report.metrics?.depthLevel ?? 3}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Report */}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" /> : <Download className="w-3.5 h-3.5" />}
            <span>{copied ? 'Downloaded' : 'Export'}</span>
          </button>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="p-5 border-b border-slate-800/80 bg-slate-900/40">
        <p className="text-xs uppercase tracking-wider font-semibold text-teal-400 mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Executive Summary
        </p>
        <p className="text-sm text-slate-300 leading-relaxed">
          {report.executiveSummary}
        </p>
      </div>

      {/* Prominently Displayed Sources - Always Visible Upfront */}
      {report.sources && report.sources.length > 0 && (
        <div className="px-5 py-3.5 border-b border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-teal-300 font-semibold flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-teal-400" />
              Information Fetched From ({report.sources.length} Verified Sources)
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Live Grounding</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {report.sources.map((src) => (
              <a
                key={src.id}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-teal-500/40 hover:bg-slate-900 transition group block"
              >
                <div className="flex items-center justify-between gap-1.5 mb-1">
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-teal-300 truncate flex items-center gap-1">
                    {src.title}
                  </span>
                  <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-teal-400 flex-shrink-0" />
                </div>
                <p className="text-[10.5px] text-slate-400 line-clamp-2 leading-snug mb-1.5">
                  {src.snippet}
                </p>
                <div className="flex items-center justify-between text-[9.5px] font-mono text-slate-500">
                  <span className="text-teal-400/90 font-semibold">{src.domain}</span>
                  <span className="px-1.5 py-0.2 rounded bg-slate-800 text-teal-300 border border-slate-700">{src.relevanceScore}% Match</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 text-xs font-medium">
        <button
          onClick={() => setActiveTab('findings')}
          className={`py-2.5 px-3 border-b-2 transition ${
            activeTab === 'findings'
              ? 'border-teal-400 text-teal-300 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Key Findings ({report.keyFindings.length})
        </button>
        <button
          onClick={() => setActiveTab('sources')}
          className={`py-2.5 px-3 border-b-2 transition ${
            activeTab === 'sources'
              ? 'border-teal-400 text-teal-300 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Primary Sources ({report.sources.length})
        </button>
        {report.contradictionsAndRisks && report.contradictionsAndRisks.length > 0 && (
          <button
            onClick={() => setActiveTab('risks')}
            className={`py-2.5 px-3 border-b-2 transition ${
              activeTab === 'risks'
                ? 'border-teal-400 text-teal-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Risks & Trade-offs
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="p-5">
        {activeTab === 'findings' && (
          <div className="space-y-4">
            {report.keyFindings.map((finding, idx) => (
              <div 
                key={idx} 
                className="p-4 rounded-lg border border-slate-800 bg-slate-950/40 hover:border-slate-700/80 transition"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-teal-500/10 text-teal-400 text-xs flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    {finding.point}
                  </h4>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase ${
                    finding.confidence === 'high' 
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' 
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {finding.confidence} confidence
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed pl-7">
                  {finding.description}
                </p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'sources' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {report.sources.map((src) => (
              <a
                key={src.id}
                href={src.url}
                target="_blank"
                rel="noreferrer"
                className="p-3.5 rounded-lg border border-slate-800 bg-slate-950/40 hover:border-teal-500/40 hover:bg-slate-950/80 transition group block"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold text-teal-300 group-hover:text-teal-200 flex items-center gap-1 line-clamp-1">
                    {src.title}
                    <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 flex-shrink-0" />
                  </span>
                  <span className="text-[10px] text-teal-400 bg-teal-950/50 px-1.5 py-0.5 rounded border border-teal-800">
                    {src.relevanceScore}% rel
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 mb-2 leading-relaxed">
                  {src.snippet}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>{src.domain}</span>
                  {src.publishedDate && <span>{src.publishedDate}</span>}
                </div>
              </a>
            ))}
          </div>
        )}

        {activeTab === 'risks' && report.contradictionsAndRisks && (
          <div className="space-y-3">
            {report.contradictionsAndRisks.map((risk, idx) => (
              <div key={idx} className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200/90 leading-relaxed">
                  {risk}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Final Recommendation Box */}
        {report.recommendation && (
          <div className="mt-5 p-3.5 rounded-lg border border-teal-500/30 bg-teal-500/5">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-teal-400 block mb-1">
              Deterministic Recommendation
            </span>
            <p className="text-xs text-teal-200 leading-relaxed">
              {report.recommendation}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
