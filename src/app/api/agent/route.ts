import { NextRequest, NextResponse } from 'next/server';
import { processAgentRequest } from '@/lib/ai-gateway';
import { StudioMode } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = body.prompt?.trim();
    const mode = (body.mode || 'research') as StudioMode;
    const context = body.context || '';

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const result = await processAgentRequest(prompt, mode, context);
    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error in /api/agent:', error);
    return NextResponse.json(
      { error: 'Internal server error processing agent request' },
      { status: 500 }
    );
  }
}
