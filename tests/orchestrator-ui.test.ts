import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "fs";
import { join } from "path";
import { WorkflowOrchestratorCard } from "../src/components/GenerativeCards/WorkflowOrchestratorCard";
import { synthesizeWorkflowOrchestrator } from "../src/lib/workflow/orchestrator-engine";

describe("WorkflowOrchestratorCard Generative UI Component", () => {
  const sampleArtifact = synthesizeWorkflowOrchestrator(
    "Autonomous CI/CD & Canary Pipeline",
    "autonomous_cicd_saga",
  );

  it("renders workflow title, workflow name, and resilience grade in header", () => {
    const html = renderToStaticMarkup(
      React.createElement(WorkflowOrchestratorCard, {
        artifact: sampleArtifact,
      }),
    );

    expect(html).toContain("Autonomous CI/CD &amp; Canary Pipeline");
    expect(html).toContain("autonomous_cicd_saga");
    expect(html).toContain("Workflow Orchestrator");
  });

  it("renders 4-metric scorecard row with States, Transitions, and Reachability", () => {
    const html = renderToStaticMarkup(
      React.createElement(WorkflowOrchestratorCard, {
        artifact: sampleArtifact,
      }),
    );

    expect(html).toContain("Orchestrated States");
    expect(html).toContain("Event Transitions");
    expect(html).toContain("Reachability Score");
    expect(html).toContain("E2E Execution Time");
    expect(html).toContain(`${sampleArtifact.summary.reachabilityScorePct}%`);
  });

  it("renders interactive SVG state machine canvas with graphics-document ARIA role", () => {
    const html = renderToStaticMarkup(
      React.createElement(WorkflowOrchestratorCard, {
        artifact: sampleArtifact,
      }),
    );

    expect(html).toContain('role="graphics-document"');
    expect(html).toContain("Workflow State Machine Diagram");
    expect(html).toContain("Artifact Synthesis");
    expect(html).toContain("SYNTHESIS_COMPLETE");
  });

  it("renders action buttons for XState copy, report copy, and CSV download", () => {
    const html = renderToStaticMarkup(
      React.createElement(WorkflowOrchestratorCard, {
        artifact: sampleArtifact,
      }),
    );

    expect(html).toContain("XState");
    expect(html).toContain("Report");
    expect(html).toContain("CSV");
    expect(html).toContain("FSM Workflow Diagram");
    expect(html).toContain("State Catalog");
  });

  it("strictly enforces ZERO Math.random() in WorkflowOrchestratorCard source", () => {
    const filePath = join(
      process.cwd(),
      "src/components/GenerativeCards/WorkflowOrchestratorCard.tsx",
    );
    const source = readFileSync(filePath, "utf-8");
    expect(source).not.toContain("Math.random()");
  });
});
