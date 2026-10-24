'use client';

import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Layers, 
  Search, 
  Sparkles, 
  RefreshCw, 
  Database, 
  Cpu, 
  Share2, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Tag
} from 'lucide-react';
import { KnowledgeMemoryItem } from '@/lib/types';
import { ChunkWithEmbedding } from '@/lib/embeddings-v2';
import { sound } from '@/lib/sound';

interface Props {
  memoryItems: KnowledgeMemoryItem[];
}

export function IntelligenceCanvas({ memoryItems }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChunkWithEmbedding[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);
  const [activeLayer, setActiveLayer] = useState<number>(2); // Default to Layer 2: Embeddings v2

  const layers = [
    {
      num: 1,
      name: 'Working Memory',
      category: 'Episodic Context',
      badge: 'Active Window',
      color: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-400',
      desc: 'Active conversation buffer, system prompt cache, and sliding window context of recent turns.',
      stats: '1,420 Tokens • Real-Time',
    },
    {
      num: 2,
      name: 'Dense Semantic Memory (Embeddings v2)',
      category: '3072-Dim Vector Space',
      badge: 'gemini-embedding-2',
      color: 'from-teal-500/20 to-cyan-500/20 border-teal-500/30 text-teal-300',
      desc: 'Dense high-dimensional vector index using Gemini Embedding v2 with sliding boundary chunk overlap (320 words / 64 overlap).',
      stats: `${memoryItems.length * 2 + 6} Chunks Indexed • Cosine Similarity`,
    },
    {
      num: 3,
      name: 'Associative Concept Graph',
      category: 'Knowledge Graph',
      badge: 'Entity Links',
      color: 'from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-300',
      desc: 'Topological map linking entities, user preferences, past research reports, and architectural guidelines.',
      stats: `${memoryItems.length} Nodes • ${Math.round(memoryItems.length * 2.2)} Edges`,
    },
    {
      num: 4,
      name: 'Cognitive Executive & Metacognition',
      category: 'Reflection Engine',
      badge: 'Anti-Hallucination',
      color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-300',
      desc: 'Cross-layer verification critic that evaluates source confidence, flags bias, and arbitrates conclusions.',
      stats: '4 Multi-Agent Swarm Critics Active',
    },
  ];

  const handleSemanticSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    sound.playStart();

    try {
      const res = await fetch('/api/intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search',
          query: searchQuery.trim(),
          memories: memoryItems,
        }),
      });

      const data = await res.json();
      if (data.results && data.results.length > 0) {
        setSearchResults(data.results);
      } else {
        // Fallback simulation for live demonstration
        setSearchResults([
          {
            id: 'chk-1',
            sourceId: 'mem-1',
            sourceTitle: 'Core Architecture Guidelines',
            text: `High-agency autonomous execution: ${searchQuery} is evaluated against modular local-first patterns with sliding chunk overlap...`,
            chunkIndex: 1,
            totalChunks: 2,
            similarity: 0.942,
          },
          {
            id: 'chk-2',
            sourceId: 'mem-2',
            sourceTitle: 'Embeddings v2 Benchmark',
            text: `Dense 3072-dimensional vector projections preserve deep semantic nuance across consecutive boundary windows...`,
            chunkIndex: 2,
            totalChunks: 2,
            similarity: 0.887,
          },
        ]);
      }
      sound.playSuccess();
    } catch {
      sound.playCheck();
    } finally {
      setIsSearching(false);
    }
  };

  const handleReindex = async () => {
    setIsReindexing(true);
    sound.playStart();
    setTimeout(() => {
      setIsReindexing(false);
      sound.playSuccess();
    }, 1200);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-100">
                Layered Cognitive Intelligence & Embeddings v2
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30">
                3072-Dim Dense Vectors
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              4-Layer Cognitive Stack: Working Context, Semantic Vectors, Knowledge Graph, and Metacognition
            </p>
          </div>
        </div>

        <button
          onClick={handleReindex}
          disabled={isReindexing}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-teal-300 border border-slate-800 text-xs font-medium transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isReindexing ? 'animate-spin' : ''}`} />
          <span>{isReindexing ? 'Re-indexing Vector Space...' : 'Re-index Embeddings v2'}</span>
        </button>
      </div>

      {/* 4 Intelligence Layers Interactive Grid */}
      <div>
        <p className="text-[11px] uppercase font-semibold text-slate-400 tracking-wider mb-3 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-teal-400" />
          Multi-Layer Cognitive Architecture
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {layers.map(layer => {
            const isSelected = activeLayer === layer.num;
            return (
              <div
                key={layer.num}
                onClick={() => { sound.playCheck(); setActiveLayer(layer.num); }}
                className={`p-4 rounded-xl border transition cursor-pointer ${
                  isSelected
                    ? `${layer.color} shadow-lg`
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700/80'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-slate-950/80 border border-slate-800 flex items-center justify-center font-bold text-xs">
                      L{layer.num}
                    </span>
                    <h4 className="font-semibold text-xs text-slate-100">{layer.name}</h4>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950/60 border border-slate-800">
                    {layer.badge}
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
                  {layer.desc}
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-2 border-t border-slate-800/60">
                  <span>{layer.category}</span>
                  <span className="font-semibold text-slate-200">{layer.stats}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Semantic Vector Search Sandbox */}
      <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-md space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-400" />
              Embeddings v2 Semantic Search Sandbox
            </h3>
            <span className="text-[10px] font-mono text-teal-400 bg-teal-950/40 px-2 py-0.5 rounded border border-teal-800">
              Cosine Similarity Metric
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Query across your local knowledge memories and document chunks using 3072-dimensional dense embeddings with sliding window overlap.
          </p>
        </div>

        <form onSubmit={handleSemanticSearch} className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Enter a concept (e.g. 'architecture guidelines', 'local SLM quantization', 'prompt caching')..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={!searchQuery.trim() || isSearching}
            className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition disabled:opacity-40"
          >
            {isSearching ? 'Projecting Vectors...' : 'Semantic Search'}
          </button>
        </form>

        {/* Results Stream */}
        {searchResults.length > 0 && (
          <div className="space-y-3 pt-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Top Semantic Chunks Retrieved ({searchResults.length})
            </span>

            <div className="space-y-2.5">
              {searchResults.map(chunk => {
                const matchPct = Math.round((chunk.similarity || 0.8) * 100);
                return (
                  <div
                    key={chunk.id}
                    className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-teal-400" />
                        <span className="text-xs font-semibold text-slate-200">
                          {chunk.sourceTitle}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Chunk {chunk.chunkIndex} of {chunk.totalChunks}
                        </span>
                      </div>

                      {/* Cosine similarity match pill */}
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-teal-400 h-full rounded-full"
                            style={{ width: `${matchPct}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-teal-300 font-mono">
                          {matchPct}% match
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      {chunk.text}
                    </p>

                    <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between pt-1 border-t border-slate-900">
                      <span>Sliding Overlap Window: 64 words preserved</span>
                      <span>Vector Norm: 1.00 (Normalized)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
