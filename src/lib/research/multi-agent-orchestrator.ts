import type {
  AgentSwarmEvent,
  StudioMode,
  SwarmAgentRole,
  SwarmAgentState,
  SwarmExecutionPlan,
  SwarmExecutionStage,
  ThinkingBudget,
} from "../types";

export interface SwarmRoleDefinition {
  name: string;
  title: string;
  description: string;
  defaultEventType: AgentSwarmEvent["type"];
}

export const SWARM_ROLES: Record<SwarmAgentRole, SwarmRoleDefinition> = {
  scout: {
    name: "Scout",
    title: "Web Reconnaissance & Intelligence",
    description:
      "Crawls external web sources, documentation, and live data feeds.",
    defaultEventType: "sources_gathered",
  },
  analyst: {
    name: "Analyst",
    title: "Quantitative & Structural Analysis",
    description:
      "Computes benchmark metrics, analyzes structures, and scores comparative trade-offs.",
    defaultEventType: "analysis_computed",
  },
  critic: {
    name: "Critic",
    title: "Fact Audit & Citation Verification",
    description:
      "Audits claims against source citations, detects contradictions, and verifies factual grounding.",
    defaultEventType: "evidence_audited",
  },
  synthesizer: {
    name: "Synthesizer",
    title: "Executive Briefing & Artifact Generation",
    description:
      "Synthesizes audited intelligence into executive deliverables and interactive artifacts.",
    defaultEventType: "synthesis_ready",
  },
};

/**
 * Creates goals tailored to the studio mode and thinking budget for each specialist role.
 */
function buildStageGoal(
  role: SwarmAgentRole,
  mission: string,
  mode: StudioMode,
  budget: ThinkingBudget,
): string {
  const depthPrefix =
    budget === "deep"
      ? "Deep exhaustive"
      : budget === "quick"
        ? "Rapid targeted"
        : "Structured";

  switch (mode) {
    case "matrix":
      if (role === "scout") {
        return `${depthPrefix} reconnaissance of feature specs, pricing models, and vendor capabilities for "${mission}".`;
      }
      if (role === "analyst") {
        return `Extract comparative criteria, assign normalized weights, and compute weighted decision scores for candidate options.`;
      }
      if (role === "critic") {
        return `Audit scoring consistency, challenge subjective assumptions, and verify constraint feasibility.`;
      }
      return `Synthesize verified multi-attribute decision matrix and formulate final recommendation.`;

    case "planner":
      if (role === "scout") {
        return `${depthPrefix} retrieval of execution dependencies, regulatory constraints, and reference architectures for "${mission}".`;
      }
      if (role === "analyst") {
        return `Model milestone phases, task sub-items, timeframes, and critical path dependencies.`;
      }
      if (role === "critic") {
        return `Stress-test resource constraints, operational risks, and single-point-of-failure bottlenecks.`;
      }
      return `Compile comprehensive milestone execution roadmap and quantifiable success metrics.`;

    case "debate":
      if (role === "scout") {
        return `${depthPrefix} gathering of primary arguments, counterarguments, and real-world case studies for "${mission}".`;
      }
      if (role === "analyst") {
        return `Structure dialectic perspectives, compare trade-offs, and map supporting premises.`;
      }
      if (role === "critic") {
        return `Audit logical fallacies, source bias, and evidentiary strength for each stance.`;
      }
      return `Synthesize balanced dialectic briefing, consensus points, and neutral arbiter verdict.`;

    case "coder":
      if (role === "scout") {
        return `${depthPrefix} retrieval of API documentation, library conventions, and reference implementations for "${mission}".`;
      }
      if (role === "analyst") {
        return `Architect module interfaces, data structures, and algorithmic complexity tradeoffs.`;
      }
      if (role === "critic") {
        return `Audit edge case safety, security boundaries, performance bottlenecks, and typing constraints.`;
      }
      return `Synthesize production-grade code artifact and operational usage documentation.`;

    case "canvas":
      if (role === "scout") {
        return `${depthPrefix} gathering of architectural patterns, node schemas, and topological relationships for "${mission}".`;
      }
      if (role === "analyst") {
        return `Compute spatial layout coordinates, data flows, and subsystem clusters.`;
      }
      if (role === "critic") {
        return `Audit node connectivity, acyclic flow integrity, and schema compliance.`;
      }
      return `Synthesize interactive canvas graph structure and visual hierarchy.`;

    case "mcp":
      if (role === "scout") {
        return `${depthPrefix} discovery of available MCP tools, schema definitions, and server endpoints for "${mission}".`;
      }
      if (role === "analyst") {
        return `Formulate tool call parameters, execution sequences, and input/output schema bindings.`;
      }
      if (role === "critic") {
        return `Audit tool execution permissions, parameter boundaries, and error recovery strategies.`;
      }
      return `Synthesize MCP orchestration report with tool call traces and operational logs.`;

    case "intelligence":
      if (role === "scout") {
        return `${depthPrefix} semantic retrieval from persistent memory, indexed documents, and past conversations for "${mission}".`;
      }
      if (role === "analyst") {
        return `Compute vector similarity clusters, temporal knowledge graphs, and associative links.`;
      }
      if (role === "critic") {
        return `Audit factual consistency against existing knowledge records and flag contradictions.`;
      }
      return `Synthesize contextualized intelligence briefing grounded in user knowledge graphs.`;

    case "research":
    default:
      if (role === "scout") {
        return `${depthPrefix} web sourcing and literature retrieval across primary sources for "${mission}".`;
      }
      if (role === "analyst") {
        return `Extract quantitative metrics, compare empirical data points, and identify emerging patterns.`;
      }
      if (role === "critic") {
        return `Audit citation validity, calculate factual alignment scores, and isolate unverified claims.`;
      }
      return `Synthesize executive research dossier with verified key findings and strategic recommendations.`;
  }
}

