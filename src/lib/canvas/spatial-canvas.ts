/**
 * Spatial Intelligence Canvas Calculation & Topology Engine
 *
 * Implements pure deterministic 2D spatial arrangement, semantic edge discovery,
 * bounding box calculations, smooth cubic bezier wires, and RFC 4180 / Markdown exports.
 * Zero pseudo-random numbers or invented synthetic telemetry.
 */

import { ChatMessage, GenerativeArtifact } from "@/lib/types";

export interface SpatialCanvasNode {
  id: string;
  messageId: string;
  artifactType:
    | "research"
    | "plan"
    | "chart"
    | "matrix"
    | "code"
    | "debate"
    | "council"
    | "simulation"
    | "audio_briefing"
    | "battlecard"
    | "pareto_frontier"
    | "eval_suite"
    | "red_team_audit"
    | "guardrail_policy"
    | "multimodal_inspection"
    | "memory_graph"
    | "audio_spectrogram"
    | "prompt_optimizer"
    | "vector_space"
    | "causal_dag"
    | "bayesian_opt";
  title: string;
  summary: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tags: string[];
  metrics?: {
    score?: number;
    evidenceCount?: number;
    status?: string;
    itemCount?: number;
  };
  createdAt: string;
  artifactData?: GenerativeArtifact;
}

export interface SpatialCanvasEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relationType:
    | "synthesizes"
    | "compares"
    | "implements"
    | "validates"
    | "debates"
    | "relates_to";
  label: string;
  strength: number; // 0 to 1
}

export interface ViewportTransform {
  panX: number;
  panY: number;
  zoom: number; // Clamped between 0.25 and 2.5
}

export interface SpatialCanvasBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface SpatialCanvasData {
  nodes: SpatialCanvasNode[];
  edges: SpatialCanvasEdge[];
  bounds: SpatialCanvasBounds;
  stats: {
    totalNodes: number;
    totalEdges: number;
    typeDistribution: Record<string, number>;
  };
}

/** Stopwords filtered during semantic keyword extraction */
const STOP_WORDS = new Set([
  "a",
  "about",
  "above",
  "after",
  "again",
  "against",
  "all",
  "am",
  "an",
  "and",
  "any",
  "are",
  "aren't",
  "as",
  "at",
  "be",
  "because",
  "been",
  "before",
  "being",
  "below",
  "between",
  "both",
  "but",
  "by",
  "can",
  "can't",
  "cannot",
  "could",
  "did",
  "do",
  "does",
  "doing",
  "don't",
  "down",
  "during",
  "each",
  "few",
  "for",
  "from",
  "further",
  "had",
  "has",
  "have",
  "having",
  "he",
  "her",
  "here",
  "hers",
  "herself",
  "him",
  "himself",
  "his",
  "how",
  "i",
  "if",
  "in",
  "into",
  "is",
  "isn't",
  "it",
  "its",
  "itself",
  "just",
  "me",
  "more",
  "most",
  "my",
  "myself",
  "no",
  "nor",
  "not",
  "now",
  "of",
  "off",
  "on",
  "once",
  "only",
  "or",
  "other",
  "our",
  "ours",
  "ourselves",
  "out",
  "over",
  "own",
  "same",
  "she",
  "should",
  "so",
  "some",
  "such",
  "than",
  "that",
  "the",
  "their",
  "theirs",
  "them",
  "themselves",
  "then",
  "there",
  "these",
  "they",
  "this",
  "those",
  "through",
  "to",
  "too",
  "under",
  "until",
  "up",
  "very",
  "was",
  "we",
  "were",
  "what",
  "when",
  "where",
  "which",
  "while",
  "who",
  "whom",
  "why",
  "with",
  "would",
  "you",
  "your",
  "yours",
  "yourself",
  "yourselves",
]);

/**
 * Tokenizes text into normalized domain keywords.
 */
export function tokenizeText(text: string): string[] {
  if (!text || typeof text !== "string") return [];
  const normalized = text.toLowerCase().replace(/[^a-z0-9_-]/g, " ");
  const rawTokens = normalized.split(/\s+/).filter(Boolean);
  return rawTokens.filter(
    (token) => token.length >= 3 && !STOP_WORDS.has(token),
  );
}

/**
 * Computes Jaccard similarity between two token sets.
 */
export function computeJaccardSimilarity(
  tokensA: string[],
  tokensB: string[],
): number {
  if (!tokensA || !tokensB || tokensA.length === 0 || tokensB.length === 0)
    return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersectionCount = 0;
  for (const token of setA) {
    if (setB.has(token)) intersectionCount++;
  }
  const unionCount = setA.size + setB.size - intersectionCount;
  return unionCount === 0
    ? 0
    : Number((intersectionCount / unionCount).toFixed(4));
}

/**
 * Extracts spatial canvas nodes from chat messages with deterministic multi-column layout.
 * Cards are laid out in structured tiers (default 3 columns, spacingX: 380, spacingY: 280)
 * so cards never overlap.
 */
