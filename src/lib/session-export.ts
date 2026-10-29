import type {
  Session,
  ChatMessage,
  GenerativeArtifact,
  SourceCitation,
  ResearchReport,
  GoalPlan,
  DecisionMatrix,
  ChartArtifact,
  CodeArtifact,
  DebateArtifact,
  PersonaCouncilArtifact,
  ResilienceSimulationArtifact,
  AudioBriefingArtifact,
  CompetitiveBattleCardArtifact,
  ParetoFrontierArtifact,
  RegressionEvalArtifact,
  RedTeamAuditArtifact,
  SemanticGuardrailArtifact,
  MultiModalInspectionArtifact,
  Attachment,
  StudioMode,
} from "./types";

/**
 * Sanitizes a title string into a safe, deterministic filename slug.
 */
export function sanitizeFileName(title: string): string {
  if (!title || typeof title !== "string") {
    return "untitled-session";
  }
  const sanitized = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized || "untitled-session";
}

/**
 * Triggers a browser file download for a given Blob and filename.
 * Safe to call in SSR or non-browser test environments without throwing.
 */
function downloadBlob(blob: Blob, filename: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Formats a byte size into a human-readable string.
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Formats a date string for display in Markdown headers.
 */
function formatDate(dateStr?: string): string {
  if (!dateStr) return new Date().toISOString();
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleString("en-US");
  } catch {
    return dateStr;
  }
}

/**
 * Formats artifact details into GitHub Flavored Markdown.
 */
