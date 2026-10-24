'use client';

import React, { useState } from 'react';
import { ChartArtifact } from '@/lib/types';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { BarChart3, LineChart as LineIcon, TrendingUp, Sparkles } from 'lucide-react';

interface Props {
  chart: ChartArtifact;
}

export function ChartCard({ chart }: Props) {
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

  return (
    <div className="w-full my-4 rounded-xl border border-slate-700/80 bg-slate-900/90 backdrop-blur-md overflow-hidden shadow-2xl transition-all">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm leading-tight">
              {chart.title}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Generative Visual Data Model
            </p>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs">
          <button
            onClick={() => setChartType('bar')}
            className={`p-1.5 rounded flex items-center gap-1 transition ${
              chartType === 'bar' ? 'bg-slate-700 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Bar</span>
          </button>
          <button
            onClick={() => setChartType('line')}
            className={`p-1.5 rounded flex items-center gap-1 transition ${
              chartType === 'line' ? 'bg-slate-700 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LineIcon className="w-3.5 h-3.5" />
            <span>Line</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="p-5 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart data={chart.data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#f8fafc',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="value" name="Adoption Index / Volume" fill="#10b981" radius={[4, 4, 0, 0]} />
              {chart.data[0]?.secondaryValue !== undefined && (
                <Bar dataKey="secondaryValue" name="Legacy Baseline" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              )}
            </BarChart>
          ) : (
            <LineChart data={chart.data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#f8fafc',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Line type="monotone" dataKey="value" name="Growth Curve" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
              {chart.data[0]?.secondaryValue !== undefined && (
                <Line type="monotone" dataKey="secondaryValue" name="Legacy Baseline" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 4" />
              )}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Insight banner */}
      <div className="p-3.5 bg-slate-950/70 border-t border-slate-800 flex items-start gap-2.5">
        <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-300 leading-relaxed">
          <span className="font-semibold text-emerald-400">Key Projection: </span>
          {chart.insight}
        </p>
      </div>
    </div>
  );
}
