import { describe, it, expect } from "bun:test";
import React from "react";
import ReactDOMServer from "react-dom/server";
import fs from "fs";
import path from "path";
import { RedTeamAuditCard } from "@/components/GenerativeCards/RedTeamAuditCard";
import { synthesizeRedTeamAudit } from "@/lib/security/red-team-auditor";

describe("RedTeamAuditCard Generative UI Component", () => {
  const sampleArtifact = synthesizeRedTeamAudit(
    "Automated Dialectic Red-Team Security Audit",
  );

  it("renders topic title, target system badge, and defense posture", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(RedTeamAuditCard, { artifact: sampleArtifact }),
    );

    expect(html).toContain("Automated Dialectic Red-Team Security Audit");
    expect(html).toContain("Dialectic Red-Team Auditor");
    expect(html).toContain(
      "Nova Autonomous Multi-Agent Reasoning Architecture v1.4",
    );
    expect(html).toContain("hardened");
  });

  it("renders metric scorecard counters for immunity score, breaches, and critical vulns", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(RedTeamAuditCard, { artifact: sampleArtifact }),
    );

    expect(html).toContain("Immunity Score");
    expect(html).toMatch(/100.*%/);
    expect(html).toContain("Breaches");
    expect(html).toContain("Critical Vulns");
    expect(html).toContain("High Vulns");
  });

  it("renders attack chains list with vector names, OWASP tags, and neutralized status", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(RedTeamAuditCard, { artifact: sampleArtifact }),
    );

    expect(html).toContain("Multi-Turn Attack Vectors Tested");
    expect(html).toContain("Multi-Turn Roleplay Boundary Erosion");
    expect(html).toContain("LLM01 Prompt Injection");
    expect(html).toContain("neutralized");
  });

  it("renders action buttons for Markdown report copy and CSV export", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(RedTeamAuditCard, { artifact: sampleArtifact }),
    );

    expect(html).toContain('aria-label="Copy Markdown Report"');
    expect(html).toContain('aria-label="Download RFC 4180 CSV"');
  });

  it("strictly enforces ZERO pseudo-randomness in RedTeamAuditCard source", () => {
    const filePath = path.join(
      process.cwd(),
      "src/components/GenerativeCards/RedTeamAuditCard.tsx",
    );
    const source = fs.readFileSync(filePath, "utf-8");
    expect(source).not.toContain("Math.random");
  });
});
