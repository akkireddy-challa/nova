import { describe, expect, it } from 'bun:test';
import { CANONICAL_EVAL_SCENARIOS, runEvalSuite } from '../src/lib/eval-engine';

describe('Autonomous Evals & Regression Engine', () => {
  it('should define canonical evaluation scenarios covering key research dimensions', () => {
    expect(CANONICAL_EVAL_SCENARIOS.length).toBeGreaterThanOrEqual(4);

    const k2Scenario = CANONICAL_EVAL_SCENARIOS.find(s => s.id === 'eval-comp-k2');
    expect(k2Scenario).toBeDefined();
    expect(k2Scenario?.complexity).toBe('K2');

    const conflictScenario = CANONICAL_EVAL_SCENARIOS.find(s => s.id === 'eval-conflict-res');
    expect(conflictScenario).toBeDefined();
    expect(conflictScenario?.category).toBe('conflict_resolution');
  });

  it('should run eval suite and compute pass rate and metrics without crashing', async () => {
    const report = await runEvalSuite('gemini-3-flash-preview');
    expect(report.id).toBeDefined();
    expect(report.totalScenarios).toBe(CANONICAL_EVAL_SCENARIOS.length);
    expect(report.passRate).toBeGreaterThanOrEqual(75);
    expect(report.avgLatencyMs).toBeGreaterThan(0);
    expect(report.results.length).toBe(CANONICAL_EVAL_SCENARIOS.length);

    // Verify all results have diagnostics
    for (const res of report.results) {
      expect(res.feedback).toBeTruthy();
      expect(res.score).toBeGreaterThanOrEqual(0);
      expect(res.score).toBeLessThanOrEqual(1);
    }
  }, 15000);
});
