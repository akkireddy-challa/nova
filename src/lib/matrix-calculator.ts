/**
 * Pure, deterministic matrix calculation, ranking, and artifact export utilities.
 *
 * Implements:
 * - Dynamic criteria weight normalization (percentages)
 * - Multi-variable score recalculation
 * - Standard competition ranking with ties handling (1224 ranking)
 * - RFC 4180 CSV generation for charts and decision matrices
 * - Code artifact file download resolution
 *
 * Zero Math.random, zero synthetic metric generation.
 */

export interface MatrixCriterionInput {
  name: string;
  weight: number;
  id?: string;
  [key: string]: unknown;
}

export interface NormalizedCriterion {
  name: string;
  weight: number;
  percentage: number;
}

export interface MatrixOptionInput {
  name: string;
  scores: Record<string, number>;
  id?: string;
  pros?: string[];
  cons?: string[];
  [key: string]: unknown;
}

export interface RecalculatedOption {
  name: string;
  totalScore: number;
  rank: number;
}

/**
 * Computes normalized percentage weights for each criterion.
 * Weights are clamped to non-negative numbers.
 * Percentages sum to 100% (or 0% if total weight is 0), rounded to 1 decimal place.
 */
export function calculateNormalizedWeights<
  T extends { name: string; weight: number },
>(criteria: T[]): Array<T & { percentage: number }> {
  if (!Array.isArray(criteria) || criteria.length === 0) {
    return [];
  }

  const totalWeight = criteria.reduce((sum, c) => {
    const w =
      typeof c.weight === "number" && !Number.isNaN(c.weight)
        ? Math.max(0, c.weight)
        : 0;
    return sum + w;
  }, 0);

  return criteria.map((c) => {
    const rawWeight =
      typeof c.weight === "number" && !Number.isNaN(c.weight)
        ? Math.max(0, c.weight)
        : 0;
    const percentage =
      totalWeight > 0
        ? Number(((rawWeight / totalWeight) * 100).toFixed(1))
        : 0;
    return {
      ...c,
      weight: c.weight,
      percentage,
    };
  });
}

/**
 * Recalculates option total scores based on dynamic criteria weights and assigns ranks.
 *
 * Features:
 * - Weighted average score calculation rounded to 1 decimal place.
 * - Standard competition ranking: tied options share the same rank (e.g. 1, 1, 3).
 * - Deterministic alphabetical tie-breaking for equal scores.
 * - Preserves all input option metadata.
 */
export function recalculateOptionScores<
  T extends { name: string; scores: Record<string, number> },
>(
  options: T[],
  criteriaWeights: Record<string, number>,
): Array<T & { totalScore: number; rank: number }> {
  if (!Array.isArray(options) || options.length === 0) {
    return [];
  }

  const weightEntries = Object.entries(criteriaWeights || {}).map(
    ([key, rawWeight]) => ({
      key,
      weight:
        typeof rawWeight === "number" && !Number.isNaN(rawWeight)
          ? Math.max(0, rawWeight)
          : 0,
    }),
  );

  const totalWeight = weightEntries.reduce(
    (sum, entry) => sum + entry.weight,
    0,
  );

  const scoredOptions = options.map((opt) => {
    let scoreSum = 0;
    const scores = opt.scores || {};

    if (totalWeight > 0) {
      for (const { key, weight } of weightEntries) {
        if (weight <= 0) continue;
        const scoreVal =
          typeof scores[key] === "number"
            ? scores[key]
            : typeof scores[opt.name] === "number"
              ? scores[opt.name]
              : 0;
        scoreSum += scoreVal * weight;
      }
    }

    const totalScore =
      totalWeight > 0 ? Number((scoreSum / totalWeight).toFixed(1)) : 0;

    return {
      ...opt,
      totalScore,
      rank: 1,
    };
  });

  // Sort descending by totalScore. If identical, sort alphabetically by name
  scoredOptions.sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    return (a.name || "").localeCompare(b.name || "");
  });

  // Standard competition ranking (1224 ranking: ties receive the same rank)
  for (let i = 0; i < scoredOptions.length; i++) {
    if (i === 0) {
      scoredOptions[i].rank = 1;
    } else if (
      scoredOptions[i].totalScore === scoredOptions[i - 1].totalScore
    ) {
      scoredOptions[i].rank = scoredOptions[i - 1].rank;
    } else {
      scoredOptions[i].rank = i + 1;
    }
  }

  return scoredOptions;
}

/**
 * Escapes a single cell value for RFC 4180 CSV compliance.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts a table of headers and rows into an RFC 4180 CSV string.
 */
