"use client";

import React from "react";
import { KeyRound, Loader2, RefreshCw, Server } from "lucide-react";

interface Props {
  onCheckAgain: () => void;
  isChecking: boolean;
}

/** Shown in place of the composer when GET /api/v1/models returns no models. */
export function ProviderOnboarding({ onCheckAgain, isChecking }: Props) {
  return (
    <div className="max-w-xl mx-auto w-full p-5 rounded-2xl border border-teal-500/20 bg-slate-900 shadow-2xl space-y-4 text-left">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-slate-100">
          Connect a model to get started
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Nova needs at least one LLM provider to write answers. Pick whichever
          you have:
        </p>
      </div>

      <div className="space-y-3 text-xs text-slate-300">
        <div className="flex items-start gap-2.5">
          <KeyRound className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-slate-200">An API key</p>
            <p className="text-slate-400 leading-relaxed">
              Copy <code className="font-mono text-teal-300">.env.example</code>{" "}
              to <code className="font-mono text-teal-300">.env</code> and set
              one of{" "}
              <code className="font-mono text-teal-300">GEMINI_API_KEY</code>,{" "}
              <code className="font-mono text-teal-300">ANTHROPIC_API_KEY</code>
              , or{" "}
              <code className="font-mono text-teal-300">OPENAI_API_KEY</code>.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <Server className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-slate-200">
              Or a local model with Ollama
            </p>
            <pre className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
              {`ollama serve
ollama pull <model>`}
            </pre>
          </div>
        </div>

        <p className="text-slate-400">Then restart Nova and check again.</p>
      </div>

      <button
        type="button"
        onClick={onCheckAgain}
        disabled={isChecking}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition cursor-pointer disabled:opacity-50"
      >
        {isChecking ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <RefreshCw className="w-3.5 h-3.5" />
        )}
        <span>{isChecking ? "Checking…" : "Check again"}</span>
      </button>
    </div>
  );
}
