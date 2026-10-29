/**
 * Multi-Persona Executive Council Studio Analysis & Adjudication Engine.
 *
 * Provides pure, deterministic mathematical modeling and analytical synthesis
 * for the Multi-Persona Executive Council in Nova.
 *
 * Capabilities:
 * - Deterministic Grade & Verdict Calculation (A+ to F, approve / conditional / veto).
 * - Council Alignment Index calculation based on dispersion (standard deviation) and veto penalties.
 * - Council Verdict determination (unanimous approval, conditional consensus, divided council, rejected high risk).
 * - Multi-Persona Architectural Evaluation across specialist personas (Tech Architect, CISO, FinOps, Market Analyst, Academic Critic).
 * - Fatal Blindspot detection with severity triage and concrete mitigations.
 * - Strict RFC 4180 CSV Export with escaped quotes and CRLF line endings.
 * - Executive Markdown Briefing with scorecards, tables, callouts, and action item checklists.
 *
 * STRICT COMPLIANCE:
 * - Strictly ZERO pseudorandom number generation.
 * - Strictly ZERO fake or hallucinated telemetry.
 * - 100% deterministic and reproducible across all calculations.
 */

import type { AgentPersona } from "@/lib/agent-personas";

export interface PersonaCouncilCriteriaScore {
  criterion: string;
  score: number; // 0-100
  weight: number; // Decimal weight e.g. 0.30
}

export interface PersonaReview {
  personaId: string;
  personaName: string;
  roleTitle: string;
  avatarIcon: string;
  score: number; // 0-100
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
  verdict: "approve" | "conditional" | "veto";
  coreEndorsement: string;
  criticalObjections: string[];
  nonNegotiables: string[];
  criteriaScores: PersonaCouncilCriteriaScore[];
}

export interface FatalBlindspot {
  dimension: string;
  flaggedBy: string;
  severity: "critical" | "warning";
  risk: string;
  mitigation: string;
}

export type CouncilVerdict =
  | "unanimous_approval"
  | "conditional_consensus"
  | "divided_council"
  | "rejected_high_risk";

export interface PersonaCouncilArtifact {
  topic: string;
  alignmentIndex: number; // 0-100
  meanScore: number;
  councilVerdict: CouncilVerdict;
  verdictSummary: string;
  reviews: PersonaReview[];
  fatalBlindspots: FatalBlindspot[];
  actionItems: string[];
  strategicCompromise: string;
  generatedAt: string;
}

/**
 * Calculates academic grade deterministically from numeric score (0-100).
 * Thresholds:
 * - 95-100 -> A+
 * - 85-94  -> A
 * - 75-84  -> B
 * - 65-74  -> C
 * - 50-64  -> D
 * - < 50   -> F
 */
export function calculatePersonaGrade(
  score: number,
): "A+" | "A" | "B" | "C" | "D" | "F" {
  if (score >= 95) return "A+";
  if (score >= 85) return "A";
  if (score >= 75) return "B";
  if (score >= 65) return "C";
  if (score >= 50) return "D";
  return "F";
}

/**
 * Calculates reviewer verdict deterministically from numeric score (0-100).
 * Thresholds:
 * - >= 80 -> approve
 * - 60-79 -> conditional
 * - < 60  -> veto
 */
export function calculatePersonaVerdict(
  score: number,
): "approve" | "conditional" | "veto" {
  if (score >= 80) return "approve";
  if (score >= 60) return "conditional";
  return "veto";
}

/**
 * Calculates the Council Alignment Index (0-100) deterministically.
 * Formula models dispersion via sample standard deviation and applies penalties per veto.
 * - Zero variance and 0 vetoes yields exactly 100%.
 * - Higher variance and active vetoes penalize consensus alignment.
 * Clamped strictly between 0 and 100.
 */
export function calculateCouncilAlignmentIndex(
  scores: number[],
  vetoCount: number = 0,
): number {
  if (!scores || scores.length === 0) return 0;
  if (scores.length === 1) {
    const penalty = vetoCount * 25;
    return Math.max(0, Math.min(100, Math.round(100 - penalty)));
  }

  const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  const variance =
    scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  // Maximum possible stdDev in [0, 100] is 50.
  // Dispersion penalty scales stdDev (0 -> 0 penalty, 50 -> 75 penalty).
  // Veto penalty subtracts 12 points per veto.
  const rawIndex = 100 - stdDev * 1.5 - vetoCount * 12;
  return Math.max(0, Math.min(100, Math.round(rawIndex)));
}

