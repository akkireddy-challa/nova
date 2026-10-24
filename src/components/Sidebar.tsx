'use client';

import React from 'react';
import { StudioMode, Session } from '@/lib/types';
import { 
  Bot, 
  Brain, 
  Puzzle, 
  CheckCircle2, 
  Plus, 
  Clock, 
  Trash2, 
  ChevronRight, 
  Sparkles, 
  FolderGit2, 
  Settings as SettingsIcon,
  Compass,
  MessageSquare
} from 'lucide-react';
import { sound } from '@/lib/sound';

interface Props {
  currentMode: StudioMode;
  onSelectMode: (mode: StudioMode) => void;
  sessions: Session[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onDeleteSession?: (id: string) => void;
  onApplyPrompt: (prompt: string, mode: StudioMode) => void;
  onOpenDevHub?: () => void;
  onOpenSettings?: () => void;
}

export function Sidebar({
  currentMode,
  onSelectMode,
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onApplyPrompt,
  onOpenDevHub,
  onOpenSettings,
}: Props) {
  // 4 Primary Workspaces - Radically simplified, zero duplication
  const isStudioMode = ['research', 'debate', 'planner', 'canvas', 'matrix', 'coder'].includes(currentMode);

  const workspaces = [
    { 
      id: 'research' as StudioMode, 
      label: 'Studio Workspace', 
      icon: <MessageSquare className="w-4 h-4" />,
      isActive: isStudioMode,
      description: 'Research, Debate, Planner & Visuals'
    },
    { 
      id: 'intelligence' as StudioMode, 
      label: 'Embeddings v2', 
      icon: <Brain className="w-4 h-4" />,
      isActive: currentMode === 'intelligence',
      badge: '3072d'
    },
    { 
      id: 'mcp' as StudioMode, 
      label: 'Plugins & APIs', 
      icon: <Puzzle className="w-4 h-4" />,
      isActive: currentMode === 'mcp',
      badge: 'MCP'
    },
    { 
      id: 'evals' as StudioMode, 
      label: 'Evals & Benchmarks', 
      icon: <CheckCircle2 className="w-4 h-4" />,
      isActive: currentMode === 'evals',
      badge: '100%'
    },
  ];

  const presets = [
    {
      label: 'Is the Agent Harness Dead?',
      mode: 'research' as StudioMode,
      prompt: 'Is the Agent Harness Dead? Analyze lightweight code loops, MCP, and evaluation-driven design.',
    },
    {
      label: 'Build an Open-Source MCP Server in 14 Days',
      mode: 'planner' as StudioMode,
      prompt: 'Decompose a milestone execution plan to create, test, and release a high-impact Model Context Protocol server.',
    },
    {
      label: 'Evaluate Local LLMs vs Closed Frontier APIs',
      mode: 'matrix' as StudioMode,
      prompt: 'Compare self-hosted open-weight models against cloud APIs for privacy, latency, and cost.',
    },
  ];

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    sound.playCheck();
    onDeleteSession?.(id);
  };

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-slate-950/70 hidden md:flex flex-col h-[calc(100vh-3.5rem)] select-none">
      {/* Primary Workspaces Navigation */}
      <div className="p-3 border-b border-slate-800/80 space-y-1">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 py-1">
          Workspaces
        </p>
        {workspaces.map(w => {
          return (
            <button
              key={w.label}
              onClick={() => { sound.playCheck(); onSelectMode(w.id); }}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                w.isActive
                  ? 'bg-slate-900 text-teal-300 border border-slate-800 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={w.isActive ? 'text-teal-400' : 'text-slate-500'}>
                  {w.icon}
                </span>
                <span>{w.label}</span>
              </div>
              {w.badge ? (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  {w.badge}
                </span>
              ) : w.isActive ? (
                <ChevronRight className="w-3.5 h-3.5 text-teal-400" />
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Recent Sessions List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="flex items-center justify-between px-2 py-1">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Recent Sessions
          </p>
          <span className="text-[10px] font-mono text-slate-500">{sessions.length}</span>
        </div>

        {sessions.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500">
            No previous sessions yet. Start prompting in the studio!
          </div>
        ) : (
          sessions.map(s => {
            const isActive = s.id === activeSessionId;
            return (
              <div
                key={s.id}
                onClick={() => { sound.playCheck(); onSelectSession(s.id); }}
                className={`group flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-teal-300 font-medium border border-slate-800'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Clock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  <span className="truncate max-w-[150px]">{s.title || 'Untitled Session'}</span>
                </div>
                {onDeleteSession && (
                  <button
                    onClick={(e) => handleDelete(e, s.id)}
                    title="Delete workspace session"
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-red-400 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })
        )}

        {/* Quick Starter Presets */}
        <div className="pt-4">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 py-1 mb-1">
            Featured Inquiries
          </p>
          <div className="space-y-1">
            {presets.map((p, idx) => (
              <button
                key={idx}
                onClick={() => {
                  sound.playCheck();
                  onApplyPrompt(p.prompt, p.mode);
                }}
                className="w-full text-left p-2 rounded-lg bg-slate-900/40 hover:bg-slate-900 border border-slate-800/60 hover:border-slate-700 transition cursor-pointer text-[11px]"
              >
                <div className="text-slate-300 font-medium line-clamp-1">{p.label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pinned Bottom Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/80 space-y-1">
        <button
          onClick={() => { sound.playCheck(); onOpenSettings?.(); }}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition cursor-pointer"
        >
          <SettingsIcon className="w-4 h-4 text-slate-400" />
          <span>Settings & BYOM Keys</span>
        </button>

        <button
          onClick={() => { sound.playCheck(); onOpenDevHub?.(); }}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition cursor-pointer"
        >
          <FolderGit2 className="w-4 h-4 text-teal-400" />
          <span>Architecture Dev Hub</span>
        </button>
      </div>
    </aside>
  );
}
