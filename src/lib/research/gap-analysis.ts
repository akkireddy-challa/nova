/**
 * Automated Competitive Matrix and Feature Gap Analysis Engine.
 *
 * Provides pure, deterministic calculations for:
 * - Criteria statistics: mean score, leader option, laggard option, score spread
 * - Differentiating Moats: criteria where an option leads the second-place contender by >= 15% or score >= 9
 * - Critical Vulnerabilities: criteria where an option falls >= 20% below average or score <= 4
 * - Strategic Tradeoff Insights & Prioritized Recommendations
 * - Export utilities (RFC 4180 CSV & formatted Markdown summary)
 *
 * Strictly deterministic calculations, zero synthetic telemetry, zero hallucinated data.
 */

import { tableToCsv } from "@/lib/matrix-calculator";

export interface CriterionStat {
  criterionId: string;
  criterionName: string;
  weight: number;
  mean: number;
  leader: { name: string; score: number };
  laggard: { name: string; score: number };
  spread: number;
  scores: Record<string, number>;
}

export interface MoatItem {
  optionName: string;
  criterionId: string;
  criterionName: string;
  score: number;
  leadMargin: number;
  leadPercent: number;
  secondPlaceContender?: { name: string; score: number };
  reason: string;
  significance: "dominant" | "strong";
}

export interface VulnerabilityItem {
  optionName: string;
  criterionId: string;
  criterionName: string;
  score: number;
  meanScore: number;
  deficitPercent: number;
  severity: "critical" | "warning";
  reason: string;
}

export interface StrategicRecommendation {
  id: string;
  targetOption: string;
  benchmarkOption: string;
  criterionName: string;
  criterionId: string;
  weight: number;
  priority: "High Priority" | "Medium Priority" | "Low Priority";
  action: string;
  impactScore: number;
  description: string;
}

export interface StrategicTradeoff {
  title: string;
  description: string;
  criterionName?: string;
  type: "battleground" | "compromise" | "dominance" | "parity";
}

export interface GapAnalysisReport {
  topic: string;
  criteriaStats: CriterionStat[];
  moats: MoatItem[];
  vulnerabilities: VulnerabilityItem[];
  recommendations: StrategicRecommendation[];
  tradeoffs: StrategicTradeoff[];
  overallLeader: { name: string; totalWeightedScore: number };
  summary: {
    totalOptions: number;
    totalCriteria: number;
    moatsCount: number;
    vulnerabilitiesCount: number;
    highestSpreadCriterion: { name: string; spread: number };
    mostContestedCriterion: { name: string; spread: number };
  };
}

export interface MatrixInput {
  topic?: string;
  verdict?: string;
  criteria: Array<{
    name: string;
    weight: number;
    id?: string;
  }>;
  options: Array<{
    name: string;
    scores: Record<string, number>;
    id?: string;
    pros?: string[];
    cons?: string[];
    totalWeightedScore?: number;
  }>;
}

/**
 * Extracts the score for a specific option and criterion, handling ID or name keys.
 */
export function getCriterionScore(
  scores: Record<string, number> | undefined,
  criterion: { id?: string; name: string },
): number {
  if (!scores) return 0;
  if (criterion.id && typeof scores[criterion.id] === "number") {
    return scores[criterion.id];
  }
  if (typeof scores[criterion.name] === "number") {
    return scores[criterion.name];
  }
  const lowerName = criterion.name.toLowerCase();
  for (const [key, val] of Object.entries(scores)) {
    if (key.toLowerCase() === lowerName && typeof val === "number") {
      return val;
    }
  }
  return 0;
}

/**
 * Pure deterministic generation of Competitive Matrix Feature Gap Analysis.
 */
