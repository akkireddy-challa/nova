import { describe, expect, it } from "bun:test";
import type { AgentThought, SwarmExecutionPlan } from "../src/lib/types";
import {
  classifyThoughtRole,
  extractDurationMs,
  extractFindingsCount,
  formatActiveSpecialistThought,
  mapThoughtsToSwarmEvents,
} from "../src/lib/client/swarm-client";

describe("Swarm Client - classifyThoughtRole", () => {
  it("maps sourcing, search, and fetch actions to scout", () => {
    const thoughts: AgentThought[] = [
      {
        id: "1",
        timestamp: "2026-10-29T02:00:00Z",
        agentName: "Web search",
        action: "Found 12 sources via Brave Search",
        status: "success",
      },
      {
        id: "2",
        timestamp: "2026-10-29T02:00:01Z",
        agentName: "Page fetch",
        action: "Retrieved markdown content for docs",
        status: "success",
      },
      {
        id: "3",
        timestamp: "2026-10-29T02:00:02Z",
        agentName: "Query",
        action: "Decomposing search questions",
        status: "success",
      },
      {
        id: "4",
        timestamp: "2026-10-29T02:00:03Z",
        agentName: "Attachments",
        action: "Included 3 text files",
        status: "success",
      },
      {
        id: "5",
        timestamp: "2026-10-29T02:00:04Z",
        agentName: "Scout",
        action: "Crawling API documentation",
        status: "running",
      },
    ];

    for (const t of thoughts) {
      expect(classifyThoughtRole(t)).toBe("scout");
    }
  });

  it("maps analysis, matrix, and metrics actions to analyst", () => {
    const thoughts: AgentThought[] = [
      {
        id: "1",
        timestamp: "2026-10-29T02:00:05Z",
        agentName: "Analyst",
        action: "Modeling decision criteria and weights",
        status: "running",
      },
      {
        id: "2",
        timestamp: "2026-10-29T02:00:06Z",
        agentName: "Analysis",
        action: "Computed weighted criteria matrix",
        status: "success",
      },
      {
        id: "3",
        timestamp: "2026-10-29T02:00:07Z",
        agentName: "Benchmark",
        action: "Measuring throughput and latency metrics",
        status: "success",
      },
      {
        id: "4",
        timestamp: "2026-10-29T02:00:08Z",
        agentName: "Matrix",
        action: "Comparing options trade-off scores",
        status: "success",
      },
    ];

    for (const t of thoughts) {
      expect(classifyThoughtRole(t)).toBe("analyst");
    }
  });

  it("maps audit, verification, and critic actions to critic", () => {
    const thoughts: AgentThought[] = [
      {
        id: "1",
        timestamp: "2026-10-29T02:00:09Z",
        agentName: "Critic",
        action: "Auditing source citations for latency claims",
        status: "running",
      },
      {
        id: "2",
        timestamp: "2026-10-29T02:00:10Z",
        agentName: "Validation",
        action: "Verifying factual claims and constraints",
        status: "success",
      },
      {
        id: "3",
        timestamp: "2026-10-29T02:00:11Z",
        agentName: "Citations",
        action: "Auditing reference grounding",
        status: "success",
      },
    ];

    for (const t of thoughts) {
      expect(classifyThoughtRole(t)).toBe("critic");
    }
  });

  it("maps synthesis and generative card actions to synthesizer", () => {
    const thoughts: AgentThought[] = [
      {
        id: "1",
        timestamp: "2026-10-29T02:00:12Z",
        agentName: "Synthesizer",
        action: "Synthesizing executive briefing",
        status: "running",
      },
      {
        id: "2",
        timestamp: "2026-10-29T02:00:13Z",
        agentName: "Generative Card",
        action: "Rendering decision matrix card artifact",
        status: "success",
      },
      {
        id: "3",
        timestamp: "2026-10-29T02:00:14Z",
        agentName: "Synthesis",
        action: "Compiling research report deliverable",
        status: "success",
      },
    ];

    for (const t of thoughts) {
      expect(classifyThoughtRole(t)).toBe("synthesizer");
    }
  });
});

