/**
 * Dialectic Debate Analysis & Adjudication Engine.
 *
 * Core pure calculation and deterministic synthesis engine for the
 * Multi-Agent Dialectic Debate Arena.
 *
 * Capabilities:
 * - Deterministic Consensus Density Scoring (0-100) based on lexical overlap,
 *   domain keywords, and concession/dispute linguistic markers.
 * - Factual Claim & Counter-Claim Evidence Extraction.
 * - Semantic Alignment & Shared Agreement Discovery.
 * - Irreconcilable Architectural Trade-off Identification with Severity Triage.
 * - Neutral Arbiter Adjudication with Confidence & Decisive Factors.
 * - 3-Round Dialectic Progression Sequencing (Theses, Cross-Examination, Adjudication).
 * - RFC 4180 Compliant CSV Export with Escaped Quotes.
 * - Formatted Markdown Briefing Report Generation.
 *
 * Strictly ZERO pseudorandom generation or invented synthetic telemetry.
 * 100% deterministic calculations derived from real debate perspectives.
 */

import { DebateArtifact, DebatePerspective } from "@/lib/types";

export interface IrreconcilableTradeoff {
  dimension: string;
  advocateAdvantage: string;
  criticRisk: string;
  severity: "high" | "medium" | "low";
}

export interface ArbiterRuling {
  winner: "advocate_favored" | "critic_favored" | "balanced_compromise";
  confidenceScore: number; // 0-100
  decisiveFactors: string[];
  strategicRecommendation: string;
}

export interface DebateRound {
  round: 1 | 2 | 3;
  name: string; // e.g. 'Opening Theses', 'Cross-Examination & Stress Tests', 'Arbiter Adjudication'
  advocateStatement: string;
  criticStatement: string;
  consensusDelta: number;
}

export interface DialecticDebateAnalysis {
  consensusScore: number; // 0-100
  advocateEvidenceCount: number;
  criticEvidenceCount: number;
  sharedAgreements: string[];
  irreconcilableTradeoffs: IrreconcilableTradeoff[];
  arbiterRuling: ArbiterRuling;
  debateRounds: DebateRound[];
}

export interface StancePerspectives {
  advocate?: DebatePerspective;
  critic?: DebatePerspective;
  arbiter?: DebatePerspective;
}

/** Standard English stopwords excluded during semantic tokenization */
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
  "cannot",
  "could",
  "did",
  "do",
  "does",
  "doing",
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
  "will",
  "with",
  "would",
  "you",
  "your",
  "yours",
]);

/** Concession & consensus linguistic markers */
const CONCESSION_MARKERS = [
  "agree",
  "agreed",
  "agreement",
  "acknowledge",
  "acknowledges",
  "acknowledged",
  "concede",
  "concedes",
  "concession",
  "valid point",
  "common ground",
  "aligned",
  "consensus",
  "merit",
  "undeniable",
  "indisputable",
  "clear benefit",
  "granted",
  "acceptable trade-off",
  "acceptable tradeoff",
  "shared reality",
  "mutually",
];

/** Severe dispute & blocker linguistic markers */
const DISPUTE_MARKERS = [
  "fatal",
  "flaw",
  "dealbreaker",
  "unacceptable",
  "impossible",
  "catastrophic",
  "prohibitive",
  "reject",
  "untenable",
  "severe vulnerability",
  "blocker",
  "no compromise",
  "disagree",
  "unviable",
  "prohibitively",
  "disastrous",
  "critical risk",
  "data loss",
  "security breach",
];

/** Predefined architectural trade-off dimensions and keyword heuristics */
interface DimensionHeuristic {
  dimension: string;
  keywords: string[];
  severityDefault: "high" | "medium" | "low";
}

