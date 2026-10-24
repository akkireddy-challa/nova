'use client';

import React from 'react';
import { SwarmAgentState } from '@/lib/types';
import { Sparkles, Compass, ShieldCheck, Palette, Cpu, CheckCircle } from 'lucide-react';

interface Props {
  isExecuting: boolean;
  activeMode: string;
}

export function SwarmHUD({ isExecuting, activeMode }: Props) {
  const agents = [
    {
      id: 'strategist',
      name: 'Lead Strategist',
      role: 'Inquiry Planner',
      icon: <Sparkles className="w-3.5 h-3.5" />,
      color: 'from-blue-500 to-indigo-500',
      activeColor: 'text-blue-400 border-blue-500/40 bg-blue-500/10',
    },
    {
      id: 'crawler',
      name: 'Crawler & MCP',
      role: 'Autonomous Search',
      icon: <Compass className="w-3.5 h-3.5" />,
      color: 'from-teal-500 to-cyan-500',
      activeColor: 'text-teal-400 border-teal-500/40 bg-teal-500/10',
    },
    {
      id: 'verifier',
      name: 'Fact Verifier',
      role: 'Anti-Hallucination',
      icon: <ShieldCheck className="w-3.5 h-3.5" />,
      color: 'from-amber-500 to-orange-500',
      activeColor: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
    },
    {
      id: 'synthesizer',
      name: 'Generative UI',
      role: 'Artifact Engine',
      icon: <Palette className="w-3.5 h-3.5" />,
      color: 'from-purple-500 to-pink-500',
      activeColor: 'text-purple-400 border-purple-500/40 bg-purple-500/10',
    },
  ];

  return (
    <div className="w-full px-4 py-2 bg-slate-950/70 border-b border-slate-800/80 backdrop-blur-md">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 overflow-x-auto py-1 scrollbar-none">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400">
            <span className={`w-1.5 h-1.5 rounded-full ${isExecuting ? 'bg-teal-400 animate-ping' : 'bg-slate-500'}`} />
            <span>SWARM PIPELINE</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          {agents.map((agent, index) => {
            const isActive = isExecuting;
            return (
              <div key={agent.id} className="flex items-center gap-1.5 sm:gap-2">
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition duration-300 ${
                    isActive
                      ? agent.activeColor
                      : 'border-slate-800/80 bg-slate-900/40 text-slate-400'
                  }`}
                >
                  <span className={isActive ? 'animate-pulse' : 'text-slate-500'}>
                    {agent.icon}
                  </span>
                  <div className="flex flex-col text-left">
                    <span className="text-[11px] font-semibold leading-none text-slate-200">
                      {agent.name}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono leading-tight">
                      {agent.role}
                    </span>
                  </div>
                </div>

                {index < agents.length - 1 && (
                  <span className="text-slate-700 text-xs font-mono">→</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