describe("Swarm Client - Fallbacks", () => {
  it("handles empty thoughts array with default pending states", () => {
    const result = mapThoughtsToSwarmEvents([]);

    expect(result.events).toHaveLength(0);
    expect(result.activeRole).toBe("scout");

    const { agentStates } = result;
    const roles = ["scout", "analyst", "critic", "synthesizer"] as const;

    for (const role of roles) {
      expect(agentStates[role].status).toBe("pending");
      expect(agentStates[role].findingsCount).toBe(0);
      expect(agentStates[role].latencyMs).toBe(0);
      expect(agentStates[role].role).toBe(role);
      expect(agentStates[role].name.length).toBeGreaterThan(0);
    }
  });

  it("handles non-array or undefined input safely", () => {
    const result = mapThoughtsToSwarmEvents(
      undefined as unknown as AgentThought[],
    );

    expect(result.events).toHaveLength(0);
    expect(result.activeRole).toBe("scout");
    expect(result.agentStates.scout.status).toBe("pending");
  });

  it("inherits goals and statuses from plan when thoughts are empty", () => {
    const plan: SwarmExecutionPlan = {
      mission: "Evaluate database architectures",
      stages: [
        {
          role: "scout",
          goal: "Search for PostgreSQL vs CockroachDB benchmarks",
          status: "completed",
          dependencies: [],
        },
        {
          role: "analyst",
          goal: "Compute throughput and p99 latency matrix",
          status: "active",
          dependencies: ["scout"],
        },
        {
          role: "critic",
          goal: "Audit independent test conditions",
          status: "pending",
          dependencies: ["scout"],
        },
        {
          role: "synthesizer",
          goal: "Synthesize recommendation card",
          status: "pending",
          dependencies: ["analyst", "critic"],
        },
      ],
    };

    const result = mapThoughtsToSwarmEvents([], plan);

    expect(result.activeRole).toBe("analyst");
    expect(result.agentStates.scout.status).toBe("completed");
    expect(result.agentStates.scout.currentTask).toBe(
      "Search for PostgreSQL vs CockroachDB benchmarks",
    );
    expect(result.agentStates.analyst.status).toBe("active");
    expect(result.agentStates.critic.status).toBe("pending");
    expect(result.agentStates.synthesizer.status).toBe("pending");
  });
});

describe("Swarm Client - Active Role Detection", () => {
  it("determines active role strictly based on the latest thought step", () => {
    const tScout: AgentThought = {
      id: "1",
      timestamp: "2026-10-29T02:00:00Z",
      agentName: "Scout",
      action: "Searching web sources",
      status: "running",
    };
    expect(mapThoughtsToSwarmEvents([tScout]).activeRole).toBe("scout");

    const tAnalyst: AgentThought = {
      id: "2",
      timestamp: "2026-10-29T02:00:02Z",
      agentName: "Analyst",
      action: "Computing matrix metrics",
      status: "running",
    };
    expect(mapThoughtsToSwarmEvents([tScout, tAnalyst]).activeRole).toBe(
      "analyst",
    );

    const tCritic: AgentThought = {
      id: "3",
      timestamp: "2026-10-29T02:00:04Z",
      agentName: "Critic",
      action: "Verifying evidence and citations",
      status: "running",
    };
    expect(
      mapThoughtsToSwarmEvents([tScout, tAnalyst, tCritic]).activeRole,
    ).toBe("critic");

    const tSynth: AgentThought = {
      id: "4",
      timestamp: "2026-10-29T02:00:06Z",
      agentName: "Synthesizer",
      action: "Synthesizing executive briefing",
      status: "running",
    };
    expect(
      mapThoughtsToSwarmEvents([tScout, tAnalyst, tCritic, tSynth]).activeRole,
    ).toBe("synthesizer");
  });
});

