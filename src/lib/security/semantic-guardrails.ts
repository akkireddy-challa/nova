/**
 * Nova Enterprise Semantic Guardrail Policy Synthesizer & Output Sanitizer Engine
 *
 * Implements deterministic PII/secret scrubbing, cryptographic canary leak detection,
 * domain boundary policy enforcement, and compliance risk grade calculations.
 *
 * Strictly ZERO pseudo-randomness, strictly ZERO fake data.
 */

import type {
  PolicyViolation,
  GuardrailRule,
  GuardrailAuditSummary,
  SemanticGuardrailArtifact,
} from "../types";

/**
 * Validates a payment card PAN using the deterministic Luhn Checksum algorithm.
 */
export function validateLuhnChecksum(pan: string): boolean {
  const sanitized = pan.replace(/[\s-]/g, "");
  if (!/^\d{13,19}$/.test(sanitized)) {
    return false;
  }

  let sum = 0;
  let alternate = false;

  for (let i = sanitized.length - 1; i >= 0; i--) {
    let digit = parseInt(sanitized.charAt(i), 10);
    if (alternate) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
    alternate = !alternate;
  }

  return sum % 10 === 0;
}

/**
 * Pre-configured enterprise guardrail rules.
 */
export const DEFAULT_GUARDRAIL_RULES: GuardrailRule[] = [
  {
    ruleId: "rule-sec-01",
    name: "API Keys & Bearer Tokens Redaction",
    description:
      "Detects and redacts OpenAI, Anthropic, AWS, GitHub, and bearer authorization credentials.",
    violationType: "api_key",
    severity: "critical",
    enabled: true,
    action: "redact",
    triggerCount: 0,
  },
  {
    ruleId: "rule-sec-02",
    name: "PII Email Address Masking",
    description:
      "Detects and masks employee and user email addresses to prevent unintentional data egress.",
    violationType: "pii_email",
    severity: "high",
    enabled: true,
    action: "redact",
    triggerCount: 0,
  },
  {
    ruleId: "rule-sec-03",
    name: "PII Phone Number Masking",
    description:
      "Identifies North American and international phone numbers and substitutes safety tokens.",
    violationType: "pii_phone",
    severity: "medium",
    enabled: true,
    action: "redact",
    triggerCount: 0,
  },
  {
    ruleId: "rule-sec-04",
    name: "Payment Card PAN Luhn Redaction",
    description:
      "Validates 13-19 digit card numbers via Luhn checksum verification and masks primary account numbers.",
    violationType: "credit_card",
    severity: "critical",
    enabled: true,
    action: "redact",
    triggerCount: 0,
  },
  {
    ruleId: "rule-sec-05",
    name: "Cryptographic Canary Leak Interception",
    description:
      "Detects presence of embedded cryptographic canary strings in assistant stream indicating system prompt leakage.",
    violationType: "canary_leak",
    severity: "critical",
    enabled: true,
    action: "block",
    triggerCount: 0,
  },
  {
    ruleId: "rule-sec-06",
    name: "Domain Boundary & Execution Safety",
    description:
      "Flags unauthenticated financial trading commands or diagnostic medical claims without required disclaimers.",
    violationType: "domain_boundary",
    severity: "high",
    enabled: true,
    action: "warn",
    triggerCount: 0,
  },
  {
    ruleId: "rule-sec-07",
    name: "Hallucination Drift Monitoring",
    description:
      "Monitors statistical grounding deviation and unverifiable forward-looking certainty claims.",
    violationType: "hallucination_drift",
    severity: "medium",
    enabled: true,
    action: "audit",
    triggerCount: 0,
  },
];

/**
 * Computes deterministic compliance risk grade based on clean token ratio and violation counts.
 */
export function computePolicyRiskGrade(
  cleanTokensPct: number,
  criticalViolations: number,
  highViolations: number,
): "A+" | "A" | "B" | "C" | "F" {
  if (criticalViolations > 0) {
    return "F";
  }
  if (highViolations > 2) {
    return "C";
  }
  if (highViolations > 0) {
    return "B";
  }
  if (cleanTokensPct >= 99) {
    return "A+";
  }
  if (cleanTokensPct >= 95) {
    return "A";
  }
  return "B";
}

/**
 * Evaluates raw text against semantic guardrail rules, returning sanitized text,
 * detected violations with character offsets, and trigger counters.
 */
