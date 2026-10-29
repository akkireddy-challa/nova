import {
  GenerativeArtifact,
  SourceCitation,
  StudioMode,
  ResearchReport,
  DecisionMatrix,
} from "@/lib/types";

export interface FormattedBibliographyEntry {
  index: number;
  citationMarker: string; // e.g. "[1]"
  title: string;
  domain: string;
  url: string;
  formattedLine: string; // e.g. "[1] Title - Domain (URL)"
  author?: string;
  publishedDate?: string;
  relevanceScore?: number;
  relevanceLabel?: string; // e.g. "94% Relevance"
  snippet?: string;
}

export interface DossierMetadata {
  banner: string;
  title: string;
  artifactType: string;
  modeName: string;
  model: string;
  timestamp: string;
}

export interface ResolvedCitation {
  marker: string;
  number: number;
  title: string;
  url: string;
}

export interface ResolvedFinding {
  point: string;
  description: string;
  confidence: "high" | "medium" | "low";
  citations: ResolvedCitation[];
}

export interface CalculatedOptionScore {
  id: string;
  name: string;
  score: string;
  numericScore: number;
  pros: string[];
  cons: string[];
}

/**
 * Format a single source citation into the executive dossier bibliography format:
 * `[1] Title - Domain (URL)`
 */
export function formatBibliographyEntry(
  source: SourceCitation,
  index: number,
): FormattedBibliographyEntry {
  const safeIndex = index > 0 ? index : 1;
  const citationMarker = `[${safeIndex}]`;
  const cleanTitle = (source.title || "Untitled Reference").trim();
  const cleanDomain = (source.domain || "Web").trim();
  const cleanUrl = (source.url || "").trim();

  const formattedLine = cleanUrl
    ? `${citationMarker} ${cleanTitle} - ${cleanDomain} (${cleanUrl})`
    : `${citationMarker} ${cleanTitle} - ${cleanDomain}`;

  const entry: FormattedBibliographyEntry = {
    index: safeIndex,
    citationMarker,
    title: cleanTitle,
    domain: cleanDomain,
    url: cleanUrl,
    formattedLine,
    snippet: source.snippet ? source.snippet.trim() : undefined,
  };

  // Optional author if provided by extended source data
  const candidateAuthor = (source as { author?: string }).author;
  if (candidateAuthor && candidateAuthor.trim().length > 0) {
    entry.author = candidateAuthor.trim();
  }

  // Published date
  if (source.publishedDate && source.publishedDate.trim().length > 0) {
    entry.publishedDate = source.publishedDate.trim();
  }

  // Relevance score (0-100)
  if (
    typeof source.relevanceScore === "number" &&
    !Number.isNaN(source.relevanceScore)
  ) {
    entry.relevanceScore = Math.round(source.relevanceScore);
    entry.relevanceLabel = `${entry.relevanceScore}% Relevance`;
  }

  return entry;
}

/**
 * Prepares a full list of sources into formatted bibliography entries for print dossiers.
 * Filters out invalid entries and deduplicates by URL or id while preserving 1-based order.
 */
export function prepareBibliography(
  sources?: SourceCitation[] | null,
): FormattedBibliographyEntry[] {
  if (!sources || !Array.isArray(sources) || sources.length === 0) {
    return [];
  }

  const seenUrls = new Set<string>();
  const validSources: SourceCitation[] = [];

  for (const src of sources) {
    if (!src) continue;
    const key = (src.url || src.id || "").trim().toLowerCase();
    if (key && seenUrls.has(key)) {
      continue;
    }
    if (key) {
      seenUrls.add(key);
    }
    validSources.push(src);
  }

  return validSources.map((src, idx) => formatBibliographyEntry(src, idx + 1));
}

/**
 * Format timestamp into executive dossier date string (e.g. "October 28, 2026 • 19:30 UTC").
 */
export function formatDossierDate(
  input?: Date | string | number | null,
): string {
  let date: Date;

  if (!input) {
    date = new Date();
  } else if (input instanceof Date) {
    date = input;
  } else {
    date = new Date(input);
  }

  if (Number.isNaN(date.getTime())) {
    date = new Date();
  }

  const formattedDate = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  const formattedTime = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });

  return `${formattedDate} • ${formattedTime} UTC`;
}

