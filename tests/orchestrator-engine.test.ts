import { describe, expect, it } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import {
  computeStronglyConnectedComponents,
  analyzeWorkflowTopology,
  synthesizeWorkflowOrchestrator,
  workflowOrchestratorToCsv,
  workflowOrchestratorToMarkdown,
} from "../src/lib/workflow/orchestrator-engine";
import type { WorkflowStateNode, WorkflowTransition } from "../src/lib/types";

describe("Autonomous Event-Driven Workflow Orchestrator Engine", () => {
  describe("Graph Algorithms & Tarjan's SCC", () => {
    it("partitions acyclic DAG into individual component states", () => {
      const states: WorkflowStateNode[] = [
        { id: "A", name: "A", type: "initial", description: "", x: 0, y: 0 },
        { id: "B", name: "B", type: "active", description: "", x: 0, y: 0 },
        { id: "C", name: "C", type: "success", description: "", x: 0, y: 0 },
      ];
      const transitions: WorkflowTransition[] = [
        { id: "t1", source: "A", target: "B", event: "NEXT" },
        { id: "t2", source: "B", target: "C", event: "FINISH" },
      ];

      const sccs = computeStronglyConnectedComponents(states, transitions);
      expect(sccs.length).toBe(3);
    });

    it("detects cyclic strongly connected components correctly", () => {
      const states: WorkflowStateNode[] = [
        { id: "A", name: "A", type: "initial", description: "", x: 0, y: 0 },
        { id: "B", name: "B", type: "active", description: "", x: 0, y: 0 },
      ];
      const transitions: WorkflowTransition[] = [
        { id: "t1", source: "A", target: "B", event: "PING" },
        { id: "t2", source: "B", target: "A", event: "PONG" },
      ];

      const sccs = computeStronglyConnectedComponents(states, transitions);
      expect(sccs.length).toBe(1);
      expect(sccs[0].length).toBe(2);
    });

    it("analyzes reachability and flags deadlocks for unlinked non-terminal states", () => {
      const states: WorkflowStateNode[] = [
        { id: "A", name: "A", type: "initial", description: "", x: 0, y: 0 },
        { id: "B", name: "B", type: "active", description: "", x: 0, y: 0 }, // non-terminal with 0 outgoing -> deadlock!
        { id: "C", name: "C", type: "success", description: "", x: 0, y: 0 },
      ];
      const transitions: WorkflowTransition[] = [
        { id: "t1", source: "A", target: "B", event: "TO_DEADLOCK" },
      ];

      const topo = analyzeWorkflowTopology(states, transitions, "A");
      expect(topo.reachableStateIds).toContain("A");
      expect(topo.reachableStateIds).toContain("B");
      expect(topo.deadlockStateIds).toContain("B");
      expect(topo.reachabilityScorePct).toBeCloseTo(66.7, 1);
    });
  });

  describe("synthesizeWorkflowOrchestrator", () => {
    it("synthesizes valid WorkflowOrchestratorArtifact with states, transitions, trace, and diagrams", () => {
      const artifact = synthesizeWorkflowOrchestrator(
        "Autonomous Agent CI/CD Pipeline",
        "agent_cicd_saga",
      );

      expect(artifact.id).toContain("wf-");
      expect(artifact.title).toBe("Autonomous Agent CI/CD Pipeline");
      expect(artifact.states.length).toBe(7);
      expect(artifact.transitions.length).toBe(9);
      expect(artifact.simulationTrace.length).toBe(5);
      expect(artifact.summary.deadlocksDetected).toBe(0);
      expect(artifact.summary.resilienceGrade).toBe("A+");
      expect(artifact.mermaidStateDiagram).toContain("stateDiagram-v2");
      expect(artifact.xstateDefinitionJson).toContain("agent_cicd_saga");
    });
  });

  describe("RFC 4180 CSV & Markdown Exports", () => {
    const artifact = synthesizeWorkflowOrchestrator();

    it("exports transitions to RFC 4180 compliant CSV with CRLF line endings", () => {
      const csv = workflowOrchestratorToCsv(artifact);
      expect(csv).toContain("transition_id,source_state,target_state,event");
      expect(csv).toContain("\r\n");
      const lines = csv.split("\r\n").filter(Boolean);
      expect(lines.length).toBe(artifact.transitions.length + 1);
    });

    it("exports executive Markdown report with Mermaid diagram, state table, and trace", () => {
      const md = workflowOrchestratorToMarkdown(artifact);
      expect(md).toContain("# ⚡ Workflow Orchestrator Studio:");
      expect(md).toContain("Visual State Machine Diagram");
      expect(md).toContain("Orchestrated Finite States");
      expect(md).toContain("Event-Driven State Transitions");
      expect(md).toContain("Execution Trace Simulation");
      expect(md).toContain("XState v5 Machine Definition");
    });
  });

  describe("Zero Pseudo-Randomness Integrity", () => {
    it("strictly verifies ZERO Math.random() in orchestrator-engine.ts", () => {
      const filePath = join(
        process.cwd(),
        "src/lib/workflow/orchestrator-engine.ts",
      );
      const source = readFileSync(filePath, "utf-8");
      expect(source).not.toContain("Math.random()");
    });
  });
});
