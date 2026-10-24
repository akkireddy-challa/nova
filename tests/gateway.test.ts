import { describe, expect, it } from 'bun:test';
import { processAgentRequest } from '../src/lib/ai-gateway';

describe('AI Gateway & Resilience', () => {
  it('should process research request and return report and thoughts', async () => {
    const res = await processAgentRequest('Local AI Models', 'research');
    expect(res.content).toBeTruthy();
    expect(res.thoughts.length).toBeGreaterThan(0);
    expect(res.artifact).toBeDefined();
    expect(res.artifact?.type).toBe('research');
    expect(res.telemetry).toBeDefined();
    expect(res.telemetry.latencyMs).toBeGreaterThan(0);
  });

  it('should process planner request with fallback safety', async () => {
    const res = await processAgentRequest('Build Next-Gen Web App', 'planner');
    expect(res.artifact?.type).toBe('plan');
    if (res.artifact?.type === 'plan') {
      expect(res.artifact.data.phases.length).toBeGreaterThan(0);
    }
  });

  it('should support decision matrix mode seamlessly', async () => {
    const res = await processAgentRequest('Select Vector DB', 'matrix');
    expect(res.artifact?.type).toBe('matrix');
  });
});
