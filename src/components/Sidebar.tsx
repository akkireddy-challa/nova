"use client";

import React, { useState, useRef, useEffect } from "react";
import { StudioMode, Session } from "@/lib/types";
import {
  Brain,
  Puzzle,
  Clock,
  Trash2,
  ChevronRight,
  FolderGit2,
  Settings as SettingsIcon,
  MessageSquare,
  Search,
  X,
  Pencil,
  Copy,
  FolderArchive,
} from "lucide-react";
import { sound } from "@/lib/sound";
import { SessionExportModal } from "./SessionExportModal";

interface Props {
  currentMode: StudioMode;
  onSelectMode: (mode: StudioMode) => void;
  sessions: Session[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onDeleteSession?: (id: string) => void;
  onRenameSession?: (id: string, newTitle: string) => void;
  onDuplicateSession?: (id: string) => void;
  onApplyPrompt: (prompt: string, mode: StudioMode) => void;
  onOpenDevHub?: () => void;
  onOpenSettings?: () => void;
  onOpenExportModal?: () => void;
  onImportSessions?: (sessions: Session[]) => void;
}

export function Sidebar({
  currentMode,
  onSelectMode,
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
  onDuplicateSession,
  onApplyPrompt,
  onOpenDevHub,
  onOpenSettings,
  onOpenExportModal,
  onImportSessions,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);
  const isSavingRef = useRef(false);

  const handleOpenExport = () => {
    sound.playCheck();
    if (onOpenExportModal) {
      onOpenExportModal();
    } else {
      setIsExportModalOpen(true);
    }
  };

  useEffect(() => {
    if (editingSessionId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingSessionId]);

  const filteredSessions = sessions.filter((s) => {
    if (!searchQuery.trim()) return true;
    const title = s.title || "Untitled Session";
    return title.toLowerCase().includes(searchQuery.trim().toLowerCase());
  });
  const isStudioMode = [
    "research",
    "debate",
    "planner",
    "canvas",
    "matrix",
    "coder",
  ].includes(currentMode);

  const workspaces = [
    {
      id: "research" as StudioMode,
      label: "Chat",
      icon: <MessageSquare className="w-4 h-4" />,
      isActive: isStudioMode,
      description: "Research, Plan, Compare, Chart, Code, Debate",
    },
    {
      id: "intelligence" as StudioMode,
      label: "Memory Search",
      icon: <Brain className="w-4 h-4" />,
      isActive: currentMode === "intelligence",
    },
    {
      id: "mcp" as StudioMode,
      label: "Tools & API",
      icon: <Puzzle className="w-4 h-4" />,
      isActive: currentMode === "mcp",
      badge: "MCP",
    },
  ];

  const presets: { label: string; mode: StudioMode; prompt: string }[] = [
    {
      label: "What is new in the latest Node.js LTS?",
      mode: "research",
      prompt: "What are the notable changes in the latest Node.js LTS release?",
    },
    {
      label: "Plan a small open-source launch",
      mode: "planner",
      prompt:
        "Plan a two-week schedule to prepare and launch a small open-source library.",
    },
    {
      label: "Compare local vs hosted LLMs",
      mode: "matrix",
      prompt:
        "Compare running an open-weight model locally with Ollama against a hosted LLM API for privacy, latency, and cost.",
    },
  ];

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    sound.playCheck();
    onDeleteSession?.(id);
  };

  const handleDuplicate = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    sound.playCheck();
    onDuplicateSession?.(id);
  };

  const handleStartRename = (e: React.MouseEvent, session: Session) => {
    e.stopPropagation();
    sound.playCheck();
    isSavingRef.current = false;
    setEditingSessionId(session.id);
    setEditTitle(session.title || "Untitled Session");
  };

