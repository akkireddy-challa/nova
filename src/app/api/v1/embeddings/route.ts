import { NextRequest, NextResponse } from 'next/server';
import { generateEmbeddingV2 } from '@/lib/embeddings-v2';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawInput = body.input;
    const model = body.model || 'gemini-embedding-2';

    if (!rawInput) {
      return NextResponse.json(
        {
          error: {
            message: "Missing required parameter 'input'.",
            type: 'invalid_request_error',
            param: 'input',
            code: null,
          },
        },
        { status: 400 }
      );
    }

    const inputs: string[] = Array.isArray(rawInput) ? rawInput : [String(rawInput)];
    const data: { object: string; embedding: number[]; index: number }[] = [];

    let totalTokens = 0;
    for (let i = 0; i < inputs.length; i++) {
      const text = inputs[i];
      const vector = await generateEmbeddingV2(text);
      totalTokens += Math.max(1, Math.round(text.split(/\s+/).length * 1.3));
      data.push({
        object: 'embedding',
        embedding: vector,
        index: i,
      });
    }

    return NextResponse.json({
      object: 'list',
      data,
      model,
      dimensions: data[0]?.embedding.length || 3072,
      usage: {
        prompt_tokens: totalTokens,
        total_tokens: totalTokens,
      },
    });
  } catch (error: any) {
    console.error('API v1 Embeddings error:', error);
    return NextResponse.json(
      {
        error: {
          message: error.message || 'Internal server error in Nova Embeddings v2 engine.',
          type: 'api_error',
          param: null,
          code: 500,
        },
      },
      { status: 500 }
    );
  }
}
