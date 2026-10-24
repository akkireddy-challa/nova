'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  ChatMessage, 
  StudioMode, 
  AgentThought, 
  GenerativeArtifact 
} from '@/lib/types';
import { ResearchReportCard } from './GenerativeCards/ResearchReportCard';
import { TaskDagCard } from './GenerativeCards/TaskDagCard';
import { ChartCard } from './GenerativeCards/ChartCard';
import { DecisionMatrixCard } from './GenerativeCards/DecisionMatrixCard';
import { CodeSandboxCard } from './GenerativeCards/CodeSandboxCard';
import { VoiceInput } from './VoiceInput';
import { 
  Send, 
  Loader2, 
  Bot, 
  User, 
  Sparkles, 
  Compass, 
  ListTodo, 
  BarChart2, 
  Scale, 
  Code2, 
  CheckCircle2, 
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

interface Props {
  messages: ChatMessage[];
  currentMode: StudioMode;
  isLoading: boolean;
  onSubmitPrompt: (text: string) => void;
  onSelectMode: (mode: StudioMode) => void;
}

export function AgentCanvas({
  messages,
  currentMode,
  isLoading,
  onSubmitPrompt,
  onSelectMode,
}: Props) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput('');
    onSubmitPrompt(text);
  };

  const getPlaceholder = (mode: StudioMode) => {
    switch (mode) {
      case 'research':
        return 'Enter a complex question or topic for autonomous deep research...';
      case 'planner':
        return 'Enter any high-level objective to generate an interactive milestone DAG...';
      case 'canvas':
        return 'Request a visual data model, market forecast, or metric comparison...';
      case 'matrix':
        return 'Enter alternatives to evaluate across weighted multi-variable criteria...';
      case 'coder':
        return 'Describe a component, architecture, or script to synthesize...';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-slate-950 overflow-hidden relative">
      {/* Scrollable messages and artifacts area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto w-full">
        {messages.length === 0 ? (
          /* Welcome Hero for New Workspace */
          <div className="py-12 md:py-16 text-center space-y-6 max-w-2xl mx-auto">
            <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-teal-500/10 via-indigo-500/10 to-purple-500/10 border border-teal-500/20 text-teal-400">
              <Sparkles className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">
                What shall we build or solve today?
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed max-w-lg mx-auto">
                Nova is an open-source autonomous intelligence studio. Choose an engine below or type any open-ended request.
              </p>
            </div>

            {/* Quick Action Mode Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-4 text-left">
              <button
                onClick={() => { onSelectMode('research'); setInput('Deep research on future solid-state battery breakthroughs and commercialization timelines'); }}
                className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-teal-500/40 transition group"
              >
                <div className="flex items-center gap-2 text-teal-400 mb-1.5 font-semibold text-xs">
                  <Compass className="w-4 h-4" />
                  <span>Deep Research</span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  Multi-source autonomous crawling, citation verification, and comprehensive synthesis.
                </p>
              </button>

              <button
                onClick={() => { onSelectMode('planner'); setInput('Plan a 30-day product launch strategy for a local-first open source tool'); }}
                className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-indigo-500/40 transition group"
              >
                <div className="flex items-center gap-2 text-indigo-400 mb-1.5 font-semibold text-xs">
                  <ListTodo className="w-4 h-4" />
                  <span>Goal-to-DAG Planner</span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  Decompose goals into ordered execution milestones with interactive checkboxes.
                </p>
              </button>

              <button
                onClick={() => { onSelectMode('matrix'); setInput('Evaluate PostgreSQL + pgvector vs DuckDB vs Milvus for local personal memory'); }}
                className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-purple-500/40 transition group"
              >
                <div className="flex items-center gap-2 text-purple-400 mb-1.5 font-semibold text-xs">
                  <Scale className="w-4 h-4" />
                  <span>Decision Matrix</span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  Weighted criteria comparison with real-time recalculated ranking sliders.
                </p>
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="space-y-3">
              {/* Message Header */}
              <div className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs ${
                  msg.role === 'assistant' 
                    ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' 
                    : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                }`}>
                  {msg.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-slate-200">
                      {msg.role === 'assistant' ? 'Nova Autonomous Studio' : 'You'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {msg.timestamp}
                    </span>
                    {msg.mode && (
                      <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-800 text-teal-400 border border-slate-700 font-mono">
                        {msg.mode}
                      </span>
                    )}
                  </div>

                  {/* Message content text */}
                  <div className="text-xs md:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </div>

                  {/* Agent Thoughts disclosure */}
                  {msg.thoughts && msg.thoughts.length > 0 && (
                    <div className="my-3 p-3 rounded-lg border border-slate-800/80 bg-slate-900/50 space-y-1.5 text-xs">
                      <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-teal-400" />
                        Autonomous Agent Execution Trail
                      </div>
                      <div className="space-y-1">
                        {msg.thoughts.map((th) => (
                          <div key={th.id} className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                            <span className="text-teal-400 font-semibold">{th.agentName}:</span>
                            <span className="truncate">{th.action}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Render Generative Artifact */}
                  {msg.artifact && (
                    <div className="mt-3">
                      {msg.artifact.type === 'research' && (
                        <ResearchReportCard report={msg.artifact.data} />
                      )}
                      {msg.artifact.type === 'plan' && (
                        <TaskDagCard plan={msg.artifact.data} />
                      )}
                      {msg.artifact.type === 'chart' && (
                        <ChartCard chart={msg.artifact.data} />
                      )}
                      {msg.artifact.type === 'matrix' && (
                        <DecisionMatrixCard matrix={msg.artifact.data} />
                      )}
                      {msg.artifact.type === 'code' && (
                        <CodeSandboxCard codeArtifact={msg.artifact.data} />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {/* Loading indicator with agent steps */}
        {isLoading && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-teal-500/20 bg-teal-500/5 animate-pulse">
            <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-teal-300">
                Autonomous Agents Collaborating...
              </p>
              <p className="text-[11px] text-slate-400">
                Planning queries, analyzing knowledge sources, and generating visual artifacts.
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Dock */}
      <div className="p-4 bg-slate-950/80 border-t border-slate-800 backdrop-blur-md">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex items-center gap-2">
          {/* Voice Input Button */}
          <VoiceInput onTranscription={(text) => setInput(prev => prev ? `${prev} ${text}` : text)} />

          {/* Main prompt input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={getPlaceholder(currentMode)}
              disabled={isLoading}
              className="w-full pl-4 pr-10 py-3 rounded-xl bg-slate-900 border border-slate-700/80 text-xs md:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition shadow-inner"
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 disabled:opacity-40 font-semibold transition flex items-center justify-center shadow-lg shadow-teal-500/10"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
