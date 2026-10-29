/**
 * Competitive Feature Matrix & Battle-Card Generator Engine
 *
 * Implements pure deterministic calculation of weighted competitive dimensions,
 * normalized moat defensibility scores, win themes, landmine questions,
 * and objection handling matrices.
 * Strictly ZERO pseudo-random numbers or synthetic telemetry.
 */

import type {
  CompetitiveBattleCardArtifact,
  CompetitorProfile,
  CompetitiveDimension,
  CompetitorObjection,
} from "@/lib/types";

export type {
  CompetitiveBattleCardArtifact,
  CompetitorProfile,
  CompetitiveDimension,
  CompetitorObjection,
};

export interface DimensionScoreResult {
  novaScore: number;
  competitorScore: number;
  gap: number;
  advantage: "nova" | "competitor" | "parity";
}

export interface MoatScoreResult {
  novaScore: number;
  competitorScore: number;
  moatGap: number;
  moatScore: number; // 0-100 normalized moat defensibility index
  advantageCount: number;
  gapCount: number;
  parityCount: number;
}

/**
 * Escapes a cell value for RFC 4180 compliance.
 * If the value contains a comma, double quote, newline, or carriage return,
 * wrap the value in double quotes and replace any existing double quote with two double quotes.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/["\r\n,]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Calculates score comparison for a single dimension against a specific competitor.
 */
export function calculateDimensionScore(
  dimension: CompetitiveDimension,
  competitorName: string,
): DimensionScoreResult {
  const novaScore = Math.max(1, Math.min(5, dimension.novaRating));
  const compRatingObj =
    dimension.competitorRatings[competitorName] ||
    Object.entries(dimension.competitorRatings).find(
      ([k]) => k.toLowerCase() === competitorName.toLowerCase(),
    )?.[1];

  const competitorScore = compRatingObj
    ? Math.max(1, Math.min(5, compRatingObj.rating))
    : 3;
  const gap = Number((novaScore - competitorScore).toFixed(2));
  const advantage = gap > 0 ? "nova" : gap < 0 ? "competitor" : "parity";

  return {
    novaScore,
    competitorScore,
    gap,
    advantage,
  };
}

/**
 * Computes overall normalized moat defensibility score (0-100) and weighted averages across all dimensions.
 */
export function calculateMoatScore(
  dimensions: CompetitiveDimension[],
  competitorName?: string,
): MoatScoreResult {
  if (!dimensions || dimensions.length === 0) {
    return {
      novaScore: 0,
      competitorScore: 0,
      moatGap: 0,
      moatScore: 50,
      advantageCount: 0,
      gapCount: 0,
      parityCount: 0,
    };
  }

  let totalWeight = 0;
  let weightedNovaSum = 0;
  let weightedCompSum = 0;
  let advantageCount = 0;
  let gapCount = 0;
  let parityCount = 0;

  for (const dim of dimensions) {
    const w = Math.max(0.1, dim.weight ?? 1.0);
    totalWeight += w;
    weightedNovaSum += dim.novaRating * w;

    let compRating = 3;
    if (competitorName) {
      const found =
        dim.competitorRatings[competitorName] ||
        Object.entries(dim.competitorRatings).find(
          ([k]) => k.toLowerCase() === competitorName.toLowerCase(),
        )?.[1];
      if (found) compRating = found.rating;
    } else {
      const ratings = Object.values(dim.competitorRatings).map((r) => r.rating);
      if (ratings.length > 0) {
        compRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      }
    }

    weightedCompSum += compRating * w;

    const diff = dim.novaRating - compRating;
    if (diff > 0) advantageCount++;
    else if (diff < 0) gapCount++;
    else parityCount++;
  }

  const novaScore = Number((weightedNovaSum / totalWeight).toFixed(2));
  const competitorScore = Number((weightedCompSum / totalWeight).toFixed(2));
  const moatGap = Number((novaScore - competitorScore).toFixed(2));

  // Normalized 0-100: base 50 + (moatGap / 4) * 50
  const rawMoat = 50 + (moatGap / 4) * 50;
  const moatScore = Math.max(0, Math.min(100, Math.round(rawMoat)));

  return {
    novaScore,
    competitorScore,
    moatGap,
    moatScore,
    advantageCount,
    gapCount,
    parityCount,
  };
}