const DIMENSION_HEURISTICS: DimensionHeuristic[] = [
  {
    dimension: "Performance & Latency vs. Operational Complexity",
    keywords: [
      "performance",
      "latency",
      "throughput",
      "speed",
      "complexity",
      "overhead",
      "maintenance",
      "operational",
      "learning curve",
      "cognitive",
      "debugging",
    ],
    severityDefault: "medium",
  },
  {
    dimension: "Financial Cost vs. Resource Efficiency & Scale",
    keywords: [
      "cost",
      "budget",
      "pricing",
      "expensive",
      "spend",
      "resource",
      "bill",
      "cloud",
      "tco",
      "infrastructure",
      "financial",
    ],
    severityDefault: "high",
  },
  {
    dimension: "Developer Velocity vs. Type Safety & Rigorous Governance",
    keywords: [
      "velocity",
      "productivity",
      "ergonomics",
      "developer",
      "types",
      "safety",
      "rigor",
      "governance",
      "validation",
      "linting",
      "strict",
    ],
    severityDefault: "medium",
  },
  {
    dimension: "System Reliability & Fault Tolerance vs. Innovation Velocity",
    keywords: [
      "reliability",
      "uptime",
      "failure",
      "resilience",
      "crash",
      "fault",
      "blast radius",
      "redundancy",
      "sla",
      "outage",
    ],
    severityDefault: "high",
  },
  {
    dimension: "Rapid Modernization vs. Security & Attack Surface",
    keywords: [
      "security",
      "vulnerability",
      "attack",
      "surface",
      "exploit",
      "cve",
      "auth",
      "compliance",
      "audit",
      "injection",
      "breach",
    ],
    severityDefault: "high",
  },
  {
    dimension: "Architectural Flexibility vs. System Standardization",
    keywords: [
      "flexibility",
      "modular",
      "extensible",
      "standardization",
      "consistency",
      "fragmentation",
      "cohesion",
      "decoupling",
    ],
    severityDefault: "medium",
  },
  {
    dimension: "Vendor Independence vs. Managed Ecosystem Convenience",
    keywords: [
      "vendor",
      "lock-in",
      "proprietary",
      "portability",
      "managed",
      "self-hosted",
      "ecosystem",
      "cloud-native",
    ],
    severityDefault: "medium",
  },
];

/**
 * Evaluates severity ('high' | 'medium' | 'low') deterministically based on risk language.
 */
export function evaluateSeverity(
  text: string,
  defaultSeverity: "high" | "medium" | "low" = "medium",
): "high" | "medium" | "low" {
  if (!text || typeof text !== "string") return defaultSeverity;
  const lower = text.toLowerCase();

  const highMarkers = [
    "fatal",
    "catastrophic",
    "unacceptable",
    "data loss",
    "security breach",
    "critical",
    "vulnerability",
    "exploit",
    "cve",
    "kernel panic",
    "prohibitive",
    "disastrous",
    "blocker",
    "outage",
  ];

  const lowMarkers = [
    "minor",
    "manageable",
    "slight",
    "temporary",
    "trivial",
    "cosmetic",
    "marginal",
  ];

  for (const marker of highMarkers) {
    if (lower.includes(marker)) return "high";
  }

  for (const marker of lowMarkers) {
    if (lower.includes(marker)) return "low";
  }

  return defaultSeverity;
}

/**
 * Tokenizes text into normalized domain keywords.
 * Excludes stopwords, punctuation, and short tokens.
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
 * Computes Jaccard similarity index between two token sets.
 * Returns a value between 0.0 and 1.0.
 */
export function computeJaccardSimilarity(
  tokensA: string[],
  tokensB: string[],
): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  let intersectionCount = 0;
  for (const token of setA) {
    if (setB.has(token)) {
      intersectionCount++;
    }
  }

  const unionCount = new Set([...tokensA, ...tokensB]).size;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

/**
 * Deterministically splits input text items into distinct factual claims or assertions.
 * Handles multiline inputs, bullet points, and numbered lists.
 */
export function extractAssertions(items?: string[]): string[] {
  if (!Array.isArray(items) || items.length === 0) return [];

  const assertions: string[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== "string") continue;
    // Split on newlines or explicit bullet prefixes
    const lines = raw
      .split(/\r?\n|•|(?<=\.)\s+(?=[A-Z0-9])/)
      .map((s) => s.trim());
    for (const line of lines) {
      const clean = line.replace(/^[-*–—\d.)\]\s]+/, "").trim();
      if (clean.length >= 5) {
        assertions.push(clean);
      }
    }
  }
  return assertions;
}

/**
 * Filters perspectives by target stance or groups perspectives into stance map.
 */