describe("Swarm Client - State Transitions Across All 4 Roles", () => {
  it("dynamically transitions agent states from pending to active to completed", () => {
    // Step 1: Scout starts running
    const step1: AgentThought[] = [
      {
        id: "th-1",
        timestamp: "2026-10-29T02:00:00Z",
        agentName: "Scout",
        action: "Searching web for NVIDIA Blackwell specs",
        status: "running",
      },
    ];
    let res = mapThoughtsToSwarmEvents(step1);
    expect(res.agentStates.scout.status).toBe("active");
    expect(res.agentStates.analyst.status).toBe("pending");
    expect(res.agentStates.critic.status).toBe("pending");
    expect(res.agentStates.synthesizer.status).toBe("pending");
    expect(res.activeRole).toBe("scout");

    // Step 2: Scout completes, Analyst starts running
    const step2: AgentThought[] = [
      {
        id: "th-1",
        timestamp: "2026-10-29T02:00:00Z",
        agentName: "Web search",
        action: "Found 8 sources in 1.2s",
        status: "success",
      },
      {
        id: "th-2",
        timestamp: "2026-10-29T02:00:02Z",
        agentName: "Analyst",
        action: "Calculating matrix criteria",
        status: "running",
      },
    ];
    res = mapThoughtsToSwarmEvents(step2);
    expect(res.agentStates.scout.status).toBe("completed");
    expect(res.agentStates.analyst.status).toBe("active");
    expect(res.agentStates.critic.status).toBe("pending");
    expect(res.agentStates.synthesizer.status).toBe("pending");
    expect(res.activeRole).toBe("analyst");

    // Step 3: Analyst completes, Critic starts running
    const step3: AgentThought[] = [
      ...step2.slice(0, 1),
      {
        id: "th-2",
        timestamp: "2026-10-29T02:00:02Z",
        agentName: "Analyst",
        action: "Extracted 6 criteria in 800ms",
        status: "success",
      },
      {
        id: "th-3",
        timestamp: "2026-10-29T02:00:03Z",
        agentName: "Critic",
        action: "Auditing source citations",
        status: "running",
      },
    ];
    res = mapThoughtsToSwarmEvents(step3);
    expect(res.agentStates.scout.status).toBe("completed");
    expect(res.agentStates.analyst.status).toBe("completed");
    expect(res.agentStates.critic.status).toBe("active");
    expect(res.agentStates.synthesizer.status).toBe("pending");
    expect(res.activeRole).toBe("critic");

    // Step 4: Critic completes, Synthesizer starts running
    const step4: AgentThought[] = [
      ...step3.slice(0, 2),
      {
        id: "th-3",
        timestamp: "2026-10-29T02:00:03Z",
        agentName: "Critic",
        action: "Audited 8 citations with 0 contradictions",
        status: "success",
      },
      {
        id: "th-4",
        timestamp: "2026-10-29T02:00:04Z",
        agentName: "Synthesizer",
        action: "Rendering executive briefing",
        status: "running",
      },
    ];
    res = mapThoughtsToSwarmEvents(step4);
    expect(res.agentStates.scout.status).toBe("completed");
    expect(res.agentStates.analyst.status).toBe("completed");
    expect(res.agentStates.critic.status).toBe("completed");
    expect(res.agentStates.synthesizer.status).toBe("active");
    expect(res.activeRole).toBe("synthesizer");

    // Step 5: Synthesizer completes
    const step5: AgentThought[] = [
      ...step4.slice(0, 3),
      {
        id: "th-4",
        timestamp: "2026-10-29T02:00:04Z",
        agentName: "Synthesizer",
        action: "Synthesized executive briefing deliverable",
        status: "success",
      },
    ];
    res = mapThoughtsToSwarmEvents(step5);
    expect(res.agentStates.scout.status).toBe("completed");
    expect(res.agentStates.analyst.status).toBe("completed");
    expect(res.agentStates.critic.status).toBe("completed");
    expect(res.agentStates.synthesizer.status).toBe("completed");
  });

  it("marks agent as failed when encountering fatal warn error", () => {
    const thoughts: AgentThought[] = [
      {
        id: "1",
        timestamp: "2026-10-29T02:00:00Z",
        agentName: "Web search",
        action: "Found 5 sources",
        status: "success",
      },
      {
        id: "2",
        timestamp: "2026-10-29T02:00:01Z",
        agentName: "Analyst",
        action: "Matrix computation failed: division by zero",
        status: "warn",
      },
    ];

    const res = mapThoughtsToSwarmEvents(thoughts);
    expect(res.agentStates.scout.status).toBe("completed");
    expect(res.agentStates.analyst.status).toBe("failed");
    expect(res.events.find((e) => e.role === "analyst")?.type).toBe("error");
  });
});