export function generateGapAnalysis(matrix: MatrixInput): GapAnalysisReport {
  const topic = matrix.topic?.trim() || "Decision Matrix Gap Analysis";
  const criteria = Array.isArray(matrix.criteria) ? matrix.criteria : [];
  const options = Array.isArray(matrix.options) ? matrix.options : [];

  if (criteria.length === 0 || options.length === 0) {
    return {
      topic,
      criteriaStats: [],
      moats: [],
      vulnerabilities: [],
      recommendations: [],
      tradeoffs: [],
      overallLeader: { name: options[0]?.name || "N/A", totalWeightedScore: 0 },
      summary: {
        totalOptions: options.length,
        totalCriteria: criteria.length,
        moatsCount: 0,
        vulnerabilitiesCount: 0,
        highestSpreadCriterion: { name: "N/A", spread: 0 },
        mostContestedCriterion: { name: "N/A", spread: 0 },
      },
    };
  }

  // Calculate weighted total score for each option to determine overall leader
  const totalWeight = criteria.reduce(
    (acc, c) => acc + Math.max(0, c.weight || 0),
    0,
  );
  const optionsWithTotals = options.map((opt) => {
    let weightedSum = 0;
    for (const c of criteria) {
      const score = getCriterionScore(opt.scores, c);
      const w = Math.max(0, c.weight || 0);
      weightedSum += score * w;
    }
    const totalWeightedScore =
      totalWeight > 0 ? Number((weightedSum / totalWeight).toFixed(1)) : 0;
    return {
      name: opt.name,
      totalWeightedScore,
    };
  });

  const sortedOverall = [...optionsWithTotals].sort(
    (a, b) => b.totalWeightedScore - a.totalWeightedScore,
  );
  const overallLeader = sortedOverall[0] || {
    name: options[0].name,
    totalWeightedScore: 0,
  };

  // 1. Calculate Criteria Statistics
  const criteriaStats: CriterionStat[] = [];
  const moats: MoatItem[] = [];
  const vulnerabilities: VulnerabilityItem[] = [];

  for (let cIdx = 0; cIdx < criteria.length; cIdx++) {
    const c = criteria[cIdx];
    const criterionId = c.id || `c-${cIdx + 1}`;
    const criterionName = c.name;
    const weight = Math.max(0, c.weight || 0);

    const optionScores: Array<{ name: string; score: number }> = options.map(
      (opt) => ({
        name: opt.name,
        score: getCriterionScore(opt.scores, c),
      }),
    );

    // Score map
    const scoresMap: Record<string, number> = {};
    let sum = 0;
    for (const item of optionScores) {
      scoresMap[item.name] = item.score;
      sum += item.score;
    }

    const mean = Number((sum / optionScores.length).toFixed(2));

    // Sort descending by score, tie-break by name
    const sortedScores = [...optionScores].sort(
      (a, b) => b.score - a.score || a.name.localeCompare(b.name),
    );

    const leader = sortedScores[0];
    const laggard = sortedScores[sortedScores.length - 1];
    const spread = Number((leader.score - laggard.score).toFixed(2));

    criteriaStats.push({
      criterionId,
      criterionName,
      weight,
      mean,
      leader: { name: leader.name, score: leader.score },
      laggard: { name: laggard.name, score: laggard.score },
      spread,
      scores: scoresMap,
    });

    // 2. Detect "Differentiating Moats"
    // Criteria where an option leads the second-place contender by >= 15% or score >= 9
    for (let i = 0; i < sortedScores.length; i++) {
      const item = sortedScores[i];
      const otherContenders = sortedScores.filter(
        (cand) => cand.name !== item.name,
      );
      const runnerUp = otherContenders[0];

      const scoreQualifies = item.score >= 9.0;

      let leadMargin = 0;
      let leadPercent = 0;
      let leadsContender = false;

      if (runnerUp) {
        leadMargin = Number((item.score - runnerUp.score).toFixed(2));
        if (leadMargin > 0) {
          const relativeLead =
            runnerUp.score > 0
              ? (leadMargin / runnerUp.score) * 100
              : item.score > 0
                ? 100
                : 0;
          const scaleLead = (leadMargin / 10) * 100;
          leadPercent = Number(relativeLead.toFixed(1));
          leadsContender = relativeLead >= 15.0 || scaleLead >= 15.0;
        }
      }

      if (scoreQualifies || leadsContender) {
        let reason = "";
        let significance: "dominant" | "strong" = "strong";

        if (scoreQualifies && leadsContender && runnerUp) {
          significance = "dominant";
          reason = `${item.name} establishes a dominant moat with score ${item.score}/10, exceeding second-place ${runnerUp.name} (${runnerUp.score}/10) by ${leadMargin.toFixed(1)} pts (+${leadPercent}% lead).`;
        } else if (scoreQualifies) {
          significance = item.score >= 9.5 ? "dominant" : "strong";
          reason = `${item.name} achieves exceptional domain mastery with score ${item.score}/10 (excellence threshold >= 9.0).`;
        } else if (runnerUp) {
          significance = leadMargin >= 2.0 ? "dominant" : "strong";
          reason = `${item.name} leads second-place contender ${runnerUp.name} by ${leadMargin.toFixed(1)} pts (${leadPercent}% relative advantage).`;
        }

        moats.push({
          optionName: item.name,
          criterionId,
          criterionName,
          score: item.score,
          leadMargin,
          leadPercent,
          secondPlaceContender: runnerUp
            ? { name: runnerUp.name, score: runnerUp.score }
            : undefined,
          reason,
          significance,
        });
      }
    }

    // 3. Detect "Critical Vulnerabilities"
    // Criteria where an option falls >= 20% below average or score <= 4
    for (const item of optionScores) {
      const scoreBelowThreshold = item.score <= 4.0;
      const deficit = mean - item.score;
      const relDeficit =
        mean > 0 ? (deficit / mean) * 100 : item.score < 0 ? 100 : 0;
      const scaleDeficit = (deficit / 10) * 100;

      const fallsBelowAverage =
        deficit > 0 && (relDeficit >= 20.0 || scaleDeficit >= 20.0);

      if (scoreBelowThreshold || fallsBelowAverage) {
        const deficitPercent = Number(
          Math.max(
            0,
            relDeficit > 0 ? relDeficit : (4.0 - item.score) * 25,
          ).toFixed(1),
        );
        const severity: "critical" | "warning" =
          item.score <= 3.0 || relDeficit >= 35.0 ? "critical" : "warning";

        let reason = "";
        if (scoreBelowThreshold && fallsBelowAverage) {
          reason = `Score ${item.score}/10 falls ${deficitPercent}% below the average (${mean}/10) and breaches the critical risk threshold (<= 4.0).`;
        } else if (scoreBelowThreshold) {
          reason = `Score ${item.score}/10 breaches the critical floor threshold (<= 4.0).`;
        } else {
          reason = `Score ${item.score}/10 lags category average (${mean}/10) by ${deficitPercent}%.`;
        }

        vulnerabilities.push({
          optionName: item.name,
          criterionId,
          criterionName,
          score: item.score,
          meanScore: mean,
          deficitPercent,
          severity,
          reason,
        });
      }
    }
  }

  // 4. Strategic Recommendations
  // Generates prioritized recommendations ("Option A should address latency vulnerability to match Option B")
  const recommendations: StrategicRecommendation[] = [];

  for (const vuln of vulnerabilities) {
    const stat = criteriaStats.find((s) => s.criterionId === vuln.criterionId);
    if (!stat) continue;

    const benchmarkOption = stat.leader;
    if (benchmarkOption.name === vuln.optionName) continue;

    const gap = Number(
      Math.max(0, benchmarkOption.score - vuln.score).toFixed(1),
    );
    const impactScore = Number((gap * stat.weight).toFixed(1));

    // Priority classification
    let priority: "High Priority" | "Medium Priority" | "Low Priority";
    if (stat.weight >= 7 || vuln.score <= 3.0 || gap >= 4.0) {
      priority = "High Priority";
    } else if (stat.weight >= 4 || vuln.score <= 4.0 || gap >= 2.0) {
      priority = "Medium Priority";
    } else {
      priority = "Low Priority";
    }

    const action = `${vuln.optionName} should address ${stat.criterionName} vulnerability to match ${benchmarkOption.name}`;
    const description = `Currently scoring ${vuln.score}/10 vs ${benchmarkOption.name}'s leading score of ${benchmarkOption.score}/10 in ${stat.criterionName} (weight: ${stat.weight}x). Closing this ${gap}-pt gap will eliminate an acute competitive vulnerability.`;

    recommendations.push({
      id: `rec-${vuln.optionName.replace(/\s+/g, "-")}-${vuln.criterionId}`,
      targetOption: vuln.optionName,
      benchmarkOption: benchmarkOption.name,
      criterionName: stat.criterionName,
      criterionId: stat.criterionId,
      weight: stat.weight,
      priority,
      action,
      impactScore,
      description,
    });
  }

  // Sort recommendations: High Priority first, then Medium, then Low, descending impact score
  const priorityRank: Record<string, number> = {
    "High Priority": 3,
    "Medium Priority": 2,
    "Low Priority": 1,
  };

  recommendations.sort((a, b) => {
    const rankDiff = priorityRank[b.priority] - priorityRank[a.priority];
    if (rankDiff !== 0) return rankDiff;
    return b.impactScore - a.impactScore;
  });

  // 5. Strategic Tradeoff Insights
  const tradeoffs: StrategicTradeoff[] = [];

  // Tradeoff 1: Battleground Criterion (highest spread weighted)
  const spreadSorted = [...criteriaStats].sort((a, b) => b.spread - a.spread);
  const highestSpreadCrit = spreadSorted[0];
  const mostContestedCrit = [...criteriaStats].sort(
    (a, b) => a.spread - b.spread,
  )[0];

  if (highestSpreadCrit && highestSpreadCrit.spread > 0) {
    tradeoffs.push({
      title: `Primary Battleground: ${highestSpreadCrit.criterionName}`,
      description: `${highestSpreadCrit.criterionName} (weight ${highestSpreadCrit.weight}x) exhibits the widest divergence (${highestSpreadCrit.spread} pts spread), separating top performer ${highestSpreadCrit.leader.name} (${highestSpreadCrit.leader.score}/10) from ${highestSpreadCrit.laggard.name} (${highestSpreadCrit.laggard.score}/10).`,
      criterionName: highestSpreadCrit.criterionName,
      type: "battleground",
    });
  }

  // Tradeoff 2: Competitive Moat Advantage
  if (moats.length > 0) {
    const topMoat = [...moats].sort((a, b) => b.score - a.score)[0];
    tradeoffs.push({
      title: `Durable Moat: ${topMoat.optionName} in ${topMoat.criterionName}`,
      description: topMoat.reason,
      criterionName: topMoat.criterionName,
      type: "dominance",
    });
  }

  // Tradeoff 3: Pairwise Contender Asymmetry (between top 2 options)
  if (options.length >= 2) {
    const optA = options[0];
    const optB = options[1];

    const aLeadsIn: string[] = [];
    const bLeadsIn: string[] = [];

    for (const stat of criteriaStats) {
      const scoreA = stat.scores[optA.name] || 0;
      const scoreB = stat.scores[optB.name] || 0;
      if (scoreA - scoreB >= 1.0) {
        aLeadsIn.push(
          `${stat.criterionName} (+${(scoreA - scoreB).toFixed(1)})`,
        );
      } else if (scoreB - scoreA >= 1.0) {
        bLeadsIn.push(
          `${stat.criterionName} (+${(scoreB - scoreA).toFixed(1)})`,
        );
      }
    }

    if (aLeadsIn.length > 0 && bLeadsIn.length > 0) {
      tradeoffs.push({
        title: `Strategic Tradeoff: ${optA.name} vs ${optB.name}`,
        description: `${optA.name} holds clear superiority in ${aLeadsIn.slice(0, 2).join(", ")}, while ${optB.name} offsets this by outperforming in ${bLeadsIn.slice(0, 2).join(", ")}.`,
        type: "compromise",
      });
    }
  }

  // Tradeoff 4: Category Parity / Commodity Features
  if (
    mostContestedCrit &&
    mostContestedCrit.spread <= 1.0 &&
    criteriaStats.length > 1
  ) {
    tradeoffs.push({
      title: `Category Parity: ${mostContestedCrit.criterionName}`,
      description: `${mostContestedCrit.criterionName} exhibits minimal score variance (${mostContestedCrit.spread} pts), functioning as baseline commodity criteria where contenders meet comparable standards.`,
      criterionName: mostContestedCrit.criterionName,
      type: "parity",
    });
  }

  return {
    topic,
    criteriaStats,
    moats,
    vulnerabilities,
    recommendations,
    tradeoffs,
    overallLeader,
    summary: {
      totalOptions: options.length,
      totalCriteria: criteria.length,
      moatsCount: moats.length,
      vulnerabilitiesCount: vulnerabilities.length,
      highestSpreadCriterion: highestSpreadCrit
        ? {
            name: highestSpreadCrit.criterionName,
            spread: highestSpreadCrit.spread,
          }
        : { name: "N/A", spread: 0 },
      mostContestedCriterion: mostContestedCrit
        ? {
            name: mostContestedCrit.criterionName,
            spread: mostContestedCrit.spread,
          }
        : { name: "N/A", spread: 0 },
    },
  };
}

