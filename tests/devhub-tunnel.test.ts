import { describe, it, expect } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  generateTunnelCommand,
  isValidPort,
  parsePort,
  TUNNEL_CONFIGS,
  formatCurlCommand,
  validateJsonPayload,
  API_SANDBOX_ENDPOINTS,
  calculateVerificationAudit,
  formatAuditBadgeText,
  getAuditStatusVariant,
  type TunnelTool,
} from "@/lib/devhub";
import {
  EvidenceAuditBadge,
  ResearchReportCard,
} from "@/components/GenerativeCards/ResearchReportCard";
import { ResearchReport, VerificationAudit } from "@/lib/types";

describe("Developer Hub - Tunnel Launcher & Port Validation", () => {
  it("generates exact default tunnel commands for port 3000", () => {
    expect(generateTunnelCommand("cloudflared", 3000)).toBe(
      "cloudflared tunnel --url http://localhost:3000",
    );
    expect(generateTunnelCommand("localtunnel", 3000)).toBe(
      "npx localtunnel --port 3000",
    );
    expect(generateTunnelCommand("ngrok", 3000)).toBe("ngrok http 3000");
  });

  it("dynamically formats tunnel commands for custom ports", () => {
    expect(generateTunnelCommand("cloudflared", 8080)).toBe(
      "cloudflared tunnel --url http://localhost:8080",
    );
    expect(generateTunnelCommand("localtunnel", 5000)).toBe(
      "npx localtunnel --port 5000",
    );
    expect(generateTunnelCommand("ngrok", 3001)).toBe("ngrok http 3001");
  });

  it("validates TCP port numbers correctly", () => {
    // Valid ports
    expect(isValidPort(80)).toBe(true);
    expect(isValidPort(443)).toBe(true);
    expect(isValidPort(3000)).toBe(true);
    expect(isValidPort(8080)).toBe(true);
    expect(isValidPort(65535)).toBe(true);
    expect(isValidPort("3000")).toBe(true);
    expect(isValidPort(" 8080 ")).toBe(true);

    // Invalid ports
    expect(isValidPort(0)).toBe(false);
    expect(isValidPort(-1)).toBe(false);
    expect(isValidPort(65536)).toBe(false);
    expect(isValidPort(3000.5)).toBe(false);
    expect(isValidPort("abc")).toBe(false);
    expect(isValidPort("3000port")).toBe(false);
    expect(isValidPort(null)).toBe(false);
    expect(isValidPort(undefined)).toBe(false);
    expect(isValidPort({})).toBe(false);
  });

  it("safely falls back to 3000 on invalid or malformed ports", () => {
    expect(parsePort("invalid", 3000)).toBe(3000);
    expect(parsePort(-5, 3000)).toBe(3000);
    expect(parsePort(999999, 3000)).toBe(3000);
    expect(parsePort(null, 3000)).toBe(3000);
    expect(parsePort(4000, 3000)).toBe(4000);
    expect(parsePort("5050", 3000)).toBe(5050);

    // When passing invalid port to generateTunnelCommand, it should fallback safely to 3000
    expect(generateTunnelCommand("cloudflared", "invalid_port")).toBe(
      "cloudflared tunnel --url http://localhost:3000",
    );
  });

  it("throws for unsupported tunnel tool identifier", () => {
    expect(() =>
      generateTunnelCommand("unknown-tool" as unknown as TunnelTool, 3000),
    ).toThrow();
  });

  it("maintains verified tunnel configurations metadata", () => {
    expect(TUNNEL_CONFIGS.cloudflared.installHint).toContain("cloudflared");
    expect(TUNNEL_CONFIGS.localtunnel.installHint).toContain("npx");
    expect(TUNNEL_CONFIGS.ngrok.installHint).toContain("ngrok");
  });
});

