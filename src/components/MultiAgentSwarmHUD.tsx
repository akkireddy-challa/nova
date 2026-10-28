"use client";

import React, { useId, useMemo, useState } from "react";
import type {
  AgentSwarmEvent,
  SwarmAgentRole,
  SwarmAgentState,
  SwarmExecutionPlan,
  SwarmStageStatus,
} from "../lib/types";
import { SWARM_ROLES } from "../lib/research/multi-agent-orchestrator";
import {
  AlertCircle,
  BarChart2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Compass,
  Layers,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

export interface MultiAgentSwarmHUDProps {
  plan?: SwarmExecutionPlan;
  agentStates: Record<SwarmAgentRole, SwarmAgentState> | SwarmAgentState[];
  events: AgentSwarmEvent[];
  activeRole?: SwarmAgentRole;
  isExecuting?: boolean;
  onSelectRole?: (role: SwarmAgentRole) => void;
  className?: string;
}

const ROLE_ICONS: Record<
  SwarmAgentRole,
  React.ComponentType<{ className?: string }>
> = {
  scout: Compass,
  analyst: BarChart2,
  critic: ShieldCheck,
  synthesizer: Sparkles,
};

const SWARM_ROLES_LIST: SwarmAgentRole[] = [
  "scout",
  "analyst",
  "critic",
  "synthesizer",
];

const ROLE_COLORS: Record<
  SwarmAgentRole,
  {
    badge: string;
    border: string;
    bg: string;
    text: string;
    ring: string;
  }
> = {
  scout: {
    badge: "bg-sky-500/10 text-sky-400 border-sky-500/30",
    border: "border-sky-500/40",
    bg: "bg-sky-950/20",
    text: "text-sky-400",
    ring: "ring-sky-500/30",
  },
  analyst: {
    badge: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
    border: "border-indigo-500/40",
    bg: "bg-indigo-950/20",
    text: "text-indigo-400",
    ring: "ring-indigo-500/30",
  },
  critic: {
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    border: "border-amber-500/40",
    bg: "bg-amber-950/20",
    text: "text-amber-400",
    ring: "ring-amber-500/30",
  },
  synthesizer: {
    badge: "bg-teal-500/10 text-teal-400 border-teal-500/30",
    border: "border-teal-500/40",
    bg: "bg-teal-950/20",
    text: "text-teal-400",
    ring: "ring-teal-500/30",
  },
};

function formatLatency(ms?: number): string {
  if (ms === undefined || ms === null || ms <= 0) return "--";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return isoString;
  }
}

/**
 * Renders status indicators:
 * - active: Pulsing teal
 * - completed: Green checkmark
 * - pending: Gray indicator
 * - failed: Red alert icon
 */
export function SwarmStatusIndicator({
  status,
  size = "md",
}: {
  status: SwarmStageStatus;
  size?: "sm" | "md";
}) {
  if (status === "active") {
    return (
      <span
        aria-label="Active status"
        className="relative flex items-center justify-center"
      >
        <span
          className={`animate-ping absolute inline-flex rounded-full bg-teal-400 opacity-75 ${
            size === "sm" ? "h-2.5 w-2.5" : "h-3.5 w-3.5"
          }`}
        />
        <span
          className={`relative inline-flex rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)] ${
            size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5"
          }`}
        />
      </span>
    );
  }

  if (status === "completed") {
    return (
      <CheckCircle2
        aria-label="Completed status"
        className={`text-emerald-400 shrink-0 ${
          size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"
        }`}
      />
    );
  }

  if (status === "failed") {
    return (
      <AlertCircle
        aria-label="Failed status"
        className={`text-rose-400 shrink-0 ${
          size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"
        }`}
      />
    );
  }

  // Pending status
  return (
    <span
      aria-label="Pending status"
      className={`inline-block rounded-full bg-slate-600/70 border border-slate-500/50 ${
        size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5"
      }`}
    />
  );
}

