"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  ChatMessage,
  StudioMode,
  GenerativeArtifact,
  Attachment,
  ThinkingBudget,
  Session,
  AgentThought,
} from "@/lib/types";
import { ResearchReportCard } from "./GenerativeCards/ResearchReportCard";
import { TaskDagCard } from "./GenerativeCards/TaskDagCard";
import { ChartCard } from "./GenerativeCards/ChartCard";
import { DecisionMatrixCard } from "./GenerativeCards/DecisionMatrixCard";
import { CodeSandboxCard } from "./GenerativeCards/CodeSandboxCard";
import { DebateCard } from "./GenerativeCards/DebateCard";
import { AudioBriefingBar } from "./AudioBriefingBar";
import { ArtifactStage } from "./ArtifactStage";
import { SessionExportModal } from "./SessionExportModal";
import { ProviderOnboarding } from "./ProviderOnboarding";
import { TraceSteps } from "./TraceSteps";
import { MultiAgentSwarmHUD } from "./MultiAgentSwarmHUD";
import {
  mapThoughtsToSwarmEvents,
  classifyThoughtRole,
  formatActiveSpecialistThought,
} from "@/lib/client/swarm-client";
import { SWARM_ROLES } from "@/lib/research/multi-agent-orchestrator";
import {
  isErrorMessage,
  isStoppedMessage,
  settleStoppedSteps,
} from "@/lib/client/agent";
import {
  isSpeechRecognitionSupported,
  createSpeechRecognizer,
  createAudioBriefing,
  SpeechRecognizer,
  AudioBriefingController,
} from "@/lib/client/voice";
import {
  Loader2,
  Bot,
  User,
  Sparkles,
  Compass,
  ListTodo,
  BarChart2,
  Scale,
  Code2,
  Paperclip,
  X,
  FileText,
  Wand2,
  Users,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Maximize2,
  Share2,
  Image as ImageIcon,
  Globe,
  ExternalLink,
  AlertTriangle,
  Square,
  CheckCircle2,
  Mic,
  Volume2,
} from "lucide-react";
import { sound } from "@/lib/sound";
import { generateId } from "@/lib/utils";
import { parseAttachedFile, formatFileSize } from "@/lib/document-parser";

interface Props {
  messages: ChatMessage[];
  currentMode: StudioMode;
  isLoading: boolean;
  streamingThoughts?: AgentThought[];
  onStop?: () => void;
  onSubmitPrompt?: (
    text: string,
    attachments?: Attachment[],
    thinkingBudget?: ThinkingBudget,
  ) => void;
  onSendMessage?: (
    input: string,
    budget?: ThinkingBudget,
    attachments?: Attachment[],
  ) => void;
  onSelectMode: (mode: StudioMode) => void;
  sessionTitle?: string;
  defaultThinkingBudget: ThinkingBudget;
  /** True when GET /api/v1/models returned an empty list. */
  noProvider: boolean;
  /** Set when the model list could not be loaded at all. */
  modelsError: string | null;
  isCheckingModels: boolean;
  onCheckModels: () => void;
}

