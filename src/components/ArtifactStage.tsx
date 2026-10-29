"use client";

import React, { useState, useMemo } from "react";
import { GenerativeArtifact, StudioMode } from "@/lib/types";
import {
  X,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Download,
  Sparkles,
  ExternalLink,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Printer,
  RotateCcw,
  ListOrdered,
  Trophy,
  Share2,
  Network,
} from "lucide-react";
import { sound } from "@/lib/sound";
import { KnowledgeGraphCard } from "@/components/GenerativeCards/KnowledgeGraphCard";
import { DebateCard } from "@/components/GenerativeCards/DebateCard";
import { PersonaCouncilCard } from "@/components/GenerativeCards/PersonaCouncilCard";
import { ResilienceSimulationCard } from "@/components/GenerativeCards/ResilienceSimulationCard";
import { AudioBriefingCard } from "@/components/GenerativeCards/AudioBriefingCard";
import { CompetitiveBattleCard } from "@/components/GenerativeCards/CompetitiveBattleCard";
import { ParetoFrontierCard } from "@/components/GenerativeCards/ParetoFrontierCard";
import { RegressionEvaluatorCard } from "@/components/GenerativeCards/RegressionEvaluatorCard";
import { RedTeamAuditCard } from "@/components/GenerativeCards/RedTeamAuditCard";
import { GuardrailPolicyCard } from "@/components/GenerativeCards/GuardrailPolicyCard";
import { MultiModalInspectionCard } from "@/components/GenerativeCards/MultiModalInspectionCard";
import { MemoryGraphCard } from "@/components/GenerativeCards/MemoryGraphCard";
import { AudioSpectrogramCard } from "@/components/GenerativeCards/AudioSpectrogramCard";
import { PromptOptimizerCard } from "@/components/GenerativeCards/PromptOptimizerCard";
import { VectorSpaceCard } from "@/components/GenerativeCards/VectorSpaceCard";
import { CausalDagCard } from "@/components/GenerativeCards/CausalDagCard";
import { BayesianOptCard } from "@/components/GenerativeCards/BayesianOptCard";
import { WorkflowOrchestratorCard } from "@/components/GenerativeCards/WorkflowOrchestratorCard";
import { FormalProverCard } from "@/components/GenerativeCards/FormalProverCard";
import { EpistemicConsensusCard } from "@/components/GenerativeCards/EpistemicConsensusCard";
import {
  analyzeDialecticDebate,
  debateToCsv,
} from "@/lib/research/dialectic-debate";
import { personaCouncilToCsv } from "@/lib/research/persona-studio";
import { simulationToCsv } from "@/lib/research/resilience-simulator";
import {
  audioBriefingToCsv,
  formatDurationTimestamp,
} from "@/lib/audio/voice-briefing";
import { battleCardToCsv } from "@/lib/competitive/battle-card";
import { paretoFrontierToCsv } from "@/lib/research/pareto-optimizer";
import { evalSuiteToCsv } from "@/lib/eval/regression-evaluator";
import { redTeamAuditToCsv } from "@/lib/security/red-team-auditor";
import { guardrailsPolicyToCsv } from "@/lib/security/semantic-guardrails";
import { multiModalInspectionToCsv } from "@/lib/multimodal/frame-inspector";
import { memoryGraphToCsv } from "@/lib/graph/memory-graph-engine";
import { audioSpectrogramToCsv } from "@/lib/audio/spectrogram-inspector";
import { promptOptimizationToCsv } from "@/lib/optimization/prompt-optimizer";
import { vectorSpaceToCsv } from "@/lib/vector/vector-space-engine";
import { causalDagToCsv } from "@/lib/causal/causal-dag-engine";
import { bayesianOptToCsv } from "@/lib/optimization/bayesian-opt-engine";
import { workflowOrchestratorToCsv } from "@/lib/workflow/orchestrator-engine";
import { formalProverToCsv } from "@/lib/formal/formal-prover-engine";
import { consensusToCsv } from "@/lib/consensus/consensus-engine";
import {
  getArtifactMetadata,
  prepareBibliography,
  resolveFindingCitations,
  calculateMatrixOptionScores,
} from "@/lib/print-dossier";
import {
  calculateNormalizedWeights,
  recalculateOptionScores,
  chartDataToCsv,
  matrixToCsv,
  downloadArtifactCode,
  downloadCsvData,
  resolveCodeFilename,
} from "@/lib/matrix-calculator";
import { downloadStandaloneHtmlDossier } from "@/lib/html-dossier";

interface Props {
  artifact: GenerativeArtifact;
  onClose: () => void;
  onRefinePrompt?: (prompt: string) => void;
  mode?: StudioMode;
  model?: string;
}

