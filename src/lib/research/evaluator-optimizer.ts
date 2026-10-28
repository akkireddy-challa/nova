import type { SourceCitation } from "../types";
import { tokenize } from "../memory-search";

export type ClaimVerificationStatus =
  "verified" | "uncited" | "invalid_citation";

export interface FindingClaimInput {
  text?: string;
  point?: string;
  description?: string;
  confidence?: "high" | "medium" | "low" | string;
  citationIds?: string[];
  [key: string]: unknown;
}

export interface ClaimAuditDetail {
  claim: string;
  status: ClaimVerificationStatus;
  matchedSources: string[];
}

export interface EvidenceAuditReport {
  verifiedClaims: number;
  uncitedClaims: number;
  invalidCitations: number;
  sourceAlignment: number;
  details: ClaimAuditDetail[];
}

export interface CriticRefinementResult<T> {
  findings: T[];
  optimizedCount: number;
  audit: EvidenceAuditReport;
}

/**
 * Calculates factual keyword alignment and content overlap between a claim
 * and one or more source citations.
 * Returns percentage alignment (0-100) and matched keywords.
 */
export function calculateKeywordAlignment(
  claimText: string,
  sources: SourceCitation[],
): {
  alignment: number;
  matchedKeywords: string[];
  totalKeywords: number;
} {
  const claimTokens = [...new Set(tokenize(claimText))];
  if (claimTokens.length === 0) {
    return {
      alignment: sources.length > 0 ? 100 : 0,
      matchedKeywords: [],
      totalKeywords: 0,
    };
  }

  const sourceTokens = new Set<string>();
  for (const source of sources) {
    const combined = [
      source.title,
      source.snippet,
      source.description,
      source.siteName,
    ]
      .filter(Boolean)
      .join(" ");

    for (const token of tokenize(combined)) {
      sourceTokens.add(token);
    }
  }

  const matchedKeywords = claimTokens.filter((token) =>
    sourceTokens.has(token),
  );
  const alignment = Math.round(
    (matchedKeywords.length / claimTokens.length) * 100,
  );

  return {
    alignment,
    matchedKeywords,
    totalKeywords: claimTokens.length,
  };
}

/**
 * Audits research findings against retrieved sources:
 * 1. Checks if each finding cites valid source IDs that exist in `sources`.
 * 2. Checks content overlap / keyword alignment between finding text and source snippets.
 * 3. Returns factual alignment score (0-100%) and claim-level audit details.
 */
export function auditEvidenceAndCitations(
  findings: Array<{ text: string; citationIds?: string[] } | FindingClaimInput>,
  sources: SourceCitation[],
): EvidenceAuditReport {
  const sourceMap = new Map<string, SourceCitation>(
    sources.map((s) => [s.id, s]),
  );

  let verifiedClaims = 0;
  let uncitedClaims = 0;
  let invalidCitations = 0;
  const claimAlignments: number[] = [];
  const details: ClaimAuditDetail[] = [];

  for (const item of findings) {
    const itemClaim = item as FindingClaimInput;
    const claim = (
      item.text ||
      [itemClaim.point, itemClaim.description].filter(Boolean).join(". ") ||
      ""
    ).trim();

    const citationIds = item.citationIds ?? [];

    if (citationIds.length === 0) {
      uncitedClaims += 1;
      claimAlignments.push(0);
      details.push({
        claim,
        status: "uncited",
        matchedSources: [],
      });
      continue;
    }

    const validSources: SourceCitation[] = [];
    const matchedSourceIds: string[] = [];
    let hasInvalid = false;

    for (const id of citationIds) {
      const src = sourceMap.get(id);
      if (src) {
        validSources.push(src);
        if (!matchedSourceIds.includes(src.id)) {
          matchedSourceIds.push(src.id);
        }
      } else {
        hasInvalid = true;
        invalidCitations += 1;
      }
    }

    if (hasInvalid && validSources.length === 0) {
      // All cited IDs were invalid
      claimAlignments.push(0);
      details.push({
        claim,
        status: "invalid_citation",
        matchedSources: [],
      });
    } else if (hasInvalid && validSources.length > 0) {
      // Contained both valid and invalid citation IDs
      const { alignment } = calculateKeywordAlignment(claim, validSources);
      claimAlignments.push(alignment);
      details.push({
        claim,
        status: "invalid_citation",
        matchedSources: matchedSourceIds,
      });
    } else {
      // All cited IDs were valid
      const { alignment } = calculateKeywordAlignment(claim, validSources);
      claimAlignments.push(alignment);
      verifiedClaims += 1;
      details.push({
        claim,
        status: "verified",
        matchedSources: matchedSourceIds,
      });
    }
  }

  const sourceAlignment =
    claimAlignments.length > 0
      ? Math.round(
          claimAlignments.reduce((sum, score) => sum + score, 0) /
            claimAlignments.length,
        )
      : sources.length > 0
        ? 100
        : 0;

  return {
    verifiedClaims,
    uncitedClaims,
    invalidCitations,
    sourceAlignment,
    details,
  };
}

/**
 * Evaluator-Optimizer critic pass:
 * When in deep budget, performs one targeted optimization pass if critical findings
 * lack citations or contain inconsistencies, attaching real crawled sources.
 */
export function refineWithCritic<
  T extends {
    text?: string;
    point?: string;
    description?: string;
    confidence?: "high" | "medium" | "low" | string;
    citationIds?: string[];
    [key: string]: unknown;
  },
>(
  findings: T[],
  sources: SourceCitation[],
  options: {
    minKeywordOverlap?: number;
  } = {},
): CriticRefinementResult<T> {
  const minOverlap = options.minKeywordOverlap ?? 1;
  const sourceMap = new Map<string, SourceCitation>(
    sources.map((s) => [s.id, s]),
  );

  let optimizedCount = 0;

  const refinedFindings = findings.map((finding) => {
    const existingCitations = finding.citationIds ?? [];
    const validCitations = existingCitations.filter((id) => sourceMap.has(id));
    const lacksCitations = validCitations.length === 0;

    // If already cited with valid sources and not low confidence, keep as-is
    if (!lacksCitations && finding.confidence !== "low") {
      return {
        ...finding,
        citationIds: [...validCitations],
      };
    }

    const claimText = (
      finding.text ||
      [finding.point, finding.description].filter(Boolean).join(". ") ||
      ""
    ).trim();

    if (!claimText || sources.length === 0) {
      return {
        ...finding,
        citationIds: [...validCitations],
      };
    }

    // Rank real fetched sources by keyword alignment to find matching evidence
    const scoredSources = sources
      .map((source) => {
        const { alignment, matchedKeywords } = calculateKeywordAlignment(
          claimText,
          [source],
        );
        return {
          id: source.id,
          alignment,
          matchCount: matchedKeywords.length,
        };
      })
      .filter((s) => s.matchCount >= minOverlap && s.alignment > 0)
      .sort((a, b) => b.matchCount - a.matchCount || b.alignment - a.alignment);

    if (scoredSources.length > 0) {
      const bestMatches = scoredSources.slice(0, 2).map((s) => s.id);
      const combined = Array.from(new Set([...validCitations, ...bestMatches]));

      if (combined.length > validCitations.length) {
        optimizedCount += 1;
        return {
          ...finding,
          citationIds: combined,
        };
      }
    }

    return {
      ...finding,
      citationIds: [...validCitations],
    };
  });

  const audit = auditEvidenceAndCitations(refinedFindings, sources);

  return {
    findings: refinedFindings,
    optimizedCount,
    audit,
  };
}
