import { describe, it, expect } from "bun:test";
import React from "react";
import ReactDOMServer from "react-dom/server";
import fs from "fs";
import path from "path";
import { GuardrailPolicyCard } from "@/components/GenerativeCards/GuardrailPolicyCard";
import { synthesizeGuardrailPolicy } from "@/lib/security/semantic-guardrails";

describe("GuardrailPolicyCard Generative UI Component", () => {
  const sampleArtifact = synthesizeGuardrailPolicy(
    "Enterprise Financial Agent Egress Safety Gateway",
  );

  it("renders topic title, target channel badge, and risk grade badge", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(GuardrailPolicyCard, { artifact: sampleArtifact }),
    );

    expect(html).toContain("Enterprise Financial Agent Egress Safety Gateway");
    expect(html).toContain("Guardrail Policy");
    expect(html).toContain("v2.4.0-strict");
    expect(html).toContain("Clean Tokens");
  });

  it("renders metric scorecard counters for clean tokens, violations, and redacted tokens", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(GuardrailPolicyCard, { artifact: sampleArtifact }),
    );

    expect(html).toContain(`${sampleArtifact.summary.cleanTokensPct}%`);
    expect(html).toContain(String(sampleArtifact.summary.totalViolations));
    expect(html).toContain(String(sampleArtifact.summary.redactedCount));
    expect(html).toContain(String(sampleArtifact.summary.blockedCount));
  });

  it("renders sanitized preview stream content and redaction markers", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(GuardrailPolicyCard, { artifact: sampleArtifact }),
    );

    expect(html).toContain("[REDACTED_API_KEY]");
    expect(html).toContain("[REDACTED_EMAIL]");
    expect(html).toContain("Sanitized Output Stream");
  });

  it("renders action buttons for Markdown report copy and CSV export", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(GuardrailPolicyCard, { artifact: sampleArtifact }),
    );

    expect(html).toContain('title="Copy Markdown Report"');
    expect(html).toContain('title="Download RFC 4180 CSV"');
  });

  it("strictly enforces ZERO pseudo-randomness in GuardrailPolicyCard source", () => {
    const filePath = path.join(
      process.cwd(),
      "src/components/GenerativeCards/GuardrailPolicyCard.tsx",
    );
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).not.toContain("Math.random");
  });
});
