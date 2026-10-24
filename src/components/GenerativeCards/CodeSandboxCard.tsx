'use client';

import React, { useState } from 'react';
import { CodeArtifact } from '@/lib/types';
import { Code2, Copy, Check, Download, Terminal } from 'lucide-react';

interface Props {
  codeArtifact: CodeArtifact;
}

export function CodeSandboxCard({ codeArtifact }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeArtifact.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([codeArtifact.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = codeArtifact.filename || 'solution.ts';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full my-4 rounded-xl border border-slate-700/80 bg-slate-900/90 backdrop-blur-md overflow-hidden shadow-2xl transition-all">
      {/* Header bar */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono font-medium text-slate-200">
            {codeArtifact.filename}
          </span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            {codeArtifact.language}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="Download file"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Code Area */}
      <div className="p-4 bg-slate-950/90 overflow-x-auto text-xs font-mono leading-relaxed text-slate-200">
        <pre>{codeArtifact.code}</pre>
      </div>

      {/* Explanation */}
      {codeArtifact.explanation && (
        <div className="p-3 bg-slate-900 border-t border-slate-800 text-xs text-slate-400 leading-relaxed">
          <span className="font-semibold text-cyan-400">Implementation Note: </span>
          {codeArtifact.explanation}
        </div>
      )}
    </div>
  );
}