/**
 * Extracts and maps executive dossier metadata for cover banner, mode, model, and timestamp.
 */
export function getArtifactMetadata(
  artifact: GenerativeArtifact,
  mode?: StudioMode,
  model?: string,
  customDate?: Date | string | number,
): DossierMetadata {
  const banner = "NOVA RESEARCH INTELLIGENCE // EXECUTIVE DOSSIER";

  let title = "Executive Intelligence Dossier";
  let modeName = "Research Synthesis";

  switch (artifact.type) {
    case "research":
      title = artifact.data.title || "Executive Research Report";
      modeName = "Research Synthesis";
      break;
    case "plan":
      title = artifact.data.goal || "Strategic Execution Plan";
      modeName = "Strategic Planner";
      break;
    case "matrix":
      title = artifact.data.topic || "Decision & Evaluation Matrix";
      modeName = "Comparative Decision Matrix";
      break;
    case "chart":
      title = artifact.data.title || "Quantitative Data Analysis";
      modeName = "Data Analysis & Visuals";
      break;
    case "code":
      title = artifact.data.filename || "Technical Architecture & Code";
      modeName = "Technical Specification";
      break;
    case "debate":
      title = artifact.data.topic || "Multi-Agent Dialectical Debate";
      modeName = "Multi-Agent Debate Analysis";
      break;
    case "council":
      title = artifact.data.topic || "Multi-Persona Executive Council";
      modeName = "Executive Council Briefing";
      break;
    case "simulation":
      title = artifact.data.title || "Resilience Chaos Simulation";
      modeName = "Resilience & Chaos Simulation";
      break;
    case "audio_briefing":
      title = artifact.data.title || "Multimodal Audio Briefing";
      modeName = "Audio Narration Briefing";
      break;
    case "battlecard":
      title = artifact.data.topic || "Competitive Moat Battle-Card";
      modeName = "Competitive Intelligence Battle-Card";
      break;
    case "pareto_frontier":
      title = artifact.data.topic || "Cost-Latency Pareto Frontier";
      modeName = "Pareto Routing Optimizer";
      break;
    case "eval_suite":
      title = artifact.data.topic || "Automated Regression Evaluation Suite";
      modeName = "Dynamic Regression Evaluator";
      break;
    case "red_team_audit":
      title = artifact.data.topic || "Dialectic Red-Team Security Audit";
      modeName = "Adversarial Red-Team Auditor";
      break;
    case "guardrail_policy":
      title = artifact.data.topic || "Semantic Guardrail Policy";
      modeName = "Semantic Guardrail Policy";
      break;
    case "multimodal_inspection":
      title = artifact.data.topic || "Multimodal Vision Inspector";
      modeName = "Multimodal Vision Grounding";
      break;
    case "memory_graph":
      title = artifact.data.topic || "Memory & Knowledge Graph";
      modeName = "Graph RAG Memory Studio";
      break;
    case "audio_spectrogram":
      title = artifact.data.topic || "Acoustic Spectrogram Inspector";
      modeName = "Acoustic Spectrogram Inspector";
      break;
    case "prompt_optimizer":
      title = artifact.data.targetTask || "Prompt Evolution Studio";
      modeName = "DSPy Prompt Evolution Studio";
      break;
    case "vector_space":
      title = artifact.data.datasetTitle || "Vector Space Studio";
      modeName = "Vector Space & Clustering Studio";
      break;
    case "causal_dag":
      title = artifact.data.hypothesis || "Causal Inference Studio";
      modeName = "Causal Inference & SCM Studio";
      break;
    case "bayesian_opt":
      title = artifact.data.title || "Bayesian Optimization Studio";
      modeName = "Bayesian Optimization & Hyperparameter Studio";
      break;
    case "workflow_orchestrator":
      title = artifact.data.title || "Workflow Orchestrator Studio";
      modeName = "Event-Driven Workflow Orchestrator";
      break;
    case "formal_prover":
      title = artifact.data.title || "Formal Verification Studio";
      modeName = "Automated Theorem Prover & SMT Verification";
      break;
    case "epistemic_consensus":
      title = artifact.data.title || "Epistemic Consensus Studio";
      modeName = "Bayesian Truth Serum Consensus";
      break;
  }

  if (mode) {
    const modeLabels: Record<StudioMode, string> = {
      research: "Research Synthesis",
      planner: "Strategic Planner",
      canvas: "Executive Canvas",
      coder: "Technical Architecture",
      matrix: "Comparative Decision Matrix",
      debate: "Multi-Agent Debate Analysis",
      persona: "Executive Council Studio",
      intelligence: "Intelligence Memory",
      mcp: "Tool & API Integrations",
    };
    if (modeLabels[mode]) {
      modeName = modeLabels[mode];
    }
  }

  const resolvedModel =
    model && model.trim().length > 0 ? model.trim() : "nova-autonomous-v1";

  const timestamp = formatDossierDate(customDate);

  return {
    banner,
    title,
    artifactType: artifact.type,
    modeName,
    model: resolvedModel,
    timestamp,
  };
}

