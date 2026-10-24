import { NextRequest, NextResponse } from 'next/server';
import { enhancePrompt } from '@/lib/ai-gateway';

export async function POST(req: NextRequest) {
  let body: { prompt?: unknown; model?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.', code: 'BAD_REQUEST' }, { status: 400 });
  }
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) {
    return NextResponse.json({ enhancedPrompt: '' });
  }
  const model = typeof body.model === 'string' && body.model.trim() ? body.model.trim() : undefined;
  // enhancePrompt returns the prompt unchanged when no provider is configured or the call fails.
  const enhanced = await enhancePrompt(prompt, model);
  return NextResponse.json({ enhancedPrompt: enhanced });
}
