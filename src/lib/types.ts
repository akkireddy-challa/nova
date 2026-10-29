export type StudioMode =
  | "research"
  | "planner"
  | "canvas"
  | "coder"
  | "matrix"
  | "debate"
  | "persona"
  | "intelligence"
  | "mcp";

// Serialized model selection: "provider:model", e.g. "anthropic:claude-sonnet-5-5". See src/lib/providers/types.ts.
export type ModelProvider = string;

export type ThinkingBudget = "quick" | "analytical" | "deep";

export interface SourceCitation {
  id: string;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  /** 0-100, only when the search provider reports a relevance score. */
  relevanceScore?: number;
  publishedDate?: string;
  contradictionFlag?: boolean;
  author?: string;
  siteName?: string;
  description?: string;
}

export interface ResearchPlanStep {
  id: string;
  query: string;
  status: "pending" | "searching" | "analyzing" | "completed";
  sourcesFound: number;
}

export interface VerificationAudit {
  verifiedClaims: number;
  uncitedClaims?: number | string[];
  sourceAlignment: number;
  totalClaims?: number;
  contradictions?: string[];
  status?: "verified" | "flagged" | "warning";
}

export interface ResearchReport {
  title: string;
  executiveSummary: string;
  keyFindings: {
    point: string;
    description: string;
    confidence: "high" | "medium" | "low";
    citationIds: string[];
  }[];
  sources: SourceCitation[];
  contradictionsAndRisks?: string[];
  recommendation: string;
  metrics?: {
    sourcesCrawled: number;
    depthLevel: number;
    synthesisTimeMs: number;
    verificationAudit?: VerificationAudit;
  };
}

export interface TaskSubItem {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "completed";
  actionableOutput?: string;
}

export interface MilestonePhase {
  id: string;
  phaseNumber: number;
  phaseName: string;
  summary: string;
  status: "pending" | "active" | "completed";
  tasks: TaskSubItem[];
}

export interface GoalPlan {
  goal: string;
  timeframe: string;
  overview: string;
  phases: MilestonePhase[];
  keySuccessMetrics: string[];
}

export interface ChartDatum {
  label: string;
  value: number;
  secondaryValue?: number;
  category?: string;
  deltaPercent?: string;
}

export interface ChartArtifact {
  title: string;
  type: "bar" | "line" | "area";
  xAxisKey: string;
  data: ChartDatum[];
  insight: string;
  takeaways?: string[];
  followUpQuestions?: string[];
}

export interface MatrixCriterion {
  id: string;
  name: string;
  weight: number;
}

export interface MatrixOption {
  id: string;
  name: string;
  scores: Record<string, number>;
  pros: string[];
  cons: string[];
  totalWeightedScore: number;
}

export interface DecisionMatrix {
  topic: string;
  criteria: MatrixCriterion[];
  options: MatrixOption[];
  verdict: string;
}

export interface CodeArtifact {
  language: string;
  filename: string;
  code: string;
  explanation: string;
  previewHtml?: string;
}

export interface DebatePerspective {
  agentName: string;
  stance: "Advocate" | "Critic" | "Neutral Arbiter";
  avatarColor: string;
  arguments: string[];
  caveats: string[];
}

export interface DebateArtifact {
  topic: string;
  consensusSummary: string;
  perspectives: DebatePerspective[];
  synthesisVerdict: string;
}

export interface McpTool {
  id: string;
  name: string;
  server: string;
  description: string;
  enabled: boolean;
  latencyMs: number;
  inputSchemaSummary: string;
}

// --- Voice Briefing Engine Contracts ---
export interface TraceStep {
  at: string;
  kind: "search" | "fetch" | "llm" | "parse" | "error";
  detail: string;
  ms: number;
}