export function AgentCanvas({
  messages,
  currentMode,
  isLoading,
  streamingThoughts = [],
  onStop,
  onSubmitPrompt,
  onSendMessage,
  onSelectMode,
  sessionTitle,
  defaultThinkingBudget,
  noProvider,
  modelsError,
  isCheckingModels,
  onCheckModels,
}: Props) {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  // null = follow the default from Settings until the user picks one here.
  const [budgetOverride, setThinkingBudget] = useState<ThinkingBudget | null>(
    null,
  );
  const thinkingBudget = budgetOverride ?? defaultThinkingBudget;
  const [isDragging, setIsDragging] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [selectedArtifact, setSelectedArtifact] =
    useState<GenerativeArtifact | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [swarmMode, setSwarmMode] = useState(false);
  const [isLiveSwarmHUDCollapsed, setIsLiveSwarmHUDCollapsed] = useState(false);
  const [collapsedMessageHUDs, setCollapsedMessageHUDs] = useState<
    Record<string, boolean>
  >({});

  const toggleMessageHUD = (messageId: string) => {
    setCollapsedMessageHUDs((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  };

  const liveSwarm = useMemo(() => {
    return mapThoughtsToSwarmEvents(streamingThoughts);
  }, [streamingThoughts]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isListening, setIsListening] = useState(false);
  const speechRecognizerRef = useRef<SpeechRecognizer | null>(null);

  const [activeAudioBriefing, setActiveAudioBriefing] = useState<{
    isPlaying: boolean;
    isPaused: boolean;
    currentChunk: number;
    totalChunks: number;
    speed: number;
    title: string;
  } | null>(null);
  const audioBriefingRef = useRef<AudioBriefingController | null>(null);

  useEffect(() => {
    return () => {
      speechRecognizerRef.current?.stop();
      audioBriefingRef.current?.stop();
    };
  }, []);

  const toggleVoiceInput = () => {
    if (isListening) {
      speechRecognizerRef.current?.stop();
      speechRecognizerRef.current = null;
      setIsListening(false);
      return;
    }

    if (!isSpeechRecognitionSupported()) {
      setFileError("Speech recognition is not supported in this browser.");
      setTimeout(() => setFileError(null), 4000);
      return;
    }

    const recognizer = createSpeechRecognizer({
      onResult: (text, isFinal) => {
        if (text && isFinal) {
          sound.playCheck();
          setInput((prev) => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed} ${text.trim()}` : text.trim();
          });
        }
      },
      onError: (err) => {
        setIsListening(false);
        speechRecognizerRef.current = null;
        setFileError(`Voice input: ${err}`);
        setTimeout(() => setFileError(null), 4000);
      },
      onEnd: () => {
        setIsListening(false);
        speechRecognizerRef.current = null;
      },
    });

    speechRecognizerRef.current = recognizer;
    setIsListening(true);
  };

  const handleStartAudioBriefing = (text: string, title?: string) => {
    sound.playStart();
    audioBriefingRef.current?.stop();

    const speed = activeAudioBriefing?.speed ?? 1.0;
    const briefing = createAudioBriefing(text, {
      rate: speed,
      onStart: () => {
        setActiveAudioBriefing((prev) => ({
          isPlaying: true,
          isPaused: false,
          currentChunk: 0,
          totalChunks: prev?.totalChunks ?? 1,
          speed,
          title: title || "Audio Overview Briefing",
        }));
      },
      onChunkChange: (chunkIndex, totalChunks) => {
        setActiveAudioBriefing((prev) =>
          prev
            ? {
                ...prev,
                currentChunk: chunkIndex,
                totalChunks,
                isPlaying: true,
                isPaused: false,
              }
            : null,
        );
      },
      onEnd: () => {
        setActiveAudioBriefing(null);
        audioBriefingRef.current = null;
      },
      onError: (err) => {
        console.warn("Audio briefing error:", err);
        setActiveAudioBriefing(null);
        audioBriefingRef.current = null;
      },
    });

    audioBriefingRef.current = briefing;
    briefing.play();
  };

  const handlePlayPauseBriefing = () => {
    if (!audioBriefingRef.current || !activeAudioBriefing) return;
    if (activeAudioBriefing.isPaused) {
      audioBriefingRef.current.resume();
      setActiveAudioBriefing((prev) =>
        prev ? { ...prev, isPaused: false, isPlaying: true } : null,
      );
    } else {
      audioBriefingRef.current.pause();
      setActiveAudioBriefing((prev) =>
        prev ? { ...prev, isPaused: true } : null,
      );
    }
  };

  const handleStopBriefing = () => {
    sound.playCheck();
    audioBriefingRef.current?.stop();
    audioBriefingRef.current = null;
    setActiveAudioBriefing(null);
  };

  const handleSpeedChange = (speed: number) => {
    sound.playCheck();
    if (!audioBriefingRef.current) return;
    audioBriefingRef.current.setRate(speed);
    setActiveAudioBriefing((prev) => (prev ? { ...prev, speed } : null));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, streamingThoughts]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;
    setFileError(null);
    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith("image/");
      if (isImage) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = (e.target?.result as string) || "";
          const newAtt: Attachment = {
            id: generateId(),
            name: file.name,
            size: file.size,
            type: file.type || "image/png",
            content,
          };
          sound.playCheck();
          setAttachments((prev) => [...prev, newAtt]);
        };
        reader.readAsDataURL(file);
      } else {
        try {
          const parsed = await parseAttachedFile(file);
          const newAtt: Attachment = {
            id: generateId(),
            name: parsed.name,
            size: parsed.size,
            type: parsed.type,
            content: parsed.content,
          };
          sound.playCheck();
          setAttachments((prev) => [...prev, newAtt]);
        } catch (err: unknown) {
          const msg =
            err instanceof Error ? err.message : "Failed to parse document";
          setFileError(msg);
        }
      }
    }
  };

  // Clipboard paste listener to allow instant screenshot capture (⌘V)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          const reader = new FileReader();
          reader.onload = (ev) => {
            const content = (ev.target?.result as string) || "";
            const newAtt: Attachment = {
              id: generateId(),
              name: `screenshot-${Date.now().toString(36)}.png`,
              size: file.size,
              type: file.type,
              content,
            };
            sound.playSuccess();
            setAttachments((prev) => [...prev, newAtt]);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const removeAttachment = (id: string) => {
    sound.playCheck();
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleEnhancePrompt = async () => {
    if (!input.trim() || isEnhancing) return;
    setIsEnhancing(true);
    sound.playStart();
    try {
      const res = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    if ((!input.trim() && attachments.length === 0) || isLoading || noProvider)
      return;
    const text = input.trim();
    const currentAtts = [...attachments];
    setInput("");
    setAttachments([]);
    sound.playStart();
    if (onSendMessage) {
      onSendMessage(text, thinkingBudget, currentAtts);
    } else if (onSubmitPrompt) {
      onSubmitPrompt(text, currentAtts, thinkingBudget);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const getPlaceholder = (mode: StudioMode) => {
    switch (mode) {
      case "research":
        return "Ask a question. Nova searches the web and writes a cited answer...";
      case "debate":
        return "Enter a claim or decision to see arguments for and against...";
      case "planner":
        return "Describe a goal or project to break into a step-by-step plan...";
      case "canvas":
        return "Ask for data to chart, e.g. a comparison over time...";
      case "matrix":
        return "List the options you want compared, and what matters to you...";
      case "coder":
        return "Describe the code you need...";
      default:
        return "Ask anything. Paste screenshots (⌘V) or drag & drop files...";
    }
  };

  const studioEngines: {
    id: StudioMode;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "research",
      label: "Research",
      icon: <Compass className="w-3.5 h-3.5" />,
    },
    { id: "debate", label: "Debate", icon: <Users className="w-3.5 h-3.5" /> },
    {
      id: "planner",
      label: "Plan",
      icon: <ListTodo className="w-3.5 h-3.5" />,
    },
    {
      id: "canvas",
      label: "Chart",
      icon: <BarChart2 className="w-3.5 h-3.5" />,
    },
    { id: "matrix", label: "Compare", icon: <Scale className="w-3.5 h-3.5" /> },
    { id: "coder", label: "Code", icon: <Code2 className="w-3.5 h-3.5" /> },
  ];

  // Synthesize current session object for export
  const currentSessionObj: Session = {
    id: "active-session",
    title:
      sessionTitle || messages[0]?.content?.slice(0, 36) || "Nova Workspace",
    mode: currentMode,
    createdAt: messages[0]?.timestamp || "2026-01-01",
    updatedAt: messages[messages.length - 1]?.timestamp || "2026-01-01",
    messages,
  };

  return (
    <div
      className="flex-1 min-h-0 flex overflow-hidden relative bg-slate-950"
      onDragEnter={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDragging(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFileUpload(e.dataTransfer.files);
      }}
    >
      {/* Left Chat Stream Pane */}
      <div className="flex-1 min-h-0 flex flex-col min-w-0 overflow-hidden relative print:hidden">
        {/* Export Action */}
        {messages.length > 0 && (
          <div className="flex-shrink-0 hidden sm:flex justify-end px-3 py-2 border-b border-slate-800/80">
            <button
              type="button"
              onClick={() => {
                sound.playCheck();
                setIsExportOpen(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-slate-300 hover:text-teal-300 transition cursor-pointer"
              title="Export Workspace to Markdown or JSON"
            >
              <Share2 className="w-3 h-3 text-teal-400" />
              <span>Export</span>
            </button>
          </div>
        )}

        {/* Drag & Drop Overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-30 bg-teal-500/10 backdrop-blur-sm border-2 border-dashed border-teal-400 flex items-center justify-center p-6 pointer-events-none">
            <div className="bg-slate-900 p-6 rounded-2xl border border-teal-500/40 text-center shadow-2xl">
              <Paperclip className="w-8 h-8 text-teal-400 mx-auto mb-2 animate-bounce" />
              <h4 className="text-sm font-semibold text-slate-100">
                Drop files or images to attach
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Accepts images, code, markdown, JSON, CSV, and text
              </p>
            </div>
          </div>
        )}

        {/* Scrollable messages and artifacts area */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto w-full">
          {messages.length === 0 && noProvider ? (
            <div className="py-10 md:py-14 animate-in fade-in duration-300">
              <ProviderOnboarding
                onCheckAgain={onCheckModels}
                isChecking={isCheckingModels}
              />
            </div>
          ) : messages.length === 0 ? (
            /* Empty state with example prompts */
            <div className="py-10 md:py-14 text-center space-y-7 max-w-3xl mx-auto animate-in fade-in duration-300">
              <div className="space-y-3">
                <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-teal-500/15 via-indigo-500/15 to-purple-500/15 border border-teal-500/20 text-teal-300 shadow-sm">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-100 tracking-tight">
                  What do you want to find out?
                </h2>
                <p className="text-xs md:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
                  Pick a mode below or try an example. You can also paste
                  screenshots (
                  <kbd className="font-mono bg-slate-900 px-1 rounded text-teal-300">
                    ⌘V
                  </kbd>
                  ) or drop files.
                </p>
                {modelsError && (
                  <p className="text-[11px] text-amber-400">
                    Could not load the model list ({modelsError}).{" "}
                    <button
                      type="button"
                      onClick={onCheckModels}
                      className="underline hover:text-amber-300 cursor-pointer"
                    >
                      Retry
                    </button>
                  </p>
                )}
              </div>

              {/* Example prompts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-left max-w-2xl mx-auto">
                <button
                  onClick={() => {
                    onSelectMode("research");
                    setInput(
                      "What changed in the latest stable Node.js release?",
                    );
                  }}
                  className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/50 hover:bg-slate-900 hover:border-teal-500/40 transition group cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-teal-400 mb-1 font-semibold text-xs">
                    <Compass className="w-4 h-4" />
                    <span>Research</span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    Searches the web and answers with numbered citations.
                  </p>
                </button>

                <button
                  onClick={() => {
                    onSelectMode("debate");
                    setInput(
                      "Should a small team self-host its LLM or use a hosted API?",
                    );
                  }}
                  className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/50 hover:bg-slate-900 hover:border-purple-500/40 transition group cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-purple-400 mb-1 font-semibold text-xs">
                    <Users className="w-4 h-4" />
                    <span>Debate</span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    Arguments for and against, with a summary verdict.
                  </p>
                </button>

                <button
                  onClick={() => {
                    onSelectMode("planner");
                    setInput(
                      "Plan a two-week sprint to ship a small open-source CLI tool.",
                    );
                  }}
                  className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/50 hover:bg-slate-900 hover:border-cyan-500/40 transition group cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-cyan-400 mb-1 font-semibold text-xs">
                    <ListTodo className="w-4 h-4" />
                    <span>Plan</span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    Breaks a goal into phases and tasks you can check off.
                  </p>
                </button>

                <button
                  onClick={() => {
                    onSelectMode("matrix");
                    setInput(
                      "Compare Postgres, SQLite, and DuckDB for a local analytics app.",
                    );
                  }}
                  className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/50 hover:bg-slate-900 hover:border-amber-500/40 transition group cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-amber-400 mb-1 font-semibold text-xs">
                    <Scale className="w-4 h-4" />
                    <span>Compare</span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    Weighted comparison table you can re-weight.
                  </p>
                </button>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className="space-y-3 animate-in fade-in duration-200"
              >
                {/* Message Header */}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs shadow-sm ${
                      msg.role === "assistant"
                        ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                        : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <Bot className="w-3.5 h-3.5" />
                    ) : (
                      <User className="w-3.5 h-3.5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-200">
                        {msg.role === "assistant" ? "Nova" : "You"}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {msg.timestamp}
                      </span>
                      {msg.mode && (
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                          {msg.mode}
                        </span>
                      )}
                      {msg.role === "assistant" &&
                        !isErrorMessage(msg) &&
                        !isStoppedMessage(msg) &&
                        msg.content && (
                          <button
                            type="button"
                            onClick={() =>
                              handleStartAudioBriefing(
                                msg.content,
                                "Audio Overview Briefing",
                              )
                            }
                            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-mono text-slate-400 hover:text-teal-300 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition cursor-pointer ml-auto"
                            title="Listen to audio overview briefing"
                          >
                            <Volume2 className="w-3 h-3 text-teal-400" />
                            <span>Listen</span>
                          </button>
                        )}
                    </div>

                    {/* Attachments Preview in User Message */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {msg.attachments.map((att) => (
                          <div
                            key={att.id}
                            className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-teal-300"
                          >
                            {att.type.startsWith("image/") ? (
                              // User-attached image preview (data URL); next/image can't optimize it.
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={att.content}
                                alt={att.name}
                                className="w-6 h-6 rounded object-cover border border-slate-700"
                              />
                            ) : (
                              <FileText className="w-3.5 h-3.5 text-teal-400" />
                            )}
                            <span className="font-medium truncate max-w-[140px]">
                              {att.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Message body */}
                    {isStoppedMessage(msg) ? (
                      <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-200 space-y-1.5">
                        <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>Request stopped</span>
                        </div>
                        <p className="leading-relaxed whitespace-pre-wrap text-slate-300">
                          {msg.content}
                        </p>
                      </div>
                    ) : isErrorMessage(msg) ? (
                      <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-200 space-y-1.5">
                        <div className="flex items-center gap-1.5 font-semibold text-rose-300">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Request failed</span>
                          <span className="font-mono text-[10px] text-rose-400/80">
                            {msg.errorCode}
                          </span>
                        </div>
                        <p className="leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </p>
                        {msg.errorCode === "NO_PROVIDER" && (
                          <button
                            type="button"
                            onClick={onCheckModels}
                            className="underline text-rose-200 hover:text-white cursor-pointer"
                          >
                            No model is configured. See setup steps
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs md:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                        {msg.content}
                      </div>
                    )}
                  </div>
                </div>

                {/* Generative Interactive Artifact */}
                {msg.artifact && (
                  <div className="pl-10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase text-slate-500">
                        {msg.artifact.type}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          sound.playCheck();
                          setSelectedArtifact(msg.artifact!);
                        }}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono text-teal-400 hover:text-teal-300 hover:bg-slate-800 transition cursor-pointer"
                        title="Open in side panel"
                      >
                        <Maximize2 className="w-3 h-3" />
                        <span>Open</span>
                      </button>
                    </div>

                    {msg.artifact.type === "research" &&
                      msg.artifact.data.sources && (
                        <div className="flex flex-wrap items-center gap-1.5 py-1">
                          <span className="text-[10.5px] font-mono text-slate-500 uppercase flex items-center gap-1">
                            <Globe className="w-3 h-3 text-teal-400" />
                            Sources:
                          </span>
                          {msg.artifact.data.sources.map((s) => (
                            <a
                              key={s.id}
                              href={s.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10.5px] font-mono text-teal-300 hover:border-teal-500/40 transition cursor-pointer"
                            >
                              <span>{s.domain}</span>
                              <ExternalLink className="w-2.5 h-2.5 text-slate-500" />
                            </a>
                          ))}
                        </div>
                      )}

                    {msg.artifact.type === "research" && (
                      <ResearchReportCard report={msg.artifact.data} />
                    )}
                    {msg.artifact.type === "plan" && (
                      <TaskDagCard plan={msg.artifact.data} />
                    )}
                    {msg.artifact.type === "chart" && (
                      <ChartCard chart={msg.artifact.data} />
                    )}
                    {msg.artifact.type === "matrix" && (
                      <DecisionMatrixCard matrix={msg.artifact.data} />
                    )}
                    {msg.artifact.type === "code" && (
                      <CodeSandboxCard codeArtifact={msg.artifact.data} />
                    )}
                    {msg.artifact.type === "debate" && (
                      <DebateCard debate={msg.artifact.data} />
                    )}
                  </div>
                )}

                {msg.thoughts && msg.thoughts.length > 0 && (
                  <TraceSteps
                    steps={
                      isStoppedMessage(msg)
                        ? settleStoppedSteps(msg.thoughts)
                        : msg.thoughts
                    }
                  />
                )}

                {/* Multi-Agent Swarm HUD in assistant message inspection */}
                {swarmMode &&
                  msg.thoughts &&
                  msg.thoughts.length > 0 &&
                  (() => {
                    const msgThoughts = isStoppedMessage(msg)
                      ? settleStoppedSteps(msg.thoughts)
                      : msg.thoughts;
                    const msgSwarm = mapThoughtsToSwarmEvents(msgThoughts);
                    const isCollapsed = collapsedMessageHUDs[msg.id] ?? false;

                    return (
                      <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-teal-400" />
                            <span className="text-xs font-semibold text-slate-200">
                              Multi-Agent Swarm HUD
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-teal-300 border border-slate-700">
                              {msgSwarm.events.length}{" "}
                              {msgSwarm.events.length === 1
                                ? "event"
                                : "events"}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleMessageHUD(msg.id)}
                            className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 transition cursor-pointer"
                            aria-label={
                              isCollapsed
                                ? "Expand Swarm HUD"
                                : "Collapse Swarm HUD"
                            }
                          >
                            <span>
                              {isCollapsed ? "Expand HUD" : "Collapse HUD"}
                            </span>
                            {isCollapsed ? (
                              <ChevronRight className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        <div
                          className={`transition-all duration-300 ease-in-out overflow-hidden ${
                            isCollapsed
                              ? "max-h-0 opacity-0 pointer-events-none"
                              : "max-h-[1000px] opacity-100"
                          }`}
                        >
                          <MultiAgentSwarmHUD
                            agentStates={msgSwarm.agentStates}
                            events={msgSwarm.events}
                            activeRole={msgSwarm.activeRole}
                            isExecuting={false}
                          />
                        </div>
                      </div>
                    );
                  })()}

                {/* Telemetry footer: only values reported by the server */}
                {msg.telemetry && (
                  <div className="pl-10 text-[10.5px] font-mono text-slate-500 flex flex-wrap items-center gap-2">
                    {msg.telemetry.latencyMs > 0 && (
                      <span>
                        {(msg.telemetry.latencyMs / 1000).toFixed(1)}s
                      </span>
                    )}
                    {msg.telemetry.tokenCount > 0 && (
                      <span>• {msg.telemetry.tokenCount} tokens</span>
                    )}
                    {msg.telemetry.tokensPerSec > 0 && (
                      <span>
                        • {Math.round(msg.telemetry.tokensPerSec)} tok/s
                      </span>
                    )}
                    {msg.telemetry.model && (
                      <span>• {msg.telemetry.model}</span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}

          {/* Live Streaming Thoughts & Loading Indicator */}
          {isLoading && (
            <div className="p-4 rounded-xl border border-teal-500/20 bg-teal-500/5 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center flex-shrink-0">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {swarmMode && (
                        <span
                          data-testid="active-specialist-badge"
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/40 uppercase tracking-wider shadow-[0_0_8px_rgba(20,184,166,0.2)]"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
                          {SWARM_ROLES[liveSwarm.activeRole]?.name || "Scout"}
                        </span>
                      )}
                      <p className="text-xs font-semibold text-teal-300 truncate">
                        {streamingThoughts.length > 0
                          ? swarmMode
                            ? formatActiveSpecialistThought(
                                liveSwarm.activeRole,
                                streamingThoughts[streamingThoughts.length - 1]
                                  ?.action,
                              )
                            : streamingThoughts[streamingThoughts.length - 1]
                                ?.action || "Thinking…"
                          : "Starting request…"}
                      </p>
                    </div>
                    <p className="text-[10px] font-mono text-slate-400">
                      {streamingThoughts.length > 0
                        ? `${streamingThoughts.length} ${streamingThoughts.length === 1 ? "step" : "steps"} in progress`
                        : "Connecting to model provider…"}
                    </p>
                  </div>
                </div>

                {onStop && (
                  <button
                    type="button"
                    onClick={onStop}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium transition cursor-pointer flex-shrink-0"
                    title="Stop generation"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    <span>Stop</span>
                  </button>
                )}
              </div>

              {/* Dynamic Swarm HUD during execution */}
              {swarmMode && (
                <div className="border-t border-teal-500/20 pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-teal-400" />
                      <span className="text-xs font-semibold text-slate-200">
                        Live Swarm Orchestration
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-teal-500/15 text-teal-300 border border-teal-500/30">
                        {liveSwarm.events.length}{" "}
                        {liveSwarm.events.length === 1 ? "event" : "events"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setIsLiveSwarmHUDCollapsed((prev) => !prev)
                      }
                      className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 transition cursor-pointer"
                      aria-label={
                        isLiveSwarmHUDCollapsed
                          ? "Expand Swarm HUD"
                          : "Collapse Swarm HUD"
                      }
                    >
                      <span>
                        {isLiveSwarmHUDCollapsed
                          ? "Expand HUD"
                          : "Collapse HUD"}
                      </span>
                      {isLiveSwarmHUDCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div
                    className={`transition-all duration-300 ease-in-out overflow-hidden ${
                      isLiveSwarmHUDCollapsed
                        ? "max-h-0 opacity-0 pointer-events-none"
                        : "max-h-[1000px] opacity-100"
                    }`}
                  >
                    <MultiAgentSwarmHUD
                      agentStates={liveSwarm.agentStates}
                      events={liveSwarm.events}
                      activeRole={liveSwarm.activeRole}
                      isExecuting={true}
                    />
                  </div>
                </div>
              )}

              {streamingThoughts.length > 0 && (
                <div className="border-t border-teal-500/10 pt-2.5">
                  <ol className="space-y-1.5 pl-2 border-l border-teal-500/20 text-[11px]">
                    {streamingThoughts.map((step, i) => {
                      const stepRole = classifyThoughtRole(step);
                      return (
                        <li
                          key={step.id || i}
                          className="flex items-start gap-2"
                        >
                          {step.status === "success" ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />
                          ) : step.status === "warn" ? (
                            <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                          ) : (
                            <Loader2 className="w-3 h-3 text-teal-400 animate-spin flex-shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0 flex-1">
                            <span className="font-semibold text-slate-200">
                              {step.agentName}
                            </span>
                            {swarmMode && (
                              <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9.5px] font-mono text-teal-300 bg-teal-500/15 border border-teal-500/30">
                                {SWARM_ROLES[stepRole]?.name || stepRole}
                              </span>
                            )}
                            <span className="text-slate-300">
                              {" "}
                              · {step.action}
                            </span>
                            {step.details && (
                              <p className="text-slate-400 text-[10.5px] break-words mt-0.5">
                                {step.details}
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}
            </div>
          )}

          {messages.length > 0 && noProvider && (
            <ProviderOnboarding
              onCheckAgain={onCheckModels}
              isChecking={isCheckingModels}
            />
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Composer, pinned at bottom. Hidden until a provider is configured. */}
        {!noProvider && (
          <div className="flex-shrink-0 p-3 md:p-4 max-w-4xl mx-auto w-full z-10">
            <div
              onPaste={handlePaste}
              className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md p-3 space-y-2.5 transition focus-within:border-teal-500/50 focus-within:shadow-teal-500/10"
            >
              {/* Top Row: Engine Selector & Thinking Depth */}
              <div className="flex items-center justify-between text-xs border-b border-slate-800/60 pb-2">
                {/* Mode Selector Chips */}
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                  {studioEngines.map((e) => {
                    const isSelected = currentMode === e.id;
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => {
                          sound.playCheck();
                          onSelectMode(e.id);
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
                          isSelected
                            ? "bg-teal-500/15 text-teal-300 border border-teal-500/40 font-semibold"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
                        }`}
                      >
                        <span
                          className={
                            isSelected ? "text-teal-400" : "text-slate-500"
                          }
                        >
                          {e.icon}
                        </span>
                        <span>{e.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Thinking Depth Segment */}
                  <div className="hidden sm:flex items-center gap-0.5 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10.5px] font-mono">
                    {(["quick", "analytical", "deep"] as const).map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => {
                          sound.playCheck();
                          setThinkingBudget(b);
                        }}
                        className={`px-2 py-0.5 rounded transition cursor-pointer capitalize ${
                          thinkingBudget === b
                            ? "bg-slate-800 text-teal-300 font-semibold"
                            : "text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        {b === "quick"
                          ? "⚡ Quick"
                          : b === "analytical"
                            ? "🧠 Analytical"
                            : "🔬 Deep"}
                      </button>
                    ))}
                  </div>

                  {/* Swarm Mode Toggle */}
                  <button
                    type="button"
                    data-testid="swarm-mode-toggle"
                    onClick={() => {
                      sound.playCheck();
                      setSwarmMode((prev) => !prev);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10.5px] font-mono transition cursor-pointer shrink-0 border ${
                      swarmMode
                        ? "bg-teal-500/15 text-teal-300 border-teal-500/40 shadow-[0_0_12px_rgba(20,184,166,0.3)] font-semibold"
                        : "text-slate-400 hover:text-slate-200 bg-slate-950/80 hover:bg-slate-800/60 border-slate-800"
                    }`}
                    title={
                      swarmMode
                        ? "Swarm Mode active: Orchestrating Scout, Analyst, Critic, and Synthesizer"
                        : "Enable Swarm Mode (multi-agent specialist orchestration)"
                    }
                  >
                    <Users
                      className={`w-3.5 h-3.5 ${
                        swarmMode ? "text-teal-400" : "text-slate-400"
                      }`}
                    />
                    <span>Swarm Mode</span>
                    {swarmMode && (
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse shadow-[0_0_6px_rgba(45,212,191,0.8)]" />
                    )}
                  </button>
                </div>
              </div>

              {/* File Attachment Error Notice */}
              {fileError && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                  <span className="flex-1 text-[11px] font-mono leading-tight">
                    {fileError}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFileError(null)}
                    aria-label="Dismiss error"
                    className="p-0.5 rounded text-rose-400 hover:text-rose-200 transition cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Pending Attachments List (with Image Preview and Formatted File Size) */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950 border border-teal-500/40 text-xs text-teal-200"
                    >
                      {att.type.startsWith("image/") ? (
                        // User-attached image preview (data URL); next/image can't optimize it.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={att.content}
                          alt={att.name}
                          className="w-5 h-5 rounded object-cover border border-teal-500/40"
                        />
                      ) : (
                        <FileText className="w-3 h-3 text-teal-400" />
                      )}
                      <span className="font-medium truncate max-w-[160px] text-[11px]">
                        {att.name}
                      </span>
                      <span className="text-[10px] text-teal-400/70 font-mono">
                        ({formatFileSize(att.size)})
                      </span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(att.id)}
                        aria-label={`Remove ${att.name}`}
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
                  className="w-full bg-slate-950/70 border border-slate-800 focus:border-teal-500/50 rounded-xl px-3 py-2 text-xs md:text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition"
                />
              </div>

              {/* Bottom Action Row: Attach, Screenshot, Voice, Enhance, and Submit */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/40">
                <div className="flex items-center gap-1.5">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      handleFileUpload(e.target.files);
                      if (e.target) e.target.value = "";
                    }}
                    className="hidden"
                    accept=".txt,.md,.json,.csv,.tsv,.py,.ts,.js,.markdown,.html,.xml,.yaml,.yml,image/*"
                    multiple
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach documents (.txt, .md, .json, .csv, .py, .ts, .js)"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-teal-300 hover:bg-slate-800 transition cursor-pointer"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Paste screenshot (⌘V) or upload photo"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-teal-300 hover:bg-slate-800 transition cursor-pointer hidden sm:block"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={toggleVoiceInput}
                    title={
                      isListening
                        ? "Listening... click to stop"
                        : "Start voice input"
                    }
                    className={`p-1.5 rounded-lg transition cursor-pointer flex items-center justify-center ${
                      isListening
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse"
                        : "text-slate-400 hover:text-teal-300 hover:bg-slate-800"
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                  </button>

                  {input.trim() && (
                    <button
                      type="button"
                      onClick={handleEnhancePrompt}
                      disabled={isEnhancing}
                      className="flex items-center gap-1 text-[11px] text-teal-400 hover:text-teal-300 bg-teal-500/10 px-2 py-1 rounded-md transition cursor-pointer disabled:opacity-50"
                      title="Rewrite the prompt to be more specific"
                    >
                      {isEnhancing ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Wand2 className="w-3 h-3" />
                      )}
                      <span>Enhance</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="hidden md:inline text-[10px] font-mono text-slate-500">
                    {isLoading ? "Generation in progress" : "Press Enter ↵"}
                  </span>
                  {isLoading ? (
                    <button
                      type="button"
                      onClick={onStop}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                      title="Stop generation"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Stop</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSubmit()}
                      disabled={
                        (!input.trim() && attachments.length === 0) || isLoading
                      }
                      className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40 shadow-sm"
                    >
                      <span>Send</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Side-by-Side Artifact Stage (when an artifact is selected) */}
      {selectedArtifact && (
        <ArtifactStage
          artifact={selectedArtifact}
          onClose={() => setSelectedArtifact(null)}
          onRefinePrompt={(refineText) => {
            sound.playStart();
            if (onSendMessage) {
              onSendMessage(refineText, thinkingBudget, undefined);
            } else if (onSubmitPrompt) {
              onSubmitPrompt(refineText, undefined, thinkingBudget);
            }
          }}
          mode={currentMode}
          model={
            messages
              .slice()
              .reverse()
              .find((m) => m.telemetry?.model)?.telemetry?.model
          }
        />
      )}

      {/* Workspace Session Export Modal */}
      <SessionExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        session={currentSessionObj}
      />

      {/* Floating Audio Overview Briefing Player Bar */}
      {activeAudioBriefing && (
        <AudioBriefingBar
          isPlaying={activeAudioBriefing.isPlaying}
          isPaused={activeAudioBriefing.isPaused}
          currentChunk={activeAudioBriefing.currentChunk}
          totalChunks={activeAudioBriefing.totalChunks}
          currentSpeed={activeAudioBriefing.speed}
          onPlayPause={handlePlayPauseBriefing}
          onStop={handleStopBriefing}
          onSpeedChange={handleSpeedChange}
          title={activeAudioBriefing.title}
        />
      )}
    </div>
  );
}
