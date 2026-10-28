import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import type {
  AgentSwarmEvent,
  StudioMode,
  SwarmAgentRole,
  SwarmAgentState,
  SwarmExecutionPlan,
} from "../src/lib/types";
import {
  createSwarmOrchestrator,
  planSwarmMission,
  SwarmDependencyError,
} from "../src/lib/research/multi-agent-orchestrator";
import {
  MultiAgentSwarmHUD,
  SwarmStatusIndicator,
} from "../src/components/MultiAgentSwarmHUD";

describe("Multi-Agent Swarm Mission Planning & DAG Generation", () => {
  it("generates a plan with all 4 required roles in pending status", () => {
    const plan = planSwarmMission(
      "Investigate next-gen solid-state batteries",
      "research",
      "analytical",
    );

    expect(plan.mission).toBe("Investigate next-gen solid-state batteries");
    expect(plan.stages).toHaveLength(4);

    const roles = plan.stages.map((s) => s.role);
    expect(roles).toEqual(["scout", "analyst", "critic", "synthesizer"]);

    for (const stage of plan.stages) {
      expect(stage.status).toBe("pending");
      expect(stage.goal.length).toBeGreaterThan(10);
    }
  });

  it("establishes sequential and parallel DAG dependencies among roles", () => {
    const plan = planSwarmMission(
      "Quantum computing encryption roadmap",
      "research",
      "deep",
    );

    const scoutStage = plan.stages.find((s) => s.role === "scout");
    const analystStage = plan.stages.find((s) => s.role === "analyst");
    const criticStage = plan.stages.find((s) => s.role === "critic");
    const synthStage = plan.stages.find((s) => s.role === "synthesizer");

    // Scout has no dependencies (entry point)
    expect(scoutStage?.dependencies).toEqual([]);

    // Analyst depends on Scout
    expect(analystStage?.dependencies).toEqual(["scout"]);

    // Critic depends on Scout (runs parallel to Analyst after Scout completes)
    expect(criticStage?.dependencies).toEqual(["scout"]);

    // Synthesizer is a join node depending on both Analyst and Critic
    expect(synthStage?.dependencies).toContain("analyst");
    expect(synthStage?.dependencies).toContain("critic");
    expect(synthStage?.dependencies).toHaveLength(2);
  });

  it("tailors agent goals based on studio mode", () => {
    const modes: StudioMode[] = [
      "research",
      "matrix",
      "planner",
      "debate",
      "coder",
      "canvas",
      "mcp",
      "intelligence",
    ];

    for (const mode of modes) {
      const plan = planSwarmMission(
        `Evaluate ${mode} domain`,
        mode,
        "analytical",
      );
      const goals = plan.stages.map((s) => s.goal.toLowerCase());

      if (mode === "matrix") {
        expect(
          goals.some(
            (g) =>
              g.includes("pricing") ||
              g.includes("criteria") ||
              g.includes("matrix"),
          ),
        ).toBe(true);
      } else if (mode === "planner") {
        expect(
          goals.some(
            (g) =>
              g.includes("milestone") ||
              g.includes("roadmap") ||
              g.includes("dependencies"),
          ),
        ).toBe(true);
      } else if (mode === "debate") {
        expect(
          goals.some(
            (g) =>
              g.includes("argument") ||
              g.includes("dialectic") ||
              g.includes("verdict"),
          ),
        ).toBe(true);
      } else if (mode === "coder") {
        expect(
          goals.some(
            (g) =>
              g.includes("code") ||
              g.includes("api") ||
              g.includes("architecture"),
          ),
        ).toBe(true);
      } else if (mode === "mcp") {
        expect(goals.some((g) => g.includes("mcp") || g.includes("tool"))).toBe(
          true,
        );
      } else if (mode === "intelligence") {
        expect(
          goals.some((g) => g.includes("memory") || g.includes("knowledge")),
        ).toBe(true);
      }
    }
  });

  it("modulates goal depth based on thinking budget", () => {
    const deepPlan = planSwarmMission(
      "AI Safety Benchmarks",
      "research",
      "deep",
    );
    const quickPlan = planSwarmMission(
      "AI Safety Benchmarks",
      "research",
      "quick",
    );

    const deepScoutGoal =
      deepPlan.stages.find((s) => s.role === "scout")?.goal ?? "";
    const quickScoutGoal =
      quickPlan.stages.find((s) => s.role === "scout")?.goal ?? "";

    expect(deepScoutGoal).toContain("Deep exhaustive");
    expect(quickScoutGoal).toContain("Rapid targeted");
  });

  it("handles blank mission string safely with a sensible fallback", () => {
    const plan = planSwarmMission("   ");
    expect(plan.mission).toBe("Multi-Agent Research Mission");
    expect(plan.stages).toHaveLength(4);
  });
});