export function formatArtifactMarkdown(artifact: GenerativeArtifact): string {
  let md = "";

  switch (artifact.type) {
    case "research": {
      const report: ResearchReport = artifact.data;
      md += `#### 📑 Research Report: ${report.title}\n\n`;
      if (report.executiveSummary) {
        md += `> ${report.executiveSummary.replace(/\n/g, "\n> ")}\n\n`;
      }
      if (report.keyFindings && report.keyFindings.length > 0) {
        md += `**Key Findings:**\n`;
        report.keyFindings.forEach((f) => {
          const conf = f.confidence ? ` *(Confidence: ${f.confidence})*` : "";
          md += `- **${f.point}**: ${f.description}${conf}\n`;
        });
        md += "\n";
      }
      if (report.sources && report.sources.length > 0) {
        md += `**Sources:**\n`;
        report.sources.forEach((s: SourceCitation, idx: number) => {
          const title = s.title || s.domain || s.url || `Source ${idx + 1}`;
          const urlPart = s.url ? `[${title}](${s.url})` : title;
          const domainPart =
            s.domain && s.domain !== title ? ` — *${s.domain}*` : "";
          md += `${idx + 1}. ${urlPart}${domainPart}\n`;
        });
        md += "\n";
      }
      if (
        report.contradictionsAndRisks &&
        report.contradictionsAndRisks.length > 0
      ) {
        md += `**Contradictions & Risks:**\n`;
        report.contradictionsAndRisks.forEach((risk) => {
          md += `- ${risk}\n`;
        });
        md += "\n";
      }
      if (report.recommendation) {
        md += `**Recommendation:**\n${report.recommendation}\n\n`;
      }
      break;
    }

    case "plan": {
      const plan: GoalPlan = artifact.data;
      md += `#### 🎯 Goal Plan: ${plan.goal}\n\n`;
      if (plan.timeframe) {
        md += `*Horizon:* ${plan.timeframe}\n\n`;
      }
      if (plan.overview) {
        md += `> ${plan.overview.replace(/\n/g, "\n> ")}\n\n`;
      }
      if (plan.phases && plan.phases.length > 0) {
        plan.phases.forEach((p) => {
          md += `##### Phase ${p.phaseNumber}: ${p.phaseName}\n`;
          if (p.summary) md += `*${p.summary}*\n\n`;
          if (p.tasks && p.tasks.length > 0) {
            p.tasks.forEach((t) => {
              const check = t.status === "completed" ? "[x]" : "[ ]";
              const output = t.actionableOutput
                ? ` *(Output: ${t.actionableOutput})*`
                : "";
              md += `- ${check} **${t.title}**: ${t.description}${output}\n`;
            });
            md += "\n";
          }
        });
      }
      if (plan.keySuccessMetrics && plan.keySuccessMetrics.length > 0) {
        md += `**Key Success Metrics:**\n`;
        plan.keySuccessMetrics.forEach((m) => {
          md += `- ${m}\n`;
        });
        md += "\n";
      }
      break;
    }

    case "matrix": {
      const matrix: DecisionMatrix = artifact.data;
      md += `#### ⚖️ Decision Matrix: ${matrix.topic}\n\n`;
      if (matrix.options && matrix.options.length > 0) {
        md += `| Option | Score / 10 | Pros | Cons |\n`;
        md += `| :--- | :---: | :--- | :--- |\n`;
        matrix.options.forEach((opt) => {
          const score =
            typeof opt.totalWeightedScore === "number"
              ? opt.totalWeightedScore.toFixed(1)
              : opt.totalWeightedScore;
          const pros = opt.pros?.join("; ") || "—";
          const cons = opt.cons?.join("; ") || "—";
          md += `| **${opt.name}** | ${score} | ${pros} | ${cons} |\n`;
        });
        md += "\n";
      }
      if (matrix.verdict) {
        md += `**Verdict:** ${matrix.verdict}\n\n`;
      }
      break;
    }

    case "chart": {
      const chart: ChartArtifact = artifact.data;
      md += `#### 📊 Chart: ${chart.title} (${chart.type})\n\n`;
      if (chart.insight) {
        md += `*Insight:* ${chart.insight}\n\n`;
      }
      if (chart.data && chart.data.length > 0) {
        const xKey = chart.xAxisKey || "Label";
        md += `| ${xKey} | Value |\n`;
        md += `| :--- | :---: |\n`;
        chart.data.forEach((d) => {
          md += `| ${d.label} | ${d.value} |\n`;
        });
        md += "\n";
      }
      if (chart.takeaways && chart.takeaways.length > 0) {
        md += `**Key Takeaways:**\n`;
        chart.takeaways.forEach((t) => {
          md += `- ${t}\n`;
        });
        md += "\n";
      }
      break;
    }

    case "code": {
      const code: CodeArtifact = artifact.data;
      const lang = code.language || "text";
      md += `#### 💻 Code Artifact: \`${code.filename || "snippet"}\`\n\n`;
      md += `\`\`\`${lang}\n${code.code}\n\`\`\`\n\n`;
      if (code.explanation) {
        md += `*Explanation:* ${code.explanation}\n\n`;
      }
      break;
    }

    case "debate": {
      const debate: DebateArtifact = artifact.data;
      md += `#### 🎙️ Multi-Agent Debate: ${debate.topic}\n\n`;
      if (debate.consensusSummary) {
        md += `> ${debate.consensusSummary.replace(/\n/g, "\n> ")}\n\n`;
      }
      if (debate.perspectives && debate.perspectives.length > 0) {
        debate.perspectives.forEach((p) => {
          md += `##### ${p.agentName} (${p.stance})\n`;
          if (p.arguments && p.arguments.length > 0) {
            md += `*Arguments:*\n`;
            p.arguments.forEach((arg) => {
              md += `- ${arg}\n`;
            });
          }
          if (p.caveats && p.caveats.length > 0) {
            md += `*Caveats:*\n`;
            p.caveats.forEach((c) => {
              md += `- ${c}\n`;
            });
          }
          md += "\n";
        });
      }
      if (debate.synthesisVerdict) {
        md += `**Synthesis Verdict:** ${debate.synthesisVerdict}\n\n`;
      }
      break;
    }

    case "council": {
      const council: PersonaCouncilArtifact = artifact.data;
      md += `#### 🏛️ Executive Council: ${council.topic}\n\n`;
      md += `**Verdict:** ${council.councilVerdict} (Alignment: ${council.alignmentIndex}%)\n\n`;
      if (council.verdictSummary) {
        md += `> ${council.verdictSummary.replace(/\n/g, "\n> ")}\n\n`;
      }
      if (council.strategicCompromise) {
        md += `**Strategic Compromise:** ${council.strategicCompromise}\n\n`;
      }
      break;
    }

    case "simulation": {
      const sim: ResilienceSimulationArtifact = artifact.data;
      md += `#### ⚡ Resilience Chaos Simulation: ${sim.title}\n\n`;
      md += `**Resilience Score:** ${sim.summary.resilienceScore}/100 (Peak P99: ${sim.summary.peakP99LatencyMs}ms)\n\n`;
      if (sim.summary.bottleneckDiagnosis) {
        md += `> ${sim.summary.bottleneckDiagnosis.replace(/\n/g, "\n> ")}\n\n`;
      }
      break;
    }

    case "audio_briefing": {
      const briefing: AudioBriefingArtifact = artifact.data;
      md += `#### 🎧 Audio Briefing: ${briefing.title}\n\n`;
      md += `*Total Duration:* ${Math.round(briefing.totalDurationMs / 1000)}s • *Word Count:* ${briefing.totalWordCount}\n\n`;
      if (briefing.chapters && briefing.chapters.length > 0) {
        briefing.chapters.forEach((ch) => {
          md += `##### Chapter ${ch.chapterIndex}: ${ch.title} (${ch.speaker})\n`;
          md += `${ch.text}\n\n`;
        });
      }
      break;
    }

    case "battlecard": {
      const card: CompetitiveBattleCardArtifact = artifact.data;
      md += `#### ⚔️ Competitive Moat Battle-Card: ${card.topic}\n\n`;
      md += `*Target Sector:* ${card.targetSector} • *Nova Moat Score:* ${card.novaMoatScore}/100\n\n`;
      if (card.strategicSummary) {
        md += `> ${card.strategicSummary.replace(/\n/g, "\n> ")}\n\n`;
      }
      if (card.keyWinThemes && card.keyWinThemes.length > 0) {
        md += `**Key Win Themes:**\n`;
        card.keyWinThemes.forEach((w) => {
          md += `- ${w}\n`;
        });
        md += "\n";
      }
      break;
    }

    case "pareto_frontier": {
      const pf: ParetoFrontierArtifact = artifact.data;
      md += `#### 📈 Cost-Latency Pareto Frontier: ${pf.topic}\n\n`;
      md += `*Workload Profile:* ${pf.workloadProfile} • *Frontier Optimal Models:* ${pf.frontierProviderIds.length} / ${pf.providers.length}\n\n`;
      if (pf.summary) {
        md += `> ${pf.summary.replace(/\n/g, "\n> ")}\n\n`;
      }
      if (pf.recommendations && pf.recommendations.length > 0) {
        md += `**Strategic Routing Recommendations:**\n`;
        pf.recommendations.forEach((r) => {
          md += `- **${r.title}** (Primary: \`${r.primaryProviderId}\`, Fallback: \`${r.fallbackProviderId}\`): ${r.rationale} *[Estimated savings: ${r.estimatedMonthlySavingsPct}%]*\n`;
        });
        md += "\n";
      }
      break;
    }

    case "eval_suite": {
      const es: RegressionEvalArtifact = artifact.data;
      md += `#### 🧪 Automated Regression Evaluation Suite: ${es.topic}\n\n`;
      md += `*Target Pipeline:* \`${es.targetPipeline}\` • *Health Grade:* **${es.summary.healthGrade}** (${es.summary.overallPassRatePct}% Pass Rate)\n\n`;
      if (es.executiveSummary) {
        md += `> ${es.executiveSummary.replace(/\n/g, "\n> ")}\n\n`;
      }
      if (es.scenarios && es.scenarios.length > 0) {
        md += `**Evaluation Scenarios (${es.summary.passedCount}/${es.summary.totalScenarios} Passed):**\n`;
        es.scenarios.forEach((s) => {
          const icon =
            s.status === "passed"
              ? "✅"
              : s.status === "regressed"
                ? "⚠️"
                : "❌";
          md += `- ${icon} **${s.title}** (\`${s.scenarioId}\`, ${s.category}): ${s.score}% *[${s.latencyMs}ms]*\n`;
        });
        md += "\n";
      }
      break;
    }

    case "red_team_audit": {
      const audit: RedTeamAuditArtifact = artifact.data;
      md += `#### 🛡️ Dialectic Red-Team Security Audit: ${audit.topic}\n\n`;
      md += `*Target System:* \`${audit.targetSystem}\` • *Defense Posture:* **${audit.summary.defensePosture}** (${audit.summary.immunityScore}% Immunity)\n\n`;
      if (audit.executiveSummary) {
        md += `> ${audit.executiveSummary.replace(/\n/g, "\n> ")}\n\n`;
      }
      if (audit.attackChains && audit.attackChains.length > 0) {
        md += `**Adversarial Attack Chains (${audit.summary.exploitedCount}/${audit.summary.totalAttackChains} Exploited):**\n`;
        audit.attackChains.forEach((c) => {
          const icon = c.status === "exploited" ? "🚨" : "🛡️";
          md += `- ${icon} **${c.vectorName}** (\`${c.chainId}\`, OWASP: ${c.owaspCategory}, Severity: ${c.severity}): ${c.turns.length} Turns - ${c.status === "exploited" ? "**BREACH DETECTED**" : "Neutralized"}\n`;
        });
        md += "\n";
      }
      const allGuardrails = audit.attackChains
        .map((c) => c.recommendedGuardrail)
        .filter(Boolean);
      if (allGuardrails.length > 0) {
        md += `**Recommended Remediation Guardrails:**\n`;
        allGuardrails.forEach((rec) => {
          md += `- 🔒 ${rec}\n`;
        });
        md += "\n";
      }
      break;
    }

    case "guardrail_policy": {
      const gp: SemanticGuardrailArtifact = artifact.data;
      md += `#### 🛡️ Semantic Guardrail Policy: ${gp.topic}\n\n`;
      md += `*Target Channel:* \`${gp.targetChannel}\` • *Policy Version:* \`${gp.policyVersion}\` • *Risk Grade:* **${gp.summary.riskGrade}** (${gp.summary.cleanTokensPct}% Clean Tokens)\n\n`;
      if (gp.executiveSummary) {
        md += `> ${gp.executiveSummary.replace(/\n/g, "\n> ")}\n\n`;
      }
      if (gp.appliedRules && gp.appliedRules.length > 0) {
        md += `**Enforced Guardrail Rules (${gp.appliedRules.length}):**\n`;
        gp.appliedRules.forEach((r) => {
          md += `- 🔒 **${r.name}** (\`${r.ruleId}\`, Action: ${r.action}): ${r.triggerCount} triggers\n`;
        });
        md += "\n";
      }
      if (gp.violations && gp.violations.length > 0) {
        md += `**Intercepted Violations (${gp.summary.totalViolations}):**\n`;
        gp.violations.forEach((v) => {
          const icon = v.severity === "critical" ? "🚨" : "⚠️";
          md += `- ${icon} **${v.description}** (\`${v.type}\`, [${v.offsetStart}-${v.offsetEnd}]): substituted with \`${v.redactedReplacement}\`\n`;
        });
        md += "\n";
      }
      break;
    }

    case "multimodal_inspection": {
      const mi: MultiModalInspectionArtifact = artifact.data;
      md += `#### 👁️ Multimodal Vision Inspection: ${mi.topic}\n\n`;
      md += `*Visual Grounding Index:* **${mi.summary.visualGroundingIndex}%** • *Frames:* ${mi.summary.totalFrames} • *Regions:* ${mi.summary.totalRegions} • *Avg Conf:* ${mi.summary.averageConfidencePct}%\n\n`;
      if (mi.executiveSummary) {
        md += `> ${mi.executiveSummary.replace(/\n/g, "\n> ")}\n\n`;
      }
      if (mi.frames && mi.frames.length > 0) {
        md += `**Inspected Frames (${mi.frames.length}):**\n`;
        mi.frames.forEach((f, idx) => {
          md += `- 🖼️ **Frame ${idx + 1}** (${f.width}x${f.height}, ${f.regions.length} regions): ${f.label}\n`;
          if (f.citations && f.citations.length > 0) {
            f.citations.forEach((c) => {
              md += `  - 📌 *"${c.claim}"* (Box: \`${c.boxId}\`, Source: ${c.verifiableSource})\n`;
            });
          }
        });
        md += "\n";
      }
      break;
    }
  }

  return md;
}