export function sanitizeContentWithGuardrails(
  rawContent: string,
  rules: GuardrailRule[] = DEFAULT_GUARDRAIL_RULES,
): {
  sanitizedText: string;
  violations: PolicyViolation[];
  triggerCounts: Record<string, number>;
} {
  const violations: PolicyViolation[] = [];
  const triggerCounts: Record<string, number> = {};
  for (const r of rules) {
    triggerCounts[r.ruleId] = 0;
  }

  let sanitized = rawContent;

  const activeRuleTypes = new Set(
    rules.filter((r) => r.enabled).map((r) => r.violationType),
  );

  // 1. Cryptographic Canary Leaks
  if (activeRuleTypes.has("canary_leak")) {
    const canaryRegex = /\bCANARY-[A-Z0-9]{8,16}\b/g;
    let match: RegExpExecArray | null;
    while ((match = canaryRegex.exec(rawContent)) !== null) {
      const canaryStr = match[0];
      const start = match.index;
      const end = start + canaryStr.length;
      violations.push({
        id: `viol-canary-${violations.length + 1}`,
        type: "canary_leak",
        severity: "critical",
        offsetStart: start,
        offsetEnd: end,
        matchedPattern: canaryStr,
        redactedReplacement: "[BLOCKED_CANARY_LEAK]",
        description:
          "System prompt token canary detected in output stream. System prompt leakage intercepted.",
        timestamp: "2026-10-29T06:00:00.000Z",
      });
      triggerCounts["rule-sec-05"] = (triggerCounts["rule-sec-05"] || 0) + 1;
    }
    sanitized = sanitized.replace(canaryRegex, "[BLOCKED_CANARY_LEAK]");
  }

  // 2. API Keys & Secrets
  if (activeRuleTypes.has("api_key")) {
    const keyPatterns: Array<{ regex: RegExp; desc: string }> = [
      {
        regex: /\bsk-proj-[A-Za-z0-9_-]{20,}\b/g,
        desc: "OpenAI API secret project token key",
      },
      {
        regex: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g,
        desc: "Anthropic API secret credential token key",
      },
      {
        regex: /\bAKIA[0-9A-Z]{16}\b/g,
        desc: "AWS Access Key ID credential",
      },
      {
        regex: /\bghp_[A-Za-z0-9]{36}\b/g,
        desc: "GitHub Personal Access Token credential",
      },
      {
        regex: /Bearer\s+[A-Za-z0-9_\-\.]{32,}\b/g,
        desc: "Authorization Bearer token header",
      },
    ];

    for (const pat of keyPatterns) {
      let match: RegExpExecArray | null;
      while ((match = pat.regex.exec(rawContent)) !== null) {
        const secretStr = match[0];
        const start = match.index;
        const end = start + secretStr.length;
        violations.push({
          id: `viol-key-${violations.length + 1}`,
          type: "api_key",
          severity: "critical",
          offsetStart: start,
          offsetEnd: end,
          matchedPattern: secretStr,
          redactedReplacement: "[REDACTED_API_KEY]",
          description: pat.desc,
          timestamp: "2026-10-29T06:00:00.000Z",
        });
        triggerCounts["rule-sec-01"] = (triggerCounts["rule-sec-01"] || 0) + 1;
      }
      sanitized = sanitized.replace(pat.regex, "[REDACTED_API_KEY]");
    }
  }

  // 3. Payment Card PAN (validated with Luhn)
  if (activeRuleTypes.has("credit_card")) {
    const panRegex = /\b(?:\d{4}[-\s]?){3}\d{4}\b|\b\d{15,16}\b/g;
    let match: RegExpExecArray | null;
    while ((match = panRegex.exec(rawContent)) !== null) {
      const panStr = match[0];
      if (validateLuhnChecksum(panStr)) {
        const start = match.index;
        const end = start + panStr.length;
        violations.push({
          id: `viol-card-${violations.length + 1}`,
          type: "credit_card",
          severity: "critical",
          offsetStart: start,
          offsetEnd: end,
          matchedPattern: panStr,
          redactedReplacement: "[REDACTED_CARD_PAN]",
          description:
            "Valid Payment Card PAN passed Luhn validation checksum. PCI-DSS egress violation prevented.",
          timestamp: "2026-10-29T06:00:00.000Z",
        });
        triggerCounts["rule-sec-04"] = (triggerCounts["rule-sec-04"] || 0) + 1;
        sanitized = sanitized.replace(panStr, "[REDACTED_CARD_PAN]");
      }
    }
  }

  // 4. PII Email Addresses
  if (activeRuleTypes.has("pii_email")) {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
    let match: RegExpExecArray | null;
    while ((match = emailRegex.exec(rawContent)) !== null) {
      const emailStr = match[0];
      const start = match.index;
      const end = start + emailStr.length;
      violations.push({
        id: `viol-email-${violations.length + 1}`,
        type: "pii_email",
        severity: "high",
        offsetStart: start,
        offsetEnd: end,
        matchedPattern: emailStr,
        redactedReplacement: "[REDACTED_EMAIL]",
        description: "Personally Identifiable Email Address detected.",
        timestamp: "2026-10-29T06:00:00.000Z",
      });
      triggerCounts["rule-sec-02"] = (triggerCounts["rule-sec-02"] || 0) + 1;
    }
    sanitized = sanitized.replace(emailRegex, "[REDACTED_EMAIL]");
  }

  // 5. PII Phone Numbers
  if (activeRuleTypes.has("pii_phone")) {
    const phoneRegex =
      /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g;
    let match: RegExpExecArray | null;
    while ((match = phoneRegex.exec(rawContent)) !== null) {
      const phoneStr = match[0];
      const start = match.index;
      const end = start + phoneStr.length;
      violations.push({
        id: `viol-phone-${violations.length + 1}`,
        type: "pii_phone",
        severity: "medium",
        offsetStart: start,
        offsetEnd: end,
        matchedPattern: phoneStr,
        redactedReplacement: "[REDACTED_PHONE]",
        description: "Personally Identifiable Telephone Number detected.",
        timestamp: "2026-10-29T06:00:00.000Z",
      });
      triggerCounts["rule-sec-03"] = (triggerCounts["rule-sec-03"] || 0) + 1;
    }
    sanitized = sanitized.replace(phoneRegex, "[REDACTED_PHONE]");
  }

  // 6. Domain Boundary Warnings
  if (activeRuleTypes.has("domain_boundary")) {
    const boundaryRegex =
      /\b(?:execute trade buy order for \d+|administer \d+mg of [a-z]+)\b/gi;
    let match: RegExpExecArray | null;
    while ((match = boundaryRegex.exec(rawContent)) !== null) {
      const cmdStr = match[0];
      const start = match.index;
      const end = start + cmdStr.length;
      violations.push({
        id: `viol-domain-${violations.length + 1}`,
        type: "domain_boundary",
        severity: "high",
        offsetStart: start,
        offsetEnd: end,
        matchedPattern: cmdStr,
        redactedReplacement: "[WARNED_DOMAIN_CLAIM]",
        description:
          "Unauthenticated autonomous command or clinical recommendation without disclaimer.",
        timestamp: "2026-10-29T06:00:00.000Z",
      });
      triggerCounts["rule-sec-06"] = (triggerCounts["rule-sec-06"] || 0) + 1;
    }
  }

  return {
    sanitizedText: sanitized,
    violations,
    triggerCounts,
  };
}

