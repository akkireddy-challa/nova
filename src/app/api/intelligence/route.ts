import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { searchMemories } from '@/lib/memory-search';

const CATEGORIES = ['preference', 'project_context', 'personal_fact', 'document'] as const;

const requestSchema = z.object({
  query: z.string().max(2_000),
  memories: z
    .array(
      z.object({
        id: z.string().max(200),
        title: z.string().max(500),
        content: z.string().max(50_000),
        category: z.enum(CATEGORIES).optional(),
      }),
    )
    .max(500)
    .default([]),
  topK: z.number().int().min(1).max(50).optional(),
});

/**
 * Search the caller's saved memories (they live in the browser, so the client sends them).
 * Response: { query, method: 'embeddings' | 'keyword', embeddingModel?, fallbackReason?, results }.
 */
export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: `Invalid request: ${issue.path.join('.') || 'body'} ${issue.message}` },
      { status: 400 },
    );
  }
  const { query, memories, topK } = parsed.data;
  if (!query.trim()) {
    return NextResponse.json({ error: 'Query is required.' }, { status: 400 });
  }

  try {
    return NextResponse.json(await searchMemories(query, memories, { topK, signal: req.signal }));
  } catch (error) {
    console.error('[api/intelligence] memory search failed:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ error: 'Memory search failed.' }, { status: 500 });
  }
}
