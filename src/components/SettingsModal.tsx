'use client';

import React, { useState } from 'react';
import { ThinkingBudget, UserSettings } from '@/lib/types';
import { ModelEntry, ModelsStatus, providerLabel } from '@/lib/client/models';
import { Settings, X, Server, KeyRound, RefreshCw, Loader2 } from 'lucide-react';
import { sound } from '@/lib/sound';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSaveSettings: (settings: UserSettings) => void;
  models: ModelEntry[];
  modelsStatus: ModelsStatus;
  onCheckModels: () => void;
}

const BUDGETS: { id: ThinkingBudget; label: string; desc: string }[] = [
  { id: 'quick', label: 'Quick', desc: 'Fewer sources, shorter answers.' },
  { id: 'analytical', label: 'Analytical', desc: 'The default balance.' },
  { id: 'deep', label: 'Deep', desc: 'More sources and longer answers; slower.' },
];

const ENV_VARS: { provider: string; vars: string }[] = [
  { provider: 'gemini', vars: 'GEMINI_API_KEY (or GOOGLE_API_KEY), GEMINI_MODEL' },
  { provider: 'anthropic', vars: 'ANTHROPIC_API_KEY, ANTHROPIC_MODEL' },
  { provider: 'openai', vars: 'OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL' },
  { provider: 'ollama', vars: 'OLLAMA_BASE_URL, OLLAMA_MODEL' },
];

export function SettingsModal({ isOpen, onClose, settings, onSaveSettings, models, modelsStatus, onCheckModels }: Props) {
  const [budget, setBudget] = useState<ThinkingBudget>(settings.defaultThinkingBudget);

  if (!isOpen) return null;

  const handleSave = () => {
    sound.playSuccess();
    onSaveSettings({ ...settings, defaultThinkingBudget: budget });
    onClose();
  };

  const byProvider = new Map<string, ModelEntry[]>();
  for (const m of models) {
    byProvider.set(m.provider, [...(byProvider.get(m.provider) ?? []), m]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-sm">Settings</h3>
              <p className="text-xs text-slate-400">Model providers and defaults</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Providers */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-100">Available models</span>
              <button
                onClick={onCheckModels}
                disabled={modelsStatus === 'loading'}
                className="flex items-center gap-1 text-[11px] text-teal-400 hover:text-teal-300 font-medium disabled:opacity-50"
              >
                {modelsStatus === 'loading' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                <span>Refresh</span>
              </button>
            </div>

            {modelsStatus === 'error' ? (
              <p className="text-amber-400">Could not load the model list from the server.</p>
            ) : models.length === 0 && modelsStatus === 'ready' ? (
              <p className="text-slate-400">No providers are configured yet.</p>
            ) : (
              <div className="space-y-2">
                {[...byProvider.entries()].map(([provider, list]) => (
                  <div key={provider} className="p-3 rounded-xl border border-slate-800 bg-slate-950/40">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Server className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-semibold text-slate-200">{providerLabel(provider, list[0]?.ownedBy)}</span>
                      <span className="text-[10px] font-mono text-slate-500">{list.length} model{list.length === 1 ? '' : 's'}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {list.map(m => (
                        <span
                          key={m.id}
                          className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300"
                        >
                          {m.model}
                          {m.isDefault && <span className="text-slate-500"> (default)</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 space-y-2 text-slate-300">
              <div className="flex items-center gap-2 font-semibold text-slate-200">
                <KeyRound className="w-3.5 h-3.5 text-teal-400" />
                <span>Adding a provider</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Keys are read by the server from <code className="font-mono text-teal-300">.env</code>, never stored in the
                browser. Copy <code className="font-mono text-teal-300">.env.example</code> to{' '}
                <code className="font-mono text-teal-300">.env</code>, set the variables below, and restart Nova.
              </p>
              <ul className="space-y-1 font-mono text-[11px]">
                {ENV_VARS.map(v => (
                  <li key={v.provider}>
                    <span className="text-slate-200">{providerLabel(v.provider)}:</span>{' '}
                    <span className="text-slate-400">{v.vars}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Defaults */}
          <section className="space-y-2">
            <span className="font-semibold text-slate-100 block">Default depth</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {BUDGETS.map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => { sound.playCheck(); setBudget(b.id); }}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    budget === b.id
                      ? 'bg-slate-950 border-teal-500/40 text-slate-100'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="font-semibold block">{b.label}</span>
                  <span className="text-[11px] text-slate-400">{b.desc}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-end gap-2 text-xs">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold transition shadow-lg shadow-teal-500/10"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
