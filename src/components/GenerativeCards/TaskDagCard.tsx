'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { GoalPlan, MilestonePhase, TaskSubItem } from '@/lib/types';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Flame, 
  ChevronRight, 
  ChevronDown, 
  Target,
  Sparkles,
  Volume2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '@/lib/sound';

interface Props {
  plan: GoalPlan;
}

export function TaskDagCard({ plan }: Props) {
  const [phases, setPhases] = useState<MilestonePhase[]>(plan.phases);
  const [expandedPhase, setExpandedPhase] = useState<string>(phases[0]?.id || '');

  // Calculate completion percentage
  const allTasks = phases.flatMap(p => p.tasks);
  const completedCount = allTasks.filter(t => t.status === 'completed').length;
  const progressPercent = allTasks.length > 0 ? Math.round((completedCount / allTasks.length) * 100) : 0;

  const toggleTask = (phaseId: string, taskId: string) => {
    sound.playCheck();
    setPhases(prev =>
      prev.map(phase => {
        if (phase.id !== phaseId) return phase;
        return {
          ...phase,
          tasks: phase.tasks.map(t => {
            if (t.id !== taskId) return t;
            const newStatus = t.status === 'completed' ? 'todo' : 'completed';
            if (newStatus === 'completed') {
              // Trigger slight confetti burst
              try {
                confetti({
                  particleCount: 25,
                  spread: 40,
                  origin: { y: 0.8 },
                });
              } catch {}
            }
            return { ...t, status: newStatus };
          }),
        };
      })
    );
  };

  return (
    <div className="w-full my-4 rounded-xl border border-slate-700/80 bg-slate-900/90 backdrop-blur-md overflow-hidden shadow-2xl transition-all">
      {/* Header */}
      <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-base leading-tight">
              {plan.goal}
            </h3>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
              <span className="flex items-center gap-1 text-indigo-400">
                <Clock className="w-3.5 h-3.5" />
                {plan.timeframe}
              </span>
              <span>•</span>
              <span>{phases.length} phases</span>
              <span>•</span>
              <span>{allTasks.length} Milestones</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Progress pill */}
          <div className="flex items-center gap-3 bg-slate-900 px-3.5 py-1.5 rounded-full border border-slate-800">
            <div className="w-20 bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-500 h-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-bold text-indigo-300 font-mono">
              {progressPercent}% Done
            </span>
          </div>
        </div>
      </div>

      {/* Overview text */}
      <div className="px-5 py-3.5 bg-slate-900/30 border-b border-slate-800/80 text-xs text-slate-300 leading-relaxed">
        {plan.overview}
      </div>

      {/* Phases Accordion */}
      <div className="divide-y divide-slate-800">
        {phases.map(phase => {
          const isExpanded = expandedPhase === phase.id;
          const phaseTasks = phase.tasks;
          const phaseDone = phaseTasks.filter(t => t.status === 'completed').length;
          const isAllDone = phaseTasks.length > 0 && phaseDone === phaseTasks.length;

          return (
            <div key={phase.id} className="transition">
              <button
                onClick={() => setExpandedPhase(isExpanded ? '' : phase.id)}
                className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-slate-800/40 text-left transition"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                    isAllDone 
                      ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' 
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}>
                    {phase.phaseNumber}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                      {phase.phaseName}
                      {isAllDone && (
                        <span className="text-[10px] bg-teal-500/10 text-teal-300 px-2 py-0.5 rounded border border-teal-500/30">
                          Complete
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-400 line-clamp-1">{phase.summary}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 font-mono">
                    {phaseDone}/{phaseTasks.length}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="px-5 pb-4 pt-1 bg-slate-950/30 space-y-2.5">
                  {phaseTasks.map(task => {
                    const isDone = task.status === 'completed';
                    return (
                      <div
                        key={task.id}
                        onClick={() => toggleTask(phase.id, task.id)}
                        className={`p-3 rounded-lg border transition cursor-pointer flex items-start gap-3 ${
                          isDone 
                            ? 'bg-slate-900/40 border-slate-800 text-slate-400' 
                            : 'bg-slate-900/80 border-slate-800/80 hover:border-indigo-500/40 text-slate-200'
                        }`}
                      >
                        <button className="mt-0.5 flex-shrink-0 text-slate-400 hover:text-indigo-400 transition">
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-teal-400" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-500" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium leading-snug ${isDone ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                            {task.title}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                            {task.description}
                          </p>
                          {task.actionableOutput && (
                            <div className="mt-2 text-[10px] text-indigo-300/80 bg-indigo-950/40 px-2 py-1 rounded border border-indigo-900/50 flex items-center gap-1.5 font-mono">
                              <Sparkles className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                              <span className="truncate">{task.actionableOutput}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Key Success Metrics Footer */}
      {plan.keySuccessMetrics && plan.keySuccessMetrics.length > 0 && (
        <div className="p-4 bg-slate-950/70 border-t border-slate-800">
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            Key Success Criteria
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {plan.keySuccessMetrics.map((metric, i) => (
              <div key={i} className="text-[11px] text-slate-300 bg-slate-900/80 p-2 rounded border border-slate-800">
                • {metric}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export { TaskDagCard as PlanCard };
