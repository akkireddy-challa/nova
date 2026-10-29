import type {
  AgentSwarmEvent,
  AgentThought,
  SwarmAgentRole,
  SwarmAgentState,
  SwarmExecutionPlan,
} from "../types";
import { SWARM_ROLES } from "../research/multi-agent-orchestrator";

export const SWARM_ROLES_ORDER: readonly SwarmAgentRole[] = [
  "scout",
  "analyst",
  "critic",
  "synthesizer",
] as const;

/**
 * Extracts numeric count from thought text (e.g. "Found 8 results", "Included 2 text files").
 * Zero fake numbers: only extracts what is explicitly stated in the trace.
 */
export function extractFindingsCount(text?: string): number | undefined {
  if (!text) return undefined;
  const match = text.match(
    /\b(\d+)\s*(?:[a-z-]+\s+)?(?:results?|sources?|citations?|items?|claims?|findings?|criteria|options?|files?)\b/i,
  );
  if (match) {
    const val = parseInt(match[1], 10);
    if (!isNaN(val) && val >= 0) return val;
  }
  return undefined;
}

/**
 * Extracts step latency in milliseconds from duration text (e.g. "in 1.4s", "in 250ms").
 * Returns undefined if no duration text is found.
 */
export function extractDurationMs(text?: string): number | undefined {
  if (!text) return undefined;
  const match = text.match(/\bin\s+([0-9]+(?:\.[0-9]+)?)\s*(ms|s)\b/i);
  if (match) {
    const val = parseFloat(match[1]);
    if (!isNaN(val) && val >= 0) {
      return match[2].toLowerCase() === "s"
        ? Math.round(val * 1000)
        : Math.round(val);
    }
  }
  return undefined;
}

/**
 * Parses live thought trace steps and categorizes them into specialist agent roles:
 * - Sourcing / Search / Fetch -> scout
 * - Analysis / Matrix / Metrics -> analyst
 * - Audit / Verification / Critic -> critic
 * - Synthesis / Generative Card -> synthesizer
 */
export function classifyThoughtRole(thought: AgentThought): SwarmAgentRole {
  const name = (thought.agentName || "").toLowerCase();
  const action = (thought.action || "").toLowerCase();
  const details = (thought.details || "").toLowerCase();
  const combined = `${name} ${action} ${details}`;

  // 1. Direct explicit agent name matching
  if (name.includes("scout")) return "scout";
  if (name.includes("analyst")) return "analyst";
  if (name.includes("critic")) return "critic";
  if (name.includes("synthesiz")) return "synthesizer";

  // 2. Synthesis / Generative Card (high priority for final deliverables)
  if (
    combined.includes("generative card") ||
    combined.includes("synthes") ||
    combined.includes("executive brief") ||
    name.includes("synthesis") ||
    name.includes("report") ||
    action.startsWith("synthesiz") ||
    action.startsWith("rendering deliverable") ||
    action.startsWith("generating report")
  ) {
    return "synthesizer";
  }

  // 3. Audit / Verification / Critic
  if (
    combined.includes("critic") ||
    combined.includes("audit") ||
    combined.includes("verif") || // verify, verifying, verification, verified
    combined.includes("citation") ||
    combined.includes("validation") ||
    combined.includes("validate") ||
    combined.includes("evaluat") ||
    combined.includes("fact check") ||
    combined.includes("grounding") ||
    combined.includes("contradiction") ||
    combined.includes("stress-test")
  ) {
    return "critic";
  }

  // 4. Analysis / Matrix / Metrics
  if (
    combined.includes("analyst") ||
    combined.includes("analy") ||
    combined.includes("matrix") ||
    combined.includes("metric") ||
    combined.includes("benchmark") ||
    combined.includes("quant") ||
    combined.includes("scoring") ||
    combined.includes("trade-off") ||
    combined.includes("structural") ||
    combined.includes("breakdown") ||
    combined.includes("model") ||
    combined.includes("calculation") ||
    combined.includes("computation") ||
    combined.includes("code sandbox")
  ) {
    return "analyst";
  }

  // 5. Sourcing / Search / Fetch / Reconnaissance
  if (
    combined.includes("scout") ||
    combined.includes("search") ||
    combined.includes("fetch") ||
    combined.includes("sourc") ||
    combined.includes("query") ||
    combined.includes("crawl") ||
    combined.includes("recon") ||
    combined.includes("gather") ||
    combined.includes("retriev") ||
    combined.includes("attach") ||
    combined.includes("document") ||
    combined.includes("web")
  ) {
    return "scout";
  }

  // 6. Generic deliverable / summary fallback -> synthesizer
  if (
    combined.includes("briefing") ||
    combined.includes("summary") ||
    combined.includes("deliverable") ||
    combined.includes("final")
  ) {
    return "synthesizer";
  }

  // Default entry role
  return "scout";
}

