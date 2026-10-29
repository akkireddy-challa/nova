"use client";

import React, { useState } from "react";
import {
  Users,
  Download,
  Copy,
  Check,
  Award,
  Layers,
  Scale,
  Activity,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  BookOpen,
} from "lucide-react";
import type {
  EpistemicConsensusArtifact,
  AgentBeliefEndorsement,
} from "@/lib/types";
import {
  consensusToCsv,
  consensusToMarkdown,
} from "@/lib/consensus/consensus-engine";
import { downloadCsvData } from "@/lib/matrix-calculator";
import { sound } from "@/lib/sound";

interface EpistemicConsensusCardProps {
  artifact: EpistemicConsensusArtifact;
}

export function EpistemicConsensusCard({
  artifact,
}: EpistemicConsensusCardProps) {
  const [activeTab, setActiveTab] = useState<
    "bts_map" | "agents" | "delphi" | "quadratic" | "math"
  >("bts_map");
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] =
    useState<AgentBeliefEndorsement | null>(() => artifact.agents[0] || null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const handleCopy = (text: string, type: string) => {
    sound.playSuccess();
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDownloadCsv = () => {
    sound.playPop();
    const csvContent = consensusToCsv(artifact);
    const filename = `${artifact.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-consensus.csv`;
    downloadCsvData(csvContent, filename);
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md transition-all text-slate-200">
      {/* Header Banner */}
      <div className="px-6 py-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-cyan-950/20 to-slate-900">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-1.5">
              <Users className="w-3 h-3" />
              Bayesian Truth Serum Protocol
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              Consensus: {artifact.summary.consensusIndexPct}%
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              Grade {artifact.summary.verdictConfidenceGrade}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
              Delphi: {artifact.summary.delphiRoundsCompleted} Rounds
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            {artifact.title}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            {artifact.executiveSummary}
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() =>
              handleCopy(consensusToMarkdown(artifact), "markdown")
            }
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            aria-label="Copy Markdown Consensus Report"
          >
            {copiedType === "markdown" ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copiedType === "markdown" ? "Copied" : "Copy Dossier"}
          </button>
          <button
            onClick={handleDownloadCsv}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 transition-colors shadow-lg shadow-cyan-600/20 focus:ring-2 focus:ring-cyan-400 focus:outline-none"
            aria-label="Download RFC 4180 CSV Export"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-800/80 border-b border-slate-800 bg-slate-950/40 text-center">
        <div className="p-3">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Consensus Index
          </span>
          <div className="text-lg font-mono font-bold text-emerald-400 mt-0.5">
            {artifact.summary.consensusIndexPct}%
          </div>
        </div>
        <div className="p-3">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Entropy Reduction
          </span>
          <div className="text-lg font-mono font-bold text-cyan-400 mt-0.5">
            -{artifact.summary.entropyReductionPct}%
          </div>
        </div>
        <div className="p-3">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Expert Agents
          </span>
          <div className="text-lg font-mono font-bold text-indigo-400 mt-0.5">
            {artifact.summary.totalAgents} Evaluated
          </div>
        </div>
        <div className="p-3">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Governance
          </span>
          <div className="text-lg font-mono font-bold text-amber-400 mt-0.5">
            Quadratic $v = \sqrt&#123;C&#125;$
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-800 bg-slate-900/60 px-4 gap-2 overflow-x-auto">
        <button
          onClick={() => {
            sound.playPop();
            setActiveTab("bts_map");
          }}
          className={`py-2.5 px-3.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "bts_map"
              ? "border-cyan-500 text-cyan-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          BTS Belief Distribution Map
        </button>
        <button
          onClick={() => {
            sound.playPop();
            setActiveTab("agents");
          }}
          className={`py-2.5 px-3.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "agents"
              ? "border-cyan-500 text-cyan-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Agent Endorsements ({artifact.agents.length})
        </button>
        <button
          onClick={() => {
            sound.playPop();
            setActiveTab("delphi");
          }}
          className={`py-2.5 px-3.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "delphi"
              ? "border-cyan-500 text-cyan-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Delphi Rounds ({artifact.delphiRounds.length})
        </button>
        <button
          onClick={() => {
            sound.playPop();
            setActiveTab("quadratic");
          }}
          className={`py-2.5 px-3.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "quadratic"
              ? "border-cyan-500 text-cyan-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          Quadratic Governance
        </button>
        <button
          onClick={() => {
            sound.playPop();
            setActiveTab("math");
          }}
          className={`py-2.5 px-3.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "math"
              ? "border-cyan-500 text-cyan-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Prelec BTS Proof
        </button>
      </div>

      {/* Main Content Body */}
      <div className="p-4 sm:p-6">
        {/* Tab 1: BTS Belief Distribution Map (Interactive SVG Canvas) */}
        {activeTab === "bts_map" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950/60 px-3 py-2 rounded-lg border border-slate-800">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                Select any agent node to inspect Prelec Information Score,
                prediction divergence, and Bayesian confidence interval.
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
                  className="p-1 rounded hover:bg-slate-800 text-slate-300"
                  title="Zoom Out"
                  aria-label="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[11px] px-1 text-slate-300">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(1.8, z + 0.2))}
                  className="p-1 rounded hover:bg-slate-800 text-slate-300"
                  title="Zoom In"
                  aria-label="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-300 ml-1"
                  title="Reset Zoom"
                  aria-label="Reset Zoom"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="relative border border-slate-800/80 rounded-xl bg-slate-950 overflow-hidden shadow-inner flex flex-col md:flex-row">
              <div className="flex-1 overflow-auto min-h-[360px] p-2">
                <svg
                  role="graphics-document"
                  aria-label="Prelec Bayesian Truth Serum Belief Map"
                  viewBox="0 0 650 360"
                  className="w-full h-auto min-w-[550px] transition-transform duration-200"
                  style={{
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: "top left",
                  }}
                >
                  <defs>
                    <linearGradient
                      id="bts-bg-gradient"
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#082f49" stopOpacity="0.4" />
                      <stop
                        offset="100%"
                        stopColor="#020617"
                        stopOpacity="0.8"
                      />
                    </linearGradient>
                  </defs>

                  {/* Coordinate Grid Box */}
                  <rect
                    x="50"
                    y="30"
                    width="550"
                    height="280"
                    fill="url(#bts-bg-gradient)"
                    stroke="#1e293b"
                    rx="8"
                  />

                  {/* Diagonal: y = x Neutral Boundary */}
                  <line
                    x1="50"
                    y1="310"
                    x2="600"
                    y2="30"
                    stroke="#334155"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <text
                    x="510"
                    y="70"
                    fill="#64748b"
                    fontSize="9"
                    fontFamily="sans-serif"
                  >
                    y = x (Neutral)
                  </text>

                  {/* "Surprisingly Common" High BTS Region Label */}
                  <text
                    x="70"
                    y="55"
                    fill="#38bdf8"
                    fontSize="10"
                    fontWeight="700"
                    fontFamily="sans-serif"
                  >
                    ▲ Surprisingly Common (BTS Information Premium)
                  </text>

                  {/* Axis Labels */}
                  <text
                    x="300"
                    y="335"
                    fill="#94a3b8"
                    fontSize="10"
                    fontWeight="600"
                    fontFamily="sans-serif"
                    textAnchor="middle"
                  >
                    Personal Endorsement Probability x_i (0% → 100%)
                  </text>
                  <text
                    x="18"
                    y="170"
                    fill="#94a3b8"
                    fontSize="10"
                    fontWeight="600"
                    fontFamily="sans-serif"
                    transform="rotate(-90 18 170)"
                    textAnchor="middle"
                  >
                    Predicted Crowd Mean y_i
                  </text>

                  {/* Render Agent Nodes on Belief Plane */}
                  {artifact.agents.map((agent) => {
                    const cx = 50 + agent.personalEndorsement * 550;
                    const cy = 310 - agent.predictedCrowdMean * 280;
                    const isSelected = selectedAgent?.agentId === agent.agentId;

                    return (
                      <g
                        key={agent.agentId}
                        transform={`translate(${cx}, ${cy})`}
                        onClick={() => {
                          sound.playPop();
                          setSelectedAgent(agent);
                        }}
                        className="cursor-pointer group"
                      >
                        {/* 90% Confidence Interval Ring */}
                        <circle
                          r="18"
                          fill="none"
                          stroke={isSelected ? "#38bdf8" : "#0284c7"}
                          strokeWidth="1"
                          strokeDasharray="2 2"
                          opacity="0.6"
                        />
                        {/* Central Node Circle */}
                        <circle
                          r="10"
                          fill={isSelected ? "#38bdf8" : "#0e7490"}
                          stroke={isSelected ? "#ffffff" : "#38bdf8"}
                          strokeWidth={isSelected ? "2.5" : "1.5"}
                          className="transition-all duration-150 filter drop-shadow hover:scale-110"
                        />
                        <text
                          x="14"
                          y="4"
                          fill={isSelected ? "#ffffff" : "#e0f2fe"}
                          fontSize="10"
                          fontWeight="700"
                          fontFamily="sans-serif"
                        >
                          {agent.agentName.split(" ")[0]}
                        </text>
                        <text
                          x="14"
                          y="16"
                          fill="#38bdf8"
                          fontSize="8.5"
                          fontFamily="monospace"
                        >
                          BTS: +{agent.btsTotalScore}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Agent Detail Inspection Drawer */}
              {selectedAgent && (
                <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-800 bg-slate-900/90 p-4 shrink-0 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                        Expert Weight: {selectedAgent.expertiseWeight}
                      </span>
                      <span className="text-[11px] font-mono text-emerald-400 font-bold">
                        BTS: +{selectedAgent.btsTotalScore}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white">
                      {selectedAgent.agentName}
                    </h4>
                    <p className="text-xs text-slate-400 font-mono">
                      {selectedAgent.role}
                    </p>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-center font-mono">
                      <div className="p-2 rounded bg-slate-950 border border-slate-800">
                        <span className="text-[9px] uppercase text-slate-500 block">
                          Endorsement
                        </span>
                        <span className="text-xs font-bold text-white">
                          {(selectedAgent.personalEndorsement * 100).toFixed(0)}
                          %
                        </span>
                      </div>
                      <div className="p-2 rounded bg-slate-950 border border-slate-800">
                        <span className="text-[9px] uppercase text-slate-500 block">
                          Predicted Crowd
                        </span>
                        <span className="text-xs font-bold text-cyan-300">
                          {(selectedAgent.predictedCrowdMean * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Prelec Information Score
                      </span>
                      <p className="text-xs text-indigo-300 font-mono mt-0.5">
                        +{selectedAgent.informationScore} (Surprisingly Common)
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Reasoning Justification
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed mt-0.5">
                        {selectedAgent.justification}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-cyan-400 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-cyan-400" />
                    Truthful Bayesian Nash Equilibrium
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Agent Endorsements Table */}
        {activeTab === "agents" && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/40">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-medium">
                    <th className="p-3">Agent &amp; Role</th>
                    <th className="p-3">Endorsement x_i</th>
                    <th className="p-3">Predicted Crowd y_i</th>
                    <th className="p-3">Info Score</th>
                    <th className="p-3">Pred Score</th>
                    <th className="p-3 text-right">BTS Total Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {artifact.agents.map((agent) => (
                    <tr
                      key={agent.agentId}
                      className="hover:bg-slate-900/40 transition-colors"
                    >
                      <td className="p-3 font-semibold text-slate-200">
                        {agent.agentName}
                        <div className="text-[10px] text-slate-500 font-normal">
                          {agent.role}
                        </div>
                      </td>
                      <td className="p-3 font-mono text-emerald-400 font-bold">
                        {(agent.personalEndorsement * 100).toFixed(0)}%
                      </td>
                      <td className="p-3 font-mono text-cyan-300">
                        {(agent.predictedCrowdMean * 100).toFixed(0)}%
                      </td>
                      <td className="p-3 font-mono text-indigo-300">
                        +{agent.informationScore}
                      </td>
                      <td className="p-3 font-mono text-slate-400">
                        {agent.predictionScore}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-cyan-400">
                        +{agent.btsTotalScore}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Delphi Rounds */}
        {activeTab === "delphi" && (
          <div className="space-y-3">
            {artifact.delphiRounds.map((round) => (
              <div
                key={round.round}
                className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                      Round {round.round}
                    </span>
                    <span className="text-sm font-semibold text-white">
                      Delphi Convergence Step
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                    {round.keyShiftArgument}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0 font-mono text-xs">
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-slate-500 block">
                      Shannon Entropy
                    </span>
                    <span className="font-bold text-amber-400">
                      {round.shannonEntropyBits} bits
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-slate-500 block">
                      JSD Divergence
                    </span>
                    <span className="font-bold text-cyan-400">
                      {round.jensenShannonDivergence}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-slate-500 block">
                      Median Endorsement
                    </span>
                    <span className="font-bold text-emerald-400">
                      {(round.medianEndorsement * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: Quadratic Governance */}
        {activeTab === "quadratic" && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-950/60 text-xs text-slate-300">
              <span className="font-semibold text-cyan-400 block mb-1">
                Quadratic Voting Protocol: Cost C = v^2 → Effective Votes v =
                sqrt(C)
              </span>
              Allows agents to express conviction intensity without permitting a
              wealthy majority to steamroll distributed expert consensus.
            </div>

            <div className="space-y-3">
              {artifact.quadraticAllocations.map((opt) => (
                <div
                  key={opt.optionId}
                  className={`p-4 rounded-xl border transition-colors ${
                    opt.isConsensusChoice
                      ? "border-cyan-500/50 bg-cyan-950/20"
                      : "border-slate-800 bg-slate-950/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {opt.isConsensusChoice && (
                        <Award className="w-4 h-4 text-cyan-400" />
                      )}
                      <h4 className="text-sm font-bold text-white">
                        {opt.optionLabel}
                      </h4>
                    </div>
                    <span className="font-mono text-xs font-bold text-cyan-400">
                      {opt.voteSharePct}% Share
                    </span>
                  </div>

                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full ${
                        opt.isConsensusChoice ? "bg-cyan-400" : "bg-slate-600"
                      }`}
                      style={{ width: `${opt.voteSharePct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>Credits Spent: {opt.rawCreditsSpent} credits</span>
                    <span>
                      Effective Votes:{" "}
                      <strong className="text-white">
                        {opt.effectiveVotes} votes
                      </strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: Prelec BTS Mathematical Formulation */}
        {activeTab === "math" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/80 space-y-3 text-xs leading-relaxed">
              <h4 className="text-sm font-bold text-cyan-400">
                Prelec Bayesian Truth Serum (Science 2004) Theorem
              </h4>
              <p className="text-slate-300">
                The Bayesian Truth Serum establishes an incentive-compatible
                scoring mechanism for questions where objective truth cannot be
                immediately verified. The score decomposes into an Information
                Score and a Prediction Score:
              </p>
              <div className="p-3 rounded bg-slate-900 border border-slate-800 font-mono text-indigo-300 space-y-2">
                <div>
                  <strong>Information Score:</strong> IS_i = x_i ln(x_bar /
                  y_bar) + (1 - x_i) ln((1 - x_bar) / (1 - y_bar))
                </div>
                <div>
                  <strong>Prediction Score:</strong> PS_i = x_bar ln(y_i /
                  x_bar) + (1 - x_bar) ln((1 - y_i) / (1 - x_bar))
                </div>
                <div>
                  <strong>Total Score:</strong> BTS_i = IS_i + PS_i
                </div>
              </div>
              <p className="text-slate-400">
                Truthful reporting forms a Bayesian Nash equilibrium. Agents who
                harbor accurate expert insights achieve strictly positive
                information scores because their beliefs are &ldquo;surprisingly
                common&rdquo; relative to collective prior predictions.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
