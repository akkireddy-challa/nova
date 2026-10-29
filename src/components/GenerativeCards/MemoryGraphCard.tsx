"use client";

import React, { useState, useMemo } from "react";
import {
  Network,
  Download,
  Copy,
  Check,
  Search,
  Info,
  Compass,
} from "lucide-react";
import type { GraphEntityType, MemoryGraphArtifact } from "@/lib/types";
import {
  computeDeterministicNodePositions,
  memoryGraphToCsv,
  memoryGraphToMarkdown,
} from "@/lib/graph/memory-graph-engine";
import { downloadCsvData } from "@/lib/matrix-calculator";
import { sound } from "@/lib/sound";

interface MemoryGraphCardProps {
  artifact: MemoryGraphArtifact;
}

export function MemoryGraphCard({ artifact }: MemoryGraphCardProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<
    "graph" | "entities" | "relations"
  >("graph");
  const [copied, setCopied] = useState(false);

  const nodes = useMemo(() => artifact.nodes || [], [artifact.nodes]);
  const edges = useMemo(() => artifact.edges || [], [artifact.edges]);

  // Viewport dimensions for deterministic layout
  const SVG_WIDTH = 800;
  const SVG_HEIGHT = 480;

  const nodePositions = useMemo(() => {
    return computeDeterministicNodePositions(
      nodes,
      edges,
      SVG_WIDTH,
      SVG_HEIGHT,
    );
  }, [nodes, edges]);

  // Filter nodes based on search and type pill
  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      const matchesSearch =
        node.label.toLowerCase().includes(searchFilter.toLowerCase()) ||
        node.description.toLowerCase().includes(searchFilter.toLowerCase());
      const matchesType =
        selectedTypeFilter === "all" || node.type === selectedTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [nodes, searchFilter, selectedTypeFilter]);

  const activeFocusId = hoveredNodeId || selectedNodeId;

  // Filter edges connected to the active focus node if any
  const connectedEdgeIds = useMemo(() => {
    if (!activeFocusId) return new Set<string>();
    const set = new Set<string>();
    for (const edge of edges) {
      if (edge.source === activeFocusId || edge.target === activeFocusId) {
        set.add(edge.id);
      }
    }
    return set;
  }, [activeFocusId, edges]);

  // Selected node details
  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.id === activeFocusId) || null;
  }, [nodes, activeFocusId]);

  const handleCopyMarkdown = () => {
    const md = memoryGraphToMarkdown(artifact);
    navigator.clipboard.writeText(md);
    setCopied(true);
    sound.playPop();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCsv = () => {
    const csv = memoryGraphToCsv(artifact);
    const filename = `${artifact.id || "memory-graph"}.csv`;
    downloadCsvData(csv, filename);
    sound.playSuccess();
  };

  // Entity type badge colors
  const getTypeColor = (type: GraphEntityType) => {
    switch (type) {
      case "technology":
        return {
          fill: "#06b6d4",
          stroke: "#22d3ee",
          bg: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
        };
      case "concept":
        return {
          fill: "#10b981",
          stroke: "#34d399",
          bg: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
        };
      case "methodology":
        return {
          fill: "#8b5cf6",
          stroke: "#a78bfa",
          bg: "bg-violet-500/10 text-violet-300 border-violet-500/30",
        };
      case "organization":
        return {
          fill: "#f59e0b",
          stroke: "#fbbf24",
          bg: "bg-amber-500/10 text-amber-300 border-amber-500/30",
        };
      case "standard":
        return {
          fill: "#ec4899",
          stroke: "#f472b6",
          bg: "bg-pink-500/10 text-pink-300 border-pink-500/30",
        };
      case "person":
      default:
        return {
          fill: "#3b82f6",
          stroke: "#60a5fa",
          bg: "bg-blue-500/10 text-blue-300 border-blue-500/30",
        };
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 shadow-2xl overflow-hidden backdrop-blur-md">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-violet-500/15 text-violet-300 border border-violet-500/30">
              <Network className="w-3 h-3 text-violet-400" />
              Graph RAG Memory Studio
            </span>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/50">
              Authority: {artifact.summary.mostCentralNode}
            </span>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/50">
              Density: {(artifact.summary.density * 100).toFixed(1)}%
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-100 tracking-tight truncate">
            {artifact.topic}
          </h2>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={handleCopyMarkdown}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700/70 bg-slate-800/50 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors"
            title="Copy formatted markdown report"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>{copied ? "Copied" : "Copy MD"}</span>
          </button>
          <button
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-violet-500/40 bg-violet-500/10 text-xs font-medium text-violet-300 hover:bg-violet-500/20 transition-colors shadow-sm"
            title="Download graph nodes and edges as RFC 4180 CSV"
          >
            <Download className="w-3.5 h-3.5 text-violet-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Scorecard Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 border-b border-slate-800/80 bg-slate-900/40 divide-x divide-slate-800/80">
        <div className="p-3">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Entities
          </div>
          <div className="text-lg font-bold font-mono text-slate-100">
            {artifact.summary.totalNodes}
          </div>
        </div>
        <div className="p-3">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Relations
          </div>
          <div className="text-lg font-bold font-mono text-violet-300">
            {artifact.summary.totalEdges}
          </div>
        </div>
        <div className="p-3">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Graph Density
          </div>
          <div className="text-lg font-bold font-mono text-cyan-300">
            {(artifact.summary.density * 100).toFixed(1)}%
          </div>
        </div>
        <div className="p-3">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Avg Degree
          </div>
          <div className="text-lg font-bold font-mono text-emerald-400">
            {artifact.summary.averageDegree}
          </div>
        </div>
        <div className="p-3 col-span-2 sm:col-span-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Dominant Type
          </div>
          <div className="text-sm font-semibold text-slate-200 capitalize truncate mt-0.5">
            {artifact.summary.dominantEntityType}
          </div>
        </div>
      </div>

      {/* Navigation Tabs & Search Toolbar */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-950/40 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
          <button
            onClick={() => {
              setActiveTab("graph");
              sound.playTap();
            }}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              activeTab === "graph"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Interactive Graph
          </button>
          <button
            onClick={() => {
              setActiveTab("entities");
              sound.playTap();
            }}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              activeTab === "entities"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Entity Hierarchy
          </button>
          <button
            onClick={() => {
              setActiveTab("relations");
              sound.playTap();
            }}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              activeTab === "relations"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Semantic Relations ({edges.length})
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter entities by name..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            <option value="all">All Types</option>
            <option value="technology">Technology</option>
            <option value="concept">Concept</option>
            <option value="methodology">Methodology</option>
            <option value="organization">Organization</option>
            <option value="standard">Standard</option>
            <option value="person">Person</option>
          </select>
        </div>
      </div>

      {/* Main Content Body */}
      {activeTab === "graph" && (
        <div className="relative p-4 bg-slate-950/80 flex flex-col lg:flex-row gap-4 min-h-[480px]">
          {/* SVG Graph Canvas */}
          <div className="flex-1 relative rounded-lg border border-slate-800/90 bg-slate-950 overflow-hidden min-h-[380px] flex items-center justify-center">
            <svg
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              className="w-full h-full max-h-[500px]"
              role="graphics-document"
              aria-label={`Knowledge Graph Visualizer for ${artifact.topic}`}
            >
              <defs>
                {/* Directed edge arrowheads */}
                <marker
                  id="arrow-default"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
                </marker>
                <marker
                  id="arrow-active"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#a78bfa" />
                </marker>
              </defs>

              {/* Render Directed Edges */}
              {edges.map((edge) => {
                const srcPos = nodePositions.get(edge.source);
                const tgtPos = nodePositions.get(edge.target);
                if (!srcPos || !tgtPos) return null;

                const isConnected =
                  connectedEdgeIds.has(edge.id) || !activeFocusId;
                const isDirectlyFocused = connectedEdgeIds.has(edge.id);

                return (
                  <g key={edge.id} className="transition-all duration-300">
                    <line
                      x1={srcPos.x}
                      y1={srcPos.y}
                      x2={tgtPos.x}
                      y2={tgtPos.y}
                      stroke={isDirectlyFocused ? "#a78bfa" : "#334155"}
                      strokeWidth={
                        isDirectlyFocused ? 2.5 : Math.max(1, edge.weight * 2)
                      }
                      strokeOpacity={
                        isConnected ? (isDirectlyFocused ? 1 : 0.6) : 0.15
                      }
                      strokeDasharray={
                        edge.relation === "fails_over_to" ? "4 4" : undefined
                      }
                      markerEnd={
                        isDirectlyFocused
                          ? "url(#arrow-active)"
                          : "url(#arrow-default)"
                      }
                    />
                  </g>
                );
              })}

              {/* Render Nodes */}
              {filteredNodes.map((node) => {
                const pos = nodePositions.get(node.id);
                if (!pos) return null;

                const isSelected = selectedNodeId === node.id;
                const isHovered = hoveredNodeId === node.id;
                const isFocused = isSelected || isHovered;
                const typeStyle = getTypeColor(node.type);

                const baseRadius = 14 + node.centralityScore * 12;

                return (
                  <g
                    key={node.id}
                    className="cursor-pointer transition-transform duration-200"
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={() => {
                      setSelectedNodeId(
                        selectedNodeId === node.id ? null : node.id,
                      );
                      sound.playTap();
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Entity: ${node.label}, Type: ${node.type}, Degree: ${node.degree}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedNodeId(
                          selectedNodeId === node.id ? null : node.id,
                        );
                        sound.playTap();
                      }
                    }}
                  >
                    {/* Focus glow ring */}
                    {isFocused && (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={baseRadius + 6}
                        fill="none"
                        stroke={typeStyle.stroke}
                        strokeWidth={2}
                        strokeDasharray="3 3"
                        className="animate-spin-slow origin-center"
                      />
                    )}

                    {/* Main Node Circle */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={baseRadius}
                      fill={typeStyle.fill}
                      fillOpacity={isFocused ? 0.95 : 0.75}
                      stroke={typeStyle.stroke}
                      strokeWidth={isFocused ? 2.5 : 1.5}
                      className="transition-all hover:scale-110"
                    />

                    {/* Degree counter inside node */}
                    <text
                      x={pos.x}
                      y={pos.y + 3.5}
                      textAnchor="middle"
                      fill="#0f172a"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                      className="pointer-events-none select-none"
                    >
                      {node.degree}
                    </text>

                    {/* Node Label Below */}
                    <text
                      x={pos.x}
                      y={pos.y + baseRadius + 12}
                      textAnchor="middle"
                      fill={isFocused ? "#ffffff" : "#94a3b8"}
                      fontSize="10"
                      fontWeight={isFocused ? "bold" : "medium"}
                      className="pointer-events-none select-none drop-shadow"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Inspection Inspector Drawer / Side Panel */}
          <div className="w-full lg:w-72 rounded-lg border border-slate-800 bg-slate-900/90 p-3 flex flex-col justify-between">
            {selectedNode ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2">
                  <div>
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border ${
                        getTypeColor(selectedNode.type).bg
                      }`}
                    >
                      {selectedNode.type}
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 mt-1">
                      {selectedNode.label}
                    </h3>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-mono text-slate-400">
                      Centrality
                    </div>
                    <div className="text-xs font-mono font-bold text-violet-300">
                      {(selectedNode.centralityScore * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedNode.description}
                </p>

                {/* Connected Relations */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    Connected Relations ({selectedNode.degree})
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {edges
                      .filter(
                        (e) =>
                          e.source === selectedNode.id ||
                          e.target === selectedNode.id,
                      )
                      .map((edge) => {
                        const isOutbound = edge.source === selectedNode.id;
                        const otherId = isOutbound ? edge.target : edge.source;
                        const otherNode = nodes.find((n) => n.id === otherId);

                        return (
                          <div
                            key={edge.id}
                            className="p-1.5 rounded bg-slate-950/70 border border-slate-800 text-[11px] flex items-center justify-between gap-2"
                          >
                            <span className="text-slate-400 font-mono text-[10px]">
                              {isOutbound ? "→" : "←"} {edge.relation}
                            </span>
                            <span className="font-medium text-slate-200 truncate">
                              {otherNode?.label || otherId}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 space-y-2">
                <Compass className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-xs">
                  Click or hover over any node on the graph to inspect entity
                  metadata and causal bindings.
                </p>
              </div>
            )}

            <div className="pt-3 border-t border-slate-800/80 text-[10px] font-mono text-slate-500 flex items-center justify-between">
              <span>Layout: Deterministic Circular</span>
              <span>RFC 4180 Ready</span>
            </div>
          </div>
        </div>
      )}

      {/* Entity Hierarchy View Tab */}
      {activeTab === "entities" && (
        <div className="p-4 bg-slate-950/80 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                <th className="pb-2">Entity Label</th>
                <th className="pb-2">Type</th>
                <th className="pb-2 text-right">Degree</th>
                <th className="pb-2 text-right">Centrality Score</th>
                <th className="pb-2 pl-4">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredNodes.map((node) => (
                <tr key={node.id} className="hover:bg-slate-900/50">
                  <td className="py-2.5 font-bold text-slate-200">
                    {node.label}
                  </td>
                  <td className="py-2.5">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-mono uppercase border ${
                        getTypeColor(node.type).bg
                      }`}
                    >
                      {node.type}
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-mono text-slate-300">
                    {node.degree}
                  </td>
                  <td className="py-2.5 text-right font-mono text-violet-300 font-bold">
                    {(node.centralityScore * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 pl-4 text-slate-400 max-w-sm truncate">
                    {node.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Semantic Relations View Tab */}
      {activeTab === "relations" && (
        <div className="p-4 bg-slate-950/80 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                <th className="pb-2">Source Entity</th>
                <th className="pb-2 text-center">Relation Type</th>
                <th className="pb-2">Target Entity</th>
                <th className="pb-2 text-right">Weight</th>
                <th className="pb-2 pl-4">Binding Context</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {edges.map((edge) => {
                const src = nodes.find((n) => n.id === edge.source);
                const tgt = nodes.find((n) => n.id === edge.target);

                return (
                  <tr key={edge.id} className="hover:bg-slate-900/50">
                    <td className="py-2.5 font-medium text-slate-200">
                      {src?.label || edge.source}
                    </td>
                    <td className="py-2.5 text-center">
                      <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 font-mono text-[10px] text-violet-300">
                        {edge.relation}
                      </span>
                    </td>
                    <td className="py-2.5 font-medium text-slate-200">
                      {tgt?.label || edge.target}
                    </td>
                    <td className="py-2.5 text-right font-mono text-cyan-300 font-bold">
                      {(edge.weight * 100).toFixed(0)}%
                    </td>
                    <td className="py-2.5 pl-4 text-slate-400">{edge.label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Executive Summary Callout */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
          <Info className="w-3.5 h-3.5 text-violet-400" />
          <span>Executive Synthesis & Grounding</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          {artifact.executiveSummary}
        </p>
      </div>
    </div>
  );
}