export function extractSpatialNodes(
  messages: ChatMessage[],
  config?: {
    columns?: number;
    spacingX?: number;
    spacingY?: number;
    cardWidth?: number;
    cardHeight?: number;
    startX?: number;
    startY?: number;
  },
): SpatialCanvasNode[] {
  if (!Array.isArray(messages)) return [];

  const columns = config?.columns ?? 3;
  const spacingX = config?.spacingX ?? 380;
  const spacingY = config?.spacingY ?? 280;
  const cardWidth = config?.cardWidth ?? 320;
  const cardHeight = config?.cardHeight ?? 220;
  const startX = config?.startX ?? 60;
  const startY = config?.startY ?? 60;

  const nodes: SpatialCanvasNode[] = [];
  let artifactIndex = 0;

  for (const msg of messages) {
    if (!msg || !msg.artifact || !msg.artifact.type) continue;

    const { type, data } = msg.artifact;
    const col = artifactIndex % columns;
    const row = Math.floor(artifactIndex / columns);

    const x = startX + col * spacingX;
    const y = startY + row * spacingY;

    let title = "Nova Artifact";
    let summary = "";
    const tags: string[] = [type.toUpperCase()];
    const metrics: SpatialCanvasNode["metrics"] = {};

    switch (type) {
      case "research": {
        const r = data as {
          title?: string;
          executiveSummary?: string;
          recommendation?: string;
          keyFindings?: Array<{ point?: string }>;
          sources?: unknown[];
          metrics?: { verificationAudit?: { sourceAlignment?: number } };
        };
        title = r.title || "Research Synthesis";
        summary = r.executiveSummary || r.recommendation || "";
        tags.push("INVESTIGATION", "SYNTHESIS");
        if (Array.isArray(r.keyFindings)) {
          metrics.itemCount = r.keyFindings.length;
        }
        if (Array.isArray(r.sources)) {
          metrics.evidenceCount = r.sources.length;
        }
        if (typeof r.metrics?.verificationAudit?.sourceAlignment === "number") {
          metrics.score = r.metrics.verificationAudit.sourceAlignment;
        }
        metrics.status = "verified";
        break;
      }
      case "debate": {
        const d = data as {
          topic?: string;
          consensusSummary?: string;
          synthesisVerdict?: string;
          perspectives?: unknown[];
        };
        title = d.topic || "Dialectic Debate";
        summary = d.consensusSummary || d.synthesisVerdict || "";
        tags.push("RED-TEAM", "DIALECTIC");
        if (Array.isArray(d.perspectives)) {
          metrics.itemCount = d.perspectives.length;
        }
        metrics.status = "concluded";
        break;
      }
      case "matrix": {
        const m = data as {
          topic?: string;
          verdict?: string;
          options?: Array<{ totalWeightedScore?: number }>;
        };
        title = m.topic || "Decision Matrix";
        summary = m.verdict || "Multi-criteria tradeoff evaluation.";
        tags.push("DECISION", "EVALUATION");
        if (Array.isArray(m.options)) {
          metrics.itemCount = m.options.length;
          if (m.options.length > 0) {
            const scores = m.options
              .map((o) => o.totalWeightedScore)
              .filter((s): s is number => typeof s === "number");
            if (scores.length > 0) {
              metrics.score = Math.max(...scores);
            }
          }
        }
        metrics.status = "evaluated";
        break;
      }
      case "plan": {
        const p = data as {
          goal?: string;
          overview?: string;
          timeframe?: string;
          phases?: unknown[];
        };
        title = p.goal || "Strategic Execution Plan";
        summary = p.overview || p.timeframe || "";
        tags.push("ROADMAP", "GOAL");
        if (Array.isArray(p.phases)) {
          metrics.itemCount = p.phases.length;
        }
        metrics.status = "active";
        break;
      }
      case "chart": {
        const c = data as {
          title?: string;
          type?: string;
          insight?: string;
          description?: string;
          data?: unknown[];
        };
        title = c.title || "Data Topology Chart";
        summary =
          c.insight || c.description || `${c.type || "Metric"} visualization`;
        tags.push("TELEMETRY", (c.type || "CHART").toUpperCase());
        if (Array.isArray(c.data)) {
          metrics.itemCount = c.data.length;
        }
        metrics.status = "rendered";
        break;
      }
      case "code": {
        const cd = data as {
          filename?: string;
          language?: string;
          code?: string;
          explanation?: string;
        };
        title = cd.filename || `${cd.language || "TypeScript"} Implementation`;
        summary = cd.explanation || "Executable code sandbox snippet.";
        tags.push("CODE", (cd.language || "SOURCE").toUpperCase());
        if (typeof cd.code === "string") {
          metrics.itemCount = cd.code.split("\n").length;
        }
        metrics.status = "compiled";
        break;
      }
      case "council": {
        const cl = data as {
          topic?: string;
          councilVerdict?: string;
          verdictSummary?: string;
          alignmentIndex?: number;
          reviews?: unknown[];
          fatalBlindspots?: unknown[];
        };
        title = cl.topic || "Persona Council Deliberation";
        summary =
          cl.verdictSummary ||
          `Council evaluation: ${cl.councilVerdict || "consensus reached"}`;
        tags.push("COUNCIL", "EXECUTIVE");
        if (typeof cl.alignmentIndex === "number") {
          metrics.score = cl.alignmentIndex;
        }
        if (Array.isArray(cl.reviews)) {
          metrics.itemCount = cl.reviews.length;
        }
        if (Array.isArray(cl.fatalBlindspots)) {
          metrics.evidenceCount = cl.fatalBlindspots.length;
        }
        metrics.status = "evaluated";
        break;
      }
      case "simulation": {
        const sim = data as {
          title?: string;
          description?: string;
          summary?: {
            resilienceScore?: number;
            bottleneckDiagnosis?: string;
            cascadingFailureRisk?: string;
          };
          telemetrySeries?: unknown[];
          activeInjections?: unknown[];
        };
        title = sim.title || "Resilience Chaos Simulation";
        summary =
          sim.summary?.bottleneckDiagnosis ||
          sim.description ||
          "Discrete event stress test simulation.";
        tags.push("SIMULATION", "CHAOS");
        if (typeof sim.summary?.resilienceScore === "number") {
          metrics.score = sim.summary.resilienceScore;
        }
        if (Array.isArray(sim.telemetrySeries)) {
          metrics.itemCount = sim.telemetrySeries.length;
        }
        if (Array.isArray(sim.activeInjections)) {
          metrics.evidenceCount = sim.activeInjections.length;
        }
        metrics.status = "simulated";
        break;
      }
      case "audio_briefing": {
        const ab = data as {
          title?: string;
          totalDurationMs?: number;
          totalWordCount?: number;
          chapters?: unknown[];
          fullNarrationScript?: string;
        };
        title = ab.title || "Multimodal Audio Briefing";
        summary =
          ab.fullNarrationScript ||
          `Audio briefing with ${ab.chapters?.length || 0} chapters.`;
        tags.push("AUDIO", "BRIEFING");
        if (typeof ab.totalDurationMs === "number") {
          metrics.score = Math.round(ab.totalDurationMs / 1000); // duration in seconds
        }
        if (Array.isArray(ab.chapters)) {
          metrics.itemCount = ab.chapters.length;
        }
        if (typeof ab.totalWordCount === "number") {
          metrics.evidenceCount = ab.totalWordCount;
        }
        metrics.status = "synthesized";
        break;
      }
      case "battlecard": {
        const bc = data as {
          topic?: string;
          targetSector?: string;
          novaMoatScore?: number;
          competitorProfiles?: unknown[];
          dimensions?: unknown[];
          strategicSummary?: string;
        };
        title = bc.topic || "Competitive Moat Battle-Card";
        summary =
          bc.strategicSummary ||
          `Competitive evaluation in ${bc.targetSector || "target sector"}.`;
        tags.push("BATTLECARD", "COMPETITIVE", "MOAT");
        if (typeof bc.novaMoatScore === "number") {
          metrics.score = bc.novaMoatScore;
        }
        if (Array.isArray(bc.competitorProfiles)) {
          metrics.itemCount = bc.competitorProfiles.length;
        }
        if (Array.isArray(bc.dimensions)) {
          metrics.evidenceCount = bc.dimensions.length;
        }
        metrics.status = "benchmarked";
        break;
      }
      case "pareto_frontier": {
        const pf = data as {
          topic?: string;
          frontierProviderIds?: string[];
          providers?: unknown[];
          recommendations?: unknown[];
          summary?: string;
        };
        title = pf.topic || "Cost-Latency Pareto Frontier";
        summary =
          pf.summary ||
          `Pareto frontier with ${pf.frontierProviderIds?.length || 0} optimal configurations.`;
        tags.push("PARETO", "OPTIMIZER", "ROUTING");
        if (Array.isArray(pf.frontierProviderIds)) {
          metrics.score = pf.frontierProviderIds.length;
        }
        if (Array.isArray(pf.providers)) {
          metrics.itemCount = pf.providers.length;
        }
        if (Array.isArray(pf.recommendations)) {
          metrics.evidenceCount = pf.recommendations.length;
        }
        metrics.status = "optimized";
        break;
      }
      case "eval_suite": {
        const es = data as {
          topic?: string;
          summary?: { overallPassRatePct?: number };
          scenarios?: unknown[];
          executiveSummary?: string;
        };
        title = es.topic || "Regression Evaluator Suite";
        summary =
          es.executiveSummary ||
          `Evaluation suite with ${es.scenarios?.length || 0} automated scenarios.`;
        tags.push("EVAL", "REGRESSION", "QA");
        if (typeof es.summary?.overallPassRatePct === "number") {
          metrics.score = es.summary.overallPassRatePct;
        }
        if (Array.isArray(es.scenarios)) {
          metrics.itemCount = es.scenarios.length;
        }
        metrics.status = "evaluated";
        break;
      }
      case "red_team_audit": {
        const rta = data as {
          topic?: string;
          summary?: { immunityScore?: number };
          attackChains?: unknown[];
          executiveSummary?: string;
        };
        title = rta.topic || "Dialectic Red-Team Security Audit";
        summary =
          rta.executiveSummary ||
          `Red-team audit with ${rta.attackChains?.length || 0} adversarial penetration vectors.`;
        tags.push("RED_TEAM", "SECURITY", "VULNERABILITY");
        if (typeof rta.summary?.immunityScore === "number") {
          metrics.score = rta.summary.immunityScore;
        }
        if (Array.isArray(rta.attackChains)) {
          metrics.itemCount = rta.attackChains.length;
        }
        metrics.status = "audited";
        break;
      }
      case "guardrail_policy": {
        const gp = data as {
          topic?: string;
          summary?: { cleanTokensPct?: number };
          appliedRules?: unknown[];
          violations?: unknown[];
          executiveSummary?: string;
        };
        title = gp.topic || "Semantic Guardrail Policy";
        summary =
          gp.executiveSummary ||
          `Enforced guardrail policy with ${gp.appliedRules?.length || 0} active rules.`;
        tags.push("GUARDRAIL", "POLICY", "SANITIZER", "SECURITY");
        if (typeof gp.summary?.cleanTokensPct === "number") {
          metrics.score = gp.summary.cleanTokensPct;
        }
        if (Array.isArray(gp.violations)) {
          metrics.itemCount = gp.violations.length;
        }
        if (Array.isArray(gp.appliedRules)) {
          metrics.evidenceCount = gp.appliedRules.length;
        }
        metrics.status = "enforced";
        break;
      }
      case "multimodal_inspection": {
        const mi = data as {
          topic?: string;
          summary?: { visualGroundingIndex?: number; totalRegions?: number };
          frames?: unknown[];
          executiveSummary?: string;
        };
        title = mi.topic || "Multimodal Vision Inspector";
        summary =
          mi.executiveSummary ||
          `Multimodal frame inspection with ${mi.frames?.length || 0} visual frame(s).`;
        tags.push("MULTIMODAL", "VISION", "SPATIAL", "GROUNDING");
        if (typeof mi.summary?.visualGroundingIndex === "number") {
          metrics.score = mi.summary.visualGroundingIndex;
        }
        if (Array.isArray(mi.frames)) {
          metrics.itemCount = mi.frames.length;
        }
        if (typeof mi.summary?.totalRegions === "number") {
          metrics.evidenceCount = mi.summary.totalRegions;
        }
        metrics.status = "grounded";
        break;
      }
      case "memory_graph": {
        const kg = data as {
          topic?: string;
          summary?: {
            density?: number;
            totalNodes?: number;
            totalEdges?: number;
            averageDegree?: number;
          };
          nodes?: unknown[];
          edges?: unknown[];
          executiveSummary?: string;
        };
        title = kg.topic || "Memory & Knowledge Graph";
        summary =
          kg.executiveSummary ||
          `Semantic knowledge graph with ${kg.nodes?.length || 0} entities and ${kg.edges?.length || 0} relations.`;
        tags.push("GRAPH_RAG", "MEMORY_GRAPH", "CENTRALITY", "ONTOLOGY");
        if (typeof kg.summary?.density === "number") {
          metrics.score = Math.round(kg.summary.density * 100);
        }
        if (Array.isArray(kg.nodes)) {
          metrics.itemCount = kg.nodes.length;
        }
        if (Array.isArray(kg.edges)) {
          metrics.evidenceCount = kg.edges.length;
        }
        metrics.status = "indexed";
        break;
      }
      case "audio_spectrogram": {
        const as = data as {
          topic?: string;
          summary?: {
            durationSeconds?: number;
            snrDb?: number;
            averageAcousticConfidencePct?: number;
          };
          segments?: unknown[];
          spectralBands?: unknown[];
          executiveSummary?: string;
        };
        title = as.topic || "Acoustic Spectrogram Inspector";
        summary =
          as.executiveSummary ||
          `Acoustic spectrogram inspection with ${as.segments?.length || 0} time-aligned speaker segment(s).`;
        tags.push("AUDIO", "SPECTROGRAM", "ACOUSTIC", "DIARIZATION");
        if (typeof as.summary?.snrDb === "number") {
          metrics.score = Math.round(as.summary.snrDb);
        }
        if (Array.isArray(as.segments)) {
          metrics.itemCount = as.segments.length;
        }
        if (Array.isArray(as.spectralBands)) {
          metrics.evidenceCount = as.spectralBands.length;
        }
        metrics.status = "acoustic";
        break;
      }
      case "prompt_optimizer": {
        const po = data as {
          targetTask?: string;
          summary?: {
            baseModel?: string;
            optimizedScore?: number;
            netScoreGainPct?: number;
            tokenSavingsPct?: number;
          };
          candidates?: unknown[];
          testCases?: unknown[];
          technicalNotes?: string;
        };
        title = po.targetTask || "Prompt Evolution Studio";
        summary =
          po.technicalNotes ||
          `DSPy evolutionary prompt optimization with ${po.candidates?.length || 0} candidate(s) and +${po.summary?.netScoreGainPct || 0}% score gain.`;
        tags.push("PROMPT_OPT", "DSPY", "METAPROMPT", "TOKEN_SAVINGS");
        if (typeof po.summary?.optimizedScore === "number") {
          metrics.score = Math.round(po.summary.optimizedScore);
        }
        if (Array.isArray(po.candidates)) {
          metrics.itemCount = po.candidates.length;
        }
        if (Array.isArray(po.testCases)) {
          metrics.evidenceCount = po.testCases.length;
        }
        metrics.status = "optimized";
        break;
      }
      case "vector_space": {
        const vs = data as {
          datasetTitle?: string;
          summary?: {
            embeddingDimension?: number;
            reductionMethod?: string;
            silhouetteScore?: number;
          };
          points?: unknown[];
          clusters?: unknown[];
          technicalNotes?: string;
        };
        title = vs.datasetTitle || "Vector Space Studio";
        summary =
          vs.technicalNotes ||
          `2D semantic embedding projection with ${vs.points?.length || 0} vectors across ${vs.clusters?.length || 0} clusters.`;
        tags.push("VECTOR_SPACE", "EMBEDDINGS", "CLUSTERING", "PCA");
        if (typeof vs.summary?.silhouetteScore === "number") {
          metrics.score = Math.round(vs.summary.silhouetteScore * 100);
        }
        if (Array.isArray(vs.points)) {
          metrics.itemCount = vs.points.length;
        }
        if (Array.isArray(vs.clusters)) {
          metrics.evidenceCount = vs.clusters.length;
        }
        metrics.status = "indexed";
        break;
      }
      case "causal_dag": {
        const cd = data as {
          hypothesis?: string;
          summary?: {
            averageTreatmentEffect?: number;
            backdoorCriterionSatisfied?: boolean;
            eValue?: number;
          };
          nodes?: unknown[];
          edges?: unknown[];
          counterfactuals?: unknown[];
          technicalNotes?: string;
        };
        title = cd.hypothesis || "Causal Inference Studio";
        summary =
          cd.technicalNotes ||
          `Structural causal model with ${cd.nodes?.length || 0} nodes, ${cd.edges?.length || 0} pathways, and ATE of ${cd.summary?.averageTreatmentEffect || 0} units.`;
        tags.push("CAUSAL_DAG", "DO_CALCULUS", "ATE", "COUNTERFACTUAL");
        if (typeof cd.summary?.averageTreatmentEffect === "number") {
          metrics.score = Math.round(
            Math.abs(cd.summary.averageTreatmentEffect),
          );
        }
        if (Array.isArray(cd.nodes)) {
          metrics.itemCount = cd.nodes.length;
        }
        if (Array.isArray(cd.counterfactuals)) {
          metrics.evidenceCount = cd.counterfactuals.length;
        }
        metrics.status = "causal";
        break;
      }
      case "bayesian_opt": {
        const bo = data as {
          title?: string;
          targetModel?: string;
          summary?: {
            bestObjectiveValue?: number;
            targetObjective?: string;
            improvementPct?: number;
            totalTrials?: number;
          };
          parameters?: unknown[];
          trials?: unknown[];
          technicalNotes?: string;
        };
        title = bo.title || "Bayesian Optimization Studio";
        summary =
          bo.technicalNotes ||
          `Bayesian optimization across ${bo.parameters?.length || 0} dimensions achieving ${bo.summary?.bestObjectiveValue || 0} (${bo.summary?.targetObjective || "objective"}).`;
        tags.push(
          "BAYESIAN_OPT",
          "HYPERPARAMETERS",
          "GAUSSIAN_PROCESS",
          "SURROGATE",
        );
        if (typeof bo.summary?.bestObjectiveValue === "number") {
          metrics.score = Math.round(bo.summary.bestObjectiveValue);
        }
        if (Array.isArray(bo.trials)) {
          metrics.itemCount = bo.trials.length;
        }
        if (Array.isArray(bo.parameters)) {
          metrics.evidenceCount = bo.parameters.length;
        }
        metrics.status = "optimized";
        break;
      }
    }

    nodes.push({
      id: `node-${msg.id || artifactIndex}`,
      messageId: msg.id || `msg-${artifactIndex}`,
      artifactType: type,
      title,
      summary: summary.slice(0, 240),
      x,
      y,
      width: cardWidth,
      height: cardHeight,
      tags,
      metrics,
      createdAt: msg.timestamp || "1970-01-01T00:00:00.000Z",
      artifactData: msg.artifact,
    });

    artifactIndex++;
  }

  return nodes;
}

