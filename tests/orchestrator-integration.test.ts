import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ArtifactStage } from "../src/components/ArtifactStage";
import {
  extractSpatialNodes,
  computeSpatialEdges,
} from "../src/lib/canvas/spatial-canvas";
import { getArtifactMetadata } from "../src/lib/print-dossier";
import { resolveDossierTitle } from "../src/lib/html-dossier";
import { formatArtifactMarkdown } from "../src/lib/session-export";
import { synthesizeWorkflowOrchestrator } from "../src/lib/workflow/orchestrator-engine";
import type { ChatMessage, GenerativeArtifact } from "../src/lib/types";

describe("Workflow Orchestrator Fullstack Integration", () => {
  const sampleWorkflow = synthesizeWorkflowOrchestrator(
    "Autonomous CI/CD & Production Canary Pipeline",
    "autonomous_cicd_saga",
  );
  const sampleArtifact: GenerativeArtifact = {
    type: "workflow_orchestrator",
    data: sampleWorkflow,
  };

  describe("ArtifactStage.tsx Workflow Orchestrator Rendering & CSV Export", () => {
    it("renders ArtifactStage preview with WorkflowOrchestratorCard for workflow_orchestrator artifacts", () => {
      const html = renderToStaticMarkup(
        React.createElement(ArtifactStage, {
          artifact: sampleArtifact,
          onClose: () => {},
        }),
      );

      expect(html).toContain(
        "Autonomous CI/CD &amp; Production Canary Pipeline",
      );
      expect(html).toContain("Download CSV");
      expect(html).toContain('role="graphics-document"');
      expect(html).toContain("Orchestrated States");
      expect(html).toContain("Reachability Score");
    });

    it("renders print dossier section for workflow_orchestrator artifacts", () => {
      const html = renderToStaticMarkup(
        React.createElement(ArtifactStage, {
          artifact: sampleArtifact,
          onClose: () => {},
        }),
      );

      expect(html).toContain(
        "Workflow: Autonomous CI/CD &amp; Production Canary Pipeline (autonomous_cicd_saga)",
      );
      expect(html).toContain("Finite States");
      expect(html).toContain("Event-Driven Workflow Orchestrator");
      expect(html).toContain("Event Transitions");
    });
  });

  describe("Spatial Intelligence Canvas Extraction & Edge Computation", () => {
    const mockMessages: ChatMessage[] = [
      {
        id: "msg-wf-1",
        role: "assistant",
        content: "Here is the autonomous workflow orchestrator.",
        timestamp: "2026-10-29T22:30:00Z",
        artifact: sampleArtifact,
      },
    ];

    it("extracts spatial canvas node with proper metrics and tags for workflow_orchestrator", () => {
      const nodes = extractSpatialNodes(mockMessages);
      expect(nodes.length).toBe(1);

      const node = nodes[0];
      expect(node.artifactType).toBe("workflow_orchestrator");
      expect(node.title).toBe("Autonomous CI/CD & Production Canary Pipeline");
      expect(node.tags).toContain("WORKFLOW");
      expect(node.tags).toContain("FINITE_STATE_MACHINE");
      expect(node.metrics?.status).toBe("verified");
      expect(node.metrics?.itemCount).toBe(sampleWorkflow.states.length);
      expect(node.metrics?.evidenceCount).toBe(
        sampleWorkflow.transitions.length,
      );
      expect(node.metrics?.score).toBe(
        Math.round(sampleWorkflow.summary.reachabilityScorePct),
      );
    });

    it("computes domain edges between workflow_orchestrator and plan nodes", () => {
      const combinedMessages: ChatMessage[] = [
        ...mockMessages,
        {
          id: "msg-plan-1",
          role: "assistant",
          content: "Plan execution steps.",
          timestamp: "2026-10-29T22:35:00Z",
          artifact: {
            type: "plan",
            data: {
              goal: "Deploy Production Fleet",
              timeframe: "Q4 2026",
              overview: "Automated production rollout plan",
              phases: [],
              keySuccessMetrics: ["zero downtime"],
            },
          },
        },
      ];

      const nodes = extractSpatialNodes(combinedMessages);
      expect(nodes.length).toBe(2);

      const edges = computeSpatialEdges(nodes);
      expect(edges.length).toBe(1);
      expect(edges[0].relationType).toBe("implements");
      expect(edges[0].label).toBe("Plan Execution Orchestration");
    });
  });

  describe("HTML & Print Dossier Resolvers", () => {
    it("resolves dossier title correctly for workflow_orchestrator", () => {
      const title = resolveDossierTitle(sampleArtifact, null);
      expect(title).toBe("Autonomous CI/CD & Production Canary Pipeline");
    });

    it("resolves print dossier metadata correctly for workflow_orchestrator", () => {
      const metadata = getArtifactMetadata(sampleArtifact);
      expect(metadata.title).toBe(
        "Autonomous CI/CD & Production Canary Pipeline",
      );
      expect(metadata.modeName).toBe("Event-Driven Workflow Orchestrator");
    });
  });

  describe("Session Export Markdown Formatter", () => {
    it("formats workflow_orchestrator markdown artifact cleanly with states and transitions", () => {
      const md = formatArtifactMarkdown(sampleArtifact);
      expect(md).toContain(
        "#### ⚡ Workflow Orchestrator Studio: Autonomous CI/CD & Production Canary Pipeline",
      );
      expect(md).toContain("Orchestrated Finite States");
      expect(md).toContain("Event-Driven State Transitions");
      expect(md).toContain("Resilience Grade");
    });
  });
});