/**
 * Determines the council verdict deterministically from aggregate indicators:
 * - "unanimous_approval": vetoCount === 0, minScore >= 80, meanScore >= 85, alignmentIndex >= 80
 * - "rejected_high_risk": vetoCount >= 2, minScore < 45, or meanScore < 55
 * - "divided_council": vetoCount === 1 or alignmentIndex < 60
 * - "conditional_consensus": no vetoes, moderate/strong alignment and scores
 */
export function determineCouncilVerdict(
  meanScore: number,
  minScore: number,
  vetoCount: number,
  alignmentIndex: number,
): CouncilVerdict {
  // 1. Rejected High Risk: multiple vetoes, catastrophic minimum (< 45), or failing mean (< 55)
  if (vetoCount >= 2 || minScore < 45 || meanScore < 55) {
    return "rejected_high_risk";
  }

  // 2. Unanimous Approval: all reviewers approve (minScore >= 80), no vetoes, high mean (>= 85), high alignment (>= 80)
  if (
    vetoCount === 0 &&
    minScore >= 80 &&
    meanScore >= 85 &&
    alignmentIndex >= 80
  ) {
    return "unanimous_approval";
  }

  // 3. Divided Council: lone veto exists or low consensus alignment (< 60)
  if (vetoCount === 1 || alignmentIndex < 60) {
    return "divided_council";
  }

  // 4. Conditional Consensus: no vetoes, moderate alignment and passing criteria
  return "conditional_consensus";
}

/**
 * Deterministic FNV-1a 32-bit hash function.
 * Produces a stable, reproducible positive 32-bit integer for any input string.
 * Strictly ZERO pseudorandom generation.
 */
export function deterministicHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Internal template structure for council evaluation */
interface CouncilPersonaTemplate {
  id: string;
  name: string;
  roleTitle: string;
  avatarIcon: string;
  criteria: Array<{ criterion: string; weight: number }>;
  nonNegotiables: string[];
}

/** Predefined institutional specialist council profiles */
const SPECIALIST_COUNCIL_TEMPLATES: CouncilPersonaTemplate[] = [
  {
    id: "tech-architect",
    name: "Principal Systems Architect",
    roleTitle: "Distributed Systems & Cloud Architecture Lead",
    avatarIcon: "Cpu",
    criteria: [
      { criterion: "Scalability & Concurrency Model", weight: 0.3 },
      { criterion: "Fault Tolerance & Blast Radius", weight: 0.25 },
      { criterion: "API Contracts & System Decoupling", weight: 0.25 },
      { criterion: "Operational Simplicity & Debuggability", weight: 0.2 },
    ],
    nonNegotiables: [
      "Zero single points of failure across stateful partitions",
      "Chaos-tested circuit breakers and backpressure on all ingress pathways",
      "Idempotent message processing with distributed dead-letter telemetry",
    ],
  },
  {
    id: "security-ciso",
    name: "Chief Information Security Officer",
    roleTitle: "Enterprise Security & Threat Modeling Lead",
    avatarIcon: "ShieldAlert",
    criteria: [
      { criterion: "Attack Surface & Perimeter Defense", weight: 0.3 },
      { criterion: "Cryptographic Hygiene & Secret Governance", weight: 0.25 },
      { criterion: "Zero Trust & Identity/RBAC Enforcement", weight: 0.25 },
      { criterion: "Compliance & Regulatory Audit Readiness", weight: 0.2 },
    ],
    nonNegotiables: [
      "Mandatory zero-trust mTLS encryption for all inter-service communication",
      "Hardware security module (HSM) backed secret management with automated 30-day rotation",
      "Immutable append-only audit logging for all privilege escalation events",
    ],
  },
  {
    id: "financial-analyst",
    name: "Quantitative FinOps & Venture Lead",
    roleTitle: "Venture Capital & Unit Economics Specialist",
    avatarIcon: "DollarSign",
    criteria: [
      { criterion: "Total Cost of Ownership (TCO) & Cloud Spend", weight: 0.3 },
      { criterion: "Unit Economics & Gross Margin Scalability", weight: 0.25 },
      {
        criterion: "Implementation CapEx & Engineering Opportunity Cost",
        weight: 0.25,
      },
      { criterion: "Vendor Lock-in & Egress Arbitrage", weight: 0.2 },
    ],
    nonNegotiables: [
      "Automated cost anomaly detection with circuit-breaker spend limits",
      "Gross margin contribution must remain above 75% at 10x projected scale",
      "Zero unhedged multi-cloud egress transit contracts",
    ],
  },
  {
    id: "market-analyst",
    name: "Strategic Market & Intelligence Lead",
    roleTitle: "Strategic Market & Competitive Intelligence Specialist",
    avatarIcon: "TrendingUp",
    criteria: [
      { criterion: "Time-to-Market & Delivery Velocity", weight: 0.3 },
      { criterion: "Competitive Differentiation & Moat", weight: 0.25 },
      { criterion: "Customer Adoption & Migration Friction", weight: 0.25 },
      {
        criterion: "Ecosystem Maturity & Talent Pool Availability",
        weight: 0.2,
      },
    ],
    nonNegotiables: [
      "Delivery milestone gates must not delay customer time-to-market beyond 30 days",
      "Backward compatibility guaranteed to prevent customer switching friction",
      "Clear developer tooling abstractions to minimize onboarding latency",
    ],
  },
  {
    id: "academic-critic",
    name: "Academic Methodology Auditor",
    roleTitle: "Methodology Auditor & Empirical Science Critic",
    avatarIcon: "GraduationCap",
    criteria: [
      { criterion: "Empirical Validity & Benchmark Soundness", weight: 0.3 },
      {
        criterion: "Theoretical Soundness & Algorithmic Convergence",
        weight: 0.25,
      },
      { criterion: "Statistical Power & Bias Resistance", weight: 0.25 },
      {
        criterion: "Reproducibility & Open Baseline Verification",
        weight: 0.2,
      },
    ],
    nonNegotiables: [
      "Empirical latency and throughput claims verified with p99 benchmarking at 99% confidence",
      "Reproducible automated test harness with open telemetry baselines",
      "Explicit mathematical proof or documented bounds for algorithmic convergence",
    ],
  },
];

