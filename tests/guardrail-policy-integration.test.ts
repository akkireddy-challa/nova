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
  synthesizeGuardrailPolicy,
  guardrailsPolicyToCsv,
  guardrailsPolicyToMarkdown,
} from "@/lib/security/semantic-guardrails";
import { synthesizeRedTeamAudit } from "@/lib/security/red-team-auditor";
import type { ChatMessage, GenerativeArtifact } from "@/lib/types";

describe("Semantic Guardrail Policy Fullstack Integration", () => {
  const samplePolicy = synthesizeGuardrailPolicy(
    "Enterprise AI Egress DLP & Canary Guardrail Policy",
  );

  const samplePolicyArtifact: GenerativeArtifact = {
    type: "guardrail_policy",
    data: samplePolicy,
  };

  const sampleMessages: ChatMessage[] = [
    {
      id: "msg-gp-1",
      role: "assistant",
      content:
        "Here is the enforced semantic guardrail policy configuration and redaction audit.",
      timestamp: "2026-10-29T06:00:00.000Z",
      artifact: samplePolicyArtifact,
    },
  ];

  describe("ArtifactStage.tsx Guardrail Policy Rendering & CSV Export", () => {
    it("imports GuardrailPolicyCard and guardrailsPolicyToCsv in ArtifactStage", () => {
      const filePath = path.join(
        process.cwd(),
        "src/components/ArtifactStage.tsx",
      );
      const source = fs.readFileSync(filePath, "utf-8");
      expect(source).toContain("GuardrailPolicyCard");
      expect(source).toContain("guardrailsPolicyToCsv");
    });

    it("renders ArtifactStage preview with GuardrailPolicyCard for guardrail_policy artifacts", () => {
      const html = ReactDOMServer.renderToString(
        React.createElement(ArtifactStage, {
          artifact: samplePolicyArtifact,
          onClose: () => {},
        }),
      );

      expect(html).toContain(
        "Enterprise AI Egress DLP &amp; Canary Guardrail Policy",
      );
      expect(html).toContain("Semantic Guardrail Policy");
      expect(html).toContain("Clean Tokens");
    });

    it("includes CSV export button in ArtifactStage for guardrail_policy", () => {
      const html = ReactDOMServer.renderToString(
        React.createElement(ArtifactStage, {
          artifact: samplePolicyArtifact,
          onClose: () => {},
        }),
      );

      expect(html).toContain('title="Download CSV"');
      expect(html).toContain('aria-label="Download CSV"');
    });

    it("renders print dossier section for guardrail_policy artifacts", () => {
      const html = ReactDOMServer.renderToString(
        React.createElement(ArtifactStage, {
          artifact: samplePolicyArtifact,
          onClose: () => {},
        }),
      );

      expect(html).toContain("Enforced Guardrail Policy Rules");
      expect(html).toContain("Sanitized Payload Preview");
      expect(html).toContain("Channel:");
      expect(html).toContain("rule-sec-01");
    });
  });

  describe("Spatial Intelligence Canvas Extraction & Edge Computation", () => {
    it("extracts spatial canvas node with guardrail_policy artifactType, metrics, and tags", () => {
      const nodes = extractSpatialNodes(sampleMessages);
      expect(nodes).toHaveLength(1);

      const node = nodes[0];
      expect(node.artifactType).toBe("guardrail_policy");
      expect(node.title).toBe(
        "Enterprise AI Egress DLP & Canary Guardrail Policy",
      );
      expect(node.tags).toContain("GUARDRAIL");
      expect(node.tags).toContain("POLICY");
      expect(node.tags).toContain("SANITIZER");
      expect(node.tags).toContain("SECURITY");
      expect(node.metrics?.score).toBe(samplePolicy.summary.cleanTokensPct);
      expect(node.metrics?.itemCount).toBe(samplePolicy.violations.length);
      expect(node.metrics?.status).toBe("enforced");
    });

    it("computes deterministic topological edges between guardrail_policy and red_team_audit", () => {
      const sampleAudit = synthesizeRedTeamAudit("Egress Threat Penetration");
      const mixedMessages: ChatMessage[] = [
        {
          id: "msg-1",
          role: "assistant",
          content: "Guardrail Policy",
          timestamp: "2026-10-29T06:00:00.000Z",
          artifact: samplePolicyArtifact,
        },
        {
          id: "msg-2",
          role: "assistant",
          content: "Red Team Audit",
          timestamp: "2026-10-29T06:01:00.000Z",
          artifact: {
            type: "red_team_audit",
            data: sampleAudit,
          },
        },
      ];

      const nodes = extractSpatialNodes(mixedMessages);
      const edges = computeSpatialEdges(nodes);

      expect(edges.length).toBeGreaterThanOrEqual(1);

      const guardrailRedTeamEdge = edges.find(
        (e) =>
          (e.sourceId === nodes[0].id && e.targetId === nodes[1].id) ||
          (e.sourceId === nodes[1].id && e.targetId === nodes[0].id),
      );
      expect(guardrailRedTeamEdge).toBeDefined();
      expect(guardrailRedTeamEdge?.relationType).toBe("validates");
      expect(guardrailRedTeamEdge?.label).toBe("Threat Remediation Hardening");
    });
  });

  describe("Print Dossier & Session Export Formatters", () => {
    it("resolves print dossier metadata for guardrail_policy", () => {
      const meta = getArtifactMetadata(samplePolicyArtifact);
      expect(meta.title).toBe(
        "Enterprise AI Egress DLP & Canary Guardrail Policy",
      );
      expect(meta.modeName).toBe("Semantic Guardrail Policy");
    });

    it("formats markdown export for guardrail_policy artifacts with rules and violations", () => {
      const md = formatArtifactMarkdown(samplePolicyArtifact);
      expect(md).toContain("Semantic Guardrail Policy");
      expect(md).toContain(
        "Enterprise AI Egress DLP & Canary Guardrail Policy",
      );
      expect(md).toContain("Enforced Guardrail Rules");
      expect(md).toContain("Intercepted Violations");
      expect(md).toContain("API Keys & Bearer Tokens Redaction");
    });

    it("verifies guardrailsPolicyToCsv outputs RFC 4180 format with proper headers", () => {
      const csv = guardrailsPolicyToCsv(samplePolicy);
      expect(csv).toContain(
        "Record Type,Item ID,Name or Type,Severity or Action,Status",
      );
      expect(csv).toContain("OVERVIEW");
      expect(csv).toContain("GUARDRAIL_RULE");
      expect(csv).toContain("POLICY_VIOLATION");
    });

    it("verifies guardrailsPolicyToMarkdown outputs structured report", () => {
      const md = guardrailsPolicyToMarkdown(samplePolicy);
      expect(md).toContain("# 🛡️ Semantic Guardrail Policy Enforcement");
      expect(md).toContain("Clean Tokens");
      expect(md).toContain("Sanitization Diff Preview");
    });
  });
});
