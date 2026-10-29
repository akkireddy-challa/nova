import { describe, it, expect } from "bun:test";
import React from "react";
import ReactDOMServer from "react-dom/server";
import fs from "fs";
import path from "path";
import { ArtifactStage } from "@/components/ArtifactStage";
import {
  extractSpatialNodes,
  computeSpatialEdges,
} from "@/lib/canvas/spatial-canvas";
import { getArtifactMetadata } from "@/lib/print-dossier";
import { formatArtifactMarkdown } from "@/lib/session-export";
import {
  synthesizeRedTeamAudit,
  redTeamAuditToCsv,
  redTeamAuditToMarkdown,
} from "@/lib/security/red-team-auditor";
import type { ChatMessage, GenerativeArtifact } from "@/lib/types";

describe("Red-Team Vulnerability Auditor Fullstack Integration", () => {
  const sampleAudit = synthesizeRedTeamAudit(
    "Production Financial Agent & Automated Trading Pipeline",
  );

  const sampleAuditArtifact: GenerativeArtifact = {
    type: "red_team_audit",
    data: sampleAudit,
  };

  const sampleMessages: ChatMessage[] = [
    {
      id: "msg-audit-1",
      role: "assistant",
      content:
        "Here is the dialectic red-team security vulnerability audit for the trading pipeline.",
      timestamp: "2026-10-29T06:00:00.000Z",
      artifact: sampleAuditArtifact,
    },
  ];

  describe("ArtifactStage.tsx Red Team Rendering & CSV Export", () => {
    it("imports RedTeamAuditCard and redTeamAuditToCsv in ArtifactStage", () => {
      const filePath = path.join(
        process.cwd(),
        "src/components/ArtifactStage.tsx",
      );
      const source = fs.readFileSync(filePath, "utf-8");
      expect(source).toContain("RedTeamAuditCard");
      expect(source).toContain("redTeamAuditToCsv");
    });

    it("renders ArtifactStage preview with RedTeamAuditCard for red_team_audit artifacts", () => {
      const html = ReactDOMServer.renderToString(
        React.createElement(ArtifactStage, {
          artifact: sampleAuditArtifact,
          onClose: () => {},
        }),
      );

      expect(html).toContain(
        "Production Financial Agent &amp; Automated Trading Pipeline",
      );
      expect(html).toContain("Adversarial Red-Team Auditor");
      expect(html).toContain("Immunity");
    });

    it("includes CSV export button in ArtifactStage for red_team_audit", () => {
      const html = ReactDOMServer.renderToString(
        React.createElement(ArtifactStage, {
          artifact: sampleAuditArtifact,
          onClose: () => {},
        }),
      );

      expect(html).toContain('title="Download CSV"');
      expect(html).toContain('aria-label="Download CSV"');
    });

    it("renders print dossier section for red_team_audit artifacts", () => {
      const html = ReactDOMServer.renderToString(
        React.createElement(ArtifactStage, {
          artifact: sampleAuditArtifact,
          onClose: () => {},
        }),
      );

      expect(html).toContain("Adversarial Attack Chains Scorecard");
      expect(html).toContain("Target:");
      expect(html).toContain(
        "Production Financial Agent &amp; Automated Trading Pipeline",
      );
      expect(html).toContain("chain-adv-01");
    });
  });

  describe("Spatial Intelligence Canvas Extraction & Edge Computation", () => {
    it("extracts spatial canvas node with red_team_audit artifactType, metrics, and tags", () => {
      const nodes = extractSpatialNodes(sampleMessages);
      expect(nodes).toHaveLength(1);

      const node = nodes[0];
      expect(node.artifactType).toBe("red_team_audit");
      expect(node.title).toBe(
        "Production Financial Agent & Automated Trading Pipeline",
      );
      expect(node.tags).toContain("RED_TEAM");
      expect(node.tags).toContain("SECURITY");
      expect(node.tags).toContain("VULNERABILITY");
      expect(node.metrics?.score).toBe(sampleAudit.summary.immunityScore);
      expect(node.metrics?.itemCount).toBe(sampleAudit.attackChains.length);
      expect(node.metrics?.status).toBe("audited");
    });

    it("computes deterministic topological edges between red_team_audit and related artifacts", () => {
      const mixedMessages: ChatMessage[] = [
        {
          id: "msg-1",
          role: "assistant",
          content: "Red Team Audit",
          timestamp: "2026-10-29T06:00:00.000Z",
          artifact: sampleAuditArtifact,
        },
        {
          id: "msg-2",
          role: "assistant",
          content: "TypeScript Implementation",
          timestamp: "2026-10-29T06:01:00.000Z",
          artifact: {
            type: "code",
            data: {
              filename: "sanitizer.ts",
              language: "typescript",
              code: "export function sanitize() { return true; }",
              explanation: "Output sanitization logic.",
            },
          },
        },
        {
          id: "msg-3",
          role: "assistant",
          content: "Regression Evaluator Suite",
          timestamp: "2026-10-29T06:02:00.000Z",
          artifact: {
            type: "eval_suite",
            data: {
              id: "eval-01",
              topic: "Regression Evaluator Suite",
              targetPipeline: "Trading Pipeline",
              baselineVersion: "v0.9.0",
              evaluatedVersion: "v1.0.0",
              executiveSummary: "Summary",
              generatedAt: "2026-10-29T06:00:00.000Z",
              scenarios: [],
              summary: {
                totalScenarios: 0,
                passedCount: 0,
                failedCount: 0,
                regressedCount: 0,
                averageLatencyMs: 0,
                criticalRisksIdentified: 0,
                overallPassRatePct: 100,
                healthGrade: "A+",
              },
            },
          },
        },
      ];

      const nodes = extractSpatialNodes(mixedMessages);
      const edges = computeSpatialEdges(nodes);

      expect(edges.length).toBeGreaterThanOrEqual(2);

      const redTeamEvalEdge = edges.find(
        (e) =>
          (e.sourceId === nodes[0].id && e.targetId === nodes[2].id) ||
          (e.sourceId === nodes[2].id && e.targetId === nodes[0].id),
      );
      expect(redTeamEvalEdge).toBeDefined();
      expect(redTeamEvalEdge?.relationType).toBe("validates");
      expect(redTeamEvalEdge?.label).toBe("Regression & Threat Audit");

      const redTeamCodeEdge = edges.find(
        (e) =>
          (e.sourceId === nodes[0].id && e.targetId === nodes[1].id) ||
          (e.sourceId === nodes[1].id && e.targetId === nodes[0].id),
      );
      expect(redTeamCodeEdge).toBeDefined();
      expect(redTeamCodeEdge?.relationType).toBe("debates");
      expect(redTeamCodeEdge?.label).toBe("Adversarial Penetration Probe");
    });
  });

  describe("Print Dossier & Session Export Formatters", () => {
    it("resolves print dossier metadata for red_team_audit", () => {
      const meta = getArtifactMetadata(sampleAuditArtifact);
      expect(meta.title).toBe(
        "Production Financial Agent & Automated Trading Pipeline",
      );
      expect(meta.modeName).toBe("Adversarial Red-Team Auditor");
    });

    it("formats markdown export for red_team_audit artifacts with breach status and guardrails", () => {
      const md = formatArtifactMarkdown(sampleAuditArtifact);
      expect(md).toContain("Dialectic Red-Team Security Audit");
      expect(md).toContain(
        "Production Financial Agent & Automated Trading Pipeline",
      );
      expect(md).toContain("Adversarial Attack Chains");
      expect(md).toContain("Recommended Remediation Guardrails");
      expect(md).toContain("Multi-Turn Roleplay Boundary Erosion");
    });

    it("verifies redTeamAuditToCsv outputs RFC 4180 format with proper headers", () => {
      const csv = redTeamAuditToCsv(sampleAudit);
      expect(csv).toContain(
        "Record Type,Chain ID,Vector Name,OWASP Category,Severity",
      );
      expect(csv).toContain("OVERVIEW");
      expect(csv).toContain("ATTACK_CHAIN");
      expect(csv).toContain("chain-adv-01");
    });

    it("verifies redTeamAuditToMarkdown outputs structured report", () => {
      const md = redTeamAuditToMarkdown(sampleAudit);
      expect(md).toContain("# 🛡️ Dialectic Red-Team Security Audit");
      expect(md).toContain("Immunity Score");
      expect(md).toContain("Recommended Guardrail");
    });
  });
});