/**
 * Computes deterministic semantic and topological edges between spatial nodes.
 * Classifies relationType based on artifact pairs:
 * - debate + matrix -> "compares" (label: "Evaluates Tradeoffs")
 * - research + plan -> "implements" (label: "Execution Roadmap")
 * - research + chart -> "validates" (label: "Empirical Validation")
 * - research + debate -> "debates" (label: "Stress Tests")
 * - High keyword overlap (>= 0.25) -> "synthesizes"
 * - Moderate keyword overlap (>= 0.12) -> "relates_to"
 */
export function computeSpatialEdges(
  nodes: SpatialCanvasNode[],
): SpatialCanvasEdge[] {
  if (!Array.isArray(nodes) || nodes.length < 2) return [];

  const edges: SpatialCanvasEdge[] = [];
  const edgeKeys = new Set<string>();

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const source = nodes[i];
      const target = nodes[j];

      const sourceTokens = tokenizeText(source.title + " " + source.summary);
      const targetTokens = tokenizeText(target.title + " " + target.summary);
      const similarity = computeJaccardSimilarity(sourceTokens, targetTokens);

      let relationType: SpatialCanvasEdge["relationType"] | null = null;
      let label = "";
      let baseStrength = 0.5;

      const types = new Set([source.artifactType, target.artifactType]);

      // 1. Artifact type pair rules
      if (types.has("debate") && types.has("matrix")) {
        relationType = "compares";
        label = "Evaluates Tradeoffs";
        baseStrength = 0.75;
      } else if (types.has("research") && types.has("plan")) {
        relationType = "implements";
        label = "Execution Roadmap";
        baseStrength = 0.8;
      } else if (types.has("research") && types.has("chart")) {
        relationType = "validates";
        label = "Empirical Validation";
        baseStrength = 0.7;
      } else if (types.has("research") && types.has("debate")) {
        relationType = "debates";
        label = "Stress Tests";
        baseStrength = 0.85;
      } else if (types.has("council") && types.has("research")) {
        relationType = "debates";
        label = "Executive Council Audit";
        baseStrength = 0.85;
      } else if (types.has("council") && types.has("plan")) {
        relationType = "implements";
        label = "Authorizes Execution";
        baseStrength = 0.8;
      } else if (types.has("council") && types.has("matrix")) {
        relationType = "compares";
        label = "Council Scorecard Review";
        baseStrength = 0.75;
      } else if (types.has("simulation") && types.has("research")) {
        relationType = "validates";
        label = "Resilience Verification";
        baseStrength = 0.85;
      } else if (types.has("simulation") && types.has("plan")) {
        relationType = "debates";
        label = "Stress Tests Roadmap";
        baseStrength = 0.8;
      } else if (types.has("simulation") && types.has("council")) {
        relationType = "compares";
        label = "Council Chaos Validation";
        baseStrength = 0.8;
      } else if (types.has("audio_briefing") && types.has("research")) {
        relationType = "synthesizes";
        label = "Audio Narration Briefing";
        baseStrength = 0.9;
      } else if (types.has("audio_briefing") && types.has("council")) {
        relationType = "synthesizes";
        label = "Executive Council Narration";
        baseStrength = 0.9;
      } else if (types.has("audio_briefing") && types.has("simulation")) {
        relationType = "synthesizes";
        label = "Chaos Simulation Narration";
        baseStrength = 0.85;
      } else if (types.has("battlecard") && types.has("matrix")) {
        relationType = "compares";
        label = "Competitive Feature Audit";
        baseStrength = 0.85;
      } else if (types.has("battlecard") && types.has("research")) {
        relationType = "validates";
        label = "Empirical Moat Proof";
        baseStrength = 0.85;
      } else if (types.has("battlecard") && types.has("debate")) {
        relationType = "debates";
        label = "Objection Stress Test";
        baseStrength = 0.8;
      } else if (types.has("battlecard") && types.has("plan")) {
        relationType = "implements";
        label = "GTM Execution Alignment";
        baseStrength = 0.8;
      } else if (types.has("battlecard") && types.has("council")) {
        relationType = "debates";
        label = "Council Strategic Review";
        baseStrength = 0.85;
      } else if (types.has("pareto_frontier") && types.has("matrix")) {
        relationType = "compares";
        label = "Pareto Tradeoff Matrix";
        baseStrength = 0.85;
      } else if (types.has("pareto_frontier") && types.has("research")) {
        relationType = "validates";
        label = "Empirical Benchmark Frontier";
        baseStrength = 0.85;
      } else if (types.has("pareto_frontier") && types.has("battlecard")) {
        relationType = "compares";
        label = "Provider Frontier vs Rivals";
        baseStrength = 0.85;
      } else if (types.has("pareto_frontier") && types.has("plan")) {
        relationType = "implements";
        label = "Routing Infrastructure Plan";
        baseStrength = 0.8;
      } else if (types.has("pareto_frontier") && types.has("council")) {
        relationType = "debates";
        label = "Council Routing Policy Review";
        baseStrength = 0.8;
      } else if (types.has("eval_suite") && types.has("code")) {
        relationType = "validates";
        label = "Automated Code QA";
        baseStrength = 0.9;
      } else if (types.has("eval_suite") && types.has("research")) {
        relationType = "validates";
        label = "Grounding Accuracy Audit";
        baseStrength = 0.85;
      } else if (types.has("eval_suite") && types.has("pareto_frontier")) {
        relationType = "compares";
        label = "Benchmark Regression Check";
        baseStrength = 0.85;
      } else if (types.has("eval_suite") && types.has("simulation")) {
        relationType = "debates";
        label = "Chaos Resilience Test";
        baseStrength = 0.85;
      } else if (types.has("eval_suite") && types.has("council")) {
        relationType = "debates";
        label = "Council Policy Compliance";
        baseStrength = 0.8;
      } else if (types.has("eval_suite") && types.has("battlecard")) {
        relationType = "compares";
        label = "Competitive Moat QA";
        baseStrength = 0.8;
      } else if (types.has("red_team_audit") && types.has("eval_suite")) {
        relationType = "validates";
        label = "Regression & Threat Audit";
        baseStrength = 0.9;
      } else if (types.has("red_team_audit") && types.has("code")) {
        relationType = "debates";
        label = "Adversarial Penetration Probe";
        baseStrength = 0.9;
      } else if (types.has("red_team_audit") && types.has("simulation")) {
        relationType = "debates";
        label = "Chaos Attack Vector Test";
        baseStrength = 0.85;
      } else if (types.has("red_team_audit") && types.has("council")) {
        relationType = "debates";
        label = "Council Security Review";
        baseStrength = 0.85;
      } else if (types.has("red_team_audit") && types.has("research")) {
        relationType = "validates";
        label = "Grounded Security Proof";
        baseStrength = 0.8;
      } else if (types.has("guardrail_policy") && types.has("red_team_audit")) {
        relationType = "validates";
        label = "Threat Remediation Hardening";
        baseStrength = 0.9;
      } else if (types.has("guardrail_policy") && types.has("eval_suite")) {
        relationType = "validates";
        label = "Guardrail Regression QA";
        baseStrength = 0.9;
      } else if (types.has("guardrail_policy") && types.has("code")) {
        relationType = "implements";
        label = "Runtime Output Sanitization";
        baseStrength = 0.85;
      } else if (types.has("guardrail_policy") && types.has("council")) {
        relationType = "debates";
        label = "Council Policy Approval";
        baseStrength = 0.85;
      } else if (types.has("guardrail_policy") && types.has("research")) {
        relationType = "validates";
        label = "Compliance Regulatory Alignment";
        baseStrength = 0.8;
      } else if (types.has("multimodal_inspection") && types.has("research")) {
        relationType = "validates";
        label = "Visual Empirical Evidence";
        baseStrength = 0.9;
      } else if (
        types.has("multimodal_inspection") &&
        types.has("eval_suite")
      ) {
        relationType = "validates";
        label = "Vision Grounding Regression QA";
        baseStrength = 0.88;
      } else if (
        types.has("multimodal_inspection") &&
        types.has("red_team_audit")
      ) {
        relationType = "debates";
        label = "Visual Adversarial Prompt Audit";
        baseStrength = 0.85;
      } else if (
        types.has("multimodal_inspection") &&
        types.has("guardrail_policy")
      ) {
        relationType = "implements";
        label = "Visual Safety Sanitization";
        baseStrength = 0.85;
      } else if (types.has("memory_graph") && types.has("research")) {
        relationType = "synthesizes";
        label = "Graph RAG Associative Indexing";
        baseStrength = 0.94;
      } else if (types.has("memory_graph") && types.has("code")) {
        relationType = "implements";
        label = "Architecture Topology Implementation";
        baseStrength = 0.9;
      } else if (
        types.has("memory_graph") &&
        types.has("multimodal_inspection")
      ) {
        relationType = "validates";
        label = "Visual Entity Grounding";
        baseStrength = 0.88;
      } else if (types.has("memory_graph") && types.has("guardrail_policy")) {
        relationType = "validates";
        label = "Ontology Security Alignment";
        baseStrength = 0.86;
      } else if (
        types.has("audio_spectrogram") &&
        types.has("multimodal_inspection")
      ) {
        relationType = "validates";
        label = "Audio-Visual Grounding Alignment";
        baseStrength = 0.95;
      } else if (types.has("audio_spectrogram") && types.has("research")) {
        relationType = "synthesizes";
        label = "Acoustic Evidence Ingestion";
        baseStrength = 0.92;
      } else if (types.has("audio_spectrogram") && types.has("memory_graph")) {
        relationType = "validates";
        label = "Acoustic Entity Resolution";
        baseStrength = 0.89;
      } else if (types.has("prompt_optimizer") && types.has("eval_suite")) {
        relationType = "validates";
        label = "Metaprompt Benchmark Verification";
        baseStrength = 0.94;
      } else if (types.has("prompt_optimizer") && types.has("research")) {
        relationType = "synthesizes";
        label = "Research Prompt Adaptation";
        baseStrength = 0.91;
      } else if (types.has("vector_space") && types.has("memory_graph")) {
        relationType = "validates";
        label = "Embedding Topology Alignment";
        baseStrength = 0.93;
      } else if (types.has("vector_space") && types.has("research")) {
        relationType = "synthesizes";
        label = "Semantic Chunk Indexing";
        baseStrength = 0.9;
      } else if (types.has("causal_dag") && types.has("simulation")) {
        relationType = "validates";
        label = "Chaos Intervention Grounding";
        baseStrength = 0.95;
      } else if (types.has("causal_dag") && types.has("matrix")) {
        relationType = "synthesizes";
        label = "Causal Trade-off Arbitration";
        baseStrength = 0.92;
      } else if (types.has("causal_dag") && types.has("eval_suite")) {
        relationType = "validates";
        label = "Causal SCM Validates";
        baseStrength = 0.94;
      } else if (types.has("bayesian_opt") && types.has("eval_suite")) {
        relationType = "validates";
        label = "Hyperparameter Benchmark Tuning";
        baseStrength = 0.96;
      } else if (types.has("bayesian_opt") && types.has("pareto_frontier")) {
        relationType = "validates";
        label = "Cost-Throughput Frontier Validation";
        baseStrength = 0.94;
      } else if (types.has("bayesian_opt") && types.has("prompt_optimizer")) {
        relationType = "synthesizes";
        label = "Prompt & Inference Joint Optimization";
        baseStrength = 0.91;
      } else if (similarity >= 0.25) {
        relationType = "synthesizes";
        label = "Shared Domain Synthesis";
        baseStrength = similarity;
      } else if (similarity >= 0.12) {
        relationType = "relates_to";
        label = "Semantic Overlap";
        baseStrength = similarity;
      }

      if (relationType) {
        const edgeKey = `${source.id}->${target.id}`;
        if (!edgeKeys.has(edgeKey)) {
          edgeKeys.add(edgeKey);
          const strength = Number(
            Math.min(
              1,
              Math.max(
                0.1,
                similarity > 0
                  ? baseStrength * 0.7 + similarity * 0.3
                  : baseStrength,
              ),
            ).toFixed(2),
          );
          edges.push({
            id: `edge-${source.id}-${target.id}`,
            sourceId: source.id,
            targetId: target.id,
            relationType,
            label,
            strength,
          });
        }
      }
    }
  }

  return edges;
}