describe("Developer Hub - API Gateway Sandbox Payload Formatting", () => {
  it("formats standard cURL GET commands cleanly", () => {
    const curl = formatCurlCommand({
      method: "GET",
      path: "/api/v1/models",
      baseUrl: "http://localhost:3000",
    });
    expect(curl).toBe('curl -X GET "http://localhost:3000/api/v1/models"');
  });

  it("formats cURL commands with custom domain or tunnel URL", () => {
    const curl = formatCurlCommand({
      method: "GET",
      path: "/api/v1/providers/status",
      baseUrl: "https://nova-demo.trycloudflare.com/",
    });
    expect(curl).toBe(
      'curl -X GET "https://nova-demo.trycloudflare.com/api/v1/providers/status"',
    );
  });

  it("formats POST requests with auto Content-Type header and JSON payload", () => {
    const payload = JSON.stringify({
      messages: [{ role: "user", content: "Hello Nova" }],
      stream: false,
    });

    const curl = formatCurlCommand({
      method: "POST",
      path: "/api/v1/chat/completions",
      baseUrl: "http://localhost:3000",
      body: payload,
    });

    expect(curl).toContain(
      'curl -X POST "http://localhost:3000/api/v1/chat/completions"',
    );
    expect(curl).toContain('-H "Content-Type: application/json"');
    expect(curl).toContain("-d '");
    expect(curl).toContain('"content":"Hello Nova"');
  });

  it("escapes single quotes in JSON payloads properly for bash execution", () => {
    const payload = JSON.stringify({
      messages: [{ role: "user", content: "What's the difference?" }],
    });

    const curl = formatCurlCommand({
      method: "POST",
      path: "/api/v1/chat/completions",
      body: payload,
    });

    // In bash, single quotes are escaped as '\''
    expect(curl).toContain("What'\\''s the difference?");
  });

  it("validates JSON request bodies accurately", () => {
    expect(validateJsonPayload("").valid).toBe(true);
    expect(validateJsonPayload("   ").valid).toBe(true);
    expect(validateJsonPayload('{"model":"gemini"}').valid).toBe(true);
    expect(validateJsonPayload('{"array":[1,2,3]}').valid).toBe(true);

    const invalid = validateJsonPayload("{ unquoted: true }");
    expect(invalid.valid).toBe(false);
    expect(invalid.error).toBeDefined();
  });

  it("registers all required sandbox endpoints", () => {
    const paths = API_SANDBOX_ENDPOINTS.map((e) => e.path);
    expect(paths).toContain("/api/v1/chat/completions");
    expect(paths).toContain("/api/v1/models");
    expect(paths).toContain("/api/v1/providers/status");
    expect(paths).toContain("/api/v1/tools");
  });
});

describe("Evidence Verification Audit - Calculations & Metrics", () => {
  it("calculates 100% alignment when all claims have verified citations", () => {
    const claims = [
      { text: "Claim A", hasCitation: true },
      { text: "Claim B", hasCitation: true },
      { text: "Claim C", hasCitation: true },
    ];
    const audit = calculateVerificationAudit(claims);

    expect(audit.totalClaims).toBe(3);
    expect(audit.verifiedClaims).toBe(3);
    expect(audit.sourceAlignment).toBe(100);
    expect(audit.status).toBe("verified");
    expect(audit.contradictions).toBeUndefined();
    expect(audit.uncitedClaims).toBeUndefined();
  });

  it("detects uncited claims and flags alignment percentage accordingly", () => {
    const claims = [
      { text: "Verified fact", hasCitation: true },
      { text: "Uncited assumption", hasCitation: false },
    ];
    const audit = calculateVerificationAudit(claims);

    expect(audit.totalClaims).toBe(2);
    expect(audit.verifiedClaims).toBe(1);
    expect(audit.sourceAlignment).toBe(50);
    expect(audit.status).toBe("flagged");
    expect(audit.uncitedClaims).toEqual(["Uncited assumption"]);
  });

  it("flags warning status when contradictions are detected regardless of citation", () => {
    const claims = [
      { text: "Point A", hasCitation: true, contradiction: false },
      { text: "Conflicting Point B", hasCitation: true, contradiction: true },
    ];
    const audit = calculateVerificationAudit(claims);

    expect(audit.totalClaims).toBe(2);
    expect(audit.verifiedClaims).toBe(1);
    expect(audit.status).toBe("warning");
    expect(audit.contradictions).toEqual(["Conflicting Point B"]);
  });

  it("handles empty claims array safely", () => {
    const audit = calculateVerificationAudit([]);
    expect(audit.totalClaims).toBe(0);
    expect(audit.verifiedClaims).toBe(0);
    expect(audit.sourceAlignment).toBe(100);
    expect(audit.status).toBe("verified");
  });

  it("formats audit badge text accurately", () => {
    const audit: VerificationAudit = {
      verifiedClaims: 8,
      totalClaims: 10,
      sourceAlignment: 80,
    };
    expect(formatAuditBadgeText(audit)).toBe(
      "8 verified claims (80% alignment)",
    );
  });

  it("determines correct status variant colors and icons", () => {
    const verifiedVariant = getAuditStatusVariant({
      verifiedClaims: 5,
      totalClaims: 5,
      sourceAlignment: 100,
      status: "verified",
    });
    expect(verifiedVariant.color).toBe("emerald");
    expect(verifiedVariant.icon).toBe("check");

    const flaggedVariant = getAuditStatusVariant({
      verifiedClaims: 3,
      totalClaims: 5,
      sourceAlignment: 60,
      uncitedClaims: ["Claim X"],
      status: "flagged",
    });
    expect(flaggedVariant.color).toBe("amber");
    expect(flaggedVariant.icon).toBe("alert");

    const warningVariant = getAuditStatusVariant({
      verifiedClaims: 4,
      totalClaims: 5,
      sourceAlignment: 80,
      contradictions: ["Conflict Y"],
      status: "warning",
    });
    expect(warningVariant.color).toBe("rose");
    expect(warningVariant.icon).toBe("warning");
  });
});

