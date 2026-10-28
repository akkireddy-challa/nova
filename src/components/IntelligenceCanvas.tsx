"use client";

import React, { useState, useRef, useMemo } from "react";
import {
  Brain,
  Search,
  Tag,
  FileText,
  UploadCloud,
  FolderUp,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Layers,
  Sparkles,
} from "lucide-react";
import type { KnowledgeMemoryItem } from "@/lib/types";
import { sound } from "@/lib/sound";
import { parseAttachedFile } from "@/lib/document-parser";
import {
  indexDocumentIntoMemories,
  groupDocumentMemories,
  type DocumentGroup,
} from "@/lib/document-indexer";
import {
  hybridSearchMemories,
  batchIndexDocuments,
  type HybridSearchResultItem,
} from "@/lib/research/hybrid-rrf";
import { formatDate } from "@/lib/utils";

interface Props {
  memoryItems: KnowledgeMemoryItem[];
  onSaveMemoryItems?: (items: KnowledgeMemoryItem[]) => void;
  onDeleteMemoryItems?: (ids: string[]) => void;
}

type SearchMode = "hybrid" | "bm25" | "vector";

interface SearchState {
  query: string;
  mode: SearchMode;
  hits: HybridSearchResultItem[];
  fallbackReason?: string;
}

/**
 * Search over user's saved memories and indexed local documents via Hybrid RRF, BM25, or Dense Vectors.
 * Provides a dedicated Indexed Local Documents (RAG) manager with drag-and-drop, multi-document batch ingestion, and chunk inspection.
 */
