'use client';

import React, { useState, useEffect } from 'react';
import { StudioMode } from '@/lib/types';
import { 
  Search, 
  Compass, 
  ListTodo, 
  BarChart2, 
  Scale, 
  Code2, 
  Brain, 
  Server, 
  Volume2, 
  VolumeX, 
  Sparkles,
  Command,
  ArrowRight,
  X
} from 'lucide-react';
import { sound } from '@/lib/sound';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: StudioMode) => void;
  onOpenMemory: () => void;
  onOpenPlugins: () => void;
  onNewSession: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onSelectMode,
  onOpenMemory,
  onOpenPlugins,
  onNewSession,
}: Props) {
  const [query, setQuery] = useState('');
  const [isMuted, setIsMuted] = useState(sound.getMuted());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        isOpen ? onClose() : null; // Handled by parent toggle
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    {
      id: 'mode-research',
      label: 'Research',
      category: 'Modes',
      icon: <Compass className="w-4 h-4 text-teal-400" />,
      run: () => { onSelectMode('research'); onClose(); },
    },
    {
      id: 'mode-debate',
      label: 'Debate',
      category: 'Modes',
      icon: <Scale className="w-4 h-4 text-indigo-400" />,
      run: () => { onSelectMode('debate'); onClose(); },
    },
    {
      id: 'mode-planner',
      label: 'Plan',
      category: 'Modes',
      icon: <ListTodo className="w-4 h-4 text-indigo-400" />,
      run: () => { onSelectMode('planner'); onClose(); },
    },
    {
      id: 'mode-canvas',
      label: 'Chart',
      category: 'Modes',
      icon: <BarChart2 className="w-4 h-4 text-emerald-400" />,
      run: () => { onSelectMode('canvas'); onClose(); },
    },
    {
      id: 'mode-matrix',
      label: 'Compare',
      category: 'Modes',
      icon: <Scale className="w-4 h-4 text-purple-400" />,
      run: () => { onSelectMode('matrix'); onClose(); },
    },
    {
      id: 'mode-coder',
      label: 'Code',
      category: 'Modes',
      icon: <Code2 className="w-4 h-4 text-cyan-400" />,
      run: () => { onSelectMode('coder'); onClose(); },
    },
    {
      id: 'mcp-tools',
      label: 'Tools & API',
      category: 'Workspaces',
      icon: <Server className="w-4 h-4 text-amber-400" />,
      run: () => { onOpenPlugins(); onClose(); },
    },
    {
      id: 'open-memory',
      label: 'Memory',
      category: 'Workspaces',
      icon: <Brain className="w-4 h-4 text-pink-400" />,
      run: () => { onOpenMemory(); onClose(); },
    },
    {
      id: 'new-session',
      label: 'New session',
      category: 'Session',
      icon: <Sparkles className="w-4 h-4 text-yellow-400" />,
      run: () => { onNewSession(); onClose(); },
    },
    {
      id: 'toggle-sound',
      label: isMuted ? 'Unmute sounds' : 'Mute sounds',
      category: 'Preferences',
      icon: isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-teal-400" />,
      run: () => {
        const next = sound.toggleMute();
        setIsMuted(next);
        if (!next) sound.playCheck();
        onClose();
      },
    },
  ];

  const filtered = actions.filter(a =>
    a.label.toLowerCase().includes(query.toLowerCase()) ||
    a.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
        {/* Search Input bar */}
        <div className="px-4 py-3.5 border-b border-slate-800 flex items-center gap-3 bg-slate-950/60">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command or switch mode..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono bg-slate-800 text-slate-400 rounded border border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="p-2 overflow-y-auto space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No matching commands found.
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                onClick={item.run}
                className="w-full px-3 py-2.5 rounded-xl hover:bg-slate-800/80 text-left transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 group-hover:border-slate-700">
                    {item.icon}
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block group-hover:text-teal-300">
                      {item.label}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {item.category}
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-teal-400 transition transform group-hover:translate-x-0.5" />
              </button>
            ))
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-slate-800 bg-slate-950/80 text-[10px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span className="font-mono">NOVA PALETTE</span>
        </div>
      </div>
    </div>
  );
}
