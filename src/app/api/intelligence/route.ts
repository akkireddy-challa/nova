import { NextRequest, NextResponse } from 'next/server';
import { embeddingsV2Store, ChunkWithEmbedding } from '@/lib/embeddings-v2';
import { cognitiveStack } from '@/lib/intelligence-layers';
import { KnowledgeMemoryItem } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || 'search';
    const query = body.query?.trim() || '';
    const memories = (body.memories || []) as KnowledgeMemoryItem[];

    // Ensure memories are indexed into Embeddings v2 store
    if (memories.length > 0) {
      for (const m of memories) {
        await embeddingsV2Store.addDocument(m.id, m.title, m.content);
      }
    }

    if (action === 'search') {
      const results: ChunkWithEmbedding[] = query ? await embeddingsV2Store.search(query, 5) : [];
      const stats = embeddingsV2Store.getStats();

      return NextResponse.json({
        query,
        results,
        stats,
        layers: [
          cognitiveStack.getWorkingMemoryLayer(),
          cognitiveStack.getSemanticMemoryLayer(),
          cognitiveStack.getKnowledgeGraphLayer(memories),
          cognitiveStack.getCognitiveExecutiveLayer(),
        ],
      });
    }

    if (action === 'layers_status') {
      return NextResponse.json({
        layers: [
          cognitiveStack.getWorkingMemoryLayer(),
          cognitiveStack.getSemanticMemoryLayer(),
          cognitiveStack.getKnowledgeGraphLayer(memories),
          cognitiveStack.getCognitiveExecutiveLayer(),
        ],
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Intelligence API error:', error);
    return NextResponse.json({ error: 'Internal server error in intelligence engine' }, { status: 500 });
  }
}