/**
 * Matches findings with visible citation numbers `[1]`, `[2]` corresponding to the bibliography.
 */
export function resolveFindingCitations(
  findings: ResearchReport["keyFindings"],
  sources?: SourceCitation[],
): ResolvedFinding[] {
  if (!findings || !Array.isArray(findings)) {
    return [];
  }

  const sourcesList = sources || [];

  return findings.map((f) => {
    const citations: ResolvedCitation[] = (f.citationIds || [])
      .map((cId) => {
        const sourceIndex = sourcesList.findIndex((s) => s.id === cId);
        if (sourceIndex >= 0) {
          const num = sourceIndex + 1;
          return {
            marker: `[${num}]`,
            number: num,
            title: sourcesList[sourceIndex].title || "",
            url: sourcesList[sourceIndex].url || "",
          };
        }
        // If not found by ID, check if citation ID is numeric (e.g. "c1", "1")
        const parsedNum = parseInt(cId.replace(/\D/g, ""), 10);
        if (!Number.isNaN(parsedNum) && parsedNum > 0) {
          return {
            marker: `[${parsedNum}]`,
            number: parsedNum,
            title: "",
            url: "",
          };
        }
        return null;
      })
      .filter((c): c is ResolvedCitation => c !== null);

    return {
      point: f.point,
      description: f.description,
      confidence: f.confidence,
      citations,
    };
  });
}

/**
 * Calculates dynamic or default weighted scores for decision matrix options.
 */
export function calculateMatrixOptionScores(
  matrix: DecisionMatrix,
  customWeights?: Record<string, number>,
): CalculatedOptionScore[] {
  if (
    !matrix ||
    !Array.isArray(matrix.options) ||
    !Array.isArray(matrix.criteria)
  ) {
    return [];
  }

  return matrix.options.map((opt) => {
    let dynamicScore = 0;
    let totalWeight = 0;

    matrix.criteria.forEach((c) => {
      const weight =
        customWeights && typeof customWeights[c.id] === "number"
          ? customWeights[c.id]
          : c.weight;
      totalWeight += weight;
      dynamicScore += (opt.scores[c.id] || 0) * weight;
    });

    const numericScore =
      totalWeight > 0 ? parseFloat((dynamicScore / totalWeight).toFixed(1)) : 0;

    return {
      id: opt.id,
      name: opt.name,
      score: numericScore.toFixed(1),
      numericScore,
      pros: opt.pros || [],
      cons: opt.cons || [],
    };
  });
}

/**
 * Strips interactive UI controls (buttons, inputs, sliders, select tags, onclick handlers)
 * from HTML or markup to guarantee clean, non-interactive printable output.
 */
export function stripInteractiveArtifacts(content: string): string {
  if (!content) return "";

  return (
    content
      // Remove button tags and contents
      .replace(/<button\b[^>]*>[\s\S]*?<\/button>/gi, "")
      // Remove input tags
      .replace(/<input\b[^>]*\/?>/gi, "")
      // Remove select tags
      .replace(/<select\b[^>]*>[\s\S]*?<\/select>/gi, "")
      // Remove interactive attributes
      .replace(/\son[a-z]+="[^"]*"/gi, "")
      .replace(/\son[a-z]+='[^']*'/gi, "")
      // Remove tooltip attributes
      .replace(/\stitle="[^"]*"/gi, "")
      // Remove data-interactive markers
      .replace(/\sdata-interactive(?:="[^"]*")?/gi, "")
      .trim()
  );
}