export function getPerspectivesByStance(
  perspectives: DebatePerspective[],
  target: "advocate" | "critic" | "arbiter",
): DebatePerspective[];
export function getPerspectivesByStance(
  debateOrPerspectives: DebateArtifact | DebatePerspective[],
): StancePerspectives;
export function getPerspectivesByStance(
  input: DebateArtifact | DebatePerspective[],
  target?: "advocate" | "critic" | "arbiter",
): DebatePerspective[] | StancePerspectives {
  const perspectives: DebatePerspective[] = Array.isArray(input)
    ? input
    : input?.perspectives || [];

  if (target) {
    return perspectives.filter((p) => {
      if (!p || !p.stance) return false;
      const s = p.stance.toLowerCase();
      if (target === "advocate") {
        return (
          s.includes("advocate") || s.includes("pro") || s.includes("thesis")
        );
      }
      if (target === "critic") {
        return (
          s.includes("critic") ||
          s.includes("antithesis") ||
          s.includes("skeptic") ||
          s.includes("oppon")
        );
      }
      if (target === "arbiter") {
        return (
          s.includes("arbiter") ||
          s.includes("neutral") ||
          s.includes("synthesis") ||
          s.includes("judge")
        );
      }
      return false;
    });
  }

  const advocates = perspectives.filter((p) => {
    const s = p?.stance?.toLowerCase() || "";
    return s.includes("advocate") || s.includes("pro") || s.includes("thesis");
  });
  const critics = perspectives.filter((p) => {
    const s = p?.stance?.toLowerCase() || "";
    return (
      s.includes("critic") ||
      s.includes("antithesis") ||
      s.includes("skeptic") ||
      s.includes("oppon")
    );
  });
  const arbiters = perspectives.filter((p) => {
    const s = p?.stance?.toLowerCase() || "";
    return (
      s.includes("arbiter") ||
      s.includes("neutral") ||
      s.includes("synthesis") ||
      s.includes("judge")
    );
  });

  return {
    advocate: advocates[0],
    critic: critics[0],
    arbiter: arbiters[0],
  };
}

/**
 * Computes deterministic consensus score (0-100) representing agreement density.
 *
 * Factors:
 * 1. Semantic keyword Jaccard overlap between Advocate and Critic statements.
 * 2. Concession markers found in claims, caveats, and consensus summary (+bonus).
 * 3. Severe dispute markers (-penalty).
 * 4. Presence and alignment of consensusSummary and synthesisVerdict.
 */
export function calculateConsensusScore(debate: DebateArtifact): number {
  if (
    !debate ||
    !Array.isArray(debate.perspectives) ||
    debate.perspectives.length === 0
  ) {
    return 0;
  }

  const advocates = getPerspectivesByStance(debate.perspectives, "advocate");
  const critics = getPerspectivesByStance(debate.perspectives, "critic");

  // If no opposing sides exist, evaluate single-sided coherence
  if (advocates.length === 0 || critics.length === 0) {
    return debate.consensusSummary && debate.consensusSummary.trim().length > 10
      ? 30
      : 15;
  }

  const advocateText = advocates
    .flatMap((p) => [...(p.arguments || []), ...(p.caveats || [])])
    .join(" ");
  const criticText = critics
    .flatMap((p) => [...(p.arguments || []), ...(p.caveats || [])])
    .join(" ");

  const advocateTokens = tokenizeText(advocateText);
  const criticTokens = tokenizeText(criticText);

  if (advocateTokens.length === 0 || criticTokens.length === 0) {
    return 20;
  }

  // Jaccard similarity scaled (typically 0.10 to 0.45 in rich technical debates)
  const jaccard = computeJaccardSimilarity(advocateTokens, criticTokens);
  let score = Math.round(jaccard * 140); // 0.25 jaccard -> 35 points

  // Concession markers
  const fullDebateText = (
    advocateText +
    " " +
    criticText +
    " " +
    (debate.consensusSummary || "") +
    " " +
    (debate.synthesisVerdict || "")
  ).toLowerCase();

  let concessionCount = 0;
  for (const marker of CONCESSION_MARKERS) {
    if (fullDebateText.includes(marker)) {
      concessionCount++;
    }
  }
  score += Math.min(30, concessionCount * 6);

  // Dispute / Blocker penalties
  let disputeCount = 0;
  for (const marker of DISPUTE_MARKERS) {
    if (fullDebateText.includes(marker)) {
      disputeCount++;
    }
  }
  score -= Math.min(25, disputeCount * 5);

  // Bonus if consensusSummary exists and contains constructive alignment
  if (debate.consensusSummary && debate.consensusSummary.trim().length > 20) {
    const summaryLower = debate.consensusSummary.toLowerCase();
    score += 15;
    if (
      summaryLower.includes("both") ||
      summaryLower.includes("agree") ||
      summaryLower.includes("consensus") ||
      summaryLower.includes("aligned")
    ) {
      score += 10;
    }
  }

  // Synthesis verdict tone check
  if (debate.synthesisVerdict && debate.synthesisVerdict.trim().length > 10) {
    const verdictLower = debate.synthesisVerdict.toLowerCase();
    if (
      verdictLower.includes("compromise") ||
      verdictLower.includes("balance") ||
      verdictLower.includes("hybrid")
    ) {
      score += 10;
    }
  }

  // Strictly clamp between 0 and 100
  return Math.max(0, Math.min(100, score));
}

