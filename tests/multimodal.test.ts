import { describe, expect, it } from 'bun:test';
import { processAgentRequest } from '../src/lib/ai-gateway';
import { Attachment } from '../src/lib/types';

describe('Multimodal Vision & Artifact Stage Processing', () => {
  it('should accept image attachment and produce vision-augmented thoughts and findings', async () => {
    const mockImageAttachment: Attachment = {
      id: 'att-img-1',
      name: 'system-architecture.png',
      size: 45200,
      type: 'image/png',
      content: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    };

    const res = await processAgentRequest(
      'Analyze the UI and system architecture in this diagram',
      'research',
      undefined,
      'gemini-3-flash',
      [mockImageAttachment]
    );

    expect(res.content).toBeTruthy();
    expect(res.thoughts.some(t => t.agentName.includes('Vision'))).toBe(true);
    expect(res.artifact).toBeDefined();
    expect(res.artifact?.type).toBe('research');
  }, 25000);
});
