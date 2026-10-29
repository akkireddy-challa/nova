import type {
  GenerativeArtifact,
  Session,
  SourceCitation,
  ResearchReport,
  GoalPlan,
  DecisionMatrix,
  ChartArtifact,
  CodeArtifact,
  DebateArtifact,
  PromptOptimizationArtifact,
  VectorSpaceArtifact,
  CausalDagArtifact,
  BayesianOptArtifact,
  WorkflowOrchestratorArtifact,
  FormalProverArtifact,
  EpistemicConsensusArtifact,
} from "./types";
import { sanitizeFileName } from "./session-export";
import { formatDossierDate } from "./print-dossier";

export type Artifact = GenerativeArtifact;
export { sanitizeFileName };

/**
 * Escapes characters for safe inclusion in HTML text and attributes.
 * Prevents Cross-Site Scripting (XSS) from untrusted data.
 */
export function escapeHtml(str: unknown): string {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Sanitizes URLs to permit only safe HTTP(S), mailto, or anchor references.
 * Neutralizes javascript:, data:, or malformed protocols into "#".
 */
export function sanitizeUrl(url: unknown): string {
  if (!url || typeof url !== "string") return "#";
  const trimmed = url.trim();
  if (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("mailto:")
  ) {
    return escapeHtml(trimmed);
  }
  return "#";
}

/**
 * Safely serializes data to JSON for embedding inside a <script> tag.
 * Replaces '<' with unicode escape '\u003c' to prevent script tag breakout.
 */
export function safeJsonForScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/**
 * Resolves the primary title for the dossier from artifact or session data.
 */
export function resolveDossierTitle(
  artifact?: Artifact | null,
  session?: Session | null,
): string {
  if (artifact) {
    switch (artifact.type) {
      case "research":
        if (artifact.data.title?.trim()) return artifact.data.title.trim();
        break;
      case "plan":
        if (artifact.data.goal?.trim()) return artifact.data.goal.trim();
        break;
      case "matrix":
        if (artifact.data.topic?.trim()) return artifact.data.topic.trim();
        break;
      case "chart":
        if (artifact.data.title?.trim()) return artifact.data.title.trim();
        break;
      case "code":
        if (artifact.data.filename?.trim())
          return artifact.data.filename.trim();
        break;
      case "debate":
        if (artifact.data.topic?.trim()) return artifact.data.topic.trim();
        break;
      case "council":
        if (artifact.data.topic?.trim()) return artifact.data.topic.trim();
        break;
      case "simulation":
        if (artifact.data.title?.trim()) return artifact.data.title.trim();
        break;
      case "audio_briefing":
        if (artifact.data.title?.trim()) return artifact.data.title.trim();
        break;
      case "battlecard":
        if (artifact.data.topic?.trim()) return artifact.data.topic.trim();
        break;
      case "pareto_frontier":
        if (artifact.data.topic?.trim()) return artifact.data.topic.trim();
        break;
      case "eval_suite":
        if (artifact.data.topic?.trim()) return artifact.data.topic.trim();
        break;
      case "red_team_audit":
        if (artifact.data.topic?.trim()) return artifact.data.topic.trim();
        break;
      case "guardrail_policy":
        if (artifact.data.topic?.trim()) return artifact.data.topic.trim();
        break;
      case "multimodal_inspection":
        if (artifact.data.topic?.trim()) return artifact.data.topic.trim();
        break;
      case "memory_graph":
        if (artifact.data.topic?.trim()) return artifact.data.topic.trim();
        break;
      case "audio_spectrogram":
        if (artifact.data.topic?.trim()) return artifact.data.topic.trim();
        break;
      case "prompt_optimizer":
        if (artifact.data.targetTask?.trim())
          return artifact.data.targetTask.trim();
        break;
      case "vector_space":
        if (artifact.data.datasetTitle?.trim())
          return artifact.data.datasetTitle.trim();
        break;
      case "causal_dag":
        if (artifact.data.hypothesis?.trim())
          return artifact.data.hypothesis.trim();
        break;
      case "bayesian_opt":
        if (artifact.data.title?.trim()) return artifact.data.title.trim();
        break;
      case "workflow_orchestrator":
        if (artifact.data.title?.trim()) return artifact.data.title.trim();
        break;
      case "formal_prover":
        if (artifact.data.title?.trim()) return artifact.data.title.trim();
        break;
      case "epistemic_consensus":
        if (artifact.data.title?.trim()) return artifact.data.title.trim();
        break;
    }
  }
  if (session?.title?.trim()) {
    return session.title.trim();
  }
  return "Nova Research Intelligence Dossier";
}

/**
 * Resolves the model string from session messages or defaults.
 */
export function resolveDossierModel(
  artifact?: Artifact | null,
  session?: Session | null,
): string {
  if (session?.messages) {
    for (let i = session.messages.length - 1; i >= 0; i--) {
      const msg = session.messages[i];
      if (msg.telemetry?.model?.trim()) {
        return msg.telemetry.model.trim();
      }
    }
  }
  return "nova-autonomous-v1";
}

/**
 * Extracts and deduplicates sources from artifact or session messages.
 */
export function extractDossierSources(
  artifact?: Artifact | null,
  session?: Session | null,
): SourceCitation[] {
  const sourcesMap = new Map<string, SourceCitation>();

  if (artifact?.type === "research" && Array.isArray(artifact.data.sources)) {
    for (const src of artifact.data.sources) {
      if (!src) continue;
      const key = (src.url || src.id || src.title || "").trim().toLowerCase();
      if (key && !sourcesMap.has(key)) {
        sourcesMap.set(key, src);
      }
    }
  }

  if (session?.messages) {
    for (const msg of session.messages) {
      if (
        msg.artifact?.type === "research" &&
        Array.isArray(msg.artifact.data.sources)
      ) {
        for (const src of msg.artifact.data.sources) {
          if (!src) continue;
          const key = (src.url || src.id || src.title || "")
            .trim()
            .toLowerCase();
          if (key && !sourcesMap.has(key)) {
            sourcesMap.set(key, src);
          }
        }
      }
    }
  }

  return Array.from(sourcesMap.values());
}

/**
 * Maps finding text and citation references to clickable HTML links.
 */
function renderInlineCitations(text: string): string {
  const escaped = escapeHtml(text);
  // Match citation patterns like [1], [2], [1, 2]
  return escaped.replace(/\[(\d+(?:\s*,\s*\d+)*)\]/g, (match, nums) => {
    const parts = nums.split(",").map((s: string) => s.trim());
    return parts
      .map((numStr: string) => {
        const idx = parseInt(numStr, 10);
        if (Number.isNaN(idx) || idx <= 0) return `[${escapeHtml(numStr)}]`;
        return `<a href="#source-${idx}" class="citation-tag" data-citation-idx="${idx}" title="Jump to source [${idx}]" aria-label="Citation ${idx}">[${idx}]</a>`;
      })
      .join(" ");
  });
}

/**
 * Computes an overall confidence assessment label for the dossier.
 */
function resolveOverallConfidence(artifact?: Artifact | null): {
  label: string;
  level: "high" | "medium" | "low" | "verified";
} {
  if (artifact?.type === "research" && artifact.data.keyFindings?.length) {
    const findings = artifact.data.keyFindings;
    const highCount = findings.filter((f) => f.confidence === "high").length;
    const lowCount = findings.filter((f) => f.confidence === "low").length;
    if (highCount >= findings.length / 2 && lowCount === 0) {
      return {
        label: "HIGH CONFIDENCE (EMPIRICALLY VERIFIED)",
        level: "verified",
      };
    }
    if (lowCount > findings.length / 2) {
      return { label: "CAUTION (LOW EVIDENCE / CONTRADICTIONS)", level: "low" };
    }
    return {
      label: "MODERATE CONFIDENCE (PEER-CORROBORATED)",
      level: "medium",
    };
  }
  return { label: "HIGH CONFIDENCE (VERIFIED SPECIFICATION)", level: "high" };
}

/**
 * Renders the Research Report section HTML.
 */
function renderResearchSection(
  report: ResearchReport,
  sources: SourceCitation[],
): string {
  let html = `<section class="dossier-section" id="executive-summary">
    <div class="section-badge">SYNTHESIS &amp; FINDINGS</div>
    <h2 class="section-heading">Executive Summary</h2>
    <div class="summary-card">
      <p class="summary-text">${renderInlineCitations(report.executiveSummary || "")}</p>
    </div>
  </section>`;

  if (report.keyFindings && report.keyFindings.length > 0) {
    html += `<section class="dossier-section" id="key-findings">
      <h2 class="section-heading">Key Findings &amp; Corroborated Evidence</h2>
      <div class="findings-grid">`;

    report.keyFindings.forEach((finding, idx) => {
      const confLevel = finding.confidence || "medium";
      const confClass = `conf-${confLevel}`;
      const confText = `${confLevel.toUpperCase()} CONFIDENCE`;

      // Resolve citation pills for this finding
      const citationTags = (finding.citationIds || [])
        .map((cId) => {
          const sourceIndex = sources.findIndex((s) => s.id === cId);
          const num =
            sourceIndex >= 0
              ? sourceIndex + 1
              : parseInt(cId.replace(/\D/g, ""), 10);
          if (!Number.isNaN(num) && num > 0) {
            return `<a href="#source-${num}" class="citation-pill" data-citation-idx="${num}">Source [${num}]</a>`;
          }
          return "";
        })
        .filter(Boolean)
        .join(" ");

      html += `
        <article class="finding-card">
          <div class="finding-header">
            <span class="finding-index">Finding ${idx + 1}</span>
            <span class="badge ${confClass}">${confText}</span>
          </div>
          <h3 class="finding-title">${escapeHtml(finding.point)}</h3>
          <p class="finding-description">${renderInlineCitations(finding.description)}</p>
          ${citationTags ? `<div class="finding-citations"><span class="citation-label">Evidence:</span> ${citationTags}</div>` : ""}
        </article>
      `;
    });

    html += `</div></section>`;
  }

  if (
    report.contradictionsAndRisks &&
    report.contradictionsAndRisks.length > 0
  ) {
    html += `<section class="dossier-section" id="risks-contradictions">
      <div class="alert-box alert-amber">
        <div class="alert-icon">⚠️</div>
        <div class="alert-body">
          <h3 class="alert-title">Identified Contradictions &amp; Strategic Risks</h3>
          <ul class="alert-list">
            ${report.contradictionsAndRisks.map((risk) => `<li>${escapeHtml(risk)}</li>`).join("")}
          </ul>
        </div>
      </div>
    </section>`;
  }

  if (report.recommendation?.trim()) {
    html += `<section class="dossier-section" id="recommendation">
      <div class="recommendation-card">
        <div class="rec-tag">STRATEGIC RECOMMENDATION</div>
        <p class="rec-text">${renderInlineCitations(report.recommendation)}</p>
      </div>
    </section>`;
  }

  return html;
}

/**
 * Renders the Decision Matrix section HTML with interactive sliders and vanilla JS hooks.
 */
function renderDecisionMatrixSection(matrix: DecisionMatrix): string {
  const totalWeight = matrix.criteria.reduce(
    (sum, c) => sum + (c.weight || 0),
    0,
  );

  let html = `<section class="dossier-section" id="decision-matrix">
    <div class="section-badge">INTERACTIVE DECISION ENGINE</div>
    <h2 class="section-heading">${escapeHtml(matrix.topic || "Decision Matrix & Evaluation")}</h2>
    ${
      matrix.verdict
        ? `<div class="verdict-banner"><span class="verdict-tag">CONSENSUS VERDICT</span><p class="verdict-text">${escapeHtml(matrix.verdict)}</p></div>`
        : ""
    }

    <!-- Sensitivity Controls -->
    <div class="matrix-controls-card">
      <div class="controls-header">
        <div>
          <h3 class="controls-title">Criteria Weight Adjustments</h3>
          <p class="controls-subtitle">Adjust sliders to perform real-time sensitivity analysis and observe dynamic rank shifts.</p>
        </div>
        <button type="button" id="reset-matrix-weights" class="btn-reset" title="Reset all criteria weights to original baseline">
          Reset to Baseline
        </button>
      </div>
      <div class="sliders-grid">`;

  matrix.criteria.forEach((criterion) => {
    const rawWeight =
      typeof criterion.weight === "number" ? criterion.weight : 5;
    const pct =
      totalWeight > 0 ? ((rawWeight / totalWeight) * 100).toFixed(1) : "0.0";

    html += `
      <div class="slider-control" data-criterion-id="${escapeHtml(criterion.id)}">
        <div class="slider-meta">
          <label for="slider-${escapeHtml(criterion.id)}" class="criterion-name">${escapeHtml(criterion.name)}</label>
          <div class="weight-tags">
            <span class="weight-number" id="weight-val-${escapeHtml(criterion.id)}">${rawWeight}</span>
            <span class="weight-pct" id="weight-pct-${escapeHtml(criterion.id)}">${pct}%</span>
          </div>
        </div>
        <input
          type="range"
          min="0"
          max="10"
          step="1"
          value="${rawWeight}"
          id="slider-${escapeHtml(criterion.id)}"
          data-crit-id="${escapeHtml(criterion.id)}"
          class="weight-slider"
          aria-label="Weight for ${escapeHtml(criterion.name)}"
        />
      </div>
    `;
  });

  html += `</div></div>`;

  // Options Cards Container
  html += `
    <div class="options-header">
      <h3 class="section-subheading">Ranked Options &amp; Evaluation</h3>
      <span class="options-hint">Dynamic real-time scoring (1224 competition rank)</span>
    </div>
    <div id="matrix-options-container" class="options-grid">`;

  // Pre-calculate initial scores for SSR and non-JS fallback
  const scoredOptions = matrix.options.map((opt) => {
    let scoreSum = 0;
    matrix.criteria.forEach((c) => {
      scoreSum += (opt.scores?.[c.id] || 0) * (c.weight || 0);
    });
    const totalScore =
      totalWeight > 0 ? Number((scoreSum / totalWeight).toFixed(1)) : 0;
    return { ...opt, totalScore };
  });

  scoredOptions.sort(
    (a, b) => b.totalScore - a.totalScore || a.name.localeCompare(b.name),
  );

  scoredOptions.forEach((option, idx) => {
    const rank = idx + 1;
    const isTop = rank === 1;
    const scorePct = Math.min(
      100,
      Math.max(0, (option.totalScore / 10) * 100),
    ).toFixed(1);

    html += `
      <div
        id="option-card-${escapeHtml(option.id)}"
        class="option-card ${isTop ? "top-ranked-card" : ""}"
        data-option-id="${escapeHtml(option.id)}"
      >
        <div class="option-header">
          <div class="option-title-wrap">
            <span class="rank-badge" id="rank-badge-${escapeHtml(option.id)}">#${rank}</span>
            <h4 class="option-name">${escapeHtml(option.name)}</h4>
          </div>
          <span
            class="top-badge"
            id="top-badge-${escapeHtml(option.id)}"
            style="${isTop ? "display: inline-flex;" : "display: none;"}"
          >
            ★ Top Recommendation
          </span>
        </div>

        <div class="score-display">
          <div class="score-numbers">
            <span class="score-val" id="score-val-${escapeHtml(option.id)}">${option.totalScore.toFixed(1)}</span>
            <span class="score-max">/ 10.0</span>
          </div>
          <div class="score-bar-track">
            <div
              class="score-bar-fill"
              id="score-bar-${escapeHtml(option.id)}"
              style="width: ${scorePct}%;"
            ></div>
          </div>
        </div>

        <div class="criterion-breakdown">
          ${matrix.criteria
            .map((c) => {
              const score = option.scores?.[c.id] ?? 0;
              return `<span class="breakdown-pill">${escapeHtml(c.name)}: <strong>${score}</strong></span>`;
            })
            .join("")}
        </div>

        <div class="pros-cons-grid">
          ${
            option.pros && option.pros.length > 0
              ? `<div class="pros-col">
                  <span class="pros-heading">Pros</span>
                  <ul class="pros-list">
                    ${option.pros.map((pro) => `<li>${escapeHtml(pro)}</li>`).join("")}
                  </ul>
                </div>`
              : ""
          }
          ${
            option.cons && option.cons.length > 0
              ? `<div class="cons-col">
                  <span class="cons-heading">Cons</span>
                  <ul class="cons-list">
                    ${option.cons.map((con) => `<li>${escapeHtml(con)}</li>`).join("")}
                  </ul>
                </div>`
              : ""
          }
        </div>
      </div>
    `;
  });

  html += `</div></section>`;

  // Embed matrix JSON data for the interactive vanilla JS engine
  const matrixPayload = {
    criteria: matrix.criteria.map((c) => ({
      id: c.id,
      name: c.name,
      weight: typeof c.weight === "number" ? c.weight : 5,
    })),
    options: matrix.options.map((opt) => ({
      id: opt.id,
      name: opt.name,
      scores: opt.scores || {},
    })),
  };

  html += `<script type="application/json" id="nova-matrix-payload">${safeJsonForScript(matrixPayload)}</script>`;

  return html;
}

/**
 * Renders the Chart Data & Analytics section HTML with clean HTML table and pure CSS visual bars.
 */
function renderChartSection(chart: ChartArtifact): string {
  const maxVal = Math.max(
    1,
    ...chart.data.map((d) => Math.max(d.value, d.secondaryValue || 0)),
  );

  let html = `<section class="dossier-section" id="chart-analysis">
    <div class="section-badge">QUANTITATIVE DATA &amp; METRICS</div>
    <h2 class="section-heading">${escapeHtml(chart.title)}</h2>
    ${chart.insight ? `<div class="summary-card"><p class="summary-text"><strong>Insight:</strong> ${escapeHtml(chart.insight)}</p></div>` : ""}

    <div class="chart-visuals-card">
      <h3 class="section-subheading">Comparative Distribution</h3>
      <div class="bars-container">`;

  chart.data.forEach((item) => {
    const pct = Math.min(100, Math.max(0, (item.value / maxVal) * 100)).toFixed(
      1,
    );
    html += `
      <div class="bar-row">
        <div class="bar-label-wrap">
          <span class="bar-label">${escapeHtml(item.label)}</span>
          <span class="bar-value">${item.value}</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${pct}%;"></div>
        </div>
        ${
          item.deltaPercent
            ? `<span class="delta-tag ${item.deltaPercent.startsWith("-") ? "delta-neg" : "delta-pos"}">${escapeHtml(item.deltaPercent)}</span>`
            : ""
        }
      </div>
    `;
  });

  html += `</div></div>`;

  // Structured Data Table
  html += `
    <div class="table-card">
      <h3 class="section-subheading">Data Table</h3>
      <div class="table-responsive">
        <table class="dossier-table">
          <thead>
            <tr>
              <th>${escapeHtml(chart.xAxisKey || "Metric / Item")}</th>
              <th>Primary Value</th>
              ${chart.data.some((d) => d.secondaryValue != null) ? "<th>Secondary Value</th>" : ""}
              ${chart.data.some((d) => d.category) ? "<th>Category</th>" : ""}
              ${chart.data.some((d) => d.deltaPercent) ? "<th>Change</th>" : ""}
            </tr>
          </thead>
          <tbody>`;

  chart.data.forEach((row) => {
    html += `
      <tr>
        <td class="font-medium">${escapeHtml(row.label)}</td>
        <td class="font-mono">${row.value}</td>
        ${chart.data.some((d) => d.secondaryValue != null) ? `<td class="font-mono">${row.secondaryValue ?? "—"}</td>` : ""}
        ${chart.data.some((d) => d.category) ? `<td><span class="category-pill">${escapeHtml(row.category || "General")}</span></td>` : ""}
        ${
          chart.data.some((d) => d.deltaPercent)
            ? `<td><span class="delta-tag ${row.deltaPercent?.startsWith("-") ? "delta-neg" : "delta-pos"}">${escapeHtml(row.deltaPercent || "0%")}</span></td>`
            : ""
        }
      </tr>
    `;
  });

  html += `</tbody></table></div></div>`;

  if (chart.takeaways && chart.takeaways.length > 0) {
    html += `<div class="takeaways-card">
      <h3 class="section-subheading">Key Takeaways</h3>
      <ul class="dossier-bullets">
        ${chart.takeaways.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}
      </ul>
    </div>`;
  }

  html += `</section>`;
  return html;
}

/**
 * Renders the Strategic Goal Plan section HTML with phases, milestones, and task checklists.
 */
function renderPlanSection(plan: GoalPlan): string {
  let html = `<section class="dossier-section" id="strategic-plan">
    <div class="section-badge">EXECUTION PLAN &amp; ROADMAP</div>
    <h2 class="section-heading">${escapeHtml(plan.goal)}</h2>
    <div class="plan-meta-banner">
      <span class="meta-item">⏱️ Timeframe: <strong>${escapeHtml(plan.timeframe || "Not specified")}</strong></span>
    </div>
    ${plan.overview ? `<div class="summary-card"><p class="summary-text">${escapeHtml(plan.overview)}</p></div>` : ""}`;

  if (plan.keySuccessMetrics && plan.keySuccessMetrics.length > 0) {
    html += `<div class="metrics-grid">`;
    plan.keySuccessMetrics.forEach((metric, idx) => {
      html += `
        <div class="metric-card">
          <span class="metric-num">KSM ${idx + 1}</span>
          <p class="metric-text">${escapeHtml(metric)}</p>
        </div>
      `;
    });
    html += `</div>`;
  }

  if (plan.phases && plan.phases.length > 0) {
    html += `<div class="phases-container">
      <h3 class="section-subheading">Phased Milestones</h3>`;

    plan.phases.forEach((phase) => {
      const statusClass = `status-${phase.status || "pending"}`;
      html += `
        <div class="phase-card">
          <div class="phase-header">
            <div class="phase-title-wrap">
              <span class="phase-number">Phase ${phase.phaseNumber}</span>
              <h4 class="phase-name">${escapeHtml(phase.phaseName)}</h4>
            </div>
            <span class="badge ${statusClass}">${(phase.status || "pending").toUpperCase()}</span>
          </div>
          ${phase.summary ? `<p class="phase-summary">${escapeHtml(phase.summary)}</p>` : ""}
          <div class="tasks-list">
            ${phase.tasks
              .map(
                (task) => `
              <div class="task-row">
                <span class="task-status-indicator ${task.status === "completed" ? "task-done" : "task-todo"}">
                  ${task.status === "completed" ? "✓" : "○"}
                </span>
                <div class="task-details">
                  <div class="task-title-line">
                    <span class="task-title">${escapeHtml(task.title)}</span>
                    <span class="task-badge task-badge-${task.status}">${task.status.replace("_", " ")}</span>
                  </div>
                  ${task.description ? `<p class="task-desc">${escapeHtml(task.description)}</p>` : ""}
                  ${task.actionableOutput ? `<div class="task-output"><strong>Deliverable:</strong> ${escapeHtml(task.actionableOutput)}</div>` : ""}
                </div>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
      `;
    });

    html += `</div>`;
  }

  html += `</section>`;
  return html;
}

/**
 * Renders the Code Artifact section HTML with copy button and formatted pre/code block.
 */
function renderCodeSection(code: CodeArtifact): string {
  const codeId = "code-listing-" + Math.random().toString(36).substring(2, 8);

  let html = `<section class="dossier-section" id="technical-code">
    <div class="section-badge">TECHNICAL SPECIFICATION &amp; CODE</div>
    <div class="code-title-bar">
      <h2 class="section-heading">${escapeHtml(code.filename || "Technical Architecture")}</h2>
      <span class="lang-badge">${escapeHtml(code.language || "code")}</span>
    </div>
    ${code.explanation ? `<div class="summary-card"><p class="summary-text">${escapeHtml(code.explanation)}</p></div>` : ""}

    <div class="code-wrapper">
      <div class="code-header">
        <span class="code-filename">${escapeHtml(code.filename || "snippet")}</span>
        <button type="button" class="copy-code-btn" data-code-id="${codeId}">
          Copy Code
        </button>
      </div>
      <pre class="code-block" id="${codeId}"><code>${escapeHtml(code.code)}</code></pre>
    </div>
  `;

  if (code.previewHtml?.trim()) {
    html += `
      <div class="preview-card">
        <h3 class="section-subheading">Rendered Sandbox Preview</h3>
        <div class="preview-sandbox">${escapeHtml(code.previewHtml)}</div>
      </div>
    `;
  }

  html += `</section>`;
  return html;
}

/**
 * Renders the Multi-Agent Dialectical Debate section HTML.
 */
function renderDebateSection(debate: DebateArtifact): string {
  let html = `<section class="dossier-section" id="agent-debate">
    <div class="section-badge">DIALECTICAL MULTI-AGENT SYNTHESIS</div>
    <h2 class="section-heading">${escapeHtml(debate.topic || "Dialectical Debate")}</h2>
    ${
      debate.consensusSummary
        ? `<div class="summary-card"><h3 class="summary-subtitle">Consensus Overview</h3><p class="summary-text">${escapeHtml(debate.consensusSummary)}</p></div>`
        : ""
    }

    <div class="perspectives-grid">`;

  debate.perspectives.forEach((persp) => {
    const stanceClass =
      persp.stance === "Advocate"
        ? "stance-advocate"
        : persp.stance === "Critic"
          ? "stance-critic"
          : "stance-neutral";

    html += `
      <div class="perspective-card">
        <div class="perspective-header">
          <span class="agent-avatar" style="background-color: ${escapeHtml(persp.avatarColor || "#14b8a6")};"></span>
          <div>
            <h4 class="agent-name">${escapeHtml(persp.agentName)}</h4>
            <span class="badge ${stanceClass}">${escapeHtml(persp.stance)}</span>
          </div>
        </div>
        <div class="perspective-body">
          <div class="perspective-section">
            <span class="perspective-label">Core Arguments:</span>
            <ul class="dossier-bullets">
              ${persp.arguments.map((arg) => `<li>${escapeHtml(arg)}</li>`).join("")}
            </ul>
          </div>
          ${
            persp.caveats && persp.caveats.length > 0
              ? `<div class="perspective-section caveats-wrap">
                  <span class="perspective-label">Identified Caveats &amp; Edge Cases:</span>
                  <ul class="dossier-bullets caveats-list">
                    ${persp.caveats.map((cav) => `<li>${escapeHtml(cav)}</li>`).join("")}
                  </ul>
                </div>`
              : ""
          }
        </div>
      </div>
    `;
  });

  html += `</div>`;

  if (debate.synthesisVerdict?.trim()) {
    html += `<div class="verdict-banner">
      <span class="verdict-tag">SYNTHESIS ARBITRATION VERDICT</span>
      <p class="verdict-text">${escapeHtml(debate.synthesisVerdict)}</p>
    </div>`;
  }

  html += `</section>`;
  return html;
}

/**
 * Renders the DSPy-style Prompt Evolution & Metaprompt Optimization section HTML.
 */
function renderPromptOptimizationSection(
  po: PromptOptimizationArtifact,
): string {
  let html = `<section class="dossier-section" id="prompt-optimization">
    <div class="section-badge">DSPY PROMPT OPTIMIZATION &amp; METAPROMPT STUDIO</div>
    <h2 class="section-heading">${escapeHtml(po.targetTask || "Prompt Evolution")}</h2>
    <div class="summary-card">
      <h3 class="summary-subtitle">Optimization Overview</h3>
      <p class="summary-text">Target Model: <strong>${escapeHtml(po.summary.baseModel)}</strong> | Eval Score: <strong>${po.summary.optimizedScore.toFixed(1)}% (+${po.summary.netScoreGainPct}%)</strong> | Token Compression: <strong>${po.summary.tokenSavingsPct}%</strong></p>
    </div>

    <div class="findings-list">
      <h3 class="summary-subtitle">Evaluated Prompt Candidates (${po.candidates.length})</h3>
      <div class="perspectives-grid">`;

  po.candidates.forEach((c) => {
    html += `
      <div class="perspective-card">
        <div class="perspective-header">
          <span class="perspective-persona">${escapeHtml(c.label)}</span>
          <span class="perspective-stance">${c.selected ? "⭐ SELECTED" : "CANDIDATE"}</span>
        </div>
        <div class="perspective-body">
          <p class="perspective-core"><strong>Score:</strong> ${c.evalScore.toFixed(1)}% | <strong>Tokens:</strong> ${c.tokenCount} | <strong>Technique:</strong> ${escapeHtml(c.technique)}</p>
          <p class="finding-desc">${escapeHtml(c.rationale)}</p>
        </div>
      </div>
    `;
  });

  html += `</div></div></section>`;
  return html;
}

/**
 * Renders the Vector Space & Semantic Cluster Visualizer section HTML.
 */
function renderVectorSpaceSection(vs: VectorSpaceArtifact): string {
  let html = `<section class="dossier-section" id="vector-space">
    <div class="section-badge">VECTOR SPACE &amp; SEMANTIC CLUSTER STUDIO</div>
    <h2 class="section-heading">${escapeHtml(vs.datasetTitle || "Vector Space")}</h2>
    <div class="summary-card">
      <h3 class="summary-subtitle">Dimensionality Reduction Overview</h3>
      <p class="summary-text">${escapeHtml(vs.executiveSummary)}</p>
      <p class="summary-text"><strong>Dimensionality:</strong> ${vs.summary.embeddingDimension}d → 2D ${escapeHtml(vs.summary.reductionMethod.toUpperCase())} | <strong>Silhouette Score:</strong> ${vs.summary.silhouetteScore.toFixed(3)} | <strong>Explained Variance:</strong> ${(vs.summary.explainedVarianceRatio * 100).toFixed(1)}%</p>
    </div>

    <div class="findings-list">
      <h3 class="summary-subtitle">Semantic Clusters (${vs.clusters.length})</h3>
      <div class="perspectives-grid">`;

  vs.clusters.forEach((c) => {
    html += `
      <div class="perspective-card">
        <div class="perspective-header">
          <span class="perspective-persona">${escapeHtml(c.label)}</span>
          <span class="perspective-stance">${c.pointCount} Vectors</span>
        </div>
        <div class="perspective-body">
          <p class="perspective-core"><strong>Centroid:</strong> (${c.centroidX.toFixed(2)}, ${c.centroidY.toFixed(2)}) | <strong>Radius:</strong> ${c.radius.toFixed(2)} | <strong>Avg Tokens:</strong> ${c.averageTokenCount}</p>
          <p class="finding-desc"><strong>Top Concepts:</strong> ${escapeHtml(c.topKeywords.join(", "))}</p>
        </div>
      </div>
    `;
  });

  html += `</div></div></section>`;
  return html;
}

/**
 * Renders the Structural Causal Model & Counterfactual DAG section HTML.
 */
function renderCausalDagSection(cd: CausalDagArtifact): string {
  let html = `<section class="dossier-section" id="causal-dag">
    <div class="section-badge">CAUSAL INFERENCE &amp; COUNTERFACTUAL STUDIO</div>
    <h2 class="section-heading">${escapeHtml(cd.hypothesis || "Causal DAG Analysis")}</h2>
    <div class="summary-card">
      <h3 class="summary-subtitle">Causal Identification Overview</h3>
      <p class="summary-text">${escapeHtml(cd.executiveSummary)}</p>
      <p class="summary-text"><strong>Treatment:</strong> ${escapeHtml(cd.summary.treatmentNode)} → <strong>Outcome:</strong> ${escapeHtml(cd.summary.outcomeNode)} | <strong>ATE:</strong> ${cd.summary.averageTreatmentEffect} units | <strong>Backdoor Criterion:</strong> ${cd.summary.backdoorCriterionSatisfied ? "Satisfied" : "Violated"} | <strong>E-Value:</strong> ${cd.summary.eValue.toFixed(2)}</p>
    </div>

    <div class="findings-list">
      <h3 class="summary-subtitle">Counterfactual "What-If" Interventions (${cd.counterfactuals.length})</h3>
      <div class="perspectives-grid">`;

  cd.counterfactuals.forEach((cf) => {
    html += `
      <div class="perspective-card">
        <div class="perspective-header">
          <span class="perspective-persona">${escapeHtml(cf.name)}</span>
          <span class="perspective-stance">ITE: ${cf.individualTreatmentEffect > 0 ? `+${cf.individualTreatmentEffect}` : cf.individualTreatmentEffect}</span>
        </div>
        <div class="perspective-body">
          <p class="perspective-core"><strong>Intervention:</strong> <code>${escapeHtml(cf.intervention)}</code></p>
          <p class="perspective-core"><strong>Factual:</strong> ${escapeHtml(cf.factualOutcome)} → <strong>Counterfactual:</strong> ${escapeHtml(cf.counterfactualOutcome)}</p>
          <p class="finding-desc">${escapeHtml(cf.explanation)}</p>
        </div>
      </div>
    `;
  });

  html += `</div></div></section>`;
  return html;
}

function renderBayesianOptSection(bo: BayesianOptArtifact): string {
  let html = `<section class="dossier-section" id="bayesian-opt">
    <div class="section-badge">BAYESIAN OPTIMIZATION STUDIO</div>
    <h2 class="section-heading">${escapeHtml(bo.title || "Hyperparameter Optimization")}</h2>
    <div class="summary-card">
      <h3 class="summary-subtitle">Optimization Objective &amp; Peak Results</h3>
      <p class="summary-text">${escapeHtml(bo.executiveSummary)}</p>
      <p class="summary-text"><strong>Target Objective:</strong> ${escapeHtml(bo.summary.targetObjective)} | <strong>Peak Value:</strong> ${bo.summary.bestObjectiveValue} (+${bo.summary.improvementPct}%) | <strong>Baseline:</strong> ${bo.summary.baselineObjectiveValue} | <strong>Total Trials:</strong> ${bo.summary.totalTrials}</p>
    </div>

    <div class="findings-list">
      <h3 class="summary-subtitle">Tuned Hyperparameters (${bo.parameters.length})</h3>
      <div class="perspectives-grid">`;

  bo.parameters.forEach((param) => {
    html += `
      <div class="perspective-card">
        <div class="perspective-header">
          <span class="perspective-persona">${escapeHtml(param.name)}</span>
          <span class="perspective-stance">${escapeHtml(param.type.toUpperCase())}</span>
        </div>
        <div class="perspective-body">
          <p class="perspective-core"><strong>Optimal:</strong> <code>${escapeHtml(String(param.optimalValue))} ${escapeHtml(param.unit)}</code></p>
          <p class="perspective-core"><strong>Domain:</strong> ${escapeHtml(param.choices ? param.choices.join(", ") : `[${param.min ?? "-"}, ${param.max ?? "-"}]`)}</p>
        </div>
      </div>
    `;
  });

  html += `</div></div></section>`;
  return html;
}

function renderWorkflowOrchestratorSection(
  wf: WorkflowOrchestratorArtifact,
): string {
  let html = `<section class="dossier-section" id="workflow-orchestrator">
    <div class="section-badge">WORKFLOW ORCHESTRATOR STUDIO</div>
    <h2 class="section-heading">${escapeHtml(wf.title || "Finite State Machine Workflow")}</h2>
    <div class="summary-card">
      <h3 class="summary-subtitle">Orchestrator Architecture &amp; Reliability</h3>
      <p class="summary-text">${escapeHtml(wf.executiveSummary)}</p>
      <p class="summary-text"><strong>Workflow:</strong> ${escapeHtml(wf.summary.workflowName)} | <strong>Resilience Grade:</strong> ${escapeHtml(wf.summary.resilienceGrade)} | <strong>States:</strong> ${wf.summary.totalStates} | <strong>Transitions:</strong> ${wf.summary.totalTransitions} | <strong>Reachability:</strong> ${wf.summary.reachabilityScorePct}%</p>
    </div>

    <div class="findings-list">
      <h3 class="summary-subtitle">Orchestrated Finite States (${wf.states.length})</h3>
      <div class="perspectives-grid">`;

  wf.states.forEach((state) => {
    html += `
      <div class="perspective-card">
        <div class="perspective-header">
          <span class="perspective-persona">${escapeHtml(state.name)}</span>
          <span class="perspective-stance">${escapeHtml(state.type.toUpperCase())}</span>
        </div>
        <div class="perspective-body">
          <p class="perspective-core"><strong>Identifier:</strong> <code>${escapeHtml(state.id)}</code></p>
          <p class="finding-desc">${escapeHtml(state.description)}</p>
          ${state.entryAction ? `<p class="perspective-core"><strong>Entry Hook:</strong> <code>${escapeHtml(state.entryAction)}</code></p>` : ""}
        </div>
      </div>
    `;
  });

  html += `</div></div></section>`;
  return html;
}

function renderFormalProverSection(fp: FormalProverArtifact): string {
  let html = `<section class="dossier-section" id="formal-prover">
    <div class="section-badge">AUTOMATED THEOREM PROVER STUDIO</div>
    <h2 class="section-heading">${escapeHtml(fp.title || "Formal Invariant Proof")}</h2>
    <div class="summary-card">
      <h3 class="summary-subtitle">Mathematical Correctness &amp; SMT Verification</h3>
      <p class="summary-text">${escapeHtml(fp.executiveSummary)}</p>
      <p class="summary-text"><strong>Status:</strong> ${escapeHtml(fp.summary.status.toUpperCase())} | <strong>Soundness:</strong> ${fp.summary.soundnessCompletenessPct}% | <strong>Theorems Verified:</strong> ${fp.summary.provenTheorems}/${fp.summary.totalTheorems} | <strong>Proof Depth:</strong> ${fp.summary.proofDepth} | <strong>Solver:</strong> ${escapeHtml(fp.summary.satSolverType)}</p>
    </div>

    <div class="findings-list">
      <h3 class="summary-subtitle">Deductive Proof Tree AST (${fp.proofTree.length} Steps)</h3>
      <div class="perspectives-grid">`;

  fp.proofTree.forEach((node) => {
    html += `
      <div class="perspective-card">
        <div class="perspective-header">
          <span class="perspective-persona">${escapeHtml(node.name)}</span>
          <span class="perspective-stance">${escapeHtml(node.kind.toUpperCase())}</span>
        </div>
        <div class="perspective-body">
          <p class="perspective-core"><strong>Formula:</strong> <code>${escapeHtml(node.formula)}</code></p>
          <p class="finding-desc">${escapeHtml(node.description)}</p>
          <p class="perspective-core"><strong>Rule:</strong> ${escapeHtml(node.inferenceRule)} | <strong>Depth:</strong> ${node.depth}</p>
        </div>
      </div>
    `;
  });

  html += `</div></div></section>`;
  return html;
}

function renderEpistemicConsensusSection(
  ec: EpistemicConsensusArtifact,
): string {
  let html = `<section class="dossier-section" id="epistemic-consensus">
    <div class="section-badge">BAYESIAN TRUTH SERUM &amp; DELPHI CONSENSUS</div>
    <h2 class="section-heading">${escapeHtml(ec.title || "Epistemic Consensus Report")}</h2>
    <div class="summary-card">
      <h3 class="summary-subtitle">Prelec BTS Information Scoring &amp; Epistemic Convergence</h3>
      <p class="summary-text">${escapeHtml(ec.executiveSummary)}</p>
      <p class="summary-text"><strong>Consensus Index:</strong> ${ec.summary.consensusIndexPct}% (Grade ${escapeHtml(ec.summary.verdictConfidenceGrade)}) | <strong>Entropy Reduction:</strong> -${ec.summary.entropyReductionPct}% | <strong>Delphi Rounds:</strong> ${ec.summary.delphiRoundsCompleted} | <strong>Governance:</strong> ${escapeHtml(ec.summary.governanceModel)}</p>
    </div>

    <div class="findings-list">
      <h3 class="summary-subtitle">Agent Belief Endorsements &amp; BTS Scores (${ec.agents.length})</h3>
      <div class="perspectives-grid">`;

  ec.agents.forEach((agent) => {
    html += `
      <div class="perspective-card">
        <div class="perspective-header">
          <span class="perspective-persona">${escapeHtml(agent.agentName)}</span>
          <span class="perspective-stance">BTS +${agent.btsTotalScore}</span>
        </div>
        <div class="perspective-body">
          <p class="perspective-core"><strong>Role:</strong> ${escapeHtml(agent.role)} | <strong>Weight:</strong> ${agent.expertiseWeight}</p>
          <p class="finding-desc">${escapeHtml(agent.justification)}</p>
          <p class="perspective-core"><strong>Endorsement:</strong> ${(agent.personalEndorsement * 100).toFixed(0)}% | <strong>Predicted Crowd:</strong> ${(agent.predictedCrowdMean * 100).toFixed(0)}% | <strong>Info Score:</strong> +${agent.informationScore}</p>
        </div>
      </div>
    `;
  });

  html += `</div></div></section>`;
  return html;
}

/**
 * Fallback renderer when exporting a session without an explicit artifact.
 */
function renderSessionFallbackSection(session: Session): string {
  const assistantMessages = session.messages.filter(
    (m) => m.role === "assistant",
  );
  const latestAssistant = assistantMessages[assistantMessages.length - 1];

  return `
    <section class="dossier-section" id="session-synthesis">
      <div class="section-badge">SESSION INTELLIGENCE TRANSCRIPT</div>
      <h2 class="section-heading">${escapeHtml(session.title || "Workspace Analysis")}</h2>
      <div class="summary-card">
        <h3 class="summary-subtitle">Synthesized Intelligence Summary</h3>
        <p class="summary-text">${escapeHtml(latestAssistant?.content || "Workspace session transcript archived.")}</p>
      </div>

      <div class="table-card">
        <h3 class="section-subheading">Turn Transcript (${session.messages.length} messages)</h3>
        <div class="messages-stack">
          ${session.messages
            .map(
              (msg) => `
            <div class="msg-card msg-${msg.role}">
              <div class="msg-meta">
                <span class="msg-role">${msg.role.toUpperCase()}</span>
                <span class="msg-time">${escapeHtml(formatDossierDate(msg.timestamp))}</span>
              </div>
              <div class="msg-content">${escapeHtml(msg.content)}</div>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

/**
 * Renders the formal Academic Bibliography section.
 */
function renderBibliographySection(sources: SourceCitation[]): string {
  if (!sources || sources.length === 0) {
    return "";
  }

  let html = `
    <section class="dossier-section" id="bibliography">
      <div class="section-badge">SOURCE CORROBORATION</div>
      <h2 class="section-heading">Academic Bibliography &amp; Verified Sources</h2>
      <p class="section-desc">Numbered references verified during real-time web retrieval. Click any reference to inspect primary documentation.</p>
      <div class="bibliography-list">
  `;

  sources.forEach((src, idx) => {
    const num = idx + 1;
    const safeSourceUrl = sanitizeUrl(src.url);
    const domain = escapeHtml(src.domain || "Web Source");
    const title = escapeHtml(
      src.title || src.url || `Reference Source [${num}]`,
    );
    const author = src.author ? escapeHtml(src.author) : "";
    const date = src.publishedDate ? escapeHtml(src.publishedDate) : "";
    const relevance =
      typeof src.relevanceScore === "number"
        ? Math.round(src.relevanceScore)
        : null;
    const snippet = src.snippet ? escapeHtml(src.snippet) : "";

    html += `
      <article class="source-card" id="source-${num}">
        <div class="source-header">
          <div class="source-num-wrap">
            <span class="source-marker">[${num}]</span>
            <a href="${safeSourceUrl}" target="_blank" rel="noopener noreferrer" class="source-link">
              ${title}
            </a>
          </div>
          <div class="source-badges">
            <span class="badge badge-domain">${domain}</span>
            ${relevance != null ? `<span class="badge badge-relevance">${relevance}% Relevance</span>` : ""}
            ${src.contradictionFlag ? `<span class="badge badge-warn">Contradiction Flagged</span>` : ""}
          </div>
        </div>

        ${
          author || date
            ? `<div class="source-meta">
                ${author ? `<span class="source-author">Author: ${author}</span>` : ""}
                ${author && date ? `<span class="meta-sep">•</span>` : ""}
                ${date ? `<span class="source-date">Published: ${date}</span>` : ""}
              </div>`
            : ""
        }

        ${snippet ? `<blockquote class="source-snippet">“${snippet}”</blockquote>` : ""}

        <div class="source-footer">
          <a href="${safeSourceUrl}" target="_blank" rel="noopener noreferrer" class="source-url-text">
            ${safeSourceUrl} ↗
          </a>
        </div>
      </article>
    `;
  });

  html += `</div></section>`;
  return html;
}

/**
 * Returns embedded responsive CSS with modern dark slate theme, light theme fallback,
 * and clean print styling. Zero external stylesheet dependencies.
 */
function getEmbeddedCss(): string {
  return `
    :root {
      --bg-primary: #090d16;
      --bg-secondary: #0f172a;
      --bg-tertiary: #1e293b;
      --bg-card: #0f172a;
      --border-color: #334155;
      --border-subtle: #1e293b;
      --text-primary: #f8fafc;
      --text-secondary: #94a3b8;
      --text-muted: #64748b;
      --accent-teal: #14b8a6;
      --accent-teal-glow: rgba(20, 184, 166, 0.15);
      --accent-cyan: #06b6d4;
      --accent-emerald: #10b981;
      --accent-amber: #f59e0b;
      --accent-rose: #f43f5e;
      --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
    }

    @media (prefers-color-scheme: light) {
      :root {
        --bg-primary: #f8fafc;
        --bg-secondary: #ffffff;
        --bg-tertiary: #f1f5f9;
        --bg-card: #ffffff;
        --border-color: #cbd5e1;
        --border-subtle: #e2e8f0;
        --text-primary: #0f172a;
        --text-secondary: #475569;
        --text-muted: #64748b;
        --accent-teal: #0d9488;
        --accent-teal-glow: rgba(13, 148, 136, 0.12);
        --accent-cyan: #0891b2;
        --accent-emerald: #059669;
        --accent-amber: #d97706;
        --accent-rose: #e11d48;
      }
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      background-color: var(--bg-primary);
      color: var(--text-primary);
      font-family: var(--font-sans);
      font-size: 15px;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .dossier-wrapper {
      max-width: 960px;
      margin: 0 auto;
      padding: 40px 24px 80px;
    }

    /* Header Bar */
    .dossier-header {
      padding-bottom: 28px;
      margin-bottom: 36px;
      border-bottom: 1px solid var(--border-color);
    }

    .brand-banner {
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: var(--accent-teal);
      text-transform: uppercase;
      margin-bottom: 8px;
    }

    .dossier-title {
      font-size: 28px;
      font-weight: 800;
      line-height: 1.25;
      color: var(--text-primary);
      margin-bottom: 16px;
      letter-spacing: -0.02em;
    }

    .meta-chips {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 10px;
      font-size: 11px;
      font-family: var(--font-mono);
      font-weight: 600;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .badge-verified {
      background: rgba(16, 185, 129, 0.12);
      color: var(--accent-emerald);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .badge-high {
      background: rgba(20, 184, 166, 0.12);
      color: var(--accent-teal);
      border: 1px solid rgba(20, 184, 166, 0.3);
    }

    .badge-medium {
      background: rgba(245, 158, 11, 0.12);
      color: var(--accent-amber);
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    .badge-low {
      background: rgba(244, 63, 94, 0.12);
      color: var(--accent-rose);
      border: 1px solid rgba(244, 63, 94, 0.3);
    }

    .badge-meta {
      background: var(--bg-secondary);
      color: var(--text-secondary);
      border: 1px solid var(--border-color);
    }

    /* Sections */
    .dossier-section {
      margin-bottom: 44px;
    }

    .section-badge {
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: var(--accent-cyan);
      text-transform: uppercase;
      margin-bottom: 6px;
    }

    .section-heading {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 16px;
      letter-spacing: -0.01em;
    }

    .section-subheading {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 12px;
    }

    .section-desc {
      font-size: 13px;
      color: var(--text-secondary);
      margin-bottom: 16px;
    }

    /* Cards */
    .summary-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-left: 4px solid var(--accent-teal);
      border-radius: 12px;
      padding: 20px 24px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .summary-text {
      color: var(--text-primary);
      font-size: 15px;
      line-height: 1.7;
    }

    .summary-subtitle {
      font-size: 14px;
      font-weight: 700;
      color: var(--accent-teal);
      margin-bottom: 8px;
    }

    /* Findings Grid */
    .findings-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }

    .finding-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 18px 20px;
      transition: border-color 0.15s ease;
    }

    .finding-card:hover {
      border-color: var(--accent-teal);
    }

    .finding-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .finding-index {
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
    }

    .finding-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 8px;
    }

    .finding-description {
      color: var(--text-secondary);
      font-size: 14px;
      line-height: 1.6;
    }

    .finding-citations {
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
    }

    .citation-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      font-family: var(--font-mono);
    }

    /* Citation Tags */
    .citation-tag, .citation-pill {
      display: inline-flex;
      align-items: center;
      padding: 1px 6px;
      margin: 0 2px;
      font-size: 11px;
      font-family: var(--font-mono);
      font-weight: 600;
      border-radius: 4px;
      background: var(--accent-teal-glow);
      color: var(--accent-teal);
      border: 1px solid rgba(20, 184, 166, 0.3);
      text-decoration: none;
      cursor: pointer;
      transition: all 0.15s ease;
      vertical-align: baseline;
    }

    .citation-tag:hover, .citation-pill:hover {
      background: var(--accent-teal);
      color: #090d16;
    }

    /* Tooltip Popover */
    #nova-citation-tooltip {
      position: absolute;
      z-index: 10000;
      max-width: 340px;
      background: #0f172a;
      color: #f8fafc;
      border: 1px solid #334155;
      border-radius: 10px;
      padding: 14px 16px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
      font-size: 12px;
      line-height: 1.5;
      pointer-events: none;
      transition: opacity 0.15s ease;
    }

    .tooltip-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 6px;
    }

    .tooltip-marker {
      font-family: var(--font-mono);
      font-weight: 700;
      color: var(--accent-teal);
    }

    .tooltip-domain {
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--text-muted);
    }

    .tooltip-title {
      font-weight: 600;
      color: #f8fafc;
      margin-bottom: 6px;
    }

    .tooltip-snippet {
      color: #94a3b8;
      font-size: 11px;
      font-style: italic;
      margin-bottom: 8px;
    }

    .tooltip-footer {
      font-size: 10px;
      color: var(--accent-cyan);
      font-family: var(--font-mono);
    }

    /* Alerts and Highlights */
    .alert-box {
      border-radius: 12px;
      padding: 18px 20px;
      display: flex;
      gap: 14px;
    }

    .alert-amber {
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: var(--text-primary);
    }

    .alert-icon {
      font-size: 20px;
      flex-shrink: 0;
    }

    .alert-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--accent-amber);
      margin-bottom: 8px;
    }

    .alert-list {
      padding-left: 20px;
      font-size: 13px;
      color: var(--text-secondary);
    }

    .recommendation-card {
      background: var(--bg-secondary);
      border: 1px solid rgba(20, 184, 166, 0.3);
      border-radius: 12px;
      padding: 20px 24px;
    }

    .rec-tag {
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 700;
      color: var(--accent-teal);
      letter-spacing: 0.08em;
      margin-bottom: 8px;
    }

    .rec-text {
      font-size: 15px;
      color: var(--text-primary);
      line-height: 1.6;
    }

    /* Decision Matrix Styles */
    .matrix-controls-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 20px 24px;
      margin-bottom: 24px;
    }

    .controls-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 18px;
      flex-wrap: wrap;
      gap: 12px;
    }

    .controls-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .controls-subtitle {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .btn-reset {
      background: var(--bg-tertiary);
      color: var(--text-secondary);
      border: 1px solid var(--border-color);
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-family: var(--font-mono);
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-reset:hover {
      background: var(--border-color);
      color: var(--text-primary);
    }

    .sliders-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
    }

    .slider-control {
      background: var(--bg-primary);
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      padding: 12px 14px;
    }

    .slider-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .criterion-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .weight-tags {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    .weight-number {
      font-family: var(--font-mono);
      font-size: 12px;
      font-weight: 700;
      color: var(--accent-teal);
    }

    .weight-pct {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-muted);
    }

    .weight-slider {
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: var(--bg-tertiary);
      outline: none;
      cursor: pointer;
      accent-color: var(--accent-teal);
    }

    .options-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }

    .option-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 20px;
      transition: all 0.2s ease;
    }

    .top-ranked-card {
      border-color: rgba(20, 184, 166, 0.5);
      box-shadow: 0 0 20px rgba(20, 184, 166, 0.08);
    }

    .option-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }

    .option-title-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .rank-badge {
      font-family: var(--font-mono);
      font-size: 13px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 6px;
      background: var(--bg-tertiary);
      color: var(--accent-teal);
      border: 1px solid var(--border-color);
    }

    .top-ranked-card .rank-badge {
      background: var(--accent-teal);
      color: #090d16;
    }

    .top-badge {
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 9999px;
      background: rgba(245, 158, 11, 0.15);
      color: var(--accent-amber);
      border: 1px solid rgba(245, 158, 11, 0.4);
    }

    .option-name {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .score-display {
      margin-bottom: 14px;
    }

    .score-numbers {
      display: flex;
      align-items: baseline;
      gap: 4px;
      margin-bottom: 6px;
    }

    .score-val {
      font-family: var(--font-mono);
      font-size: 24px;
      font-weight: 800;
      color: var(--text-primary);
    }

    .score-max {
      font-family: var(--font-mono);
      font-size: 13px;
      color: var(--text-muted);
    }

    .score-bar-track {
      width: 100%;
      height: 8px;
      border-radius: 4px;
      background: var(--bg-tertiary);
      overflow: hidden;
    }

    .score-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--accent-teal), var(--accent-cyan));
      border-radius: 4px;
      transition: width 0.2s ease;
    }

    .criterion-breakdown {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 14px;
    }

    .breakdown-pill {
      font-size: 11px;
      font-family: var(--font-mono);
      background: var(--bg-primary);
      border: 1px solid var(--border-subtle);
      padding: 2px 8px;
      border-radius: 4px;
      color: var(--text-secondary);
    }

    .breakdown-pill strong {
      color: var(--text-primary);
    }

    .pros-cons-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      padding-top: 12px;
      border-top: 1px solid var(--border-subtle);
    }

    @media (max-width: 600px) {
      .pros-cons-grid {
        grid-template-columns: 1fr;
      }
    }

    .pros-heading {
      font-size: 11px;
      font-weight: 700;
      color: var(--accent-emerald);
      text-transform: uppercase;
      font-family: var(--font-mono);
      display: block;
      margin-bottom: 6px;
    }

    .cons-heading {
      font-size: 11px;
      font-weight: 700;
      color: var(--accent-rose);
      text-transform: uppercase;
      font-family: var(--font-mono);
      display: block;
      margin-bottom: 6px;
    }

    .pros-list, .cons-list {
      padding-left: 16px;
      font-size: 12px;
      color: var(--text-secondary);
    }

    /* Chart & Table Styles */
    .chart-visuals-card, .table-card, .takeaways-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 20px 24px;
      margin-bottom: 20px;
    }

    .bars-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 12px;
    }

    .bar-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .bar-label-wrap {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      font-weight: 500;
    }

    .bar-track {
      width: 100%;
      height: 10px;
      background: var(--bg-tertiary);
      border-radius: 5px;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      background: var(--accent-teal);
      border-radius: 5px;
    }

    .delta-tag {
      font-size: 10px;
      font-family: var(--font-mono);
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 4px;
      align-self: flex-start;
    }

    .delta-pos {
      background: rgba(16, 185, 129, 0.15);
      color: var(--accent-emerald);
    }

    .delta-neg {
      background: rgba(244, 63, 94, 0.15);
      color: var(--accent-rose);
    }

    .table-responsive {
      overflow-x: auto;
    }

    .dossier-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      text-align: left;
    }

    .dossier-table th {
      padding: 10px 14px;
      border-bottom: 2px solid var(--border-color);
      color: var(--text-muted);
      font-family: var(--font-mono);
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 600;
    }

    .dossier-table td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border-subtle);
      color: var(--text-secondary);
    }

    .category-pill {
      font-size: 11px;
      font-family: var(--font-mono);
      padding: 2px 8px;
      border-radius: 4px;
      background: var(--bg-tertiary);
      color: var(--text-secondary);
    }

    .dossier-bullets {
      padding-left: 20px;
      font-size: 14px;
      color: var(--text-secondary);
    }

    .dossier-bullets li {
      margin-bottom: 6px;
    }

    /* Code Block Styles */
    .code-title-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .lang-badge {
      font-family: var(--font-mono);
      font-size: 11px;
      text-transform: uppercase;
      padding: 2px 8px;
      border-radius: 4px;
      background: var(--bg-tertiary);
      color: var(--accent-cyan);
      border: 1px solid var(--border-color);
    }

    .code-wrapper {
      background: #050811;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 20px;
    }

    .code-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      background: #0d121f;
      border-bottom: 1px solid var(--border-color);
    }

    .code-filename {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--text-secondary);
    }

    .copy-code-btn {
      background: var(--bg-tertiary);
      color: var(--text-secondary);
      border: 1px solid var(--border-color);
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-family: var(--font-mono);
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .copy-code-btn:hover {
      background: var(--border-color);
      color: var(--text-primary);
    }

    .copy-code-btn.copied {
      background: rgba(16, 185, 129, 0.2);
      color: var(--accent-emerald);
      border-color: rgba(16, 185, 129, 0.4);
    }

    .code-block {
      padding: 16px;
      overflow-x: auto;
      font-family: var(--font-mono);
      font-size: 13px;
      line-height: 1.6;
      color: #e2e8f0;
    }

    /* Bibliography Styles */
    .bibliography-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .source-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 16px 20px;
      transition: all 0.2s ease;
    }

    .source-card.source-highlight {
      outline: 2px solid var(--accent-teal) !important;
      box-shadow: 0 0 20px rgba(20, 184, 166, 0.4) !important;
      border-color: var(--accent-teal) !important;
    }

    .source-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
      gap: 12px;
      flex-wrap: wrap;
    }

    .source-num-wrap {
      display: flex;
      align-items: baseline;
      gap: 8px;
      flex: 1;
    }

    .source-marker {
      font-family: var(--font-mono);
      font-size: 13px;
      font-weight: 700;
      color: var(--accent-teal);
    }

    .source-link {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary);
      text-decoration: none;
    }

    .source-link:hover {
      color: var(--accent-teal);
      text-decoration: underline;
    }

    .source-badges {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    .badge-domain {
      background: var(--bg-tertiary);
      color: var(--text-secondary);
    }

    .badge-relevance {
      background: rgba(20, 184, 166, 0.12);
      color: var(--accent-teal);
    }

    .badge-warn {
      background: rgba(244, 63, 94, 0.12);
      color: var(--accent-rose);
    }

    .source-meta {
      font-size: 12px;
      color: var(--text-muted);
      margin-bottom: 8px;
      font-family: var(--font-mono);
    }

    .meta-sep {
      margin: 0 6px;
    }

    .source-snippet {
      font-size: 13px;
      color: var(--text-secondary);
      font-style: italic;
      border-left: 2px solid var(--border-color);
      padding-left: 12px;
      margin: 8px 0;
      line-height: 1.5;
    }

    .source-footer {
      margin-top: 8px;
    }

    .source-url-text {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-muted);
      text-decoration: none;
      word-break: break-all;
    }

    .source-url-text:hover {
      color: var(--accent-cyan);
    }

    /* Footer */
    .dossier-footer {
      margin-top: 60px;
      padding-top: 24px;
      border-top: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 12px;
      color: var(--text-muted);
      font-family: var(--font-mono);
    }

    /* Print Stylesheet */
    @media print {
      @page {
        margin: 1.5cm;
        size: auto;
      }
      body {
        background: #ffffff !important;
        color: #000000 !important;
      }
      .dossier-wrapper {
        max-width: 100% !important;
        padding: 0 !important;
      }
      .no-print, button, input[type="range"] {
        display: none !important;
      }
      .finding-card, .summary-card, .option-card, .source-card, .table-card {
        background: #ffffff !important;
        border: 1px solid #cbd5e1 !important;
        color: #000000 !important;
        box-shadow: none !important;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .dossier-title, .section-heading, .finding-title, .option-name {
        color: #000000 !important;
      }
      .finding-description, .summary-text, .source-snippet {
        color: #334155 !important;
      }
      a {
        color: #000000 !important;
        text-decoration: underline !important;
      }
    }
  `;
}

/**
 * Returns embedded vanilla JavaScript implementing:
 * 1. Interactive citation tooltip popovers on hover.
 * 2. Real-time Decision Matrix criteria weight recalculations (1224 competition rank).
 * 3. Copy-to-clipboard button functionality for code listings.
 * Zero external scripts or network dependencies.
 */
function getEmbeddedVanillaJs(): string {
  return `
    // Tooltip Popover Engine for Interactive Citations
    (function initCitationTooltips() {
      var sourcesPayloadEl = document.getElementById('nova-sources-payload');
      var sourcesData = [];
      if (sourcesPayloadEl) {
        try {
          sourcesData = JSON.parse(sourcesPayloadEl.textContent || '[]');
        } catch (e) {
          sourcesData = [];
        }
      }

      var tooltip = document.createElement('div');
      tooltip.id = 'nova-citation-tooltip';
      tooltip.style.display = 'none';
      tooltip.style.opacity = '0';
      document.body.appendChild(tooltip);

      var hideTimeout = null;

      function showTooltip(tag) {
        if (hideTimeout) clearTimeout(hideTimeout);
        var idxStr = tag.getAttribute('data-citation-idx');
        var idx = parseInt(idxStr, 10);
        if (isNaN(idx) || idx <= 0) return;

        var source = sourcesData[idx - 1] || null;

        // Populate tooltip DOM securely using safe properties
        tooltip.innerHTML = '';

        var header = document.createElement('div');
        header.className = 'tooltip-header';

        var marker = document.createElement('span');
        marker.className = 'tooltip-marker';
        marker.textContent = 'Source [' + idx + ']';
        header.appendChild(marker);

        var domain = document.createElement('span');
        domain.className = 'tooltip-domain';
        domain.textContent = source && source.domain ? source.domain : 'Web Document';
        header.appendChild(domain);

        tooltip.appendChild(header);

        var title = document.createElement('div');
        title.className = 'tooltip-title';
        title.textContent = source && source.title ? source.title : 'Verified Source Reference';
        tooltip.appendChild(title);

        if (source && source.snippet) {
          var snippet = document.createElement('div');
          snippet.className = 'tooltip-snippet';
          snippet.textContent = '“' + source.snippet.slice(0, 160) + (source.snippet.length > 160 ? '…' : '') + '”';
          tooltip.appendChild(snippet);
        }

        var footer = document.createElement('div');
        footer.className = 'tooltip-footer';
        var scoreText = source && typeof source.relevanceScore === 'number' ? source.relevanceScore + '% relevance • ' : '';
        footer.textContent = scoreText + 'Click to jump to bibliography ↓';
        tooltip.appendChild(footer);

        // Position tooltip
        tooltip.style.display = 'block';
        var rect = tag.getBoundingClientRect();
        var tipWidth = tooltip.offsetWidth || 300;
        var tipHeight = tooltip.offsetHeight || 120;

        var left = rect.left + (rect.width / 2) - (tipWidth / 2);
        if (left < 12) left = 12;
        if (left + tipWidth > window.innerWidth - 12) {
          left = window.innerWidth - tipWidth - 12;
        }

        var top = rect.top - tipHeight - 8;
        if (top < 12) {
          top = rect.bottom + 8;
        }

        tooltip.style.left = left + 'px';
        tooltip.style.top = (top + window.scrollY) + 'px';
        tooltip.style.opacity = '1';
      }

      function hideTooltip() {
        tooltip.style.opacity = '0';
        hideTimeout = setTimeout(function() {
          if (tooltip.style.opacity === '0') {
            tooltip.style.display = 'none';
          }
        }, 150);
      }

      document.addEventListener('mouseover', function(e) {
        var tag = e.target.closest('.citation-tag, .citation-pill');
        if (tag) {
          showTooltip(tag);
        }
      });

      document.addEventListener('mouseout', function(e) {
        var tag = e.target.closest('.citation-tag, .citation-pill');
        if (tag) {
          hideTooltip();
        }
      });

      document.addEventListener('click', function(e) {
        var tag = e.target.closest('.citation-tag, .citation-pill');
        if (!tag) return;
        var idxStr = tag.getAttribute('data-citation-idx');
        if (!idxStr) return;
        var targetId = 'source-' + idxStr;
        var targetEl = document.getElementById(targetId);
        if (targetEl) {
          e.preventDefault();
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetEl.classList.add('source-highlight');
          setTimeout(function() {
            targetEl.classList.remove('source-highlight');
          }, 2000);
        }
      });
    })();

    // Decision Matrix Real-Time Sensitivity Engine
    (function initMatrixEngine() {
      var payloadEl = document.getElementById('nova-matrix-payload');
      if (!payloadEl) return;
      var matrixData = null;
      try {
        matrixData = JSON.parse(payloadEl.textContent || '{}');
      } catch (e) {
        return;
      }
      if (!matrixData || !matrixData.criteria || !matrixData.options) return;

      var defaultWeights = {};
      matrixData.criteria.forEach(function(c) {
        defaultWeights[c.id] = c.weight;
      });

      function recalculate() {
        var currentWeights = {};
        var totalWeight = 0;

        matrixData.criteria.forEach(function(c) {
          var slider = document.getElementById('slider-' + c.id);
          var val = slider ? parseFloat(slider.value) || 0 : c.weight;
          currentWeights[c.id] = Math.max(0, val);
          totalWeight += currentWeights[c.id];
        });

        // Update criteria labels
        matrixData.criteria.forEach(function(c) {
          var valEl = document.getElementById('weight-val-' + c.id);
          var pctEl = document.getElementById('weight-pct-' + c.id);
          if (valEl) valEl.textContent = currentWeights[c.id];
          if (pctEl) {
            var pct = totalWeight > 0 ? ((currentWeights[c.id] / totalWeight) * 100).toFixed(1) : '0.0';
            pctEl.textContent = pct + '%';
          }
        });

        // Score options
        var scored = matrixData.options.map(function(opt) {
          var sum = 0;
          matrixData.criteria.forEach(function(c) {
            var w = currentWeights[c.id] || 0;
            var s = (opt.scores && typeof opt.scores[c.id] === 'number') ? opt.scores[c.id] : 0;
            sum += s * w;
          });
          var score = totalWeight > 0 ? parseFloat((sum / totalWeight).toFixed(1)) : 0;
          return { id: opt.id, name: opt.name, score: score };
        });

        // Sort: descending by score, deterministic tie-breaking by name
        scored.sort(function(a, b) {
          if (b.score !== a.score) return b.score - a.score;
          return a.name.localeCompare(b.name);
        });

        // Standard competition ranking (1224)
        var ranks = {};
        scored.forEach(function(item, idx) {
          if (idx > 0 && item.score === scored[idx - 1].score) {
            ranks[item.id] = ranks[scored[idx - 1].id];
          } else {
            ranks[item.id] = idx + 1;
          }
        });

        // Update DOM elements
        scored.forEach(function(item) {
          var rank = ranks[item.id];
          var card = document.getElementById('option-card-' + item.id);
          var rankEl = document.getElementById('rank-badge-' + item.id);
          var topEl = document.getElementById('top-badge-' + item.id);
          var scoreEl = document.getElementById('score-val-' + item.id);
          var barEl = document.getElementById('score-bar-' + item.id);

          if (scoreEl) scoreEl.textContent = item.score.toFixed(1);
          if (rankEl) rankEl.textContent = '#' + rank;
          if (barEl) {
            var pct = Math.min(100, Math.max(0, (item.score / 10) * 100));
            barEl.style.width = pct + '%';
          }
          if (topEl) {
            topEl.style.display = rank === 1 ? 'inline-flex' : 'none';
          }
          if (card) {
            if (rank === 1) {
              card.classList.add('top-ranked-card');
            } else {
              card.classList.remove('top-ranked-card');
            }
          }
        });

        // Reorder cards in container
        var container = document.getElementById('matrix-options-container');
        if (container) {
          scored.forEach(function(item) {
            var card = document.getElementById('option-card-' + item.id);
            if (card) container.appendChild(card);
          });
        }
      }

      matrixData.criteria.forEach(function(c) {
        var slider = document.getElementById('slider-' + c.id);
        if (slider) {
          slider.addEventListener('input', recalculate);
        }
      });

      var resetBtn = document.getElementById('reset-matrix-weights');
      if (resetBtn) {
        resetBtn.addEventListener('click', function() {
          matrixData.criteria.forEach(function(c) {
            var slider = document.getElementById('slider-' + c.id);
            if (slider) slider.value = defaultWeights[c.id];
          });
          recalculate();
        });
      }
    })();

    // Code Copy Button
    (function initCodeCopy() {
      document.addEventListener('click', function(e) {
        var btn = e.target.closest('.copy-code-btn');
        if (!btn) return;
        var targetId = btn.getAttribute('data-code-id');
        var codeEl = targetId ? document.getElementById(targetId) : null;
        if (!codeEl) return;
        var text = codeEl.textContent || '';
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function() {
            var orig = btn.textContent;
            btn.textContent = 'Copied!';
            btn.classList.add('copied');
            setTimeout(function() {
              btn.textContent = orig;
              btn.classList.remove('copied');
            }, 2000);
          });
        }
      });
    })();
  `;
}

/**
 * Generates a complete, self-contained single-file HTML Research Dossier.
 *
 * Guarantees:
 * - DOCTYPE html, clean typography, responsive design, dark slate theme with light fallback.
 * - Zero external CDN links or font scripts: 100% offline self-contained.
 * - Interactive citations [1], [2] with tooltip popovers.
 * - Live decision matrix criteria weight recalculations.
 * - Full academic bibliography of verified sources.
 */
export function generateStandaloneHtmlDossier(
  artifact?: Artifact | null,
  session?: Session | null,
): string {
  const title = resolveDossierTitle(artifact, session);
  const model = resolveDossierModel(artifact, session);
  const sources = extractDossierSources(artifact, session);
  const confidence = resolveOverallConfidence(artifact);
  const formattedDate = formatDossierDate(
    session?.updatedAt || session?.createdAt,
  );

  const escapedTitle = escapeHtml(title);
  const escapedModel = escapeHtml(model);
  const escapedDate = escapeHtml(formattedDate);

  let contentHtml = "";

  if (artifact) {
    switch (artifact.type) {
      case "research":
        contentHtml = renderResearchSection(artifact.data, sources);
        break;
      case "matrix":
        contentHtml = renderDecisionMatrixSection(artifact.data);
        break;
      case "chart":
        contentHtml = renderChartSection(artifact.data);
        break;
      case "plan":
        contentHtml = renderPlanSection(artifact.data);
        break;
      case "code":
        contentHtml = renderCodeSection(artifact.data);
        break;
      case "debate":
        contentHtml = renderDebateSection(artifact.data);
        break;
      case "prompt_optimizer":
        contentHtml = renderPromptOptimizationSection(artifact.data);
        break;
      case "vector_space":
        contentHtml = renderVectorSpaceSection(artifact.data);
        break;
      case "causal_dag":
        contentHtml = renderCausalDagSection(artifact.data);
        break;
      case "bayesian_opt":
        contentHtml = renderBayesianOptSection(artifact.data);
        break;
      case "workflow_orchestrator":
        contentHtml = renderWorkflowOrchestratorSection(artifact.data);
        break;
      case "formal_prover":
        contentHtml = renderFormalProverSection(artifact.data);
        break;
      case "epistemic_consensus":
        contentHtml = renderEpistemicConsensusSection(artifact.data);
        break;
    }
  } else if (session) {
    contentHtml = renderSessionFallbackSection(session);
  } else {
    contentHtml = `<section class="dossier-section"><div class="summary-card"><p class="summary-text">No active artifact content available.</p></div></section>`;
  }

  const bibliographyHtml = renderBibliographySection(sources);
  const embeddedCss = getEmbeddedCss();
  const embeddedJs = getEmbeddedVanillaJs();

  // Safely embed sources payload for citation tooltips
  const sourcesPayload = sources.map((s, idx) => ({
    index: idx + 1,
    title: s.title || "",
    domain: s.domain || "Web Source",
    url: s.url || "",
    snippet: s.snippet || "",
    relevanceScore: s.relevanceScore,
    publishedDate: s.publishedDate,
  }));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="Nova AI Research Intelligence Studio">
  <title>${escapedTitle} — Nova Research Dossier</title>
  <style>
${embeddedCss}
  </style>
</head>
<body>
  <div class="dossier-wrapper">
    <!-- Header Bar -->
    <header class="dossier-header">
      <div class="brand-banner">NOVA RESEARCH INTELLIGENCE // EXECUTIVE DOSSIER</div>
      <h1 class="dossier-title">${escapedTitle}</h1>
      <div class="meta-chips">
        <span class="badge badge-${confidence.level}">${confidence.label}</span>
        <span class="badge badge-meta">Model: ${escapedModel}</span>
        <span class="badge badge-meta">Synthesized: ${escapedDate}</span>
        ${sources.length > 0 ? `<span class="badge badge-meta">${sources.length} Verified Sources</span>` : ""}
        <span class="badge badge-meta">100% Offline Standalone</span>
      </div>
    </header>

    <!-- Main Dossier Content -->
    <main class="dossier-content">
      ${contentHtml}
      ${bibliographyHtml}
    </main>

    <!-- Footer -->
    <footer class="dossier-footer">
      <div>Autonomous Research Intelligence Dossier • Generated by Nova</div>
      <div>Self-Contained Standalone Document • Zero Network Dependencies</div>
    </footer>
  </div>

  <!-- Sources Payload for Interactive Tooltips -->
  <script type="application/json" id="nova-sources-payload">${safeJsonForScript(sourcesPayload)}</script>

  <!-- Embedded Vanilla JS Runtime -->
  <script>
${embeddedJs}
  </script>
</body>
</html>`;
}

/**
 * Triggers browser download of `${sanitizeFileName(title)}-dossier.html`.
 * Safe in SSR and non-browser test environments without throwing.
 */
export function downloadStandaloneHtmlDossier(
  artifact?: Artifact | null,
  session?: Session | null,
): void {
  const html = generateStandaloneHtmlDossier(artifact, session);
  const title = resolveDossierTitle(artifact, session);
  const filename = `${sanitizeFileName(title)}-dossier.html`;

  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