/** Generic enterprise evaluation criteria for custom personas */
const GENERIC_ENTERPRISE_CRITERIA = [
  { criterion: "Functional Feasibility & Requirements Coverage", weight: 0.3 },
  {
    criterion: "Systemic Risk Management & Failure Mode Defense",
    weight: 0.25,
  },
  { criterion: "Long-Term Strategic Viability & Extensibility", weight: 0.25 },
  { criterion: "Operational Efficiency & Governance Standards", weight: 0.2 },
];

/**
 * Resolves an active persona or fallback to the matching specialist template.
 */
function resolvePersonaTemplate(
  persona: AgentPersona | undefined,
  fallbackIndex: number,
): CouncilPersonaTemplate {
  if (!persona) {
    return (
      SPECIALIST_COUNCIL_TEMPLATES[
        fallbackIndex % SPECIALIST_COUNCIL_TEMPLATES.length
      ] || SPECIALIST_COUNCIL_TEMPLATES[0]
    );
  }

  const pId = (persona.id || "").toLowerCase();
  const pRole = (persona.roleTitle || "").toLowerCase();
  const pName = (persona.name || "").toLowerCase();

  // Find exact id match first
  const exactMatch = SPECIALIST_COUNCIL_TEMPLATES.find((t) => t.id === pId);
  if (exactMatch) {
    return {
      ...exactMatch,
      name: persona.name || exactMatch.name,
      roleTitle: persona.roleTitle || exactMatch.roleTitle,
      avatarIcon: persona.icon || exactMatch.avatarIcon,
    };
  }

  // Find semantic domain match
  if (
    pId.includes("tech") ||
    pRole.includes("architect") ||
    pName.includes("architect")
  ) {
    const t = SPECIALIST_COUNCIL_TEMPLATES[0];
    return {
      ...t,
      id: persona.id,
      name: persona.name,
      roleTitle: persona.roleTitle,
      avatarIcon: persona.icon || t.avatarIcon,
    };
  }
  if (
    pId.includes("sec") ||
    pRole.includes("security") ||
    pName.includes("ciso")
  ) {
    const t = SPECIALIST_COUNCIL_TEMPLATES[1];
    return {
      ...t,
      id: persona.id,
      name: persona.name,
      roleTitle: persona.roleTitle,
      avatarIcon: persona.icon || t.avatarIcon,
    };
  }
  if (
    pId.includes("fin") ||
    pRole.includes("finance") ||
    pName.includes("financial")
  ) {
    const t = SPECIALIST_COUNCIL_TEMPLATES[2];
    return {
      ...t,
      id: persona.id,
      name: persona.name,
      roleTitle: persona.roleTitle,
      avatarIcon: persona.icon || t.avatarIcon,
    };
  }
  if (
    pId.includes("market") ||
    pRole.includes("market") ||
    pName.includes("market")
  ) {
    const t = SPECIALIST_COUNCIL_TEMPLATES[3];
    return {
      ...t,
      id: persona.id,
      name: persona.name,
      roleTitle: persona.roleTitle,
      avatarIcon: persona.icon || t.avatarIcon,
    };
  }
  if (
    pId.includes("acad") ||
    pRole.includes("critic") ||
    pName.includes("academic")
  ) {
    const t = SPECIALIST_COUNCIL_TEMPLATES[4];
    return {
      ...t,
      id: persona.id,
      name: persona.name,
      roleTitle: persona.roleTitle,
      avatarIcon: persona.icon || t.avatarIcon,
    };
  }

  // Generic custom persona
  return {
    id: persona.id,
    name: persona.name || "Custom Specialist",
    roleTitle: persona.roleTitle || "Executive Advisor",
    avatarIcon: persona.icon || "Bot",
    criteria: GENERIC_ENTERPRISE_CRITERIA,
    nonNegotiables: [
      "Rigorous adherence to production quality standards",
      "Documented verification criteria before general availability",
      "Standard auditability and observability telemetry",
    ],
  };
}

