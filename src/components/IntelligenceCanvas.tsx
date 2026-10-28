"use client";

import React, { useState, useRef, useMemo } from "react";
import {
  Brain,
  Search,
  Tag,
  FileText,
  UploadCloud,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Layers,
  Sparkles,
} from "lucide-react";
import { KnowledgeMemoryItem } from "@/lib/types";
import type { MemorySearchHit, MemorySearchResult } from "@/lib/memory-search";
import { sound } from "@/lib/sound";
import { parseAttachedFile } from "@/lib/document-parser";
import {
  indexDocumentIntoMemories,
  groupDocumentMemories,
  type DocumentGroup,
} from "@/lib/document-indexer";
import { formatDate } from "@/lib/utils";

interface Props {
  memoryItems: KnowledgeMemoryItem[];
  onSaveMemoryItems?: (items: KnowledgeMemoryItem[]) => void;
  onDeleteMemoryItems?: (ids: string[]) => void;
}

/**
 * Search over user's saved memories and indexed local documents via POST /api/intelligence (embeddings or BM25).
 * Provides a dedicated Indexed Local Documents (RAG) manager with file dropzone and chunk inspection.
 */
export function IntelligenceCanvas({
  memoryItems,
  onSaveMemoryItems,
  onDeleteMemoryItems,
}: Props) {
  const [activeTab, setActiveTab] = useState<"search" | "documents">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [search, setSearch] = useState<MemorySearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Document RAG state
  const [isDragging, setIsDragging] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexError, setIndexError] = useState<string | null>(null);
  const [indexSuccessMessage, setIndexSuccessMessage] = useState<string | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Group document memories into high-level document overviews
  const indexedDocs = useMemo(
    () => groupDocumentMemories(memoryItems),
    [memoryItems],
  );

  const totalDocumentChunks = useMemo(
    () =>
      memoryItems.filter(
        (m) =>
          m.category === "document" ||
          m.id.startsWith("doc-") ||
          (Array.isArray(m.tags) && m.tags.includes("document")),
      ).length,
    [memoryItems],
  );

  const handleSemanticSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);
    sound.playStart();

    try {
      const res = await fetch("/api/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery.trim(),
          memories: memoryItems,
        }),
      });

      const data: unknown = await res.json().catch(() => null);
      const rec = (data ?? {}) as Partial<MemorySearchResult> & {
        error?: unknown;
      };
      if (
        !res.ok ||
        (rec.method !== "embeddings" && rec.method !== "keyword")
      ) {
        setError(
          typeof rec.error === "string"
            ? rec.error
            : `Search failed (HTTP ${res.status}).`,
        );
        setSearch(null);
        return;
      }
      setSearch({
        query: typeof rec.query === "string" ? rec.query : searchQuery.trim(),
        method: rec.method,
        embeddingModel:
          typeof rec.embeddingModel === "string"
            ? rec.embeddingModel
            : undefined,
        fallbackReason:
          typeof rec.fallbackReason === "string"
            ? rec.fallbackReason
            : undefined,
        results: Array.isArray(rec.results)
          ? (rec.results as MemorySearchHit[])
          : [],
      });
      sound.playSuccess();
    } catch {
      setError("Could not reach the Nova server.");
      setSearch(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleProcessFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setIsIndexing(true);
    setIndexError(null);
    setIndexSuccessMessage(null);
    sound.playStart();

    let newChunksCount = 0;
    const allNewMemories: KnowledgeMemoryItem[] = [];
    const errorMessages: string[] = [];
    const successfullyIndexed: string[] = [];

    for (const file of fileArray) {
      try {
        const parsed = await parseAttachedFile(file);

        // If an existing document with the same name was indexed, remove its old chunks
        const oldMemories = memoryItems.filter((m) => {
          const match = m.title.match(/^(.*?)(?:\s+\(Part\s+\d+\/\d+\))?$/);
          const name = match && match[1] ? match[1].trim() : m.title;
          return name.toLowerCase() === parsed.name.toLowerCase();
        });

        if (oldMemories.length > 0 && onDeleteMemoryItems) {
          onDeleteMemoryItems(oldMemories.map((m) => m.id));
        }

        const chunks = indexDocumentIntoMemories({
          name: parsed.name,
          content: parsed.content,
          type: parsed.type,
        });

        if (chunks.length > 0) {
          allNewMemories.push(...chunks);
          newChunksCount += chunks.length;
          successfullyIndexed.push(parsed.name);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        errorMessages.push(message);
      }
    }

    if (allNewMemories.length > 0) {
      if (onSaveMemoryItems) {
        onSaveMemoryItems(allNewMemories);
      } else {
        try {
          const saved = localStorage.getItem("nova_memory");
          const existing: KnowledgeMemoryItem[] = saved
            ? JSON.parse(saved)
            : [];
          const updated = [...allNewMemories, ...existing];
          localStorage.setItem("nova_memory", JSON.stringify(updated));
        } catch {}
      }
      sound.playSuccess();
      setIndexSuccessMessage(
        `Successfully indexed ${successfullyIndexed.length} document${
          successfullyIndexed.length > 1 ? "s" : ""
        } (${newChunksCount} RAG chunk${newChunksCount > 1 ? "s" : ""}).`,
      );
    }

    if (errorMessages.length > 0) {
      setIndexError(errorMessages.join(" "));
    }

    setIsIndexing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDeleteDocument = (doc: DocumentGroup) => {
    if (onDeleteMemoryItems) {
      onDeleteMemoryItems(doc.memoryIds);
    } else {
      try {
        const saved = localStorage.getItem("nova_memory");
        if (saved) {
          const existing: KnowledgeMemoryItem[] = JSON.parse(saved);
          const idSet = new Set(doc.memoryIds);
          const updated = existing.filter((m) => !idSet.has(m.id));
          localStorage.setItem("nova_memory", JSON.stringify(updated));
        }
      } catch {}
    }
    sound.playCheck();
    setIndexSuccessMessage(
      `Removed "${doc.docName}" and deleted all ${doc.totalChunks} associated chunks.`,
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              Intelligence & Knowledge Base
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
                Local RAG
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Semantic vector & BM25 keyword search across your personal
              memories and local documents.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl gap-1 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("search")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === "search"
                ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Memory Search</span>
            <span className="px-1.5 py-0.2 rounded-md bg-slate-800 text-[10px] text-slate-400 font-mono">
              {memoryItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("documents")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === "documents"
                ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Indexed Local Documents (RAG)</span>
            <span className="px-1.5 py-0.2 rounded-md bg-slate-800 text-[10px] text-teal-300 font-mono">
              {indexedDocs.length}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: MEMORY SEARCH */}
      {activeTab === "search" && (
        <div className="space-y-6">
          {/* Quick RAG Overview Banner */}
          <div className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5 text-slate-300">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>
                Indexing {memoryItems.length} total item
                {memoryItems.length === 1 ? "" : "s"} ({indexedDocs.length}{" "}
                document{indexedDocs.length === 1 ? "" : "s"} across{" "}
                {totalDocumentChunks} RAG chunk
                {totalDocumentChunks === 1 ? "" : "s"}).
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("documents")}
              className="text-teal-400 hover:text-teal-300 font-medium underline underline-offset-2 transition"
            >
              Manage & Index Documents &rarr;
            </button>
          </div>

          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-md space-y-4">
            {memoryItems.length === 0 && (
              <p className="text-xs text-slate-400">
                You have no saved memories or documents yet. Add memories with
                (⌘J) or index files in the &ldquo;Indexed Local Documents&rdquo;
                tab.
              </p>
            )}

            <form
              onSubmit={handleSemanticSearch}
              className="flex items-center gap-2"
            >
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your memories and local documents..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
                />
              </div>

              <button
                type="submit"
                disabled={!searchQuery.trim() || isSearching}
                className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition disabled:opacity-40"
              >
                {isSearching ? "Searching..." : "Search"}
              </button>
            </form>

            {error && <p className="text-xs text-rose-300">{error}</p>}

            {search !== null && !error && (
              <div className="space-y-3 pt-2">
                <p className="text-[11px] text-slate-400">
                  {search.method === "embeddings" ? (
                    <>
                      Ranked by embedding similarity using{" "}
                      <span className="font-mono text-slate-300">
                        {search.embeddingModel}
                      </span>
                      .
                    </>
                  ) : (
                    <>
                      Ranked by keyword match (BM25). Configure an embeddings
                      provider in Settings for vector similarity.
                    </>
                  )}
                </p>
                {search.fallbackReason && (
                  <p className="text-[11px] text-amber-300">
                    Embeddings failed, so keyword search was used:{" "}
                    {search.fallbackReason}
                  </p>
                )}

                {search.results.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    No matching memories or document passages found for &ldquo;
                    {search.query}&rdquo;.
                  </p>
                ) : (
                  <>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Results ({search.results.length})
                    </span>

                    <div className="space-y-2.5">
                      {search.results.map((hit) => {
                        const isDocument =
                          hit.category === "document" ||
                          hit.memoryId.startsWith("doc-");
                        return (
                          <div
                            key={hit.memoryId}
                            className={`p-3.5 rounded-xl border bg-slate-950/70 space-y-2 transition ${
                              isDocument
                                ? "border-teal-900/60 hover:border-teal-700/60"
                                : "border-slate-800 hover:border-slate-700"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {isDocument ? (
                                  <FileText className="w-3.5 h-3.5 text-teal-400" />
                                ) : (
                                  <Tag className="w-3.5 h-3.5 text-indigo-400" />
                                )}
                                <span className="text-xs font-semibold text-slate-200">
                                  {hit.title}
                                </span>
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold ${
                                    isDocument
                                      ? "bg-teal-500/10 text-teal-300 border border-teal-500/20"
                                      : "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                                  }`}
                                >
                                  {isDocument
                                    ? "Document (RAG)"
                                    : hit.category || "Memory"}
                                </span>
                                {hit.totalChunks > 1 && (
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    part {hit.chunkIndex} of {hit.totalChunks}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-teal-300 font-mono">
                                {search.method === "embeddings"
                                  ? "similarity"
                                  : "score"}{" "}
                                {hit.score.toFixed(2)}
                              </span>
                            </div>

                            <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                              {hit.text}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: INDEXED LOCAL DOCUMENTS (RAG) */}
      {activeTab === "documents" && (
        <div className="space-y-6">
          {/* Dropzone & File Picker Card */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files) {
                void handleProcessFiles(e.dataTransfer.files);
              }
            }}
            className={`p-6 rounded-2xl border-2 border-dashed transition flex flex-col items-center justify-center text-center gap-3 backdrop-blur-md ${
              isDragging
                ? "border-teal-400 bg-teal-500/10 text-teal-200"
                : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
            }`}
          >
            <div className="p-3 rounded-full bg-slate-800/80 border border-slate-700 text-teal-400">
              <UploadCloud className="w-6 h-6" />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-200">
                Drop local documents here to index into RAG memory
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-md">
                Supports <span className="text-slate-300">.txt</span>,{" "}
                <span className="text-slate-300">.md</span>,{" "}
                <span className="text-slate-300">.json</span>,{" "}
                <span className="text-slate-300">.csv</span>, code files, and
                configs up to 256 KB.
              </p>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept=".txt,.md,.markdown,.json,.csv,.tsv,.html,.xml,.py,.ts,.js,.yaml,.yml"
              onChange={(e) => {
                if (e.target.files) {
                  void handleProcessFiles(e.target.files);
                }
              }}
              className="hidden"
            />

            <button
              type="button"
              disabled={isIndexing}
              onClick={() => fileInputRef.current?.click()}
              className="mt-1 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition disabled:opacity-50"
            >
              {isIndexing
                ? "Indexing Document..."
                : "Select Files from Computer"}
            </button>
          </div>

          {/* Feedback messages */}
          {indexError && (
            <div className="p-3.5 rounded-xl border border-rose-900/60 bg-rose-950/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{indexError}</span>
            </div>
          )}

          {indexSuccessMessage && (
            <div className="p-3.5 rounded-xl border border-teal-900/60 bg-teal-950/40 text-teal-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-teal-400" />
              <span>{indexSuccessMessage}</span>
            </div>
          )}

          {/* Indexed Documents List Card */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-400" />
                <h3 className="text-sm font-semibold text-slate-200">
                  Indexed Documents ({indexedDocs.length})
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                {totalDocumentChunks} total chunk
                {totalDocumentChunks === 1 ? "" : "s"} in local RAG
              </span>
            </div>

            {indexedDocs.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-medium">
                  No local documents indexed yet.
                </p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Upload Markdown notes, API specs, or CSV datasets above to
                  ground your research sessions in private local knowledge.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {indexedDocs.map((doc) => (
                  <div
                    key={doc.docName}
                    className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/80 flex items-center justify-between gap-4 hover:border-slate-700 transition"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-slate-200 truncate">
                          {doc.docName}
                        </h4>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                          <span className="font-mono text-teal-300">
                            {doc.totalChunks} chunk
                            {doc.totalChunks === 1 ? "" : "s"}
                          </span>
                          <span>&bull;</span>
                          <span>{doc.totalWords.toLocaleString()} words</span>
                          <span>&bull;</span>
                          <span className="flex items-center gap-1 text-slate-500">
                            <Clock className="w-3 h-3" />
                            {formatDate(doc.lastUpdated)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(doc)}
                      title="Delete document and remove all associated chunk memories"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-900/60 hover:bg-rose-950/20 transition text-xs font-medium shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Document</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
