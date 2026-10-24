export type StudioMode = 'research' | 'planner' | 'canvas' | 'coder' | 'matrix' | 'mcp';

export type ModelProvider = 'gemini-2.0-flash' | 'claude-3-7-sonnet' | 'deepseek-r1' | 'llama-3-3-local';

export interface SourceCitation {
  id: string;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  relevanceScore: number; // 0 - 100
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
}

export interface ChartArtifact {
  title: string;
  type: 'bar' | 'line' | 'area';
  xAxisKey: string;
  data: ChartDatum[];
  insight: string;
}

export interface MatrixCriterion {
  id: string;
  name: string;
  weight: number; // 1-10
}

export interface MatrixOption {
  id: string;
  name: string;
  scores: Record<string, number>; // criterionId -> score (1-10)
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

export type GenerativeArtifact = 
  | { type: 'research'; data: ResearchReport }
  | { type: 'plan'; data: GoalPlan }
  | { type: 'chart'; data: ChartArtifact }
  | { type: 'matrix'; data: DecisionMatrix }
  | { type: 'code'; data: CodeArtifact };

export interface AgentThought {
  id: string;
  timestamp: string;
  agentName: string; // e.g., 'Lead Strategist', 'Web Crawler', 'Synthesizer', 'Verifier'
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

export interface SwarmAgentState {
  id: string;
  name: string;
  role: string;
  color: string;
  status: 'idle' | 'thinking' | 'active' | 'done';
  currentAction?: string;
}
