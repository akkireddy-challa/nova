'use client';

import React, { useState } from 'react';
import { StudioMode, ModelProvider } from '@/lib/types';
import { 
  Sparkles, 
  Cpu, 
  Volume2, 
  VolumeX, 
  Command, 
  ChevronDown, 
  Plus, 
  Brain, 
  Compass, 
  Users, 
  ListTodo, 
  BarChart2, 
  Scale, 
  Code2, 
  Puzzle, 
  CheckCircle2,
  Server
} from 'lucide-react';
import { sound } from '@/lib/sound';

interface Props {
  currentMode: StudioMode;
  onSelectMode: (m: StudioMode) => void;
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
  onOpenPalette, 
  onNewSession, 
  memoryCount, 
  currentModel, 
  onSelectModel 
}: Props) {
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

  const models: { id: ModelProvider; name: string; tag: string }[] = [
    { id: 'gemini-3-flash', name: 'Gemini 3.0 Flash', tag: 'Next-Gen ⚡' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', tag: 'Production' },
    { id: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet', tag: 'Hybrid' },
    { id: 'deepseek-r1', name: 'DeepSeek R1', tag: 'Open Weights' },
    { id: 'o3-mini', name: 'OpenAI o3-mini', tag: 'Reasoning' },
    { id: 'llama-3-3-local', name: 'Llama 3.3 70B', tag: 'Ollama Local' },
  ];

  const getModeLabel = (mode: StudioMode) => {
    switch (mode) {
      case 'research': return { label: 'Deep Research', icon: <Compass className="w-3.5 h-3.5 text-teal-400" /> };
      case 'debate': return { label: 'Dual-Agent Debate', icon: <Users className="w-3.5 h-3.5 text-purple-400" /> };
      case 'planner': return { label: 'Goal DAG Planner', icon: <ListTodo className="w-3.5 h-3.5 text-cyan-400" /> };
      case 'canvas': return { label: 'Generative Visuals', icon: <BarChart2 className="w-3.5 h-3.5 text-amber-400" /> };
      case 'matrix': return { label: 'Decision Matrix', icon: <Scale className="w-3.5 h-3.5 text-emerald-400" /> };
      case 'coder': return { label: 'Synthesizer', icon: <Code2 className="w-3.5 h-3.5 text-rose-400" /> };
      case 'intelligence': return { label: 'Embeddings v2', icon: <Brain className="w-3.5 h-3.5 text-purple-400" /> };
      case 'mcp': return { label: 'Plugins & APIs', icon: <Puzzle className="w-3.5 h-3.5 text-teal-400" /> };
      case 'evals': return { label: 'Evals & Benchmarks', icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> };
      default: return { label: 'Autonomous Studio', icon: <Sparkles className="w-3.5 h-3.5 text-teal-400" /> };
    }
  };

  const toggleSound = () => {
    const next = sound.toggleMute();
    setIsMuted(next);
    if (!next) sound.playCheck();
  };

  const selectedModelObj = models.find(m => m.id === currentModel) || models[0];
  const modeInfo = getModeLabel(currentMode);

  return (
    <header className="h-14 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-4 md:px-6 flex items-center justify-between">
      {/* Left: Brand & Clean Breadcrumb */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-teal-500 via-indigo-500 to-purple-500 p-0.5 shadow-sm">
            <div className="w-full h-full bg-slate-950 rounded-[6px] flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            </div>
          </div>
          <span className="font-bold text-slate-100 text-sm tracking-tight">
            NOVA
          </span>
        </div>

        <span className="text-slate-600 text-xs">/</span>

        {/* Current Active Mode Breadcrumb */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs">
          {modeInfo.icon}
          <span className="font-medium text-slate-200">{modeInfo.label}</span>
        </div>
      </div>

      {/* Center: Simplified Status Indicator */}
      <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-400">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-mono text-slate-300">Local-First Autonomous Runtime</span>
        <span className="text-slate-600">•</span>
        <span className="text-slate-400">3072-dim Embeddings v2</span>
      </div>

      {/* Right Actions: Model Selector, Memory Drawer, Command Palette, Sound */}
      <div className="flex items-center gap-2">
        {/* Model Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition cursor-pointer"
          >
            <Cpu className="w-3.5 h-3.5 text-teal-400" />
            <span className="font-mono text-xs">{selectedModelObj.name}</span>
            <span className="text-[10px] font-mono text-teal-400 bg-teal-950/60 px-1 py-0.2 rounded border border-teal-800/40">
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
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-left transition cursor-pointer ${
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

        {/* Personal Knowledge Memory Button */}
        <button
          onClick={() => { sound.playCheck(); onOpenMemory(); }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs transition cursor-pointer"
          title="Personal Context & Memories (⌘J)"
        >
          <Brain className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden sm:inline font-mono text-[11px]">{memoryCount} Memories</span>
        </button>

        {/* Command Palette Button */}
        <button
          onClick={onOpenPalette}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs transition font-mono cursor-pointer"
          title="Open Command Palette (⌘K)"
        >
          <Command className="w-3 h-3 text-teal-400" />
          <span>⌘K</span>
        </button>

        {/* Audio Mute/Unmute */}
        <button
          onClick={toggleSound}
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition cursor-pointer"
          title={isMuted ? 'Unmute Audio Haptics' : 'Mute Audio Haptics'}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-500" /> : <Volume2 className="w-3.5 h-3.5 text-teal-400" />}
        </button>

        {/* Quick New Session Button */}
        <button
          onClick={() => { sound.playCheck(); onNewSession(); }}
          className="px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-medium transition flex items-center gap-1 cursor-pointer"
          title="Start Fresh Session"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New</span>
        </button>
      </div>
    </header>
  );
}
