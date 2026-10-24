import { describe, expect, it } from 'bun:test';
import { 
  generateMockThoughts, 
  generateMockResearch, 
  generateMockPlan, 
  generateMockChart, 
  generateMockMatrix, 
  generateMockCode 
} from '../src/lib/mock-generators';

describe('Generative UI Mock Generators', () => {
  it('should generate structured autonomous thoughts for all engines', () => {
    const modes = ['research', 'planner', 'matrix', 'coder', 'canvas'];
    modes.forEach(mode => {
      const thoughts = generateMockThoughts(mode, 'Test query');
      expect(thoughts.length).toBeGreaterThanOrEqual(2);
      expect(thoughts[0].agentName).toBeTruthy();
      expect(thoughts[0].status).toBe('success');
    });
  });

  it('should generate verified deep research report with citations', () => {
    const report = generateMockResearch('Autonomous Agents');
    expect(report.title).toContain('Autonomous Deep Investigation');
    expect(report.keyFindings.length).toBeGreaterThan(0);
    expect(report.sources.length).toBeGreaterThanOrEqual(3);
    expect(report.sources[0].relevanceScore).toBeGreaterThan(80);
    expect(report.metrics?.sourcesCrawled).toBeGreaterThan(10);
  });

  it('should generate goal plan with phases and actionable tasks', () => {
    const plan = generateMockPlan('Build SaaS MVP');
    expect(plan.phases.length).toBeGreaterThanOrEqual(3);
    const tasks = plan.phases.flatMap(p => p.tasks);
    expect(tasks.length).toBeGreaterThanOrEqual(5);
    expect(plan.keySuccessMetrics.length).toBeGreaterThan(0);
  });

  it('should generate chart artifacts with proper data keys', () => {
    const chart = generateMockChart('Adoption Trend');
    expect(chart.data.length).toBeGreaterThanOrEqual(4);
    expect(chart.data[0].value).toBeDefined();
    expect(chart.insight).toBeTruthy();
  });

  it('should generate multi-criteria decision matrix with valid weighted scores', () => {
    const matrix = generateMockMatrix('Framework Selection');
    expect(matrix.criteria.length).toBeGreaterThanOrEqual(3);
    expect(matrix.options.length).toBeGreaterThanOrEqual(2);
    expect(matrix.verdict).toBeTruthy();
  });

  it('should generate clean TypeScript code artifacts', () => {
    const code = generateMockCode('Orchestrator');
    expect(code.language).toBe('typescript');
    expect(code.code).toContain('class NovaOrchestrator');
    expect(code.explanation).toBeTruthy();
  });
});