/**
 * Converts a session into clean GitHub Flavored Markdown.
 * Includes header metadata, user queries with attachments, and assistant responses
 * with key findings, sources list with URLs and titles, and generated artifact details.
 */
export function exportSessionAsMarkdown(session: Session): string {
  const title = session.title || "Untitled Session";
  const dateStr = formatDate(session.updatedAt || session.createdAt);
  const mode = session.mode || "research";

  let md = `# ${title}\n\n`;
  md += `*Exported from Nova on ${dateStr}*\n\n`;
  md += `**Mode:** \`${mode}\`\n\n`;
  md += `---\n\n`;

  if (!session.messages || session.messages.length === 0) {
    md += `*No messages in this session.*\n`;
    return md;
  }

  session.messages.forEach((msg: ChatMessage) => {
    const speaker =
      msg.role === "assistant"
        ? "🤖 Nova"
        : msg.role === "user"
          ? "👤 User"
          : "⚙️ System";
    const ts = msg.timestamp ? ` (${msg.timestamp})` : "";
    md += `### ${speaker}${ts}\n\n`;

    if (msg.content) {
      md += `${msg.content}\n\n`;
    }

    // User message attachments
    if (msg.attachments && msg.attachments.length > 0) {
      md += `**Attachments:**\n`;
      msg.attachments.forEach((att: Attachment) => {
        const sizeStr = formatFileSize(att.size);
        md += `- \`${att.name}\` (${sizeStr}, \`${att.type || "unknown"}\`)\n`;
      });
      md += "\n";
    }

    // Generated Artifact details (key findings, sources, diagrams, code, etc.)
    if (msg.artifact) {
      md += formatArtifactMarkdown(msg.artifact);
    }

    md += `---\n\n`;
  });

  return md;
}

