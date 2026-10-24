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
  Users,
  CornerDownLeft,
  ArrowRight
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

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isLoading) return;
    const text = input.trim();
    const currentAtts = [...attachments];
    setInput('');
    setAttachments([]);
    sound.playStart();
    onSubmitPrompt(text, currentAtts, thinkingBudget);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const getPlaceholder = (mode: StudioMode) => {
    switch (mode) {
      case 'research':
        return 'Ask a research hypothesis, explore primary literature, or synthesize evidence...';
      case 'debate':
        return 'Enter two opposing views, technologies, or claims to trigger Dual-Agent Deliberation...';
      case 'planner':
        return 'Enter any high-level objective to decompose into an interactive milestone DAG...';
      case 'canvas':
        return 'Request dynamic data charts, metric models, or visual forecasts...';
      case 'matrix':
        return 'Enter options to evaluate across weighted multi-criteria matrices...';
      case 'coder':
        return 'Describe a component, API route, or algorithm to synthesize...';
      default:
        return 'Ask anything, explore research, or synthesize code...';
    }
  };

  const studioEngines = [
    { id: 'research' as StudioMode, label: 'Research', icon: <Compass className="w-3.5 h-3.5" /> },
    { id: 'debate' as StudioMode, label: 'Debate', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'planner' as StudioMode, label: 'Planner', icon: <ListTodo className="w-3.5 h-3.5" /> },
    { id: 'canvas' as StudioMode, label: 'Visuals', icon: <BarChart2 className="w-3.5 h-3.5" /> },
    { id: 'matrix' as StudioMode, label: 'Matrix', icon: <Scale className="w-3.5 h-3.5" /> },
    { id: 'coder' as StudioMode, label: 'Code', icon: <Code2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <div 
      className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] bg-slate-950 overflow-hidden relative"
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
          /* Simplified, Inspiring Empty State */
          <div className="py-12 md:py-16 text-center space-y-8 max-w-3xl mx-auto animate-in fade-in duration-300">
            <div className="space-y-3">
              <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-teal-500/15 via-indigo-500/15 to-purple-500/15 border border-teal-500/20 text-teal-300 shadow-sm">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-100 tracking-tight">
                What shall we build or solve today?
              </h2>
              <p className="text-xs md:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
                Choose an engine below or type an inquiry. Nova coordinates multi-agent teams to research, debate, plan, and synthesize in seconds.
              </p>
            </div>

            {/* 4 Clean Quick-Action Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-left max-w-2xl mx-auto">
              <button
                onClick={() => {
                  onSelectMode('research');
                  setInput('Is the Agent Harness Dead? Analyze lightweight code loops, MCP, and evaluation-driven design.');
                }}
                className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/50 hover:bg-slate-900 hover:border-teal-500/40 transition group cursor-pointer"
              >
                <div className="flex items-center gap-2 text-teal-400 mb-1 font-semibold text-xs">
                  <Compass className="w-4 h-4" />
                  <span>Deep Research</span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  Autonomous crawling across verified literature with audio briefing and citations.
                </p>
              </button>

              <button
                onClick={() => {
                  onSelectMode('debate');
                  setInput('Should production AI agents use LangGraph vs raw TypeScript code loops?');
                }}
                className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/50 hover:bg-slate-900 hover:border-purple-500/40 transition group cursor-pointer"
              >
                <div className="flex items-center gap-2 text-purple-400 mb-1 font-semibold text-xs">
                  <Users className="w-4 h-4" />
                  <span>Dual-Agent Debate</span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  Side-by-side advocate vs critic deliberation with neutral equilibrium consensus.
                </p>
              </button>

              <button
                onClick={() => {
                  onSelectMode('planner');
                  setInput('Plan a 14-day execution sprint to build an open-source MCP tool server.');
                }}
                className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/50 hover:bg-slate-900 hover:border-cyan-500/40 transition group cursor-pointer"
              >
                <div className="flex items-center gap-2 text-cyan-400 mb-1 font-semibold text-xs">
                  <ListTodo className="w-4 h-4" />
                  <span>Goal-to-DAG Planner</span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  Hierarchical milestone roadmap with interactive task checkboxes and output notes.
                </p>
              </button>

              <button
                onClick={() => {
                  onSelectMode('matrix');
                  setInput('Compare local open-weight models (Ollama/DeepSeek) vs closed frontier APIs.');
                }}
                className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/50 hover:bg-slate-900 hover:border-amber-500/40 transition group cursor-pointer"
              >
                <div className="flex items-center gap-2 text-amber-400 mb-1 font-semibold text-xs">
                  <Scale className="w-4 h-4" />
                  <span>Decision Matrix</span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  Multi-criteria comparison table with dynamic sliders and sensitivity recalculation.
                </p>
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="space-y-3 animate-in fade-in duration-200">
              {/* Message Header */}
              <div className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs shadow-sm ${
                  msg.role === 'assistant' 
                    ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' 
                    : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                }`}>
                  {msg.role === 'assistant' ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-slate-200">
                      {msg.role === 'assistant' ? 'Nova Autonomous Studio' : 'You'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{msg.timestamp}</span>
                    {msg.mode && (
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                        {msg.mode}
                      </span>
                    )}
                  </div>

                  {/* Message body */}
                  <div className="text-xs md:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                    {msg.content}
                  </div>
                </div>
              </div>

              {/* Generative Interactive Artifact */}
              {msg.artifact && (
                <div className="pl-10">
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
                  {msg.artifact.type === 'debate' && (
                    <DebateCard debate={msg.artifact.data} />
                  )}
                </div>
              )}

              {/* Latency & Telemetry Footer */}
              {msg.telemetry && (
                <div className="pl-10 text-[10.5px] font-mono text-slate-500 flex items-center gap-2">
                  <span>{msg.telemetry.latencyMs}ms</span>
                  <span>•</span>
                  <span>{msg.telemetry.tokenCount} tokens</span>
                  <span>•</span>
                  <span>{msg.telemetry.model}</span>
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-teal-500/20 bg-teal-500/5 animate-pulse">
            <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-teal-300">
                Autonomous Agents Deliberating ({thinkingBudget} budget)...
              </p>
              <p className="text-[11px] text-slate-400">
                CoAct self-consistency routing & verified evidence synthesis in progress.
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Simplified, Modern Floating Command Dock */}
      <div className="p-4 max-w-4xl mx-auto w-full">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md p-3 space-y-2.5 transition focus-within:border-teal-500/50 focus-within:shadow-teal-500/5">
          {/* Top Row: Engine Selector & Thinking Depth */}
          <div className="flex items-center justify-between text-xs border-b border-slate-800/60 pb-2">
            {/* Mode Selector Chips */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
              {studioEngines.map(e => {
                const isSelected = currentMode === e.id;
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => { sound.playCheck(); onSelectMode(e.id); }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-teal-500/15 text-teal-300 border border-teal-500/40 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <span className={isSelected ? 'text-teal-400' : 'text-slate-500'}>{e.icon}</span>
                    <span>{e.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Thinking Depth Segment */}
            <div className="hidden sm:flex items-center gap-0.5 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10.5px] font-mono">
              {(['quick', 'analytical', 'deep'] as const).map(b => (
                <button
                  key={b}
                  type="button"
                  onClick={() => { sound.playCheck(); setThinkingBudget(b); }}
                  className={`px-2 py-0.5 rounded transition cursor-pointer capitalize ${
                    thinkingBudget === b ? 'bg-slate-800 text-teal-300 font-semibold' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {b === 'quick' ? '⚡ Quick' : b === 'analytical' ? '🧠 Analytical' : '🔬 Deep'}
                </button>
              ))}
            </div>
          </div>

          {/* Pending Attachments List */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pb-1">
              {attachments.map(att => (
                <div key={att.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950 border border-teal-500/40 text-xs text-teal-200">
                  <FileText className="w-3 h-3 text-teal-400" />
                  <span className="font-medium truncate max-w-[180px] text-[11px]">{att.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    className="p-0.5 rounded text-slate-400 hover:text-rose-400 ml-1 transition cursor-pointer"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Main Input Row */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder(currentMode)}
              disabled={isLoading}
              className="w-full bg-transparent px-2 py-1.5 text-xs md:text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
            />
          </div>

          {/* Bottom Action Row: Attach, Voice, Enhance, and Submit */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/40">
            <div className="flex items-center gap-1.5">
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
                title="Attach code or data files"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
              >
                <Paperclip className="w-3.5 h-3.5" />
              </button>

              <VoiceInput onTranscription={(text) => setInput(prev => prev ? `${prev} ${text}` : text)} />

              {input.trim() && (
                <button
                  type="button"
                  onClick={handleEnhancePrompt}
                  disabled={isEnhancing}
                  className="flex items-center gap-1 text-[11px] text-teal-400 hover:text-teal-300 bg-teal-500/10 px-2 py-1 rounded-md transition cursor-pointer disabled:opacity-50"
                  title="Enhance prompt with autonomous intent"
                >
                  {isEnhancing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                  <span>Enhance ✨</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden md:inline text-[10px] font-mono text-slate-500">
                Press Enter ↵
              </span>
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={(!input.trim() && attachments.length === 0) || isLoading}
                className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40 shadow-sm"
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <span>Send</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