export function ArtifactStage({
  artifact,
  onClose,
  onRefinePrompt,
  mode,
  model,
}: Props) {
  const [activeTab, setActiveTab] = useState<
    "preview" | "raw" | "sources" | "graph"
  >("preview");
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);

  const initialMatrixWeights = useMemo(() => {
    if (artifact.type === "matrix") {
      const initial: Record<string, number> = {};
      artifact.data.criteria.forEach((c) => {
        initial[c.id] = c.weight;
      });
      return initial;
    }
    return {};
  }, [artifact]);

  const [matrixWeights, setMatrixWeights] =
    useState<Record<string, number>>(initialMatrixWeights);

  const isMatrixModified = useMemo(() => {
    if (artifact.type !== "matrix") return false;
    return artifact.data.criteria.some(
      (c) => (matrixWeights[c.id] ?? c.weight) !== c.weight,
    );
  }, [artifact, matrixWeights]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    sound.playCheck();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (artifact.type === "code") {
      const filename = resolveCodeFilename(
        artifact.data.filename || getTitle(),
        artifact.data.language,
      );
      downloadArtifactCode(filename, artifact.data.code);
      sound.playSuccess();
      return;
    }

    if (artifact.type === "chart") {
      const csvContent = chartDataToCsv(artifact.data.data);
      const filename = `${(artifact.data.title || "chart-data").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
      downloadCsvData(filename, csvContent);
      sound.playSuccess();
      return;
    }

    if (artifact.type === "matrix") {
      const csvContent = matrixToCsv(artifact.data, matrixWeights);
      const filename = `${(artifact.data.topic || "decision-matrix").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
      downloadCsvData(filename, csvContent);
      sound.playSuccess();
      return;
    }

    if (artifact.type === "debate") {
      const analysis = analyzeDialecticDebate(artifact.data);
      const csvContent = debateToCsv(artifact.data, analysis);
      const filename = `${(artifact.data.topic || "dialectic-debate").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
      downloadCsvData(filename, csvContent);
      sound.playSuccess();
      return;
    }

    if (artifact.type === "council") {
      const csvContent = personaCouncilToCsv(artifact.data);
      const filename = `${(artifact.data.topic || "persona-council").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
      downloadCsvData(filename, csvContent);
      sound.playSuccess();
      return;
    }

    if (artifact.type === "simulation") {
      const csvContent = simulationToCsv(artifact.data);
      const filename = `${(artifact.data.title || "resilience-simulation").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
      downloadCsvData(filename, csvContent);
      sound.playSuccess();
      return;
    }

    if (artifact.type === "audio_briefing") {
      const csvContent = audioBriefingToCsv(artifact.data);
      const filename = `${(artifact.data.title || "audio-briefing").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
      downloadCsvData(filename, csvContent);
      sound.playSuccess();
      return;
    }

    if (artifact.type === "battlecard") {
      const csvContent = battleCardToCsv(artifact.data);
      const filename = `${(artifact.data.topic || "competitive-battlecard").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
      downloadCsvData(filename, csvContent);
      sound.playSuccess();
      return;
    }

    if (artifact.type === "pareto_frontier") {
      const csvContent = paretoFrontierToCsv(artifact.data);
      const filename = `${(artifact.data.topic || "pareto-frontier").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
      downloadCsvData(filename, csvContent);
      sound.playSuccess();
      return;
    }

    if (artifact.type === "eval_suite") {
      const csvContent = evalSuiteToCsv(artifact.data);
      const filename = `${(artifact.data.topic || "regression-eval").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
      downloadCsvData(filename, csvContent);
      sound.playSuccess();
      return;
    }

    if (artifact.type === "red_team_audit") {
      const csvContent = redTeamAuditToCsv(artifact.data);
      const filename = `${(artifact.data.topic || "red-team-audit").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
      downloadCsvData(filename, csvContent);
      sound.playSuccess();
      return;
    }

    if (artifact.type === "guardrail_policy") {
      const csvContent = guardrailsPolicyToCsv(artifact.data);
      const filename = `${(artifact.data.topic || "guardrail-policy").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
      downloadCsvData(filename, csvContent);
      sound.playSuccess();
      return;
    }

    if (artifact.type === "multimodal_inspection") {
      const csvContent = multiModalInspectionToCsv(artifact.data);
      const filename = `${(artifact.data.topic || "multimodal-inspection").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
      downloadCsvData(filename, csvContent);
      sound.playSuccess();
      return;
    }

    if (artifact.type === "memory_graph") {
      const csvContent = memoryGraphToCsv(artifact.data);
      const filename = `${(artifact.data.topic || "memory-graph").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
      downloadCsvData(filename, csvContent);
      sound.playSuccess();
      return;
    }

    if (artifact.type === "audio_spectrogram") {
      const csvContent = audioSpectrogramToCsv(artifact.data);
      const filename = `${(artifact.data.topic || "audio-spectrogram").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
      downloadCsvData(filename, csvContent);
      sound.playSuccess();
      return;
    }

    if (artifact.type === "prompt_optimizer") {
      const csvContent = promptOptimizationToCsv(artifact.data);
      const filename = `${(artifact.data.targetTask || "prompt-optimization").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
      downloadCsvData(filename, csvContent);
      sound.playSuccess();
      return;
    }

    if (artifact.type === "vector_space") {
      const csvContent = vectorSpaceToCsv(artifact.data);
      const filename = `${(artifact.data.datasetTitle || "vector-space").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
      downloadCsvData(filename, csvContent);
      sound.playSuccess();
      return;
    }

    if (artifact.type === "causal_dag") {
      const csvContent = causalDagToCsv(artifact.data);
      const filename = `${(artifact.data.hypothesis || "causal-dag").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
      downloadCsvData(filename, csvContent);
      sound.playSuccess();
      return;
    }

    if (artifact.type === "bayesian_opt") {
      const csvContent = bayesianOptToCsv(artifact.data);
      const filename = `${(artifact.data.title || "bayesian-opt").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
      downloadCsvData(filename, csvContent);
      sound.playSuccess();
      return;
    }

    if (artifact.type === "workflow_orchestrator") {
      const csvContent = workflowOrchestratorToCsv(artifact.data);
      const filename = `${(artifact.data.title || "workflow").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
      downloadCsvData(filename, csvContent);
      sound.playSuccess();
      return;
    }

    if (artifact.type === "formal_prover") {
      const csvContent = formalProverToCsv(artifact.data);
      const filename = `${(artifact.data.title || "formal-proof").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
      downloadCsvData(filename, csvContent);
      sound.playSuccess();
      return;
    }

    if (artifact.type === "epistemic_consensus") {
      const csvContent = consensusToCsv(artifact.data);
      const filename = `${(artifact.data.title || "consensus").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
      downloadCsvData(filename, csvContent);
      sound.playSuccess();
      return;
    }

    let filename = "nova-artifact";
    let content = "";
    let mimeType = "text/plain";

    if (artifact.type === "research") {
      filename = `${artifact.data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
      content =
        `# ${artifact.data.title}\n\n## Executive Summary\n${artifact.data.executiveSummary}\n\n## Key Findings\n` +
        artifact.data.keyFindings
          .map((f) => `### ${f.point}\n${f.description}\n`)
          .join("\n") +
        `\n## Recommendation\n${artifact.data.recommendation}\n`;
      mimeType = "text/markdown";
    } else {
      filename = `${artifact.type}-artifact.json`;
      content = JSON.stringify(artifact.data, null, 2);
      mimeType = "application/json";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    sound.playSuccess();
  };

  const handlePrint = () => {
    sound.playCheck();
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const getTitle = () => {
    switch (artifact.type) {
      case "code":
        return artifact.data.filename || "Code";
      case "research":
        return artifact.data.title || "Research";
      case "plan":
        return artifact.data.goal || "Plan";
      case "chart":
        return artifact.data.title || "Chart";
      case "matrix":
        return artifact.data.topic || "Comparison";
      case "debate":
        return artifact.data.topic || "Debate";
      case "council":
        return artifact.data.topic || "Persona Council";
      case "simulation":
        return artifact.data.title || "Resilience Simulation";
      case "audio_briefing":
        return artifact.data.title || "Audio Briefing";
      case "battlecard":
        return artifact.data.topic || "Competitive Battle-Card";
      case "pareto_frontier":
        return artifact.data.topic || "Cost-Latency Pareto Frontier";
      case "eval_suite":
        return artifact.data.topic || "Regression Evaluator Suite";
      case "red_team_audit":
        return artifact.data.topic || "Dialectic Red-Team Security Audit";
      case "guardrail_policy":
        return artifact.data.topic || "Semantic Guardrail Policy";
      case "multimodal_inspection":
        return artifact.data.topic || "Multimodal Vision Inspector";
      case "memory_graph":
        return artifact.data.topic || "Memory & Knowledge Graph";
      case "audio_spectrogram":
        return artifact.data.topic || "Acoustic Spectrogram Inspector";
      case "prompt_optimizer":
        return artifact.data.targetTask || "Prompt Evolution Studio";
      case "vector_space":
        return artifact.data.datasetTitle || "Vector Space Studio";
      case "causal_dag":
        return artifact.data.hypothesis || "Causal Inference Studio";
      case "bayesian_opt":
        return artifact.data.title || "Bayesian Optimization Studio";
      case "workflow_orchestrator":
        return artifact.data.title || "Workflow Orchestrator Studio";
      case "formal_prover":
        return artifact.data.title || "Formal Verification Studio";
      case "epistemic_consensus":
        return artifact.data.title || "Epistemic Consensus Studio";
    }
  };

  // Prepare metadata, bibliography and resolved citations for print dossier
  const dossierMetadata = getArtifactMetadata(artifact, mode, model);
  const sourcesList =
    artifact.type === "research" ? artifact.data.sources : undefined;
  const bibliography = prepareBibliography(sourcesList);
  const resolvedFindings =
    artifact.type === "research"
      ? resolveFindingCitations(artifact.data.keyFindings, sourcesList)
      : [];
  const matrixOptionScores =
    artifact.type === "matrix"
      ? calculateMatrixOptionScores(artifact.data, matrixWeights)
      : [];

  return (
    <div
      id="nova-artifact-stage"
      className={`h-full flex flex-col bg-slate-900 border-l border-slate-800 transition-all duration-300 z-20 ${
        isFullscreen
          ? "fixed inset-0 z-50 bg-slate-950"
          : "w-full md:w-[480px] lg:w-[560px] xl:w-[640px]"
      } print:w-full print:max-w-none print:p-8 print:bg-white print:text-black print:overflow-visible print:border-none print:static print:h-auto print:block`}
    >
      {/* Inline style for print rules to enforce document typography and page breaks */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                margin: 1.5cm;
                size: auto;
              }
              html, body {
                background: #ffffff !important;
                color: #000000 !important;
                height: auto !important;
                overflow: visible !important;
              }
              header, aside, nav, [role="navigation"], .print\\:hidden,
              button, input, select, textarea {
                display: none !important;
              }
              .print-avoid-break {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }
            }
          `,
        }}
      />

      {/* Header Bar (Interactive Chrome - Hidden in Print) */}
      <div className="h-14 px-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70 backdrop-blur-md print:hidden">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-teal-300 border border-slate-700">
                {artifact.type}
              </span>
              <h3 className="text-xs font-semibold text-slate-200 truncate">
                {getTitle()}
              </h3>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1">
          {/* Save as Standalone HTML button */}
          <button
            type="button"
            onClick={() => {
              sound.playSuccess();
              downloadStandaloneHtmlDossier(artifact);
            }}
            title="Save as Standalone HTML Dossier"
            aria-label="Save as Standalone HTML"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition cursor-pointer text-xs font-medium"
          >
            <Share2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">HTML Dossier</span>
          </button>

          {/* Print / PDF Dossier button */}
          <button
            type="button"
            onClick={handlePrint}
            title="Print / PDF Dossier"
            aria-label="Print / PDF Dossier"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-teal-300 hover:bg-slate-800 transition cursor-pointer text-xs font-medium"
          >
            <Printer className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden sm:inline">Print / PDF</span>
          </button>

          {/* Download CSV button for debate, council, simulation, audio_briefing, battlecard, pareto_frontier, eval_suite, red_team_audit, and guardrail_policy */}
          {(artifact.type === "debate" ||
            artifact.type === "council" ||
            artifact.type === "simulation" ||
            artifact.type === "audio_briefing" ||
            artifact.type === "battlecard" ||
            artifact.type === "pareto_frontier" ||
            artifact.type === "eval_suite" ||
            artifact.type === "red_team_audit" ||
            artifact.type === "guardrail_policy" ||
            artifact.type === "multimodal_inspection" ||
            artifact.type === "memory_graph" ||
            artifact.type === "audio_spectrogram" ||
            artifact.type === "prompt_optimizer" ||
            artifact.type === "vector_space" ||
            artifact.type === "causal_dag" ||
            artifact.type === "bayesian_opt" ||
            artifact.type === "workflow_orchestrator" ||
            artifact.type === "formal_prover" ||
            artifact.type === "epistemic_consensus") && (
            <button
              type="button"
              onClick={handleDownload}
              title="Download CSV"
              aria-label="Download CSV"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition cursor-pointer text-xs font-medium"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Download CSV</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDownload}
            title="Download artifact"
            aria-label="Download artifact"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            title="Close Stage"
            aria-label="Close Stage"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs Bar (Interactive Chrome - Hidden in Print) */}
      <div className="px-4 py-2 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between text-xs print:hidden">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              sound.playCheck();
              setActiveTab("preview");
            }}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
              activeTab === "preview"
                ? "bg-teal-500/15 text-teal-300 border border-teal-500/30 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            Preview
          </button>

          {artifact.type === "research" && (
            <button
              type="button"
              onClick={() => {
                sound.playCheck();
                setActiveTab("sources");
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "sources"
                  ? "bg-teal-500/15 text-teal-300 border border-teal-500/30 font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>
                Sources
                {artifact.data.sources && artifact.data.sources.length > 0
                  ? ` (${artifact.data.sources.length})`
                  : ""}
              </span>
            </button>
          )}

          {artifact.type === "research" && (
            <button
              type="button"
              onClick={() => {
                sound.playCheck();
                setActiveTab("graph");
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "graph"
                  ? "bg-teal-500/15 text-teal-300 border border-teal-500/30 font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Graph</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              sound.playCheck();
              setActiveTab("raw");
            }}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
              activeTab === "raw"
                ? "bg-teal-500/15 text-teal-300 border border-teal-500/30 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            Raw {artifact.type === "code" ? "Code" : "JSON"}
          </button>
        </div>
      </div>

      {/* Screen Interactive Content Area (Hidden in Print) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 print:hidden">
        {activeTab === "raw" ? (
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                handleCopy(
                  artifact.type === "code"
                    ? artifact.data.code
                    : JSON.stringify(artifact.data, null, 2),
                )
              }
              aria-label="Copy Raw Content"
              className="absolute top-2.5 right-2.5 p-1.5 rounded-md bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-teal-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
              {artifact.type === "code"
                ? artifact.data.code
                : JSON.stringify(artifact.data, null, 2)}
            </pre>
          </div>
        ) : activeTab === "sources" && artifact.type === "research" ? (
          <div className="space-y-3.5">
            {/* Grounded Sources Overview Header */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center flex-shrink-0">
                  <Globe className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">
                    Grounded Sources
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {artifact.data.sources?.length ?? 0} verified references for
                    this research synthesis
                  </p>
                </div>
              </div>
              {artifact.data.metrics &&
                artifact.data.metrics.sourcesCrawled > 0 && (
                  <span className="text-[10.5px] font-mono text-slate-400">
                    {artifact.data.metrics.sourcesCrawled} crawled
                  </span>
                )}
            </div>

            {/* List of cited sources */}
            {!artifact.data.sources || artifact.data.sources.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs">
                No sources reported for this research artifact.
              </div>
            ) : (
              <div className="space-y-3">
                {artifact.data.sources.map((src, idx) => (
                  <div
                    key={src.id || idx}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 hover:border-slate-700 transition space-y-2.5"
                  >
                    {/* Top row: Number, full page title, external link */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-300 border border-teal-500/30 flex-shrink-0 mt-0.5">
                          [{idx + 1}]
                        </span>
                        <h5 className="text-xs font-semibold text-slate-100 leading-snug">
                          {src.title}
                        </h5>
                      </div>
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open source URL"
                        className="p-1 rounded-md text-slate-400 hover:text-teal-300 hover:bg-slate-800 transition flex-shrink-0 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    {/* Domain badge, relevance score (if reported), published date */}
                    <div className="flex flex-wrap items-center gap-2 text-[10.5px] font-mono">
                      <span className="px-2 py-0.5 rounded-md bg-slate-900 text-teal-300 border border-slate-800 font-medium flex items-center gap-1">
                        <Globe className="w-3 h-3 text-teal-400" />
                        {src.domain}
                      </span>

                      {src.relevanceScore !== undefined && (
                        <span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-300 border border-teal-500/20 font-medium">
                          {src.relevanceScore}% Relevance
                        </span>
                      )}

                      {src.publishedDate && (
                        <span className="text-slate-500">
                          {src.publishedDate}
                        </span>
                      )}

                      {src.contradictionFlag && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          Contradiction
                        </span>
                      )}
                    </div>

                    {/* Snippet text block */}
                    <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800/80 text-xs text-slate-300 leading-relaxed font-sans">
                      <p className="text-[11.5px] text-slate-300 leading-relaxed italic">
                        &ldquo;{src.snippet}&rdquo;
                      </p>
                    </div>

                    {/* Direct URL */}
                    <div className="pt-1 flex items-center justify-between text-[11px] font-mono">
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-400 hover:text-teal-300 hover:underline truncate max-w-[85%] flex items-center gap-1"
                      >
                        <span className="truncate">{src.url}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === "graph" && artifact.type === "research" ? (
          <div className="space-y-4">
            <KnowledgeGraphCard report={artifact.data} />
          </div>
        ) : (
          <div>
            {/* CODE ARTIFACT */}
            {artifact.type === "code" && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                  <span className="font-semibold text-teal-400 block mb-1">
                    Notes:
                  </span>
                  {artifact.data.explanation}
                </div>

                <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                  <div className="h-9 px-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400 gap-2 flex-wrap">
                    <span className="truncate font-medium text-slate-300">
                      {artifact.data.filename} ({artifact.data.language})
                    </span>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Line Numbers Toggle */}
                      <button
                        type="button"
                        onClick={() => setShowLineNumbers((prev) => !prev)}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-[10.5px] transition cursor-pointer border ${
                          showLineNumbers
                            ? "bg-teal-500/15 text-teal-300 border-teal-500/30 font-medium"
                            : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
                        }`}
                        title={
                          showLineNumbers
                            ? "Hide Line Numbers"
                            : "Show Line Numbers"
                        }
                        aria-label="Toggle Line Numbers"
                      >
                        <ListOrdered className="w-3 h-3" />
                        <span>
                          {showLineNumbers ? "Lines On" : "Lines Off"}
                        </span>
                      </button>

                      {/* Copy Snippet Button */}
                      <button
                        type="button"
                        onClick={() => handleCopy(artifact.data.code)}
                        className="flex items-center gap-1 px-2 py-1 rounded text-[10.5px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition cursor-pointer"
                        title="Copy Snippet"
                        aria-label="Copy Snippet"
                      >
                        {copied ? (
                          <Check className="w-3 h-3 text-teal-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copied ? "Copied" : "Copy Snippet"}</span>
                      </button>

                      {/* Download Code File Button */}
                      <button
                        type="button"
                        onClick={() => {
                          const resolvedFilename = resolveCodeFilename(
                            artifact.data.filename || getTitle(),
                            artifact.data.language,
                          );
                          downloadArtifactCode(
                            resolvedFilename,
                            artifact.data.code,
                          );
                          sound.playSuccess();
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded text-[10.5px] font-medium bg-teal-500/10 text-teal-300 hover:bg-teal-500/20 border border-teal-500/30 transition cursor-pointer"
                        title="Download Code File"
                        aria-label="Download Code File"
                      >
                        <Download className="w-3 h-3 text-teal-400" />
                        <span>Download Code File</span>
                      </button>
                    </div>
                  </div>

                  {showLineNumbers ? (
                    <div className="p-3 text-xs font-mono text-slate-200 overflow-x-auto max-h-[440px] leading-relaxed">
                      <table className="w-full border-collapse">
                        <tbody>
                          {artifact.data.code.split("\n").map((line, idx) => (
                            <tr key={idx} className="hover:bg-slate-900/60">
                              <td className="select-none text-right pr-4 text-slate-600 font-mono text-[11px] w-8 align-top">
                                {idx + 1}
                              </td>
                              <td className="text-slate-200 whitespace-pre align-top font-mono">
                                {line || " "}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[440px] leading-relaxed">
                      {artifact.data.code}
                    </pre>
                  )}
                </div>
              </div>
            )}

            {/* RESEARCH ARTIFACT */}
            {artifact.type === "research" && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <h4 className="text-xs font-semibold text-teal-400 mb-1.5 uppercase font-mono">
                    Executive Summary
                  </h4>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {artifact.data.executiveSummary}
                  </p>
                </div>

                {/* Verified Grounding Sources & Origins */}
                {artifact.data.sources && artifact.data.sources.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-teal-300 uppercase font-mono flex items-center justify-between">
                      <span>Sources ({artifact.data.sources.length})</span>
                      <button
                        type="button"
                        onClick={() => {
                          sound.playCheck();
                          setActiveTab("sources");
                        }}
                        className="text-[10px] text-teal-400 hover:underline font-sans cursor-pointer font-normal"
                      >
                        View all sources &rarr;
                      </button>
                    </h4>
                    <div className="space-y-2">
                      {artifact.data.sources.map((src, srcIdx) => (
                        <a
                          key={src.id || srcIdx}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-teal-500/40 hover:bg-slate-900/60 transition group block"
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-xs font-semibold text-slate-200 group-hover:text-teal-300 truncate flex items-center gap-1.5">
                              <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-teal-500/15 text-teal-300 border border-teal-500/20 font-bold flex-shrink-0">
                                [{srcIdx + 1}]
                              </span>
                              <span className="truncate">{src.title}</span>
                            </span>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-teal-400 flex-shrink-0" />
                          </div>
                          <p className="text-[11px] text-slate-400 leading-snug line-clamp-2 mb-1.5">
                            {src.snippet}
                          </p>
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                            <span className="text-teal-400 font-medium">
                              {src.domain}
                            </span>
                            {src.relevanceScore !== undefined && (
                              <span className="px-1.5 py-0.2 rounded bg-slate-900 text-teal-300 border border-slate-800">
                                {src.relevanceScore}% Match
                              </span>
                            )}
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-300 uppercase font-mono">
                    Key findings
                  </h4>
                  {artifact.data.keyFindings.map((finding, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          <span className="text-xs font-semibold text-slate-200">
                            {finding.point}
                          </span>
                          {finding.citationIds &&
                            finding.citationIds.length > 0 && (
                              <span className="inline-flex items-center gap-1">
                                {finding.citationIds.map((cId, cIdx) => {
                                  const matchIdx =
                                    artifact.data.sources?.findIndex(
                                      (s) => s.id === cId,
                                    ) ?? -1;
                                  const displayNum =
                                    matchIdx !== -1
                                      ? matchIdx + 1
                                      : cId.replace(/\D/g, "") || cIdx + 1;
                                  return (
                                    <span
                                      key={cIdx}
                                      className="text-[9.5px] font-mono px-1 py-0.2 rounded bg-teal-500/15 text-teal-300 border border-teal-500/30 font-semibold"
                                    >
                                      [{displayNum}]
                                    </span>
                                  );
                                })}
                              </span>
                            )}
                        </div>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase flex-shrink-0 ${
                            finding.confidence === "high"
                              ? "bg-teal-500/10 text-teal-300 border border-teal-500/20"
                              : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                          }`}
                        >
                          {finding.confidence}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {finding.description}
                      </p>
                    </div>
                  ))}
                </div>

                {artifact.data.contradictionsAndRisks &&
                  artifact.data.contradictionsAndRisks.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-1 text-xs text-rose-300">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <span>Caveats and risks</span>
                      </div>
                      {artifact.data.contradictionsAndRisks.map((risk, i) => (
                        <p key={i} className="text-[11px] text-rose-300/80">
                          • {risk}
                        </p>
                      ))}
                    </div>
                  )}
              </div>
            )}

            {/* MATRIX ARTIFACT WITH INTERACTIVE SLIDERS */}
            {artifact.type === "matrix" &&
              (() => {
                const normalized = calculateNormalizedWeights(
                  artifact.data.criteria.map((c) => ({
                    ...c,
                    weight: matrixWeights[c.id] ?? c.weight,
                  })),
                );
                const pMap = new Map(
                  normalized.map((n) => [n.id, n.percentage]),
                );
                const rankedOptions = recalculateOptionScores(
                  artifact.data.options,
                  matrixWeights,
                );

                return (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-teal-400" />
                          <span>Criteria weights</span>
                        </span>

                        <div className="flex items-center gap-2">
                          {isMatrixModified && (
                            <button
                              type="button"
                              onClick={() => {
                                setMatrixWeights(initialMatrixWeights);
                                sound.playCheck();
                              }}
                              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-medium text-teal-300 hover:text-white bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 transition cursor-pointer"
                              title="Reset to original AI weights"
                              aria-label="Reset to original AI weights"
                            >
                              <RotateCcw className="w-3 h-3 text-teal-400" />
                              <span>Reset Weights</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              const csv = matrixToCsv(
                                artifact.data,
                                matrixWeights,
                              );
                              const filename = `${(artifact.data.topic || "decision-matrix").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
                              downloadCsvData(filename, csv);
                              sound.playSuccess();
                            }}
                            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-medium text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 transition cursor-pointer"
                            title="Download Decision Matrix as CSV"
                            aria-label="Download CSV Data"
                          >
                            <Download className="w-3 h-3 text-teal-400" />
                            <span>Download CSV Data</span>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        {artifact.data.criteria.map((crit) => {
                          const currentW =
                            matrixWeights[crit.id] ?? crit.weight;
                          const pct = pMap.get(crit.id) ?? 0;
                          return (
                            <div key={crit.id} className="space-y-1">
                              <div className="flex justify-between text-[11px]">
                                <span className="text-slate-300 font-medium">
                                  {crit.name}
                                </span>
                                <div className="flex items-center gap-1.5 font-mono">
                                  <span className="text-slate-500 text-[10px]">
                                    ({pct}%)
                                  </span>
                                  <span className="text-teal-400 font-semibold">
                                    {currentW}x
                                  </span>
                                </div>
                              </div>
                              <input
                                type="range"
                                min="1"
                                max="10"
                                step="1"
                                value={currentW}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  setMatrixWeights((prev) => ({
                                    ...prev,
                                    [crit.id]: val,
                                  }));
                                }}
                                aria-label={`Weight for ${crit.name}`}
                                className="w-full accent-teal-400 bg-slate-800 h-1.5 rounded cursor-pointer"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <h4 className="text-xs font-semibold text-slate-300 uppercase font-mono">
                        Options Ranking
                      </h4>
                      {rankedOptions.map((opt) => {
                        const isTop = opt.rank === 1;
                        return (
                          <div
                            key={opt.id || opt.name}
                            className={`p-3.5 rounded-xl border space-y-2 transition ${
                              isTop
                                ? "bg-teal-950/20 border-teal-500/40 shadow-sm"
                                : "bg-slate-950 border-slate-800"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                                    isTop
                                      ? "bg-teal-500 text-slate-950"
                                      : "bg-slate-800 text-slate-400"
                                  }`}
                                >
                                  #{opt.rank}
                                </span>
                                <span className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
                                  <span>{opt.name}</span>
                                  {isTop && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9.5px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                      <Trophy className="w-2.5 h-2.5 text-amber-400" />
                                      <span>Top Choice</span>
                                    </span>
                                  )}
                                </span>
                              </div>
                              <span
                                className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                                  isTop
                                    ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                                    : "bg-slate-900 text-slate-300 border border-slate-800"
                                }`}
                              >
                                Score: {opt.totalScore} / 10
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-800/60">
                              <div className="text-emerald-400/90 space-y-0.5">
                                <span className="font-semibold block text-[10px] uppercase font-mono">
                                  Pros:
                                </span>
                                {(opt.pros || []).map((p, i) => (
                                  <div key={i}>+ {p}</div>
                                ))}
                              </div>
                              <div className="text-rose-400/90 space-y-0.5">
                                <span className="font-semibold block text-[10px] uppercase font-mono">
                                  Cons:
                                </span>
                                {(opt.cons || []).map((c, i) => (
                                  <div key={i}>- {c}</div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

            {/* PLAN ARTIFACT */}
            {artifact.type === "plan" && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10.5px] font-mono text-cyan-400 uppercase font-semibold">
                    Timeframe: {artifact.data.timeframe}
                  </div>
                  <h4 className="text-xs font-semibold text-slate-200 mt-1">
                    {artifact.data.goal}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {artifact.data.overview}
                  </p>
                </div>

                <div className="space-y-3">
                  {artifact.data.phases.map((phase) => (
                    <div
                      key={phase.id}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-teal-300">
                          {phase.phaseName}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                          {phase.tasks.length} tasks
                        </span>
                      </div>
                      <div className="space-y-1.5 pt-1">
                        {phase.tasks.map((task) => (
                          <div
                            key={task.id}
                            className="flex items-start gap-2 text-xs text-slate-300"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <span className="font-medium">{task.title}</span>
                              <p className="text-[11px] text-slate-500">
                                {task.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CHART ARTIFACT */}
            {artifact.type === "chart" && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                  <span className="font-semibold text-teal-400 block mb-1">
                    Takeaway:
                  </span>
                  {artifact.data.insight}
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-200 font-mono uppercase">
                      Data
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const csv = chartDataToCsv(artifact.data.data);
                        const filename = `${(artifact.data.title || "chart-data").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
                        downloadCsvData(filename, csv);
                        sound.playSuccess();
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 transition cursor-pointer"
                      title="Download Chart Data as CSV"
                      aria-label="Download CSV Data"
                    >
                      <Download className="w-3.5 h-3.5 text-teal-400" />
                      <span>Download CSV Data</span>
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="text-[10.5px] uppercase font-mono text-slate-500 border-b border-slate-800">
                        <tr>
                          <th className="pb-2">Label</th>
                          <th className="pb-2">Value</th>
                          {artifact.data.data[0]?.secondaryValue !==
                            undefined && <th className="pb-2">Secondary</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {artifact.data.data.map((d, i) => (
                          <tr key={i} className="hover:bg-slate-900/40">
                            <td className="py-2 text-slate-200 font-sans">
                              {d.label}
                            </td>
                            <td className="py-2 text-teal-400 font-semibold">
                              {d.value}
                            </td>
                            {d.secondaryValue !== undefined && (
                              <td className="py-2 text-cyan-400">
                                {d.secondaryValue}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* DEBATE ARTIFACT */}
            {artifact.type === "debate" && (
              <div className="space-y-4">
                <DebateCard debate={artifact.data} />
              </div>
            )}

            {/* PERSONA COUNCIL ARTIFACT */}
            {artifact.type === "council" && (
              <div className="space-y-4">
                <PersonaCouncilCard
                  council={artifact.data}
                  onApplyAction={(action) => {
                    if (onRefinePrompt) {
                      onRefinePrompt(`Execute council action: ${action}`);
                    }
                  }}
                />
              </div>
            )}

            {/* RESILIENCE SIMULATION ARTIFACT */}
            {artifact.type === "simulation" && (
              <div className="space-y-4">
                <ResilienceSimulationCard
                  simulation={artifact.data}
                  onApplyHardening={(rec) => {
                    if (onRefinePrompt) {
                      onRefinePrompt(`Apply architectural hardening: ${rec}`);
                    }
                  }}
                />
              </div>
            )}

            {/* AUDIO BRIEFING ARTIFACT */}
            {artifact.type === "audio_briefing" && (
              <div className="space-y-4">
                <AudioBriefingCard briefing={artifact.data} />
              </div>
            )}

            {/* COMPETITIVE BATTLE-CARD ARTIFACT */}
            {artifact.type === "battlecard" && (
              <div className="space-y-4">
                <CompetitiveBattleCard battleCard={artifact.data} />
              </div>
            )}

            {/* COST-LATENCY PARETO FRONTIER ARTIFACT */}
            {artifact.type === "pareto_frontier" && (
              <div className="space-y-4">
                <ParetoFrontierCard artifact={artifact.data} />
              </div>
            )}

            {/* REGRESSION EVALUATOR SUITE ARTIFACT */}
            {artifact.type === "eval_suite" && (
              <div className="space-y-4">
                <RegressionEvaluatorCard artifact={artifact.data} />
              </div>
            )}

            {/* RED-TEAM SECURITY AUDIT ARTIFACT */}
            {artifact.type === "red_team_audit" && (
              <div className="space-y-4">
                <RedTeamAuditCard artifact={artifact.data} />
              </div>
            )}

            {/* SEMANTIC GUARDRAIL POLICY ARTIFACT */}
            {artifact.type === "guardrail_policy" && (
              <div className="space-y-4">
                <GuardrailPolicyCard artifact={artifact.data} />
              </div>
            )}

            {/* MULTIMODAL VISION INSPECTION ARTIFACT */}
            {artifact.type === "multimodal_inspection" && (
              <div className="space-y-4">
                <MultiModalInspectionCard artifact={artifact.data} />
              </div>
            )}

            {/* DYNAMIC MEMORY & KNOWLEDGE GRAPH ARTIFACT */}
            {artifact.type === "memory_graph" && (
              <div className="space-y-4">
                <MemoryGraphCard artifact={artifact.data} />
              </div>
            )}

            {/* ACOUSTIC SPECTROGRAM INSPECTION ARTIFACT */}
            {artifact.type === "audio_spectrogram" && (
              <div className="space-y-4">
                <AudioSpectrogramCard artifact={artifact.data} />
              </div>
            )}

            {/* PROMPT OPTIMIZER & DSPY EVOLUTION ARTIFACT */}
            {artifact.type === "prompt_optimizer" && (
              <div className="space-y-4">
                <PromptOptimizerCard artifact={artifact.data} />
              </div>
            )}

            {/* VECTOR SPACE & SEMANTIC CLUSTER ARTIFACT */}
            {artifact.type === "vector_space" && (
              <div className="space-y-4">
                <VectorSpaceCard artifact={artifact.data} />
              </div>
            )}

            {/* CAUSAL INFERENCE & COUNTERFACTUAL DAG ARTIFACT */}
            {artifact.type === "causal_dag" && (
              <div className="space-y-4">
                <CausalDagCard artifact={artifact.data} />
              </div>
            )}

            {/* BAYESIAN OPTIMIZATION ARTIFACT */}
            {artifact.type === "bayesian_opt" && (
              <div className="space-y-4">
                <BayesianOptCard artifact={artifact.data} />
              </div>
            )}

            {/* WORKFLOW ORCHESTRATOR ARTIFACT */}
            {artifact.type === "workflow_orchestrator" && (
              <div className="space-y-4">
                <WorkflowOrchestratorCard artifact={artifact.data} />
              </div>
            )}

            {/* FORMAL THEOREM PROVER & INVARIANT VERIFICATION ARTIFACT */}
            {artifact.type === "formal_prover" && (
              <div className="space-y-4">
                <FormalProverCard artifact={artifact.data} />
              </div>
            )}

            {/* EPISTEMIC CONSENSUS & BAYESIAN TRUTH SERUM ARTIFACT */}
            {artifact.type === "epistemic_consensus" && (
              <div className="space-y-4">
                <EpistemicConsensusCard artifact={artifact.data} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Refine / Iteration Footer (Interactive Chrome - Hidden in Print) */}
      {onRefinePrompt && (
        <div className="p-3 bg-slate-950 border-t border-slate-800 print:hidden">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span className="font-semibold text-slate-300">Follow-ups:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {artifact.type === "code" ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    onRefinePrompt(
                      "Add strict TypeScript error handling, type definitions, and edge case assertions.",
                    )
                  }
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-teal-300 transition cursor-pointer"
                >
                  + Add TypeScript types
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onRefinePrompt(
                      "Write unit tests for this code, including edge cases.",
                    )
                  }
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-teal-300 transition cursor-pointer"
                >
                  + Write unit tests
                </button>
              </>
            ) : artifact.type === "matrix" ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    onRefinePrompt(
                      "Add another relevant option to this comparison.",
                    )
                  }
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-teal-300 transition cursor-pointer"
                >
                  + Add an option
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() =>
                    onRefinePrompt(
                      "Find more sources and cite them for each finding.",
                    )
                  }
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-teal-300 transition cursor-pointer"
                >
                  + More sources
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onRefinePrompt(
                      "Highlight counter-arguments and failure modes.",
                    )
                  }
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-teal-300 transition cursor-pointer"
                >
                  + Counter-arguments
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Executive Print Dossier View - Rendered during window.print() */}
      <div className="hidden print:block font-sans text-black bg-white space-y-6">
        {/* Cover Header */}
        <div className="pb-6 border-b-2 border-black space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-gray-300 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-widest uppercase text-black">
                {dossierMetadata.banner}
              </span>
            </div>
            <div className="text-[10px] uppercase text-gray-600 tracking-wider">
              VERIFIED SYNTHESIS &bull; CONFIDENTIAL
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-black leading-tight">
              {dossierMetadata.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs font-mono text-gray-800">
              <div>
                <span className="font-bold uppercase text-black">Mode: </span>
                <span>{dossierMetadata.modeName}</span>
              </div>
              <div>
                <span className="font-bold uppercase text-black">Model: </span>
                <span>{dossierMetadata.model}</span>
              </div>
              <div>
                <span className="font-bold uppercase text-black">Date: </span>
                <span>{dossierMetadata.timestamp}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section: Research */}
        {artifact.type === "research" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-1">
                Executive Summary
              </h2>
              <p className="text-sm text-gray-900 leading-relaxed font-serif">
                {artifact.data.executiveSummary}
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-1">
                Key Findings & Synthesized Evidence
              </h2>
              <div className="space-y-3">
                {resolvedFindings.map((finding, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 border border-gray-300 rounded bg-white print-avoid-break space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-black font-sans">
                          {finding.point}
                        </span>
                        {finding.citations.length > 0 && (
                          <span className="inline-flex items-center gap-1">
                            {finding.citations.map((c, cIdx) => (
                              <span
                                key={cIdx}
                                className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded border border-black bg-gray-100 text-black"
                              >
                                {c.marker}
                              </span>
                            ))}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border border-gray-400 font-bold text-gray-800">
                        {finding.confidence} Confidence
                      </span>
                    </div>
                    <p className="text-xs text-gray-800 leading-relaxed font-sans">
                      {finding.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {artifact.data.contradictionsAndRisks &&
              artifact.data.contradictionsAndRisks.length > 0 && (
                <div className="p-3.5 border-l-4 border-amber-600 bg-amber-50/60 print-avoid-break space-y-1.5">
                  <h3 className="text-xs font-mono font-bold uppercase text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                    <span>Caveats, Risks & Counter-Arguments</span>
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-gray-900">
                    {artifact.data.contradictionsAndRisks.map((risk, i) => (
                      <li key={i}>{risk}</li>
                    ))}
                  </ul>
                </div>
              )}

            {artifact.data.recommendation && (
              <div className="p-3.5 border border-gray-300 rounded bg-gray-50 print-avoid-break space-y-1">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-black">
                  Strategic Recommendation
                </h3>
                <p className="text-xs text-gray-900 leading-relaxed">
                  {artifact.data.recommendation}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Content Section: Decision Matrix */}
        {artifact.type === "matrix" && (
          <div className="space-y-6">
            {artifact.data.verdict && (
              <div className="p-3.5 border-2 border-black rounded bg-gray-50 print-avoid-break">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-700 block mb-1">
                  Evaluation Verdict
                </span>
                <p className="text-sm font-semibold text-black">
                  {artifact.data.verdict}
                </p>
              </div>
            )}

            {/* Criteria Weights Summary */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-900">
                Evaluation Criteria & Weights
              </h3>
              <div className="flex flex-wrap gap-2 text-xs font-mono">
                {artifact.data.criteria.map((c) => (
                  <span
                    key={c.id}
                    className="px-2.5 py-1 border border-gray-400 rounded bg-gray-100 text-gray-900"
                  >
                    <strong>{c.name}</strong>: {matrixWeights[c.id] ?? c.weight}
                    x
                  </span>
                ))}
              </div>
            </div>

            {/* Comparison Table with clean borders & zebra striping */}
            <div className="space-y-2 print-avoid-break">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-900">
                Decision Matrix Comparison
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse border border-gray-400">
                  <thead>
                    <tr className="bg-gray-100 border-b-2 border-gray-400 text-black font-mono">
                      <th className="p-2 border border-gray-300 font-bold">
                        Option
                      </th>
                      {artifact.data.criteria.map((c) => (
                        <th
                          key={c.id}
                          className="p-2 border border-gray-300 font-semibold text-center"
                        >
                          {c.name}
                          <span className="block text-[10px] text-gray-600">
                            ({matrixWeights[c.id] ?? c.weight}x)
                          </span>
                        </th>
                      ))}
                      <th className="p-2 border border-gray-300 font-bold text-center bg-gray-200">
                        Total Score
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {matrixOptionScores.map((opt, rIdx) => (
                      <tr
                        key={opt.id}
                        className={rIdx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="p-2 border border-gray-300 font-semibold text-black">
                          {opt.name}
                        </td>
                        {artifact.data.criteria.map((c) => {
                          const origOpt = artifact.data.options.find(
                            (o) => o.id === opt.id,
                          );
                          const score = origOpt?.scores[c.id] ?? "-";
                          return (
                            <td
                              key={c.id}
                              className="p-2 border border-gray-300 text-center font-mono"
                            >
                              {score} / 10
                            </td>
                          );
                        })}
                        <td className="p-2 border border-gray-300 text-center font-mono font-bold text-black bg-gray-100">
                          {opt.score} / 10
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pros & Cons Breakdowns */}
            <div className="space-y-3 print-avoid-break">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-900">
                Qualitative Tradeoffs
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {artifact.data.options.map((opt) => (
                  <div
                    key={opt.id}
                    className="p-3 border border-gray-300 rounded space-y-1.5"
                  >
                    <h4 className="text-xs font-bold text-black uppercase font-mono">
                      {opt.name}
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[11px] font-mono font-bold text-emerald-800 uppercase block mb-0.5">
                          Pros:
                        </span>
                        <ul className="list-disc pl-4 space-y-0.5 text-gray-800">
                          {opt.pros.map((p, i) => (
                            <li key={i}>{p}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="text-[11px] font-mono font-bold text-rose-800 uppercase block mb-0.5">
                          Cons:
                        </span>
                        <ul className="list-disc pl-4 space-y-0.5 text-gray-800">
                          {opt.cons.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Content Section: Goal Plan */}
        {artifact.type === "plan" && (
          <div className="space-y-6">
            <div className="p-4 border border-gray-300 rounded bg-gray-50 print-avoid-break space-y-2">
              <div className="text-xs font-mono font-bold uppercase text-gray-700">
                Target Timeframe: {artifact.data.timeframe}
              </div>
              <h2 className="text-base font-bold text-black">
                {artifact.data.goal}
              </h2>
              <p className="text-xs text-gray-800 leading-relaxed">
                {artifact.data.overview}
              </p>
            </div>

            {artifact.data.keySuccessMetrics &&
              artifact.data.keySuccessMetrics.length > 0 && (
                <div className="p-3.5 border border-gray-300 rounded print-avoid-break space-y-1.5">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-black">
                    Key Success Metrics
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-gray-800 font-mono">
                    {artifact.data.keySuccessMetrics.map((metric, i) => (
                      <li key={i}>{metric}</li>
                    ))}
                  </ul>
                </div>
              )}

            <div className="space-y-4">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-1">
                Execution Steps & Milestones
              </h2>
              <div className="space-y-4">
                {artifact.data.phases.map((phase) => (
                  <div
                    key={phase.id}
                    className="p-3.5 border border-gray-300 rounded print-avoid-break space-y-2"
                  >
                    <div className="flex items-center justify-between border-b border-gray-200 pb-1.5">
                      <h3 className="text-xs font-bold text-black font-mono">
                        Phase {phase.phaseNumber}: {phase.phaseName}
                      </h3>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border border-gray-400 text-gray-700">
                        {phase.status || "active"} &bull; {phase.tasks.length}{" "}
                        tasks
                      </span>
                    </div>
                    {phase.summary && (
                      <p className="text-xs text-gray-700 italic">
                        {phase.summary}
                      </p>
                    )}
                    <div className="space-y-2 pt-1">
                      {phase.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-start gap-2 text-xs text-gray-900 pl-1"
                        >
                          <span className="font-bold text-emerald-700 mt-0.5 select-none font-mono">
                            ✓
                          </span>
                          <div className="space-y-0.5">
                            <span className="font-semibold text-black">
                              {task.title}
                            </span>
                            <p className="text-[11px] text-gray-700">
                              {task.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Content Section: Chart Data Matrix */}
        {artifact.type === "chart" && (
          <div className="space-y-6">
            <div className="p-3.5 border border-gray-300 rounded bg-gray-50 print-avoid-break space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase text-gray-700 block">
                Primary Insight & Key Takeaway
              </span>
              <p className="text-xs text-black font-medium leading-relaxed">
                {artifact.data.insight}
              </p>
            </div>

            <div className="space-y-2 print-avoid-break">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-900">
                Quantitative Data Matrix
              </h2>
              <table className="w-full text-left text-xs border-collapse border border-gray-400">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-gray-400 text-black font-mono">
                    <th className="p-2 border border-gray-300 font-bold">
                      Label
                    </th>
                    <th className="p-2 border border-gray-300 font-bold text-right">
                      Value
                    </th>
                    {artifact.data.data[0]?.secondaryValue !== undefined && (
                      <th className="p-2 border border-gray-300 font-bold text-right">
                        Secondary
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {artifact.data.data.map((d, i) => (
                    <tr
                      key={i}
                      className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="p-2 border border-gray-300 text-black font-sans font-medium">
                        {d.label}
                      </td>
                      <td className="p-2 border border-gray-300 text-right font-bold text-black">
                        {d.value}
                      </td>
                      {d.secondaryValue !== undefined && (
                        <td className="p-2 border border-gray-300 text-right text-gray-700">
                          {d.secondaryValue}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {artifact.data.takeaways && artifact.data.takeaways.length > 0 && (
              <div className="p-3.5 border border-gray-300 rounded space-y-1.5 print-avoid-break">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-black">
                  Key Observations
                </h3>
                <ul className="list-disc pl-5 space-y-1 text-xs text-gray-800">
                  {artifact.data.takeaways.map((t, idx) => (
                    <li key={idx}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Content Section: Debate */}
        {artifact.type === "debate" && (
          <div className="space-y-6">
            <div className="p-3.5 border-2 border-black rounded bg-gray-50 print-avoid-break space-y-2">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-gray-700 block">
                  Synthesis Verdict
                </span>
                <p className="text-xs font-semibold text-black leading-relaxed mt-0.5">
                  {artifact.data.synthesisVerdict}
                </p>
              </div>
              {artifact.data.consensusSummary && (
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-[10px] font-mono font-bold uppercase text-gray-600 block">
                    Consensus Summary
                  </span>
                  <p className="text-xs text-gray-800 leading-relaxed mt-0.5">
                    {artifact.data.consensusSummary}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-1">
                Dialectical Perspectives
              </h2>
              <div className="space-y-3">
                {artifact.data.perspectives.map((persp, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 border border-gray-300 rounded print-avoid-break space-y-2"
                  >
                    <div className="flex items-center justify-between border-b border-gray-200 pb-1">
                      <span className="text-xs font-bold text-black font-mono">
                        {persp.agentName}
                      </span>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border border-gray-400 font-bold text-black">
                        {persp.stance}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase font-bold text-gray-600 block mb-1">
                        Core Arguments
                      </span>
                      <ul className="list-disc pl-5 space-y-1 text-xs text-gray-800">
                        {persp.arguments.map((arg, i) => (
                          <li key={i}>{arg}</li>
                        ))}
                      </ul>
                    </div>
                    {persp.caveats && persp.caveats.length > 0 && (
                      <div className="pt-1.5 border-t border-gray-200">
                        <span className="text-[10px] font-mono uppercase font-bold text-gray-600 block mb-1">
                          Caveats &amp; Blind Spots
                        </span>
                        <ul className="list-disc pl-5 space-y-1 text-xs text-gray-700">
                          {persp.caveats.map((cav, i) => (
                            <li key={i}>{cav}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Content Section: Persona Council */}
        {artifact.type === "council" && (
          <div className="space-y-6">
            <div className="p-3.5 border-2 border-black rounded bg-gray-50 print-avoid-break space-y-2">
              <div className="flex items-center justify-between border-b border-gray-300 pb-1">
                <span className="text-[10px] font-mono font-bold uppercase text-gray-700">
                  Council Verdict:{" "}
                  {artifact.data.councilVerdict
                    .replace(/_/g, " ")
                    .toUpperCase()}
                </span>
                <span className="text-[10px] font-mono font-bold text-black">
                  Alignment Index: {artifact.data.alignmentIndex}% (Mean:{" "}
                  {artifact.data.meanScore}/100)
                </span>
              </div>
              <p className="text-xs text-gray-900 leading-relaxed font-semibold">
                {artifact.data.verdictSummary}
              </p>
              {artifact.data.strategicCompromise && (
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-[10px] font-mono font-bold uppercase text-gray-600 block">
                    Strategic Compromise Blueprint
                  </span>
                  <p className="text-xs text-gray-800 leading-relaxed mt-0.5">
                    {artifact.data.strategicCompromise}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-1">
                Specialist Scorecards &amp; Deliberations
              </h2>
              <div className="space-y-3">
                {artifact.data.reviews.map((rev, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 border border-gray-300 rounded print-avoid-break space-y-2"
                  >
                    <div className="flex items-center justify-between border-b border-gray-200 pb-1">
                      <span className="text-xs font-bold text-black font-mono">
                        {rev.personaName} ({rev.roleTitle})
                      </span>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border border-gray-400 font-bold text-black">
                        Grade {rev.grade} ({rev.score}/100) —{" "}
                        {rev.verdict.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase font-bold text-gray-600 block mb-0.5">
                        Endorsement
                      </span>
                      <p className="text-xs text-gray-800 italic">
                        &ldquo;{rev.coreEndorsement}&rdquo;
                      </p>
                    </div>
                    {rev.criticalObjections &&
                      rev.criticalObjections.length > 0 && (
                        <div className="pt-1.5 border-t border-gray-200">
                          <span className="text-[10px] font-mono uppercase font-bold text-gray-700 block mb-1">
                            Critical Objections
                          </span>
                          <ul className="list-disc pl-5 space-y-1 text-xs text-gray-800">
                            {rev.criticalObjections.map((obj, oIdx) => (
                              <li key={oIdx}>{obj}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Content Section: Resilience Simulation */}
        {artifact.type === "simulation" && (
          <div className="space-y-6">
            <div className="p-3.5 border-2 border-black rounded bg-gray-50 print-avoid-break space-y-2">
              <div className="flex items-center justify-between border-b border-gray-300 pb-1">
                <span className="text-[10px] font-mono font-bold uppercase text-gray-700">
                  Resilience Score: {artifact.data.summary.resilienceScore}% (
                  {artifact.data.summary.cascadingFailureRisk.toUpperCase()}{" "}
                  RISK)
                </span>
                <span className="text-[10px] font-mono font-bold text-black">
                  Peak Latency: {artifact.data.summary.peakP99LatencyMs}ms | Max
                  Error: {artifact.data.summary.maxErrorRatePct.toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-gray-900 leading-relaxed font-semibold">
                Bottleneck: {artifact.data.summary.bottleneckDiagnosis}
              </p>
            </div>
            <div className="space-y-2">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-1">
                Hardening Recommendations
              </h2>
              <ul className="list-disc pl-5 space-y-1 text-xs text-gray-800">
                {artifact.data.summary.hardeningRecommendations.map(
                  (rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ),
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Content Section: Audio Briefing */}
        {artifact.type === "audio_briefing" && (
          <div className="space-y-6">
            <div className="p-3.5 border-2 border-black rounded bg-gray-50 print-avoid-break space-y-2">
              <div className="flex items-center justify-between border-b border-gray-300 pb-1">
                <span className="text-[10px] font-mono font-bold uppercase text-gray-700">
                  Total Duration:{" "}
                  {formatDurationTimestamp(artifact.data.totalDurationMs)}
                </span>
                <span className="text-[10px] font-mono font-bold text-black">
                  {artifact.data.chapters.length} Chapters |{" "}
                  {artifact.data.totalWordCount} words
                </span>
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-1">
                Chapter Script &amp; Takeaways
              </h2>
              {artifact.data.chapters.map((ch) => (
                <div
                  key={ch.id}
                  className="p-3 border border-gray-300 rounded space-y-1.5 print-avoid-break"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-black">
                    <span>
                      Chapter {ch.chapterIndex}: {ch.title}
                    </span>
                    <span className="text-[10px] font-mono text-gray-600">
                      {ch.speaker} (
                      {formatDurationTimestamp(ch.estimatedDurationMs)})
                    </span>
                  </div>
                  <p className="text-xs text-gray-800 leading-relaxed italic">
                    &ldquo;{ch.text}&rdquo;
                  </p>
                  {ch.keyTakeaways && ch.keyTakeaways.length > 0 && (
                    <div className="text-[11px] text-gray-700">
                      <strong>Takeaways:</strong> {ch.keyTakeaways.join("; ")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content Section: Battle-Card */}
        {artifact.type === "battlecard" && (
          <div className="space-y-6">
            <div className="p-3.5 border-2 border-black rounded bg-gray-50 print-avoid-break space-y-2">
              <div className="flex items-center justify-between border-b border-gray-300 pb-1">
                <span className="text-[10px] font-mono font-bold uppercase text-gray-700">
                  Target Sector: {artifact.data.targetSector}
                </span>
                <span className="text-[10px] font-mono font-bold text-black">
                  Moat Defensibility Index: {artifact.data.novaMoatScore}%
                </span>
              </div>
              {artifact.data.strategicSummary && (
                <p className="text-xs text-gray-800 leading-relaxed italic">
                  &ldquo;{artifact.data.strategicSummary}&rdquo;
                </p>
              )}
            </div>

            {/* Win Themes */}
            {artifact.data.keyWinThemes &&
              artifact.data.keyWinThemes.length > 0 && (
                <div className="space-y-2 print-avoid-break">
                  <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-1">
                    Decisive Win Themes
                  </h2>
                  <ul className="space-y-1 text-xs text-gray-800">
                    {artifact.data.keyWinThemes.map((w, i) => (
                      <li key={i}>
                        <strong>{i + 1}.</strong> {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {/* Dimension Matrix Table */}
            <div className="space-y-2 print-avoid-break">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-1">
                Competitive Dimension Scorecard
              </h2>
              <table className="w-full text-left text-xs border border-gray-400 border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-400 text-black font-bold">
                    <th className="p-1.5 border-r border-gray-300">
                      Dimension
                    </th>
                    <th className="p-1.5 border-r border-gray-300 text-center">
                      Category
                    </th>
                    <th className="p-1.5 border-r border-gray-300 text-center">
                      Nova
                    </th>
                    <th className="p-1.5">Advantage Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {artifact.data.dimensions.map((d) => (
                    <tr key={d.dimensionKey} className="text-gray-900">
                      <td className="p-1.5 font-semibold border-r border-gray-300">
                        {d.label}
                      </td>
                      <td className="p-1.5 text-center uppercase font-mono text-[10px] border-r border-gray-300">
                        {d.category}
                      </td>
                      <td className="p-1.5 text-center font-bold text-black border-r border-gray-300">
                        {d.novaRating}/5
                      </td>
                      <td className="p-1.5 text-[11px] text-gray-700">
                        {d.novaNote}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Content Section: Pareto Frontier */}
        {artifact.type === "pareto_frontier" && (
          <div className="space-y-6">
            <div className="p-3.5 border-2 border-black rounded bg-gray-50 print-avoid-break space-y-2">
              <div className="flex items-center justify-between border-b border-gray-300 pb-1">
                <span className="text-[10px] font-mono font-bold uppercase text-gray-700">
                  Pareto Optimal Models:{" "}
                  {artifact.data.frontierProviderIds.length} /{" "}
                  {artifact.data.providers.length}
                </span>
                <span className="text-[10px] font-mono font-bold text-black">
                  Workload: {artifact.data.workloadProfile}
                </span>
              </div>
              {artifact.data.summary && (
                <p className="text-xs text-gray-800 leading-relaxed italic">
                  &ldquo;{artifact.data.summary}&rdquo;
                </p>
              )}
            </div>

            {/* Strategic Routing Recommendations */}
            {artifact.data.recommendations &&
              artifact.data.recommendations.length > 0 && (
                <div className="space-y-2 print-avoid-break">
                  <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-1">
                    Strategic Enterprise Routing Matrix
                  </h2>
                  <div className="grid grid-cols-2 gap-2">
                    {artifact.data.recommendations.map((rec) => (
                      <div
                        key={rec.strategy}
                        className="p-2 border border-gray-300 rounded bg-white text-xs"
                      >
                        <div className="font-bold text-black flex items-center justify-between">
                          <span>{rec.title}</span>
                          <span className="text-[10px] font-mono text-gray-600">
                            {rec.estimatedMonthlySavingsPct}% savings
                          </span>
                        </div>
                        <div className="text-[11px] font-semibold text-gray-800 mt-0.5">
                          Primary: {rec.primaryProviderId} | Fallback:{" "}
                          {rec.fallbackProviderId}
                        </div>
                        <p className="text-[10px] text-gray-600 mt-1 leading-snug">
                          {rec.rationale}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Provider Benchmark Matrix */}
            <div className="space-y-2 print-avoid-break">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-1">
                Provider Cost &amp; Latency Frontier Benchmarks
              </h2>
              <table className="w-full text-left text-xs border border-gray-400 border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-400 text-black font-bold">
                    <th className="p-1.5 border-r border-gray-300">
                      Model / Provider
                    </th>
                    <th className="p-1.5 border-r border-gray-300 text-center">
                      Status
                    </th>
                    <th className="p-1.5 border-r border-gray-300 text-center">
                      Cost/1k In
                    </th>
                    <th className="p-1.5 border-r border-gray-300 text-center">
                      Cost/1k Out
                    </th>
                    <th className="p-1.5 border-r border-gray-300 text-center">
                      Latency
                    </th>
                    <th className="p-1.5 border-r border-gray-300 text-center">
                      Quality
                    </th>
                    <th className="p-1.5 text-center">Privacy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {artifact.data.providers.map((p) => {
                    return (
                      <tr key={p.providerId} className="text-gray-900">
                        <td className="p-1.5 font-semibold border-r border-gray-300">
                          {p.displayName}
                          <span className="text-[10px] text-gray-600 block">
                            {p.tier}
                          </span>
                        </td>
                        <td className="p-1.5 text-center uppercase font-mono text-[10px] border-r border-gray-300 font-bold">
                          {p.isParetoOptimal ? "Frontier" : "Dominated"}
                        </td>
                        <td className="p-1.5 text-center font-mono border-r border-gray-300">
                          ${p.costPer1kInput.toFixed(4)}
                        </td>
                        <td className="p-1.5 text-center font-mono border-r border-gray-300">
                          ${p.costPer1kOutput.toFixed(4)}
                        </td>
                        <td className="p-1.5 text-center font-mono border-r border-gray-300">
                          {p.totalLatencyMs}ms
                        </td>
                        <td className="p-1.5 text-center font-mono border-r border-gray-300">
                          {p.qualityScore}/100
                        </td>
                        <td className="p-1.5 text-center font-mono">
                          {p.privacyComplianceIndex}/100
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Content Section: Regression Evaluator Suite */}
        {artifact.type === "eval_suite" && (
          <div className="space-y-6">
            <div className="p-3.5 border-2 border-black rounded bg-gray-50 print-avoid-break space-y-2">
              <div className="flex items-center justify-between border-b border-gray-300 pb-1">
                <span className="text-[10px] font-mono font-bold uppercase text-gray-700">
                  Target Pipeline: {artifact.data.targetPipeline}
                </span>
                <span className="text-[10px] font-mono font-bold text-black">
                  Health: {artifact.data.summary.healthGrade} Grade (
                  {artifact.data.summary.overallPassRatePct}% Pass Rate)
                </span>
              </div>
              {artifact.data.executiveSummary && (
                <p className="text-xs text-gray-800 leading-relaxed italic">
                  &ldquo;{artifact.data.executiveSummary}&rdquo;
                </p>
              )}
            </div>

            {/* Evaluation Metrics Summary */}
            <div className="grid grid-cols-4 gap-2 text-xs print-avoid-break">
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Passed
                </div>
                <div className="font-bold text-black">
                  {artifact.data.summary.passedCount} /{" "}
                  {artifact.data.summary.totalScenarios}
                </div>
              </div>
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Regressions
                </div>
                <div className="font-bold text-black">
                  {artifact.data.summary.regressedCount}
                </div>
              </div>
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Avg Latency
                </div>
                <div className="font-bold text-black">
                  {artifact.data.summary.averageLatencyMs}ms
                </div>
              </div>
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Critical Risks
                </div>
                <div className="font-bold text-black">
                  {artifact.data.summary.criticalRisksIdentified}
                </div>
              </div>
            </div>

            {/* Scenario Evaluation Table */}
            <div className="space-y-2 print-avoid-break">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-1">
                Scenario Evaluation Scorecard
              </h2>
              <table className="w-full text-left text-xs border border-gray-400 border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-400 text-black font-bold">
                    <th className="p-1.5 border-r border-gray-300">ID</th>
                    <th className="p-1.5 border-r border-gray-300">
                      Scenario Title
                    </th>
                    <th className="p-1.5 border-r border-gray-300 text-center">
                      Category
                    </th>
                    <th className="p-1.5 border-r border-gray-300 text-center">
                      Status
                    </th>
                    <th className="p-1.5 border-r border-gray-300 text-center">
                      Score
                    </th>
                    <th className="p-1.5 text-center">Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {artifact.data.scenarios.map((s) => (
                    <tr key={s.scenarioId} className="text-gray-900">
                      <td className="p-1.5 font-mono text-[10px] border-r border-gray-300">
                        {s.scenarioId}
                      </td>
                      <td className="p-1.5 font-semibold border-r border-gray-300">
                        {s.title}
                      </td>
                      <td className="p-1.5 text-center uppercase font-mono text-[10px] border-r border-gray-300">
                        {s.category.replace(/_/g, " ")}
                      </td>
                      <td className="p-1.5 text-center font-bold text-black uppercase font-mono text-[10px] border-r border-gray-300">
                        {s.status}
                      </td>
                      <td className="p-1.5 text-center font-mono border-r border-gray-300">
                        {s.score}%
                      </td>
                      <td className="p-1.5 text-center font-mono">
                        {s.latencyMs}ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Content Section: Red-Team Security Audit */}
        {artifact.type === "red_team_audit" && (
          <div className="space-y-6">
            <div className="p-3.5 border-2 border-black rounded bg-gray-50 print-avoid-break space-y-2">
              <div className="flex items-center justify-between border-b border-gray-300 pb-1">
                <span className="text-[10px] font-mono font-bold uppercase text-gray-700">
                  Target: {artifact.data.targetSystem}
                </span>
                <span className="text-[10px] font-mono font-bold text-black">
                  Posture: {artifact.data.summary.defensePosture} (
                  {artifact.data.summary.immunityScore}% Immunity)
                </span>
              </div>
              {artifact.data.executiveSummary && (
                <p className="text-xs text-gray-800 leading-relaxed italic">
                  &ldquo;{artifact.data.executiveSummary}&rdquo;
                </p>
              )}
            </div>

            {/* Red Team Metrics Summary */}
            <div className="grid grid-cols-4 gap-2 text-xs print-avoid-break">
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Total Chains
                </div>
                <div className="font-bold text-black">
                  {artifact.data.summary.totalAttackChains}
                </div>
              </div>
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Exploited
                </div>
                <div className="font-bold text-black">
                  {artifact.data.summary.exploitedCount}
                </div>
              </div>
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Critical Risks
                </div>
                <div className="font-bold text-black">
                  {artifact.data.summary.criticalVulnerabilities}
                </div>
              </div>
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Immunity Score
                </div>
                <div className="font-bold text-black">
                  {artifact.data.summary.immunityScore}%
                </div>
              </div>
            </div>

            {/* Attack Chains Table */}
            <div className="space-y-2 print-avoid-break">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-1">
                Adversarial Attack Chains Scorecard
              </h2>
              <table className="w-full text-left text-xs border border-gray-400 border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-400 text-black font-bold">
                    <th className="p-1.5 border-r border-gray-300">Chain ID</th>
                    <th className="p-1.5 border-r border-gray-300">Name</th>
                    <th className="p-1.5 border-r border-gray-300 text-center">
                      OWASP Category
                    </th>
                    <th className="p-1.5 border-r border-gray-300 text-center">
                      Severity
                    </th>
                    <th className="p-1.5 border-r border-gray-300 text-center">
                      Turns
                    </th>
                    <th className="p-1.5 text-center">Breached</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {artifact.data.attackChains.map((c) => (
                    <tr key={c.chainId} className="text-gray-900">
                      <td className="p-1.5 font-mono text-[10px] border-r border-gray-300">
                        {c.chainId}
                      </td>
                      <td className="p-1.5 font-semibold border-r border-gray-300">
                        {c.vectorName}
                      </td>
                      <td className="p-1.5 text-center font-mono text-[10px] border-r border-gray-300">
                        {c.owaspCategory}
                      </td>
                      <td className="p-1.5 text-center font-bold uppercase font-mono text-[10px] border-r border-gray-300">
                        {c.severity}
                      </td>
                      <td className="p-1.5 text-center font-mono border-r border-gray-300">
                        {c.turns.length}
                      </td>
                      <td className="p-1.5 text-center font-mono font-bold">
                        {c.status === "exploited" ? "YES" : "NO"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Remediation Guardrails */}
            {artifact.data.attackChains.some((c) => c.recommendedGuardrail) && (
              <div className="space-y-1.5 print-avoid-break">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-1">
                  Recommended Remediation Guardrails
                </h3>
                <ul className="list-disc pl-5 text-xs text-gray-800 space-y-1">
                  {artifact.data.attackChains
                    .map((c) => c.recommendedGuardrail)
                    .filter(Boolean)
                    .map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Content Section: Semantic Guardrail Policy */}
        {artifact.type === "guardrail_policy" && (
          <div className="space-y-6">
            <div className="p-3.5 border-2 border-black rounded bg-gray-50 print-avoid-break space-y-2">
              <div className="flex items-center justify-between border-b border-gray-300 pb-1">
                <span className="text-[10px] font-mono font-bold uppercase text-gray-700">
                  Channel: {artifact.data.targetChannel} (
                  {artifact.data.policyVersion})
                </span>
                <span className="text-[10px] font-mono font-bold text-black">
                  Grade: {artifact.data.summary.riskGrade} (
                  {artifact.data.summary.cleanTokensPct}% Clean Tokens)
                </span>
              </div>
              {artifact.data.executiveSummary && (
                <p className="text-xs text-gray-800 leading-relaxed italic">
                  &ldquo;{artifact.data.executiveSummary}&rdquo;
                </p>
              )}
            </div>

            {/* Metrics Summary */}
            <div className="grid grid-cols-4 gap-2 text-xs print-avoid-break">
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Clean Tokens
                </div>
                <div className="font-bold text-black">
                  {artifact.data.summary.cleanTokensPct}%
                </div>
              </div>
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Violations
                </div>
                <div className="font-bold text-black">
                  {artifact.data.summary.totalViolations}
                </div>
              </div>
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Redacted
                </div>
                <div className="font-bold text-black">
                  {artifact.data.summary.redactedCount}
                </div>
              </div>
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Blocked
                </div>
                <div className="font-bold text-black">
                  {artifact.data.summary.blockedCount}
                </div>
              </div>
            </div>

            {/* Applied Rules Scorecard */}
            <div className="space-y-2 print-avoid-break">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-1">
                Enforced Guardrail Policy Rules
              </h2>
              <table className="w-full text-left text-xs border border-gray-400 border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-400 text-black font-bold">
                    <th className="p-1.5 border-r border-gray-300">Rule ID</th>
                    <th className="p-1.5 border-r border-gray-300">Name</th>
                    <th className="p-1.5 border-r border-gray-300 text-center">
                      Violation Type
                    </th>
                    <th className="p-1.5 border-r border-gray-300 text-center">
                      Severity
                    </th>
                    <th className="p-1.5 border-r border-gray-300 text-center">
                      Action
                    </th>
                    <th className="p-1.5 text-center">Triggers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {artifact.data.appliedRules.map((r) => (
                    <tr key={r.ruleId} className="text-gray-900">
                      <td className="p-1.5 font-mono text-[10px] border-r border-gray-300">
                        {r.ruleId}
                      </td>
                      <td className="p-1.5 font-semibold border-r border-gray-300">
                        {r.name}
                      </td>
                      <td className="p-1.5 text-center font-mono text-[10px] border-r border-gray-300">
                        {r.violationType}
                      </td>
                      <td className="p-1.5 text-center font-bold uppercase font-mono text-[10px] border-r border-gray-300">
                        {r.severity}
                      </td>
                      <td className="p-1.5 text-center uppercase font-mono text-[10px] border-r border-gray-300">
                        {r.action}
                      </td>
                      <td className="p-1.5 text-center font-mono font-bold">
                        {r.triggerCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Sanitized Stream Preview */}
            <div className="space-y-2 print-avoid-break">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-1">
                Sanitized Payload Preview
              </h3>
              <pre className="p-3 text-[11px] font-mono text-black bg-gray-50 border border-gray-300 rounded overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {artifact.data.sanitizedPreview}
              </pre>
            </div>
          </div>
        )}

        {/* Content Section: Multimodal Vision Inspection */}
        {artifact.type === "multimodal_inspection" && (
          <div className="space-y-6">
            <div className="p-3.5 border-2 border-black rounded bg-gray-50 print-avoid-break space-y-2">
              <div className="flex items-center justify-between border-b border-gray-300 pb-1">
                <span className="text-[10px] font-mono font-bold uppercase text-gray-700">
                  Target: {artifact.data.topic}
                </span>
                <span className="text-[10px] font-mono font-bold text-black">
                  Grounding Index: {artifact.data.summary.visualGroundingIndex}%
                </span>
              </div>
              <p className="text-xs text-gray-800 leading-relaxed">
                {artifact.data.executiveSummary}
              </p>
            </div>

            {/* Metrics Summary */}
            <div className="grid grid-cols-4 gap-2 text-xs print-avoid-break">
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Total Frames
                </div>
                <div className="font-bold text-black">
                  {artifact.data.summary.totalFrames}
                </div>
              </div>
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Total Regions
                </div>
                <div className="font-bold text-black">
                  {artifact.data.summary.totalRegions}
                </div>
              </div>
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Avg Conf
                </div>
                <div className="font-bold text-black">
                  {artifact.data.summary.averageConfidencePct}%
                </div>
              </div>
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Audit Status
                </div>
                <div className="font-bold text-black uppercase">
                  {artifact.data.summary.auditStatus}
                </div>
              </div>
            </div>

            {/* Frame Scorecard */}
            <div className="space-y-3">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-black border-b border-black pb-1">
                Frame Grounding &amp; Spatial Bounding Boxes
              </h2>
              <div className="space-y-2">
                {artifact.data.frames.map((frame, idx) => (
                  <div
                    key={idx}
                    className="border border-gray-300 p-2.5 rounded bg-white print-avoid-break"
                  >
                    <div className="flex justify-between items-center text-[10px] font-mono font-bold text-gray-700">
                      <span>
                        Frame {idx + 1} ({frame.width}&times;{frame.height})
                        &mdash; {frame.label}
                      </span>
                      <span>{frame.regions.length} bounding region(s)</span>
                    </div>
                    {frame.regions.length > 0 && (
                      <div className="mt-2 text-[10px] font-mono text-gray-600 space-y-0.5">
                        {frame.regions.map((box, bIdx) => (
                          <div key={bIdx}>
                            &bull; [{box.label}] conf: {box.confidencePct}%
                            &mdash; [x:{box.xmin}-{box.xmax}, y:{box.ymin}-
                            {box.ymax}]
                          </div>
                        ))}
                      </div>
                    )}
                    {frame.citations.length > 0 && (
                      <div className="mt-2 pt-1.5 border-t border-gray-200 text-[10.5px] space-y-1">
                        {frame.citations.map((c, cIdx) => (
                          <div key={cIdx} className="text-gray-700">
                            &ldquo;{c.claim}&rdquo; &mdash;{" "}
                            <span className="font-mono text-[9.5px] text-teal-700">
                              Box: {c.boxId} | Source: {c.verifiableSource}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Content Section: Memory & Knowledge Graph */}
        {artifact.type === "memory_graph" && (
          <div className="space-y-6">
            <div className="p-3.5 border-2 border-black rounded bg-gray-50 print-avoid-break space-y-2">
              <div className="flex items-center justify-between border-b border-gray-300 pb-1">
                <span className="text-[10px] font-mono font-bold uppercase text-gray-700">
                  Target: {artifact.data.topic}
                </span>
                <span className="text-[10px] font-mono font-bold text-black">
                  Density: {(artifact.data.summary.density * 100).toFixed(1)}% |
                  Avg Degree: {artifact.data.summary.averageDegree}
                </span>
              </div>
              <p className="text-xs text-gray-800 leading-relaxed">
                {artifact.data.executiveSummary}
              </p>
            </div>

            {/* Metrics Scorecard */}
            <div className="grid grid-cols-4 gap-2 text-xs print-avoid-break">
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Total Entities
                </div>
                <div className="text-base font-bold font-mono text-black">
                  {artifact.data.summary.totalNodes}
                </div>
              </div>
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Total Relations
                </div>
                <div className="text-base font-bold font-mono text-black">
                  {artifact.data.summary.totalEdges}
                </div>
              </div>
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Most Central Node
                </div>
                <div className="text-xs font-bold text-black truncate mt-1">
                  {artifact.data.summary.mostCentralNode}
                </div>
              </div>
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Dominant Category
                </div>
                <div className="text-xs font-bold text-black capitalize mt-1">
                  {artifact.data.summary.dominantEntityType}
                </div>
              </div>
            </div>

            {/* Entities Hierarchy Table */}
            <div className="space-y-2 print-avoid-break">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-1">
                Semantic Entities &amp; Centrality Hierarchy (
                {artifact.data.nodes.length})
              </h3>
              <table className="w-full text-left text-xs border border-gray-300">
                <thead>
                  <tr className="bg-gray-100 font-mono text-[10px] border-b border-gray-300">
                    <th className="p-1.5">Entity</th>
                    <th className="p-1.5">Type</th>
                    <th className="p-1.5 text-right">Degree</th>
                    <th className="p-1.5 text-right">Centrality</th>
                    <th className="p-1.5">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {artifact.data.nodes.map((node) => (
                    <tr key={node.id}>
                      <td className="p-1.5 font-bold text-gray-900">
                        {node.label}
                      </td>
                      <td className="p-1.5 font-mono text-[10px] uppercase text-gray-600">
                        {node.type}
                      </td>
                      <td className="p-1.5 text-right font-mono">
                        {node.degree}
                      </td>
                      <td className="p-1.5 text-right font-mono font-bold">
                        {(node.centralityScore * 100).toFixed(1)}%
                      </td>
                      <td className="p-1.5 text-gray-700">
                        {node.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Directed Semantic Relations */}
            <div className="space-y-2 print-avoid-break">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-1">
                Directed Semantic Relations ({artifact.data.edges.length})
              </h3>
              <table className="w-full text-left text-xs border border-gray-300">
                <thead>
                  <tr className="bg-gray-100 font-mono text-[10px] border-b border-gray-300">
                    <th className="p-1.5">Source Entity</th>
                    <th className="p-1.5 text-center">Relation</th>
                    <th className="p-1.5">Target Entity</th>
                    <th className="p-1.5 text-right">Weight</th>
                    <th className="p-1.5">Binding Context</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {artifact.data.edges.map((edge) => {
                    const src = artifact.data.nodes.find(
                      (n) => n.id === edge.source,
                    );
                    const tgt = artifact.data.nodes.find(
                      (n) => n.id === edge.target,
                    );
                    return (
                      <tr key={edge.id}>
                        <td className="p-1.5 font-bold text-gray-900">
                          {src?.label || edge.source}
                        </td>
                        <td className="p-1.5 text-center font-mono text-[10px] text-gray-700">
                          {edge.relation}
                        </td>
                        <td className="p-1.5 font-bold text-gray-900">
                          {tgt?.label || edge.target}
                        </td>
                        <td className="p-1.5 text-right font-mono">
                          {(edge.weight * 100).toFixed(0)}%
                        </td>
                        <td className="p-1.5 text-gray-700">{edge.label}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Content Section: Audio Spectrogram */}
        {artifact.type === "audio_spectrogram" && (
          <div className="space-y-6">
            <div className="p-3.5 border-2 border-black rounded bg-gray-50 print-avoid-break space-y-2">
              <div className="flex items-center justify-between border-b border-gray-300 pb-1">
                <span className="text-[10px] font-mono font-bold uppercase text-gray-700">
                  Target: {artifact.data.topic}
                </span>
                <span className="text-[10px] font-mono font-bold text-black">
                  SNR: {artifact.data.summary.snrDb} dB | Avg Conf:{" "}
                  {artifact.data.summary.averageAcousticConfidencePct}%
                </span>
              </div>
              <p className="text-xs text-gray-800 leading-relaxed">
                {artifact.data.executiveSummary}
              </p>
            </div>

            {/* Metrics Scorecard */}
            <div className="grid grid-cols-4 gap-2 text-xs print-avoid-break">
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Duration
                </div>
                <div className="text-base font-bold font-mono text-black">
                  {artifact.data.summary.durationSeconds}s
                </div>
              </div>
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Dominant F0
                </div>
                <div className="text-base font-bold font-mono text-black">
                  {artifact.data.summary.dominantFrequencyHz} Hz
                </div>
              </div>
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Speech/Silence
                </div>
                <div className="text-xs font-bold text-black truncate mt-1">
                  {artifact.data.summary.speechToSilenceRatio}x
                </div>
              </div>
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Audio Format
                </div>
                <div className="text-xs font-bold text-black mt-1">
                  {artifact.data.summary.sampleRateHz} Hz (
                  {artifact.data.summary.channelCount === 2 ? "Stereo" : "Mono"}
                  )
                </div>
              </div>
            </div>

            {/* Aligned Segments Table */}
            <div className="space-y-2 print-avoid-break">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-1">
                Aligned Phonetic Segments ({artifact.data.segments.length})
              </h3>
              <table className="w-full text-left text-xs border border-gray-300">
                <thead>
                  <tr className="bg-gray-100 font-mono text-[10px] border-b border-gray-300">
                    <th className="p-1.5">Segment</th>
                    <th className="p-1.5">Speaker</th>
                    <th className="p-1.5">Time Range</th>
                    <th className="p-1.5 text-right">Conf</th>
                    <th className="p-1.5">Transcript</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {artifact.data.segments.map((seg) => (
                    <tr key={seg.id}>
                      <td className="p-1.5 font-mono text-[10px]">{seg.id}</td>
                      <td className="p-1.5 font-bold text-gray-900">
                        {seg.speakerTag}
                      </td>
                      <td className="p-1.5 font-mono text-[10px]">
                        {(seg.startMs / 1000).toFixed(1)}s -{" "}
                        {(seg.endMs / 1000).toFixed(1)}s
                      </td>
                      <td className="p-1.5 text-right font-mono font-bold">
                        {seg.acousticConfidencePct}%
                      </td>
                      <td className="p-1.5 text-gray-700">
                        {seg.transcriptText}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Content Section: Prompt Evolution & Optimization */}
        {artifact.type === "prompt_optimizer" && (
          <div className="space-y-6">
            <div className="p-3.5 border-2 border-black rounded bg-gray-50 print-avoid-break space-y-2">
              <div className="flex items-center justify-between border-b border-gray-300 pb-1">
                <span className="text-[10px] font-mono font-bold uppercase text-gray-700">
                  Target Task: {artifact.data.targetTask}
                </span>
                <span className="text-[10px] font-mono font-bold text-black">
                  Model: {artifact.data.summary.baseModel} | Score: +
                  {artifact.data.summary.netScoreGainPct}%
                </span>
              </div>
              <p className="text-xs text-gray-800 leading-relaxed font-mono">
                Optimal Candidate: {artifact.data.summary.bestCandidateId}{" "}
                (Score: {artifact.data.summary.optimizedScore.toFixed(1)}%,
                Tokens: {artifact.data.summary.optimizedTokens})
              </p>
            </div>

            {/* Metrics Scorecard */}
            <div className="grid grid-cols-4 gap-2 text-xs print-avoid-break">
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Eval Accuracy
                </div>
                <div className="text-xs font-bold text-black mt-1">
                  {artifact.data.summary.optimizedScore.toFixed(1)}% (+
                  {artifact.data.summary.netScoreGainPct}%)
                </div>
              </div>
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Token Footprint
                </div>
                <div className="text-xs font-bold text-black mt-1">
                  {artifact.data.summary.optimizedTokens} tokens (
                  {artifact.data.summary.tokenSavingsPct > 0
                    ? `-${artifact.data.summary.tokenSavingsPct}%`
                    : `+${Math.abs(artifact.data.summary.tokenSavingsPct)}%`}
                  )
                </div>
              </div>
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Pareto Candidates
                </div>
                <div className="text-xs font-bold text-black mt-1">
                  {artifact.data.summary.paretoEfficientCount} of{" "}
                  {artifact.data.candidates.length}
                </div>
              </div>
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Cost Delta
                </div>
                <div className="text-xs font-bold text-black mt-1">
                  -{artifact.data.summary.estimatedCostSavingsPct}% / 1k req
                </div>
              </div>
            </div>

            {/* Test Bench Table */}
            <div className="space-y-2 print-avoid-break">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-1">
                Validation Test Bench ({artifact.data.testCases.length})
              </h3>
              <table className="w-full text-left text-xs border border-gray-300">
                <thead>
                  <tr className="bg-gray-100 font-mono text-[10px] border-b border-gray-300">
                    <th className="p-1.5">Scenario</th>
                    <th className="p-1.5 text-center">Baseline</th>
                    <th className="p-1.5 text-center">Optimized</th>
                    <th className="p-1.5 text-center">Status</th>
                    <th className="p-1.5">Audit Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-mono text-[10px]">
                  {artifact.data.testCases.map((tc) => (
                    <tr key={tc.id}>
                      <td className="p-1.5 font-bold text-black">{tc.input}</td>
                      <td className="p-1.5 text-center">
                        {tc.baselineScore.toFixed(1)}%
                      </td>
                      <td className="p-1.5 text-center font-bold text-black">
                        {tc.optimizedScore.toFixed(1)}%
                      </td>
                      <td className="p-1.5 text-center uppercase">
                        {tc.status}
                      </td>
                      <td className="p-1.5 text-gray-700">{tc.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Content Section: Vector Space & Semantic Clustering */}
        {artifact.type === "vector_space" && (
          <div className="space-y-6">
            <div className="p-3.5 border-2 border-black rounded bg-gray-50 print-avoid-break space-y-2">
              <div className="flex items-center justify-between border-b border-gray-300 pb-1">
                <span className="text-[10px] font-mono font-bold uppercase text-gray-700">
                  Dataset: {artifact.data.datasetTitle}
                </span>
                <span className="text-[10px] font-mono font-bold text-black">
                  {artifact.data.summary.embeddingDimension}d → 2D{" "}
                  {artifact.data.summary.reductionMethod.toUpperCase()} |
                  Silhouette: {artifact.data.summary.silhouetteScore.toFixed(3)}
                </span>
              </div>
              <p className="text-xs text-gray-800 leading-relaxed font-sans">
                {artifact.data.executiveSummary}
              </p>
            </div>

            {/* Metrics Scorecard */}
            <div className="grid grid-cols-4 gap-2 text-xs print-avoid-break">
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Indexed Vectors
                </div>
                <div className="text-xs font-bold text-black mt-1">
                  {artifact.data.summary.totalVectors} vectors
                </div>
              </div>
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Silhouette Score
                </div>
                <div className="text-xs font-bold text-black mt-1">
                  {artifact.data.summary.silhouetteScore.toFixed(3)}
                </div>
              </div>
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Explained Variance
                </div>
                <div className="text-xs font-bold text-black mt-1">
                  {(artifact.data.summary.explainedVarianceRatio * 100).toFixed(
                    1,
                  )}
                  % in 2D
                </div>
              </div>
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Outlier Anomalies
                </div>
                <div className="text-xs font-bold text-black mt-1">
                  {artifact.data.summary.outlierCount} flagged
                </div>
              </div>
            </div>

            {/* Semantic Clusters Table */}
            <div className="space-y-2 print-avoid-break">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-1">
                Semantic Clusters ({artifact.data.clusters.length})
              </h3>
              <table className="w-full text-left text-xs border border-gray-300">
                <thead>
                  <tr className="bg-gray-100 font-mono text-[10px] border-b border-gray-300">
                    <th className="p-1.5">Cluster ID</th>
                    <th className="p-1.5">Cluster Label</th>
                    <th className="p-1.5 text-center">Vectors</th>
                    <th className="p-1.5 text-center">Centroid (X, Y)</th>
                    <th className="p-1.5">Key Concepts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-mono text-[10px]">
                  {artifact.data.clusters.map((c) => (
                    <tr key={c.id}>
                      <td className="p-1.5 font-bold text-black">
                        Cluster {c.id}
                      </td>
                      <td className="p-1.5 font-bold text-black">{c.label}</td>
                      <td className="p-1.5 text-center">{c.pointCount}</td>
                      <td className="p-1.5 text-center">
                        ({c.centroidX.toFixed(2)}, {c.centroidY.toFixed(2)})
                      </td>
                      <td className="p-1.5 text-gray-700">
                        {c.topKeywords.join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Content Section: Causal DAG & Counterfactual Inference */}
        {artifact.type === "causal_dag" && (
          <div className="space-y-6">
            <div className="p-3.5 border-2 border-black rounded bg-gray-50 print-avoid-break space-y-2">
              <div className="flex items-center justify-between border-b border-gray-300 pb-1">
                <span className="text-[10px] font-mono font-bold uppercase text-gray-700">
                  Hypothesis: {artifact.data.hypothesis}
                </span>
                <span className="text-[10px] font-mono font-bold text-black">
                  ATE: {artifact.data.summary.averageTreatmentEffect} units |
                  E-Value: {artifact.data.summary.eValue.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-gray-800 leading-relaxed font-sans">
                {artifact.data.executiveSummary}
              </p>
            </div>

            {/* Metrics Scorecard */}
            <div className="grid grid-cols-4 gap-2 text-xs print-avoid-break">
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Average Treatment Effect
                </div>
                <div className="text-xs font-bold text-black mt-1">
                  {artifact.data.summary.averageTreatmentEffect} units
                </div>
              </div>
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  E-Value Robustness
                </div>
                <div className="text-xs font-bold text-black mt-1">
                  {artifact.data.summary.eValue.toFixed(2)}
                </div>
              </div>
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Backdoor Criterion
                </div>
                <div className="text-xs font-bold text-black mt-1 uppercase">
                  {artifact.data.summary.backdoorCriterionSatisfied
                    ? "Satisfied"
                    : "Violated"}
                </div>
              </div>
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Identifiability
                </div>
                <div className="text-xs font-bold text-black mt-1 uppercase">
                  {artifact.data.summary.causalIdentifiability}
                </div>
              </div>
            </div>

            {/* Structural Pathways Table */}
            <div className="space-y-2 print-avoid-break">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-1">
                Structural Pathways &amp; Mechanisms (
                {artifact.data.edges.length})
              </h3>
              <table className="w-full text-left text-xs border border-gray-300">
                <thead>
                  <tr className="bg-gray-100 font-mono text-[10px] border-b border-gray-300">
                    <th className="p-1.5">Source</th>
                    <th className="p-1.5">Target</th>
                    <th className="p-1.5 text-center">Coeff (β)</th>
                    <th className="p-1.5 text-center">Status</th>
                    <th className="p-1.5">Mechanism</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-mono text-[10px]">
                  {artifact.data.edges.map((e) => {
                    const src =
                      artifact.data.nodes.find((n) => n.id === e.source)
                        ?.label || e.source;
                    const tgt =
                      artifact.data.nodes.find((n) => n.id === e.target)
                        ?.label || e.target;
                    return (
                      <tr key={e.id}>
                        <td className="p-1.5 font-bold text-black">{src}</td>
                        <td className="p-1.5 font-bold text-black">{tgt}</td>
                        <td className="p-1.5 text-center">
                          {e.coefficient > 0
                            ? `+${e.coefficient.toFixed(2)}`
                            : e.coefficient.toFixed(2)}
                        </td>
                        <td className="p-1.5 text-center uppercase">
                          {e.isBackdoorPath ? "Backdoor" : "Direct"}
                        </td>
                        <td className="p-1.5 text-gray-700">{e.mechanism}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Content Section: Bayesian Optimization Studio */}
        {artifact.type === "bayesian_opt" && (
          <div className="space-y-6">
            <div className="p-3.5 border-2 border-black rounded bg-gray-50 print-avoid-break space-y-2">
              <div className="flex items-center justify-between border-b border-gray-300 pb-1">
                <span className="text-[10px] font-mono font-bold uppercase text-gray-700">
                  Target: {artifact.data.title} ({artifact.data.targetModel})
                </span>
                <span className="text-[10px] font-mono font-bold text-black">
                  Peak: {artifact.data.summary.bestObjectiveValue} (+
                  {artifact.data.summary.improvementPct}%) | Trials:{" "}
                  {artifact.data.summary.totalTrials}
                </span>
              </div>
              <p className="text-xs text-gray-800 leading-relaxed font-sans">
                {artifact.data.executiveSummary}
              </p>
            </div>

            {/* Metrics Scorecard */}
            <div className="grid grid-cols-4 gap-2 text-xs print-avoid-break">
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Peak Objective
                </div>
                <div className="text-xs font-bold text-black mt-1">
                  {artifact.data.summary.bestObjectiveValue}
                </div>
              </div>
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Baseline Value
                </div>
                <div className="text-xs font-bold text-black mt-1">
                  {artifact.data.summary.baselineObjectiveValue}
                </div>
              </div>
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Improvement Delta
                </div>
                <div className="text-xs font-bold text-black mt-1">
                  +{artifact.data.summary.improvementPct}%
                </div>
              </div>
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Next Acquisition
                </div>
                <div className="text-xs font-bold text-black mt-1">
                  {artifact.data.summary.nextExpectedAcquisitionValue} (EI)
                </div>
              </div>
            </div>

            {/* Tuned Hyperparameters Table */}
            <div className="space-y-2 print-avoid-break">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-1">
                Tuned Hyperparameters ({artifact.data.parameters.length})
              </h3>
              <table className="w-full text-left text-xs border border-gray-300">
                <thead>
                  <tr className="bg-gray-100 font-mono text-[10px] border-b border-gray-300">
                    <th className="p-1.5">Parameter</th>
                    <th className="p-1.5">Type</th>
                    <th className="p-1.5">Domain / Choices</th>
                    <th className="p-1.5 text-right">Optimal Value</th>
                    <th className="p-1.5">Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-mono text-[10px]">
                  {artifact.data.parameters.map((p) => (
                    <tr key={p.name}>
                      <td className="p-1.5 font-bold text-black">{p.name}</td>
                      <td className="p-1.5 uppercase text-gray-700">
                        {p.type}
                      </td>
                      <td className="p-1.5 text-gray-600">
                        {p.choices
                          ? p.choices.join(", ")
                          : `[${p.min ?? "-"}, ${p.max ?? "-"}]`}
                      </td>
                      <td className="p-1.5 text-right font-bold text-black">
                        {p.optimalValue}
                      </td>
                      <td className="p-1.5 text-gray-600">{p.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Production Configuration Snippet */}
            <div className="border border-gray-400 rounded overflow-hidden print-avoid-break">
              <div className="p-2 bg-gray-100 border-b border-gray-300 font-mono text-xs text-black font-semibold">
                Production Runtime Configuration (YAML)
              </div>
              <pre className="p-3 text-[11px] font-mono text-black bg-white overflow-x-auto leading-relaxed whitespace-pre-wrap">
                {artifact.data.configSnippetYaml}
              </pre>
            </div>
          </div>
        )}

        {/* Content Section: Workflow Orchestrator Studio */}
        {artifact.type === "workflow_orchestrator" && (
          <div className="space-y-6">
            <div className="p-3.5 border-2 border-black rounded bg-gray-50 print-avoid-break space-y-2">
              <div className="flex items-center justify-between border-b border-gray-300 pb-1">
                <span className="text-[10px] font-mono font-bold uppercase text-gray-700">
                  Workflow: {artifact.data.title} (
                  {artifact.data.summary.workflowName})
                </span>
                <span className="text-[10px] font-mono font-bold text-black">
                  Grade {artifact.data.summary.resilienceGrade} | Reachability:{" "}
                  {artifact.data.summary.reachabilityScorePct}% | Deadlocks:{" "}
                  {artifact.data.summary.deadlocksDetected}
                </span>
              </div>
              <p className="text-xs text-gray-800 leading-relaxed font-sans">
                {artifact.data.executiveSummary}
              </p>
            </div>

            {/* Metrics Scorecard */}
            <div className="grid grid-cols-4 gap-2 text-xs print-avoid-break">
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Orchestrated States
                </div>
                <div className="text-xs font-bold text-black mt-1">
                  {artifact.data.summary.totalStates}
                </div>
              </div>
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Event Transitions
                </div>
                <div className="text-xs font-bold text-black mt-1">
                  {artifact.data.summary.totalTransitions}
                </div>
              </div>
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Reachability Score
                </div>
                <div className="text-xs font-bold text-black mt-1">
                  {artifact.data.summary.reachabilityScorePct}%
                </div>
              </div>
              <div className="p-2 border border-gray-300 rounded bg-white">
                <div className="text-[10px] text-gray-600 font-mono">
                  Deadlocks Detected
                </div>
                <div className="text-xs font-bold text-black mt-1">
                  {artifact.data.summary.deadlocksDetected}
                </div>
              </div>
            </div>

            {/* Orchestrated States Table */}
            <div className="space-y-2 print-avoid-break">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-1">
                Finite States ({artifact.data.states.length})
              </h3>
              <table className="w-full text-left text-xs border border-gray-300">
                <thead>
                  <tr className="bg-gray-100 font-mono text-[10px] border-b border-gray-300">
                    <th className="p-1.5">State ID</th>
                    <th className="p-1.5">Name</th>
                    <th className="p-1.5">Type</th>
                    <th className="p-1.5">Description</th>
                    <th className="p-1.5">Entry / Exit Hooks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-mono text-[10px]">
                  {artifact.data.states.map((s) => (
                    <tr key={s.id}>
                      <td className="p-1.5 font-bold text-black">{s.id}</td>
                      <td className="p-1.5 text-black">{s.name}</td>
                      <td className="p-1.5 uppercase text-gray-700">
                        {s.type}
                      </td>
                      <td className="p-1.5 text-gray-600">{s.description}</td>
                      <td className="p-1.5 text-gray-600">
                        {s.entryAction ? `entry: ${s.entryAction}` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Event Transitions Table */}
            <div className="space-y-2 print-avoid-break">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-1">
                Event Transitions ({artifact.data.transitions.length})
              </h3>
              <table className="w-full text-left text-xs border border-gray-300">
                <thead>
                  <tr className="bg-gray-100 font-mono text-[10px] border-b border-gray-300">
                    <th className="p-1.5">Event</th>
                    <th className="p-1.5">Source → Target</th>
                    <th className="p-1.5">Guard</th>
                    <th className="p-1.5">Compensation Saga</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-mono text-[10px]">
                  {artifact.data.transitions.map((t) => (
                    <tr key={t.id}>
                      <td className="p-1.5 font-bold text-black">{t.event}</td>
                      <td className="p-1.5 text-black">
                        {t.source} → {t.target}
                      </td>
                      <td className="p-1.5 text-gray-600">
                        {t.guardCondition || "Unconditional"}
                      </td>
                      <td className="p-1.5 text-gray-600">
                        {t.compensationAction || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Content Section: Formal Theorem Prover Studio */}
        {artifact.type === "formal_prover" && (
          <div className="space-y-6 print-avoid-break">
            <div className="p-4 border border-gray-300 rounded bg-gray-50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase text-black">
                  Conjecture Verification Status
                </span>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-gray-200 text-black border border-gray-400">
                  {artifact.data.summary.status.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-gray-800 font-sans leading-relaxed">
                {artifact.data.executiveSummary}
              </p>
              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-gray-200 text-center font-mono text-[10px]">
                <div>
                  Theorems: {artifact.data.summary.provenTheorems}/
                  {artifact.data.summary.totalTheorems}
                </div>
                <div>Solver: {artifact.data.summary.satSolverType}</div>
                <div>Depth: {artifact.data.summary.proofDepth}</div>
                <div>
                  Soundness: {artifact.data.summary.soundnessCompletenessPct}%
                </div>
              </div>
            </div>

            {/* Deductive Proof Tree Table */}
            <div className="space-y-2 print-avoid-break">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-1">
                Deductive Proof Tree AST ({artifact.data.proofTree.length}{" "}
                Steps)
              </h3>
              <table className="w-full text-left text-xs border border-gray-300">
                <thead>
                  <tr className="bg-gray-100 font-mono text-[10px] border-b border-gray-300">
                    <th className="p-1.5">Step / Name</th>
                    <th className="p-1.5">Kind</th>
                    <th className="p-1.5">Inference Rule</th>
                    <th className="p-1.5">Formal Formula</th>
                    <th className="p-1.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-mono text-[10px]">
                  {artifact.data.proofTree.map((node) => (
                    <tr key={node.id}>
                      <td className="p-1.5 font-bold text-black">
                        {node.name}
                      </td>
                      <td className="p-1.5 text-gray-700">{node.kind}</td>
                      <td className="p-1.5 text-gray-700">
                        {node.inferenceRule}
                      </td>
                      <td className="p-1.5 text-black break-all">
                        {node.formula}
                      </td>
                      <td className="p-1.5 text-right font-bold text-black">
                        {node.isVerified ? "VERIFIED" : "PENDING"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Hoare Logic Invariants Table */}
            <div className="space-y-2 print-avoid-break">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-1">
                Hoare Logic Invariants ({artifact.data.hoareInvariants.length})
              </h3>
              <table className="w-full text-left text-xs border border-gray-300">
                <thead>
                  <tr className="bg-gray-100 font-mono text-[10px] border-b border-gray-300">
                    <th className="p-1.5">Property</th>
                    <th className="p-1.5">Pre &#123;P&#125;</th>
                    <th className="p-1.5">Op C</th>
                    <th className="p-1.5">Post &#123;Q&#125;</th>
                    <th className="p-1.5 text-right">Holds</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-mono text-[10px]">
                  {artifact.data.hoareInvariants.map((inv) => (
                    <tr key={inv.id}>
                      <td className="p-1.5 font-bold text-black">
                        {inv.property}
                      </td>
                      <td className="p-1.5 text-gray-700">
                        {inv.precondition}
                      </td>
                      <td className="p-1.5 text-gray-700">{inv.operation}</td>
                      <td className="p-1.5 text-gray-700">
                        {inv.postcondition}
                      </td>
                      <td className="p-1.5 text-right font-bold text-black">
                        {inv.holds ? "HOLDS" : "VIOLATED"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Content Section: Epistemic Consensus & Bayesian Truth Serum Studio */}
        {artifact.type === "epistemic_consensus" && (
          <div className="space-y-6 print-avoid-break">
            <div className="p-4 border border-gray-300 rounded bg-gray-50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase text-black">
                  Prelec Bayesian Truth Serum Consensus
                </span>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-gray-200 text-black border border-gray-400">
                  {artifact.data.summary.consensusIndexPct}% CONSENSUS (GRADE{" "}
                  {artifact.data.summary.verdictConfidenceGrade})
                </span>
              </div>
              <p className="text-xs text-gray-800 font-sans leading-relaxed">
                {artifact.data.executiveSummary}
              </p>
              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-gray-200 text-center font-mono text-[10px]">
                <div>Agents: {artifact.data.summary.totalAgents}</div>
                <div>
                  Delphi Rounds: {artifact.data.summary.delphiRoundsCompleted}
                </div>
                <div>
                  Entropy: {artifact.data.summary.shannonEntropyFinalBits} bits
                </div>
                <div>
                  Reduction: -{artifact.data.summary.entropyReductionPct}%
                </div>
              </div>
            </div>

            {/* Agent Endorsements & BTS Scores Table */}
            <div className="space-y-2 print-avoid-break">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-1">
                Agent Belief Endorsements &amp; BTS Scores (
                {artifact.data.agents.length})
              </h3>
              <table className="w-full text-left text-xs border border-gray-300">
                <thead>
                  <tr className="bg-gray-100 font-mono text-[10px] border-b border-gray-300">
                    <th className="p-1.5">Agent / Role</th>
                    <th className="p-1.5">Endorsement x_i</th>
                    <th className="p-1.5">Predicted y_i</th>
                    <th className="p-1.5">Info Score</th>
                    <th className="p-1.5 text-right">BTS Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-mono text-[10px]">
                  {artifact.data.agents.map((a) => (
                    <tr key={a.agentId}>
                      <td className="p-1.5 font-bold text-black">
                        {a.agentName} ({a.role})
                      </td>
                      <td className="p-1.5 text-gray-700 font-bold">
                        {(a.personalEndorsement * 100).toFixed(0)}%
                      </td>
                      <td className="p-1.5 text-gray-700">
                        {(a.predictedCrowdMean * 100).toFixed(0)}%
                      </td>
                      <td className="p-1.5 text-gray-700">
                        +{a.informationScore}
                      </td>
                      <td className="p-1.5 text-right font-bold text-black">
                        +{a.btsTotalScore}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Delphi Rounds Table */}
            <div className="space-y-2 print-avoid-break">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-1">
                Delphi Multi-Round Convergence Trace (
                {artifact.data.delphiRounds.length} Rounds)
              </h3>
              <table className="w-full text-left text-xs border border-gray-300">
                <thead>
                  <tr className="bg-gray-100 font-mono text-[10px] border-b border-gray-300">
                    <th className="p-1.5">Round</th>
                    <th className="p-1.5">Entropy</th>
                    <th className="p-1.5">JSD Divergence</th>
                    <th className="p-1.5">Median Endorsement</th>
                    <th className="p-1.5">Key Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-mono text-[10px]">
                  {artifact.data.delphiRounds.map((r) => (
                    <tr key={r.round}>
                      <td className="p-1.5 font-bold text-black">
                        Round {r.round}
                      </td>
                      <td className="p-1.5 text-gray-700">
                        {r.shannonEntropyBits} bits
                      </td>
                      <td className="p-1.5 text-gray-700">
                        {r.jensenShannonDivergence}
                      </td>
                      <td className="p-1.5 text-gray-700">
                        {(r.medianEndorsement * 100).toFixed(0)}%
                      </td>
                      <td className="p-1.5 text-gray-600 font-sans text-[10px]">
                        {r.keyShiftArgument}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Content Section: Code */}
        {artifact.type === "code" && (
          <div className="space-y-4">
            <div className="p-3 border border-gray-300 rounded bg-gray-50 text-xs text-gray-900 font-sans print-avoid-break">
              <strong>Notes:</strong> {artifact.data.explanation}
            </div>
            <div className="border border-gray-400 rounded overflow-hidden">
              <div className="p-2 bg-gray-100 border-b border-gray-300 font-mono text-xs text-black font-semibold">
                {artifact.data.filename} ({artifact.data.language})
              </div>
              <pre className="p-3 text-[11px] font-mono text-black bg-white overflow-x-auto leading-relaxed whitespace-pre-wrap">
                {artifact.data.code}
              </pre>
            </div>
          </div>
        )}

        {/* Formatted Bibliography / Cited References section at the end */}
        {bibliography.length > 0 && (
          <div className="mt-8 pt-6 border-t-2 border-black space-y-4 print-avoid-break">
            <div className="flex items-center justify-between border-b border-gray-300 pb-1">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-black">
                Bibliography & Cited References ({bibliography.length})
              </h2>
              <span className="text-[10px] font-mono uppercase text-gray-600">
                Grounded Knowledge Base
              </span>
            </div>

            <div className="space-y-3">
              {bibliography.map((bib) => (
                <div
                  key={bib.index}
                  className="p-3 border border-gray-300 rounded bg-white text-xs space-y-1 print-avoid-break"
                >
                  <div className="flex items-start gap-2">
                    <span className="font-mono font-bold text-black flex-shrink-0">
                      {bib.citationMarker}
                    </span>
                    <div className="space-y-1 min-w-0">
                      <div className="font-semibold text-black">
                        {bib.title}
                        <span className="font-mono text-gray-700 font-normal ml-1">
                          - {bib.domain}
                        </span>
                      </div>

                      {bib.url && (
                        <div className="font-mono text-[10.5px] text-gray-700 break-all">
                          {bib.url}
                        </div>
                      )}

                      {(bib.author ||
                        bib.publishedDate ||
                        bib.relevanceLabel) && (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10.5px] font-mono text-gray-700">
                          {bib.author && <span>Author: {bib.author}</span>}
                          {bib.publishedDate && (
                            <span>Date: {bib.publishedDate}</span>
                          )}
                          {bib.relevanceLabel && (
                            <span className="font-bold text-black">
                              {bib.relevanceLabel}
                            </span>
                          )}
                        </div>
                      )}

                      {bib.snippet && (
                        <blockquote className="italic text-[11px] text-gray-700 border-l-2 border-gray-300 pl-2 mt-1">
                          &ldquo;{bib.snippet}&rdquo;
                        </blockquote>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