export interface PersonaCouncilCriteriaScore {
  criterion: string;
  score: number;
  weight: number;
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

export interface SimulationMetricPoint {
  step: number;
  timestampSeconds: number;
  throughputRps: number;
  latencyP99Ms: number;
  errorRatePct: number;
  cpuSaturationPct: number;
  circuitBreakerState: "closed" | "open" | "half_open";
  activeIncident: string | null;
}

export interface ChaosInjectionOption {
  id: string;
  name: string;
  description: string;
  category:
    | "network_partition"
    | "traffic_spike"
    | "dependency_failure"
    | "resource_starvation";
  severity: "moderate" | "severe" | "critical";
  triggerStep: number;
  durationSteps: number;
}

export interface SimulationSummary {
  scenarioName: string;
  resilienceScore: number; // 0-100
  peakP99LatencyMs: number;
  maxErrorRatePct: number;
  recoveryTimeSteps: number;
  cascadingFailureRisk: "low" | "moderate" | "critical";
  bottleneckDiagnosis: string;
  hardeningRecommendations: string[];
}

export interface ResilienceSimulationArtifact {
  id: string;
  title: string;
  description: string;
  totalSteps: number;
  baselineRps: number;
  summary: SimulationSummary;
  telemetrySeries: SimulationMetricPoint[];
  activeInjections: ChaosInjectionOption[];
  generatedAt: string;
}

export interface AudioChapterSegment {
  id: string;
  chapterIndex: number;
  title: string;
  speaker: string;
  text: string;
  estimatedDurationMs: number;
  startTimeMs: number;
  endTimeMs: number;
  keyTakeaways: string[];
}

export interface WaveformBar {
  index: number;
  heightPct: number; // 15 to 100
  energyLevel: "low" | "medium" | "high";
}

export interface AudioBriefingArtifact {
  title: string;
  totalDurationMs: number;
  totalWordCount: number;
  chapters: AudioChapterSegment[];
  waveform: WaveformBar[];
  fullNarrationScript: string;
  generatedAt: string;
}

export interface CompetitorObjection {
  objection: string;
  counterArgument: string;
  evidenceProof: string;
}

export interface CompetitorProfile {
  name: string;
  tier: "primary" | "secondary" | "emerging";
  summary: string;
  marketPosition: string;
  strengths: string[];
  weaknesses: string[];
  landmineQuestions: string[];
  objectionHandling: CompetitorObjection[];
}

export interface CompetitiveDimension {
  dimensionKey: string;
  label: string;
  category: "architecture" | "governance" | "performance" | "ux" | "cost";
  weight: number; // 0.1 to 1.0
  novaRating: number; // 1 to 5
  novaNote: string;
  competitorRatings: Record<string, { rating: number; note: string }>;
}

export interface CompetitiveBattleCardArtifact {
  id: string;
  topic: string;
  targetSector: string;
  novaMoatScore: number; // 0-100
  competitorProfiles: CompetitorProfile[];
  dimensions: CompetitiveDimension[];
  keyWinThemes: string[];
  strategicSummary: string;
  generatedAt: string;
}

export interface ProviderBenchmarkMetrics {
  providerId: string;
  displayName: string;
  tier: "flagship" | "fast" | "local" | "reasoning";
  timeToFirstTokenMs: number;
  totalLatencyMs: number;
  costPer1kInput: number; // in USD
  costPer1kOutput: number; // in USD
  qualityScore: number; // 0-100
  reasoningScore: number; // 0-100
  privacyComplianceIndex: number; // 0-100
  isAirGapped: boolean;
}

export interface ParetoOptimizationResult {
  isParetoOptimal: boolean;
  dominatedBy: string[]; // Provider IDs that dominate this point
  efficiencyScore: number; // 0-100 normalized trade-off efficiency
}

export interface RoutingRecommendation {
  strategy:
    | "cost_minimizer"
    | "latency_critical"
    | "maximum_reasoning"
    | "balanced_enterprise";
  title: string;
  primaryProviderId: string;
  fallbackProviderId: string;
  estimatedMonthlySavingsPct: number;
  rationale: string;
}

export interface ParetoFrontierArtifact {
  id: string;
  topic: string;
  workloadProfile: string;
  providers: Array<ProviderBenchmarkMetrics & ParetoOptimizationResult>;
  frontierProviderIds: string[];
  recommendations: RoutingRecommendation[];
  summary: string;
  generatedAt: string;
}

export type EvaluationCategory =
  | "adversarial_injection"
  | "grounding_alignment"
  | "edge_case_robustness"
  | "latency_sla";

export type ScenarioStatus = "passed" | "failed" | "regressed";

export interface EvaluationScenario {
  scenarioId: string;
  title: string;
  category: EvaluationCategory;
  promptInput: string;
  expectedConstraints: string[];
  actualOutputSnippet: string;
  status: ScenarioStatus;
  score: number; // 0 - 100
  latencyMs: number;
  baselineScore?: number;
  regressionDelta?: number;
  failureRationale?: string;
  remediationAction?: string;
}

export interface RegressionEvalSummary {
  totalScenarios: number;
  passedCount: number;
  failedCount: number;
  regressedCount: number;
  overallPassRatePct: number;
  averageLatencyMs: number;
  criticalRisksIdentified: number;
  healthGrade: "A+" | "A" | "B" | "C" | "F";
}

export interface RegressionEvalArtifact {
  id: string;
  topic: string;
  targetPipeline: string;
  baselineVersion: string;
  evaluatedVersion: string;
  summary: RegressionEvalSummary;
  scenarios: EvaluationScenario[];
  executiveSummary: string;
  generatedAt: string;
}

export type OwaspLlmCategory =
  | "LLM01_Prompt_Injection"
  | "LLM02_Sensitive_Information_Disclosure"
  | "LLM03_Supply_Chain_Vulnerabilities"
  | "LLM04_Data_and_Model_Poisoning"
  | "LLM06_Excessive_Agency"
  | "LLM08_Vector_and_Embedding_Weaknesses"
  | "LLM09_Misinformation"
  | "LLM10_Unbounded_Consumption";

export type AttackSeverity =
  "critical" | "high" | "medium" | "low" | "neutralized";

export interface RedTeamProbeTurn {
  turnNumber: number;
  attackerPrompt: string;
  attackTactic: string;
  targetResponseSnippet: string;
  detectedBreach: boolean;
  leakageDetails?: string;
}

export interface RedTeamAttackChain {
  chainId: string;
  vectorName: string;
  owaspCategory: OwaspLlmCategory;
  severity: AttackSeverity;
  status: "neutralized" | "exploited" | "partially_mitigated";
  turns: RedTeamProbeTurn[];
  vulnerabilityAnalysis: string;
  recommendedGuardrail: string;
}

export interface RedTeamAuditSummary {
  totalAttackChains: number;
  neutralizedCount: number;
  exploitedCount: number;
  immunityScore: number; // 0 - 100
  criticalVulnerabilities: number;
  highVulnerabilities: number;
  defensePosture: "hardened" | "resilient" | "vulnerable" | "compromised";
}

export interface RedTeamAuditArtifact {
  id: string;
  topic: string;
  targetSystem: string;
  attackChains: RedTeamAttackChain[];
  summary: RedTeamAuditSummary;
  executiveSummary: string;
  generatedAt: string;
}

export type PolicyViolationType =
  | "api_key"
  | "pii_email"
  | "pii_phone"
  | "credit_card"
  | "canary_leak"
  | "domain_boundary"
  | "hallucination_drift";

export type ViolationSeverity = "low" | "medium" | "high" | "critical";

export interface PolicyViolation {
  id: string;
  type: PolicyViolationType;
  severity: ViolationSeverity;
  offsetStart: number;
  offsetEnd: number;
  matchedPattern: string;
  redactedReplacement: string;
  description: string;
  timestamp: string;
}

export interface GuardrailRule {
  ruleId: string;
  name: string;
  description: string;
  violationType: PolicyViolationType;
  severity: ViolationSeverity;
  enabled: boolean;
  action: "block" | "redact" | "warn" | "audit";
  triggerCount: number;
}

export interface GuardrailAuditSummary {
  totalScannedChars: number;
  totalViolations: number;
  redactedCount: number;
  blockedCount: number;
  cleanTokensPct: number;
  riskGrade: "A+" | "A" | "B" | "C" | "F";
  policyStatus: "enforced" | "monitored" | "breached";
}

export interface SemanticGuardrailArtifact {
  id: string;
  topic: string;
  targetChannel: string;
  policyVersion: string;
  appliedRules: GuardrailRule[];
  violations: PolicyViolation[];
  summary: GuardrailAuditSummary;
  executiveSummary: string;
  sanitizedPreview: string;
  originalPreview: string;
  generatedAt: string;
}

export interface SpatialBoundingBox {
  id: string;
  ymin: number; // 0 - 1000 normalized coordinates
  xmin: number;
  ymax: number;
  xmax: number;
  label: string;
  confidencePct: number;
  colorHex?: string;
}

export interface VisualCitation {
  citationId: string;
  claim: string;
  boxId: string;
  frameIndex: number;
  verifiableSource: string;
}

export interface MultiModalFrame {
  frameIndex: number;
  timestampMs: number;
  label: string;
  width: number;
  height: number;
  regions: SpatialBoundingBox[];
  citations: VisualCitation[];
  visualSaliencyPct: number;
}

export interface MultiModalInspectorSummary {
  totalFrames: number;
  totalRegions: number;
  averageConfidencePct: number;
  visualGroundingIndex: number; // 0 - 100
  modalityType: "vision_video" | "screen_ui" | "audio_spectrogram";
  auditStatus: "verified" | "calibrated" | "occluded";
}

export interface MultiModalInspectionArtifact {
  id: string;
  topic: string;
  mediaSource: string;
  frames: MultiModalFrame[];
  summary: MultiModalInspectorSummary;
  executiveSummary: string;
  technicalNotes?: string;
  generatedAt: string;
}

export type GraphEntityType =
  | "concept"
  | "technology"
  | "organization"
  | "methodology"
  | "person"
  | "standard";

export type GraphRelationType =
  | "relies_on"
  | "supersedes"
  | "fails_over_to"
  | "validates"
  | "implements"
  | "competes_with"
  | "contradicts";

export interface GraphNode {
  id: string;
  label: string;
  type: GraphEntityType;
  description: string;
  centralityScore: number; // 0.0 to 1.0 (degree / normalized importance)
  degree: number; // number of incident edges
  metadata?: Record<string, string>;
}

export interface GraphEdge {
  id: string;
  source: string; // source node id
  target: string; // target node id
  relation: GraphRelationType;
  label: string;
  weight: number; // 0.1 to 1.0 (confidence / connection strength)
  bidirectional?: boolean;
}

export interface MemoryGraphSummary {
  totalNodes: number;
  totalEdges: number;
  density: number; // totalEdges / maxEdges
  averageDegree: number;
  dominantEntityType: GraphEntityType;
  mostCentralNode: string; // label of highest centrality node
}

export interface MemoryGraphArtifact {
  id: string;
  topic: string;
  executiveSummary: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  summary: MemoryGraphSummary;
  generatedAt: string;
  methodologyNotes?: string;
}

export interface AcousticSegment {
  id: string;
  startMs: number;
  endMs: number;
  speakerTag: string;
  transcriptText: string;
  acousticConfidencePct: number; // 0 - 100
  pitchHz?: number; // fundamental frequency F0
  formants?: {
    f1Hz: number;
    f2Hz: number;
    f3Hz: number;
  };
  verifiableEvidence?: string;
}

export interface SpectralBand {
  bandName: string;
  rangeHz: string;
  energyPct: number; // 0 - 100
  harmonicClarity: "pure" | "rich" | "turbulent" | "attenuated";
}

export interface AcousticSummary {
  durationSeconds: number;
  snrDb: number; // Signal-to-Noise Ratio in dB
  averageAcousticConfidencePct: number; // 0 - 100
  speechToSilenceRatio: number;
  sampleRateHz: number;
  dominantFrequencyHz: number;
  channelCount: number;
}

export interface AudioSpectrogramArtifact {
  id: string;
  topic: string;
  audioSource: string;
  summary: AcousticSummary;
  segments: AcousticSegment[];
  spectralBands: SpectralBand[];
  waveformEnvelope: number[]; // normalized amplitude points (0.0 to 1.0)
  executiveSummary: string;
  technicalNotes?: string;
  generatedAt: string;
}

// --- Prompt Optimization & DSPy Evolution Types ---
export type PromptOptimizationTechnique =
  | "few_shot_bootstrap"
  | "chain_of_thought_anchoring"
  | "constraint_hardening"
  | "role_grounding"
  | "token_pruning"
  | "hybrid_dspy_opt";

export interface PromptCandidate {
  id: string;
  iteration: number;
  label: string;
  technique: PromptOptimizationTechnique;
  promptText: string;
  systemInstruction: string;
  evalScore: number; // 0 - 100
  tokenCount: number;
  latencyMs: number;
  costPer1kCallsUsd: number;
  scoreDeltaPct: number;
  tokenDeltaPct: number;
  selected: boolean;
  rationale: string;
}

export interface PromptTestCase {
  id: string;
  input: string;
  expectedBehavior: string;
  baselineScore: number;
  optimizedScore: number;
  status: "passed" | "improved" | "regressed";
  reason: string;
}

export interface PromptParetoStep {
  iteration: number;
  candidateId: string;
  score: number;
  tokenCount: number;
  description: string;
}

export interface PromptOptimizationSummary {
  baseModel: string;
  totalIterations: number;
  baselineScore: number;
  optimizedScore: number;
  netScoreGainPct: number;
  baselineTokens: number;
  optimizedTokens: number;
  tokenSavingsPct: number;
  estimatedCostSavingsPct: number;
  bestCandidateId: string;
  paretoEfficientCount: number;
}

export interface PromptOptimizationArtifact {
  id: string;
  targetTask: string;
  createdAt: string;
  summary: PromptOptimizationSummary;
  candidates: PromptCandidate[];
  testCases: PromptTestCase[];
  metapromptTemplate: string;
  paretoLineage: PromptParetoStep[];
  technicalNotes?: string;
}

// --- Vector Space & Semantic Cluster Visualizer Types ---
export type VectorDimensionReductionMethod = "pca" | "tsne" | "umap" | "svd";

export interface VectorEmbeddingPoint {
  id: string;
  label: string;
  chunkText: string;
  tokenCount: number;
  x: number; // normalized coordinate (-1.0 to 1.0 or canvas space)
  y: number; // normalized coordinate (-1.0 to 1.0 or canvas space)
  clusterId: number;
  clusterLabel: string;
  cosineDistanceToQuery: number; // 0.0 to 1.0 (lower = closer)
  isOutlier: boolean;
  sourceId?: string;
}

export interface VectorCluster {
  id: number;
  label: string;
  color: string;
  centroidX: number;
  centroidY: number;
  pointCount: number;
  averageTokenCount: number;
  radius: number;
  topKeywords: string[];
}

export interface VectorSpaceSummary {
  totalVectors: number;
  clusterCount: number;
  embeddingDimension: number;
  reductionMethod: VectorDimensionReductionMethod;
  explainedVarianceRatio: number; // 0.0 to 1.0
  silhouetteScore: number; // -1.0 to 1.0
  outlierCount: number;
  averageCosineSimilarity: number;
}

export interface VectorSpaceArtifact {
  id: string;
  datasetTitle: string;
  targetQuery?: string;
  createdAt: string;
  summary: VectorSpaceSummary;
  points: VectorEmbeddingPoint[];
  clusters: VectorCluster[];
  executiveSummary: string;
  technicalNotes?: string;
}

// --- Causal Inference & Counterfactual DAG Types ---
export type CausalNodeType =
  "treatment" | "outcome" | "confounder" | "mediator" | "instrumental";

export interface CausalNode {
  id: string;
  label: string;
  role: CausalNodeType;
  description: string;
  observedMean: number;
  unit: string;
  x: number;
  y: number;
}

export interface CausalEdge {
  id: string;
  source: string;
  target: string;
  coefficient: number; // path coefficient (-1.0 to 1.0)
  pValue: number;
  isBackdoorPath: boolean;
  isBlocked: boolean;
  mechanism: string;
}

export interface CounterfactualScenario {
  id: string;
  name: string;
  factualCondition: string;
  factualOutcome: string;
  intervention: string; // e.g. "do(T = 1.0)"
  counterfactualOutcome: string;
  individualTreatmentEffect: number;
  confidenceInterval95: [number, number];
  explanation: string;
}

export interface CausalInferenceSummary {
  treatmentNode: string;
  outcomeNode: string;
  averageTreatmentEffect: number; // ATE
  relativeRiskRatio: number;
  confoundersControlled: string[];
  backdoorCriterionSatisfied: boolean;
  causalIdentifiability:
    "identifiable" | "partially_identifiable" | "unidentifiable";
  eValue: number; // Ding & VanderWeele robustness
}

export interface CausalDagArtifact {
  id: string;
  hypothesis: string;
  createdAt: string;
  summary: CausalInferenceSummary;
  nodes: CausalNode[];
  edges: CausalEdge[];
  counterfactuals: CounterfactualScenario[];
  executiveSummary: string;
  technicalNotes?: string;
}

export type HyperparameterType = "continuous" | "discrete" | "categorical";

export interface HyperparameterParam {
  name: string;
  type: HyperparameterType;
  min?: number;
  max?: number;
  step?: number;
  choices?: string[];
  optimalValue: number | string;
  unit: string;
}

export type AcquisitionFunctionType =
  "expected_improvement" | "upper_confidence_bound" | "probability_improvement";

export interface BayesianTrial {
  iteration: number;
  parameters: Record<string, number | string>;
  objectiveValue: number;
  standardError: number;
  acquisitionValue: number;
  isOptimal: boolean;
  status: "evaluated" | "optimal" | "proposed";
}

export interface SurrogateCurvePoint {
  x: number;
  mean: number;
  stdDev: number;
  upperConfidenceBound: number;
  lowerConfidenceBound: number;
  acquisitionValue: number;
}

export interface BayesianOptSummary {
  targetObjective: string;
  optimizationDirection: "maximize" | "minimize";
  bestObjectiveValue: number;
  baselineObjectiveValue: number;
  improvementPct: number;
  totalTrials: number;
  explorationExploitationTradeoff: number;
  acquisitionFunction: AcquisitionFunctionType;
  primaryParameter: string;
  nextSuggestedPoint: Record<string, number | string>;
  nextExpectedAcquisitionValue: number;
}

export interface BayesianOptArtifact {
  id: string;
  title: string;
  targetModel: string;
  createdAt: string;
  summary: BayesianOptSummary;
  parameters: HyperparameterParam[];
  trials: BayesianTrial[];
  surrogateCurve: SurrogateCurvePoint[];
  configSnippetYaml: string;
  configSnippetJson: string;
  executiveSummary: string;
  technicalNotes?: string;
}

export type GenerativeArtifact =
  | { type: "research"; data: ResearchReport }
  | { type: "plan"; data: GoalPlan }
  | { type: "chart"; data: ChartArtifact }
  | { type: "matrix"; data: DecisionMatrix }
  | { type: "code"; data: CodeArtifact }
  | { type: "debate"; data: DebateArtifact }
  | { type: "council"; data: PersonaCouncilArtifact }
  | { type: "simulation"; data: ResilienceSimulationArtifact }
  | { type: "audio_briefing"; data: AudioBriefingArtifact }
  | { type: "battlecard"; data: CompetitiveBattleCardArtifact }
  | { type: "pareto_frontier"; data: ParetoFrontierArtifact }
  | { type: "eval_suite"; data: RegressionEvalArtifact }
  | { type: "red_team_audit"; data: RedTeamAuditArtifact }
  | { type: "guardrail_policy"; data: SemanticGuardrailArtifact }
  | { type: "multimodal_inspection"; data: MultiModalInspectionArtifact }
  | { type: "memory_graph"; data: MemoryGraphArtifact }
  | { type: "audio_spectrogram"; data: AudioSpectrogramArtifact }
  | { type: "prompt_optimizer"; data: PromptOptimizationArtifact }
  | { type: "vector_space"; data: VectorSpaceArtifact }
  | { type: "causal_dag"; data: CausalDagArtifact }
  | { type: "bayesian_opt"; data: BayesianOptArtifact };

export interface AgentThought {
  id: string;
  timestamp: string;
  agentName: string;
  action: string;
  details?: string;
  status: "running" | "success" | "warn";
}

/** One earlier turn of the conversation, sent with follow-up questions (text only, no artifacts). */
export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  content: string;
}

