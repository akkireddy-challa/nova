'use client';

import React, { useState } from 'react';
import { DataScienceArtifact } from '@/lib/types';
import { 
  BarChart2, 
  Activity, 
  Layers, 
  Cpu, 
  Download, 
  Sparkles, 
  PieChart, 
  TrendingUp, 
  CheckCircle2,
  AlertTriangle,
  Compass
} from 'lucide-react';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  ZAxis, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  CartesianGrid, 
  LineChart, 
  Line, 
  Legend, 
  ReferenceLine 
} from 'recharts';
import { sound } from '@/lib/sound';
import { VoiceBriefingPlayer } from '../VoiceBriefing/VoiceBriefingPlayer';

interface Props {
  data: DataScienceArtifact;
}

const CLUSTER_COLORS = ['#2DD4BF', '#A78BFA', '#F59E0B', '#38BDF8', '#F43F5E'];

export function DataScienceWorkbenchCard({ data }: Props) {
  const [activeTab, setActiveTab] = useState<'vectors' | 'tokens' | 'calibration'>('vectors');
  const [showAudioBriefing, setShowAudioBriefing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleExportJson = () => {
    sound.playCheck();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-workbench.json`;
    a.click();
    URL.revokeObjectURL(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const spokenBriefingText = `${data.title}. ${data.overview}. The statistical verdict indicates: ${data.statisticalVerdict}. Average token entropy is ${data.tokenAnalysis.averageEntropy} bits with an Expected Calibration Error of ${data.confidenceCalibration.expectedCalibrationError}.`;

  return (
    <div className="w-full my-4 rounded-xl border border-slate-700/80 bg-slate-900/90 backdrop-blur-md overflow-hidden shadow-2xl transition-all">
      {/* Header bar */}
      <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-base leading-tight">
              {data.title}
            </h3>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                Data Science Workbench
              </span>
              <span>•</span>
              <span>{data.tokenAnalysis.totalTokens} Tokens Analyzed</span>
              <span>•</span>
              <span className="capitalize">{data.confidenceCalibration.status}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              setShowAudioBriefing(prev => !prev);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
              showAudioBriefing 
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            {showAudioBriefing ? 'Hide Audio Briefing' : 'Voice Briefing'}
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{copied ? 'Exported!' : 'Export JSON'}</span>
          </button>
        </div>
      </div>

      {/* Voice Briefing Sub-Deck */}
      {showAudioBriefing && (
        <div className="p-4 border-b border-slate-800 bg-slate-950/40 animate-in fade-in">
          <VoiceBriefingPlayer 
            rawBriefingText={spokenBriefingText}
            title={`${data.title} • Spoken Analysis`}
          />
        </div>
      )}

      {/* Overview & Key Metric Banners */}
      <div className="px-5 py-3 bg-slate-950/40 border-b border-slate-800/80">
        <p className="text-xs text-slate-300 leading-relaxed mb-3">
          {data.overview}
        </p>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Avg Token Entropy</span>
            <div className="text-base font-bold text-teal-300 font-mono mt-0.5">
              {data.tokenAnalysis.averageEntropy} <span className="text-xs font-normal text-slate-400">bits</span>
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Estimated Perplexity</span>
            <div className="text-base font-bold text-purple-300 font-mono mt-0.5">
              {data.tokenAnalysis.perplexityEstimate}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Expected Calib. Error</span>
            <div className="text-base font-bold text-emerald-300 font-mono mt-0.5">
              {(data.confidenceCalibration.expectedCalibrationError * 100).toFixed(1)}%
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Silhouette Score</span>
            <div className="text-base font-bold text-cyan-300 font-mono mt-0.5">
              {data.vectorClustering.silhouetteScore.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-5 border-b border-slate-800 flex items-center gap-2 pt-2 bg-slate-950/20">
        <button
          type="button"
          onClick={() => { sound.playTap(); setActiveTab('vectors'); }}
          className={`px-3 py-2 text-xs font-medium border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'vectors'
              ? 'border-emerald-400 text-emerald-300 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Vector Space ({data.vectorClustering.algorithm})</span>
        </button>

        <button
          type="button"
          onClick={() => { sound.playTap(); setActiveTab('tokens'); }}
          className={`px-3 py-2 text-xs font-medium border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'tokens'
              ? 'border-emerald-400 text-emerald-300 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          <span>Token Entropy & Perplexity</span>
        </button>

        <button
          type="button"
          onClick={() => { sound.playTap(); setActiveTab('calibration'); }}
          className={`px-3 py-2 text-xs font-medium border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'calibration'
              ? 'border-emerald-400 text-emerald-300 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Confidence Calibration (ECE)</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="p-5">
        {activeTab === 'vectors' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300">
                2D Projection of 3072-dim embeddings. Clustered into {data.vectorClustering.clusterCount} semantic concepts.
              </span>
              <div className="flex items-center gap-3">
                {data.vectorClustering.centroids.map((c, i) => (
                  <div key={c.clusterId} className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                    <span 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: CLUSTER_COLORS[i % CLUSTER_COLORS.length] }} 
                    />
                    <span>{c.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-64 w-full bg-slate-950/60 rounded-xl border border-slate-800 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 15, right: 20, bottom: 15, left: 15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    name="PCA Dim 1" 
                    stroke="#64748B" 
                    fontSize={10} 
                  />
                  <YAxis 
                    type="number" 
                    dataKey="y" 
                    name="PCA Dim 2" 
                    stroke="#64748B" 
                    fontSize={10} 
                  />
                  <ZAxis type="number" dataKey="relevance" range={[40, 160]} />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ payload }) => {
                      if (!payload || payload.length === 0) return null;
                      const pt = payload[0].payload;
                      return (
                        <div className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs shadow-xl space-y-1">
                          <p className="font-semibold text-slate-100">{pt.label}</p>
                          <p className="text-[11px] text-teal-400 font-mono">Cluster: {pt.clusterName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">Coordinates: ({pt.x.toFixed(2)}, {pt.y.toFixed(2)})</p>
                        </div>
                      );
                    }}
                  />
                  {data.vectorClustering.centroids.map((c, i) => (
                    <Scatter
                      key={c.clusterId}
                      name={c.name}
                      data={data.vectorClustering.points.filter(p => p.clusterId === c.clusterId)}
                      fill={CLUSTER_COLORS[i % CLUSTER_COLORS.length]}
                    />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'tokens' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Tokens with highest Shannon entropy (decision points with maximum multi-agent deliberation):</span>
              <span className="text-[11px] font-mono text-purple-400">
                Lexical Diversity (TTR): {(data.tokenAnalysis.lexicalDiversity * 100).toFixed(1)}%
              </span>
            </div>

            <div className="h-60 w-full bg-slate-950/60 rounded-xl border border-slate-800 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.tokenAnalysis.topTokensByEntropy} margin={{ top: 10, right: 10, bottom: 25, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis dataKey="token" stroke="#94A3B8" fontSize={11} interval={0} angle={-25} textAnchor="end" />
                  <YAxis stroke="#64748B" fontSize={10} domain={[0, 4]} />
                  <Tooltip 
                    content={({ payload }) => {
                      if (!payload || payload.length === 0) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs shadow-xl">
                          <span className="font-mono font-bold text-teal-300">"{d.token}"</span>
                          <div className="text-[11px] text-slate-300 mt-1">Entropy: {d.entropy} bits</div>
                          <div className="text-[10px] text-slate-400">Probability: {(d.probability * 100).toFixed(1)}%</div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="entropy" fill="#2DD4BF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'calibration' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Reliability Diagram: Model Predicted Confidence vs. Empirical Correctness</span>
              <span className="text-[11px] font-mono text-emerald-400">
                Brier Score: {data.confidenceCalibration.brierScore.toFixed(3)}
              </span>
            </div>

            <div className="h-60 w-full bg-slate-950/60 rounded-xl border border-slate-800 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.confidenceCalibration.reliabilityCurve} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="binRange" stroke="#64748B" fontSize={10} />
                  <YAxis stroke="#64748B" fontSize={10} domain={[0, 1]} />
                  <Tooltip 
                    content={({ payload }) => {
                      if (!payload || payload.length === 0) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs shadow-xl space-y-0.5">
                          <div className="font-mono text-slate-200">Bin: {d.binRange}</div>
                          <div className="text-teal-400">Avg Confidence: {(d.averageConfidence * 100).toFixed(1)}%</div>
                          <div className="text-purple-400">Empirical Accuracy: {(d.empiricalAccuracy * 100).toFixed(1)}%</div>
                          <div className="text-[10px] text-slate-500">Samples: {d.sampleCount}</div>
                        </div>
                      );
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="averageConfidence" 
                    stroke="#2DD4BF" 
                    strokeWidth={2} 
                    dot={{ r: 4 }} 
                    name="Predicted Confidence" 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="empiricalAccuracy" 
                    stroke="#A78BFA" 
                    strokeWidth={2} 
                    dot={{ r: 4 }} 
                    name="Empirical Accuracy" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Statistical Verdict Footer */}
        <div className="mt-4 p-3 rounded-lg bg-slate-950 border border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-300">
          <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-100">Data Science Synthesis Verdict: </span>
            {data.statisticalVerdict}
          </div>
        </div>
      </div>
    </div>
  );
}
