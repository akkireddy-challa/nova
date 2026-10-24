'use client';

import React, { useState } from 'react';
import { StudioMode, ModelProvider } from '@/lib/types';
import { ModelEntry, ModelsStatus, providerLabel } from '@/lib/client/models';
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
} from 'lucide-react';
import { sound } from '@/lib/sound';

interface Props {
  currentMode: StudioMode;
  onSelectMode: (m: StudioMode) => void;
  onOpenMemory: () => void;
  onOpenPalette: () => void;
  onNewSession: () => void;
  memoryCount: number;
  models: ModelEntry[];
  modelsStatus: ModelsStatus;
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
  models,
  modelsStatus,
  currentModel, 
  onSelectModel 
}: Props) {
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

  const getModeLabel = (mode: StudioMode) => {
    switch (mode) {
      case 'research': return { label: 'Research', icon: <Compass className="w-3.5 h-3.5 text-teal-400" /> };
      case 'debate': return { label: 'Debate', icon: <Users className="w-3.5 h-3.5 text-purple-400" /> };
      case 'planner': return { label: 'Plan', icon: <ListTodo className="w-3.5 h-3.5 text-cyan-400" /> };
      case 'canvas': return { label: 'Chart', icon: <BarChart2 className="w-3.5 h-3.5 text-amber-400" /> };
      case 'matrix': return { label: 'Compare', icon: <Scale className="w-3.5 h-3.5 text-emerald-400" /> };
      case 'coder': return { label: 'Code', icon: <Code2 className="w-3.5 h-3.5 text-rose-400" /> };
      case 'intelligence': return { label: 'Memory Search', icon: <Brain className="w-3.5 h-3.5 text-purple-400" /> };
      case 'mcp': return { label: 'Tools & API', icon: <Puzzle className="w-3.5 h-3.5 text-teal-400" /> };
      default: return { label: 'Nova', icon: <Sparkles className="w-3.5 h-3.5 text-teal-400" /> };
    }
  };

  const toggleSound = () => {
    const next = sound.toggleMute();
    setIsMuted(next);
    if (!next) sound.playCheck();
  };

  const selectedModel = models.find(m => m.id === currentModel);
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

      {/* Right Actions: Model Selector, Memory Drawer, Command Palette, Sound */}
      <div className="flex items-center gap-2">
        {/* Model Selector Dropdown (from GET /api/v1/models) */}
        <div className="relative">
          <button
            onClick={() => models.length > 0 && setModelDropdownOpen(!modelDropdownOpen)}
            disabled={models.length === 0}
            title={selectedModel ? selectedModel.id : undefined}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition cursor-pointer disabled:cursor-default disabled:hover:bg-slate-900"
          >
            <Cpu className="w-3.5 h-3.5 text-teal-400" />
            {selectedModel ? (
              <>
                <span className="text-[10px] font-mono text-teal-400 bg-teal-950/60 px-1 py-0.2 rounded border border-teal-800/40">
                  {providerLabel(selectedModel.provider, selectedModel.ownedBy)}
                </span>
                <span className="font-mono text-xs max-w-[180px] truncate">{selectedModel.model}</span>
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </>
            ) : (
              <span className="font-mono text-xs text-slate-500">
                {modelsStatus === 'loading' ? 'Loading models…' : modelsStatus === 'error' ? 'Models unavailable' : 'No model configured'}
              </span>
            )}
          </button>

          {modelDropdownOpen && models.length > 0 && (
            <div className="absolute right-0 mt-2 w-72 max-h-80 overflow-y-auto rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-1.5 z-50 animate-in fade-in">
              <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Model
              </div>
              {models.map(m => (
                <button
                  key={m.id}
                  onClick={() => {
                    sound.playCheck();
                    onSelectModel(m.id);
                    setModelDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs text-left transition cursor-pointer ${
                    currentModel === m.id
                      ? 'bg-slate-800 text-teal-300 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <span className="font-mono truncate">{m.model}</span>
                  <span className="flex items-center gap-1 shrink-0">
                    {m.isDefault && (
                      <span className="text-[10px] text-slate-500">default</span>
                    )}
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                      {providerLabel(m.provider, m.ownedBy)}
                    </span>
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
          title="Memory (⌘J)"
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
          title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-500" /> : <Volume2 className="w-3.5 h-3.5 text-teal-400" />}
        </button>

        {/* Quick New Session Button */}
        <button
          onClick={() => { sound.playCheck(); onNewSession(); }}
          className="px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-medium transition flex items-center gap-1 cursor-pointer"
          title="New session"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New</span>
        </button>
      </div>
    </header>
  );
}