/**
 * Plans a swarm mission by constructing the DAG of agent execution stages.
 *
 * Dependency Architecture:
 * - Scout: [] (Entry node, initiates web sourcing and intelligence gathering)
 * - Analyst: ["scout"] (Sequential dependent on Scout; processes retrieved sources)
 * - Critic: ["scout"] (Parallel peer of Analyst; audits sources and citations concurrently)
 * - Synthesizer: ["analyst", "critic"] (Join node; waits for both Analyst and Critic)
 */
export function planSwarmMission(
  mission: string,
  mode: StudioMode = "research",
  budget: ThinkingBudget = "analytical",
): SwarmExecutionPlan {
  const cleanMission = mission.trim() || "Multi-Agent Research Mission";

  const stages: SwarmExecutionStage[] = [
    {
      role: "scout",
      goal: buildStageGoal("scout", cleanMission, mode, budget),
      status: "pending",
      dependencies: [],
    },
    {
      role: "analyst",
      goal: buildStageGoal("analyst", cleanMission, mode, budget),
      status: "pending",
      dependencies: ["scout"],
    },
    {
      role: "critic",
      goal: buildStageGoal("critic", cleanMission, mode, budget),
      status: "pending",
      dependencies: ["scout"],
    },
    {
      role: "synthesizer",
      goal: buildStageGoal("synthesizer", cleanMission, mode, budget),
      status: "pending",
      dependencies: ["analyst", "critic"],
    },
  ];

  return {
    mission: cleanMission,
    stages,
  };
}

export class SwarmDependencyError extends Error {
  constructor(
    public readonly role: SwarmAgentRole,
    public readonly unmetDependencies: SwarmAgentRole[],
  ) {
    super(
      `Cannot start agent stage "${role}": unmet dependencies [${unmetDependencies.join(", ")}].`,
    );
    this.name = "SwarmDependencyError";
  }
}

export interface SwarmOrchestratorOptions {
  mode?: StudioMode;
  budget?: ThinkingBudget;
  plan?: SwarmExecutionPlan;
  onEvent?: (event: AgentSwarmEvent) => void;
  onStateChange?: (states: Record<SwarmAgentRole, SwarmAgentState>) => void;
}