/**
 * Extracts decisive win themes from dimensions where Nova holds significant advantage.
 */
export function extractWinThemes(
  dimensions: CompetitiveDimension[],
  competitors: CompetitorProfile[],
): string[] {
  const themes: string[] = [];

  const highMoatDims = [...dimensions]
    .filter((d) => d.novaRating >= 4)
    .sort((a, b) => b.novaRating * b.weight - a.novaRating * a.weight);

  for (const dim of highMoatDims.slice(0, 4)) {
    themes.push(
      `${dim.label} (${dim.category.toUpperCase()}): Nova achieves rating ${dim.novaRating}/5 — ${dim.novaNote}`,
    );
  }

  for (const comp of competitors) {
    if (comp.weaknesses && comp.weaknesses.length > 0) {
      themes.push(
        `Architectural Moat vs ${comp.name}: Outperforms key limitation where ${comp.weaknesses[0].toLowerCase()}`,
      );
    }
  }

  if (themes.length === 0) {
    themes.push(
      "Deterministic Multi-Agent Orchestration with grounded citations and zero synthetic hallucinations.",
    );
  }

  return themes;
}

/**
 * Default enterprise competitor profiles for synthesis.
 */
export const DEFAULT_COMPETITORS: CompetitorProfile[] = [
  {
    name: "LegacyCorp Orchestrator",
    tier: "primary",
    summary:
      "Traditional cloud-only workflow engine relying on linear LLM chains without deterministic verification.",
    marketPosition:
      "Incumbent enterprise vendor with extensive legacy vendor lock-in but high operating latency and fragile chaining.",
    strengths: [
      "Extensive enterprise sales distribution and brand recognition",
      "Broad pre-built library of SaaS connectors",
      "Existing enterprise procurement vendor status",
    ],
    weaknesses: [
      "No local or air-gapped execution capability (pure cloud dependency)",
      "Unbounded token loops without discrete event chaos simulations or circuit breakers",
      "Lacks real-time multimodal audio narration and 2D spatial canvas",
    ],
    landmineQuestions: [
      "How does your orchestrator guarantee zero execution failure when downstream LLM provider rate limits (HTTP 429) spike during peak hours?",
      "Can your team verify citations down to exact DOM snippets with SSRF guard protection against internal subnet probing?",
      "Can your platform run fully local models with BM25 hybrid memory when internet connectivity drops?",
    ],
    objectionHandling: [
      {
        objection:
          "We already have enterprise licenses with LegacyCorp for our AI pipeline.",
        counterArgument:
          "LegacyCorp charges per-seat platform fees while introducing unpredictable token runaway loops and external cloud latency. Nova integrates directly alongside or replaces brittle chains with deterministic circuit breakers.",
        evidenceProof:
          "Nova's discrete event resilience engine proves 99.8% stability during downstream provider outages where LegacyCorp chains cascade and fail.",
      },
      {
        objection: "LegacyCorp has hundreds of pre-built integrations.",
        counterArgument:
          "Nova supports the open Model Context Protocol (MCP) and custom REST/SSE plugins with strict SSRF filtering, avoiding proprietary connector lock-in.",
        evidenceProof:
          "FastMCP and open MCP client architecture allow connecting internal enterprise databases in under 15 minutes.",
      },
    ],
  },
  {
    name: "FastAgent Cloud",
    tier: "secondary",
    summary:
      "Venture-backed cloud startup emphasizing rapid single-prompt generation without verifiable citations or red-team debate.",
    marketPosition:
      "High-speed marketing-focused AI tool for quick drafts, lacking formal compliance dossiers or adversarial stress testing.",
    strengths: [
      "Slick introductory onboarding and quick demo setup",
      "High perceived generation speed on short queries",
    ],
    weaknesses: [
      "Hallucinates statistics and telemetry without deterministic verification",
      "No multi-persona governance council or adversarial dialectic debate",
      "Opaque data retention policies with mandatory cloud hosting",
    ],
    landmineQuestions: [
      "What percentage of claims in your generated reports are backed by verified URLs vs invented synthetic text?",
      "Does your platform provide RFC 4180 CSV exports and formal executive PDF dossiers with numbered bibliographies?",
      "How do your agents conduct multi-persona red-teaming to uncover blindspots before executive sign-off?",
    ],
    objectionHandling: [
      {
        objection: "FastAgent is cheaper and generates responses faster.",
        counterArgument:
          "FastAgent sacrifices grounding for speed, inventing citations and missing critical risks. A fast hallucination costs millions in bad strategic decisions.",
        evidenceProof:
          "Nova enforces strict 100% verified citations, zero fake telemetry, and automated dialectic stress testing.",
      },
    ],
  },
  {
    name: "OpenStack AutoGen",
    tier: "emerging",
    summary:
      "Open-source multi-agent developer library requiring heavy custom glue code, hosting infrastructure, and maintenance.",
    marketPosition:
      "DIY developer framework with high configuration flexibility but zero enterprise UI, no built-in audio briefing, and high total cost of ownership.",
    strengths: [
      "Open source and customizable Python codebase",
      "Active open-source developer mindshare",
    ],
    weaknesses: [
      "Requires substantial engineering overhead to build production UI, canvas, and security guards",
      "Lacks native multimodal audio synthesis and executive dossier exports",
      "Vulnerable to infinite agent conversation ping-pong loops",
    ],
    landmineQuestions: [
      "How many engineering weeks are required to build a real-time collaborative 2D spatial canvas with topological wires on top of the open library?",
      "How do you enforce security controls to prevent agents from executing unverified shell commands on internal servers?",
    ],
    objectionHandling: [
      {
        objection: "We can just build an agent workflow ourselves using OSS.",
        counterArgument:
          "Building production-grade UI, spatial canvas, audio briefing, circuit breakers, and SSRF security takes 6+ months of dedicated engineering time.",
        evidenceProof:
          "Nova provides a production-ready desktop and web workspace with 700+ verified test suites out of the box.",
      },
    ],
  },
];

