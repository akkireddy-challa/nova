"use client";

import React, { useState } from "react";
import { Code2, Layers, Terminal, X, BookOpen, Play } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function DevHubModal({ isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<
    "guide" | "components" | "architecture"
  >("guide");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-100 text-sm">
                  Nova Developer Hub
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30">
                  Open Source v0.1
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Local-first research assistant architecture, providers, and
                pipeline guide.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-5 border-b border-slate-800 bg-slate-900/50 text-xs">
          <button
            onClick={() => setActiveTab("guide")}
            className={`py-3 px-3.5 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "guide"
                ? "border-teal-400 text-teal-300 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-teal-400" />
            Developer Guide
          </button>
          <button
            onClick={() => setActiveTab("components")}
            className={`py-3 px-3.5 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "components"
                ? "border-teal-400 text-teal-300 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-teal-400" />
            Artifact Cards
          </button>
          <button
            onClick={() => setActiveTab("architecture")}
            className={`py-3 px-3.5 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "architecture"
                ? "border-teal-400 text-teal-300 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-teal-400" />
            Research Pipeline
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-slate-300">
          {activeTab === "guide" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-teal-500/20 bg-teal-950/10">
                <h4 className="font-semibold text-slate-100 text-sm mb-1 flex items-center gap-2">
                  <Play className="w-4 h-4 text-teal-400" />
                  Quick Start in 3 Commands
                </h4>
                <p className="text-slate-400 leading-relaxed mb-3">
                  Nova runs completely self-hosted with any provider of your
                  choice (Gemini, Claude, OpenAI, or local Ollama).
                </p>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-teal-300 space-y-1">
                  <p>bun install</p>
                  <p>cp .env.example .env</p>
                  <p>bun dev</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-slate-100">
                  Configurable Providers
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="font-semibold text-teal-400 block mb-1">
                      Google Gemini
                    </span>
                    <p className="text-slate-400">
                      Set <code>GEMINI_API_KEY</code> (or{" "}
                      <code>GOOGLE_API_KEY</code>); optional{" "}
                      <code>GEMINI_MODEL</code>.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="font-semibold text-teal-400 block mb-1">
                      Anthropic Claude
                    </span>
                    <p className="text-slate-400">
                      Set <code>ANTHROPIC_API_KEY</code>; optional{" "}
                      <code>ANTHROPIC_MODEL</code>.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="font-semibold text-teal-400 block mb-1">
                      OpenAI Compatible
                    </span>
                    <p className="text-slate-400">
                      Set <code>OPENAI_API_KEY</code> and optional{" "}
                      <code>OPENAI_BASE_URL</code> (OpenAI, OpenRouter, Groq).
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="font-semibold text-teal-400 block mb-1">
                      Local Ollama
                    </span>
                    <p className="text-slate-400">
                      Run <code>ollama serve</code> and pull a model. Uses{" "}
                      <code>OLLAMA_BASE_URL</code> (default{" "}
                      <code>http://localhost:11434</code>).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "components" && (
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-100">
                Visual Artifact Card Types
              </h4>
              <p className="text-slate-400">
                Instead of unstructured walls of text, Nova parses LLM output
                into structured, verifiable interactive cards:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="font-semibold text-teal-400 block mb-1">
                    Research Report Card
                  </span>
                  <p className="text-slate-400">
                    Summary, findings, risks, and clickable citations linked to
                    the fetched web sources.
                  </p>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="font-semibold text-teal-400 block mb-1">
                    Comparison Matrix
                  </span>
                  <p className="text-slate-400">
                    Weighted decision matrix evaluating candidate technologies
                    or strategies with interactive scoring.
                  </p>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="font-semibold text-teal-400 block mb-1">
                    Plan
                  </span>
                  <p className="text-slate-400">
                    Hierarchical milestone phases with checkable task
                    progression.
                  </p>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="font-semibold text-teal-400 block mb-1">
                    Data Chart
                  </span>
                  <p className="text-slate-400">
                    Interactive Recharts bar/line visualization built strictly
                    from numbers in the research sources.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "architecture" && (
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-100">
                Research pipeline
              </h4>
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] space-y-2 text-slate-300">
                <p>
                  <span className="text-teal-400 font-bold">
                    1. Query Decomposition:
                  </span>{" "}
                  Extract search terms and criteria.
                </p>
                <p>
                  <span className="text-blue-400 font-bold">
                    2. Pluggable Search:
                  </span>{" "}
                  Query Tavily, Brave, or DuckDuckGo HTML fallback.
                </p>
                <p>
                  <span className="text-amber-400 font-bold">
                    3. Page Extraction:
                  </span>{" "}
                  Fetch top pages with 8s timeout and HTML-to-text cleaner.
                </p>
                <p>
                  <span className="text-purple-400 font-bold">
                    4. Strict LLM Synthesis:
                  </span>{" "}
                  Ask provider to answer ONLY from extracted sources with
                  citation IDs.
                </p>
                <p>
                  <span className="text-emerald-400 font-bold">
                    5. Zod Schema Validation:
                  </span>{" "}
                  Validate JSON against schema; retry once on error; render
                  interactive card.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
