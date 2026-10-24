'use client';

import React from 'react';
import { StudioMode, Session } from '@/lib/types';
import { 
  Compass, 
  ListTodo, 
  BarChart2, 
  Scale, 
  Code2, 
  Clock, 
  Sparkles, 
  FolderGit2, 
  ChevronRight, 
  Lightbulb,
  GitBranch,
  Trash2,
  Settings as SettingsIcon
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
  const modes: { id: StudioMode; label: string; icon: React.ReactNode }[] = [
    { id: 'research', label: 'Deep Research', icon: <Compass className="w-4 h-4" /> },
    { id: 'planner', label: 'Goal DAG Planner', icon: <ListTodo className="w-4 h-4" /> },
    { id: 'canvas', label: 'Generative Visuals', icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'matrix', label: 'Decision Matrix', icon: <Scale className="w-4 h-4" /> },
    { id: 'coder', label: 'Synthesizer', icon: <Code2 className="w-4 h-4" /> },
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
    <aside className="w-72 border-r border-slate-800 bg-slate-950/60 hidden md:flex flex-col h-[calc(100vh-4rem)]">
      {/* Studio Modes */}
      <div className="p-4 border-b border-slate-800/80">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Autonomous Engines
        </p>
        <div className="space-y-1">
          {modes.map(m => {
            const isActive = currentMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => { sound.playCheck(); onSelectMode(m.id); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? 'bg-slate-900 text-teal-300 border border-slate-700/80 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={isActive ? 'text-teal-400' : 'text-slate-500'}>
                    {m.icon}
                  </span>
                  <span>{m.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-teal-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Preset Starters */}
      <div className="p-4 border-b border-slate-800/80 flex-shrink-0">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
          Quick Starters
        </p>
        <div className="space-y-2">
          {presets.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => onApplyPrompt(preset.prompt, preset.mode)}
              className="w-full text-left p-2.5 rounded-lg border border-slate-800/80 bg-slate-900/40 hover:bg-slate-900 hover:border-teal-500/30 transition group"
            >
              <span className="text-[11px] font-medium text-slate-300 group-hover:text-teal-300 line-clamp-2 leading-snug">
                {preset.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Saved Sessions History with 1-Click Workspace Deletion */}
      <div className="p-4 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Recent Workspaces ({sessions.length})
          </p>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500">
            No active sessions yet. Enter any goal or question to begin.
          </div>
        ) : (
          <div className="space-y-1.5">
            {sessions.map(s => {
              const isSelected = s.id === activeSessionId;
              return (
                <div
                  key={s.id}
                  onClick={() => onSelectSession(s.id)}
                  className={`group w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-teal-300 border border-slate-700/80 font-medium'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                  }`}
                >
                  <p className="truncate flex-1 mr-2">{s.title}</p>
                  
                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDelete(e, s.id)}
                    className="p-1 rounded text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition"
                    title="Delete workspace"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Settings & Architecture Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/80 text-[11px] space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => { sound.playStart(); onOpenSettings?.(); }}
            className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition text-[11px] font-medium"
          >
            <SettingsIcon className="w-3.5 h-3.5 text-teal-400" />
            <span>Settings</span>
          </button>

          <button
            onClick={() => { sound.playStart(); onOpenDevHub?.(); }}
            className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition text-[11px] font-medium"
          >
            <GitBranch className="w-3.5 h-3.5 text-teal-400" />
            <span>Dev Hub</span>
          </button>
        </div>

        <div className="flex items-center justify-between text-slate-500 px-1 text-[10px]">
          <span className="flex items-center gap-1">
            <FolderGit2 className="w-3 h-3 text-slate-400" />
            MIT Open Source
          </span>
          <span>BYOM & Local</span>
        </div>
      </div>
    </aside>
  );
}