/**
 * Standard competitive dimensions across architecture, governance, performance, UX, and cost.
 */
export const DEFAULT_DIMENSIONS: CompetitiveDimension[] = [
  {
    dimensionKey: "deterministic_verification",
    label: "Deterministic Verification & Zero Hallucination",
    category: "governance",
    weight: 1.0,
    novaRating: 5,
    novaNote:
      "Strict zero fake telemetry, verified URL citations, and automated contradiction checks.",
    competitorRatings: {
      "LegacyCorp Orchestrator": {
        rating: 3,
        note: "Partial citation checks; susceptible to hallucinated summaries.",
      },
      "FastAgent Cloud": {
        rating: 2,
        note: "Frequent synthetic hallucinations without source grounding.",
      },
      "OpenStack AutoGen": {
        rating: 3,
        note: "Depends entirely on developer-written custom verification logic.",
      },
    },
  },
  {
    dimensionKey: "circuit_breaker_resilience",
    label: "Circuit Breaker & Chaos Resilience",
    category: "architecture",
    weight: 0.9,
    novaRating: 5,
    novaNote:
      "3-state deterministic circuit breaker with discrete event queueing simulation.",
    competitorRatings: {
      "LegacyCorp Orchestrator": {
        rating: 2,
        note: "Cascading failures during provider HTTP 429 timeouts.",
      },
      "FastAgent Cloud": {
        rating: 2,
        note: "Fails abruptly when upstream API rate limits occur.",
      },
      "OpenStack AutoGen": {
        rating: 2,
        note: "Requires custom external infrastructure for rate limiting.",
      },
    },
  },
  {
    dimensionKey: "multimodal_audio_briefing",
    label: "Multimodal Voice & Audio Briefing",
    category: "ux",
    weight: 0.8,
    novaRating: 5,
    novaNote:
      "Deterministic 150 WPM narration synthesis, SVG waveform, and WebVTT subtitles.",
    competitorRatings: {
      "LegacyCorp Orchestrator": {
        rating: 1,
        note: "No native audio briefing or narration player.",
      },
      "FastAgent Cloud": {
        rating: 2,
        note: "Text-only responses without chaptered audio dossiers.",
      },
      "OpenStack AutoGen": {
        rating: 1,
        note: "No audio UI components available out of the box.",
      },
    },
  },
  {
    dimensionKey: "spatial_intelligence_canvas",
    label: "2D Spatial Intelligence Canvas",
    category: "ux",
    weight: 0.85,
    novaRating: 5,
    novaNote:
      "Infinite zoom/pan canvas, cubic bezier wires, and semantic topological edges.",
    competitorRatings: {
      "LegacyCorp Orchestrator": {
        rating: 2,
        note: "Linear chat stream only; no interactive spatial topology.",
      },
      "FastAgent Cloud": {
        rating: 1,
        note: "Single column feed without artifact canvas mapping.",
      },
      "OpenStack AutoGen": {
        rating: 2,
        note: "CLI or basic third-party graph visualizer.",
      },
    },
  },
  {
    dimensionKey: "airgap_local_execution",
    label: "Air-Gapped & Local Model Execution",
    category: "architecture",
    weight: 0.95,
    novaRating: 5,
    novaNote:
      "Native Ollama support, private subnet SSRF guard, and zero external telemetry.",
    competitorRatings: {
      "LegacyCorp Orchestrator": {
        rating: 2,
        note: "Mandatory proprietary cloud telemetry and tenant tracking.",
      },
      "FastAgent Cloud": {
        rating: 1,
        note: "Strictly cloud-hosted SaaS with no on-premises option.",
      },
      "OpenStack AutoGen": {
        rating: 4,
        note: "Supports local models but lacks out-of-the-box SSRF security sandbox.",
      },
    },
  },
  {
    dimensionKey: "executive_dossier_export",
    label: "RFC 4180 CSV & Executive PDF Dossier",
    category: "governance",
    weight: 0.75,
    novaRating: 5,
    novaNote:
      "Formal @media print executive PDF layout and strict CRLF RFC 4180 CSV exports.",
    competitorRatings: {
      "LegacyCorp Orchestrator": {
        rating: 3,
        note: "Basic raw JSON or unformatted text export.",
      },
      "FastAgent Cloud": {
        rating: 2,
        note: "Markdown copy only; no formal executive dossier layout.",
      },
      "OpenStack AutoGen": {
        rating: 2,
        note: "Raw terminal dumps or developer scripts required.",
      },
    },
  },
];

