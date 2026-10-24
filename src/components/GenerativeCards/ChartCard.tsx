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
import { 
  BarChart3, 
  LineChart as LineIcon, 
  TrendingUp, 
  Sparkles, 
  Table, 
  Download, 
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { sound } from '@/lib/sound';

function calculateStatistics(values: number[]) {
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = values.length > 0 ? sum / values.length : 0;
  return { sum, mean };
}

function calculateVarianceDelta(val: number, secondary?: number) {
  if (secondary === undefined || secondary === null) return { formatted: '—', trend: 'neutral' as const };
  const delta = val - secondary;
  const pct = secondary !== 0 ? (delta / secondary) * 100 : 0;
  const formatted = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
  const trend = pct > 0 ? ('up' as const) : pct < 0 ? ('down' as const) : ('neutral' as const);
  return { formatted, trend };
}

interface Props {
  chart: ChartArtifact;
}

export function ChartCard({ chart }: Props) {
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [copied, setCopied] = useState(false);

  const stats = calculateStatistics(chart.data?.map(d => d.value) || []);
  const total = stats.sum > 0 ? stats.sum : (chart.data?.reduce((acc, d) => acc + d.value, 0) || 1);

  const handleExportCsv = () => {
    sound.playCheck();
    const rows = ['Label,Value,Baseline,SharePercentage'];
    chart.data.forEach(d => {
      const share = total > 0 ? ((d.value / total) * 100).toFixed(1) + '%' : '0.0%';
      rows.push(`"${d.label}",${d.value},${d.secondaryValue || 0},${share}`);
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chart.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
              {chart.data.length} data points
            </p>
          </div>
        </div>

        {/* View toggle & CSV Export */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" /> : <Download className="w-3.5 h-3.5" />}
            <span>{copied ? 'Exported' : 'Export CSV'}</span>
          </button>

          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs">
            <button
              onClick={() => { sound.playCheck(); setChartType('bar'); }}
              className={`p-1.5 rounded flex items-center gap-1 transition ${
                chartType === 'bar' ? 'bg-slate-700 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Bar</span>
            </button>
            <button
              onClick={() => { sound.playCheck(); setChartType('line'); }}
              className={`p-1.5 rounded flex items-center gap-1 transition ${
                chartType === 'line' ? 'bg-slate-700 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LineIcon className="w-3.5 h-3.5" />
              <span>Line</span>
            </button>
          </div>
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
              <Bar dataKey="value" name="Observed Volume / Adoption" fill="#10b981" radius={[4, 4, 0, 0]} />
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
          <span className="font-semibold text-emerald-400">Insight: </span>
          {chart.insight}
        </p>
      </div>

      {/* Statistical Data Table Breakdown */}
      <div className="border-t border-slate-800 bg-slate-950/40 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] uppercase font-semibold text-slate-400 tracking-wider flex items-center gap-1.5">
            <Table className="w-3.5 h-3.5 text-teal-400" />
            Detailed Segment Breakdown
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            Total Aggregate: {total} Units
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-800/80 rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-2.5">Category / Cohort</th>
                <th className="p-2.5 text-right">Volume</th>
                <th className="p-2.5 text-right">Baseline</th>
                <th className="p-2.5 text-right">Share</th>
                <th className="p-2.5 text-right">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {chart.data.map((d, i) => {
                const share = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0.0';
                const varDelta = calculateVarianceDelta(d.value, d.secondaryValue);
                return (
                  <tr key={i} className="hover:bg-slate-800/30 transition text-slate-300">
                    <td className="p-2.5 font-sans font-medium text-slate-200">{d.label}</td>
                    <td className="p-2.5 text-right font-bold text-emerald-400">{d.value}</td>
                    <td className="p-2.5 text-right text-slate-400">{d.secondaryValue ?? '—'}</td>
                    <td className="p-2.5 text-right text-slate-400">{share}%</td>
                    <td className={`p-2.5 text-right ${
                      varDelta.trend === 'up' ? 'text-teal-300' : varDelta.trend === 'down' ? 'text-rose-400' : 'text-slate-400'
                    }`}>
                      {varDelta.formatted}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Takeaways and follow-ups, only when the model provided them */}
      {((chart.takeaways?.length ?? 0) > 0 || (chart.followUpQuestions?.length ?? 0) > 0) && (
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 space-y-2">
          <span className="text-[11px] uppercase font-semibold text-slate-400 tracking-wider block">
            Takeaways & follow-ups
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {(chart.takeaways ?? []).map((t, i) => (
              <div key={`t-${i}`} className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 flex items-start gap-2">
                <ArrowRight className="w-3.5 h-3.5 text-teal-400 flex-shrink-0 mt-0.5" />
                <p className="text-slate-300 text-[11px]">{t}</p>
              </div>
            ))}
            {(chart.followUpQuestions ?? []).map((q, i) => (
              <div key={`q-${i}`} className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 flex items-start gap-2">
                <ArrowRight className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <p className="text-slate-300 text-[11px]">{q}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
