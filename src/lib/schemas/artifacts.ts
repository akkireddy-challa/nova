import { z } from 'zod';
import type {
  ChartArtifact,
  CodeArtifact,
  DebateArtifact,
  DecisionMatrix,
  GoalPlan,
  ResearchReport,
  SourceCitation,
} from '../types';

/**
 * Zod schemas for the JSON objects the LLM is asked to return, one per studio mode.
 * Each schema is followed by a converter that maps the validated model output onto
 * the artifact types in src/lib/types.ts, filling only structural fields (ids,
 * ordering, computed totals). Nothing is invented: every value shown to the user
 * comes from the model output or from real fetched sources.
 */

const nonEmpty = z.string().trim().min(1);
const stringList = z.array(nonEmpty);

// --- Research -------------------------------------------------------------

/** A citation may be given as 3, "3", "[3]" or "src-3"; all mean numbered source 3. */
const citationRef = z.union([z.number().int(), z.string()]);

export const researchOutputSchema = z.object({
  content: nonEmpty,
  research: z.object({
    title: nonEmpty,
    executiveSummary: nonEmpty,
    keyFindings: z
      .array(
        z.object({
          point: nonEmpty,
          description: nonEmpty,
          confidence: z.enum(['high', 'medium', 'emerging']),
          citations: z.array(citationRef).default([]),
        }),
      )
      .min(1),
    contradictionsAndRisks: stringList.optional(),
    recommendation: nonEmpty,
  }),
});
export type ResearchOutput = z.infer<typeof researchOutputSchema>;

export function citationNumber(ref: number | string): number | null {
  if (typeof ref === 'number') return Number.isInteger(ref) ? ref : null;
  const match = ref.trim().match(/^\[?(?:src-|source\s*)?(\d+)\]?$/i);
  return match ? Number(match[1]) : null;
}

export interface ResearchConversion {
  report: ResearchReport;
  /** Citation references from the model that did not match any provided source. */
  droppedCitations: string[];
}

/**
 * Builds the ResearchReport. `sources` are the numbered sources given to the model
 * (sources[0] is [1]); citations are mapped onto their real ids and unknown ones dropped.
 */
export function toResearchReport(
  output: ResearchOutput,
  sources: SourceCitation[],
  metrics: ResearchReport['metrics'],
): ResearchConversion {
  const droppedCitations: string[] = [];
  const keyFindings = output.research.keyFindings.map(finding => {
    const citationIds: string[] = [];
    for (const ref of finding.citations) {
      const n = citationNumber(ref);
      const source = n !== null ? sources[n - 1] : undefined;
      if (!source) {
        droppedCitations.push(String(ref));
        continue;
      }
      if (!citationIds.includes(source.id)) citationIds.push(source.id);
    }
    return {
      point: finding.point,
      description: finding.description,
      confidence: finding.confidence,
      citationIds,
    };
  });

  return {
    report: {
      title: output.research.title,
      executiveSummary: output.research.executiveSummary,
      keyFindings,
      sources,
      contradictionsAndRisks: output.research.contradictionsAndRisks,
      recommendation: output.research.recommendation,
      metrics,
    },
    droppedCitations,
  };
}

// --- Plan -----------------------------------------------------------------

export const planOutputSchema = z.object({
  content: nonEmpty,
  plan: z.object({
    goal: nonEmpty,
    timeframe: nonEmpty,
    overview: nonEmpty,
    phases: z
      .array(
        z.object({
          phaseName: nonEmpty,
          summary: nonEmpty,
          tasks: z
            .array(
              z.object({
                title: nonEmpty,
                description: nonEmpty,
                actionableOutput: z.string().optional(),
              }),
            )
            .min(1),
        }),
      )
      .min(1),
    keySuccessMetrics: stringList,
  }),
});
export type PlanOutput = z.infer<typeof planOutputSchema>;

/** A freshly generated plan has not been executed, so every phase/task starts pending. */
export function toGoalPlan(output: PlanOutput): GoalPlan {
  return {
    goal: output.plan.goal,
    timeframe: output.plan.timeframe,
    overview: output.plan.overview,
    phases: output.plan.phases.map((phase, i) => ({
      id: `phase-${i + 1}`,
      phaseNumber: i + 1,
      phaseName: phase.phaseName,
      summary: phase.summary,
      status: 'pending',
      tasks: phase.tasks.map((task, j) => ({
        id: `phase-${i + 1}-task-${j + 1}`,
        title: task.title,
        description: task.description,
        status: 'todo',
        actionableOutput: task.actionableOutput,
      })),
    })),
    keySuccessMetrics: output.plan.keySuccessMetrics,
  };
}

// --- Decision matrix ------------------------------------------------------

export const matrixOutputSchema = z.object({
  content: nonEmpty,
  matrix: z
    .object({
      topic: nonEmpty,
      criteria: z
        .array(z.object({ id: nonEmpty, name: nonEmpty, weight: z.number().min(0).max(10) }))
        .min(1),
      options: z
        .array(
          z.object({
            name: nonEmpty,
            scores: z.record(z.string(), z.number().min(0).max(10)),
            pros: z.array(z.string()),
            cons: z.array(z.string()),
          }),
        )
        .min(2),
      verdict: nonEmpty,
    })
    .superRefine((matrix, ctx) => {
      const ids = new Set(matrix.criteria.map(c => c.id));
      if (ids.size !== matrix.criteria.length) {
        ctx.addIssue({ code: 'custom', message: 'criteria ids must be unique', path: ['criteria'] });
      }
      matrix.options.forEach((option, i) => {
        for (const id of ids) {
          if (typeof option.scores[id] !== 'number') {
            ctx.addIssue({
              code: 'custom',
              message: `option "${option.name}" is missing a score for criterion id "${id}"`,
              path: ['options', i, 'scores'],
            });
          }
        }
      });
    }),
});
export type MatrixOutput = z.infer<typeof matrixOutputSchema>;