/**
 * Creates a JSON blob of the session and triggers a browser file download
 * named `${sanitizeFileName(session.title)}.nova.json`.
 */
export function exportSessionAsJson(session: Session): void {
  const jsonStr = JSON.stringify(session, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const filename = `${sanitizeFileName(session.title)}.nova.json`;
  downloadBlob(blob, filename);
}

/**
 * Creates a JSON blob containing `{ version: 1, exportedAt: string, sessions: Session[] }`
 * and triggers a download named `nova-sessions-backup-${date}.json`.
 */
export function exportAllSessionsAsJson(sessions: Session[]): void {
  const dateStr = new Date().toISOString().split("T")[0];
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    sessions,
  };
  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const filename = `nova-sessions-backup-${dateStr}.json`;
  downloadBlob(blob, filename);
}

/**
 * Triggers browser download of `${sanitizeFileName(session.title)}.md`.
 */
export function downloadSessionMarkdown(session: Session): void {
  const md = exportSessionAsMarkdown(session);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const filename = `${sanitizeFileName(session.title)}.md`;
  downloadBlob(blob, filename);
}

/**
 * Uses `navigator.clipboard.writeText` to copy the generated Markdown.
 */
export async function copySessionMarkdownToClipboard(
  session: Session,
): Promise<boolean> {
  const md = exportSessionAsMarkdown(session);
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(md);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates imported JSON structure (checks array of sessions, requires id, title, messages).
 * Accepts valid single session or multi-session backups.
 * Rejects corrupt, missing, or malicious payloads.
 */
export function validateSessionBackup(
  data: unknown,
): { valid: true; sessions: Session[] } | { valid: false; error: string } {
  if (data === null || typeof data !== "object") {
    return {
      valid: false,
      error: "Invalid backup format: root must be a JSON object or array",
    };
  }

  // Prevent prototype pollution or malicious payloads
  const forbiddenKeys = ["__proto__", "constructor", "prototype"];
  const checkForbiddenKeys = (obj: object): boolean => {
    for (const key of forbiddenKeys) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        return false;
      }
    }
    return true;
  };

  if (!checkForbiddenKeys(data)) {
    return {
      valid: false,
      error:
        "Security validation failed: Backup contains forbidden prototype keys",
    };
  }

  let candidates: unknown[];
  if (Array.isArray(data)) {
    candidates = data;
  } else {
    const record = data as Record<string, unknown>;
    if ("sessions" in record) {
      if (!Array.isArray(record.sessions)) {
        return {
          valid: false,
          error: "Backup 'sessions' property must be an array",
        };
      }
      candidates = record.sessions;
    } else if ("id" in record && "title" in record && "messages" in record) {
      // Single session backup format
      candidates = [record];
    } else {
      return {
        valid: false,
        error:
          "Backup structure unrecognized: expected a session object, array of sessions, or { sessions: [...] }",
      };
    }
  }

  if (candidates.length === 0) {
    return { valid: false, error: "Backup contains no sessions to restore" };
  }

  const validModes: StudioMode[] = [
    "research",
    "planner",
    "canvas",
    "coder",
    "matrix",
    "debate",
    "intelligence",
    "mcp",
  ];

  const validatedSessions: Session[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    if (
      candidate === null ||
      typeof candidate !== "object" ||
      Array.isArray(candidate)
    ) {
      return {
        valid: false,
        error: `Session at index ${i} is not a valid object`,
      };
    }

    if (!checkForbiddenKeys(candidate)) {
      return {
        valid: false,
        error: `Security validation failed: Session at index ${i} contains illegal keys`,
      };
    }

    const sessObj = candidate as Record<string, unknown>;

    if (typeof sessObj.id !== "string" || !sessObj.id.trim()) {
      return {
        valid: false,
        error: `Session at index ${i} is missing a valid 'id'`,
      };
    }

    if (typeof sessObj.title !== "string") {
      return {
        valid: false,
        error: `Session "${sessObj.id}" is missing a valid 'title'`,
      };
    }

    if (!Array.isArray(sessObj.messages)) {
      return {
        valid: false,
        error: `Session "${sessObj.id}" has invalid or missing 'messages' array`,
      };
    }

    // Validate each message
    const messages: ChatMessage[] = [];
    for (let m = 0; m < sessObj.messages.length; m++) {
      const msgCandidate = sessObj.messages[m];
      if (
        msgCandidate === null ||
        typeof msgCandidate !== "object" ||
        Array.isArray(msgCandidate)
      ) {
        return {
          valid: false,
          error: `Message ${m} in session "${sessObj.title}" is not an object`,
        };
      }

      if (!checkForbiddenKeys(msgCandidate)) {
        return {
          valid: false,
          error: `Security validation failed: Message ${m} contains illegal keys`,
        };
      }

      const msgObj = msgCandidate as Record<string, unknown>;

      if (typeof msgObj.id !== "string" || !msgObj.id.trim()) {
        return {
          valid: false,
          error: `Message ${m} in session "${sessObj.title}" is missing 'id'`,
        };
      }

      if (
        typeof msgObj.role !== "string" ||
        !["user", "assistant", "system"].includes(msgObj.role)
      ) {
        return {
          valid: false,
          error: `Message ${m} in session "${sessObj.title}" has invalid role "${String(msgObj.role)}"`,
        };
      }

      if (typeof msgObj.content !== "string") {
        return {
          valid: false,
          error: `Message ${m} in session "${sessObj.title}" is missing valid string 'content'`,
        };
      }

      messages.push({
        id: msgObj.id.trim(),
        role: msgObj.role as "user" | "assistant" | "system",
        content: msgObj.content,
        timestamp:
          typeof msgObj.timestamp === "string"
            ? msgObj.timestamp
            : new Date().toISOString(),
        mode:
          typeof msgObj.mode === "string" &&
          validModes.includes(msgObj.mode as StudioMode)
            ? (msgObj.mode as StudioMode)
            : undefined,
        thoughts: Array.isArray(msgObj.thoughts)
          ? (msgObj.thoughts as ChatMessage["thoughts"])
          : undefined,
        artifact:
          msgObj.artifact && typeof msgObj.artifact === "object"
            ? (msgObj.artifact as GenerativeArtifact)
            : undefined,
        telemetry:
          msgObj.telemetry && typeof msgObj.telemetry === "object"
            ? (msgObj.telemetry as ChatMessage["telemetry"])
            : undefined,
        attachments: Array.isArray(msgObj.attachments)
          ? (msgObj.attachments as Attachment[])
          : undefined,
      });
    }

    const mode: StudioMode =
      typeof sessObj.mode === "string" &&
      validModes.includes(sessObj.mode as StudioMode)
        ? (sessObj.mode as StudioMode)
        : "research";

    const createdAt =
      typeof sessObj.createdAt === "string"
        ? sessObj.createdAt
        : new Date().toISOString();
    const updatedAt =
      typeof sessObj.updatedAt === "string" ? sessObj.updatedAt : createdAt;

    validatedSessions.push({
      id: sessObj.id.trim(),
      title: sessObj.title.trim() || "Untitled Session",
      mode,
      createdAt,
      updatedAt,
      messages,
    });
  }

  return { valid: true, sessions: validatedSessions };
}