  const handleSaveRename = (id: string) => {
    if (isSavingRef.current || editingSessionId !== id) return;
    isSavingRef.current = true;
    setEditingSessionId(null);
    const trimmed = editTitle.trim();
    if (onRenameSession) {
      onRenameSession(id, trimmed || "Untitled Session");
    }
    setTimeout(() => {
      isSavingRef.current = false;
    }, 50);
  };

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-slate-950/70 hidden md:flex flex-col h-[calc(100vh-3.5rem)] select-none">
      {/* Primary Workspaces Navigation */}
      <div className="p-3 border-b border-slate-800/80 space-y-1">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 py-1">
          Workspaces
        </p>
        {workspaces.map((w) => {
          return (
            <button
              key={w.label}
              onClick={() => {
                sound.playCheck();
                onSelectMode(w.id);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                w.isActive
                  ? "bg-slate-900 text-teal-300 border border-slate-800 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={w.isActive ? "text-teal-400" : "text-slate-500"}
                >
                  {w.icon}
                </span>
                <span>{w.label}</span>
              </div>
              {w.badge ? (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  {w.badge}
                </span>
              ) : w.isActive ? (
                <ChevronRight className="w-3.5 h-3.5 text-teal-400" />
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Recent Sessions List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="flex items-center justify-between px-2 py-1">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Recent Sessions
          </p>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-slate-500">
              {searchQuery.trim()
                ? `${filteredSessions.length}/${sessions.length}`
                : sessions.length}
            </span>
            <button
              type="button"
              onClick={handleOpenExport}
              title="Export & Backup Sessions"
              aria-label="Export & Backup Sessions"
              className="p-1 rounded text-slate-500 hover:text-teal-400 hover:bg-slate-800 transition cursor-pointer"
            >
              <FolderArchive className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Search / Filter Input */}
        <div className="relative my-1">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sessions..."
            className="w-full bg-slate-900/60 border border-slate-800/80 focus:border-teal-500/50 focus:bg-slate-900 focus:outline-none rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder-slate-500 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              title="Clear search"
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {sessions.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500">
            No sessions yet. Ask a question to start one.
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500">
            No sessions found matching &quot;{searchQuery}&quot;
          </div>
        ) : (
          filteredSessions.map((s) => {
            const isActive = s.id === activeSessionId;
            const isEditing = editingSessionId === s.id;

            if (isEditing) {
              return (
                <div
                  key={s.id}
                  onClick={(e) => e.stopPropagation()}
                  className="px-2 py-1.5 rounded-lg bg-slate-900 border border-teal-500/60 shadow-sm"
                >
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSaveRename(s.id);
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          setEditingSessionId(null);
                        }
                      }}
                      onBlur={() => handleSaveRename(s.id)}
                      className="w-full bg-slate-950 border border-slate-700 focus:border-teal-400 rounded px-1.5 py-0.5 text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>
              );
            }

            return (
              <div
                key={s.id}
                onClick={() => {
                  sound.playCheck();
                  onSelectSession(s.id);
                }}
                className={`group flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition cursor-pointer ${
                  isActive
                    ? "bg-slate-900 text-teal-300 font-medium border border-slate-800"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
                }`}
              >
                <div className="flex items-center gap-2 truncate min-w-0 flex-1 mr-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  <span className="truncate">
                    {s.title || "Untitled Session"}
                  </span>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  {onRenameSession && (
                    <button
                      type="button"
                      onClick={(e) => handleStartRename(e, s)}
                      title="Rename session"
                      aria-label="Rename session"
                      className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-200 transition"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                  {onDuplicateSession && (
                    <button
                      type="button"
                      onClick={(e) => handleDuplicate(e, s.id)}
                      title="Duplicate session"
                      aria-label="Duplicate session"
                      className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-teal-300 transition"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  )}
                  {onDeleteSession && (
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, s.id)}
                      title="Delete session"
                      aria-label="Delete session"
                      className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-red-400 transition"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Quick Starter Presets */}
        <div className="pt-4">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 py-1 mb-1">
            Examples
          </p>
          <div className="space-y-1">
            {presets.map((p, idx) => (
              <button
                key={idx}
                onClick={() => {
                  sound.playCheck();
                  onApplyPrompt(p.prompt, p.mode);
                }}
                className="w-full text-left p-2 rounded-lg bg-slate-900/40 hover:bg-slate-900 border border-slate-800/60 hover:border-slate-700 transition cursor-pointer text-[11px]"
              >
                <div className="text-slate-300 font-medium line-clamp-1">
                  {p.label}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pinned Bottom Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/80 space-y-1">
        <button
          type="button"
          onClick={handleOpenExport}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition cursor-pointer"
        >
          <FolderArchive className="w-4 h-4 text-teal-400" />
          <span>Export & Backup</span>
        </button>

        <button
          onClick={() => {
            sound.playCheck();
            onOpenSettings?.();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition cursor-pointer"
        >
          <SettingsIcon className="w-4 h-4 text-slate-400" />
          <span>Settings</span>
        </button>

        <button
          onClick={() => {
            sound.playCheck();
            onOpenDevHub?.();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition cursor-pointer"
        >
          <FolderGit2 className="w-4 h-4 text-teal-400" />
          <span>Developer Hub</span>
        </button>
      </div>

      {/* Internal Export & Backup Modal fallback when not controlled externally */}
      {!onOpenExportModal && (
        <SessionExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          session={sessions.find((s) => s.id === activeSessionId)}
          sessions={sessions}
          onImportSessions={onImportSessions}
        />
      )}
    </aside>
  );
}