describe("Dependency Resolution & Orchestration Scheduling", () => {
  it("correctly identifies runnable stages based on DAG dependencies", () => {
    const orchestrator = createSwarmOrchestrator("Evaluate LLM Architectures");

    // Initially, only Scout has 0 dependencies
    expect(orchestrator.canRunStage("scout")).toBe(true);
    expect(orchestrator.canRunStage("analyst")).toBe(false);
    expect(orchestrator.canRunStage("critic")).toBe(false);
    expect(orchestrator.canRunStage("synthesizer")).toBe(false);
    expect(orchestrator.getNextExecutableStages()).toEqual(["scout"]);

    // Attempting to start Analyst before Scout completes must throw SwarmDependencyError
    expect(() => orchestrator.startStage("analyst")).toThrow(
      SwarmDependencyError,
    );

    // Start and complete Scout
    orchestrator.startStage("scout", "Searching papers on arXiv");
    orchestrator.completeStage("scout", {
      findingsCount: 12,
      message: "Retrieved 12 papers",
    });

    // Scout is now completed, so both Analyst AND Critic are runnable in parallel
    expect(orchestrator.canRunStage("scout")).toBe(false); // already completed
    expect(orchestrator.canRunStage("analyst")).toBe(true);
    expect(orchestrator.canRunStage("critic")).toBe(true);
    expect(orchestrator.canRunStage("synthesizer")).toBe(false); // needs both Analyst and Critic
    const nextStages = orchestrator.getNextExecutableStages();
    expect(nextStages).toContain("analyst");
    expect(nextStages).toContain("critic");
    expect(nextStages).toHaveLength(2);

    // Complete Analyst while Critic is still pending
    orchestrator.startStage("analyst", "Computing benchmark comparisons");
    orchestrator.completeStage("analyst", { findingsCount: 8 });

    // Synthesizer still cannot run because Critic is not completed
    expect(orchestrator.canRunStage("synthesizer")).toBe(false);
    expect(orchestrator.getNextExecutableStages()).toEqual(["critic"]);

    // Complete Critic
    orchestrator.startStage("critic", "Auditing citations and factual claims");
    orchestrator.completeStage("critic", { findingsCount: 5 });

    // Both Analyst and Critic are completed -> Synthesizer is runnable
    expect(orchestrator.canRunStage("synthesizer")).toBe(true);
    expect(orchestrator.getNextExecutableStages()).toEqual(["synthesizer"]);

    // Complete Synthesizer
    orchestrator.startStage("synthesizer", "Drafting executive summary report");
    orchestrator.completeStage("synthesizer", { findingsCount: 1 });

    // All stages are completed -> no remaining executable stages
    expect(orchestrator.getNextExecutableStages()).toEqual([]);
  });
});