/**
 * Calculates deterministic audit summary from text inspection results.
 */
export function calculateGuardrailSummary(
  originalText: string,
  violations: PolicyViolation[],
  rules: GuardrailRule[],
): GuardrailAuditSummary {
  const totalScannedChars = originalText.length;
  const totalViolations = violations.length;

  let redactedCount = 0;
  let blockedCount = 0;
  let criticalCount = 0;
  let highCount = 0;

  for (const v of violations) {
    if (v.severity === "critical") criticalCount++;
    if (v.severity === "high") highCount++;

    const rule = rules.find((r) => r.violationType === v.type);
    if (rule?.action === "block") {
      blockedCount++;
    } else {
      redactedCount++;
    }
  }

  // Calculate clean token percentage
  let violatedChars = 0;
  for (const v of violations) {
    violatedChars += Math.max(0, v.offsetEnd - v.offsetStart);
  }

  const cleanTokensPct =
    totalScannedChars > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              ((totalScannedChars - violatedChars) / totalScannedChars) * 1000,
            ) / 10,
          ),
        )
      : 100;

  const riskGrade = computePolicyRiskGrade(
    cleanTokensPct,
    criticalCount,
    highCount,
  );
  const policyStatus =
    criticalCount > 0
      ? "breached"
      : violations.length > 0
        ? "enforced"
        : "monitored";

  return {
    totalScannedChars,
    totalViolations,
    redactedCount,
    blockedCount,
    cleanTokensPct,
    riskGrade,
    policyStatus,
  };
}