export interface GenerationTelemetry {
  latencyMs: number;
  tokenCount: number;
  tokensPerSec: number;
  model: string;
  thinkingBudget?: ThinkingBudget;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  mode?: StudioMode;
  thoughts?: AgentThought[];
  artifact?: GenerativeArtifact;
  telemetry?: GenerationTelemetry;
  attachments?: Attachment[];
}

export interface KnowledgeMemoryItem {
  id: string;
  title: string;
  content: string;
  category: "preference" | "project_context" | "personal_fact" | "document";
  createdAt: string;
  updatedAt?: string;
  tags?: string[];
}

export interface Session {
  id: string;
  title: string;
  mode: StudioMode;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface UserSettings {
  geminiKey: string;
  anthropicKey: string;
  openAiKey: string;
  groqKey: string;
  ollamaBaseUrl: string;
  customEndpointUrl: string;
  customModelName: string;
  activeProvider:
    "gemini" | "anthropic" | "openai" | "groq" | "ollama" | "custom";
  enabledTools: string[];
  defaultThinkingBudget: ThinkingBudget;
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<
      string,
      { type: string; description: string; enum?: string[] }
    >;
    required?: string[];
  };
}

export interface McpPluginDefinition {
  id: string;
  name: string;
  description: string;
  category: "search" | "code" | "memory" | "integration" | "custom";
  version: string;
  author: string;
  icon: string;
  enabled: boolean;
  isCustom?: boolean;
  endpoint?: string;
  tools: McpToolDefinition[];
  stats?: {
    totalCalls: number;
    avgLatencyMs: number;
    lastExecuted?: string;
  };
}

