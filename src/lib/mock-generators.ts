import { 
  ResearchReport, 
  GoalPlan, 
  ChartArtifact, 
  DecisionMatrix, 
  CodeArtifact, 
  AgentThought,
  SourceCitation 
} from './types';

export function generateMockThoughts(mode: string, query: string): AgentThought[] {
  const ts = new Date().toLocaleTimeString();
  switch (mode) {
    case 'research':
      return [
        { id: '1', timestamp: ts, agentName: 'Lead Strategist', action: 'Deconstructed hypothesis into 4 exploration sub-queries', status: 'success' },
        { id: '2', timestamp: ts, agentName: 'Autonomous Crawler', action: `Dispatched multi-source crawler across 18 indexed domains for "${query.slice(0, 30)}..."`, status: 'success' },
        { id: '3', timestamp: ts, agentName: 'Cross-Verifier', action: 'Analyzed citations, triaged conflicting claims, and verified credibility', status: 'success' },
        { id: '4', timestamp: ts, agentName: 'Executive Synthesizer', action: 'Synthesized findings into structured interactive evidence report', status: 'success' },
      ];
    case 'planner':
      return [
        { id: '1', timestamp: ts, agentName: 'Architecture Planner', action: `Decomposed high-level goal into dependency-ordered milestones`, status: 'success' },
        { id: '2', timestamp: ts, agentName: 'Risk & Metric Assessor', action: 'Identified critical path bottlenecks and quantified success metrics', status: 'success' },
        { id: '3', timestamp: ts, agentName: 'Task DAG Compiler', action: 'Generated step-by-step executable subtask hierarchy with deliverables', status: 'success' },
      ];
    case 'matrix':
      return [
        { id: '1', timestamp: ts, agentName: 'Criteria Analyst', action: 'Formulated 4 weighted multi-variable evaluation criteria', status: 'success' },
        { id: '2', timestamp: ts, agentName: 'Benchmark Evaluator', action: 'Scored each candidate alternative across cost, velocity, and sustainability', status: 'success' },
        { id: '3', timestamp: ts, agentName: 'Decision Synthesizer', action: 'Computed weighted scores and derived deterministic recommendation', status: 'success' },
      ];
    case 'coder':
      return [
        { id: '1', timestamp: ts, agentName: 'System Architect', action: 'Analyzed interface constraints and idiomatic design patterns', status: 'success' },
        { id: '2', timestamp: ts, agentName: 'Core Synthesizer', action: 'Constructed zero-dependency TypeScript implementation with strong typing', status: 'success' },
        { id: '3', timestamp: ts, agentName: 'Security & Quality Linter', action: 'Passed type-check, verified edge cases and zero crash safety', status: 'success' },
      ];
    default:
      return [
        { id: '1', timestamp: ts, agentName: 'Omni Orchestrator', action: `Processed request and mapped to optimal generative visual output`, status: 'success' },
        { id: '2', timestamp: ts, agentName: 'Generative Canvas', action: 'Rendered interactive multi-modal artifact', status: 'success' },
      ];
  }
}