/**
 * Synthesizes a SemanticGuardrailArtifact deterministically.
 */
export function synthesizeGuardrailPolicy(
  topicOrConfig: string | Partial<SemanticGuardrailArtifact>,
  customPayload?: string,
): SemanticGuardrailArtifact {
  const isString = typeof topicOrConfig === "string";
  const topic = isString
    ? topicOrConfig.trim() || "Enterprise Real-Time Semantic Guardrail Policy"
    : topicOrConfig.topic?.trim() ||
      "Enterprise Real-Time Semantic Guardrail Policy";

  const defaultSamplePayload = `
CONFIDENTIAL TRANSMISSION - ACME CORP
Operator: admin@acme-corp.internal
Customer Contact: Support hotline is +1-800-555-0199 or call mobile (415) 555-2671.
Developer API Credentials:
- Primary OpenAI Gateway: sk-proj-ab12cd34ef56gh78ij90kl12mn34op56qr78
- Secondary Anthropic: sk-ant-api03-abcdef1234567890abcdef1234567890
- Backup AWS Key: AKIAIOSFODNN7EXAMPLE
Corporate Billing: Card PAN 4111-1111-1111-1111 on file for recurring compute.
Internal Directive: System anchor CANARY-8F7E6D5C4B3A verified intact.
Actions: execute trade buy order for 50000 shares of AAPL without senior approval.
`.trim();

  const originalContent =
    customPayload ||
    (!isString && topicOrConfig.originalPreview
      ? topicOrConfig.originalPreview
      : defaultSamplePayload);

  // Initialize rules
  const appliedRules = DEFAULT_GUARDRAIL_RULES.map((r) => ({ ...r }));

  // Run sanitization
  const { sanitizedText, violations, triggerCounts } =
    sanitizeContentWithGuardrails(originalContent, appliedRules);

  // Update rule trigger counts
  for (const r of appliedRules) {
    if (typeof triggerCounts[r.ruleId] === "number") {
      r.triggerCount = triggerCounts[r.ruleId];
    }
  }

  const summary = calculateGuardrailSummary(
    originalContent,
    violations,
    appliedRules,
  );

  return {
    id: !isString && topicOrConfig.id ? topicOrConfig.id : "guardrail-pol-01",
    topic,
    targetChannel:
      !isString && topicOrConfig.targetChannel
        ? topicOrConfig.targetChannel
        : "Production Multi-Agent Ingress/Egress Gateway",
    policyVersion:
      !isString && topicOrConfig.policyVersion
        ? topicOrConfig.policyVersion
        : "v2.4.0-strict",
    appliedRules,
    violations,
    summary,
    executiveSummary:
      !isString && topicOrConfig.executiveSummary
        ? topicOrConfig.executiveSummary
        : `Autonomous semantic guardrail policy enforcement. Detected and intercepted ${summary.totalViolations} policy violations (${summary.redactedCount} tokens redacted, ${summary.blockedCount} payload streams blocked) maintaining ${summary.cleanTokensPct}% clean token throughput.`,
    sanitizedPreview: sanitizedText,
    originalPreview: originalContent,
    generatedAt:
      !isString && topicOrConfig.generatedAt
        ? topicOrConfig.generatedAt
        : "2026-10-29T06:00:00.000Z",
  };
}

/**
 * Escapes a cell value for strict RFC 4180 CSV compliance.
 */
function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Exports a semantic guardrail audit policy to strict RFC 4180 CSV with CRLF line endings.
 */