export interface McpToolExecutionResult {
  success: boolean;
  output: unknown;
  error?: string;
  executionTimeMs: number;
  timestamp: string;
}

export interface EvalScenario {
  id: string;
  title: string;
  category:
    | "tool_composition"
    | "conflict_resolution"
    | "recursive_harness"
    | "safety_guardrail";
  complexity: "K1" | "K2" | "K3" | "K4";
  description: string;
  prompt: string;
  expectedBehavior: string;
  evalMetric: string;
}

export interface EvalScenarioResult {
  scenarioId: string;
  title: string;
  passed: boolean;
  score: number;
  latencyMs: number;
  outputPreview: string;
  feedback: string;
}

export interface EvalSuiteRun {
  id: string;
  model: string;
  timestamp: string;
  totalScenarios: number;
  passedScenarios: number;
  passRate: number;
  avgLatencyMs: number;
  toolPrecision: number;
  conflictResolutionScore: number;
  results: EvalScenarioResult[];
}

// --- Multi-Agent Swarm Orchestration Types ---
export type SwarmAgentRole = "scout" | "analyst" | "critic" | "synthesizer";
export type SwarmStageStatus = "pending" | "active" | "completed" | "failed";

export interface SwarmAgentState {
  role: SwarmAgentRole;
  name: string;
  title: string;
  status: SwarmStageStatus;
  currentTask?: string;
  findingsCount?: number;
  latencyMs?: number;
}

export interface AgentSwarmEvent {
  id: string;
  timestamp: string;
  role: SwarmAgentRole;
  type:
    | "task_started"
    | "sources_gathered"
    | "analysis_computed"
    | "evidence_audited"
    | "synthesis_ready"
    | "error";
  message: string;
  metadata?: Record<string, unknown>;
}

export interface SwarmExecutionStage {
  role: SwarmAgentRole;
  goal: string;
  status: SwarmStageStatus;
  dependencies: SwarmAgentRole[];
}

export interface SwarmExecutionPlan {
  mission: string;
  stages: Array<{
    role: SwarmAgentRole;
    goal: string;
    status: SwarmStageStatus;
    dependencies: SwarmAgentRole[];
  }>;
}