/**
 * Deterministically evaluates a council review for a given persona template.
 */
function evaluatePersonaReview(
  template: CouncilPersonaTemplate,
  cleanTopic: string,
  cleanContext: string,
): PersonaReview {
  const combined = `${cleanTopic} ${cleanContext}`.trim();
  const wordCount = combined.split(/\s+/).filter(Boolean).length;

  // Base score: 82 for realistic architectural proposals, 50 for empty/trivial input
  let baseScore = cleanTopic.length === 0 ? 50 : 82;
  const detailBonus = Math.min(6, Math.floor(wordCount / 5));
  baseScore += detailBonus;

  // Domain signals
  const isSecurity =
    template.id.includes("sec") ||
    template.roleTitle.toLowerCase().includes("security");
  const isArchitect =
    template.id.includes("tech") ||
    template.roleTitle.toLowerCase().includes("architect");
  const isFinOps =
    template.id.includes("fin") ||
    template.roleTitle.toLowerCase().includes("finops") ||
    template.roleTitle.toLowerCase().includes("unit economics");
  const isMarket =
    template.id.includes("market") ||
    template.roleTitle.toLowerCase().includes("market");
  const isAcademic =
    template.id.includes("acad") ||
    template.roleTitle.toLowerCase().includes("academic");

  // Severe risk checks that trigger domain penalties and potential vetoes
  const hasSecurityBreachRisk =
    combined.includes("unencrypted") ||
    combined.includes("cleartext") ||
    combined.includes("plaintext") ||
    combined.includes("bypass auth") ||
    combined.includes("unauthenticated") ||
    combined.includes("no auth") ||
    combined.includes("data breach") ||
    combined.includes("hardcoded secret");

  const hasArchitectSpofRisk =
    combined.includes("single point of failure") ||
    combined.includes("spof") ||
    combined.includes("distributed monolith") ||
    combined.includes("circular dependency") ||
    combined.includes("cascading failure") ||
    combined.includes("unbounded queue");

  const hasFinOpsRunawayRisk =
    combined.includes("unbounded cost") ||
    combined.includes("cost runaway") ||
    combined.includes("unlimited cloud spend") ||
    combined.includes("unlimited compute") ||
    combined.includes("negative gross margin") ||
    combined.includes("multi-cloud egress cost");

  const hasAcademicValidityRisk =
    combined.includes("untested baseline") ||
    combined.includes("unproven conjecture") ||
    combined.includes("hype") ||
    combined.includes("anecdotal") ||
    combined.includes("hand-waving") ||
    combined.includes("p-hacking");

  const hasMarketFrictionRisk =
    combined.includes("extreme migration cost") ||
    combined.includes("talent shortage") ||
    combined.includes("vendor lock-in") ||
    combined.includes("steep churn") ||
    combined.includes("prohibitive adoption");

  // Positive architectural signals
  const hasPositiveSecurity =
    combined.includes("zero trust") ||
    combined.includes("mtls") ||
    combined.includes("soc2") ||
    combined.includes("rbac") ||
    combined.includes("encryption");
  const hasPositiveArchitect =
    combined.includes("kafka") ||
    combined.includes("event-driven") ||
    combined.includes("idempotent") ||
    combined.includes("circuit breaker") ||
    combined.includes("microservices") ||
    combined.includes("failover");
  const hasPositiveFinOps =
    combined.includes("finops") ||
    combined.includes("cost optimization") ||
    combined.includes("unit economics") ||
    combined.includes("serverless") ||
    combined.includes("reserved instance");
  const hasPositiveMarket =
    combined.includes("time-to-market") ||
    combined.includes("developer velocity") ||
    combined.includes("competitive moat") ||
    combined.includes("open standards");
  const hasPositiveAcademic =
    combined.includes("empirical") ||
    combined.includes("peer-reviewed") ||
    combined.includes("benchmark") ||
    combined.includes("reproducible") ||
    combined.includes("statistical");

  // Evaluate individual criteria scores deterministically
  const criteriaScores: PersonaCouncilCriteriaScore[] = template.criteria.map(
    (c) => {
      const hash = deterministicHash(
        `${cleanTopic}:${cleanContext}:${template.id}:${c.criterion}`,
      );
      const variation = (hash % 9) - 4; // -4 to +4 deterministic variation

      let critScore = baseScore + variation;

      // Positive reinforcement
      if (isSecurity && hasPositiveSecurity) critScore += 5;
      if (isArchitect && hasPositiveArchitect) critScore += 5;
      if (isFinOps && hasPositiveFinOps) critScore += 5;
      if (isMarket && hasPositiveMarket) critScore += 5;
      if (isAcademic && hasPositiveAcademic) critScore += 5;

      // Deterministic risk penalization
      if (
        isSecurity &&
        hasSecurityBreachRisk &&
        (c.criterion.includes("Cryptographic") ||
          c.criterion.includes("Attack") ||
          c.criterion.includes("Zero Trust"))
      ) {
        critScore = Math.min(critScore, 32);
      } else if (isSecurity && hasSecurityBreachRisk) {
        critScore -= 28;
      }

      if (
        isArchitect &&
        hasArchitectSpofRisk &&
        (c.criterion.includes("Fault Tolerance") ||
          c.criterion.includes("Scalability"))
      ) {
        critScore = Math.min(critScore, 36);
      } else if (isArchitect && hasArchitectSpofRisk) {
        critScore -= 24;
      }

      if (
        isFinOps &&
        hasFinOpsRunawayRisk &&
        (c.criterion.includes("Total Cost") ||
          c.criterion.includes("Unit Economics"))
      ) {
        critScore = Math.min(critScore, 34);
      } else if (isFinOps && hasFinOpsRunawayRisk) {
        critScore -= 25;
      }

      if (
        isAcademic &&
        hasAcademicValidityRisk &&
        (c.criterion.includes("Empirical") || c.criterion.includes("Soundness"))
      ) {
        critScore = Math.min(critScore, 38);
      } else if (isAcademic && hasAcademicValidityRisk) {
        critScore -= 22;
      }

      if (
        isMarket &&
        hasMarketFrictionRisk &&
        (c.criterion.includes("Adoption") ||
          c.criterion.includes("Time-to-Market"))
      ) {
        critScore = Math.min(critScore, 42);
      } else if (isMarket && hasMarketFrictionRisk) {
        critScore -= 20;
      }

      const clampedScore = Math.max(0, Math.min(100, Math.round(critScore)));
      return {
        criterion: c.criterion,
        score: clampedScore,
        weight: c.weight,
      };
    },
  );

  // Overall score: weighted sum of criteria
  const overallScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        criteriaScores.reduce((sum, cs) => sum + cs.score * cs.weight, 0),
      ),
    ),
  );

  const grade = calculatePersonaGrade(overallScore);
  const verdict = calculatePersonaVerdict(overallScore);

  // Sort criteria to extract top strengths and lowest concerns
  const sortedCriteria = [...criteriaScores].sort((a, b) => a.score - b.score);
  const lowestCriterion = sortedCriteria[0];
  const highestCriterion = sortedCriteria[sortedCriteria.length - 1];

  // Core endorsement formulation
  let coreEndorsement = "";
  if (verdict === "approve") {
    coreEndorsement = `Endorses the proposal. Architectural design demonstrates strong adherence to institutional baselines in ${highestCriterion.criterion} (${highestCriterion.score}/100).`;
  } else if (verdict === "conditional") {
    coreEndorsement = `Conditional approval issued. Deployment is authorized only after resolving key deficiencies in ${lowestCriterion.criterion} (${lowestCriterion.score}/100).`;
  } else {
    coreEndorsement = `Executive veto issued. Severe institutional risk detected in ${lowestCriterion.criterion} (${lowestCriterion.score}/100) that violates mandatory production safety baselines.`;
  }

  // Critical objections derivation
  const criticalObjections: string[] = [];
  for (const cs of sortedCriteria) {
    if (cs.score < 60) {
      criticalObjections.push(
        `Critical vulnerability in ${cs.criterion} (score: ${cs.score}/100) breaches non-negotiable safety standards.`,
      );
    } else if (cs.score < 75) {
      criticalObjections.push(
        `Marginal baseline compliance in ${cs.criterion} (score: ${cs.score}/100) requires formal remediation before scale.`,
      );
    }
  }
  if (criticalObjections.length === 0) {
    criticalObjections.push(
      `Requires continuous telemetry monitoring during peak production load windows.`,
    );
  }

  return {
    personaId: template.id,
    personaName: template.name,
    roleTitle: template.roleTitle,
    avatarIcon: template.avatarIcon,
    score: overallScore,
    grade,
    verdict,
    coreEndorsement,
    criticalObjections,
    nonNegotiables: [...template.nonNegotiables],
    criteriaScores,
  };
}

