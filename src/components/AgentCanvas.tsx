'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  ChatMessage, 
  StudioMode, 
  AgentThought, 
  GenerativeArtifact,
  Attachment,
  ThinkingBudget
} from '@/lib/types';
import { ResearchReportCard } from './GenerativeCards/ResearchReportCard';
import { TaskDagCard } from './GenerativeCards/TaskDagCard';
import { ChartCard } from './GenerativeCards/ChartCard';
import { DecisionMatrixCard } from './GenerativeCards/DecisionMatrixCard';
import { CodeSandboxCard } from './GenerativeCards/CodeSandboxCard';
import { DebateCard } from './GenerativeCards/DebateCard';
import { VoiceInput } from './VoiceInput';
import { SwarmHUD } from './SwarmHUD';
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
  Paperclip,
  X,
  FileText,
  Zap,
  Wand2,
  Users
} from 'lucide-react';
import { sound } from '@/lib/sound';
import { generateId } from '@/lib/utils';

interface Props {
  messages: ChatMessage[];
  currentMode: StudioMode;
  isLoading: boolean;
  onSubmitPrompt: (text: string, attachments?: Attachment[], thinkingBudget?: ThinkingBudget) => void;
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
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [thinkingBudget, setThinkingBudget] = useState<ThinkingBudget>('analytical');
  const [isDragging, setIsDragging] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string || '';
        const newAtt: Attachment = {
          id: generateId(),
          name: file.name,
          size: file.size,
          type: file.type || 'text/plain',
          content,
        };
        sound.playCheck();
        setAttachments(prev => [...prev, newAtt]);
      };
      reader.readAsText(file);
    });
  };

  const removeAttachment = (id: string) => {
    sound.playCheck();
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleEnhancePrompt = async () => {
    if (!input.trim() || isEnhancing) return;
    setIsEnhancing(true);
    sound.playStart();
    try {
      const res = await fetch('/api/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input.trim() }),
      });
      const data = await res.json();
      if (data.enhancedPrompt) {
        setInput(data.enhancedPrompt);
        sound.playSuccess();
      }
    } catch {
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isLoading) return;
    const text = input.trim();
    const currentAtts = [...attachments];
    setInput('');
    setAttachments([]);
    sound.playStart();
    onSubmitPrompt(text, currentAtts, thinkingBudget);
  };

  const getPlaceholder = (mode: StudioMode) => {
    switch (mode) {
      case 'research':
        return 'Enter a research thesis (or attach files)...';
      case 'debate':
        return 'Enter a controversial claim or architecture to trigger Dual-Agent Deliberation...';
      case 'planner':
        return 'Enter any high-level objective to generate an interactive milestone DAG...';
      case 'canvas':
        return 'Request a visual data model, market forecast, or metric comparison...';
      case 'matrix':
        return 'Enter alternatives to evaluate across weighted multi-variable criteria...';
      case 'coder':
        return 'Describe a component, architecture, or script to synthesize...';
      case 'mcp':
        return 'Enter query to dispatch across registered Model Context Protocol tools...';
    }
  };

  return (
    <div 
      className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-slate-950 overflow-hidden relative"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFileUpload(e.dataTransfer.files);
      }}
    >
      {/* Real-time Multi-Agent Swarm Pipeline Status */}
      <SwarmHUD isExecuting={isLoading} activeMode={currentMode} />

      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-30 bg-teal-500/10 backdrop-blur-sm border-2 border-dashed border-teal-400 flex items-center justify-center p-6 pointer-events-none">
          <div className="bg-slate-900 p-6 rounded-2xl border border-teal-500/40 text-center shadow-2xl">
            <Paperclip className="w-8 h-8 text-teal-400 mx-auto mb-2 animate-bounce" />
            <h4 className="text-sm font-semibold text-slate-100">Drop files to attach to agent context</h4>
            <p className="text-xs text-slate-400 mt-1">Accepts code, markdown, JSON, CSV, and text</p>
          </div>
        </div>
      )}

      {/* Scrollable messages and artifacts area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto w-full">
        {messages.length === 0 ? (
          /* Welcome Hero for New Workspace */
          <div className="py-10 md:py-14 text-center space-y-6 max-w-2xl mx-auto animate-in fade-in duration-300">
            <div className="inline-flex p-3.5 rounded-2xl bg-gradient-to-tr from-teal-500/20 via-indigo-500/20 to-purple-500/20 border border-teal-500/30 text-teal-300 shadow-xl shadow-teal-500/10">
              <Sparkles className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">
                  What shall we build or solve today?
                </h2>
              </div>
              <p className="text-xs md:text-sm text-slate-400 leading-relaxed max-w-lg mx-auto">
                Nova orchestrates autonomous multi-agent pipelines to produce verified research, milestone DAGs, interactive charts, and production code.
              </p>
            </div>

            {/* Quick Action Mode Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-3 text-left">
              <button
                onClick={() => { onSelectMode('research'); setInput('Is the Agent Harness Dead? Analyze lightweight code loops, MCP, and evaluation-driven design.'); }}
                className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-teal-500/40 transition group"
              >
                <div className="flex items-center gap-2 text-teal-400 mb-1.5 font-semibold text-xs">
                  <Compass className="w-4 h-4" />
                  <span>Deep Research</span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  Autonomous crawling, source triangulation, and verified citations with audio briefing.
                </p>
              </button>

              <button
                onClick={() => { onSelectMode('debate'); setInput('Should production AI agents use LangGraph vs raw TypeScript code loops?'); }}
                className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-indigo-500/40 transition group"
              >
                <div className="flex items-center gap-2 text-indigo-400 mb-1.5 font-semibold text-xs">
                  <Users className="w-4 h-4" />
                  <span>Dual-Agent Debate</span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  Side-by-side advocate vs critic deliberation with neutral equilibrium consensus.
                </p>
              </button>

              <button
                onClick={() => { onSelectMode('planner'); setInput('Plan a 14-day execution sprint to build an open-source MCP tool server'); }}
                className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-purple-500/40 transition group"
              >
                <div className="flex items-center gap-2 text-purple-400 mb-1.5 font-semibold text-xs">
                  <ListTodo className="w-4 h-4" />
                  <span>Goal-to-DAG Planner</span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  Dependency-ordered milestone roadmap with live checkbox tracking and confetti.
                </p>
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="space-y-3 animate-in fade-in duration-200">
              {/* Message Header */}
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs shadow-md ${
                  msg.role === 'assistant' 
                    ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' 
                    : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                }`}>
                  {msg.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-slate-200">
                      {msg.role === 'assistant' ? 'Nova Autonomous Studio' : 'You'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {msg.timestamp}
                    </span>
                    {msg.mode && (
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-900 text-teal-400 border border-slate-800 font-mono">
                        {msg.mode}
                      </span>
                    )}
                  </div>

                  {/* Attached files preview */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {msg.attachments.map(att => (
                        <div key={att.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                          <FileText className="w-3.5 h-3.5 text-teal-400" />
                          <span className="truncate max-w-[180px]">{att.name}</span>
                          <span className="text-[9px] text-slate-500 font-mono">({Math.round(att.size / 1024)}KB)</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Message content text */}
                  <div className="text-xs md:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </div>

                  {/* Agent Thoughts disclosure */}
                  {msg.thoughts && msg.thoughts.length > 0 && (
                    <div className="my-3 p-3 rounded-xl border border-slate-800/80 bg-slate-900/60 space-y-1.5 text-xs">
                      <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-teal-400" />
                        Autonomous Swarm Execution Trail
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
                      {msg.artifact.type === 'debate' && (
                        <DebateCard debate={msg.artifact.data} />
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

                  {/* Telemetry pill */}
                  {msg.telemetry && (
                    <div className="mt-2.5 flex items-center gap-3 text-[10px] text-slate-500 font-mono">
                      <span className="flex items-center gap-1 text-teal-400/80">
                        <Zap className="w-3 h-3" />
                        {msg.telemetry.latencyMs}ms
                      </span>
                      <span>•</span>
                      <span>{msg.telemetry.tokenCount} tokens</span>
                      <span>•</span>
                      <span>{msg.telemetry.tokensPerSec} t/s</span>
                      <span>•</span>
                      <span>{msg.telemetry.model}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-teal-500/20 bg-teal-500/5 animate-pulse">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-teal-300">
                Autonomous Agents Collaborating ({thinkingBudget} mode)...
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
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-2">
          {/* Controls bar: Thinking Depth & Prompt Enhancer */}
          <div className="flex items-center justify-between text-xs px-1">
            {/* Thinking Depth Selector */}
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px]">
              <span className="text-[10px] text-slate-500 uppercase px-2 font-mono">Thinking:</span>
              <button
                type="button"
                onClick={() => { sound.playCheck(); setThinkingBudget('quick'); }}
                className={`px-2 py-0.5 rounded transition ${
                  thinkingBudget === 'quick' ? 'bg-slate-800 text-teal-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ⚡ Quick
              </button>
              <button
                type="button"
                onClick={() => { sound.playCheck(); setThinkingBudget('analytical'); }}
                className={`px-2 py-0.5 rounded transition ${
                  thinkingBudget === 'analytical' ? 'bg-slate-800 text-teal-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🧠 Analytical
              </button>
              <button
                type="button"
                onClick={() => { sound.playCheck(); setThinkingBudget('deep'); }}
                className={`px-2 py-0.5 rounded transition ${
                  thinkingBudget === 'deep' ? 'bg-slate-800 text-teal-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🔬 Deep
              </button>
            </div>

            {/* Prompt Enhancer Button */}
            {input.trim() && (
              <button
                type="button"
                onClick={handleEnhancePrompt}
                disabled={isEnhancing}
                className="flex items-center gap-1 text-[11px] text-teal-400 hover:text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 px-2 py-0.5 rounded-md border border-teal-500/30 transition disabled:opacity-40"
                title="Automatically upgrade prompt into a high-agency inquiry"
              >
                {isEnhancing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                <span>{isEnhancing ? 'Enhancing...' : 'Enhance Prompt ✨'}</span>
              </button>
            )}
          </div>

          {/* Pending attachments pill bar */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-1">
              {attachments.map(att => (
                <div key={att.id} className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-teal-500/40 text-xs text-teal-200">
                  <FileText className="w-3.5 h-3.5 text-teal-400" />
                  <span className="font-medium truncate max-w-[200px]">{att.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    className="p-0.5 rounded text-slate-400 hover:text-rose-400 ml-1 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
              multiple
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach documents, data files, or code"
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <VoiceInput onTranscription={(text) => setInput(prev => prev ? `${prev} ${text}` : text)} />

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

            <button
              type="submit"
              disabled={(!input.trim() && attachments.length === 0) || isLoading}
              className="p-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 disabled:opacity-40 font-semibold transition flex items-center justify-center shadow-lg shadow-teal-500/10"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
