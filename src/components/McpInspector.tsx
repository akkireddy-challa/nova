'use client';

import React, { useState } from 'react';
import { McpTool } from '@/lib/types';
import { 
  Server, 
  CheckCircle2, 
  ExternalLink, 
  Cpu, 
  Terminal, 
  HardDrive, 
  Globe, 
  Database, 
  FolderGit2, 
  Play, 
  X,
  Sparkles
} from 'lucide-react';
import { sound } from '@/lib/sound';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function McpInspector({ isOpen, onClose }: Props) {
  const [tools, setTools] = useState<McpTool[]>([
    {
      id: 'tool-fs',
      name: 'filesystem_read_write',
      server: 'Local Filesystem Server',
      description: 'Provides zero-telemetry, bounded read/write access to user authorized project workspaces.',
      enabled: true,
      latencyMs: 4,
      inputSchemaSummary: 'path: string, content?: string',
    },
    {
      id: 'tool-web',
      name: 'autonomous_web_crawler',
      server: 'Multi-Source Crawler MCP',
      description: 'Recursively scrapes primary sources, verifies SSL certificates, and extracts clean markdown.',
      enabled: true,
      latencyMs: 42,
      inputSchemaSummary: 'query: string, maxDepth: number, domains?: string[]',
    },
    {
      id: 'tool-vec',
      name: 'vector_semantic_search',
      server: 'Local SQLite + Vector Store',
      description: 'High-speed cosine similarity retrieval across user documents, past sessions, and notes.',
      enabled: true,
      latencyMs: 8,
      inputSchemaSummary: 'embedding: float[], topK: number',
    },
    {
      id: 'tool-git',
      name: 'git_repository_inspector',
      server: 'GitHub & Local Git MCP',
      description: 'Inspects branches, diffs, commit histories, and pull requests directly within agent context.',
      enabled: true,
      latencyMs: 15,
      inputSchemaSummary: 'repoPath: string, ref: string',
    },
  ]);

  const [testResult, setTestResult] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleTool = (id: string) => {
    sound.playCheck();
    setTools(prev =>
      prev.map(t => (t.id === id ? { ...t, enabled: !t.enabled } : t))
    );
  };

  const testTool = (tool: McpTool) => {
    setTestingId(tool.id);
    sound.playStart();
    setTimeout(() => {
      setTestResult(`Ping successful for [${tool.name}] via ${tool.server}. Response time: ${tool.latencyMs}ms. Status: Ready.`);
      setTestingId(null);
      sound.playSuccess();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-100 text-sm">
                  Model Context Protocol (MCP) Registry
                </h3>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Active V1.0
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Connected tools, servers, and capabilities available to the autonomous agent swarm
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tools List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {tools.map(tool => (
            <div
              key={tool.id}
              className={`p-4 rounded-xl border transition ${
                tool.enabled
                  ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  : 'bg-slate-950/20 border-slate-800/40 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-teal-400">
                    <Terminal className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100 font-mono">
                      {tool.name}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {tool.server}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/60">
                    {tool.latencyMs}ms ping
                  </span>

                  {/* Toggle button */}
                  <button
                    onClick={() => toggleTool(tool.id)}
                    className={`w-9 h-5 rounded-full transition relative ${
                      tool.enabled ? 'bg-teal-500' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-slate-950 transition transform absolute top-0.75 ${
                        tool.enabled ? 'left-4.5' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                {tool.description}
              </p>

              <div className="flex items-center justify-between text-[11px] pt-2.5 border-t border-slate-800/60 text-slate-400">
                <code className="text-[10px] text-slate-400 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  params: {tool.inputSchemaSummary}
                </code>

                <button
                  onClick={() => testTool(tool)}
                  disabled={!tool.enabled || testingId === tool.id}
                  className="flex items-center gap-1 text-teal-400 hover:text-teal-300 disabled:opacity-40 transition font-medium"
                >
                  <Play className="w-3 h-3" />
                  <span>{testingId === tool.id ? 'Testing...' : 'Test Tool'}</span>
                </button>
              </div>
            </div>
          ))}

          {/* Test results alert */}
          {testResult && (
            <div className="p-3.5 rounded-xl border border-teal-500/30 bg-teal-500/10 text-xs text-teal-200 flex items-start gap-2 animate-in fade-in">
              <Sparkles className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
              <span>{testResult}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span>Open Protocol Standard Active</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