/**
 * Extracts shared agreements where both perspectives acknowledge the same
 * technical, operational, or architectural realities.
 */
export function extractSharedAgreements(debate: DebateArtifact): string[] {
  if (!debate) return [];
  const agreements: string[] = [];
  const seen = new Set<string>();

  function addAgreement(text: string) {
    const clean = text.trim();
    if (clean.length > 10 && !seen.has(clean.toLowerCase())) {
      seen.add(clean.toLowerCase());
      agreements.push(clean);
    }
  }

  // 1. Extract from consensusSummary if available
  if (debate.consensusSummary && debate.consensusSummary.trim().length > 0) {
    const summarySentences = debate.consensusSummary
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);

    for (const sentence of summarySentences) {
      const lower = sentence.toLowerCase();
      if (
        lower.includes("both") ||
        lower.includes("agree") ||
        lower.includes("consensus") ||
        lower.includes("concur") ||
        lower.includes("shared") ||
        lower.includes("acknowledge") ||
        lower.includes("recognize") ||
        lower.includes("common ground")
      ) {
        addAgreement(sentence);
      }
    }
    // If no explicit trigger words matched, but consensusSummary is substantive, add full summary
    if (agreements.length === 0 && debate.consensusSummary.trim().length > 15) {
      addAgreement(debate.consensusSummary.trim());
    }
  }

  // 2. Discover cross-perspective acknowledgments (Advocate caveats matching Critic arguments)
  const advocates = getPerspectivesByStance(
    debate.perspectives || [],
    "advocate",
  );
  const critics = getPerspectivesByStance(debate.perspectives || [], "critic");

  const advocateCaveats = advocates.flatMap((p) => p.caveats || []);
  const criticArgs = critics.flatMap((p) => p.arguments || []);

  for (const caveat of advocateCaveats) {
    const cavTokens = tokenizeText(caveat);
    if (cavTokens.length === 0) continue;

    for (const arg of criticArgs) {
      const argTokens = tokenizeText(arg);
      const overlap = cavTokens.filter((t) => argTokens.includes(t));
      if (overlap.length >= 2) {
        addAgreement(
          `Mutual recognition of operational considerations: Advocate caveats align with Critic concerns regarding ${overlap.slice(0, 3).join(", ")}.`,
        );
        break;
      }
    }
    if (agreements.length >= 4) break;
  }

  return agreements;
}

/**
 * Extracts irreconcilable architectural tradeoffs across defined engineering dimensions.
 */