/**
 * Converts a GapAnalysisReport into an RFC 4180 CSV string.
 */
export function gapAnalysisToCsv(report: GapAnalysisReport): string {
  const headers = [
    "Section",
    "Criterion",
    "Option",
    "Score",
    "Benchmark/Average",
    "Spread/Margin",
    "Classification",
    "Details",
  ];

  const rows: (string | number)[][] = [];

  // Criteria Stats
  for (const stat of report.criteriaStats) {
    rows.push([
      "Criteria Overview",
      stat.criterionName,
      stat.leader.name,
      stat.leader.score,
      stat.mean,
      stat.spread,
      "Category Leader",
      `Weight: ${stat.weight}x, Laggard: ${stat.laggard.name} (${stat.laggard.score})`,
    ]);
  }

  // Moats
  for (const moat of report.moats) {
    rows.push([
      "Differentiating Moat",
      moat.criterionName,
      moat.optionName,
      moat.score,
      moat.secondPlaceContender?.score ?? "N/A",
      moat.leadMargin > 0 ? `+${moat.leadMargin}` : "0",
      moat.significance.toUpperCase(),
      moat.reason,
    ]);
  }

  // Vulnerabilities
  for (const vuln of report.vulnerabilities) {
    rows.push([
      "Critical Vulnerability",
      vuln.criterionName,
      vuln.optionName,
      vuln.score,
      vuln.meanScore,
      `-${vuln.deficitPercent}%`,
      vuln.severity.toUpperCase(),
      vuln.reason,
    ]);
  }

  // Strategic Action Items
  for (const rec of report.recommendations) {
    rows.push([
      "Action Roadmap",
      rec.criterionName,
      rec.targetOption,
      rec.impactScore,
      rec.benchmarkOption,
      rec.priority,
      rec.priority,
      rec.action,
    ]);
  }

  return tableToCsv(headers, rows);
}

