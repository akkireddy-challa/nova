'use client';

import React, { useState } from 'react';
import { Brain, Search, Tag } from 'lucide-react';
import { KnowledgeMemoryItem } from '@/lib/types';
import type { MemorySearchHit, MemorySearchResult } from '@/lib/memory-search';
import { sound } from '@/lib/sound';

interface Props {
  memoryItems: KnowledgeMemoryItem[];
}

/** Search over the user's saved memories via POST /api/intelligence (embeddings or keyword). */
export function IntelligenceCanvas({ memoryItems }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [search, setSearch] = useState<MemorySearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSemanticSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);
    sound.playStart();

    try {
      const res = await fetch('/api/intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery.trim(),
          memories: memoryItems,
        }),
      });

      const data: unknown = await res.json().catch(() => null);
      const rec = (data ?? {}) as Partial<MemorySearchResult> & { error?: unknown };
      if (!res.ok || (rec.method !== 'embeddings' && rec.method !== 'keyword')) {
        setError(typeof rec.error === 'string' ? rec.error : `Search failed (HTTP ${res.status}).`);
        setSearch(null);
        return;
      }
      setSearch({
        query: typeof rec.query === 'string' ? rec.query : searchQuery.trim(),
        method: rec.method,
        embeddingModel: typeof rec.embeddingModel === 'string' ? rec.embeddingModel : undefined,
        fallbackReason: typeof rec.fallbackReason === 'string' ? rec.fallbackReason : undefined,
        results: Array.isArray(rec.results) ? (rec.results as MemorySearchHit[]) : [],
      });
      sound.playSuccess();
    } catch {
      setError('Could not reach the Nova server.');
      setSearch(null);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
        <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
          <Brain className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-100">Memory Search</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Search your {memoryItems.length} saved {memoryItems.length === 1 ? 'memory' : 'memories'}. Uses embeddings when Gemini, OpenAI, or an Ollama embedding model is configured; otherwise keyword search.
          </p>
        </div>
      </div>

      <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-md space-y-4">
        {memoryItems.length === 0 && (
          <p className="text-xs text-slate-400">
            You have no saved memories yet. Add some with Memory (⌘J), then search them here.
          </p>
        )}

        <form onSubmit={handleSemanticSearch} className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search your memories..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={!searchQuery.trim() || isSearching}
            className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition disabled:opacity-40"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {error && <p className="text-xs text-rose-300">{error}</p>}

        {search !== null && !error && (
          <div className="space-y-3 pt-2">
            <p className="text-[11px] text-slate-400">
              {search.method === 'embeddings' ? (
                <>
                  Ranked by embedding similarity using{' '}
                  <span className="font-mono text-slate-300">{search.embeddingModel}</span>.
                </>
              ) : (
                <>Ranked by keyword match (BM25). Configure an embeddings provider for meaning-based search.</>
              )}
            </p>
            {search.fallbackReason && (
              <p className="text-[11px] text-amber-300">
                Embeddings failed, so keyword search was used: {search.fallbackReason}
              </p>
            )}

            {search.results.length === 0 ? (
              <p className="text-xs text-slate-400">No matching memories.</p>
            ) : (
              <>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Results ({search.results.length})
                </span>

                <div className="space-y-2.5">
                  {search.results.map(hit => (
                    <div
                      key={hit.memoryId}
                      className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5 text-teal-400" />
                          <span className="text-xs font-semibold text-slate-200">{hit.title}</span>
                          {hit.totalChunks > 1 && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              part {hit.chunkIndex} of {hit.totalChunks}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-teal-300 font-mono">
                          {search.method === 'embeddings' ? 'similarity' : 'score'} {hit.score.toFixed(2)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed font-sans">{hit.text}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