export function extractIrreconcilableTradeoffs(
  debate: DebateArtifact,
): IrreconcilableTradeoff[] {
  if (!debate || !Array.isArray(debate.perspectives)) return [];

  const advocates = getPerspectivesByStance(debate.perspectives, "advocate");
  const critics = getPerspectivesByStance(debate.perspectives, "critic");

  if (advocates.length === 0 || critics.length === 0) return [];

  const advocateArgs = advocates
    .flatMap((p) => p.arguments || [])
    .filter(Boolean);
  const criticArgs = critics.flatMap((p) => p.arguments || []).filter(Boolean);
  const criticCaveats = critics.flatMap((p) => p.caveats || []).filter(Boolean);
  const allCriticPoints = [...criticArgs, ...criticCaveats];

  if (advocateArgs.length === 0 || allCriticPoints.length === 0) return [];

  const tradeoffs: IrreconcilableTradeoff[] = [];
  const matchedDimensions = new Set<string>();

  for (const heur of DIMENSION_HEURISTICS) {
    // Check if advocate has an argument matching this dimension
    const matchingAdv = advocateArgs.find((arg) => {
      const lower = arg.toLowerCase();
      return heur.keywords.some((kw) => lower.includes(kw));
    });

    // Check if critic has a counter-point matching this dimension
    const matchingCrit = allCriticPoints.find((point) => {
      const lower = point.toLowerCase();
      return heur.keywords.some((kw) => lower.includes(kw));
    });

    if (matchingAdv && matchingCrit) {
      matchedDimensions.add(heur.dimension);
      const severity = evaluateSeverity(matchingCrit, heur.severityDefault);

      tradeoffs.push({
        dimension: heur.dimension,
        advocateAdvantage: matchingAdv,
        criticRisk: matchingCrit,
        severity,
      });
    }

    if (tradeoffs.length >= 5) break;
  }

  // Fallback: If no predefined dimensions matched, pair the primary advocate and critic points
  if (
    tradeoffs.length === 0 &&
    advocateArgs.length > 0 &&
    allCriticPoints.length > 0
  ) {
    const severity = evaluateSeverity(allCriticPoints[0], "medium");

    tradeoffs.push({
      dimension: "Primary Strategic & Technical Tension",
      advocateAdvantage: advocateArgs[0],
      criticRisk: allCriticPoints[0],
      severity,
    });
  }

  return tradeoffs;
}

/**
 * Adjudicates the debate deterministically, determining the winner,
 * confidence score, decisive factors, and strategic recommendation.
 */
export function determineArbiterRuling(
  debate: DebateArtifact,
  advocateEvidenceCount: number,
  criticEvidenceCount: number,
  tradeoffs: IrreconcilableTradeoff[],
  consensusScore: number,
): ArbiterRuling {
  if (
    !debate ||
    !Array.isArray(debate.perspectives) ||
    debate.perspectives.length === 0
  ) {
    return {
      winner: "balanced_compromise",
      confidenceScore: 0,
      decisiveFactors: ["No perspectives available to analyze."],
      strategicRecommendation:
        "No debate perspectives provided. Conduct discovery before adjudicating.",
    };
  }

  const synthesis = (debate.synthesisVerdict || "").toLowerCase();
  const consensus = (debate.consensusSummary || "").toLowerCase();
  const combined = synthesis + " " + consensus;

  let winner: "advocate_favored" | "critic_favored" | "balanced_compromise" =
    "balanced_compromise";
  let explicitVerdictDetected = false;

  // 1. Textual verdict cues
  if (
    combined.includes("favor advocate") ||
    combined.includes("favors advocate") ||
    combined.includes("advocate-favored") ||
    combined.includes("recommend adoption") ||
    combined.includes("proceed with implementation") ||
    combined.includes("benefits decisively outweigh") ||
    combined.includes("advocate presents the stronger case")
  ) {
    winner = "advocate_favored";
    explicitVerdictDetected = true;
  } else if (
    combined.includes("favor critic") ||
    combined.includes("favors critic") ||
    combined.includes("critic-favored") ||
    combined.includes("reject proposal") ||
    combined.includes("premature to adopt") ||
    combined.includes("risks outweigh") ||
    combined.includes("block adoption") ||
    combined.includes("critic presents decisive") ||
    combined.includes("defer adoption")
  ) {
    winner = "critic_favored";
    explicitVerdictDetected = true;
  } else if (
    combined.includes("balanced compromise") ||
    combined.includes("hybrid") ||
    combined.includes("phased rollout") ||
    combined.includes("middle ground") ||
    combined.includes("pilot")
  ) {
    winner = "balanced_compromise";
    explicitVerdictDetected = true;
  }

  // 2. Empirical fallback if no explicit text cues
  if (!explicitVerdictDetected) {
    const highSeverityRisks = tradeoffs.filter(
      (t) => t.severity === "high",
    ).length;

    if (
      highSeverityRisks >= 2 &&
      criticEvidenceCount >= advocateEvidenceCount
    ) {
      winner = "critic_favored";
    } else if (
      advocateEvidenceCount > criticEvidenceCount * 1.5 &&
      highSeverityRisks === 0
    ) {
      winner = "advocate_favored";
    } else {
      winner = "balanced_compromise";
    }
  }

  // 3. Confidence score calculation (0-100)
  const totalEvidence = advocateEvidenceCount + criticEvidenceCount;
  let confidence = 50;
  confidence += Math.min(25, totalEvidence * 4);
  if (explicitVerdictDetected) confidence += 10;
  if (debate.synthesisVerdict && debate.synthesisVerdict.trim().length > 30)
    confidence += 10;
  if (tradeoffs.length >= 2) confidence += 5;
  const confidenceScore = Math.max(10, Math.min(100, confidence));

  // 4. Decisive factors
  const decisiveFactors: string[] = [];
  decisiveFactors.push(
    `Evidence balance: ${advocateEvidenceCount} advocate claim(s) vs ${criticEvidenceCount} critic risk/counter-claim(s).`,
  );

  if (tradeoffs.length > 0) {
    const topTradeoff = tradeoffs[0];
    decisiveFactors.push(
      `Core tension in ${topTradeoff.dimension} (Severity: ${topTradeoff.severity.toUpperCase()}).`,
    );
  }

  if (consensusScore >= 60) {
    decisiveFactors.push(
      `High consensus alignment (${consensusScore}/100) on foundational system constraints.`,
    );
  } else {
    decisiveFactors.push(
      `Low consensus density (${consensusScore}/100) reflects divergent operational philosophies.`,
    );
  }

  if (debate.synthesisVerdict && debate.synthesisVerdict.trim().length > 15) {
    decisiveFactors.push(
      `Synthesis adjudication: "${debate.synthesisVerdict.trim()}"`,
    );
  }

  // 5. Strategic recommendation
  let strategicRecommendation: string;
  if (debate.synthesisVerdict && debate.synthesisVerdict.trim().length > 20) {
    strategicRecommendation = debate.synthesisVerdict.trim();
  } else if (winner === "advocate_favored") {
    strategicRecommendation =
      "Proceed with architectural adoption, establishing strict mitigation guardrails against surfaced operational overhead.";
  } else if (winner === "critic_favored") {
    strategicRecommendation =
      "Defer full-scale adoption until identified high-severity stability, security, or complexity risks are remediated.";
  } else {
    strategicRecommendation =
      "Execute a scoped, low-risk pilot on non-critical workloads to validate performance gains before broader commitment.";
  }

  return {
    winner,
    confidenceScore,
    decisiveFactors,
    strategicRecommendation,
  };
}

