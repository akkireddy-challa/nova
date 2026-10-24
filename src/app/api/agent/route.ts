import { NextRequest, NextResponse } from 'next/server';
import { processAgentRequest } from '@/lib/ai-gateway';
import { StudioMode, ModelProvider, Attachment, ThinkingBudget } from '@/lib/types';
import { mlopsCollector } from '@/lib/mlops-pipeline';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const prompt = body.prompt?.trim();
    const mode = (body.mode || 'research') as StudioMode;
    const context = body.context || '';
    const model = (body.model || 'gemini-3-flash') as ModelProvider;
    const attachments = (body.attachments || []) as Attachment[];
    const thinkingBudget = (body.thinkingBudget || 'analytical') as ThinkingBudget;

    if (!prompt && attachments.length === 0) {
      return NextResponse.json({ error: 'Prompt or attachment is required' }, { status: 400 });
    }

    const result = await processAgentRequest(
      prompt || 'Analyze attached documents',
      mode,
      context,
      model,
      attachments,
      thinkingBudget
    );
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API Error in /api/agent:', error);
    mlopsCollector.recordRequest({
      model: 'agent-swarm-coordinator',
      latencyMs: Date.now() - startTime,
      promptTokens: 50,
      completionTokens: 0,
      success: false,
      statusCode: 500,
      error,
    });
    return NextResponse.json(
      { error: 'Internal server error processing agent request' },
      { status: 500 }
    );
  }
}