describe("Evidence Verification Audit - Component Rendering", () => {
  const sampleAudit: VerificationAudit = {
    verifiedClaims: 14,
    totalClaims: 15,
    sourceAlignment: 93,
    uncitedClaims: ["Minor speculative takeaway"],
    status: "flagged",
  };

  const sampleReport: ResearchReport = {
    title: "Quantum Key Distribution Benchmark",
    executiveSummary:
      "QKD benchmarks demonstrate verified 100 km optical fiber quantum transport.",
    keyFindings: [
      {
        point: "BB84 protocol maintains security threshold",
        description: "Under fiber loss constraints, BB84 maintains integrity.",
        confidence: "high",
        citationIds: ["src-1"],
      },
    ],
    sources: [
      {
        id: "src-1",
        title: "Experimental Quantum Key Distribution",
        url: "https://example.com/qkd",
        domain: "example.com",
        snippet: "Verified 100km QKD transport over optical fiber.",
      },
    ],
    recommendation: "Deploy satellite QKD nodes.",
    metrics: {
      sourcesCrawled: 12,
      depthLevel: 2,
      synthesisTimeMs: 1450,
      verificationAudit: sampleAudit,
    },
  };

  it("renders EvidenceAuditBadge with verified claims count and alignment percentage", () => {
    const html = renderToStaticMarkup(
      React.createElement(EvidenceAuditBadge, { audit: sampleAudit }),
    );

    expect(html).toContain("14 verified claims (93% alignment)");
    expect(html).toContain("Evidence Verification Audit status");
  });

  it("renders Evidence Verification Audit badge inside ResearchReportCard header", () => {
    const html = renderToStaticMarkup(
      React.createElement(ResearchReportCard, { report: sampleReport }),
    );

    expect(html).toContain("Quantum Key Distribution Benchmark");
    expect(html).toContain("14 verified claims (93% alignment)");
  });

  it("omits Evidence Verification Audit badge when metrics.verificationAudit is undefined", () => {
    const reportWithoutAudit: ResearchReport = {
      ...sampleReport,
      metrics: {
        sourcesCrawled: 5,
        depthLevel: 1,
        synthesisTimeMs: 800,
      },
    };

    const html = renderToStaticMarkup(
      React.createElement(ResearchReportCard, { report: reportWithoutAudit }),
    );

    expect(html).toContain("Quantum Key Distribution Benchmark");
    expect(html).not.toContain("verified claims");
  });
});
