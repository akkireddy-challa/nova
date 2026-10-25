"use client";

import React, { useState, useRef, useEffect } from "react";
import { ResearchReport, SourceCitation } from "@/lib/types";
import {
  ExternalLink,
  AlertTriangle,
  Download,
  Sparkles,
  CheckCircle2,
  BookOpen,
  Globe,
} from "lucide-react";
import { sound } from "@/lib/sound";

interface Props {
  report: ResearchReport;
}

function resolveSource(
  sources: SourceCitation[] | undefined,
  ref: string | number,
): { source: SourceCitation; displayIndex: number } | null {
  if (!sources || sources.length === 0) return null;
  const refStr = String(ref).trim();

  // 1. Direct match on source.id
  const directIdx = sources.findIndex((s) => s.id === refStr);
  if (directIdx !== -1) {
    return { source: sources[directIdx], displayIndex: directIdx + 1 };
  }

  // 2. Parse numbers from [1], 1, src-1, source 1, etc.
  const match = refStr.match(/^\[?(?:src-|source\s*)?(\d+)\]?$/i);
  if (match) {
    const num = parseInt(match[1], 10);
    // 2a. Match on source.id equaling num or `src-${num}`
    const idIdx = sources.findIndex(
      (s) =>
        s.id === String(num) ||
        s.id === `src-${num}` ||
        s.id === `source-${num}`,
    );
    if (idIdx !== -1) {
      return { source: sources[idIdx], displayIndex: idIdx + 1 };
    }
    // 2b. Match 1-based index (sources[num - 1])
    if (num >= 1 && num <= sources.length) {
      return { source: sources[num - 1], displayIndex: num };
    }
  }

  return null;
}

interface CitationBadgeProps {
  source: SourceCitation;
  displayIndex: number;
  isHighlighted: boolean;
  onHover: (id: string | null) => void;
}