export function MultiAgentSwarmHUD({
  plan,
  agentStates,
  events = [],
  activeRole,
  isExecuting = false,
  onSelectRole,
  className = "",
}: MultiAgentSwarmHUDProps) {
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<
    SwarmAgentRole | "all"
  >("all");
  const [expandedSummaryRole, setExpandedSummaryRole] =
    useState<SwarmAgentRole | null>(null);
  const [isFeedCollapsed, setIsFeedCollapsed] = useState(false);
  const filterId = useId();

  // Normalize agentStates from Array or Record
  const normalizedStates: Record<SwarmAgentRole, SwarmAgentState> =
    useMemo(() => {
      const result = {} as Record<SwarmAgentRole, SwarmAgentState>;

      if (Array.isArray(agentStates)) {
        for (const item of agentStates) {
          result[item.role] = item;
        }
      } else if (agentStates) {
        for (const role of SWARM_ROLES_LIST) {
          if (agentStates[role]) {
            result[role] = agentStates[role];
          }
        }
      }

      // Fill missing states with clean pending structures
      for (const role of SWARM_ROLES_LIST) {
        if (!result[role]) {
          const meta = SWARM_ROLES[role];
          result[role] = {
            role,
            name: meta.name,
            title: meta.title,
            status: "pending",
            findingsCount: 0,
            latencyMs: 0,
          };
        }
      }

      return result;
    }, [agentStates]);

  // Filter events based on user selection
  const filteredEvents = useMemo(() => {
    if (selectedRoleFilter === "all") return events;
    return events.filter((e) => e.role === selectedRoleFilter);
  }, [events, selectedRoleFilter]);

  const completedCount = useMemo(() => {
    return SWARM_ROLES_LIST.filter(
      (r) => normalizedStates[r]?.status === "completed",
    ).length;
  }, [normalizedStates]);

  const hasActiveAgent = useMemo(() => {
    return (
      isExecuting ||
      SWARM_ROLES_LIST.some((r) => normalizedStates[r]?.status === "active")
    );
  }, [isExecuting, normalizedStates]);

  return (
    <div
      data-testid="multi-agent-swarm-hud"
      className={`rounded-xl border border-slate-800 bg-slate-900/90 backdrop-blur-md shadow-2xl p-4 transition-all duration-200 text-slate-100 ${className}`}
    >
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center p-1.5 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400">
            <Zap className="w-4 h-4" />
            {hasActiveAgent && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold tracking-wide text-slate-200">
                Multi-Agent Swarm HUD
              </h3>
              <span
                className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border ${
                  hasActiveAgent
                    ? "bg-teal-500/10 text-teal-300 border-teal-500/30 animate-pulse"
                    : completedCount === 4
                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                }`}
              >
                {hasActiveAgent
                  ? "Orchestrating"
                  : completedCount === 4
                    ? "Mission Complete"
                    : "Standby"}
              </span>
            </div>
            {plan?.mission && (
              <p className="text-xs text-slate-400 font-mono truncate max-w-md mt-0.5">
                Mission: <span className="text-slate-300">{plan.mission}</span>
              </p>
            )}
          </div>
        </div>

        {/* Swarm Completion Stats */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[11px] font-mono text-slate-400">
              Swarm Progress
            </div>
            <div className="text-xs font-semibold text-slate-200 font-mono">
              {`${completedCount} / 4 Agents Done`}
            </div>
          </div>
          <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${(completedCount / 4) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4 Agent Role Nodes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-4">
        {SWARM_ROLES_LIST.map((role) => {
          const state = normalizedStates[role];
          const Icon = ROLE_ICONS[role];
          const colors = ROLE_COLORS[role];
          const isSelected = activeRole === role;
          const isExpanded = expandedSummaryRole === role;
          const stagePlan = plan?.stages.find((s) => s.role === role);

          return (
            <div
              key={role}
              data-testid={`swarm-node-${role}`}
              onClick={() => {
                onSelectRole?.(role);
                setExpandedSummaryRole((curr) => (curr === role ? null : role));
              }}
              className={`relative cursor-pointer rounded-lg border p-3 transition-all duration-200 ${
                state.status === "active"
                  ? `${colors.bg} ${colors.border} ring-1 ${colors.ring} shadow-md`
                  : state.status === "completed"
                    ? "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                    : "bg-slate-950/30 border-slate-800/80 hover:border-slate-750 opacity-90"
              } ${isSelected ? "ring-2 ring-teal-400" : ""}`}
            >
              {/* Header: Role Icon, Name, and Status Indicator */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`p-1.5 rounded-md border ${colors.badge} shrink-0`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-200 truncate">
                        {state.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {state.title}
                    </span>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-1.5 shrink-0 pl-1">
                  <span
                    className={`text-[10px] font-mono capitalize ${
                      state.status === "active"
                        ? "text-teal-400 font-semibold"
                        : state.status === "completed"
                          ? "text-emerald-400"
                          : state.status === "failed"
                            ? "text-rose-400"
                            : "text-slate-500"
                    }`}
                  >
                    {state.status}
                  </span>
                  <SwarmStatusIndicator status={state.status} />
                </div>
              </div>

              {/* Task or Goal snippet */}
              <div className="mt-2 text-[11px] text-slate-400 line-clamp-2">
                {state.currentTask ||
                  stagePlan?.goal ||
                  SWARM_ROLES[role].description}
              </div>

              {/* Findings & Latency Pill Footer */}
              <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono">
                <div className="flex items-center gap-1 text-slate-300">
                  <Layers className="w-3 h-3 text-slate-500" />
                  <span data-testid={`findings-count-${role}`}>
                    {`${state.findingsCount ?? 0} findings`}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span data-testid={`latency-${role}`}>
                    {formatLatency(state.latencyMs)}
                  </span>
                </div>
              </div>

              {/* Collapsible Findings & Metrics Details */}
              {isExpanded && (
                <div
                  data-testid={`expanded-summary-${role}`}
                  className="mt-3 pt-2.5 border-t border-slate-800 space-y-1.5 text-xs bg-slate-900/60 -mx-3 -mb-3 p-3 rounded-b-lg animate-in fade-in-50 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center text-[11px] font-mono text-slate-400">
                    <span>Role Capabilities</span>
                    <button
                      type="button"
                      onClick={() => setExpandedSummaryRole(null)}
                      className="text-slate-500 hover:text-slate-300 text-[10px]"
                    >
                      Close
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    {SWARM_ROLES[role].description}
                  </p>

                  <div className="pt-1.5 space-y-1 text-[11px] font-mono">
                    <div className="flex justify-between text-slate-400">
                      <span>Verified Findings:</span>
                      <span className="text-slate-200 font-semibold">
                        {state.findingsCount ?? 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Execution Latency:</span>
                      <span className="text-slate-200 font-semibold">
                        {formatLatency(state.latencyMs)}
                      </span>
                    </div>
                    {stagePlan?.dependencies && (
                      <div className="flex justify-between text-slate-400">
                        <span>Dependencies:</span>
                        <span className="text-slate-300">
                          {stagePlan.dependencies.length > 0
                            ? stagePlan.dependencies.join(", ")
                            : "None (entry)"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Live Swarm Event Progress Feed */}
      <div className="mt-4 pt-3 border-t border-slate-800/80">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <button
            type="button"
            onClick={() => setIsFeedCollapsed((prev) => !prev)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            {isFeedCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>Live Swarm Event Feed</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
              {events.length}
            </span>
          </button>

          {/* Filter by Agent Pill Group */}
          <div className="flex items-center gap-1 text-[11px]">
            <label htmlFor={filterId} className="text-slate-400 sr-only">
              Filter by Agent
            </label>
            <span className="text-slate-500 font-mono text-[10px] mr-1">
              Filter:
            </span>
            {(
              ["all", "scout", "analyst", "critic", "synthesizer"] as const
            ).map((filterOption) => (
              <button
                key={filterOption}
                id={filterOption === "all" ? filterId : undefined}
                type="button"
                onClick={() => setSelectedRoleFilter(filterOption)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition capitalize ${
                  selectedRoleFilter === filterOption
                    ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                    : "bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent"
                }`}
              >
                {filterOption}
              </button>
            ))}
          </div>
        </div>

        {/* Progress Feed Items */}
        {!isFeedCollapsed && (
          <div
            data-testid="swarm-events-stream"
            className="max-h-56 overflow-y-auto space-y-2 pr-1 text-xs"
          >
            {filteredEvents.length === 0 ? (
              <div className="text-center py-6 text-slate-500 font-mono text-xs border border-dashed border-slate-800 rounded-lg">
                No swarm events recorded for this selection.
              </div>
            ) : (
              filteredEvents.map((evt) => {
                const colors = ROLE_COLORS[evt.role];
                const Icon = ROLE_ICONS[evt.role];

                return (
                  <div
                    key={evt.id}
                    data-testid={`swarm-event-${evt.id}`}
                    className="flex items-start gap-2.5 p-2 rounded-md bg-slate-950/40 border border-slate-800/80 hover:border-slate-700/80 transition"
                  >
                    <div
                      className={`p-1 rounded border ${colors.badge} shrink-0 mt-0.5`}
                    >
                      <Icon className="w-3 h-3" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-slate-200 text-[11px] capitalize">
                          {evt.role}
                        </span>
                        <span className="text-slate-500 text-[10px]">·</span>
                        <span className="font-mono text-[10px] text-teal-400">
                          {evt.type.replace(/_/g, " ")}
                        </span>
                        <span className="ml-auto font-mono text-[10px] text-slate-500">
                          {formatTime(evt.timestamp)}
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px] mt-0.5 break-words">
                        {evt.message}
                      </p>

                      {/* Optional Event Metadata Chips */}
                      {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5 font-mono text-[9px]">
                          {evt.metadata.latencyMs !== undefined && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700">
                              latency:{" "}
                              {formatLatency(evt.metadata.latencyMs as number)}
                            </span>
                          )}
                          {evt.metadata.findingsCount !== undefined && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700">
                              findings: {String(evt.metadata.findingsCount)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
