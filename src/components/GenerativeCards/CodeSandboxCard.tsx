'use client';

import React, { useState } from 'react';
import { CodeArtifact } from '@/lib/types';
import { Code2, Copy, Check, Download, Terminal, Eye, Play } from 'lucide-react';
import { sound } from '@/lib/sound';

interface Props {
  codeArtifact: CodeArtifact;
}

export function CodeSandboxCard({ codeArtifact }: Props) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');

  const handleCopy = () => {
    sound.playCheck();
    navigator.clipboard.writeText(codeArtifact.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    sound.playCheck();
    const blob = new Blob([codeArtifact.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = codeArtifact.filename || 'solution.ts';
    a.click();
    URL.revokeObjectURL(url);
  };

  const canPreview = 
    codeArtifact.language === 'html' || 
    codeArtifact.language === 'svg' || 
    codeArtifact.code.includes('<!DOCTYPE') ||
    codeArtifact.code.includes('<html') ||
    codeArtifact.code.includes('<div');

  const previewSource = codeArtifact.previewHtml || `
    <!DOCTYPE html>
    <html>
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>body { background: #090d16; color: #f8fafc; font-family: sans-serif; padding: 24px; }</style>
      </head>
      <body>
        ${codeArtifact.code.replace(/export default function.*{/g, '').replace(/return \(/g, '').replace(/\);?\s*}/g, '')}
      </body>
    </html>
  `;

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
          {/* Live Preview Toggle */}
          {canPreview && (
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-[11px]">
              <button
                onClick={() => setViewMode('code')}
                className={`px-2 py-1 rounded transition ${
                  viewMode === 'code' ? 'bg-slate-700 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Code
              </button>
              <button
                onClick={() => { sound.playStart(); setViewMode('preview'); }}
                className={`flex items-center gap-1 px-2 py-1 rounded transition ${
                  viewMode === 'preview' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Live Preview</span>
              </button>
            </div>
          )}

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

      {/* Code or Live Preview Content */}
      {viewMode === 'code' ? (
        <div className="p-4 bg-slate-950/90 overflow-x-auto text-xs font-mono leading-relaxed text-slate-200">
          <pre>{codeArtifact.code}</pre>
        </div>
      ) : (
        <div className="p-4 bg-slate-950/90">
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60 min-h-[220px]">
            <iframe
              srcDoc={previewSource}
              sandbox="allow-scripts"
              className="w-full h-64 border-0"
              title="Code Preview"
            />
          </div>
        </div>
      )}

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
