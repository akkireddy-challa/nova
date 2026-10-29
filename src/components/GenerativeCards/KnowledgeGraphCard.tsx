"use client";

import React, { useState, useMemo, useRef, useCallback } from "react";
import {
  extractKnowledgeGraph,
  KnowledgeGraph,
  KnowledgeGraphNode,
  ExtractKnowledgeGraphData,
} from "@/lib/research/knowledge-graph";
import type { ResearchReport } from "@/lib/types";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  Download,
  ExternalLink,
  Globe,
  FileText,
  Sparkles,
  Cpu,
  Network,
  Search,
  X,
  Layers,
  ArrowRight,
} from "lucide-react";
import { sound } from "@/lib/sound";

export interface KnowledgeGraphCardProps {
  report?: ResearchReport;
  data?: ExtractKnowledgeGraphData;
  graph?: KnowledgeGraph;
  title?: string;
}

export function KnowledgeGraphCard({
  report,
  data,
  graph: precomputedGraph,
  title: customTitle,
}: KnowledgeGraphCardProps) {
  // Extract or use precomputed knowledge graph
  const graph: KnowledgeGraph = useMemo(() => {
    if (precomputedGraph) return precomputedGraph;
    if (data) return extractKnowledgeGraph(data);
    if (report) {
      return extractKnowledgeGraph({
        title: report.title,
        findings: report.keyFindings.map((f) => ({
          text: `${f.point}: ${f.description}`,
          point: f.point,
          description: f.description,
          citationIds: f.citationIds,
          confidence: f.confidence,
        })),
        sources: report.sources,
      });
    }
    return { nodes: [], edges: [] };
  }, [precomputedGraph, data, report]);

  // Viewport and navigation state
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Selection & Hover State
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(
    null,
  );

  // Search & Type Filtering
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTypeFilter, setActiveTypeFilter] = useState<string>("all");

  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const displayTitle =
    customTitle ||
    report?.title ||
    data?.title ||
    "Research Knowledge Graph & Citation Network";

  // Fast node lookup
  const nodeMap = useMemo(() => {
    return new Map<string, KnowledgeGraphNode>(
      graph.nodes.map((n) => [n.id, n]),
    );
  }, [graph.nodes]);

  // Selected or Hovered Node
  const activeNodeId = hoveredNodeId || selectedNodeId;
  const selectedNode = selectedNodeId
    ? nodeMap.get(selectedNodeId) || null
    : null;
  const hoveredNode = hoveredNodeId ? nodeMap.get(hoveredNodeId) || null : null;

  // Identify connected nodes and edges for highlighting
  const { connectedNodeIds, connectedEdgeIndices } = useMemo(() => {
    if (!activeNodeId) {
      return {
        connectedNodeIds: new Set<string>(),
        connectedEdgeIndices: new Set<number>(),
      };
    }

    const nodeIds = new Set<string>([activeNodeId]);
    const edgeIndices = new Set<number>();

    graph.edges.forEach((edge, idx) => {
      if (edge.source === activeNodeId) {
        nodeIds.add(edge.target);
        edgeIndices.add(idx);
      } else if (edge.target === activeNodeId) {
        nodeIds.add(edge.source);
        edgeIndices.add(idx);
      }
    });

    return { connectedNodeIds: nodeIds, connectedEdgeIndices: edgeIndices };
  }, [activeNodeId, graph.edges]);

  // Counts by type
  const counts = useMemo(() => {
    let sourceCount = 0;
    let conceptCount = 0;
    let findingCount = 0;
    let entityCount = 0;
    for (const node of graph.nodes) {
      if (node.type === "source") sourceCount++;
      else if (node.type === "concept") conceptCount++;
      else if (node.type === "finding") findingCount++;
      else if (node.type === "entity") entityCount++;
    }
    return {
      total: graph.nodes.length,
      edges: graph.edges.length,
      source: sourceCount,
      concept: conceptCount,
      finding: findingCount,
      entity: entityCount,
    };
  }, [graph.nodes, graph.edges]);

  // Zoom handlers
  const handleZoomIn = () => {
    sound.playCheck();
    setZoom((prev) => Math.min(2.5, Math.round((prev + 0.2) * 100) / 100));
  };

  const handleZoomOut = () => {
    sound.playCheck();
    setZoom((prev) => Math.max(0.4, Math.round((prev - 0.2) * 100) / 100));
  };

  const handleResetView = () => {
    sound.playCheck();
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNodeId(null);
  };

  const toggleFullscreen = () => {
    sound.playCheck();
    setIsFullscreen((prev) => !prev);
  };

  // Drag and pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
    setZoom((prev) => {
      const next = prev + zoomDelta;
      return Math.min(2.5, Math.max(0.4, Math.round(next * 100) / 100));
    });
  };

  // Node interaction
  const handleNodeClick = (node: KnowledgeGraphNode, e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playCheck();
    if (selectedNodeId === node.id) {
      setSelectedNodeId(null);
    } else {
      setSelectedNodeId(node.id);
    }
  };

  const handleNodeMouseEnter = (
    node: KnowledgeGraphNode,
    e: React.MouseEvent,
  ) => {
    setHoveredNodeId(node.id);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.min(e.clientX - rect.left + 12, rect.width - 260);
      const y = Math.max(e.clientY - rect.top - 45, 10);
      setTooltipPos({ x, y });
    } else {
      setTooltipPos({ x: 50, y: 50 });
    }
  };

  const handleNodeMouseLeave = () => {
    setHoveredNodeId(null);
    setTooltipPos(null);
  };

  // Export handlers
  const handleExportSvg = useCallback(() => {
    sound.playSuccess();
    if (!svgRef.current) return;
    const svgClone = svgRef.current.cloneNode(true) as SVGSVGElement;
    svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    const svgData = new XMLSerializer().serializeToString(svgClone);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${displayTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-knowledge-graph.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [displayTitle]);

  const handleExportJson = useCallback(() => {
    sound.playSuccess();
    const exportPayload = {
      title: displayTitle,
      extractedAt: new Date().toISOString(),
      nodes: graph.nodes,
      edges: graph.edges,
      metrics: counts,
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${displayTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-knowledge-graph.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [displayTitle, graph, counts]);

  // Connected details for selected node
  const selectedNodeDetails = useMemo(() => {
    if (!selectedNode) return null;

    const citingFindings: KnowledgeGraphNode[] = [];
    const citedSources: KnowledgeGraphNode[] = [];
    const mentionedConcepts: KnowledgeGraphNode[] = [];
    const relatedConcepts: KnowledgeGraphNode[] = [];

    graph.edges.forEach((edge) => {
      if (edge.source === selectedNode.id) {
        const targetNode = nodeMap.get(edge.target);
        if (targetNode) {
          if (edge.label === "cites") citedSources.push(targetNode);
          else if (edge.label === "mentions")
            mentionedConcepts.push(targetNode);
          else if (edge.label === "relates_to")
            relatedConcepts.push(targetNode);
        }
      } else if (edge.target === selectedNode.id) {
        const sourceNode = nodeMap.get(edge.source);
        if (sourceNode) {
          if (edge.label === "cites") citingFindings.push(sourceNode);
          else if (edge.label === "mentions") citingFindings.push(sourceNode);
          else if (edge.label === "relates_to")
            relatedConcepts.push(sourceNode);
        }
      }
    });

    return {
      citingFindings,
      citedSources,
      mentionedConcepts,
      relatedConcepts,
    };
  }, [selectedNode, graph.edges, nodeMap]);

  // Color & Icon Helpers
  const getNodeColor = (type: string) => {
    switch (type) {
      case "source":
        return {
          fill: "#064e3b",
          stroke: "#10b981",
          ring: "rgba(16, 185, 129, 0.4)",
          text: "#6ee7b7",
          badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
        };
      case "concept":
        return {
          fill: "#134e4a",
          stroke: "#14b8a6",
          ring: "rgba(20, 184, 166, 0.4)",
          text: "#5eead4",
          badge: "bg-teal-500/15 text-teal-300 border-teal-500/30",
        };
      case "entity":
        return {
          fill: "#0c4a6e",
          stroke: "#0ea5e9",
          ring: "rgba(14, 165, 233, 0.4)",
          text: "#7dd3fc",
          badge: "bg-sky-500/15 text-sky-300 border-sky-500/30",
        };
      case "finding":
      default:
        return {
          fill: "#581c87",
          stroke: "#a855f7",
          ring: "rgba(168, 85, 247, 0.4)",
          text: "#d8b4fe",
          badge: "bg-purple-500/15 text-purple-300 border-purple-500/30",
        };
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case "source":
        return <Globe className="w-3.5 h-3.5 text-emerald-400" />;
      case "concept":
        return <Sparkles className="w-3.5 h-3.5 text-teal-400" />;
      case "entity":
        return <Cpu className="w-3.5 h-3.5 text-sky-400" />;
      case "finding":
      default:
        return <FileText className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  // Node radius based on degree
  const getNodeRadius = (node: KnowledgeGraphNode) => {
    const base =
      node.type === "finding" ? 20 : node.type === "source" ? 18 : 16;
    return Math.max(base, Math.min(30, base + node.degree * 2));
  };

  return (
    <div
      ref={containerRef}
      className={`w-full rounded-xl border border-slate-800 bg-slate-950/90 backdrop-blur-md flex flex-col overflow-hidden text-slate-200 transition-all ${
        isFullscreen
          ? "fixed inset-0 z-50 rounded-none border-none"
          : "min-h-[520px]"
      }`}
    >
      {/* Header Bar */}
      <div className="p-3.5 bg-slate-900/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center flex-shrink-0">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
              <span>{displayTitle}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                {counts.total} nodes &bull; {counts.edges} links
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Interactive knowledge graph and citation network derived from
              verified sources & findings
            </p>
          </div>
        </div>

        {/* View Controls & Export Actions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            <button
              type="button"
              onClick={handleZoomIn}
              title="Zoom In"
              aria-label="Zoom In"
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              title="Zoom Out"
              aria-label="Zoom Out"
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetView}
              title="Reset View"
              aria-label="Reset View"
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            <button
              type="button"
              onClick={handleExportSvg}
              title="Export as SVG"
              className="px-2 py-1 text-xs text-slate-300 hover:text-teal-300 hover:bg-slate-800 rounded transition flex items-center gap-1 cursor-pointer font-medium"
            >
              <Download className="w-3 h-3 text-teal-400" />
              <span>SVG</span>
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              title="Export as JSON"
              className="px-2 py-1 text-xs text-slate-300 hover:text-teal-300 hover:bg-slate-800 rounded transition flex items-center gap-1 cursor-pointer font-medium"
            >
              <Download className="w-3 h-3 text-teal-400" />
              <span>JSON</span>
            </button>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Filter and Legend Bar */}
      <div className="px-3.5 py-2 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-400 mr-1 flex items-center gap-1">
            <Layers className="w-3 h-3" /> Filter:
          </span>
          {[
            { id: "all", label: `All (${counts.total})` },
            { id: "source", label: `Sources (${counts.source})` },
            { id: "finding", label: `Findings (${counts.finding})` },
            { id: "concept", label: `Concepts (${counts.concept})` },
            { id: "entity", label: `Entities (${counts.entity})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                sound.playCheck();
                setActiveTypeFilter(tab.id);
              }}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer ${
                activeTypeFilter === tab.id
                  ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative flex items-center">
          <Search className="w-3 h-3 text-slate-400 absolute left-2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search nodes..."
            className="pl-6 pr-6 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500/50 w-36 sm:w-44"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-1.5 text-slate-400 hover:text-slate-200"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Graph Viewport */}
      <div
        className="relative flex-1 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 select-none overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        style={{ minHeight: isFullscreen ? "calc(100vh - 120px)" : "420px" }}
      >
        {/* Background Grid Pattern */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="graph-grid-pattern"
              width="32"
              height="32"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 32 0 L 0 0 0 32"
                fill="none"
                stroke="#334155"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#graph-grid-pattern)" />
        </svg>

        {/* The Interactive SVG Network */}
        <svg
          ref={svgRef}
          viewBox="0 0 800 600"
          className="w-full h-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
            transition: isDragging ? "none" : "transform 0.15s ease-out",
          }}
        >
          <defs>
            {/* Arrow marker for citation links */}
            <marker
              id="arrow-cites"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" opacity="0.75" />
            </marker>
            {/* Arrow marker for mention links */}
            <marker
              id="arrow-mentions"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#14b8a6" opacity="0.6" />
            </marker>
          </defs>

          {/* Network Edges */}
          <g className="edges-layer">
            {graph.edges.map((edge, idx) => {
              const u = nodeMap.get(edge.source);
              const v = nodeMap.get(edge.target);
              if (
                !u ||
                !v ||
                u.x === undefined ||
                u.y === undefined ||
                v.x === undefined ||
                v.y === undefined
              ) {
                return null;
              }

              const isConnectedToActive = connectedEdgeIndices.has(idx);
              const isDimmed = activeNodeId !== null && !isConnectedToActive;

              let strokeColor = "#334155";
              let markerEnd: string | undefined;

              if (edge.label === "cites") {
                strokeColor = isConnectedToActive ? "#10b981" : "#059669";
                markerEnd = "url(#arrow-cites)";
              } else if (edge.label === "mentions") {
                strokeColor = isConnectedToActive ? "#14b8a6" : "#0d9488";
                markerEnd = "url(#arrow-mentions)";
              } else if (edge.label === "relates_to") {
                strokeColor = isConnectedToActive ? "#a855f7" : "#6366f1";
              }

              return (
                <line
                  key={`${edge.source}-${edge.target}-${idx}`}
                  x1={u.x}
                  y1={u.y}
                  x2={v.x}
                  y2={v.y}
                  stroke={strokeColor}
                  strokeWidth={
                    isConnectedToActive
                      ? 2.5
                      : Math.max(1, Math.min(3, edge.weight * 0.8))
                  }
                  strokeDasharray={edge.label === "cites" ? "4 2" : undefined}
                  opacity={isDimmed ? 0.15 : isConnectedToActive ? 0.95 : 0.45}
                  markerEnd={markerEnd}
                  style={{ transition: "all 0.2s ease" }}
                />
              );
            })}
          </g>

          {/* Network Nodes */}
          <g className="nodes-layer">
            {graph.nodes.map((node) => {
              if (node.x === undefined || node.y === undefined) return null;

              const isSelected = selectedNodeId === node.id;
              const isHovered = hoveredNodeId === node.id;
              const isConnected = connectedNodeIds.has(node.id);
              const isDimmed = activeNodeId !== null && !isConnected;

              // Type filter check
              if (
                activeTypeFilter !== "all" &&
                node.type !== activeTypeFilter
              ) {
                return null;
              }

              // Search query highlight
              const matchesSearch =
                searchQuery.trim().length > 0 &&
                (node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (node.snippet &&
                    node.snippet
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase())));

              const colors = getNodeColor(node.type);
              const radius = getNodeRadius(node);

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="cursor-pointer group"
                  onClick={(e) => handleNodeClick(node, e)}
                  onMouseEnter={(e) => handleNodeMouseEnter(node, e)}
                  onMouseLeave={handleNodeMouseLeave}
                  opacity={isDimmed ? 0.2 : 1}
                  style={{ transition: "opacity 0.2s ease" }}
                >
                  {/* Search pulse ring */}
                  {matchesSearch && (
                    <circle
                      r={radius + 8}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.5"
                      strokeDasharray="4 2"
                      className="animate-spin"
                    />
                  )}

                  {/* Outer selection ring */}
                  {(isSelected || isHovered) && (
                    <circle
                      r={radius + 5}
                      fill="none"
                      stroke={colors.stroke}
                      strokeWidth="2"
                      opacity="0.8"
                    />
                  )}

                  {/* Node Circle */}
                  <circle
                    r={radius}
                    fill={colors.fill}
                    stroke={colors.stroke}
                    strokeWidth={isSelected ? 3 : 1.5}
                    style={{
                      filter:
                        isSelected || isHovered
                          ? `drop-shadow(0 0 8px ${colors.ring})`
                          : "none",
                      transition: "all 0.2s ease",
                    }}
                  />

                  {/* Type / Degree Indicator */}
                  <text
                    textAnchor="middle"
                    dy=".3em"
                    fill={colors.text}
                    fontSize={node.degree > 9 ? "10" : "11"}
                    fontWeight="bold"
                    fontFamily="monospace"
                    pointerEvents="none"
                  >
                    {node.type === "source"
                      ? "S"
                      : node.type === "finding"
                        ? "F"
                        : node.type === "entity"
                          ? "E"
                          : "C"}
                  </text>

                  {/* Node Label Below */}
                  <text
                    textAnchor="middle"
                    y={radius + 13}
                    fill={isSelected || isHovered ? "#ffffff" : "#cbd5e1"}
                    fontSize="9.5"
                    fontFamily="sans-serif"
                    fontWeight={isSelected ? "600" : "400"}
                    pointerEvents="none"
                    style={{
                      textShadow: "0 1px 3px rgba(0,0,0,0.9)",
                    }}
                  >
                    {node.label.length > 22
                      ? `${node.label.slice(0, 20)}...`
                      : node.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredNode && tooltipPos && !selectedNode && (
          <div
            className="absolute z-30 pointer-events-none p-2.5 rounded-lg bg-slate-900/95 border border-slate-700 shadow-xl max-w-xs text-xs backdrop-blur-md"
            style={{
              left: tooltipPos.x,
              top: tooltipPos.y,
            }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              {getNodeIcon(hoveredNode.type)}
              <span className="font-semibold text-slate-100 truncate">
                {hoveredNode.label}
              </span>
              <span
                className={`text-[9px] uppercase font-mono px-1 py-0.2 rounded border ml-auto ${
                  getNodeColor(hoveredNode.type).badge
                }`}
              >
                {hoveredNode.type}
              </span>
            </div>
            {hoveredNode.snippet && (
              <p className="text-[11px] text-slate-300 line-clamp-3 leading-relaxed italic">
                &ldquo;{hoveredNode.snippet}&rdquo;
              </p>
            )}
            <div className="mt-1.5 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>Degree: {hoveredNode.degree} links</span>
              {hoveredNode.domain && <span>{hoveredNode.domain}</span>}
            </div>
          </div>
        )}

        {/* Floating Quick Legend */}
        <div className="absolute bottom-3 left-3 bg-slate-950/80 border border-slate-800 rounded-lg p-2 backdrop-blur-sm flex items-center gap-3 text-[11px] text-slate-400 pointer-events-none">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-400 inline-block" />
            <span>Sources</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 border border-purple-400 inline-block" />
            <span>Findings</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 border border-teal-400 inline-block" />
            <span>Concepts</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 border border-sky-400 inline-block" />
            <span>Entities</span>
          </div>
        </div>
      </div>

      {/* Selected Node Inspector Drawer */}
      {selectedNode && selectedNodeDetails && (
        <div className="p-4 bg-slate-900 border-t border-slate-800 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                {getNodeIcon(selectedNode.type)}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs font-semibold text-slate-100">
                    {selectedNode.label}
                  </h4>
                  <span
                    className={`text-[9.5px] uppercase font-mono px-1.5 py-0.5 rounded border font-semibold ${
                      getNodeColor(selectedNode.type).badge
                    }`}
                  >
                    {selectedNode.type}
                  </span>
                  <span className="text-[10.5px] font-mono text-slate-400">
                    Degree: {selectedNode.degree} links
                  </span>
                </div>
                {selectedNode.domain && (
                  <p className="text-[11px] font-mono text-teal-400">
                    {selectedNode.domain}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedNode.url && (
                <a
                  href={selectedNode.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-md bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-medium flex items-center gap-1 transition"
                >
                  <span>Open Source</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <button
                type="button"
                onClick={() => setSelectedNodeId(null)}
                className="p-1 rounded-md bg-slate-800 text-slate-400 hover:text-slate-100 transition cursor-pointer"
                title="Close Inspector"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Snippet / Description */}
          {selectedNode.snippet && (
            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 mb-3 leading-relaxed italic">
              &ldquo;{selectedNode.snippet}&rdquo;
            </div>
          )}

          {/* Connected Entities Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Citing findings or connected findings */}
            {selectedNodeDetails.citingFindings.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10.5px] font-mono uppercase text-slate-400 block">
                  Referenced in Findings (
                  {selectedNodeDetails.citingFindings.length}):
                </span>
                <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                  {selectedNodeDetails.citingFindings.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedNodeId(f.id)}
                      className="w-full text-left p-1.5 rounded bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-slate-300 hover:text-teal-300 truncate text-[11px] transition flex items-center justify-between cursor-pointer"
                    >
                      <span className="truncate">{f.label}</span>
                      <ArrowRight className="w-3 h-3 text-slate-500 flex-shrink-0 ml-1" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Cited Sources */}
            {selectedNodeDetails.citedSources.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10.5px] font-mono uppercase text-slate-400 block">
                  Grounding Sources ({selectedNodeDetails.citedSources.length}):
                </span>
                <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                  {selectedNodeDetails.citedSources.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedNodeId(s.id)}
                      className="w-full text-left p-1.5 rounded bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-emerald-300 truncate text-[11px] transition flex items-center justify-between cursor-pointer"
                    >
                      <span className="truncate">{s.label}</span>
                      <ArrowRight className="w-3 h-3 text-emerald-500 flex-shrink-0 ml-1" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Mentioned Concepts */}
            {selectedNodeDetails.mentionedConcepts.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10.5px] font-mono uppercase text-slate-400 block">
                  Mentioned Concepts (
                  {selectedNodeDetails.mentionedConcepts.length}):
                </span>
                <div className="flex flex-wrap gap-1">
                  {selectedNodeDetails.mentionedConcepts.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedNodeId(c.id)}
                      className="px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 text-teal-300 border border-slate-800 text-[10.5px] transition cursor-pointer"
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Related Concepts */}
            {selectedNodeDetails.relatedConcepts.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10.5px] font-mono uppercase text-slate-400 block">
                  Related Concepts ({selectedNodeDetails.relatedConcepts.length}
                  ):
                </span>
                <div className="flex flex-wrap gap-1">
                  {selectedNodeDetails.relatedConcepts.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedNodeId(c.id)}
                      className="px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 text-purple-300 border border-slate-800 text-[10.5px] transition cursor-pointer"
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