export function IntelligenceCanvas({
  memoryItems,
  onSaveMemoryItems,
  onDeleteMemoryItems,
}: Props) {
  const [activeTab, setActiveTab] = useState<"search" | "documents">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("hybrid");
  const [searchResults, setSearchResults] = useState<SearchState | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Document RAG state
  const [isDragging, setIsDragging] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<string | null>(null);
  const [indexError, setIndexError] = useState<string | null>(null);
  const [indexSuccessMessage, setIndexSuccessMessage] = useState<string | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);
    sound.playStart();

    try {
      let queryVector: number[] | undefined;
      let getVectors: (() => Promise<Map<string, number[]>>) | undefined;
      let fallbackReason: string | undefined;

      // Attempt to retrieve dense vector embeddings if not in explicit keyword-only mode
      if (searchMode !== "bm25") {
        try {
          const texts = [
            searchQuery.trim(),
            ...memoryItems.map((m) => `${m.title}\n${m.content}`.trim()),
          ];
          const embRes = await fetch("/api/v1/embeddings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ input: texts }),
          });

          if (embRes.ok) {
            const embData = (await embRes.json()) as {
              data?: Array<{ embedding?: number[] }>;
            };
            if (Array.isArray(embData?.data) && embData.data.length > 0) {
              queryVector = embData.data[0]?.embedding;
              const vecMap = new Map<string, number[]>();
              memoryItems.forEach((m, idx) => {
                const vec = embData.data?.[idx + 1]?.embedding;
                if (vec) vecMap.set(m.id, vec);
              });
              getVectors = async () => vecMap;
            }
          } else {
            fallbackReason =
              "Embeddings service unavailable. Fell back transparently to BM25 keyword matching.";
          }
        } catch {
          fallbackReason =
            "Embeddings endpoint unreachable. Fell back transparently to BM25 keyword matching.";
        }
      }

      const hits = await hybridSearchMemories(searchQuery.trim(), memoryItems, {
        queryVector,
        getVectors,
        mode: searchMode,
      });

      setSearchResults({
        query: searchQuery.trim(),
        mode: searchMode,
        hits,
        fallbackReason:
          searchMode !== "bm25" &&
          hits.length > 0 &&
          hits[0].method === "bm25_keyword"
            ? fallbackReason
            : undefined,
      });
      sound.playSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Search failed.");
      setSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleBatchProcessFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setIsIndexing(true);
    setIndexError(null);
    setIndexSuccessMessage(null);
    setBatchProgress(`Reading ${fileArray.length} file(s)...`);
    sound.playStart();

    const docsToBatch: Array<{ name: string; content: string }> = [];
    const errorMessages: string[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setBatchProgress(
        `Reading ${file.name} (${i + 1}/${fileArray.length})...`,
      );
      try {
        const text = await file.text();
        if (text && text.trim()) {
          docsToBatch.push({ name: file.name, content: text });
        } else {
          errorMessages.push(`Skipped "${file.name}" because it is empty.`);
        }
      } catch (err: unknown) {
        errorMessages.push(
          `Failed to read "${file.name}": ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    if (docsToBatch.length > 0) {
      setBatchProgress(
        `Chunking and indexing ${docsToBatch.length} document(s)...`,
      );
      const newChunks = batchIndexDocuments(docsToBatch);

      if (newChunks.length > 0) {
        // If an existing document with the same name was indexed, remove its old chunks
        const newNames = new Set(docsToBatch.map((d) => d.name.toLowerCase()));
        const oldMemoryIds = memoryItems
          .filter((m) => {
            const match = m.title.match(/^(.*?)(?:\s+\(Part\s+\d+\/\d+\))?$/);
            const name =
              match && match[1]
                ? match[1].trim().toLowerCase()
                : m.title.toLowerCase();
            return newNames.has(name);
          })
          .map((m) => m.id);

        if (oldMemoryIds.length > 0 && onDeleteMemoryItems) {
          onDeleteMemoryItems(oldMemoryIds);
        }

        if (onSaveMemoryItems) {
          onSaveMemoryItems(newChunks);
        } else {
          try {
            const saved = localStorage.getItem("nova_memory");
            const existing: KnowledgeMemoryItem[] = saved
              ? JSON.parse(saved)
              : [];
            const oldIdSet = new Set(oldMemoryIds);
            const filtered = existing.filter((m) => !oldIdSet.has(m.id));
            const updated = [...newChunks, ...filtered];
            localStorage.setItem("nova_memory", JSON.stringify(updated));
          } catch {}
        }

        sound.playSuccess();
        setIndexSuccessMessage(
          `Batch Ingestion Complete: Successfully indexed ${docsToBatch.length} document${
            docsToBatch.length > 1 ? "s" : ""
          } (${newChunks.length} RAG chunk${newChunks.length > 1 ? "s" : ""}).`,
        );
      }
    }

    if (errorMessages.length > 0) {
      setIndexError(errorMessages.join(" "));
    }

    setBatchProgress(null);
    setIsIndexing(false);
    if (batchFileInputRef.current) {
      batchFileInputRef.current.value = "";
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
                Hybrid RAG
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Reciprocal Rank Fusion (RRF), BM25 keyword scoring, and dense
              vector similarity.
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

            {/* Search Mode selector pills */}
            <div className="flex flex-wrap items-center gap-2 pb-1">
              <span className="text-[11px] font-medium text-slate-400">
                Search Mode:
              </span>
              <div className="inline-flex items-center p-1 bg-slate-950/90 border border-slate-800 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setSearchMode("hybrid")}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                    searchMode === "hybrid"
                      ? "bg-teal-500/20 text-teal-300 border border-teal-500/30 font-semibold shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Hybrid RRF{" "}
                  <span className="text-[10px] text-teal-400/90 font-normal ml-0.5">
                    (Recommended)
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSearchMode("bm25")}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                    searchMode === "bm25"
                      ? "bg-teal-500/20 text-teal-300 border border-teal-500/30 font-semibold shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Keyword (BM25)
                </button>
                <button
                  type="button"
                  onClick={() => setSearchMode("vector")}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                    searchMode === "vector"
                      ? "bg-teal-500/20 text-teal-300 border border-teal-500/30 font-semibold shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Dense Vector
                </button>
              </div>
            </div>

            <form onSubmit={handleSearch} className="flex items-center gap-2">
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

            {searchResults !== null && !error && (
              <div className="space-y-3 pt-2">
                <p className="text-[11px] text-slate-400">
                  {searchResults.hits.length > 0 &&
                  searchResults.hits[0].method === "hybrid_rrf" ? (
                    <>
                      Ranked by{" "}
                      <strong className="text-purple-300 font-semibold">
                        Hybrid RRF
                      </strong>{" "}
                      (Reciprocal Rank Fusion k=60) combining BM25 keyword
                      rankings with dense vector cosine similarity.
                    </>
                  ) : searchResults.hits.length > 0 &&
                    searchResults.hits[0].method === "vector_dense" ? (
                    <>
                      Ranked by{" "}
                      <strong className="text-cyan-300 font-semibold">
                        Dense Vector Cosine Similarity
                      </strong>
                      .
                    </>
                  ) : (
                    <>
                      Ranked by{" "}
                      <strong className="text-amber-300 font-semibold">
                        BM25 Keyword Scoring
                      </strong>{" "}
                      across title and content tokens.
                    </>
                  )}
                </p>

                {searchResults.fallbackReason && (
                  <p className="text-[11px] text-amber-300">
                    {searchResults.fallbackReason}
                  </p>
                )}

                {searchResults.hits.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    No matching memories or document passages found for &ldquo;
                    {searchResults.query}&rdquo;.
                  </p>
                ) : (
                  <>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Results ({searchResults.hits.length})
                    </span>

                    <div className="space-y-2.5">
                      {searchResults.hits.map((hit) => {
                        const memory = hit.memory;
                        const isDocument =
                          memory.category === "document" ||
                          memory.id.startsWith("doc-");

                        return (
                          <div
                            key={memory.id}
                            className={`p-3.5 rounded-xl border bg-slate-950/70 space-y-2.5 transition ${
                              isDocument
                                ? "border-teal-900/60 hover:border-teal-700/60"
                                : "border-slate-800 hover:border-slate-700"
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                {isDocument ? (
                                  <FileText className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                                ) : (
                                  <Tag className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                )}
                                <span className="text-xs font-semibold text-slate-200">
                                  {memory.title}
                                </span>

                                {/* Document or Memory Category Badge */}
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold ${
                                    isDocument
                                      ? "bg-teal-500/10 text-teal-300 border border-teal-500/20"
                                      : "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                                  }`}
                                >
                                  {isDocument
                                    ? "Document (RAG)"
                                    : memory.category || "Memory"}
                                </span>

                                {/* Matching Method Badge */}
                                <span
                                  className={`text-[9px] px-2 py-0.5 rounded uppercase tracking-wider font-bold border ${
                                    hit.method === "hybrid_rrf"
                                      ? "bg-purple-500/10 text-purple-300 border-purple-500/30"
                                      : hit.method === "vector_dense"
                                        ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
                                        : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                                  }`}
                                >
                                  {hit.method === "hybrid_rrf"
                                    ? "Hybrid RRF"
                                    : hit.method === "vector_dense"
                                      ? "Vector"
                                      : "BM25"}
                                </span>

                                {/* Rank contributions */}
                                {(hit.bm25Rank !== undefined ||
                                  hit.vectorRank !== undefined) && (
                                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                                    {hit.bm25Rank !== undefined &&
                                    hit.vectorRank !== undefined
                                      ? `BM25: #${hit.bm25Rank} • Vector: #${hit.vectorRank}`
                                      : hit.bm25Rank !== undefined
                                        ? `BM25: #${hit.bm25Rank}`
                                        : `Vector: #${hit.vectorRank}`}
                                  </span>
                                )}
                              </div>

                              <span className="text-[11px] text-teal-300 font-mono">
                                score {hit.score.toFixed(4)}
                              </span>
                            </div>

                            <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                              {memory.content}
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
          {/* Batch Ingest Card */}
          <div className="p-4 rounded-2xl border border-teal-500/30 bg-teal-950/20 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 shrink-0">
                <FolderUp className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-200">
                  Batch Multi-Document Ingestion
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Select multiple files (.txt, .md, .json, .csv) to chunk and
                  index simultaneously into RAG memory.
                </p>
              </div>
            </div>

            <input
              type="file"
              ref={batchFileInputRef}
              multiple
              accept=".txt,.md,.markdown,.json,.csv"
              onChange={(e) => {
                if (e.target.files) {
                  void handleBatchProcessFiles(e.target.files);
                }
              }}
              className="hidden"
            />

            <button
              type="button"
              disabled={isIndexing}
              onClick={() => batchFileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition disabled:opacity-50 shrink-0 shadow-sm"
            >
              <FolderUp className="w-4 h-4" />
              <span>Batch Ingest Multiple Documents</span>
            </button>
          </div>

          {/* Batch Ingest Progress */}
          {batchProgress && (
            <div className="p-3.5 rounded-xl border border-teal-500/40 bg-teal-950/40 text-teal-300 text-xs flex items-center gap-2.5">
              <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin shrink-0" />
              <span className="font-mono text-[11px]">{batchProgress}</span>
            </div>
          )}

          {/* Dropzone & Single / Multi File Picker Card */}
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
              className="mt-1 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition disabled:opacity-50"
            >
              {isIndexing ? "Indexing Document..." : "Select Individual Files"}
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