/**
 * Formats a clean active specialist thought action string (e.g. "Scout searching web", "Critic verifying evidence").
 */
export function formatActiveSpecialistThought(
  role: SwarmAgentRole,
  action?: string,
): string {
  const roleName = SWARM_ROLES[role]?.name || "Scout";
  if (!action || !action.trim()) return `${roleName} active`;

  const trimmed = action.trim();
  // If the action string already starts with the role name, preserve it
  if (trimmed.toLowerCase().startsWith(roleName.toLowerCase())) {
    return trimmed;
  }

  // Remove other role names if at the beginning
  const cleaned = trimmed.replace(
    /^(?:scout|analyst|critic|synthesizer)\s*[:·-]?\s*/i,
    "",
  );
  if (!cleaned) return `${roleName} active`;

  const lowerAction = cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
  return `${roleName} ${lowerAction}`;
}

export interface SwarmMappingResult {
  agentStates: Record<SwarmAgentRole, SwarmAgentState>;
  events: AgentSwarmEvent[];
  activeRole: SwarmAgentRole;
}

/**
 * Dynamically maps live trace thoughts to specialist agent roles, events, and states.
 * - Extracts structured AgentSwarmEvent items with timestamps and latency.
 * - Dynamically transitions agent states (pending -> active -> completed).
 * - Identifies active specialist role from the latest thought step.
 * - Strictly zero fake data or Math.random: derives states honestly from the real stream.
 */