/**
 * Computes bounding box enclosing all spatial nodes with customizable padding (default: 80).
 * Handles 0, 1, and multiple nodes cleanly.
 */
export function computeCanvasBounds(
  nodes: SpatialCanvasNode[],
  padding: number = 80,
): SpatialCanvasBounds {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      width: 0,
      height: 0,
    };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    if (node.x < minX) minX = node.x;
    if (node.y < minY) minY = node.y;
    if (node.x + node.width > maxX) maxX = node.x + node.width;
    if (node.y + node.height > maxY) maxY = node.y + node.height;
  }

  const pad = typeof padding === "number" ? padding : 80;
  const boxMinX = minX - pad;
  const boxMinY = minY - pad;
  const boxMaxX = maxX + pad;
  const boxMaxY = maxY + pad;

  return {
    minX: boxMinX,
    minY: boxMinY,
    maxX: boxMaxX,
    maxY: boxMaxY,
    width: Math.max(0, boxMaxX - boxMinX),
    height: Math.max(0, boxMaxY - boxMinY),
  };
}

/**
 * Computes optimal zoom and pan to fit all nodes cleanly inside container dimensions.
 * Clamps zoom strictly between 0.25 and 2.5.
 */
export function computeFitViewport(
  bounds: { width: number; height: number; minX: number; minY: number },
  containerWidth: number,
  containerHeight: number,
): ViewportTransform {
  if (
    !containerWidth ||
    !containerHeight ||
    containerWidth <= 0 ||
    containerHeight <= 0 ||
    !bounds ||
    bounds.width <= 0 ||
    bounds.height <= 0
  ) {
    return { panX: 0, panY: 0, zoom: 1 };
  }

  const scaleX = containerWidth / bounds.width;
  const scaleY = containerHeight / bounds.height;
  const rawZoom = Math.min(scaleX, scaleY) * 0.95;

  // Clamp zoom strictly between 0.25x and 2.5x
  const zoom = Math.min(2.5, Math.max(0.25, Number(rawZoom.toFixed(2))));

  // Center the bounding box in the container:
  // screenCoord = worldCoord * zoom + pan
  // containerCenter = (bounds.min + bounds.dim / 2) * zoom + pan
  const panX = Math.round(
    containerWidth / 2 - (bounds.minX + bounds.width / 2) * zoom,
  );
  const panY = Math.round(
    containerHeight / 2 - (bounds.minY + bounds.height / 2) * zoom,
  );

  return { panX, panY, zoom };
}