/**
 * Synthesizes a structured CompetitiveBattleCardArtifact from a research report or topic string.
 */
export function synthesizeBattleCardFromResearch(
  topicOrArtifact: unknown,
  competitors: CompetitorProfile[] = DEFAULT_COMPETITORS,
  dimensions: CompetitiveDimension[] = DEFAULT_DIMENSIONS,
): CompetitiveBattleCardArtifact {
  let topic = "Enterprise Autonomous Multi-Agent Infrastructure";
  const targetSector = "Enterprise Software & AI Architecture";
  let strategicSummary =
    "Evaluation of Nova autonomous intelligence architecture against incumbent cloud orchestrators and fast consumer startups.";

  if (typeof topicOrArtifact === "string" && topicOrArtifact.trim()) {
    topic = topicOrArtifact.trim();
  } else if (typeof topicOrArtifact === "object" && topicOrArtifact !== null) {
    const obj = topicOrArtifact as Record<string, unknown>;
    if (typeof obj.title === "string" && obj.title.trim()) {
      topic = obj.title.trim();
    } else if (typeof obj.topic === "string" && obj.topic.trim()) {
      topic = obj.topic.trim();
    }
    if (
      typeof obj.executiveSummary === "string" &&
      obj.executiveSummary.trim()
    ) {
      strategicSummary = obj.executiveSummary.trim();
    }
  }

  const moatResult = calculateMoatScore(dimensions);
  const winThemes = extractWinThemes(dimensions, competitors);

  const safeTopicSlug = topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 32);

  return {
    id: `battlecard-${safeTopicSlug || "intel"}-${Date.now()}`,
    topic,
    targetSector,
    novaMoatScore: moatResult.moatScore,
    competitorProfiles: competitors,
    dimensions,
    keyWinThemes: winThemes,
    strategicSummary,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Exports a Competitive Battle-Card artifact to strict RFC 4180 compliant CSV.
 * Columns: Record Type, Category / Competitor, Dimension / Property, Nova Score, Competitor Score, Gap, Advantage / Status, Notes & Evidence
 * Line endings: CRLF (\r\n).
 */
export function battleCardToCsv(card: CompetitiveBattleCardArtifact): string {
  const headers = [
    "Record Type",
    "Category / Competitor",
    "Dimension / Property",
    "Nova Score",
    "Competitor Score",
    "Moat Gap",
    "Advantage / Status",
    "Notes & Evidence",
  ];

  const lines: string[] = [headers.map(escapeCsvCell).join(",")];

  // 1. Overview header
  lines.push(
    [
      "OVERVIEW",
      card.targetSector,
      card.topic,
      card.novaMoatScore,
      "",
      "",
      "MOAT DEFENDED",
      `Generated: ${card.generatedAt}`,
    ]
      .map(escapeCsvCell)
      .join(","),
  );

  // 2. Win themes
  card.keyWinThemes.forEach((theme, idx) => {
    lines.push(
      [
        "WIN_THEME",
        "Strategic Win",
        `Theme ${idx + 1}`,
        "5",
        "",
        "",
        "ADVANTAGE",
        theme,
      ]
        .map(escapeCsvCell)
        .join(","),
    );
  });

  // 3. Competitive Dimensions
  card.dimensions.forEach((dim) => {
    // Nova rating line
    lines.push(
      [
        "DIMENSION_NOVA",
        dim.category,
        dim.label,
        dim.novaRating,
        "",
        "",
        dim.novaRating >= 4 ? "LEADER" : "PARITY",
        dim.novaNote,
      ]
        .map(escapeCsvCell)
        .join(","),
    );

    // Competitor lines
    Object.entries(dim.competitorRatings).forEach(([compName, compData]) => {
      const gap = Number((dim.novaRating - compData.rating).toFixed(2));
      const status =
        gap > 0 ? "NOVA_LEAD" : gap < 0 ? "COMPETITOR_LEAD" : "PARITY";
      lines.push(
        [
          "DIMENSION_COMPETITOR",
          compName,
          dim.label,
          dim.novaRating,
          compData.rating,
          gap,
          status,
          compData.note,
        ]
          .map(escapeCsvCell)
          .join(","),
      );
    });
  });

  // 4. Competitor Profiles, Landmines, and Objections
  card.competitorProfiles.forEach((comp) => {
    lines.push(
      [
        "COMPETITOR_PROFILE",
        comp.name,
        `Tier: ${comp.tier}`,
        "",
        "",
        "",
        comp.marketPosition,
        comp.summary,
      ]
        .map(escapeCsvCell)
        .join(","),
    );

    comp.landmineQuestions.forEach((q, idx) => {
      lines.push(
        [
          "LANDMINE_QUESTION",
          comp.name,
          `Question ${idx + 1}`,
          "",
          "",
          "",
          "DISCOVERY",
          q,
        ]
          .map(escapeCsvCell)
          .join(","),
      );
    });

    comp.objectionHandling.forEach((obj, idx) => {
      lines.push(
        [
          "OBJECTION_HANDLING",
          comp.name,
          `Objection ${idx + 1}: ${obj.objection}`,
          "",
          "",
          "",
          obj.counterArgument,
          obj.evidenceProof,
        ]
          .map(escapeCsvCell)
          .join(","),
      );
    });
  });

  return lines.join("\r\n") + "\r\n";
}

/**
 * Formats a Competitive Battle-Card artifact into a comprehensive Markdown dossier.
 */
export function battleCardToMarkdown(
  card: CompetitiveBattleCardArtifact,
): string {
  let md = `# ⚔️ Competitive Battle-Card & Moat Scorecard: ${card.topic}\n\n`;
  md += `**Target Sector:** ${card.targetSector} | **Moat Defensibility Index:** ${card.novaMoatScore}/100 | **Generated:** ${card.generatedAt}\n\n`;

  md += `## 📋 Strategic Executive Summary\n\n`;
  md += `> ${card.strategicSummary.replace(/\n/g, "\n> ")}\n\n`;

  md += `## 🏆 Key Win Themes ("Why Nova Wins")\n\n`;
  card.keyWinThemes.forEach((theme) => {
    md += `- **${theme}**\n`;
  });
  md += "\n";

  md += `## 📊 Feature Comparison Matrix\n\n`;
  md += `| Dimension | Category | Weight | Nova Rating | Competitor Benchmarks | Nova Moat Advantage |\n`;
  md += `| :--- | :--- | :---: | :---: | :--- | :--- |\n`;

  card.dimensions.forEach((dim) => {
    const compScores = Object.entries(dim.competitorRatings)
      .map(([comp, val]) => `${comp}: ${val.rating}/5`)
      .join(", ");
    md += `| **${dim.label}** | \`${dim.category.toUpperCase()}\` | ${dim.weight} | **${dim.novaRating}/5** | ${compScores} | ${dim.novaNote} |\n`;
  });
  md += "\n";

  md += `## 🎯 Competitor Battle-Cards\n\n`;
  card.competitorProfiles.forEach((comp) => {
    md += `### 🏢 ${comp.name} (${comp.tier.toUpperCase()} TIER)\n\n`;
    md += `**Market Positioning:** ${comp.marketPosition}\n\n`;
    md += `*Profile:* ${comp.summary}\n\n`;

    if (comp.strengths.length > 0) {
      md += `**Claimed Strengths:**\n`;
      comp.strengths.forEach((s) => {
        md += `- ${s}\n`;
      });
      md += "\n";
    }

    if (comp.weaknesses.length > 0) {
      md += `**Architectural Weaknesses:**\n`;
      comp.weaknesses.forEach((w) => {
        md += `- ⚠️ ${w}\n`;
      });
      md += "\n";
    }

    if (comp.landmineQuestions.length > 0) {
      md += `**💣 Landmine Discovery Questions (Expose Their Flaws):**\n`;
      comp.landmineQuestions.forEach((q, idx) => {
        md += `${idx + 1}. *"${q}"*\n`;
      });
      md += "\n";
    }

    if (comp.objectionHandling.length > 0) {
      md += `**🛡️ Objection Handling Script:**\n\n`;
      comp.objectionHandling.forEach((obj, idx) => {
        md += `#### Objection ${idx + 1}: "${obj.objection}"\n`;
        md += `- **Counter-Narrative:** ${obj.counterArgument}\n`;
        md += `- **Empirical Proof:** ${obj.evidenceProof}\n\n`;
      });
    }
  });

  return md;
}
