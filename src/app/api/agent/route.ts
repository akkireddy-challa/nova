import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PipelineError, processAgentRequest } from '@/lib/ai-gateway';
import { ModelSelectionError } from '@/lib/providers';
import { NoProviderConfiguredError, ProviderError } from '@/lib/providers/types';
import type { Attachment, StudioMode, ThinkingBudget } from '@/lib/types';

type ErrorCode = 'NO_PROVIDER' | 'PROVIDER_ERROR' | 'INVALID_OUTPUT' | 'BAD_REQUEST';

const MODES = ['research', 'planner', 'canvas', 'coder', 'matrix', 'debate', 'intelligence', 'mcp'] as const satisfies readonly StudioMode[];
const BUDGETS = ['quick', 'analytical', 'deep'] as const satisfies readonly ThinkingBudget[];

const attachmentSchema = z.object({
  id: z.string(),
  name: z.string().max(300),
  size: z.number(),
  type: z.string().max(200),
  content: z.string().max(15_000_000),
});

const requestSchema = z.object({
  prompt: z.string().max(20_000).optional(),
  mode: z.enum(MODES).default('research'),
  model: z.string().max(200).optional(),
  attachments: z.array(attachmentSchema).max(10).optional(),
  thinkingBudget: z.enum(BUDGETS).default('analytical'),
  context: z.string().max(50_000).optional(),
});

function errorResponse(error: string, code: ErrorCode, status: number) {
  return NextResponse.json({ error, code }, { status });
}

/** Strips anything that could leak endpoints or credentials from an upstream error message. */
function safeMessage(message: string): string {
  return message
    .replace(/https?:\/\/\S+/g, '[url]')
    .replace(/\b(?:sk|pk|rk|gsk|tvly|AIza)[-_A-Za-z0-9]{8,}/g, '[redacted]')
    .replace(/([?&](?:key|api_key|token)=)[^&\s]+/gi, '$1[redacted]')
    .slice(0, 300);
}

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return errorResponse('Request body must be valid JSON.', 'BAD_REQUEST', 400);
  }

  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return errorResponse(`Invalid request: ${issue.path.join('.') || 'body'} ${issue.message}`, 'BAD_REQUEST', 400);
  }
  const body = parsed.data;
  const attachments: Attachment[] = body.attachments ?? [];
  const prompt = body.prompt?.trim() || (attachments.length > 0 ? 'Analyze the attached files.' : '');
  if (!prompt) {
    return errorResponse('Prompt or attachment is required.', 'BAD_REQUEST', 400);
  }
  const model = body.model?.trim() || undefined;

  try {
    const result = await processAgentRequest(prompt, body.mode, body.context, model, attachments, body.thinkingBudget);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof NoProviderConfiguredError) {
      return errorResponse(error.message, 'NO_PROVIDER', 503);
    }
    if (error instanceof ModelSelectionError) {
      return errorResponse(safeMessage(error.message), 'BAD_REQUEST', 400);
    }
    if (error instanceof ProviderError) {
      console.error(`[api/agent] Provider error from ${error.provider} (status ${error.status ?? 'n/a'})`);
      return errorResponse(`The ${error.provider} provider returned an error: ${safeMessage(error.message)}`, 'PROVIDER_ERROR', 502);
    }
    if (error instanceof PipelineError) {
      return error.code === 'BAD_REQUEST'
        ? errorResponse(error.message, 'BAD_REQUEST', 400)
        : errorResponse(error.message, 'INVALID_OUTPUT', 502);
    }
    console.error('[api/agent] Unexpected error:', error instanceof Error ? error.name : 'unknown');
    return errorResponse('Unexpected error while calling the model provider.', 'PROVIDER_ERROR', 502);
  }
}