/**
 * Generates 3 sequential dialectic rounds simulating the debate progression.
 */
export function generateDebateRounds(
  debate: DebateArtifact,
  consensusScore: number,
): DebateRound[] {
  const advocates = getPerspectivesByStance(
    debate?.perspectives || [],
    "advocate",
  );
  const critics = getPerspectivesByStance(debate?.perspectives || [], "critic");

  const advocateArgs = advocates
    .flatMap((p) => p.arguments || [])
    .filter(Boolean);
  const advocateCaveats = advocates
    .flatMap((p) => p.caveats || [])
    .filter(Boolean);

  const criticArgs = critics.flatMap((p) => p.arguments || []).filter(Boolean);
  const criticCaveats = critics.flatMap((p) => p.caveats || []).filter(Boolean);

  // Round 1: Opening Theses
  const r1Advocate =
    advocateArgs[0] ||
    (advocates.length === 0
      ? "Advocate did not submit an opening thesis."
      : "Advocate submits primary adoption thesis.");
  const r1Critic =
    criticArgs[0] ||
    (critics.length === 0
      ? "Critic did not submit an opening counter-thesis."
      : "Critic submits opening counter-thesis.");
  const r1Delta = Math.round(consensusScore * 0.25);

  // Round 2: Cross-Examination & Stress Tests
  const r2Advocate =
    advocateArgs[1] ||
    advocateCaveats[0] ||
    "Advocate acknowledges implementation constraints while maintaining performance advantage.";
  const r2Critic =
    criticCaveats[0] ||
    criticArgs[1] ||
    "Critic challenges failure recovery modes and long-term maintenance overhead.";
  const r2Delta = Math.round(consensusScore * 0.35);

  // Round 3: Arbiter Adjudication
  const r3Advocate =
    advocateCaveats[0] ||
    advocateArgs[advocateArgs.length - 1] ||
    "Advocate concedes boundary conditions and proposes phased adoption.";
  const r3Critic =
    criticCaveats[criticCaveats.length - 1] ||
    criticArgs[criticArgs.length - 1] ||
    "Critic concedes targeted performance benefits provided risk guardrails are enforced.";
  const r3Delta = Math.round(consensusScore * 0.4);

  return [
    {
      round: 1,
      name: "Opening Theses",
      advocateStatement: r1Advocate,
      criticStatement: r1Critic,
      consensusDelta: r1Delta,
    },
    {
      round: 2,
      name: "Cross-Examination & Stress Tests",
      advocateStatement: r2Advocate,
      criticStatement: r2Critic,
      consensusDelta: r2Delta,
    },
    {
      round: 3,
      name: "Arbiter Adjudication",
      advocateStatement: r3Advocate,
      criticStatement: r3Critic,
      consensusDelta: r3Delta,
    },
  ];
}