/**
 * Generates an executive Markdown summary of the Gap Analysis Report.
 */
export function gapAnalysisToMarkdown(report: GapAnalysisReport): string {
  const lines: string[] = [];

  lines.push(`# Competitive Gap Analysis: ${report.topic}`);
  lines.push("");
  lines.push(
    `**Overall Leader:** ${report.overallLeader.name} (${report.overallLeader.totalWeightedScore}/10 weighted score)`,
  );
  lines.push(
    `**Scope:** ${report.summary.totalOptions} Contenders | ${report.summary.totalCriteria} Criteria | ${report.summary.moatsCount} Moats Detected | ${report.summary.vulnerabilitiesCount} Critical Vulnerabilities`,
  );
  lines.push("");

  // Criteria Benchmark Table
  lines.push("## Criteria Performance Matrix");
  lines.push("");
  lines.push(
    "| Criterion | Weight | Category Mean | Leader | Score | Spread |",
  );
  lines.push("| :--- | :--- | :--- | :--- | :--- | :--- |");
  for (const c of report.criteriaStats) {
    lines.push(
      `| ${c.criterionName} | ${c.weight}x | ${c.mean}/10 | ${c.leader.name} | ${c.leader.score}/10 | ${c.spread} pts |`,
    );
  }
  lines.push("");

  // Moats Section
  lines.push("## Differentiating Moats & Asymmetric Strengths");
  lines.push("");
  if (report.moats.length === 0) {
    lines.push(
      "- *No outsized moats detected (performance across contenders remains evenly matched).* ",
    );
  } else {
    for (const moat of report.moats) {
      lines.push(
        `- **${moat.optionName}** [${moat.criterionName} - ${moat.score}/10]: ${moat.reason}`,
      );
    }
  }
  lines.push("");

  // Vulnerabilities Section
  lines.push("## Critical Vulnerabilities & Risks");
  lines.push("");
  if (report.vulnerabilities.length === 0) {
    lines.push(
      "- *Zero critical vulnerabilities detected (all contenders score above minimum safety thresholds).* ",
    );
  } else {
    for (const vuln of report.vulnerabilities) {
      lines.push(
        `- **[${vuln.severity.toUpperCase()}] ${vuln.optionName}** [${vuln.criterionName} - ${vuln.score}/10]: ${vuln.reason}`,
      );
    }
  }
  lines.push("");

  // Strategic Tradeoffs
  if (report.tradeoffs.length > 0) {
    lines.push("## Strategic Tradeoffs & Market Dynamics");
    lines.push("");
    for (const t of report.tradeoffs) {
      lines.push(`### ${t.title}`);
      lines.push(t.description);
      lines.push("");
    }
  }

  // Action Items Roadmap
  lines.push("## Strategic Action Items Roadmap");
  lines.push("");
  if (report.recommendations.length === 0) {
    lines.push("- *No urgent competitive adjustments required.*");
  } else {
    for (const rec of report.recommendations) {
      lines.push(
        `- **[${rec.priority}]** ${rec.action} (Impact Score: ${rec.impactScore})  \n  *${rec.description}*`,
      );
    }
  }

  return lines.join("\n");
}
