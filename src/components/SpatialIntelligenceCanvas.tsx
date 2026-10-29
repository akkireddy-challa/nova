"use client";

import React, {
  useState,
  useRef,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import {
  LayoutGrid,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Download,
  Copy,
  Check,
  FileText,
  Swords,
  Scale,
  Target,
  BarChart2,
  Code2,
  ExternalLink,
  X,
  ArrowRight,
} from "lucide-react";
import type { Session, StudioMode, GenerativeArtifact } from "@/lib/types";
import { sound } from "@/lib/sound";
import {
  extractSpatialNodes,
  computeSpatialEdges,
  computeCanvasBounds,
  computeFitViewport,
  calculateBezierPath,
  spatialCanvasToCsv,
  spatialCanvasToMarkdown,
  type SpatialCanvasNode,
  type ViewportTransform,
  type SpatialCanvasData,
} from "@/lib/canvas/spatial-canvas";

export interface SpatialIntelligenceCanvasProps {
  session: Session | null;
  onSelectMode?: (mode: StudioMode) => void;
  onInspectArtifact?: (artifact: GenerativeArtifact) => void;
}

type ArtifactFilterType =
  "all" | "debate" | "matrix" | "research" | "plan" | "chart" | "code";

export function SpatialIntelligenceCanvas({
  session,
  onSelectMode,
  onInspectArtifact,
}: SpatialIntelligenceCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Viewport transform state: clamped between 0.25x and 2.5x
  const [transform, setTransform] = useState<ViewportTransform>({
    panX: 0,
    panY: 0,
    zoom: 1,
  });

  // Pan interaction state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Filtering & selection
  const [selectedFilter, setSelectedFilter] =
    useState<ArtifactFilterType>("all");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Copy feedback
  const [copiedReport, setCopiedReport] = useState(false);

  // Container dimensions state for mini-map viewport calculations
  const [containerSize, setContainerSize] = useState({
    width: 1200,
    height: 800,
  });

  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth || 1200,
          height: containerRef.current.clientHeight || 800,
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Extract topological data deterministically
  const messages = useMemo(() => session?.messages || [], [session?.messages]);
  const allNodes = useMemo(() => extractSpatialNodes(messages), [messages]);
  const allEdges = useMemo(() => computeSpatialEdges(allNodes), [allNodes]);
  const bounds = useMemo(() => computeCanvasBounds(allNodes), [allNodes]);

  // Filtered nodes & edges
  const visibleNodes = useMemo(() => {
    if (selectedFilter === "all") return allNodes;
    return allNodes.filter((n) => n.artifactType === selectedFilter);
  }, [allNodes, selectedFilter]);

  const visibleNodeIds = useMemo(
    () => new Set(visibleNodes.map((n) => n.id)),
    [visibleNodes],
  );

  const visibleEdges = useMemo(() => {
    return allEdges.filter(
      (e) => visibleNodeIds.has(e.sourceId) && visibleNodeIds.has(e.targetId),
    );
  }, [allEdges, visibleNodeIds]);

  const selectedNode = useMemo(
    () => allNodes.find((n) => n.id === selectedNodeId) || null,
    [allNodes, selectedNodeId],
  );

  // Canvas data bundle for CSV and Markdown exports
  const canvasData: SpatialCanvasData = useMemo(() => {
    const typeDistribution: Record<string, number> = {};
    for (const n of allNodes) {
      typeDistribution[n.artifactType] =
        (typeDistribution[n.artifactType] || 0) + 1;
    }
    return {
      nodes: allNodes,
      edges: allEdges,
      bounds,
      stats: {
        totalNodes: allNodes.length,
        totalEdges: allEdges.length,
        typeDistribution,
      },
    };
  }, [allNodes, allEdges, bounds]);

  // Zoom controls with clamping between 0.25x and 2.5x
  const handleZoomIn = () => {
    sound.playTap();
    setTransform((prev) => ({
      ...prev,
      zoom: Math.min(2.5, Number((prev.zoom + 0.15).toFixed(2))),
    }));
  };

  const handleZoomOut = () => {
    sound.playTap();
    setTransform((prev) => ({
      ...prev,
      zoom: Math.max(0.25, Number((prev.zoom - 0.15).toFixed(2))),
    }));
  };

  const handleResetView = () => {
    sound.playTap();
    setTransform({ panX: 0, panY: 0, zoom: 1 });
  };

  const handleFitView = useCallback(() => {
    sound.playCheck();
    const container = containerRef.current;
    const width = container?.clientWidth || 1200;
    const height = container?.clientHeight || 800;
    const nextTransform = computeFitViewport(bounds, width, height);
    setTransform(nextTransform);
  }, [bounds]);

  // Pan & Wheel interactions
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest(".no-pan")) return;

    setIsDragging(true);
    setDragStart({
      x: e.clientX - transform.panX,
      y: e.clientY - transform.panY,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setTransform((prev) => ({
      ...prev,
      panX: e.clientX - dragStart.x,
      panY: e.clientY - dragStart.y,
    }));
  };

  const handleMouseUp = () => {
    if (isDragging) setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Zoom clamping between 0.25x and 2.5x
      const zoomFactor = -e.deltaY * 0.005;
      setTransform((prev) => {
        const newZoom = Math.min(
          2.5,
          Math.max(0.25, Number((prev.zoom + zoomFactor).toFixed(2))),
        );
        return { ...prev, zoom: newZoom };
      });
    } else {
      // Pan
      setTransform((prev) => ({
        ...prev,
        panX: prev.panX - e.deltaX,
        panY: prev.panY - e.deltaY,
      }));
    }
  };

  // Mini-map click to pan directly to region
  const handleMiniMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const miniScaleX = 160 / Math.max(bounds.width, 200);
    const miniScaleY = 100 / Math.max(bounds.height, 200);

    const targetWorldX = bounds.minX + clickX / miniScaleX;
    const targetWorldY = bounds.minY + clickY / miniScaleY;

    const container = containerRef.current;
    const width = container?.clientWidth || 1200;
    const height = container?.clientHeight || 800;

    sound.playTap();
    setTransform((prev) => ({
      ...prev,
      panX: width / 2 - targetWorldX * prev.zoom,
      panY: height / 2 - targetWorldY * prev.zoom,
    }));
  };

  // Export Canvas CSV
  const handleExportCsv = () => {
    sound.playSuccess();
    const csv = spatialCanvasToCsv(canvasData);
    if (typeof window !== "undefined") {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const titleSlug = session?.title
        ? session.title.toLowerCase().replace(/[^a-z0-9]/g, "-")
        : "spatial-topology";
      link.setAttribute("download", `nova-${titleSlug}-canvas.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  // Copy Topology Report
  const handleCopyReport = async () => {
    sound.playCheck();
    const md = spatialCanvasToMarkdown(canvasData);
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(md);
        setCopiedReport(true);
        setTimeout(() => setCopiedReport(false), 2000);
      } catch {}
    }
  };

  // Node selection & inspection
  const handleSelectNode = (node: SpatialCanvasNode) => {
    sound.playTap();
    setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
    if (onInspectArtifact && node.artifactData) {
      onInspectArtifact(node.artifactData);
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-slate-950 overflow-hidden text-slate-100 select-none">
      {/* 1. TOP CONTROL BAR */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 flex items-center justify-between gap-3 shrink-0 z-30">
        {/* Title & Counts */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-semibold text-slate-100 text-sm">
            <LayoutGrid className="w-5 h-5 text-indigo-400" />
            <span>Spatial Intelligence Canvas</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300 font-mono">
              {`${allNodes.length} Nodes`}
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300 font-mono">
              {`${allEdges.length} Wires`}
            </span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="hidden md:flex items-center gap-1 bg-slate-950/70 p-1 rounded-lg border border-slate-800">
          {(
            [
              { id: "all", label: "All" },
              { id: "debate", label: "Debates" },
              { id: "matrix", label: "Matrices" },
              { id: "research", label: "Research" },
              { id: "plan", label: "Plans" },
              { id: "chart", label: "Charts" },
              { id: "code", label: "Code" },
            ] as const
          ).map((filter) => {
            const isActive = selectedFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => {
                  sound.playTap();
                  setSelectedFilter(filter.id);
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        {/* Right Actions & Zoom Controls */}
        <div className="flex items-center gap-2">
          {/* Zoom Readout & Controls */}
          <div className="flex items-center bg-slate-800/80 border border-slate-700/60 rounded-lg p-0.5 text-slate-300">
            <button
              onClick={handleZoomOut}
              aria-label="Zoom Out"
              title="Zoom Out"
              className="p-1.5 hover:text-white hover:bg-slate-700/50 rounded transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span
              className="text-xs font-mono px-2 py-0.5 text-slate-300 min-w-[44px] text-center"
              title="Zoom Level"
            >
              {`${Math.round(transform.zoom * 100)}%`}
            </span>
            <button
              onClick={handleZoomIn}
              aria-label="Zoom In"
              title="Zoom In"
              className="p-1.5 hover:text-white hover:bg-slate-700/50 rounded transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-3 bg-slate-700 mx-0.5" />
            <button
              onClick={handleFitView}
              aria-label="Fit View"
              title="Fit View"
              className="p-1.5 hover:text-white hover:bg-slate-700/50 rounded transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetView}
              aria-label="Reset View"
              title="Reset View"
              className="p-1.5 hover:text-white hover:bg-slate-700/50 rounded transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExportCsv}
              aria-label="Export Canvas CSV"
              className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden lg:inline">Export Canvas CSV</span>
            </button>

            <button
              onClick={handleCopyReport}
              aria-label="Copy Topology Report"
              className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
            >
              {copiedReport ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden lg:inline text-emerald-400">
                    Copied Report
                  </span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden lg:inline">Copy Topology Report</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 2. INFINITE CANVAS VIEWPORT */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className={`relative flex-1 w-full h-full overflow-hidden select-none bg-slate-950 ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(148, 163, 184, 0.16) 1.5px, transparent 1.5px)",
          backgroundSize: `${32 * transform.zoom}px ${32 * transform.zoom}px`,
          backgroundPosition: `${transform.panX}px ${transform.panY}px`,
        }}
      >
        {allNodes.length === 0 ? (
          /* 6. EMPTY STATE */
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-16 z-10 relative">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 text-indigo-400 shadow-inner">
              <LayoutGrid className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-slate-200 mb-1">
              Spatial Intelligence Canvas
            </h3>
            <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
              Start research or debate to populate canvas with interactive
              topological artifact nodes and semantic relationship wires.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                onClick={() => {
                  sound.playTap();
                  onSelectMode?.("research");
                }}
                className="px-3.5 py-1.5 rounded-lg bg-cyan-950/40 border border-cyan-800/60 text-cyan-300 hover:bg-cyan-900/50 hover:border-cyan-600 text-xs font-mono transition-colors flex items-center gap-2 shadow-sm"
              >
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                <span>/research</span>
              </button>
              <button
                onClick={() => {
                  sound.playTap();
                  onSelectMode?.("debate");
                }}
                className="px-3.5 py-1.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 hover:bg-rose-900/50 hover:border-rose-600 text-xs font-mono transition-colors flex items-center gap-2 shadow-sm"
              >
                <Swords className="w-3.5 h-3.5 text-rose-400" />
                <span>/debate</span>
              </button>
              <button
                onClick={() => {
                  sound.playTap();
                  onSelectMode?.("matrix");
                }}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-950/40 border border-indigo-800/60 text-indigo-300 hover:bg-indigo-900/50 hover:border-indigo-600 text-xs font-mono transition-colors flex items-center gap-2 shadow-sm"
              >
                <Scale className="w-3.5 h-3.5 text-indigo-400" />
                <span>/matrix</span>
              </button>
            </div>
          </div>
        ) : (
          /* TRANSFORMED WORLD CONTAINER */
          <div
            className="absolute origin-top-left transition-transform duration-75 ease-out"
            style={{
              transform: `translate(${transform.panX}px, ${transform.panY}px) scale(${transform.zoom})`,
              width: bounds.width + 1200,
              height: bounds.height + 1200,
            }}
          >
            {/* 3. INTERACTIVE SVG WIRES LAYER */}
            <svg
              className="absolute inset-0 pointer-events-none"
              style={{
                width: "100%",
                height: "100%",
                overflow: "visible",
              }}
            >
              <defs>
                <marker
                  id="wire-arrow-indigo"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#818cf8" />
                </marker>
                <marker
                  id="wire-arrow-rose"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#f43f5e" />
                </marker>
                <marker
                  id="wire-arrow-cyan"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#06b6d4" />
                </marker>
              </defs>

              {visibleEdges.map((edge) => {
                const source = visibleNodes.find((n) => n.id === edge.sourceId);
                const target = visibleNodes.find((n) => n.id === edge.targetId);
                if (!source || !target) return null;

                const { path, midX, midY } = calculateBezierPath(
                  source,
                  target,
                );

                const isDebateEdge = edge.relationType === "debates";
                const isResearchEdge = edge.relationType === "validates";
                const strokeColor = isDebateEdge
                  ? "#f43f5e"
                  : isResearchEdge
                    ? "#06b6d4"
                    : "#818cf8";
                const markerId = isDebateEdge
                  ? "url(#wire-arrow-rose)"
                  : isResearchEdge
                    ? "url(#wire-arrow-cyan)"
                    : "url(#wire-arrow-indigo)";

                return (
                  <g key={edge.id} className="transition-opacity duration-300">
                    <path
                      d={path}
                      stroke={strokeColor}
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      fill="none"
                      markerEnd={markerId}
                      opacity={0.8}
                    />
                    {/* Midpoint relationship pill */}
                    <foreignObject
                      x={midX - 60}
                      y={midY - 12}
                      width="120"
                      height="24"
                      className="overflow-visible pointer-events-auto"
                    >
                      <div className="px-2 py-0.5 rounded-full bg-slate-900/95 border border-slate-700 text-[10px] text-slate-300 font-medium text-center shadow-lg truncate backdrop-blur-sm">
                        {edge.label || edge.relationType}
                      </div>
                    </foreignObject>
                  </g>
                );
              })}
            </svg>

            {/* 4. NODE CARDS LAYER */}
            {visibleNodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              return (
                <div
                  key={node.id}
                  onClick={() => handleSelectNode(node)}
                  className={`absolute rounded-xl transition-all duration-200 cursor-pointer shadow-lg no-pan flex flex-col justify-between p-4 ${
                    isSelected
                      ? "ring-2 ring-indigo-400 shadow-[0_0_25px_rgba(99,102,241,0.4)] scale-[1.02]"
                      : "hover:scale-[1.01]"
                  } ${getNodeCardStyling(node.artifactType)}`}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: `${node.width}px`,
                    height: `${node.height}px`,
                  }}
                >
                  {/* Top Header of Node */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        {getNodeIcon(node.artifactType)}
                        <span className="text-[11px] font-mono uppercase tracking-wider font-semibold opacity-90">
                          {node.artifactType}
                        </span>
                      </div>
                      {/* Metric / Type Gauge */}
                      {renderNodeGauge(node)}
                    </div>

                    <h4 className="font-semibold text-slate-100 text-sm line-clamp-2 mb-1.5 leading-snug">
                      {node.title}
                    </h4>

                    <p className="text-xs text-slate-300/80 line-clamp-3 leading-relaxed">
                      {node.summary}
                    </p>
                  </div>

                  {/* Card Bottom Meta */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800/60 mt-2">
                    <div className="flex items-center gap-2">
                      {node.metrics?.itemCount !== undefined && (
                        <span>
                          {node.metrics.itemCount}{" "}
                          {getItemCountLabel(node.artifactType)}
                        </span>
                      )}
                      {node.metrics?.evidenceCount !== undefined && (
                        <span>• {node.metrics.evidenceCount} sources</span>
                      )}
                    </div>
                    <div className="text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1">
                      <span>Inspect</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 5. MINI-MAP IN BOTTOM RIGHT CORNER (160x100) */}
        {allNodes.length > 0 && (
          <div
            data-testid="mini-map-container"
            className="absolute bottom-4 right-4 w-[160px] h-[100px] rounded-lg bg-slate-950/90 border border-slate-800 shadow-2xl backdrop-blur-md overflow-hidden z-20 cursor-crosshair no-pan group"
            title="Click to pan canvas"
            onClick={handleMiniMapClick}
          >
            <div className="absolute top-1 left-2 text-[9px] font-mono text-slate-500 uppercase tracking-wider select-none">
              Mini-Map
            </div>

            {/* Node Dots on Mini-Map */}
            {allNodes.map((node) => {
              const miniScaleX = 160 / Math.max(bounds.width, 200);
              const miniScaleY = 100 / Math.max(bounds.height, 200);
              const dotX = (node.x - bounds.minX) * miniScaleX;
              const dotY = (node.y - bounds.minY) * miniScaleY;

              return (
                <div
                  key={`dot-${node.id}`}
                  className={`absolute rounded-sm ${getMiniMapDotColor(
                    node.artifactType,
                  )}`}
                  style={{
                    left: `${Math.max(2, Math.min(154, dotX))}px`,
                    top: `${Math.max(2, Math.min(94, dotY))}px`,
                    width: "4px",
                    height: "4px",
                  }}
                />
              );
            })}

            {/* Viewport Box on Mini-Map */}
            {(() => {
              const miniScaleX = 160 / Math.max(bounds.width, 200);
              const miniScaleY = 100 / Math.max(bounds.height, 200);
              const containerWidth = containerSize.width;
              const containerHeight = containerSize.height;

              const visibleWorldLeft = -transform.panX / transform.zoom;
              const visibleWorldTop = -transform.panY / transform.zoom;
              const visibleWorldWidth = containerWidth / transform.zoom;
              const visibleWorldHeight = containerHeight / transform.zoom;

              const boxX = Math.max(
                0,
                (visibleWorldLeft - bounds.minX) * miniScaleX,
              );
              const boxY = Math.max(
                0,
                (visibleWorldTop - bounds.minY) * miniScaleY,
              );
              const boxW = Math.min(160, visibleWorldWidth * miniScaleX);
              const boxH = Math.min(100, visibleWorldHeight * miniScaleY);

              return (
                <div
                  className="absolute border border-indigo-400/80 bg-indigo-500/20 rounded pointer-events-none transition-all duration-75"
                  style={{
                    left: `${boxX}px`,
                    top: `${boxY}px`,
                    width: `${Math.max(12, boxW)}px`,
                    height: `${Math.max(10, boxH)}px`,
                  }}
                />
              );
            })()}
          </div>
        )}

        {/* DETAILS DRAWER / INSPECTOR OVERLAY */}
        {selectedNode && (
          <div className="absolute top-4 right-4 bottom-4 w-88 max-w-[calc(100vw-32px)] bg-slate-900/95 border border-slate-800 rounded-xl shadow-2xl p-4 flex flex-col justify-between z-30 backdrop-blur-md no-pan">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <div className="flex items-center gap-2">
                  {getNodeIcon(selectedNode.artifactType)}
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-300">
                    {selectedNode.artifactType} Node
                  </span>
                </div>
                <button
                  onClick={() => setSelectedNodeId(null)}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <h3 className="font-semibold text-slate-100 text-base mb-2">
                {selectedNode.title}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                {selectedNode.summary}
              </p>

              <div className="space-y-2 bg-slate-950/60 p-3 rounded-lg border border-slate-850 text-xs font-mono text-slate-400">
                <div className="flex justify-between">
                  <span>Coordinates:</span>
                  <span className="text-slate-200">
                    ({selectedNode.x}, {selectedNode.y})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Dimensions:</span>
                  <span className="text-slate-200">
                    {selectedNode.width} × {selectedNode.height}
                  </span>
                </div>
                {selectedNode.metrics?.itemCount !== undefined && (
                  <div className="flex justify-between">
                    <span>{getItemCountLabel(selectedNode.artifactType)}:</span>
                    <span className="text-slate-200">
                      {selectedNode.metrics.itemCount}
                    </span>
                  </div>
                )}
                {selectedNode.metrics?.evidenceCount !== undefined && (
                  <div className="flex justify-between">
                    <span>Citations:</span>
                    <span className="text-slate-200">
                      {selectedNode.metrics.evidenceCount}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center gap-2">
              {onInspectArtifact && selectedNode.artifactData && (
                <button
                  onClick={() => {
                    sound.playSuccess();
                    if (selectedNode.artifactData) {
                      onInspectArtifact(selectedNode.artifactData);
                    }
                  }}
                  className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Full Inspector</span>
                </button>
              )}
              <button
                onClick={() => setSelectedNodeId(null)}
                className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Styling per artifact type matching specification
 */
function getNodeCardStyling(type: SpatialCanvasNode["artifactType"]): string {
  switch (type) {
    case "debate":
      return "border border-rose-500/40 bg-slate-900/90 hover:border-emerald-500/50 text-rose-300";
    case "matrix":
      return "border border-indigo-500/40 bg-slate-900/90 hover:border-indigo-400/80 text-indigo-300";
    case "research":
      return "border border-cyan-500/40 bg-slate-900/90 hover:border-cyan-400/80 text-cyan-300";
    case "plan":
      return "border border-amber-500/40 bg-slate-900/90 hover:border-amber-400/80 text-amber-300";
    case "chart":
      return "border border-blue-500/40 bg-slate-900/90 hover:border-blue-400/80 text-blue-300";
    case "code":
      return "border border-purple-500/40 bg-slate-900/90 hover:border-purple-400/80 text-purple-300";
    default:
      return "border border-slate-800 bg-slate-900/90 text-slate-300";
  }
}

function getNodeIcon(type: SpatialCanvasNode["artifactType"]) {
  switch (type) {
    case "debate":
      return <Swords className="w-3.5 h-3.5 text-rose-400" />;
    case "matrix":
      return <Scale className="w-3.5 h-3.5 text-indigo-400" />;
    case "research":
      return <FileText className="w-3.5 h-3.5 text-cyan-400" />;
    case "plan":
      return <Target className="w-3.5 h-3.5 text-amber-400" />;
    case "chart":
      return <BarChart2 className="w-3.5 h-3.5 text-blue-400" />;
    case "code":
      return <Code2 className="w-3.5 h-3.5 text-purple-400" />;
  }
}

function getMiniMapDotColor(type: SpatialCanvasNode["artifactType"]): string {
  switch (type) {
    case "debate":
      return "bg-rose-500";
    case "matrix":
      return "bg-indigo-500";
    case "research":
      return "bg-cyan-500";
    case "plan":
      return "bg-amber-500";
    case "chart":
      return "bg-blue-500";
    case "code":
      return "bg-purple-500";
    default:
      return "bg-slate-400";
  }
}

function getItemCountLabel(type: SpatialCanvasNode["artifactType"]): string {
  switch (type) {
    case "debate":
      return "participants";
    case "matrix":
      return "options";
    case "research":
      return "findings";
    case "plan":
      return "milestones";
    case "chart":
      return "points";
    case "code":
      return "lines";
    default:
      return "items";
  }
}

function renderNodeGauge(node: SpatialCanvasNode) {
  switch (node.artifactType) {
    case "debate":
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-950/80 text-rose-300 border border-rose-800/60">
          Dialectic Consensus
        </span>
      );
    case "matrix":
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
          Top Choice Verdict
        </span>
      );
    case "research":
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
          Grounded Sources
        </span>
      );
    case "plan":
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-950/80 text-amber-300 border border-amber-800/60">
          Strategic Horizon
        </span>
      );
    case "chart":
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-950/80 text-blue-300 border border-blue-800/60">
          Telemetry Series
        </span>
      );
    case "code":
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-950/80 text-purple-300 border border-purple-800/60">
          Sandboxed Code
        </span>
      );
  }
}

export default SpatialIntelligenceCanvas;