export function mapThoughtsToSwarmEvents(
  thoughts: AgentThought[] = [],
  plan?: SwarmExecutionPlan,
): SwarmMappingResult {
  // Ensure thoughts is an array
  const safeThoughts = Array.isArray(thoughts) ? thoughts : [];

  // Initialize base states for all 4 roles
  const agentStates: Record<SwarmAgentRole, SwarmAgentState> = {
    scout: {
      role: "scout",
      name: SWARM_ROLES.scout.name,
      title: SWARM_ROLES.scout.title,
      status: "pending",
      findingsCount: 0,
      latencyMs: 0,
    },
    analyst: {
      role: "analyst",
      name: SWARM_ROLES.analyst.name,
      title: SWARM_ROLES.analyst.title,
      status: "pending",
      findingsCount: 0,
      latencyMs: 0,
    },
    critic: {
      role: "critic",
      name: SWARM_ROLES.critic.name,
      title: SWARM_ROLES.critic.title,
      status: "pending",
      findingsCount: 0,
      latencyMs: 0,
    },
    synthesizer: {
      role: "synthesizer",
      name: SWARM_ROLES.synthesizer.name,
      title: SWARM_ROLES.synthesizer.title,
      status: "pending",
      findingsCount: 0,
      latencyMs: 0,
    },
  };

  // Populate goals and initial statuses from plan if provided
  if (plan?.stages && Array.isArray(plan.stages)) {
    for (const stage of plan.stages) {
      if (agentStates[stage.role]) {
        agentStates[stage.role].currentTask = stage.goal;
        if (safeThoughts.length === 0) {
          agentStates[stage.role].status = stage.status;
        }
      }
    }
  }

  // Fallback when no thoughts are available
  if (safeThoughts.length === 0) {
    const activeFromPlan = plan?.stages?.find(
      (s) => s.status === "active",
    )?.role;
    return {
      agentStates,
      events: [],
      activeRole: activeFromPlan || "scout",
    };
  }

  // Active role is strictly derived from the latest thought step
  const latestThought = safeThoughts[safeThoughts.length - 1];
  const activeRole = classifyThoughtRole(latestThought);

  const events: AgentSwarmEvent[] = [];
  const roleThoughtsMap = new Map<SwarmAgentRole, AgentThought[]>();
  const roleEventsMap = new Map<SwarmAgentRole, AgentSwarmEvent[]>();

  for (const role of SWARM_ROLES_ORDER) {
    roleThoughtsMap.set(role, []);
    roleEventsMap.set(role, []);
  }

  // Extract structured events
  for (let i = 0; i < safeThoughts.length; i++) {
    const thought = safeThoughts[i];
    const role = classifyThoughtRole(thought);
    roleThoughtsMap.get(role)?.push(thought);

    const id = thought.id ? `swarm-evt-${thought.id}` : `swarm-evt-${i + 1}`;
    const timestamp = thought.timestamp || new Date().toISOString();

    // Determine event type
    let eventType: AgentSwarmEvent["type"];
    const isError =
      thought.status === "warn" &&
      (thought.action.toLowerCase().includes("fail") ||
        thought.action.toLowerCase().includes("error") ||
        (thought.details || "").toLowerCase().includes("fail"));

    if (isError) {
      eventType = "error";
    } else if (thought.status === "running") {
      eventType = "task_started";
    } else {
      switch (role) {
        case "scout":
          eventType = "sources_gathered";
          break;
        case "analyst":
          eventType = "analysis_computed";
          break;
        case "critic":
          eventType = "evidence_audited";
          break;
        case "synthesizer":
          eventType = "synthesis_ready";
          break;
      }
    }

    // Determine step latency honestly from duration text or timestamps
    let stepLatencyMs = 0;
    const explicitDuration = extractDurationMs(
      `${thought.action} ${thought.details || ""}`,
    );
    if (explicitDuration !== undefined) {
      stepLatencyMs = explicitDuration;
    } else if (i > 0 && safeThoughts[i - 1]?.timestamp && thought.timestamp) {
      const prevMs = Date.parse(safeThoughts[i - 1].timestamp);
      const currMs = Date.parse(thought.timestamp);
      if (!isNaN(prevMs) && !isNaN(currMs) && currMs >= prevMs) {
        stepLatencyMs = currMs - prevMs;
      }
    }

    // Extract findings count if any
    const stepFindings = extractFindingsCount(
      `${thought.action} ${thought.details || ""}`,
    );

    const event: AgentSwarmEvent = {
      id,
      timestamp,
      role,
      type: eventType,
      message: thought.action,
      metadata: {
        agentName: thought.agentName,
        status: thought.status,
        latencyMs: stepLatencyMs,
        ...(thought.details ? { details: thought.details } : {}),
        ...(stepFindings !== undefined ? { findingsCount: stepFindings } : {}),
      },
    };

    events.push(event);
    roleEventsMap.get(role)?.push(event);
  }

  // Dynamically calculate states and transitions for all 4 roles
  for (const role of SWARM_ROLES_ORDER) {
    const roleThoughts = roleThoughtsMap.get(role) || [];
    const roleEvents = roleEventsMap.get(role) || [];

    if (roleThoughts.length === 0) {
      // Role has not participated yet
      continue;
    }

    const lastThought = roleThoughts[roleThoughts.length - 1];
    agentStates[role].currentTask = lastThought.action;

    // Calculate role latency: max of timestamp span or sum of step latencies
    const firstTimestamp = Date.parse(roleThoughts[0].timestamp);
    const lastTimestamp = Date.parse(lastThought.timestamp);
    const spanMs =
      !isNaN(firstTimestamp) &&
      !isNaN(lastTimestamp) &&
      lastTimestamp >= firstTimestamp
        ? lastTimestamp - firstTimestamp
        : 0;

    const sumStepLatencies = roleEvents.reduce((acc, evt) => {
      const ms = evt.metadata?.latencyMs;
      return acc + (typeof ms === "number" ? ms : 0);
    }, 0);

    agentStates[role].latencyMs = Math.max(spanMs, sumStepLatencies);

    // Calculate findings count: max explicit findings or count of successful steps
    const explicitFindings = roleEvents
      .map((e) => e.metadata?.findingsCount as number | undefined)
      .filter(
        (count): count is number => typeof count === "number" && count >= 0,
      );

    if (explicitFindings.length > 0) {
      agentStates[role].findingsCount = Math.max(...explicitFindings);
    } else {
      agentStates[role].findingsCount = roleThoughts.filter(
        (t) => t.status === "success",
      ).length;
    }

    // Determine state transition: pending -> active -> completed (or failed)
    const hasFatalError =
      lastThought.status === "warn" &&
      (lastThought.action.toLowerCase().includes("fail") ||
        lastThought.action.toLowerCase().includes("error"));

    if (hasFatalError) {
      agentStates[role].status = "failed";
    } else if (lastThought.status === "running") {
      // If this role is the active role, it is active; if subsequent steps occurred for another role, it completed
      if (role === activeRole) {
        agentStates[role].status = "active";
      } else {
        agentStates[role].status = "completed";
      }
    } else if (lastThought.status === "success") {
      agentStates[role].status = "completed";
    } else {
      // Default to completed if finished without error
      agentStates[role].status = "completed";
    }
  }

  return {
    agentStates,
    events,
    activeRole,
  };
}
