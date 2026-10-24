'use client';

import React, { useState } from 'react';
import { StudioMode, ModelProvider } from '@/lib/types';
import { 
  Sparkles, 
  Compass, 
  ListTodo, 
  BarChart2, 
  Scale, 
  Code2, 
  Brain, 
  PlusCircle, 
  Cpu,
  Server,
  Volume2,
  VolumeX,
  Command,
  ChevronDown,
  Users
} from 'lucide-react';
import { sound } from '@/lib/sound';

interface Props {
  currentMode: StudioMode;
  onSelectMode: (mode: StudioMode) => void;
  onOpenMemory: () => void;
  onOpenMcp: () => void;
  onOpenPalette: () => void;
  onNewSession: () => void;
  memoryCount: number;
  currentModel: ModelProvider;
  onSelectModel: (m: ModelProvider) => void;
}

export function Navbar({ 
  currentMode, 
  onSelectMode, 
  onOpenMemory, 
  onOpenMcp,
  onOpenPalette,
  onNewSession,
  memoryCount,
  currentModel,
  onSelectModel,
}: Props) {
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

  const modes: { id: StudioMode; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'research', label: 'Deep Research', icon: <Compass className="w-3.5 h-3.5" />, desc: 'Autonomous crawling & citations' },
    { id: 'debate', label: 'Dual-Agent Debate', icon: <Users className="w-3.5 h-3.5" />, desc: 'Side-by-side consensus analysis' },
    { id: 'planner', label: 'Goal Planner', icon: <ListTodo className="w-3.5 h-3.5" />, desc: 'Interactive DAG & execution' },
    { id: 'canvas', label: 'Visuals', icon: <BarChart2 className="w-3.5 h-3.5" />, desc: 'Interactive charts & telemetry' },
    { id: 'matrix', label: 'Decision Matrix', icon: <Scale className="w-3.5 h-3.5" />, desc: 'Multi-criteria dynamic scoring' },
    { id: 'coder', label: 'Synthesizer', icon: <Code2 className="w-3.5 h-3.5" />, desc: 'Modular architecture & preview' },
  ];

  const models: { id: ModelProvider; name: string; tag: string }[] = [
    { id: 'gemini-3-flash', name: 'Gemini 3.0 Flash', tag: 'Next-Gen ⚡' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', tag: 'Stable Workhorse' },
    { id: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet', tag: 'Hybrid Thinking' },
    { id: 'deepseek-r1', name: 'DeepSeek R1', tag: 'Open Reasoning' },
    { id: 'o3-mini', name: 'OpenAI o3-mini', tag: 'Math / Logic' },
    { id: 'llama-3-3-local', name: 'Llama 3.3 70B', tag: 'Local Ollama' },
  ];

  const toggleSound = () => {
    const next = sound.toggleMute();
    setIsMuted(next);
    if (!next) sound.playCheck();
  };

  const selectedModelObj = models.find(m => m.id === currentModel) || models[0];

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
              v1.5 Frontier
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Autonomous Intelligence Studio for Everyone
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
              onClick={() => { sound.playCheck(); onSelectMode(m.id); }}
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

      {/* Right actions: Command Palette, Model Selector, MCP, Memory, Sound, New Session */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        <button
          onClick={onOpenPalette}
          className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs transition font-mono"
          title="Open Command Palette (⌘K)"
        >
          <Command className="w-3.5 h-3.5 text-teal-400" />
          <span>⌘K</span>
        </button>

        {/* Model Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition"
          >
            <Cpu className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden xl:inline font-mono">{selectedModelObj.name}</span>
            <span className="text-[10px] font-mono text-teal-400 bg-teal-950/40 px-1 py-0.2 rounded border border-teal-800/50">
              {selectedModelObj.tag}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-500" />
          </button>

          {modelDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-1.5 z-50 animate-in fade-in">
              <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Select Active Frontier Model
              </div>
              {models.map(m => (
                <button
                  key={m.id}
                  onClick={() => {
                    sound.playCheck();
                    onSelectModel(m.id);
                    setModelDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-left transition ${
                    currentModel === m.id
                      ? 'bg-slate-800 text-teal-300 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <span className="font-medium">{m.name}</span>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                    {m.tag}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* MCP Registry Button */}
        <button
          onClick={onOpenMcp}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs transition"
          title="Model Context Protocol (MCP) Tools"
        >
          <Server className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">MCP</span>
        </button>

        {/* Memory context button */}
        <button
          onClick={onOpenMemory}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs transition"
          title="Personal Context Memory"
        >
          <Brain className="w-3.5 h-3.5 text-pink-400" />
          <span className="hidden sm:inline">Context</span>
          {memoryCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-teal-500 text-slate-950 font-bold text-[9px] flex items-center justify-center">
              {memoryCount}
            </span>
          )}
        </button>

        {/* Sound toggle */}
        <button
          onClick={toggleSound}
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition"
          title={isMuted ? 'Audio muted' : 'Audio active'}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-500" /> : <Volume2 className="w-3.5 h-3.5 text-teal-400" />}
        </button>

        {/* New Session */}
        <button
          onClick={() => { sound.playStart(); onNewSession(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition shadow-sm"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Goal</span>
        </button>
      </div>
    </header>
  );
}