/**
 * Calculates smooth cubic bezier SVG wire path between source and target cards.
 * Connects right edge of source to left edge of target (or top/bottom if stacked).
 */
export function calculateBezierPath(
  source: { x: number; y: number; width: number; height: number },
  target: { x: number; y: number; width: number; height: number },
): { path: string; midX: number; midY: number } {
  const sourceCenterX = source.x + source.width / 2;
  const targetCenterX = target.x + target.width / 2;
  const horizontalOverlap =
    Math.abs(sourceCenterX - targetCenterX) <
    Math.max(source.width, target.width) * 0.75;

  let startX: number;
  let startY: number;
  let endX: number;
  let endY: number;
  let cp1X: number;
  let cp1Y: number;
  let cp2X: number;
  let cp2Y: number;

  // Stacked vertically: connect bottom of source to top of target (or vice versa)
  if (horizontalOverlap && target.y >= source.y + source.height - 20) {
    startX = sourceCenterX;
    startY = source.y + source.height;
    endX = targetCenterX;
    endY = target.y;
    const dy = Math.abs(endY - startY);
    const offset = Math.max(40, dy * 0.5);
    cp1X = startX;
    cp1Y = startY + offset;
    cp2X = endX;
    cp2Y = endY - offset;
  } else if (horizontalOverlap && source.y >= target.y + target.height - 20) {
    startX = sourceCenterX;
    startY = source.y;
    endX = targetCenterX;
    endY = target.y + target.height;
    const dy = Math.abs(endY - startY);
    const offset = Math.max(40, dy * 0.5);
    cp1X = startX;
    cp1Y = startY - offset;
    cp2X = endX;
    cp2Y = endY + offset;
  } else if (target.x >= source.x + source.width * 0.5) {
    // Target is to the right
    startX = source.x + source.width;
    startY = source.y + source.height / 2;
    endX = target.x;
    endY = target.y + target.height / 2;
    const dx = Math.abs(endX - startX);
    const offset = Math.max(50, dx * 0.5);
    cp1X = startX + offset;
    cp1Y = startY;
    cp2X = endX - offset;
    cp2Y = endY;
  } else {
    // Target is to the left
    startX = source.x;
    startY = source.y + source.height / 2;
    endX = target.x + target.width;
    endY = target.y + target.height / 2;
    const dx = Math.abs(endX - startX);
    const offset = Math.max(50, dx * 0.5);
    cp1X = startX - offset;
    cp1Y = startY;
    cp2X = endX + offset;
    cp2Y = endY;
  }

  const path = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;
  const midX = Number(((startX + endX) / 2).toFixed(2));
  const midY = Number(((startY + endY) / 2).toFixed(2));

  return { path, midX, midY };
}

