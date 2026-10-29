"use client";

import React, { useState, useMemo } from "react";
import {
  Compass,
  Download,
  Copy,
  Check,
  Search,
  Layers,
  Table as TableIcon,
  ScatterChart,
  Target,
  Sparkles,
  Info,
  AlertTriangle,
  FileText,
} from "lucide-react";
import type { VectorSpaceArtifact } from "@/lib/types";
import {
  vectorSpaceToCsv,
  vectorSpaceToMarkdown,
} from "@/lib/vector/vector-space-engine";
import { downloadCsvData } from "@/lib/matrix-calculator";
import { sound } from "@/lib/sound";

interface VectorSpaceCardProps {
  artifact: VectorSpaceArtifact;
}

export function VectorSpaceCard({ artifact }: VectorSpaceCardProps) {
  const [selectedPointId, setSelectedPointId] = useState<string>(
    artifact.points[0]?.id || "",
  );
  const [activeTab, setActiveTab] = useState<
    "projection" | "clusters" | "table"
  >("projection");
  const [clusterFilter, setClusterFilter] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedType, setCopiedType] = useState<"report" | "chunk" | null>(null);

  const selectedPoint = useMemo(
    () =>
      artifact.points.find((p) => p.id === selectedPointId) ||
      artifact.points[0],
    [artifact.points, selectedPointId],
  );

  const filteredPoints = useMemo(() => {
    return artifact.points.filter((pt) => {
      const matchesCluster =
        clusterFilter === "all" || pt.clusterId === clusterFilter;
      const matchesSearch =
        !searchQuery.trim() ||
        pt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pt.chunkText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pt.clusterLabel.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCluster && matchesSearch;
    });
  }, [artifact.points, clusterFilter, searchQuery]);

  const handleCopyMarkdown = () => {
    const md = vectorSpaceToMarkdown(artifact);
    navigator.clipboard.writeText(md);
    setCopiedType("report");
    sound.playPop();
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyChunk = () => {
    if (!selectedPoint) return;
    navigator.clipboard.writeText(selectedPoint.chunkText);
    setCopiedType("chunk");
    sound.playPop();
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDownloadCsv = () => {
    const csv = vectorSpaceToCsv(artifact);
    const filename = `${artifact.id || "vector-space"}.csv`;
    downloadCsvData(csv, filename);
    sound.playSuccess();
  };

  // Convert normalized [-1, 1] coordinates into SVG viewbox [40, 460] space
  const mapCoordToSvg = (val: number): number => {
    const clamped = Math.max(-1.0, Math.min(1.0, val));
    return 250 + clamped * 200;
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md flex flex-col">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 shadow-inner">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">
                {artifact.datasetTitle}
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-teal-950/80 border border-teal-500/30 text-teal-300">
                {artifact.summary.embeddingDimension}d → 2D{" "}
                {artifact.summary.reductionMethod.toUpperCase()}
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Silhouette: {artifact.summary.silhouetteScore.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xl">
              Query: &quot;
              {artifact.targetQuery || "Autonomous Semantic Embedding Index"}
              &quot;
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-300 text-xs font-medium transition-colors"
            title="Copy Markdown Report"
          >
            {copiedType === "report" ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>Report</span>
          </button>

          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-300 text-xs font-medium transition-colors"
            title="Download RFC 4180 CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Scorecard Metric Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-800 border-b border-slate-800">
        <div className="p-3.5 bg-slate-900 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-teal-400" />
            Indexed Vectors
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">
              {artifact.summary.totalVectors}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              across {artifact.summary.clusterCount} clusters
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5">
            Dimension: {artifact.summary.embeddingDimension} dims
          </span>
        </div>

        <div className="p-3.5 bg-slate-900 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Silhouette Score
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">
              {artifact.summary.silhouetteScore.toFixed(3)}
            </span>
            <span className="text-xs text-emerald-400 font-medium">
              Dense separation
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5">
            Range: -1.0 to +1.0
          </span>
        </div>

        <div className="p-3.5 bg-slate-900 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-cyan-400" />
            Explained Variance
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">
              {(artifact.summary.explainedVarianceRatio * 100).toFixed(1)}%
            </span>
            <span className="text-xs text-cyan-400 font-medium">in 2D PCA</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5">
            Top 2 Principal Components
          </span>
        </div>

        <div className="p-3.5 bg-slate-900 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Outlier Anomalies
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">
              {artifact.summary.outlierCount}
            </span>
            <span className="text-xs text-amber-400 font-medium">
              {artifact.summary.outlierCount > 0 ? "Flagged chunks" : "Clean"}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5">
            Avg Sim: {artifact.summary.averageCosineSimilarity.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Main View Mode Tabs */}
      <div className="px-4 border-b border-slate-800 bg-slate-950/20 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setActiveTab("projection");
              sound.playTap();
            }}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "projection"
                ? "border-teal-500 text-teal-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <ScatterChart className="w-3.5 h-3.5" />
            2D Cluster Projection
          </button>

          <button
            onClick={() => {
              setActiveTab("clusters");
              sound.playTap();
            }}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "clusters"
                ? "border-teal-500 text-teal-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Semantic Clusters ({artifact.clusters.length})
          </button>

          <button
            onClick={() => {
              setActiveTab("table");
              sound.playTap();
            }}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "table"
                ? "border-teal-500 text-teal-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            Vector Index Table ({artifact.points.length})
          </button>
        </div>
      </div>

      {/* Tab 1: 2D Cluster Projection Scatter Plot & Details Drawer */}
      {activeTab === "projection" && (
        <div className="p-4 sm:p-5 flex flex-col lg:flex-row gap-5 items-start">
          {/* Scatter Plot SVG Canvas */}
          <div className="w-full lg:w-3/5 bg-slate-950/90 border border-slate-800 rounded-xl p-4 flex flex-col items-center shadow-inner relative">
            <div className="w-full flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-mono text-[11px] flex items-center gap-1.5">
                <ScatterChart className="w-3.5 h-3.5 text-teal-400" />
                Principal Component 1 (X) vs Component 2 (Y)
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Click vector to inspect chunk
              </span>
            </div>

            <svg
              viewBox="0 0 500 500"
              role="graphics-document"
              tabIndex={0}
              aria-label="2D Projected Vector Space Scatter Plot"
              className="w-full aspect-square max-h-[460px] border border-slate-800/80 rounded-lg bg-slate-900/40 select-none"
            >
              <defs>
                <radialGradient id="clusterGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.0" />
                </radialGradient>
              </defs>

              {/* Coordinate Grid Lines */}
              <line
                x1="250"
                y1="20"
                x2="250"
                y2="480"
                stroke="#334155"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <line
                x1="20"
                y1="250"
                x2="480"
                y2="250"
                stroke="#334155"
                strokeWidth="1"
                strokeDasharray="3 3"
              />

              {/* Cluster Centroid Halos */}
              {artifact.clusters.map((c) => {
                const cx = mapCoordToSvg(c.centroidX);
                const cy = mapCoordToSvg(c.centroidY);
                const r = Math.max(30, c.radius * 200);
                return (
                  <g key={`cluster-halo-${c.id}`}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill={c.color}
                      fillOpacity="0.08"
                      stroke={c.color}
                      strokeOpacity="0.3"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={cx}
                      y={cy - r - 4}
                      textAnchor="middle"
                      fill={c.color}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {c.label}
                    </text>
                  </g>
                );
              })}

              {/* Vector Data Points */}
              {artifact.points.map((pt) => {
                const cx = mapCoordToSvg(pt.x);
                const cy = mapCoordToSvg(pt.y);
                const isSelected = pt.id === selectedPoint?.id;
                const cluster = artifact.clusters.find(
                  (c) => c.id === pt.clusterId,
                );
                const color = cluster?.color || "#94a3b8";

                return (
                  <g
                    key={pt.id}
                    onClick={() => {
                      setSelectedPointId(pt.id);
                      sound.playTap();
                    }}
                    className="cursor-pointer transition-transform hover:scale-125"
                  >
                    {isSelected && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r="12"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        strokeDasharray="2 2"
                        className="animate-spin"
                      />
                    )}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={pt.isOutlier ? "7" : isSelected ? "7" : "5"}
                      fill={pt.isOutlier ? "#f43f5e" : color}
                      stroke={isSelected ? "#ffffff" : "#0f172a"}
                      strokeWidth={isSelected ? "2" : "1"}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Cluster Color Legend */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-3">
              {artifact.clusters.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-1.5 text-[11px] font-mono"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="text-slate-300">{c.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 text-[11px] font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-rose-400">Outlier</span>
              </div>
            </div>
          </div>

          {/* Selected Vector Point Detail Drawer */}
          {selectedPoint && (
            <div className="w-full lg:w-2/5 flex flex-col gap-4 bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-mono text-teal-400 uppercase tracking-wider block">
                    Selected Embedding Chunk
                  </span>
                  <h3 className="text-sm font-semibold text-white mt-0.5">
                    {selectedPoint.label}
                  </h3>
                </div>
                {selectedPoint.isOutlier ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-800">
                    Outlier Anomaly
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                    Cluster {selectedPoint.clusterId}
                  </span>
                )}
              </div>

              {/* Point Coordinates & Distances */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">
                    2D Coordinates
                  </span>
                  <span className="text-xs font-bold text-slate-200 mt-0.5 block">
                    ({selectedPoint.x.toFixed(2)}, {selectedPoint.y.toFixed(2)})
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">
                    Query Cosine Sim
                  </span>
                  <span className="text-xs font-bold text-teal-300 mt-0.5 block">
                    {(1.0 - selectedPoint.cosineDistanceToQuery).toFixed(3)}
                  </span>
                </div>
              </div>

              {/* Chunk Content Preview */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-teal-400" />
                    Indexed Text Chunk ({selectedPoint.tokenCount} tokens)
                  </span>
                  <button
                    onClick={handleCopyChunk}
                    className="text-[11px] text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1 transition-colors"
                  >
                    {copiedType === "chunk" ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans max-h-48 overflow-y-auto">
                  {selectedPoint.chunkText}
                </div>
              </div>

              {/* Cluster Information Callout */}
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
                <span className="font-semibold text-slate-300 block mb-1">
                  Semantic Membership:
                </span>
                <p>
                  Belongs to <strong>{selectedPoint.clusterLabel}</strong> with
                  a cosine distance of{" "}
                  {selectedPoint.cosineDistanceToQuery.toFixed(3)} to the active
                  retrieval query.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Semantic Clusters Overview Cards */}
      {activeTab === "clusters" && (
        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {artifact.clusters.map((c) => (
            <div
              key={c.id}
              className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between gap-3 shadow-sm hover:border-slate-700 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: c.color }}
                    />
                    <h4 className="text-sm font-semibold text-white">
                      {c.label}
                    </h4>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {c.pointCount} Vectors
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 text-xs font-mono">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">
                      Centroid
                    </span>
                    <span className="text-slate-200 font-bold block mt-0.5">
                      ({c.centroidX.toFixed(2)}, {c.centroidY.toFixed(2)})
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">
                      Radius
                    </span>
                    <span className="text-slate-200 font-bold block mt-0.5">
                      {c.radius.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">
                      Avg Tokens
                    </span>
                    <span className="text-slate-200 font-bold block mt-0.5">
                      {c.averageTokenCount} tok
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1">
                  Key Concept Tags
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {c.topKeywords.map((kw, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Vector Index Table (Conforming to modern-web-guidance responsive-table) */}
      {activeTab === "table" && (
        <div className="p-4 sm:p-5 flex flex-col gap-3">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter vectors or chunk text..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-teal-500 w-56"
                />
              </div>

              <select
                value={clusterFilter}
                onChange={(e) =>
                  setClusterFilter(
                    e.target.value === "all" ? "all" : Number(e.target.value),
                  )
                }
                className="px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-teal-500"
              >
                <option value="all">All Clusters</option>
                {artifact.clusters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-xs font-mono text-slate-400">
              Showing {filteredPoints.length} of {artifact.points.length}{" "}
              vectors
            </span>
          </div>

          {/* Accessible Table Container */}
          <div
            tabIndex={0}
            role="region"
            aria-label="Indexed Vector Embeddings Table"
            className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/60 max-h-96"
          >
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-900 text-slate-400 font-medium border-b border-slate-800 z-10">
                <tr>
                  <th scope="col" className="p-3">
                    Vector ID
                  </th>
                  <th scope="col" className="p-3">
                    Label
                  </th>
                  <th scope="col" className="p-3">
                    Cluster
                  </th>
                  <th scope="col" className="p-3 text-center">
                    2D (X, Y)
                  </th>
                  <th scope="col" className="p-3 text-center">
                    Tokens
                  </th>
                  <th scope="col" className="p-3 text-center">
                    Cosine Sim
                  </th>
                  <th scope="col" className="p-3">
                    Chunk Preview
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {filteredPoints.map((pt) => {
                  const isSelected = pt.id === selectedPoint?.id;
                  const sim = (1.0 - pt.cosineDistanceToQuery).toFixed(3);
                  return (
                    <tr
                      key={pt.id}
                      onClick={() => {
                        setSelectedPointId(pt.id);
                        sound.playTap();
                      }}
                      className={`hover:bg-slate-900/60 cursor-pointer transition-colors ${
                        isSelected ? "bg-teal-950/40" : ""
                      }`}
                    >
                      <td className="p-3 text-teal-400 font-semibold">
                        {pt.id}
                      </td>
                      <td className="p-3 text-slate-200 font-sans font-medium">
                        {pt.label}
                      </td>
                      <td className="p-3 text-slate-400 font-sans">
                        {pt.clusterLabel}
                      </td>
                      <td className="p-3 text-center text-slate-400">
                        ({pt.x.toFixed(2)}, {pt.y.toFixed(2)})
                      </td>
                      <td className="p-3 text-center text-slate-400">
                        {pt.tokenCount}
                      </td>
                      <td className="p-3 text-center text-teal-300 font-bold">
                        {sim}
                      </td>
                      <td className="p-3 text-slate-400 font-sans text-xs truncate max-w-xs">
                        {pt.chunkText}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer Notes */}
      {artifact.technicalNotes && (
        <div className="px-4 py-3 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span>{artifact.technicalNotes}</span>
        </div>
      )}
    </div>
  );
}