describe("Agent State Transitions & Latency Tracking", () => {
  it("transitions states from pending -> active -> completed", () => {
    const stateHistory: Record<string, SwarmAgentState[]> = {
      scout: [],
    };

    const orchestrator = createSwarmOrchestrator("Autonomous Vehicles 2026", {
      onStateChange: (states) => {
        stateHistory.scout.push(states.scout);
      },
    });

    const initial = orchestrator.getAgentState("scout");
    expect(initial.status).toBe("pending");
    expect(initial.findingsCount).toBe(0);
    expect(initial.latencyMs).toBe(0);

    // Active transition
    orchestrator.startStage("scout", "Crawling regulatory documentation");
    const activeState = orchestrator.getAgentState("scout");
    expect(activeState.status).toBe("active");
    expect(activeState.currentTask).toBe("Crawling regulatory documentation");

    // Completed transition
    orchestrator.completeStage("scout", {
      findingsCount: 15,
      message: "Finished crawl",
    });
    const completedState = orchestrator.getAgentState("scout");
    expect(completedState.status).toBe("completed");
    expect(completedState.findingsCount).toBe(15);
    expect(completedState.latencyMs).toBeGreaterThanOrEqual(0);

    // Plan reflects completion
    const plan = orchestrator.getPlan();
    expect(plan.stages.find((s) => s.role === "scout")?.status).toBe(
      "completed",
    );
  });

  it("handles failure state transition cleanly", () => {
    const orchestrator = createSwarmOrchestrator("Mission with Failure");

    orchestrator.startStage("scout", "Reconnaissance");
    orchestrator.failStage("scout", new Error("Rate limit exceeded 429"), {
      provider: "mock",
    });

    const scoutState = orchestrator.getAgentState("scout");
    expect(scoutState.status).toBe("failed");
    expect(scoutState.latencyMs).toBeGreaterThanOrEqual(0);

    const plan = orchestrator.getPlan();
    expect(plan.stages.find((s) => s.role === "scout")?.status).toBe("failed");

    const events = orchestrator.getEvents();
    const lastEvent = events[events.length - 1];
    expect(lastEvent.type).toBe("error");
    expect(lastEvent.message).toBe("Rate limit exceeded 429");
  });

  it("resets orchestrator state back to clean pending state", () => {
    const orchestrator = createSwarmOrchestrator("Reset Test Mission");
    orchestrator.startStage("scout");
    orchestrator.completeStage("scout", { findingsCount: 10 });

    expect(orchestrator.getAgentState("scout").status).toBe("completed");
    expect(orchestrator.getEvents().length).toBeGreaterThan(0);

    orchestrator.reset();

    expect(orchestrator.getAgentState("scout").status).toBe("pending");
    expect(orchestrator.getAgentState("scout").findingsCount).toBe(0);
    expect(orchestrator.getEvents()).toEqual([]);
    expect(orchestrator.canRunStage("scout")).toBe(true);
  });
});