/**
 * Main deterministic dialectic analysis function.
 * Evaluates agreement density, evidence counts, shared ground,
 * irreconcilable trade-offs, arbiter ruling, and round progression.
 */
export function analyzeDialecticDebate(
  debate: DebateArtifact,
): DialecticDebateAnalysis {
  if (!debate) {
    return {
      consensusScore: 0,
      advocateEvidenceCount: 0,
      criticEvidenceCount: 0,
      sharedAgreements: [],
      irreconcilableTradeoffs: [],
      arbiterRuling: {
        winner: "balanced_compromise",
        confidenceScore: 0,
        decisiveFactors: ["No debate artifact provided."],
        strategicRecommendation: "No data available.",
      },
      debateRounds: [],
    };
  }

  const advocates = getPerspectivesByStance(
    debate.perspectives || [],
    "advocate",
  );
  const critics = getPerspectivesByStance(debate.perspectives || [], "critic");

  // Evidence counts
  const advocateAssertions = extractAssertions(
    advocates.flatMap((p) => p.arguments || []),
  );
  const criticAssertions = extractAssertions([
    ...critics.flatMap((p) => p.arguments || []),
    ...critics.flatMap((p) => p.caveats || []),
  ]);

  const advocateEvidenceCount = advocateAssertions.length;
  const criticEvidenceCount = criticAssertions.length;

  // Consensus score
  const consensusScore = calculateConsensusScore(debate);

  // Shared agreements
  const sharedAgreements = extractSharedAgreements(debate);

  // Irreconcilable trade-offs
  const irreconcilableTradeoffs = extractIrreconcilableTradeoffs(debate);

  // Arbiter ruling
  const arbiterRuling = determineArbiterRuling(
    debate,
    advocateEvidenceCount,
    criticEvidenceCount,
    irreconcilableTradeoffs,
    consensusScore,
  );

  // 3-round sequence
  const debateRounds = generateDebateRounds(debate, consensusScore);

  return {
    consensusScore,
    advocateEvidenceCount,
    criticEvidenceCount,
    sharedAgreements,
    irreconcilableTradeoffs,
    arbiterRuling,
    debateRounds,
  };
}

/**
 * Escapes a single cell value for strict RFC 4180 CSV compliance.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts a debate artifact and its dialectic analysis to an RFC 4180 compliant CSV.
 * Columns: Round,Perspective,Stance,Statement/Argument,Severity/Confidence,ConsensusScore
 */