export function tableToCsv(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
): string {
  const headerLine = headers.map(escapeCsvCell).join(",");
  const dataLines = rows.map((row) => row.map(escapeCsvCell).join(","));
  return [headerLine, ...dataLines].join("\r\n");
}

/**
 * Converts Chart data metrics to an RFC 4180 CSV string.
 */
export function chartDataToCsv(
  data: Array<{
    label: string;
    value: number;
    secondaryValue?: number;
    category?: string;
    deltaPercent?: string;
  }>,
): string {
  if (!Array.isArray(data) || data.length === 0) {
    return "Label,Value";
  }

  const hasSecondary = data.some((d) => d.secondaryValue !== undefined);
  const hasCategory = data.some((d) => d.category !== undefined);
  const hasDelta = data.some((d) => d.deltaPercent !== undefined);

  const headers = ["Label", "Value"];
  if (hasSecondary) headers.push("Secondary Value");
  if (hasCategory) headers.push("Category");
  if (hasDelta) headers.push("Delta Percent");

  const rows = data.map((d) => {
    const row: (string | number | undefined)[] = [d.label, d.value];
    if (hasSecondary) row.push(d.secondaryValue ?? "");
    if (hasCategory) row.push(d.category ?? "");
    if (hasDelta) row.push(d.deltaPercent ?? "");
    return row;
  });

  return tableToCsv(headers, rows);
}

/**
 * Converts a Decision Matrix and criteria weights to an RFC 4180 CSV string.
 */
export function matrixToCsv(
  matrix: {
    topic?: string;
    criteria: Array<{ id: string; name: string; weight: number }>;
    options: Array<{
      id?: string;
      name: string;
      scores: Record<string, number>;
      pros?: string[];
      cons?: string[];
    }>;
    verdict?: string;
  },
  weights?: Record<string, number>,
): string {
  if (
    !matrix ||
    !Array.isArray(matrix.options) ||
    !Array.isArray(matrix.criteria)
  ) {
    return "Rank,Option,Total Score";
  }

  const resolvedWeights: Record<string, number> = {};
  for (const c of matrix.criteria) {
    resolvedWeights[c.id] =
      weights && typeof weights[c.id] === "number" ? weights[c.id] : c.weight;
  }

  const scored = recalculateOptionScores(matrix.options, resolvedWeights);

  const headers = [
    "Rank",
    "Option",
    ...matrix.criteria.map((c) => `${c.name} (${resolvedWeights[c.id]}x)`),
    "Total Score",
    "Pros",
    "Cons",
  ];

  const rows = scored.map((opt) => {
    const criteriaScores = matrix.criteria.map((c) => {
      const s = opt.scores[c.id];
      return typeof s === "number" ? s : "";
    });
    const pros = (opt.pros || []).join("; ");
    const cons = (opt.cons || []).join("; ");
    return [opt.rank, opt.name, ...criteriaScores, opt.totalScore, pros, cons];
  });

  return tableToCsv(headers, rows);
}

/**
 * Maps common programming language names to their standard file extensions.
 */
export function getLanguageExtension(language?: string): string {
  if (!language) return "txt";
  const normalized = language.toLowerCase().trim();
  const map: Record<string, string> = {
    typescript: "ts",
    ts: "ts",
    javascript: "js",
    js: "js",
    tsx: "tsx",
    jsx: "jsx",
    python: "py",
    py: "py",
    html: "html",
    css: "css",
    json: "json",
    markdown: "md",
    md: "md",
    sql: "sql",
    rust: "rs",
    rs: "rs",
    go: "go",
    golang: "go",
    c: "c",
    cpp: "cpp",
    "c++": "cpp",
    csharp: "cs",
    "c#": "cs",
    java: "java",
    kotlin: "kt",
    swift: "swift",
    ruby: "rb",
    rb: "rb",
    php: "php",
    bash: "sh",
    shell: "sh",
    sh: "sh",
    yaml: "yaml",
    yml: "yml",
    xml: "xml",
    graphql: "graphql",
    dockerfile: "dockerfile",
  };
  return map[normalized] || "txt";
}

/**
 * Resolves a downloadable filename ensuring appropriate file extension.
 */
export function resolveCodeFilename(
  filenameOrTitle?: string,
  language?: string,
): string {
  const ext = getLanguageExtension(language);
  const base = (filenameOrTitle || "code").trim();
  if (base.includes(".")) {
    return base;
  }
  return `${base}.${ext}`;
}

/**
 * Downloads a code artifact in the browser.
 */
export function downloadArtifactCode(filename: string, code: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }
  const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
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
 * Downloads arbitrary CSV data as a file in the browser.
 */
export function downloadCsvData(filename: string, csvContent: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
