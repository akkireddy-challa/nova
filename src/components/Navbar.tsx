'use client';

import React from 'react';
import { StudioMode } from '@/lib/types';
import { 
  Sparkles, 
  Compass, 
  ListTodo, 
  BarChart2, 
  Scale, 
  Code2, 
  Brain, 
  PlusCircle, 
  Cpu
} from 'lucide-react';

interface Props {
  currentMode: StudioMode;
  onSelectMode: (mode: StudioMode) => void;
  onOpenMemory: () => void;
  onNewSession: () => void;
  memoryCount: number;
}

export function Navbar({ 
  currentMode, 
  onSelectMode, 
  onOpenMemory, 
  onNewSession,
  memoryCount 
}: Props) {
  const modes: { id: StudioMode; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'research', label: 'Deep Research', icon: <Compass className="w-3.5 h-3.5" />, desc: 'Autonomous crawling & citations' },
    { id: 'planner', label: 'Goal Planner', icon: <ListTodo className="w-3.5 h-3.5" />, desc: 'Interactive DAG & execution' },
    { id: 'canvas', label: 'Generative Visuals', icon: <BarChart2 className="w-3.5 h-3.5" />, desc: 'Interactive charts & telemetry' },
    { id: 'matrix', label: 'Decision Matrix', icon: <Scale className="w-3.5 h-3.5" />, desc: 'Multi-criteria dynamic scoring' },
    { id: 'coder', label: 'Synthesizer', icon: <Code2 className="w-3.5 h-3.5" />, desc: 'Modular architecture & code' },
  ];

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-4 md:px-6 flex items-center justify-between">
      {/* Brand logo & tagline */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 via-indigo-500 to-purple-500 p-0.5 shadow-lg shadow-teal-500/20">
          <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-teal-400" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-100 text-base tracking-tight font-sans">
              NOVA
            </span>
            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20">
              v1.0 Open Source
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            The Autonomous Intelligence Studio for Everyone
          </p>
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <nav className="hidden lg:flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
        {modes.map(m => {
          const isActive = currentMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onSelectMode(m.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                isActive
                  ? 'bg-slate-800 text-teal-300 shadow-sm border border-slate-700/80'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {m.icon}
              <span>{m.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right actions: Memory, Model Status, New Session, Github */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Model status pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
          <Cpu className="w-3.5 h-3.5 text-teal-400" />
          <span className="font-mono">Gemini 2.0 / Local</span>
        </div>

        {/* Memory context button */}
        <button
          onClick={onOpenMemory}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs transition"
          title="Personal Context Memory"
        >
          <Brain className="w-3.5 h-3.5 text-teal-400" />
          <span className="hidden sm:inline">Context</span>
          {memoryCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-teal-500 text-slate-950 font-bold text-[9px] flex items-center justify-center">
              {memoryCount}
            </span>
          )}
        </button>

        {/* New Session */}
        <button
          onClick={onNewSession}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition shadow-sm"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Goal</span>
        </button>
      </div>
    </header>
  );
}