export function debateToCsv(
  debate: DebateArtifact,
  analysis: DialecticDebateAnalysis,
): string {
  const headers = [
    "Round",
    "Perspective",
    "Stance",
    "Statement/Argument",
    "Severity/Confidence",
    "ConsensusScore",
  ];

  const rows: string[][] = [];

  const advocates = getPerspectivesByStance(
    debate?.perspectives || [],
    "advocate",
  );
  const critics = getPerspectivesByStance(debate?.perspectives || [], "critic");
  const advocateName = advocates[0]?.agentName || "Advocate";
  const criticName = critics[0]?.agentName || "Critic";

  // 1. Debate rounds
  for (const r of analysis.debateRounds) {
    const roundLabel = `Round ${r.round}: ${r.name}`;
    rows.push([
      roundLabel,
      advocateName,
      "Advocate",
      r.advocateStatement,
      `Delta +${r.consensusDelta}`,
      String(analysis.consensusScore),
    ]);
    rows.push([
      roundLabel,
      criticName,
      "Critic",
      r.criticStatement,
      `Delta +${r.consensusDelta}`,
      String(analysis.consensusScore),
    ]);
  }

  // 2. Irreconcilable tradeoffs
  for (const t of analysis.irreconcilableTradeoffs) {
    rows.push([
      "Tradeoff Analysis",
      advocateName,
      "Advocate Advantage",
      `[${t.dimension}] ${t.advocateAdvantage}`,
      t.severity.toUpperCase(),
      String(analysis.consensusScore),
    ]);
    rows.push([
      "Tradeoff Analysis",
      criticName,
      "Critic Risk",
      `[${t.dimension}] ${t.criticRisk}`,
      t.severity.toUpperCase(),
      String(analysis.consensusScore),
    ]);
  }

  // 3. Shared agreements
  for (const agree of analysis.sharedAgreements) {
    rows.push([
      "Shared Agreement",
      "Consensus",
      "Common Ground",
      agree,
      "ALIGNED",
      String(analysis.consensusScore),
    ]);
  }

  // 4. Arbiter ruling
  rows.push([
    "Final Adjudication",
    "Neutral Arbiter",
    analysis.arbiterRuling.winner,
    analysis.arbiterRuling.strategicRecommendation,
    `${analysis.arbiterRuling.confidenceScore}% Confidence`,
    String(analysis.consensusScore),
  ]);

  const csvLines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ];

  return csvLines.join("\r\n");
}

/**
 * Generates an executive briefing report in Markdown format.
 */
export function debateToMarkdown(
  debate: DebateArtifact,
  analysis: DialecticDebateAnalysis,
): string {
  const topic = debate?.topic || "Architectural Strategy Debate";
  const summary = debate?.consensusSummary || "No consensus summary recorded.";

  const sections: string[] = [];

  // Header
  sections.push(`# Dialectic Debate Briefing: ${topic}\n`);
  sections.push(
    `**Consensus Score:** ${analysis.consensusScore}/100 | **Advocate Claims:** ${analysis.advocateEvidenceCount} | **Critic Counter-Claims & Risks:** ${analysis.criticEvidenceCount}\n`,
  );

  // Executive summary
  sections.push(`## Executive Consensus Summary\n${summary}\n`);

  // Shared agreements
  if (analysis.sharedAgreements.length > 0) {
    sections.push("## Key Discovered Common Ground");
    for (const item of analysis.sharedAgreements) {
      sections.push(`- ${item}`);
    }
    sections.push("");
  }

  // Irreconcilable tradeoffs
  if (analysis.irreconcilableTradeoffs.length > 0) {
    sections.push("## Irreconcilable Architectural Trade-offs");
    sections.push(
      "| Dimension | Advocate Advantage | Critic Risk | Severity |",
    );
    sections.push("| :--- | :--- | :--- | :--- |");
    for (const t of analysis.irreconcilableTradeoffs) {
      // Escape pipe characters in table cells
      const dim = t.dimension.replace(/\|/g, "\\|");
      const adv = t.advocateAdvantage
        .replace(/\|/g, "\\|")
        .replace(/\r?\n/g, " ");
      const crit = t.criticRisk.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
      sections.push(
        `| **${dim}** | ${adv} | ${crit} | \`${t.severity.toUpperCase()}\` |`,
      );
    }
    sections.push("");
  }

  // Debate progression rounds
  if (analysis.debateRounds.length > 0) {
    sections.push("## Dialectic Progression Rounds");
    for (const r of analysis.debateRounds) {
      sections.push(`### Round ${r.round}: ${r.name}`);
      sections.push(`- **Advocate:** ${r.advocateStatement}`);
      sections.push(`- **Critic:** ${r.criticStatement}`);
      sections.push(`- *Consensus Delta:* +${r.consensusDelta}`);
      sections.push("");
    }
  }

  // Arbiter ruling
  sections.push("## Arbiter Ruling & Strategic Recommendation");
  sections.push(
    `- **Adjudication Winner:** \`${analysis.arbiterRuling.winner}\``,
  );
  sections.push(
    `- **Confidence Score:** ${analysis.arbiterRuling.confidenceScore}/100`,
  );
  sections.push(
    `- **Recommendation:** ${analysis.arbiterRuling.strategicRecommendation}`,
  );
  sections.push("");
  sections.push("### Decisive Factors");
  for (const factor of analysis.arbiterRuling.decisiveFactors) {
    sections.push(`- ${factor}`);
  }
  sections.push("");

  return sections.join("\n");
}