describe("Swarm Client - Event and Metric Extraction (Zero Fake Data)", () => {
  it("extracts explicit findings and duration from thought actions", () => {
    const thoughts: AgentThought[] = [
      {
        id: "t-1",
        timestamp: "2026-10-29T02:00:00Z",
        agentName: "Web search",
        action: "Aggregated and deduplicated 15 distinct sources in 1.4s",
        status: "success",
      },
      {
        id: "t-2",
        timestamp: "2026-10-29T02:00:02Z",
        agentName: "Matrix",
        action: "Computed scores across 4 options in 650ms",
        status: "success",
      },
    ];

    const res = mapThoughtsToSwarmEvents(thoughts);

    expect(res.events).toHaveLength(2);

    const scoutEvt = res.events[0];
    expect(scoutEvt.role).toBe("scout");
    expect(scoutEvt.type).toBe("sources_gathered");
    expect(scoutEvt.metadata?.findingsCount).toBe(15);
    expect(scoutEvt.metadata?.latencyMs).toBe(1400);

    const analystEvt = res.events[1];
    expect(analystEvt.role).toBe("analyst");
    expect(analystEvt.type).toBe("analysis_computed");
    expect(analystEvt.metadata?.findingsCount).toBe(4);
    expect(analystEvt.metadata?.latencyMs).toBe(650);

    expect(res.agentStates.scout.findingsCount).toBe(15);
    expect(res.agentStates.scout.latencyMs).toBe(1400);
    expect(res.agentStates.analyst.findingsCount).toBe(4);
    expect(res.agentStates.analyst.latencyMs).toBe(650);
  });

  it("calculates latency from timestamps when duration text is omitted", () => {
    const thoughts: AgentThought[] = [
      {
        id: "t-1",
        timestamp: "2026-10-29T02:00:00.000Z",
        agentName: "Scout",
        action: "Fetching live documentation",
        status: "running",
      },
      {
        id: "t-2",
        timestamp: "2026-10-29T02:00:02.500Z",
        agentName: "Scout",
        action: "Documentation fetched",
        status: "success",
      },
    ];

    const res = mapThoughtsToSwarmEvents(thoughts);

    expect(res.events[1].metadata?.latencyMs).toBe(2500);
    expect(res.agentStates.scout.latencyMs).toBe(2500);
  });
});

describe("Swarm Client - Formatting Utilities", () => {
  it("formats active specialist thought strings nicely", () => {
    expect(formatActiveSpecialistThought("scout", "Searching web")).toBe(
      "Scout searching web",
    );
    expect(formatActiveSpecialistThought("critic", "Verifying evidence")).toBe(
      "Critic verifying evidence",
    );
    expect(
      formatActiveSpecialistThought("analyst", "Analyst computing matrix"),
    ).toBe("Analyst computing matrix");
    expect(formatActiveSpecialistThought("synthesizer", "")).toBe(
      "Synthesizer active",
    );
  });

  it("extracts findings count correctly with regex", () => {
    expect(extractFindingsCount("Found 7 results")).toBe(7);
    expect(extractFindingsCount("Aggregated 12 distinct sources")).toBe(12);
    expect(extractFindingsCount("Verified 5 citations")).toBe(5);
    expect(extractFindingsCount("No numbers here")).toBeUndefined();
  });

  it("extracts duration ms correctly with regex", () => {
    expect(extractDurationMs("Completed in 1.5s")).toBe(1500);
    expect(extractDurationMs("Executed in 250ms")).toBe(250);
    expect(extractDurationMs("No duration specified")).toBeUndefined();
  });
});