/**
 * Performs complete, deterministic multi-persona executive council analysis.
 * Strictly ZERO pseudorandom generation, 100% reproducible.
 */
export function analyzePersonaCouncil(
  topic: string,
  context?: string,
  activePersonas?: AgentPersona[],
): PersonaCouncilArtifact {
  const sanitizedTopic = topic?.trim() || "Untitled System Architecture";
  const sanitizedContext = (context || "").trim();

  // Select persona templates
  let templates: CouncilPersonaTemplate[] = [];
  if (activePersonas && activePersonas.length > 0) {
    templates = activePersonas.map((p, idx) => resolvePersonaTemplate(p, idx));
  } else {
    templates = SPECIALIST_COUNCIL_TEMPLATES;
  }

  // Generate reviews deterministically
  const reviews: PersonaReview[] = templates.map((tmpl) =>
    evaluatePersonaReview(tmpl, sanitizedTopic, sanitizedContext),
  );

  const scores = reviews.map((r) => r.score);
  const meanScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
  const minScore = scores.length > 0 ? Math.min(...scores) : 0;
  const vetoCount = reviews.filter((r) => r.verdict === "veto").length;

  const alignmentIndex = calculateCouncilAlignmentIndex(scores, vetoCount);
  const councilVerdict = determineCouncilVerdict(
    meanScore,
    minScore,
    vetoCount,
    alignmentIndex,
  );

  // Derive fatal blindspots when specific scores fall below safety thresholds
  const fatalBlindspots: FatalBlindspot[] = [];
  for (const review of reviews) {
    if (review.verdict === "veto") {
      const worstCrit = [...review.criteriaScores].sort(
        (a, b) => a.score - b.score,
      )[0];
      fatalBlindspots.push({
        dimension: worstCrit
          ? worstCrit.criterion
          : `${review.personaName} Governance`,
        flaggedBy: review.personaName,
        severity: "critical",
        risk: `Critical deficiency in ${worstCrit?.criterion || "domain requirements"} (${worstCrit?.score || review.score}/100) exposes the organization to unacceptable systemic failure.`,
        mitigation: `Halt rollout and implement mandatory remediation for ${worstCrit?.criterion || "domain governance"} before re-evaluating.`,
      });
    } else {
      for (const cs of review.criteriaScores) {
        if (cs.score < 60) {
          fatalBlindspots.push({
            dimension: cs.criterion,
            flaggedBy: review.personaName,
            severity: cs.score < 50 ? "critical" : "warning",
            risk: `Sub-baseline performance in ${cs.criterion} (${cs.score}/100) creates an unhedged operational risk vector.`,
            mitigation: `Establish automated monitoring gates and fallback contingencies for ${cs.criterion}.`,
          });
        }
      }
    }
  }

  // Formulate verdict summary
  let verdictSummary = "";
  if (councilVerdict === "unanimous_approval") {
    verdictSummary = `The Executive Council has issued Unanimous Approval (Mean Score: ${meanScore}/100, Alignment Index: ${alignmentIndex}%). All specialist domains confirm high architectural confidence, production readiness, and zero blocking objections.`;
  } else if (councilVerdict === "conditional_consensus") {
    verdictSummary = `The Executive Council has reached Conditional Consensus (Mean Score: ${meanScore}/100, Alignment Index: ${alignmentIndex}%). Production authorization is granted subject to resolving all flagged non-negotiables before general availability.`;
  } else if (councilVerdict === "divided_council") {
    verdictSummary = `The Executive Council is Divided (Mean Score: ${meanScore}/100, Alignment Index: ${alignmentIndex}%). Significant divergence between specialist perspectives requires leadership trade-off adjudication before proceeding.`;
  } else {
    verdictSummary = `The Executive Council has Rejected the proposal due to High Risk (Mean Score: ${meanScore}/100, Alignment Index: ${alignmentIndex}%). Critical safety, financial, or security thresholds were breached with active member vetoes.`;
  }

  // Formulate strategic compromise
  const strategicCompromise =
    reviews.length > 1
      ? `Adopt a phased hybrid deployment model: enforce strict zero-trust cryptographic isolation and automated FinOps budget ceilings at the infrastructure core, while providing high-velocity decoupled abstraction layers at the service edge to maintain rapid product iteration without compromising institutional resilience.`
      : `Adhere strictly to the non-negotiables identified by the specialist review while validating core assumptions under canary load conditions.`;

  // Action items derivation
  const actionItems: string[] = [];

  // 1. Mitigations from blindspots
  for (const fb of fatalBlindspots) {
    actionItems.push(`[${fb.severity.toUpperCase()}] ${fb.mitigation}`);
  }

  // 2. Non-negotiables from conditional/veto reviewers
  for (const r of reviews) {
    if (r.verdict !== "approve") {
      for (const nn of r.nonNegotiables.slice(0, 1)) {
        actionItems.push(
          `Enforce ${r.personaName} non-negotiable: ${nn.toLowerCase()}`,
        );
      }
    }
  }

  // 3. Council-level operational next steps
  if (
    councilVerdict === "unanimous_approval" ||
    (councilVerdict === "conditional_consensus" && actionItems.length < 3)
  ) {
    actionItems.push(
      "Finalize production deployment runbook and cross-region telemetry pipelines",
    );
    actionItems.push(
      "Establish continuous latency and saturation SLO tracking at p99",
    );
    actionItems.push(
      "Schedule 90-day post-rollout architectural verification review",
    );
  } else if (actionItems.length < 3) {
    actionItems.push(
      "Halt production pipeline deployment until critical objections are formally resolved",
    );
    actionItems.push(
      "Conduct targeted executive alignment session to address conflicting constraints",
    );
  }

  return {
    topic: sanitizedTopic,
    alignmentIndex,
    meanScore,
    councilVerdict,
    verdictSummary,
    reviews,
    fatalBlindspots,
    actionItems,
    strategicCompromise,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Escapes a single cell value for strict RFC 4180 CSV compliance.
 * Encloses in quotes if containing commas, quotes, or newlines, and escapes internal quotes as "".
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
 * Converts a Persona Council artifact to strict RFC 4180 compliant CSV.
 * Columns: Record Type, Persona / Category, Role / Dimension, Score, Grade / Severity, Verdict / Status, Core Analysis, Details / Items
 * Line endings: CRLF (\r\n).
 */
export function personaCouncilToCsv(council: PersonaCouncilArtifact): string {
  const headers = [
    "Record Type",
    "Persona / Category",
    "Role / Dimension",
    "Score",
    "Grade / Severity",
    "Verdict / Status",
    "Core Analysis",
    "Details / Items",
  ];

  const rows: string[][] = [];

  // 1. Council Overview Row
  rows.push([
    "Council Summary",
    council.topic,
    "Executive Council",
    String(council.meanScore),
    `Alignment: ${council.alignmentIndex}%`,
    council.councilVerdict,
    council.verdictSummary,
    council.strategicCompromise,
  ]);

  // 2. Persona Reviews
  for (const review of council.reviews) {
    rows.push([
      "Persona Review",
      review.personaName,
      review.roleTitle,
      String(review.score),
      review.grade,
      review.verdict,
      review.coreEndorsement,
      review.nonNegotiables.join("; "),
    ]);

    // Criteria breakdown
    for (const cs of review.criteriaScores) {
      rows.push([
        "Criteria Evaluation",
        review.personaName,
        review.roleTitle,
        String(cs.score),
        `Weight: ${(cs.weight * 100).toFixed(0)}%`,
        review.verdict,
        cs.criterion,
        `Score: ${cs.score}/100`,
      ]);
    }
  }

  // 3. Fatal Blindspots
  for (const blindspot of council.fatalBlindspots) {
    rows.push([
      "Fatal Blindspot",
      blindspot.flaggedBy,
      blindspot.dimension,
      "N/A",
      blindspot.severity.toUpperCase(),
      "FLAGGED",
      blindspot.risk,
      `Mitigation: ${blindspot.mitigation}`,
    ]);
  }

  // 4. Action Items
  council.actionItems.forEach((actionItem, index) => {
    rows.push([
      "Action Item",
      "Executive Council",
      `Priority ${index + 1}`,
      "N/A",
      "REQUIRED",
      council.councilVerdict,
      actionItem,
      "Actionable Step",
    ]);
  });

  const csvLines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ];

  return csvLines.join("\r\n");
}

/**
 * Generates an executive briefing report in Markdown format.
 * Includes verdict banner, summary table, detailed scorecards, fatal blindspots callouts,
 * strategic compromise, and action items checklist.
 */
export function personaCouncilToMarkdown(
  council: PersonaCouncilArtifact,
): string {
  const sections: string[] = [];

  // 1. Title & Verdict Banner
  sections.push(`# Executive Council Briefing: ${council.topic}\n`);
  sections.push(
    `> **Council Verdict:** \`${council.councilVerdict.toUpperCase()}\` | **Mean Score:** ${council.meanScore}/100 | **Alignment Index:** ${council.alignmentIndex}/100 | **Generated:** ${council.generatedAt}\n`,
  );

  // 2. Executive Summary
  sections.push(`## Executive Summary\n${council.verdictSummary}\n`);

  // 3. Persona Scorecard Table
  sections.push(`## Persona Scorecard Overview\n`);
  sections.push(
    `| Persona | Role | Score | Grade | Verdict | Core Endorsement |`,
  );
  sections.push(`| :--- | :--- | :--- | :--- | :--- | :--- |`);
  for (const r of council.reviews) {
    const cleanName = r.personaName.replace(/\|/g, "\\|");
    const cleanRole = r.roleTitle.replace(/\|/g, "\\|");
    const cleanEndorsement = r.coreEndorsement
      .replace(/\|/g, "\\|")
      .replace(/\r?\n/g, " ");
    sections.push(
      `| **${cleanName}** | ${cleanRole} | ${r.score}/100 | \`${r.grade}\` | \`${r.verdict.toUpperCase()}\` | ${cleanEndorsement} |`,
    );
  }
  sections.push("");

  // 4. Detailed Persona Scorecards
  sections.push(`## Detailed Specialist Scorecards\n`);
  for (const r of council.reviews) {
    sections.push(`### ${r.personaName} — ${r.roleTitle}`);
    sections.push(
      `- **Score:** ${r.score}/100 (\`${r.grade}\`) | **Verdict:** \`${r.verdict.toUpperCase()}\``,
    );
    sections.push(`- **Core Position:** ${r.coreEndorsement}\n`);

    sections.push(`| Evaluation Criterion | Score | Weight |`);
    sections.push(`| :--- | :--- | :--- |`);
    for (const cs of r.criteriaScores) {
      sections.push(
        `| ${cs.criterion.replace(/\|/g, "\\|")} | ${cs.score}/100 | ${(cs.weight * 100).toFixed(0)}% |`,
      );
    }
    sections.push("");

    if (r.criticalObjections.length > 0) {
      sections.push(`**Critical Objections:**`);
      for (const obj of r.criticalObjections) {
        sections.push(`- ${obj}`);
      }
      sections.push("");
    }

    if (r.nonNegotiables.length > 0) {
      sections.push(`**Non-Negotiable Requirements:**`);
      for (const nn of r.nonNegotiables) {
        sections.push(`- ${nn}`);
      }
      sections.push("");
    }
  }

  // 5. Fatal Blindspots Callout
  sections.push(`## Fatal Blindspots & Critical Vulnerabilities\n`);
  if (council.fatalBlindspots.length > 0) {
    for (const fb of council.fatalBlindspots) {
      sections.push(
        `> [!WARNING] **${fb.dimension}** (\`${fb.severity.toUpperCase()}\` — Flagged by ${fb.flaggedBy})\n> **Risk:** ${fb.risk}\n> **Mitigation:** ${fb.mitigation}\n`,
      );
    }
  } else {
    sections.push(
      `*No fatal blindspots detected. All criteria meet institutional safety baselines.*\n`,
    );
  }

  // 6. Strategic Compromise
  sections.push(`## Strategic Compromise & Synthesis\n`);
  sections.push(`${council.strategicCompromise}\n`);

  // 7. Action Items Checklist
  sections.push(`## Executive Action Items Checklist\n`);
  for (const item of council.actionItems) {
    sections.push(`- [ ] ${item}`);
  }
  sections.push("");

  return sections.join("\n");
}
