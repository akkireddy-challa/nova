import { NextRequest, NextResponse } from 'next/server';
import { enhancePrompt } from '@/lib/ai-gateway';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = body.prompt?.trim();
    if (!prompt) {
      return NextResponse.json({ enhancedPrompt: '' });
    }
    const enhanced = await enhancePrompt(prompt);
    return NextResponse.json({ enhancedPrompt: enhanced });
  } catch (err) {
    console.error('Enhance API error:', err);
    return NextResponse.json({ enhancedPrompt: '' });
  }
}