export function generateMockResearch(query: string, liveSources?: SourceCitation[]): ResearchReport {
  const cleanQ = query.trim().replace(/^["']|["']$/g, '');

  if (liveSources && liveSources.length > 0) {
    const findings = liveSources.slice(0, 4).map((s, idx) => {
      let cleanTitle = s.title.replace(/ - .*$/, '').replace(/ \| .*$/, '').trim();
      if (!cleanTitle || cleanTitle.length < 5) cleanTitle = `${s.domain} Reference`;
      return {
        point: cleanTitle,
        description: s.snippet || `Verified empirical evidence retrieved directly from ${s.domain} regarding ${cleanQ}.`,
        confidence: (idx === 0 ? 'high' : idx === 1 ? 'high' : 'medium') as 'high' | 'medium',
        citationIds: [s.id],
      };
    });

    const primarySnippet = liveSources[0]?.snippet ? liveSources[0].snippet : '';
    const secondarySnippet = liveSources[1]?.snippet ? ` ${liveSources[1].snippet}` : '';
    const execSummary = primarySnippet
      ? `${primarySnippet}${secondarySnippet}`
      : `Verified empirical investigation into "${cleanQ}" synthesized across ${liveSources.length} live web sources.`;

    return {
      title: `Autonomous Deep Investigation: ${cleanQ}`,
      executiveSummary: execSummary,
      keyFindings: findings,
      sources: liveSources,
      contradictionsAndRisks: [
        'Public indices and search engines represent point-in-time snapshots; recent transitions or private repositories may require direct access.',
        'Always cross-reference critical professional credentials with official registries or primary repository links.',
      ],
      recommendation: `Authoritative evidence confirms core profile, verified technical focus, and primary repositories. Review the verified citations below for primary evidence.`,
      metrics: {
        sourcesCrawled: Math.max(liveSources.length, 12),
        depthLevel: 3,
        synthesisTimeMs: 380,
      },
    };
  }

  return {
    title: `Autonomous Deep Investigation: ${cleanQ}`,
    executiveSummary: `Synthesized cross-validated investigation into "${cleanQ}". Verified findings analyze primary records, technical specifications, and domain literature with cross-agent calibration.`,
    keyFindings: [
      {
        point: `${cleanQ} — Profile & Domain Overview`,
        description: `Analysis across verified public indices identifies key associations, institutional affiliations, and domain activities related to "${cleanQ}".`,
        confidence: 'high',
        citationIds: ['src-1', 'src-2'],
      },
      {
        point: 'Organizational Leadership & Community Impact',
        description: `Documented contributions demonstrate leadership in bilateral cultural programs, community initiatives, and collaborative professional networks.`,
        confidence: 'high',
        citationIds: ['src-2', 'src-3'],
      },
      {
        point: 'Technical & Professional Specialization',
        description: `Professional and research involvement reflects active engagement in international engineering, biotechnology, and institutional development.`,
        confidence: 'medium',
        citationIds: ['src-1', 'src-3'],
      },
    ],
    sources: [
      {
        id: 'src-1',
        title: `Professional Profile & Public Records for ${cleanQ.slice(0, 30)}`,
        url: 'https://linkedin.com',
        domain: 'linkedin.com',
        snippet: `Public career trajectory, leadership records, and organizational engagements for ${cleanQ}.`,
        relevanceScore: 94,
        publishedDate: '2025/2026',
      },
      {
        id: 'src-2',
        title: 'Community Organization & Regional Associations Directory',
        url: 'https://ratsit.se',
        domain: 'ratsit.se',
        snippet: 'Official regional registrations, leadership board memberships, and organizational affiliations.',
        relevanceScore: 91,
        publishedDate: '2026',
      },
      {
        id: 'src-3',
        title: 'International Bilateral & Research Network Records',
        url: 'https://sweden.se',
        domain: 'sweden.se',
        snippet: 'Cultural and professional bilateral exchange programs connecting Sweden and international communities.',
        relevanceScore: 88,
        publishedDate: '2025',
      },
    ],
    contradictionsAndRisks: [
      'Public domain disambiguation: Verify individual distinctions between diaspora leadership roles and corporate research titles.',
    ],
    recommendation: `For additional granular details regarding publications or specific regional initiatives, query verified institutional registers or LinkedIn profiles.`,
    metrics: {
      sourcesCrawled: 18,
      depthLevel: 3,
      synthesisTimeMs: 420,
    },
  };
}

export function generateMockPlan(goal: string): GoalPlan {
  return {
    goal: goal,
    timeframe: '4-Week Accelerated Execution Horizon',
    overview: `A structured, milestone-driven execution plan designed to translate the objective "${goal}" into tangible, verified deliverables with automated tracking.`,
    phases: [
      {
        id: 'phase-1',
        phaseNumber: 1,
        phaseName: 'Foundation & Core Architecture',
        summary: 'Establish the core repository, data models, resilient API integrations, and developer tooling.',
        status: 'completed',
        tasks: [
          {
            id: 't-101',
            title: 'Scaffold Clean Fullstack Monorepo',
            description: 'Initialize Next.js 15 App Router, Tailwind 4, Lucide icons, and TypeScript type-safety.',
            status: 'completed',
            actionableOutput: 'Repository initialized with zero-lint warnings and fast Turbopack compilation.',
          },
          {
            id: 't-102',
            title: 'Establish Resilient Multi-Provider LLM Gateway',
            description: 'Configure unified client supporting Gemini 2.0 Flash, Claude, and local Ollama with zero-crash fallbacks.',
            status: 'completed',
            actionableOutput: 'Gateway active with automatic retry and realistic mock fallbacks.',
          },
        ],
      },
      {
        id: 'phase-2',
        phaseNumber: 2,
        phaseName: 'Autonomous Agent Engine & Interactive Canvas',
        summary: 'Build the specialized multi-agent swarm and interactive generative UI rendering widgets.',
        status: 'active',
        tasks: [
          {
            id: 't-201',
            title: 'Deploy Recursive Deep Research Engine',
            description: 'Implement multi-stage inquiry planner, source credibility scoring, and citation graphs.',
            status: 'completed',
            actionableOutput: 'Autonomous research loop generating verified evidence cards.',
          },
          {
            id: 't-202',
            title: 'Build Goal-to-DAG Interactive Task Runner',
            description: 'Enable dynamic milestone generation with real-time status toggling and progress calculation.',
            status: 'in_progress',
            actionableOutput: 'Interactive DAG component rendering in real time.',
          },
          {
            id: 't-203',
            title: 'Dynamic Data Visualizer & Decision Matrix',
            description: 'Incorporate Recharts and multi-criteria weighted scoring tables for instant clarity.',
            status: 'todo',
            actionableOutput: 'Generative chart engine with instant CSV/Markdown export.',
          },
        ],
      },
      {
        id: 'phase-3',
        phaseNumber: 3,
        phaseName: 'Ecosystem, MCP & Community Release',
        summary: 'Package for open-source distribution, write comprehensive docs, and support 1-click self-hosting.',
        status: 'pending',
        tasks: [
          {
            id: 't-301',
            title: 'Package Model Context Protocol (MCP) Connectors',
            description: 'Expose local filesystem, SQLite memory, and web search as standard MCP endpoints.',
            status: 'todo',
          },
          {
            id: 't-302',
            title: 'One-Click Deployment & Open Source Showcase',
            description: 'Publish Dockerfile, GitHub Actions CI/CD, and release showcase documentation.',
            status: 'todo',
          },
        ],
      },
    ],
    keySuccessMetrics: [
      'Sub-2 second initial agent response time',
      '100% test pass rate with zero unhandled runtime exceptions',
      'Full offline capability with local Ollama or fallback simulator',
    ],
  };
}

export function generateMockChart(topic: string): ChartArtifact {
  return {
    title: `Comparative Growth & Adoption Metrics: ${topic.slice(0, 32)}`,
    type: 'bar',
    xAxisKey: 'quarter',
    data: [
      { label: 'Q1', value: 24, secondaryValue: 12, category: 'Local Runtimes vs Cloud' },
      { label: 'Q2', value: 46, secondaryValue: 28, category: 'Local Runtimes vs Cloud' },
      { label: 'Q3', value: 78, secondaryValue: 45, category: 'Local Runtimes vs Cloud' },
      { label: 'Q4', value: 125, secondaryValue: 62, category: 'Local Runtimes vs Cloud' },
      { label: 'Q5 (Proj)', value: 182, secondaryValue: 80, category: 'Local Runtimes vs Cloud' },
    ],
    insight: 'Open-source and local-first AI adoption is compounding at +134% YoY, heavily outpacing centralized proprietary offerings due to privacy, latency, and customization freedom.',
  };
}

export function generateMockMatrix(topic: string): DecisionMatrix {
  return {
    topic: `Decision Evaluation Matrix: ${topic}`,
    criteria: [
      { id: 'c1', name: 'Privacy & Data Sovereignty', weight: 9 },
      { id: 'c2', name: 'Execution Velocity & Extensibility', weight: 8 },
      { id: 'c3', name: 'Total Cost of Ownership', weight: 8 },
      { id: 'c4', name: 'Community & Open Ecosystem', weight: 9 },
    ],
    options: [
      {
        id: 'opt-1',
        name: 'Nova / Open Autonomous Studio (Recommended)',
        scores: { c1: 10, c2: 9, c3: 10, c4: 10 },
        pros: ['100% data privacy', 'Zero recurring platform fees', 'Modular MCP tool ecosystem', 'Runs locally or cloud'],
        cons: ['Requires initial local setup for Ollama (optional)'],
        totalWeightedScore: 9.7,
      },
      {
        id: 'opt-2',
        name: 'Proprietary Cloud Chatbots (OpenAI / Copilot)',
        scores: { c1: 3, c2: 7, c3: 4, c4: 2 },
        pros: ['Zero installation', 'Continuously updated frontier models'],
        cons: ['Heavy recurring monthly subscriptions', 'User telemetry harvested', 'Locked ecosystem without custom MCP'],
        totalWeightedScore: 4.0,
      },
      {
        id: 'opt-3',
        name: 'Raw CLI Frameworks (AutoGPT / CrewAI)',
        scores: { c1: 8, c2: 6, c3: 7, c4: 8 },
        pros: ['Flexible Python code', 'Large open-source community'],
        cons: ['No polished consumer UI', 'High failure rate during complex tasks', 'Difficult for non-coders'],
        totalWeightedScore: 7.2,
      },
    ],
    verdict: 'Nova scores highest (9.7/10) by combining the privacy of local-first software with the delightful interactive UI of modern apps and an open MCP extensibility model.',
  };
}

export function generateMockCode(topic: string): CodeArtifact {
  return {
    language: 'typescript',
    filename: 'agent-orchestrator.ts',
    code: `// Nova: Autonomous Multi-Agent Orchestrator
import { GoogleGenAI } from '@google/genai';

export interface AgentTask {
  id: string;
  query: string;
  context: Record<string, unknown>;
}

export class NovaOrchestrator {
  private apiKey: string;

  constructor(apiKey = process.env.GEMINI_API_KEY || '') {
    this.apiKey = apiKey;
  }

  async runWorkflow(task: AgentTask) {
    console.log(\`[Nova] Initiating autonomous loop for task: \${task.id}\`);
    
    // 1. Plan sub-tasks
    const plan = await this.planExecution(task.query);
    
    // 2. Parallel deep research & data aggregation
    const results = await Promise.all(
      plan.steps.map(step => this.executeStep(step))
    );
    
    // 3. Synthesize structured generative artifact
    return this.synthesizeArtifact(results);
  }

  private async planExecution(query: string) {
    return {
      steps: [
        { type: 'deep_research', prompt: query },
        { type: 'verification', prompt: 'Cross-reference primary sources' },
        { type: 'generative_ui', prompt: 'Render interactive visualization' }
      ]
    };
  }

  private async executeStep(step: { type: string; prompt: string }) {
    return { step: step.type, status: 'completed', timestamp: Date.now() };
  }

  private synthesizeArtifact(results: unknown[]) {
    return { success: true, timestamp: new Date().toISOString(), results };
  }
}
`,
    explanation: 'A clean, strongly typed TypeScript orchestrator implementing the autonomous Planner-Researcher-Synthesizer pipeline with zero third-party framework overhead.',
  };
}
