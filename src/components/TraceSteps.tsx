'use client';

import React from 'react';
import { AgentThought } from '@/lib/types';
import { AlertTriangle, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';

interface Props {
  steps: AgentThought[];
}

function StatusIcon({ status }: { status: AgentThought['status'] }) {
  if (status === 'success') return <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />;
  if (status === 'warn') return <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />;
  return <Loader2 className="w-3 h-3 text-slate-400 flex-shrink-0 mt-0.5" />;
}

function formatTime(ts: string): string {
  // Accept ISO timestamps as well as preformatted strings.
  if (!ts.includes('T')) return ts;
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? ts : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/** The steps the server reports it actually ran (search, fetch, LLM call, retry). Collapsed by default. */
export function TraceSteps({ steps }: Props) {
  if (steps.length === 0) return null;
  const warnings = steps.filter(s => s.status === 'warn').length;

  return (
    <details className="group pl-10 text-[11px]">
      <summary className="list-none flex items-center gap-1 cursor-pointer text-slate-500 hover:text-slate-300 font-mono select-none">
        <ChevronRight className="w-3 h-3 transition group-open:rotate-90" />
        <span>
          {steps.length} {steps.length === 1 ? 'step' : 'steps'}
          {warnings > 0 && <span className="text-amber-400"> · {warnings} warning{warnings === 1 ? '' : 's'}</span>}
        </span>
      </summary>
      <ol className="mt-1.5 space-y-1 border-l border-slate-800 pl-3">
        {steps.map((step, i) => (
          <li key={step.id || i} className="flex items-start gap-2">
            <StatusIcon status={step.status} />
            <div className="min-w-0">
              <span className="font-semibold text-slate-300">{step.agentName}</span>
              <span className="text-slate-400"> · {step.action}</span>
              {step.details && <p className="text-slate-500 break-words">{step.details}</p>}
            </div>
            {step.timestamp && (
              <span className="ml-auto pl-2 font-mono text-[10px] text-slate-600 shrink-0">{formatTime(step.timestamp)}</span>
            )}
          </li>
        ))}
      </ol>
    </details>
  );
}