/**
 * Assembles full canvas data including nodes, edges, bounds, and distribution stats.
 */
export function buildSpatialCanvasData(
  messages: ChatMessage[],
): SpatialCanvasData {
  const nodes = extractSpatialNodes(messages);
  const edges = computeSpatialEdges(nodes);
  const bounds = computeCanvasBounds(nodes);

  const typeDistribution: Record<string, number> = {};
  for (const n of nodes) {
    typeDistribution[n.artifactType] =
      (typeDistribution[n.artifactType] || 0) + 1;
  }

  return {
    nodes,
    edges,
    bounds,
    stats: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      typeDistribution,
    },
  };
}

/**
 * Escapes a cell value strictly according to RFC 4180 CSV standard.
 * Double quotes are escaped with double quotes `""`, and values containing
 * commas, quotes, or newlines are wrapped in double quotes.
 */
export function escapeCsvCell(cell: unknown): string {
  if (cell === null || cell === undefined) return '""';
  const str = String(cell);
  if (
    str.includes('"') ||
    str.includes(",") ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Exports complete spatial canvas topology in strict RFC 4180 CSV format.
 */
export function spatialCanvasToCsv(canvas: SpatialCanvasData): string {
  const rows: string[][] = [];

  // Header row
  rows.push([
    "RecordType",
    "ID",
    "Type_Or_Relation",
    "Title_Or_Pair",
    "Summary_Or_Label",
    "Coordinates",
    "Metrics_Or_Strength",
  ]);

  if (!canvas) {
    return rows.map((r) => r.map(escapeCsvCell).join(",")).join("\r\n");
  }

  // Nodes
  if (Array.isArray(canvas.nodes)) {
    for (const n of canvas.nodes) {
      rows.push([
        "NODE",
        n.id,
        n.artifactType.toUpperCase(),
        n.title,
        n.summary,
        `${n.x},${n.y}`,
        n.metrics?.itemCount !== undefined
          ? `${n.metrics.itemCount} items`
          : "N/A",
      ]);
    }
  }

  // Edges
  if (Array.isArray(canvas.edges)) {
    for (const e of canvas.edges) {
      rows.push([
        "EDGE",
        e.id,
        e.relationType.toUpperCase(),
        `${e.sourceId} -> ${e.targetId}`,
        e.label,
        "N/A",
        `${Math.round(e.strength * 100)}%`,
      ]);
    }
  }

  return rows.map((r) => r.map(escapeCsvCell).join(",")).join("\r\n");
}

/**
 * Generates an executive Markdown briefing of the spatial canvas topology.
 */
export function spatialCanvasToMarkdown(canvas: SpatialCanvasData): string {
  if (!canvas) {
    return "# Spatial Intelligence Canvas Topology Briefing\n\nNo canvas data available.";
  }

  const sections: string[] = [];

  sections.push("# Spatial Intelligence Canvas Topology Briefing\n");
  sections.push(
    `**Total Artifact Nodes:** ${canvas.stats?.totalNodes ?? 0} | **Topological Wires:** ${canvas.stats?.totalEdges ?? 0}\n`,
  );

  // Distribution
  sections.push("## Artifact Type Distribution");
  const dist = canvas.stats?.typeDistribution || {};
  const distEntries = Object.entries(dist);
  if (distEntries.length === 0) {
    sections.push("- *No artifacts present*");
  } else {
    for (const [type, count] of distEntries) {
      sections.push(`- **${type.toUpperCase()}:** ${count} node(s)`);
    }
  }
  sections.push("");

  // Nodes table
  if (Array.isArray(canvas.nodes) && canvas.nodes.length > 0) {
    sections.push("## Canvas Artifact Nodes");
    sections.push("| ID | Type | Title | Summary | Coordinates | Metrics |");
    sections.push("| :--- | :--- | :--- | :--- | :--- | :--- |");
    for (const n of canvas.nodes) {
      const cleanTitle = (n.title || "").replace(/\|/g, "\\|");
      const cleanSummary = (n.summary || "")
        .replace(/\|/g, "\\|")
        .replace(/\r?\n/g, " ");
      const metricsSummary = n.metrics?.status
        ? `${n.metrics.status}${n.metrics.itemCount !== undefined ? ` (${n.metrics.itemCount} items)` : ""}`
        : "N/A";
      sections.push(
        `| \`${n.id}\` | \`${n.artifactType.toUpperCase()}\` | **${cleanTitle}** | ${cleanSummary} | \`(${n.x}, ${n.y})\` | ${metricsSummary} |`,
      );
    }
    sections.push("");
  }

  // Edges table
  if (Array.isArray(canvas.edges) && canvas.edges.length > 0) {
    sections.push("## Topological Relationships & Wires");
    sections.push("| Relationship | Source | Target | Label | Strength |");
    sections.push("| :--- | :--- | :--- | :--- | :--- |");
    for (const e of canvas.edges) {
      sections.push(
        `| \`${e.relationType.toUpperCase()}\` | \`${e.sourceId}\` | \`${e.targetId}\` | ${e.label} | ${Math.round(e.strength * 100)}% |`,
      );
    }
    sections.push("");
  }

  return sections.join("\n");
}
