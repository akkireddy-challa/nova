export type StudioMode = 'research' | 'planner' | 'canvas' | 'coder' | 'matrix' | 'debate' | 'data_science' | 'proctor' | 'intelligence' | 'mcp' | 'evals';

export type ModelProvider = 
  | 'gemini-3-flash'
  | 'gemini-2.5-flash'
  | 'claude-3-7-sonnet' 
  | 'deepseek-r1'
  | 'o3-mini'
  | 'llama-3-3-local'
  | 'custom-byom';

export type ThinkingBudget = 'quick' | 'analytical' | 'deep';

export interface SourceCitation {
  id: string;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  relevanceScore: number;
  publishedDate?: string;
  contradictionFlag?: boolean;
}

export interface ResearchPlanStep {
  id: string;
  query: string;
  status: 'pending' | 'searching' | 'analyzing' | 'completed';
  sourcesFound: number;
}

export interface ResearchReport {
  title: string;
  executiveSummary: string;
  keyFindings: {
    point: string;
    description: string;
    confidence: 'high' | 'medium' | 'emerging';
    citationIds: string[];
  }[];
  sources: SourceCitation[];
  contradictionsAndRisks?: string[];
  recommendation: string;
  metrics?: {
    sourcesCrawled: number;
    depthLevel: number;
    synthesisTimeMs: number;
  };
}

export interface TaskSubItem {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'completed';
  actionableOutput?: string;
}

export interface MilestonePhase {
  id: string;
  phaseNumber: number;
  phaseName: string;
  summary: string;
  status: 'pending' | 'active' | 'completed';
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
  type: 'bar' | 'line' | 'area';
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
  stance: 'Advocate' | 'Critic' | 'Neutral Arbiter';
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
export type VoiceProfileId = 'nova-analytical' | 'nova-atlas' | 'nova-pulse' | 'nova-sol';

export interface VoiceProfile {
  id: VoiceProfileId;
  name: string;
  description: string;
  gender: 'female' | 'male' | 'neutral';
  pitch: number;
  rate: number;
  accentHint?: string;
}

export interface VoiceBriefingState {
  isPlaying: boolean;
  isPaused: boolean;
  selectedVoice: VoiceProfileId;
  playbackSpeed: number; // 0.75, 1.0, 1.25, 1.5, 2.0
  progressPercent: number; // 0 - 100
  durationSeconds: number;
  currentSeconds: number;
}

// --- Data Science & Analytics Workbench Contracts ---
export interface TokenAnalysisData {
  totalTokens: number;
  uniqueTokens: number;
  averageEntropy: number; // e.g. 2.45 bits
  perplexityEstimate: number; // e.g. 5.4
  lexicalDiversity: number; // Type-Token Ratio (0.0 - 1.0)
  tokenTypeDistribution: {
    naturalLanguage: number;
    codeSyntax: number;
    numericData: number;
    punctuation: number;
  };
  topTokensByEntropy: { token: string; entropy: number; probability: number }[];
}

export interface VectorClusterPoint {
  id: string;
  label: string;
  x: number;
  y: number;
  clusterId: number;
  clusterName: string;
  relevance: number;
}

export interface VectorClusteringData {
  algorithm: 'PCA-2D' | 't-SNE' | 'UMAP';
  clusterCount: number;
  silhouetteScore: number; // -1.0 to 1.0
  points: VectorClusterPoint[];
  centroids: { clusterId: number; name: string; x: number; y: number }[];
}

export interface CalibrationBin {
  binRange: string;
  averageConfidence: number;
  empiricalAccuracy: number;
  sampleCount: number;
}

export interface ConfidenceCalibrationData {
  expectedCalibrationError: number; // ECE (e.g. 0.042)
  brierScore: number; // (e.g. 0.089)
  reliabilityCurve: CalibrationBin[];
  status: 'well-calibrated' | 'overconfident' | 'underconfident';
}

export interface DataScienceArtifact {
  title: string;
  overview: string;
  tokenAnalysis: TokenAnalysisData;
  vectorClustering: VectorClusteringData;
  confidenceCalibration: ConfidenceCalibrationData;
  statisticalVerdict: string;
}

// --- Continuous Critic & Proctor Scorecard Contracts ---
export interface ProctorRuleAudit {
  id: string;
  rule: string;
  category: 'factuality' | 'hallucination' | 'safety' | 'coherence';
  passed: boolean;
  severity: 'info' | 'warn' | 'critical';
  explanation: string;
}

export interface ProctorScorecard {
  overallScore: number; // 0 - 100
  verdict: 'APPROVED' | 'FLAGGED' | 'QUARANTINED';
  factualityIndex: number; // 0 - 100
  hallucinationRisk: 'low' | 'medium' | 'high' | 'critical';
  hallucinationRiskScore: number; // 0 - 100
  safetyGuardrailScore: number; // 0 - 100
  coherenceScore: number; // 0 - 100
  audits: ProctorRuleAudit[];
  adversarialCritique: string;
  remediationSteps?: string[];
  timestamp: string;
}

export interface ProctorScorecardArtifact {
  title: string;
  scorecard: ProctorScorecard;
}

export type GenerativeArtifact = 
  | { type: 'research'; data: ResearchReport }
  | { type: 'plan'; data: GoalPlan }
  | { type: 'chart'; data: ChartArtifact }
  | { type: 'matrix'; data: DecisionMatrix }
  | { type: 'code'; data: CodeArtifact }
  | { type: 'debate'; data: DebateArtifact }
  | { type: 'data_science'; data: DataScienceArtifact }
  | { type: 'proctor_scorecard'; data: ProctorScorecardArtifact };

export interface AgentThought {
  id: string;
  timestamp: string;
  agentName: string;
  action: string;
  details?: string;
  status: 'running' | 'success' | 'warn';
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
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  mode?: StudioMode;
  thoughts?: AgentThought[];
  artifact?: GenerativeArtifact;
  telemetry?: GenerationTelemetry;
  attachments?: Attachment[];
  proctorScorecard?: ProctorScorecard;
  voiceBriefingText?: string;
}

export interface KnowledgeMemoryItem {
  id: string;
  title: string;
  content: string;
  category: 'preference' | 'project_context' | 'personal_fact' | 'document';
  createdAt: string;
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
  activeProvider: 'gemini' | 'anthropic' | 'openai' | 'groq' | 'ollama' | 'custom';
  enabledTools: string[];
  defaultThinkingBudget: ThinkingBudget;
}

export interface SwarmAgentState {
  id: string;
  name: string;
  role: string;
  color: string;
  status: 'idle' | 'thinking' | 'active' | 'done';
  currentAction?: string;
  toolInvocations?: {
    tool: string;
    params: any;
    result?: string;
    latencyMs?: number;
  }[];
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required?: string[];
  };
}

export interface McpPluginDefinition {
  id: string;
  name: string;
  description: string;
  category: 'search' | 'code' | 'memory' | 'integration' | 'custom';
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
  output: any;
  error?: string;
  executionTimeMs: number;
  timestamp: string;
}

export interface EvalScenario {
  id: string;
  title: string;
  category: 'tool_composition' | 'conflict_resolution' | 'recursive_harness' | 'safety_guardrail';
  complexity: 'K1' | 'K2' | 'K3' | 'K4';
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
