"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Session } from "@/lib/types";
import {
  X,
  Download,
  FileText,
  Copy,
  Check,
  FolderArchive,
  UploadCloud,
  AlertCircle,
  CheckCircle2,
  Code,
  FileCode2,
  Share2,
} from "lucide-react";
import { sound } from "@/lib/sound";
import {
  exportSessionAsJson,
  exportAllSessionsAsJson,
  exportSessionAsMarkdown,
  downloadSessionMarkdown,
  copySessionMarkdownToClipboard,
  validateSessionBackup,
} from "@/lib/session-export";
import { downloadStandaloneHtmlDossier } from "@/lib/html-dossier";

export interface SessionExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  session?: Session;
  sessions?: Session[];
  onImportSessions?: (sessions: Session[]) => void;
}

export function SessionExportModal({
  isOpen,
  onClose,
  session,
  sessions,
  onImportSessions,
}: SessionExportModalProps) {
  const [activeTab, setActiveTab] = useState<"export" | "backup">("export");
  const [copiedFormat, setCopiedFormat] = useState<"md" | "json" | null>(null);

  // Restore & drag-and-drop state
  const [isDragging, setIsDragging] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    type: "idle" | "success" | "error";
    message?: string;
    count?: number;
  }>({ type: "idle" });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Reset status when reopening modal
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setImportStatus({ type: "idle" });
      setCopiedFormat(null);
    }
  }

  const allSessions = useMemo(() => {
    if (sessions && sessions.length > 0) return sessions;
    if (session) return [session];
    return [];
  }, [sessions, session]);

  const markdownSnippet = useMemo(() => {
    if (!session) return "";
    return exportSessionAsMarkdown(session);
  }, [session]);

  if (!isOpen) return null;

  const handleCopyMarkdown = async () => {
    if (!session) return;
    const ok = await copySessionMarkdownToClipboard(session);
    if (ok) {
      sound.playCheck();
      setCopiedFormat("md");
      setTimeout(() => setCopiedFormat(null), 2000);
    }
  };

  const handleCopyJson = () => {
    if (!session) return;
    try {
      const jsonStr = JSON.stringify(session, null, 2);
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(jsonStr);
        sound.playCheck();
        setCopiedFormat("json");
        setTimeout(() => setCopiedFormat(null), 2000);
      }
    } catch {
      // ignore
    }
  };

  const handleDownloadMarkdown = () => {
    if (!session) return;
    sound.playSuccess();
    downloadSessionMarkdown(session);
  };

  const handleDownloadJson = () => {
    if (!session) return;
    sound.playSuccess();
    exportSessionAsJson(session);
  };

  const handleDownloadHtmlDossier = () => {
    if (!session) return;
    sound.playSuccess();
    const activeArtifact = session.messages
      .slice()
      .reverse()
      .find((m) => Boolean(m.artifact))?.artifact;
    downloadStandaloneHtmlDossier(activeArtifact, session);
  };

  const handleBackupAll = () => {
    if (allSessions.length === 0) return;
    sound.playSuccess();
    exportAllSessionsAsJson(allSessions);
  };

  const processFileContent = (content: string) => {
    try {
      const parsed = JSON.parse(content);
      const validation = validateSessionBackup(parsed);

      if (!validation.valid) {
        setImportStatus({
          type: "error",
          message: validation.error,
        });
        sound.playCheck();
        return;
      }

      setImportStatus({
        type: "success",
        message: `Successfully verified and imported ${validation.sessions.length} session${validation.sessions.length === 1 ? "" : "s"}.`,
        count: validation.sessions.length,
      });
      sound.playSuccess();

      if (onImportSessions) {
        onImportSessions(validation.sessions);
      }
    } catch (err) {
      setImportStatus({
        type: "error",
        message:
          err instanceof Error
            ? `JSON parse error: ${err.message}`
            : "Failed to parse file: Invalid JSON format",
      });
      sound.playCheck();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === "string") {
        processFileContent(result);
      }
    };
    reader.onerror = () => {
      setImportStatus({
        type: "error",
        message: "Failed to read backup file from disk",
      });
    };
    reader.readAsText(file);
    // Reset file input so same file can be re-selected if needed
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === "string") {
        processFileContent(result);
      }
    };
    reader.onerror = () => {
      setImportStatus({
        type: "error",
        message: "Failed to read dropped file",
      });
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="h-14 px-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <FolderArchive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Session Archive & Export Hub
              </h3>
              <p className="text-[11px] text-slate-400">
                Export markdown docs, snapshots, or backup your workspaces
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-5 border-b border-slate-800 bg-slate-950/30 flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              sound.playCheck();
              setActiveTab("export");
            }}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-medium border-b-2 transition cursor-pointer ${
              activeTab === "export"
                ? "border-teal-400 text-teal-300 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export Active Session</span>
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playCheck();
              setActiveTab("backup");
            }}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-medium border-b-2 transition cursor-pointer ${
              activeTab === "backup"
                ? "border-teal-400 text-teal-300 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Backup & Restore</span>
            {allSessions.length > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {allSessions.length}
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === "export" ? (
            session ? (
              <div className="space-y-4">
                {/* Active Session Info Card */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                      Active Workspace
                    </span>
                    <h4 className="text-xs font-semibold text-slate-200 mt-0.5">
                      {session.title || "Untitled Session"}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {session.messages.length} message
                      {session.messages.length === 1 ? "" : "s"} •{" "}
                      {
                        session.messages.filter((m) => Boolean(m.artifact))
                          .length
                      }{" "}
                      generative artifact
                      {session.messages.filter((m) => Boolean(m.artifact))
                        .length === 1
                        ? ""
                        : "s"}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-1 rounded bg-slate-900 border border-slate-800 text-teal-400">
                    {session.mode || "research"}
                  </span>
                </div>

                {/* Export Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Markdown (.md) */}
                  <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-teal-500/30 transition space-y-2.5 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-teal-400 text-xs font-semibold">
                          <FileText className="w-4 h-4" />
                          <span>Markdown (.md)</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">
                          GitHub
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Clean documentation with executive summaries, findings,
                        source links, and code blocks.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleDownloadMarkdown}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-semibold transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download .md</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyMarkdown}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
                        title="Copy Markdown"
                      >
                        {copiedFormat === "md" ? (
                          <Check className="w-3.5 h-3.5 text-teal-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* JSON Snapshot (.json) */}
                  <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-cyan-500/30 transition space-y-2.5 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-semibold">
                          <Code className="w-4 h-4" />
                          <span>JSON Snapshot (.json)</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">
                          Structured
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Raw session payload with message logs, telemetry,
                        thoughts, and structured artifacts.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleDownloadJson}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download .json</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyJson}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
                        title="Copy JSON"
                      >
                        {copiedFormat === "json" ? (
                          <Check className="w-3.5 h-3.5 text-cyan-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Standalone HTML Dossier (.html) */}
                  <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-emerald-500/30 transition space-y-2.5 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                          <Share2 className="w-4 h-4" />
                          <span>HTML Dossier (.html)</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">
                          Interactive
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Self-contained dossier with interactive citations, live
                        weight sliders, and zero network dependencies.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleDownloadHtmlDossier}
                        title="Download Standalone HTML Dossier (.html)"
                        aria-label="Download Standalone HTML Dossier (.html)"
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download .html</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Markdown Preview Snippet */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">
                      Markdown Export Preview
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyMarkdown}
                      className="text-[11px] text-slate-400 hover:text-teal-300 flex items-center gap-1 cursor-pointer transition"
                    >
                      {copiedFormat === "md" ? (
                        <>
                          <Check className="w-3 h-3 text-teal-400" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Markdown</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-3 max-h-48 overflow-y-auto font-mono text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap select-all">
                    {markdownSnippet}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center rounded-xl bg-slate-950/50 border border-slate-800 space-y-2">
                <FileCode2 className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-300 font-medium">
                  No active session selected
                </p>
                <p className="text-[11px] text-slate-500">
                  Select a session from the sidebar to export its markdown
                  report or JSON snapshot.
                </p>
              </div>
            )
          ) : (
            /* Backup & Restore Tab */
            <div className="space-y-4">
              {/* Backup All Card */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1 max-w-sm">
                  <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold">
                    <FolderArchive className="w-4 h-4" />
                    <span>Backup All Sessions</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Download a single consolidated JSON archive containing all{" "}
                    {allSessions.length} session
                    {allSessions.length === 1 ? "" : "s"} in your workspace.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleBackupAll}
                  disabled={allSessions.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 text-xs font-semibold transition cursor-pointer flex-shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Backup All (.json)</span>
                </button>
              </div>

              {/* Restore / File Dropzone */}
              <div className="space-y-2">
                <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider px-1">
                  Restore from JSON Backup
                </span>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-6 rounded-xl border-2 border-dashed transition cursor-pointer flex flex-col items-center justify-center text-center space-y-2 ${
                    isDragging
                      ? "border-teal-400 bg-teal-500/10"
                      : "border-slate-800 bg-slate-950/30 hover:border-slate-700 hover:bg-slate-950/60"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="p-3 rounded-full bg-slate-900 border border-slate-800 text-teal-400">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-200">
                      Click to select or drag & drop backup JSON file
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Supports `.nova.json` single sessions or full backup
                      archives
                    </p>
                  </div>
                </div>

                {/* Import Status Alert */}
                {importStatus.type === "success" && (
                  <div className="p-3 rounded-xl bg-teal-950/40 border border-teal-500/30 flex items-center gap-2.5 text-xs text-teal-200 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
                    <span>{importStatus.message}</span>
                  </div>
                )}

                {importStatus.type === "error" && (
                  <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 flex items-center gap-2.5 text-xs text-red-200 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span>{importStatus.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-14 px-5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between flex-shrink-0">
          <span className="text-[11px] text-slate-500 font-mono">
            {allSessions.length} total session
            {allSessions.length === 1 ? "" : "s"} in library
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