export interface SwarmStageCompletionOptions {
  findingsCount?: number;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface SwarmOrchestrator {
  getMission(): string;
  getPlan(): SwarmExecutionPlan;
  getStates(): Record<SwarmAgentRole, SwarmAgentState>;
  getAgentState(role: SwarmAgentRole): SwarmAgentState;
  getEvents(): AgentSwarmEvent[];
  canRunStage(role: SwarmAgentRole): boolean;
  getNextExecutableStages(): SwarmAgentRole[];
  startStage(role: SwarmAgentRole, taskDescription?: string): AgentSwarmEvent;
  completeStage(
    role: SwarmAgentRole,
    options?: SwarmStageCompletionOptions,
  ): AgentSwarmEvent;
  failStage(
    role: SwarmAgentRole,
    error: string | Error,
    metadata?: Record<string, unknown>,
  ): AgentSwarmEvent;
  recordEvent(
    role: SwarmAgentRole,
    type: AgentSwarmEvent["type"],
    message: string,
    metadata?: Record<string, unknown>,
  ): AgentSwarmEvent;
  executeStage<T>(
    role: SwarmAgentRole,
    action: () => Promise<T> | T,
    options?: {
      taskDescription?: string;
      completionMessage?: string | ((result: T) => string);
      getFindingsCount?: (result: T) => number;
      metadata?: Record<string, unknown>;
    },
  ): Promise<T>;
  reset(): void;
}

function initializeAgentStates(
  stages: SwarmExecutionStage[],
): Record<SwarmAgentRole, SwarmAgentState> {
  const roles: SwarmAgentRole[] = ["scout", "analyst", "critic", "synthesizer"];
  const stageMap = new Map(stages.map((s) => [s.role, s]));

  const states = {} as Record<SwarmAgentRole, SwarmAgentState>;
  for (const role of roles) {
    const meta = SWARM_ROLES[role];
    const stage = stageMap.get(role);
    states[role] = {
      role,
      name: meta.name,
      title: meta.title,
      status: stage?.status ?? "pending",
      findingsCount: 0,
      latencyMs: 0,
    };
  }
  return states;
}

/**
 * Creates an orchestration controller for the multi-agent swarm.
 * Tracks deterministic state transitions, validates DAG dependencies, and emits typed events.
 */
export function createSwarmOrchestrator(
  mission: string,
  options: SwarmOrchestratorOptions = {},
): SwarmOrchestrator {
  const mode = options.mode ?? "research";
  const budget = options.budget ?? "analytical";

  let plan: SwarmExecutionPlan = options.plan
    ? JSON.parse(JSON.stringify(options.plan))
    : planSwarmMission(mission, mode, budget);

  let states = initializeAgentStates(plan.stages);
  const events: AgentSwarmEvent[] = [];
  const startTimes = new Map<SwarmAgentRole, number>();

  function notifyStateChange() {
    if (options.onStateChange) {
      options.onStateChange({ ...states });
    }
  }

  function emitSwarmEvent(
    role: SwarmAgentRole,
    type: AgentSwarmEvent["type"],
    message: string,
    metadata?: Record<string, unknown>,
  ): AgentSwarmEvent {
    const event: AgentSwarmEvent = {
      id: `swarm-evt-${role}-${Date.now()}-${events.length + 1}`,
      timestamp: new Date().toISOString(),
      role,
      type,
      message,
      ...(metadata ? { metadata } : {}),
    };

    events.push(event);
    options.onEvent?.(event);
    return event;
  }

  function getUnmetDependencies(role: SwarmAgentRole): SwarmAgentRole[] {
    const stage = plan.stages.find((s) => s.role === role);
    if (!stage) return [];
    return stage.dependencies.filter((depRole) => {
      const depStage = plan.stages.find((s) => s.role === depRole);
      return depStage?.status !== "completed";
    });
  }

  const orchestrator: SwarmOrchestrator = {
    getMission(): string {
      return plan.mission;
    },

    getPlan(): SwarmExecutionPlan {
      return JSON.parse(JSON.stringify(plan));
    },

    getStates(): Record<SwarmAgentRole, SwarmAgentState> {
      return JSON.parse(JSON.stringify(states));
    },

    getAgentState(role: SwarmAgentRole): SwarmAgentState {
      return { ...states[role] };
    },

    getEvents(): AgentSwarmEvent[] {
      return [...events];
    },

    canRunStage(role: SwarmAgentRole): boolean {
      const stage = plan.stages.find((s) => s.role === role);
      if (!stage || stage.status !== "pending") return false;
      return getUnmetDependencies(role).length === 0;
    },

    getNextExecutableStages(): SwarmAgentRole[] {
      return plan.stages
        .filter(
          (stage) =>
            stage.status === "pending" && orchestrator.canRunStage(stage.role),
        )
        .map((s) => s.role);
    },

    startStage(
      role: SwarmAgentRole,
      taskDescription?: string,
    ): AgentSwarmEvent {
      const stage = plan.stages.find((s) => s.role === role);
      if (!stage) {
        throw new Error(`Stage for role "${role}" not found in swarm plan.`);
      }

      const unmet = getUnmetDependencies(role);
      if (unmet.length > 0) {
        throw new SwarmDependencyError(role, unmet);
      }

      startTimes.set(role, Date.now());
      stage.status = "active";

      const currentTask = taskDescription ?? stage.goal;
      states[role] = {
        ...states[role],
        status: "active",
        currentTask,
      };

      const event = emitSwarmEvent(role, "task_started", currentTask, {
        stageGoal: stage.goal,
        dependencies: stage.dependencies,
      });

      notifyStateChange();
      return event;
    },

    completeStage(
      role: SwarmAgentRole,
      stageOptions: SwarmStageCompletionOptions = {},
    ): AgentSwarmEvent {
      const stage = plan.stages.find((s) => s.role === role);
      if (!stage) {
        throw new Error(`Stage for role "${role}" not found in swarm plan.`);
      }

      const startTime = startTimes.get(role);
      const latencyMs = startTime !== undefined ? Date.now() - startTime : 0;
      const findingsCount =
        stageOptions.findingsCount !== undefined
          ? stageOptions.findingsCount
          : (states[role]?.findingsCount ?? 0);

      stage.status = "completed";
      states[role] = {
        ...states[role],
        status: "completed",
        findingsCount,
        latencyMs,
      };

      const defaultEventType = SWARM_ROLES[role].defaultEventType;
      const defaultMessage = `${SWARM_ROLES[role].name} completed: ${stage.goal} (${findingsCount} findings, ${latencyMs}ms)`;
      const message = stageOptions.message ?? defaultMessage;

      const event = emitSwarmEvent(role, defaultEventType, message, {
        latencyMs,
        findingsCount,
        ...stageOptions.metadata,
      });

      notifyStateChange();
      return event;
    },

    failStage(
      role: SwarmAgentRole,
      error: string | Error,
      metadata: Record<string, unknown> = {},
    ): AgentSwarmEvent {
      const stage = plan.stages.find((s) => s.role === role);
      if (stage) {
        stage.status = "failed";
      }

      const startTime = startTimes.get(role);
      const latencyMs = startTime !== undefined ? Date.now() - startTime : 0;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      states[role] = {
        ...states[role],
        status: "failed",
        latencyMs,
      };

      const event = emitSwarmEvent(role, "error", errorMessage, {
        latencyMs,
        error: errorMessage,
        ...metadata,
      });

      notifyStateChange();
      return event;
    },

    recordEvent(
      role: SwarmAgentRole,
      type: AgentSwarmEvent["type"],
      message: string,
      metadata?: Record<string, unknown>,
    ): AgentSwarmEvent {
      return emitSwarmEvent(role, type, message, metadata);
    },

    async executeStage<T>(
      role: SwarmAgentRole,
      action: () => Promise<T> | T,
      execOptions: {
        taskDescription?: string;
        completionMessage?: string | ((result: T) => string);
        getFindingsCount?: (result: T) => number;
        metadata?: Record<string, unknown>;
      } = {},
    ): Promise<T> {
      orchestrator.startStage(role, execOptions.taskDescription);

      try {
        const result = await action();
        const findingsCount = execOptions.getFindingsCount
          ? execOptions.getFindingsCount(result)
          : undefined;

        const message =
          typeof execOptions.completionMessage === "function"
            ? execOptions.completionMessage(result)
            : execOptions.completionMessage;

        orchestrator.completeStage(role, {
          findingsCount,
          message,
          metadata: execOptions.metadata,
        });

        return result;
      } catch (err) {
        orchestrator.failStage(
          role,
          err instanceof Error ? err : new Error(String(err)),
          execOptions.metadata,
        );
        throw err;
      }
    },

    reset(): void {
      plan = options.plan
        ? JSON.parse(JSON.stringify(options.plan))
        : planSwarmMission(mission, mode, budget);
      states = initializeAgentStates(plan.stages);
      events.length = 0;
      startTimes.clear();
      notifyStateChange();
    },
  };

  return orchestrator;
}