/** totalWeightedScore is computed here from the model's own scores and weights. */
export function toDecisionMatrix(output: MatrixOutput): DecisionMatrix {
  const { criteria } = output.matrix;
  const weightSum = criteria.reduce((sum, c) => sum + c.weight, 0);
  return {
    topic: output.matrix.topic,
    criteria: criteria.map(c => ({ id: c.id, name: c.name, weight: c.weight })),
    options: output.matrix.options.map((option, i) => {
      const scores: Record<string, number> = {};
      let weighted = 0;
      for (const c of criteria) {
        scores[c.id] = option.scores[c.id];
        weighted += option.scores[c.id] * c.weight;
      }
      return {
        id: `opt-${i + 1}`,
        name: option.name,
        scores,
        pros: option.pros,
        cons: option.cons,
        totalWeightedScore: weightSum > 0 ? Math.round((weighted / weightSum) * 10) / 10 : 0,
      };
    }),
    verdict: output.matrix.verdict,
  };
}

// --- Code -----------------------------------------------------------------

export const codeOutputSchema = z.object({
  content: nonEmpty,
  code: z.object({
    language: nonEmpty,
    filename: nonEmpty,
    code: nonEmpty,
    explanation: nonEmpty,
    previewHtml: z.string().optional(),
  }),
});
export type CodeOutput = z.infer<typeof codeOutputSchema>;

export function toCodeArtifact(output: CodeOutput): CodeArtifact {
  return { ...output.code };
}

// --- Debate ---------------------------------------------------------------

const STANCE_COLORS: Record<DebateArtifact['perspectives'][number]['stance'], string> = {
  Advocate: 'teal',
  Critic: 'rose',
  'Neutral Arbiter': 'indigo',
};

export const debateOutputSchema = z.object({
  content: nonEmpty,
  debate: z.object({
    topic: nonEmpty,
    consensusSummary: nonEmpty,
    perspectives: z
      .array(
        z.object({
          agentName: nonEmpty,
          stance: z.enum(['Advocate', 'Critic', 'Neutral Arbiter']),
          arguments: stringList.min(1),
          caveats: z.array(z.string()),
        }),
      )
      .min(2),
    synthesisVerdict: nonEmpty,
  }),
});
export type DebateOutput = z.infer<typeof debateOutputSchema>;

export function toDebateArtifact(output: DebateOutput): DebateArtifact {
  return {
    topic: output.debate.topic,
    consensusSummary: output.debate.consensusSummary,
    perspectives: output.debate.perspectives.map(p => ({
      agentName: p.agentName,
      stance: p.stance,
      avatarColor: STANCE_COLORS[p.stance],
      arguments: p.arguments,
      caveats: p.caveats,
    })),
    synthesisVerdict: output.debate.synthesisVerdict,
  };
}

// --- Chart ----------------------------------------------------------------

export const chartOutputSchema = z.object({
  content: nonEmpty,
  /** null when the sources contain no numeric data worth charting. */
  chart: z
    .object({
      title: nonEmpty,
      type: z.enum(['bar', 'line', 'area']),
      data: z
        .array(
          z.object({
            label: nonEmpty,
            value: z.number().finite(),
            secondaryValue: z.number().finite().optional(),
            category: z.string().optional(),
            deltaPercent: z.string().optional(),
          }),
        )
        .min(1),
      insight: nonEmpty,
      takeaways: z.array(z.string()).optional(),
      followUpQuestions: z.array(z.string()).optional(),
    })
    .nullable(),
});
export type ChartOutput = z.infer<typeof chartOutputSchema>;

export function toChartArtifact(chart: NonNullable<ChartOutput['chart']>): ChartArtifact {
  return {
    title: chart.title,
    type: chart.type,
    xAxisKey: 'label',
    data: chart.data.map(d => ({ ...d })),
    insight: chart.insight,
    takeaways: chart.takeaways,
    followUpQuestions: chart.followUpQuestions,
  };
}

// --- Helpers --------------------------------------------------------------

/** Extracts the JSON object from a model response (tolerates code fences and surrounding prose). */
export function extractJson(text: string): unknown {
  let clean = text.trim();
  const fenced = clean.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) clean = fenced[1].trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start === -1 || end <= start) {
    throw new SyntaxError('Response did not contain a JSON object.');
  }
  return JSON.parse(clean.slice(start, end + 1));
}

export type ValidationResult<T> = { ok: true; data: T } | { ok: false; error: string };

export function validateOutput<T>(schema: z.ZodType<T>, text: string): ValidationResult<T> {
  let raw: unknown;
  try {
    raw = extractJson(text);
  } catch (err) {
    return { ok: false, error: `Invalid JSON: ${err instanceof Error ? err.message : String(err)}` };
  }
  const parsed = schema.safeParse(raw);
  if (parsed.success) return { ok: true, data: parsed.data };
  return { ok: false, error: z.prettifyError(parsed.error).slice(0, 2000) };
}