describe("Event Emission Ordering & Metadata Validation", () => {
  it("emits specialized typed events for each specialist agent role in strict chronological order", () => {
    const emittedEvents: AgentSwarmEvent[] = [];

    const orchestrator = createSwarmOrchestrator(
      "Full Swarm Execution Mission",
      {
        onEvent: (evt) => emittedEvents.push(evt),
      },
    );

    // 1. Scout
    orchestrator.startStage("scout", "Crawling sources");
    orchestrator.completeStage("scout", {
      findingsCount: 7,
      metadata: { query: "solid state battery" },
    });

    // 2. Analyst
    orchestrator.startStage("analyst", "Computing energy density metrics");
    orchestrator.completeStage("analyst", {
      findingsCount: 4,
      metadata: { metric: "Wh/kg" },
    });

    // 3. Critic
    orchestrator.startStage("critic", "Auditing cell degradation claims");
    orchestrator.completeStage("critic", {
      findingsCount: 3,
      metadata: { alignmentScore: 92 },
    });

    // 4. Synthesizer
    orchestrator.startStage("synthesizer", "Compiling executive briefing");
    orchestrator.completeStage("synthesizer", {
      findingsCount: 1,
      metadata: { artifactType: "report" },
    });

    expect(emittedEvents).toHaveLength(8);

    // Event types matching the specialized role contracts
    expect(emittedEvents[0].type).toBe("task_started");
    expect(emittedEvents[0].role).toBe("scout");

    expect(emittedEvents[1].type).toBe("sources_gathered");
    expect(emittedEvents[1].role).toBe("scout");
    expect(emittedEvents[1].metadata?.findingsCount).toBe(7);

    expect(emittedEvents[2].type).toBe("task_started");
    expect(emittedEvents[2].role).toBe("analyst");

    expect(emittedEvents[3].type).toBe("analysis_computed");
    expect(emittedEvents[3].role).toBe("analyst");
    expect(emittedEvents[3].metadata?.findingsCount).toBe(4);

    expect(emittedEvents[4].type).toBe("task_started");
    expect(emittedEvents[4].role).toBe("critic");

    expect(emittedEvents[5].type).toBe("evidence_audited");
    expect(emittedEvents[5].role).toBe("critic");
    expect(emittedEvents[5].metadata?.findingsCount).toBe(3);

    expect(emittedEvents[6].type).toBe("task_started");
    expect(emittedEvents[6].role).toBe("synthesizer");

    expect(emittedEvents[7].type).toBe("synthesis_ready");
    expect(emittedEvents[7].role).toBe("synthesizer");
    expect(emittedEvents[7].metadata?.findingsCount).toBe(1);

    // Validate timestamps & IDs
    for (const event of emittedEvents) {
      expect(event.id).toMatch(/^swarm-evt-/);
      expect(typeof event.timestamp).toBe("string");
      const parsedDate = new Date(event.timestamp);
      expect(Number.isNaN(parsedDate.getTime())).toBe(false);
      expect(event.message.length).toBeGreaterThan(0);
    }
  });

  it("supports recording custom intermediate agent events", () => {
    const orchestrator = createSwarmOrchestrator("Intermediate logging");
    orchestrator.startStage("scout");

    const customEvt = orchestrator.recordEvent(
      "scout",
      "sources_gathered",
      "Partial batch: 5 sources indexed",
      { partialBatch: true, count: 5 },
    );

    expect(customEvt.role).toBe("scout");
    expect(customEvt.message).toContain("Partial batch");
    expect(customEvt.metadata?.partialBatch).toBe(true);

    const events = orchestrator.getEvents();
    expect(events).toContainEqual(customEvt);
  });
});

describe("executeStage Helper Method", () => {
  it("wraps asynchronous action execution, measuring latency and findings count", async () => {
    const orchestrator = createSwarmOrchestrator("Async Execution Mission");

    const result = await orchestrator.executeStage(
      "scout",
      async () => {
        await new Promise((res) => setTimeout(res, 20));
        return ["source-1", "source-2", "source-3"];
      },
      {
        taskDescription: "Async source fetch",
        getFindingsCount: (items) => items.length,
        completionMessage: (items) =>
          `Fetched ${items.length} items successfully`,
      },
    );

    expect(result).toEqual(["source-1", "source-2", "source-3"]);

    const scoutState = orchestrator.getAgentState("scout");
    expect(scoutState.status).toBe("completed");
    expect(scoutState.findingsCount).toBe(3);
    expect(scoutState.latencyMs).toBeGreaterThanOrEqual(15);

    const events = orchestrator.getEvents();
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe("task_started");
    expect(events[1].type).toBe("sources_gathered");
    expect(events[1].message).toBe("Fetched 3 items successfully");
  });

  it("catches errors, marks stage as failed, and rethrows", async () => {
    const orchestrator = createSwarmOrchestrator("Failing Async Mission");

    await expect(
      orchestrator.executeStage("scout", async () => {
        throw new Error("DNS resolution failed");
      }),
    ).rejects.toThrow("DNS resolution failed");

    const scoutState = orchestrator.getAgentState("scout");
    expect(scoutState.status).toBe("failed");

    const events = orchestrator.getEvents();
    expect(events[events.length - 1].type).toBe("error");
    expect(events[events.length - 1].message).toBe("DNS resolution failed");
  });
});