function CitationBadge({
  source,
  displayIndex,
  isHighlighted,
  onHover,
}: CitationBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [align, setAlign] = useState<"left" | "right">("left");
  const containerRef = useRef<HTMLSpanElement>(null);

  // Close when clicked outside
  useEffect(() => {
    if (!isPinned) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsPinned(false);
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isPinned]);

  // Close on Escape key
  useEffect(() => {
    if (!isPinned && !isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsPinned(false);
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isPinned, isOpen]);

  const updateAlignment = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.right + 280 > window.innerWidth) {
        setAlign("right");
      } else {
        setAlign("left");
      }
    }
  };

  const handleMouseEnter = () => {
    onHover(source.id);
    updateAlignment();
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    onHover(null);
    if (!isPinned) {
      setIsOpen(false);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateAlignment();
    setIsPinned((prev) => {
      const next = !prev;
      setIsOpen(next);
      return next;
    });
  };

  return (
    <span
      ref={containerRef}
      className="relative inline-block align-baseline"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={handleClick}
        aria-label={`Citation [${displayIndex}]: ${source.title}`}
        className={`inline-flex items-center justify-center font-mono text-[10.5px] font-semibold px-1.5 py-0.2 rounded transition cursor-pointer select-none mx-0.5 ${
          isHighlighted || isOpen || isPinned
            ? "bg-teal-400 text-slate-950 border border-teal-300 font-bold ring-2 ring-teal-400/40 shadow-sm shadow-teal-400/30 scale-105"
            : "bg-teal-500/15 text-teal-300 border border-teal-500/30 hover:bg-teal-500/25 hover:border-teal-400"
        }`}
      >
        [{displayIndex}]
      </button>

      {(isOpen || isPinned) && (
        <div
          role="tooltip"
          onClick={(e) => e.stopPropagation()}
          className={`absolute z-40 top-full mt-1.5 ${
            align === "right" ? "right-0" : "left-0"
          } w-72 sm:w-80 p-3.5 rounded-xl border border-slate-700/90 bg-slate-900/95 shadow-2xl shadow-black/90 backdrop-blur-md text-left transition-all`}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold flex-shrink-0">
                [{displayIndex}]
              </span>
              <h5 className="text-xs font-semibold text-slate-100 line-clamp-2 leading-snug">
                {source.title}
              </h5>
            </div>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              title="Open source in new tab"
              className="p-1 rounded text-slate-400 hover:text-teal-300 hover:bg-slate-800 transition flex-shrink-0 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-2">
            <span className="flex items-center gap-1 text-teal-400 font-medium truncate">
              <Globe className="w-3 h-3 text-teal-400 flex-shrink-0" />
              <span className="truncate">{source.domain}</span>
            </span>
            {source.relevanceScore !== undefined && (
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-teal-300 border border-slate-700 flex-shrink-0 ml-1">
                {source.relevanceScore}% Match
              </span>
            )}
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 mb-2.5 line-clamp-4">
            &ldquo;{source.snippet}&rdquo;
          </p>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10.5px]">
            <span className="text-slate-500 truncate max-w-[170px] sm:max-w-[190px]">
              {source.url}
            </span>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-teal-400 hover:text-teal-300 font-medium hover:underline flex-shrink-0"
            >
              <span>Visit source</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </span>
  );
}

export function ResearchReportCard({ report }: Props) {
  const [activeTab, setActiveTab] = useState<"findings" | "sources" | "risks">(
    "findings",
  );
  const [copied, setCopied] = useState(false);
  const [hoveredSourceId, setHoveredSourceId] = useState<string | null>(null);

  const handleDownload = () => {
    sound.playCheck();
    const md = `# ${report.title}\n\n## Executive Summary\n${report.executiveSummary}\n\n## Key Findings\n${report.keyFindings.map((f) => `### ${f.point}\n${f.description}\nConfidence: ${f.confidence}${f.citationIds?.length ? `\nCitations: ${f.citationIds.join(", ")}` : ""}`).join("\n\n")}\n\n## Recommendation\n${report.recommendation}\n\n## Primary Citations\n${report.sources.map((s) => `- [${s.title}](${s.url}) - ${s.snippet}`).join("\n")}`;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderTextWithCitations = (text: string, keyPrefix: string) => {
    if (!text) return null;
    const regex = /(\[(?:src-|\b)?\d+(?:\s*,\s*(?:src-|\b)?\d+)*\])/g;
    const parts = text.split(regex);

    return parts.map((part, pIdx) => {
      const isCitationGroup = regex.test(part);
      regex.lastIndex = 0;

      if (!isCitationGroup) {
        return (
          <React.Fragment key={`${keyPrefix}-txt-${pIdx}`}>
            {part}
          </React.Fragment>
        );
      }

      const inner = part.replace(/^\[|\]$/g, "");
      const refs = inner
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const resolvedItems = refs.map((ref) =>
        resolveSource(report.sources, ref),
      );

      if (!resolvedItems.some(Boolean)) {
        return (
          <React.Fragment key={`${keyPrefix}-cite-${pIdx}`}>
            {part}
          </React.Fragment>
        );
      }

      return (
        <span
          key={`${keyPrefix}-citegroup-${pIdx}`}
          className="inline-flex items-center align-baseline"
        >
          {resolvedItems.map((resolved, rIdx) => {
            if (!resolved) {
              return (
                <span
                  key={`${keyPrefix}-raw-${rIdx}`}
                  className="text-slate-400 text-[11px] font-mono mx-0.5"
                >
                  [{refs[rIdx]}]
                </span>
              );
            }
            return (
              <CitationBadge
                key={`${keyPrefix}-badge-${resolved.source.id}-${rIdx}`}
                source={resolved.source}
                displayIndex={resolved.displayIndex}
                isHighlighted={hoveredSourceId === resolved.source.id}
                onHover={setHoveredSourceId}
              />
            );
          })}
        </span>
      );
    });
  };

  return (
    <div className="w-full my-4 rounded-xl border border-slate-700/80 bg-slate-900/90 backdrop-blur-md overflow-hidden shadow-2xl transition-all">
      {/* Header bar */}
      <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-base leading-tight">
              {report.title}
            </h3>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
              <span>{report.sources?.length ?? 0} sources</span>
              {report.metrics && report.metrics.synthesisTimeMs > 0 && (
                <>
                  <span>•</span>
                  <span>
                    {(report.metrics.synthesisTimeMs / 1000).toFixed(1)}s
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Report */}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
          >
            {copied ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{copied ? "Downloaded" : "Export"}</span>
          </button>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="p-5 border-b border-slate-800/80 bg-slate-900/40">
        <p className="text-xs uppercase tracking-wider font-semibold text-teal-400 mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Executive Summary
        </p>
        <p className="text-sm text-slate-300 leading-relaxed">
          {report.executiveSummary}
        </p>
      </div>

      {/* Prominently Displayed Sources - Always Visible Upfront */}
      {report.sources && report.sources.length > 0 && (
        <div className="px-5 py-3.5 border-b border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-teal-300 font-semibold flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-teal-400" />
              Sources ({report.sources.length})
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {report.sources.map((src, srcIdx) => {
              const isHighlighted = hoveredSourceId === src.id;
              return (
                <a
                  key={src.id}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onMouseEnter={() => setHoveredSourceId(src.id)}
                  onMouseLeave={() => setHoveredSourceId(null)}
                  className={`p-3 rounded-xl border transition group block ${
                    isHighlighted
                      ? "border-teal-400 bg-slate-900 ring-2 ring-teal-400/50 shadow-lg shadow-teal-500/15"
                      : "border-slate-800 bg-slate-900/60 hover:border-teal-500/40 hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-teal-300 truncate flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold transition ${
                          isHighlighted
                            ? "bg-teal-400 text-slate-950"
                            : "bg-teal-500/15 text-teal-300 border border-teal-500/30"
                        }`}
                      >
                        [{srcIdx + 1}]
                      </span>
                      <span className="truncate">{src.title}</span>
                    </span>
                    <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-teal-400 flex-shrink-0" />
                  </div>
                  <p className="text-[10.5px] text-slate-400 line-clamp-2 leading-snug mb-1.5">
                    {src.snippet}
                  </p>
                  <div className="flex items-center justify-between text-[9.5px] font-mono text-slate-500">
                    <span className="text-teal-400/90 font-semibold">
                      {src.domain}
                    </span>
                    {src.relevanceScore !== undefined && (
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-teal-300 border border-slate-700">
                        {src.relevanceScore}% Match
                      </span>
                    )}
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 text-xs font-medium">
        <button
          onClick={() => setActiveTab("findings")}
          className={`py-2.5 px-3 border-b-2 transition cursor-pointer ${
            activeTab === "findings"
              ? "border-teal-400 text-teal-300 font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Key Findings ({report.keyFindings.length})
        </button>
        <button
          onClick={() => setActiveTab("sources")}
          className={`py-2.5 px-3 border-b-2 transition cursor-pointer ${
            activeTab === "sources"
              ? "border-teal-400 text-teal-300 font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Primary Sources ({report.sources.length})
        </button>
        {report.contradictionsAndRisks &&
          report.contradictionsAndRisks.length > 0 && (
            <button
              onClick={() => setActiveTab("risks")}
              className={`py-2.5 px-3 border-b-2 transition cursor-pointer ${
                activeTab === "risks"
                  ? "border-teal-400 text-teal-300 font-semibold"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Risks & Trade-offs
            </button>
          )}
      </div>

      {/* Content Area */}
      <div className="p-5">
        {activeTab === "findings" && (
          <div className="space-y-4">
            {report.keyFindings.map((finding, idx) => {
              const findingSources = (finding.citationIds || []).reduce<
                { source: SourceCitation; displayIndex: number }[]
              >((acc, ref) => {
                const resolved = resolveSource(report.sources, ref);
                if (
                  resolved &&
                  !acc.some((x) => x.source.id === resolved.source.id)
                ) {
                  acc.push(resolved);
                }
                return acc;
              }, []);

              return (
                <div
                  key={idx}
                  className="p-4 rounded-lg border border-slate-800 bg-slate-950/40 hover:border-slate-700/80 transition"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-start gap-2 flex-wrap min-w-0">
                      <span className="w-5 h-5 rounded-full bg-teal-500/10 text-teal-400 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-sm font-semibold text-slate-100">
                            {renderTextWithCitations(
                              finding.point,
                              `finding-pt-${idx}`,
                            )}
                          </h4>
                          {findingSources.length > 0 && (
                            <span className="inline-flex items-center gap-0.5">
                              {findingSources.map((item, cIdx) => (
                                <CitationBadge
                                  key={`finding-${idx}-cite-${item.source.id}-${cIdx}`}
                                  source={item.source}
                                  displayIndex={item.displayIndex}
                                  isHighlighted={
                                    hoveredSourceId === item.source.id
                                  }
                                  onHover={setHoveredSourceId}
                                />
                              ))}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase flex-shrink-0 ${
                        finding.confidence === "high"
                          ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      {finding.confidence} confidence
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed pl-7">
                    {renderTextWithCitations(
                      finding.description,
                      `finding-desc-${idx}`,
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "sources" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {report.sources.map((src, srcIdx) => {
              const isHighlighted = hoveredSourceId === src.id;
              return (
                <a
                  key={src.id}
                  href={src.url}
                  target="_blank"
                  rel="noreferrer"
                  onMouseEnter={() => setHoveredSourceId(src.id)}
                  onMouseLeave={() => setHoveredSourceId(null)}
                  className={`p-3.5 rounded-lg border transition group block ${
                    isHighlighted
                      ? "border-teal-400 bg-slate-950 ring-2 ring-teal-400/50 shadow-lg shadow-teal-500/15"
                      : "border-slate-800 bg-slate-950/40 hover:border-teal-500/40 hover:bg-slate-950/80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold text-teal-300 group-hover:text-teal-200 flex items-center gap-1.5 line-clamp-1">
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold transition ${
                          isHighlighted
                            ? "bg-teal-400 text-slate-950"
                            : "bg-teal-500/15 text-teal-300 border border-teal-500/30"
                        }`}
                      >
                        [{srcIdx + 1}]
                      </span>
                      <span className="truncate">{src.title}</span>
                      <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 flex-shrink-0" />
                    </span>
                    {src.relevanceScore !== undefined && (
                      <span className="text-[10px] text-teal-400 bg-teal-950/50 px-1.5 py-0.5 rounded border border-teal-800 flex-shrink-0">
                        {src.relevanceScore}% rel
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mb-2 leading-relaxed">
                    {src.snippet}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>{src.domain}</span>
                    {src.publishedDate && <span>{src.publishedDate}</span>}
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {activeTab === "risks" && report.contradictionsAndRisks && (
          <div className="space-y-3">
            {report.contradictionsAndRisks.map((risk, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 flex items-start gap-3"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200/90 leading-relaxed">
                  {risk}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Final Recommendation Box */}
        {report.recommendation && (
          <div className="mt-5 p-3.5 rounded-lg border border-teal-500/30 bg-teal-500/5">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-teal-400 block mb-1">
              Recommendation
            </span>
            <p className="text-xs text-teal-200 leading-relaxed">
              {report.recommendation}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
