import { NextRequest, NextResponse } from 'next/server';
import { processAgentRequest } from '@/lib/ai-gateway';
import { StudioMode, ModelProvider, Attachment } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = body.prompt?.trim();
    const mode = (body.mode || 'research') as StudioMode;
    const context = body.context || '';
    const model = (body.model || 'gemini-2.0-flash') as ModelProvider;
    const attachments = (body.attachments || []) as Attachment[];

    if (!prompt && attachments.length === 0) {
      return NextResponse.json({ error: 'Prompt or attachment is required' }, { status: 400 });
    }

    const result = await processAgentRequest(prompt || 'Analyze attached documents', mode, context, model, attachments);
    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error in /api/agent:', error);
    return NextResponse.json(
      { error: 'Internal server error processing agent request' },
      { status: 500 }
    );
  }
}
