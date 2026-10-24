import { describe, expect, it } from 'bun:test';
import { 
  chunkDocumentWithSlidingOverlap, 
  computeCosineSimilarity, 
  generateEmbeddingV2 
} from '../src/lib/embeddings-v2';

describe('Embeddings v2 & Sliding Chunk Overlap Engine', () => {
  it('should generate overlapping chunks across boundary windows', () => {
    // 500 word text
    const text = new Array(500).fill(0).map((_, i) => `word${i}`).join(' ');
    const chunks = chunkDocumentWithSlidingOverlap(text, 100, 20);

    expect(chunks.length).toBeGreaterThan(1);
    // Verify first chunk and second chunk share overlapping words
    const chunk1Words = chunks[0].split(' ');
    const chunk2Words = chunks[1].split(' ');

    const overlapWords = chunk1Words.slice(-20);
    const chunk2Start = chunk2Words.slice(0, 20);
    expect(overlapWords.join(' ')).toBe(chunk2Start.join(' '));
  });

  it('should compute exact cosine similarity for parallel and orthogonal vectors', () => {
    const vecA = [1, 0, 0];
    const vecB = [1, 0, 0];
    const vecC = [0, 1, 0];

    expect(computeCosineSimilarity(vecA, vecB)).toBeCloseTo(1.0);
    expect(computeCosineSimilarity(vecA, vecC)).toBeCloseTo(0.0);
  });

  it('should produce dense normalized embeddings', async () => {
    const embedding = await generateEmbeddingV2('Cognitive multi-layer intelligence');
    expect(embedding.length).toBeGreaterThan(0);
    
    // Check vector norm
    let sumSq = 0;
    embedding.forEach(v => sumSq += v * v);
    expect(Math.sqrt(sumSq)).toBeCloseTo(1.0, 1);
  });
});
