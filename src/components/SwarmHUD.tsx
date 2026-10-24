'use client';

import React, { useEffect, useState } from 'react';
import { 
  Sparkles, 
  Compass, 
  ShieldCheck, 
  Palette, 
  CheckCircle2, 
  Activity, 
  Cpu, 
  Zap,
  Layers
} from 'lucide-react';

interface Props {
  isExecuting: boolean;
  activeMode: string;
}

export function SwarmHUD({ isExecuting, activeMode }: Props) {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [uncertainty, setUncertainty] = useState<number>(0.04);

  const agents = [
    {
      id: 'architect',
      name: 'Architect Swarm',
      role: 'DAG & System Planner',
      icon: <Sparkles className="w-3.5 h-3.5" />,
      color: 'from-blue-500 to-indigo-500',
      activeColor: 'text-blue-400 border-blue-500/40 bg-blue-500/10',
    },
    {
      id: 'data_scientist',
      name: 'Data Science Center',
      role: 'Token & Vector Analytics',
      icon: <Activity className="w-3.5 h-3.5" />,
      color: 'from-emerald-500 to-teal-500',
      activeColor: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
    },
    {
      id: 'developer',
      name: 'Developer Engine',
      role: 'MCP Tools & Sandbox',
      icon: <Cpu className="w-3.5 h-3.5" />,
      color: 'from-purple-500 to-violet-500',
      activeColor: 'text-purple-400 border-purple-500/40 bg-purple-500/10',
    },
    {
      id: 'critic_proctor',
      name: 'Critic Proctor',
      role: 'Adversarial Scorecard',
      icon: <ShieldCheck className="w-3.5 h-3.5" />,
      color: 'from-amber-500 to-rose-500',
      activeColor: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
    },
  ];

  // Dynamic step animation while executing
  useEffect(() => {
    if (!isExecuting) {
      setActiveStep(0);
      setUncertainty(0.04);
      return;
    }

    const interval = setInterval(() => {
      setActiveStep(prev => (prev + 1) % agents.length);
      setUncertainty(Math.round((0.02 + Math.random() * 0.05) * 100) / 100);
    }, 1800);

    return () => clearInterval(interval);
  }, [isExecuting, agents.length]);

  const confidencePercent = Math.round((1 - uncertainty) * 100);

  return (
    <div className="w-full px-4 py-2 bg-slate-950/80 border-b border-slate-800/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 overflow-x-auto py-0.5 scrollbar-none">
        {/* Left Badge: CoAct Pipeline Indicator */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300">
            <span className={`w-1.5 h-1.5 rounded-full ${isExecuting ? 'bg-teal-400 animate-ping' : 'bg-emerald-400'}`} />
            <span>COACT SWARM</span>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-slate-400 bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800">
            <Activity className="w-3 h-3 text-teal-400" />
            <span>Confidence: <strong className="text-teal-300">{confidencePercent}%</strong></span>
          </div>
        </div>

        {/* Center: Swarm Agent Progression Nodes */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          {agents.map((agent, index) => {
            const isCurrentNode = isExecuting && activeStep === index;
            const isCompletedNode = isExecuting && activeStep > index;

            return (
              <div
                key={agent.id}
                className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs transition duration-200 ${
                  isCurrentNode
                    ? `${agent.activeColor} ring-1 ring-teal-500/20`
                    : isCompletedNode
                    ? 'text-teal-300 border-teal-500/20 bg-teal-500/5'
                    : 'text-slate-500 border-slate-800/60 bg-slate-900/30'
                }`}
              >
                <div className={`p-1 rounded ${isCurrentNode ? 'bg-teal-500/20 text-teal-300' : 'text-slate-500'}`}>
                  {agent.icon}
                </div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="font-semibold text-[11px] leading-tight text-slate-200">
                    {agent.name}
                  </span>
                  <span className="text-[9.5px] font-mono text-slate-400 leading-tight">
                    {agent.role}
                  </span>
                </div>
                {isCompletedNode && (
                  <CheckCircle2 className="w-3 h-3 text-teal-400 ml-1 hidden lg:inline" />
                )}
              </div>
            );
          })}
        </div>

        {/* Right Status / Telemetry */}
        <div className="flex items-center gap-2 flex-shrink-0 text-[10px] font-mono text-slate-400">
          <span className="hidden lg:inline text-slate-500">Uncertainty: U={uncertainty.toFixed(2)}</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-900 text-teal-400 border border-slate-800">
            {isExecuting ? 'DELIBERATING' : 'READY'}
          </span>
        </div>
      </div>
    </div>
  );
}