describe("MultiAgentSwarmHUD Component Structure & Props Handling", () => {
  const samplePlan: SwarmExecutionPlan = {
    mission: "Autonomous Web Sourcing Benchmark",
    stages: [
      {
        role: "scout",
        goal: "Crawl web sources",
        status: "completed",
        dependencies: [],
      },
      {
        role: "analyst",
        goal: "Compute quantitative metrics",
        status: "active",
        dependencies: ["scout"],
      },
      {
        role: "critic",
        goal: "Audit citations",
        status: "pending",
        dependencies: ["scout"],
      },
      {
        role: "synthesizer",
        goal: "Generate report",
        status: "pending",
        dependencies: ["analyst", "critic"],
      },
    ],
  };

  const sampleStates: Record<SwarmAgentRole, SwarmAgentState> = {
    scout: {
      role: "scout",
      name: "Scout",
      title: "Web Reconnaissance & Intelligence",
      status: "completed",
      findingsCount: 14,
      latencyMs: 380,
    },
    analyst: {
      role: "analyst",
      name: "Analyst",
      title: "Quantitative & Structural Analysis",
      status: "active",
      currentTask: "Calculating benchmark percentiles",
      findingsCount: 5,
      latencyMs: 120,
    },
    critic: {
      role: "critic",
      name: "Critic",
      title: "Fact Audit & Citation Verification",
      status: "pending",
      findingsCount: 0,
      latencyMs: 0,
    },
    synthesizer: {
      role: "synthesizer",
      name: "Synthesizer",
      title: "Executive Briefing & Artifact Generation",
      status: "pending",
      findingsCount: 0,
      latencyMs: 0,
    },
  };

  const sampleEvents: AgentSwarmEvent[] = [
    {
      id: "evt-1",
      timestamp: "2026-10-28T20:00:00.000Z",
      role: "scout",
      type: "task_started",
      message: "Scout started crawling web documents",
    },
    {
      id: "evt-2",
      timestamp: "2026-10-28T20:00:01.000Z",
      role: "scout",
      type: "sources_gathered",
      message: "Scout gathered 14 authoritative sources",
      metadata: { findingsCount: 14, latencyMs: 380 },
    },
    {
      id: "evt-3",
      timestamp: "2026-10-28T20:00:02.000Z",
      role: "analyst",
      type: "task_started",
      message: "Analyst started computing benchmark percentiles",
    },
  ];

  it("renders all 4 agent nodes with real metadata", () => {
    const html = renderToString(
      React.createElement(MultiAgentSwarmHUD, {
        plan: samplePlan,
        agentStates: sampleStates,
        events: sampleEvents,
        isExecuting: true,
      }),
    );

    // Verify all 4 agent roles and their names
    expect(html).toContain("Scout");
    expect(html).toContain("Analyst");
    expect(html).toContain("Critic");
    expect(html).toContain("Synthesizer");

    // Verify mission title
    expect(html).toContain("Autonomous Web Sourcing Benchmark");

    // Verify findings count rendering
    expect(html).toContain("14 findings");
    expect(html).toContain("380ms");

    // Verify event feed content
    expect(html).toContain("Scout gathered 14 authoritative sources");
    expect(html).toContain("Calculating benchmark percentiles");
  });

  it("handles agentStates passed as an array cleanly", () => {
    const statesArray: SwarmAgentState[] = Object.values(sampleStates);

    const html = renderToString(
      React.createElement(MultiAgentSwarmHUD, {
        agentStates: statesArray,
        events: [],
      }),
    );

    expect(html).toContain("Scout");
    expect(html).toContain("Analyst");
    expect(html).toContain("Critic");
    expect(html).toContain("Synthesizer");
    expect(html).toContain("No swarm events recorded for this selection.");
  });

  it("renders distinct status indicators correctly", () => {
    const activeHtml = renderToString(
      React.createElement(SwarmStatusIndicator, { status: "active" }),
    );
    expect(activeHtml).toContain("Active status");
    expect(activeHtml).toContain("bg-teal-400");

    const completedHtml = renderToString(
      React.createElement(SwarmStatusIndicator, { status: "completed" }),
    );
    expect(completedHtml).toContain("Completed status");
    expect(completedHtml).toContain("text-emerald-400");

    const pendingHtml = renderToString(
      React.createElement(SwarmStatusIndicator, { status: "pending" }),
    );
    expect(pendingHtml).toContain("Pending status");

    const failedHtml = renderToString(
      React.createElement(SwarmStatusIndicator, { status: "failed" }),
    );
    expect(failedHtml).toContain("Failed status");
  });
});