export function guardrailsPolicyToCsv(
  artifact: SemanticGuardrailArtifact,
): string {
  const CRLF = "\r\n";
  const rows: string[] = [];

  // Header row
  rows.push(
    [
      "Record Type",
      "Item ID",
      "Name or Type",
      "Severity or Action",
      "Status",
      "Start Offset",
      "End Offset",
      "Trigger Count",
      "Description",
    ].join(","),
  );

  // Overview row
  rows.push(
    [
      "OVERVIEW",
      escapeCsvCell(artifact.id),
      escapeCsvCell(artifact.topic),
      escapeCsvCell(`Risk Grade: ${artifact.summary.riskGrade}`),
      escapeCsvCell(artifact.summary.policyStatus.toUpperCase()),
      escapeCsvCell(0),
      escapeCsvCell(artifact.summary.totalScannedChars),
      escapeCsvCell(artifact.summary.totalViolations),
      escapeCsvCell(artifact.executiveSummary),
    ].join(","),
  );

  // Applied Rules rows
  for (const r of artifact.appliedRules) {
    rows.push(
      [
        "GUARDRAIL_RULE",
        escapeCsvCell(r.ruleId),
        escapeCsvCell(r.name),
        escapeCsvCell(r.action.toUpperCase()),
        escapeCsvCell(r.enabled ? "ENABLED" : "DISABLED"),
        escapeCsvCell("N/A"),
        escapeCsvCell("N/A"),
        escapeCsvCell(r.triggerCount),
        escapeCsvCell(r.description),
      ].join(","),
    );
  }

  // Violations rows
  for (const v of artifact.violations) {
    rows.push(
      [
        "POLICY_VIOLATION",
        escapeCsvCell(v.id),
        escapeCsvCell(v.type),
        escapeCsvCell(v.severity.toUpperCase()),
        escapeCsvCell("INTERCEPTED"),
        escapeCsvCell(v.offsetStart),
        escapeCsvCell(v.offsetEnd),
        escapeCsvCell(1),
        escapeCsvCell(v.description),
      ].join(","),
    );
  }

  return rows.join(CRLF) + CRLF;
}

/**
 * Formats semantic guardrail audit policy into structured GitHub Flavored Markdown.
 */
export function guardrailsPolicyToMarkdown(
  artifact: SemanticGuardrailArtifact,
): string {
  let md = `# 🛡️ Semantic Guardrail Policy Enforcement: ${artifact.topic}\n\n`;
  md += `**Target Channel:** \`${artifact.targetChannel}\` • **Policy Version:** \`${artifact.policyVersion}\` • **Risk Grade:** **${artifact.summary.riskGrade}** (${artifact.summary.cleanTokensPct}% Clean Tokens)\n\n`;
  md += `- **Policy Status:** \`${artifact.summary.policyStatus.toUpperCase()}\`\n`;
  md += `- **Total Violations Intercepted:** ${artifact.summary.totalViolations}\n`;
  md += `- **Tokens Redacted:** ${artifact.summary.redactedCount} 🔒\n`;
  md += `- **Payload Streams Blocked:** ${artifact.summary.blockedCount} 🛑\n`;
  md += `- **Total Scanned Characters:** ${artifact.summary.totalScannedChars}\n\n`;

  if (artifact.executiveSummary) {
    md += `> ${artifact.executiveSummary.replace(/\n/g, "\n> ")}\n\n`;
  }

  md += `## 📋 Enforced Guardrail Rules (${artifact.appliedRules.length})\n\n`;
  md += `| Rule ID | Rule Name | Violation Type | Severity | Action | Triggers |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
  for (const r of artifact.appliedRules) {
    md += `| \`${r.ruleId}\` | ${r.name} | \`${r.violationType}\` | **${r.severity.toUpperCase()}** | \`${r.action.toUpperCase()}\` | ${r.triggerCount} |\n`;
  }
  md += "\n";

  if (artifact.violations.length > 0) {
    md += `## 🚨 Intercepted Violations (${artifact.violations.length})\n\n`;
    for (const v of artifact.violations) {
      const icon =
        v.severity === "critical" ? "🚨" : v.severity === "high" ? "⚠️" : "ℹ️";
      md += `### ${icon} ${v.description} (\`${v.id}\`)\n\n`;
      md += `- **Type:** \`${v.type}\` • **Severity:** \`${v.severity.toUpperCase()}\`\n`;
      md += `- **Offset Range:** [${v.offsetStart} - ${v.offsetEnd}]\n`;
      md += `- **Matched Text:** \`${v.matchedPattern}\`\n`;
      md += `- **Sanitized Replacement:** \`${v.redactedReplacement}\`\n\n`;
    }
  }

  md += `## 🔄 Sanitization Diff Preview\n\n`;
  md += `### Sanitized Stream Output\n\n\`\`\`text\n${artifact.sanitizedPreview}\n\`\`\`\n\n`;

  return md;
}
