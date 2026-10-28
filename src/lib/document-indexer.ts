/**
 * Local Document Indexer & Intelligence RAG Module for Nova
 * Chunks documents on paragraph and sentence boundaries with sliding window overlap,
 * tags and converts chunks into searchable KnowledgeMemoryItems,
 * and groups chunks back into document summaries.
 */

import { generateId } from "./utils";
import type { KnowledgeMemoryItem } from "./types";
import { cleanDocumentText } from "./document-parser";

export interface ChunkOptions {
  /** Maximum chunk size in characters (e.g. 600 - 1000 characters). Default 800. */
  maxChunkSize?: number;
  /** Minimum target chunk size before looking for split boundaries. Default 500. */
  minChunkSize?: number;
  /** Sliding window overlap in characters between consecutive chunks. Default 100. */
  overlap?: number;
  /** Alias for maxChunkSize for API flexibility. */
  chunkSize?: number;
}

export interface DocumentGroup {
  docName: string;
  totalChunks: number;
  totalWords: number;
  lastUpdated: string;
  memoryIds: string[];
}

/**
 * Chunks text into sliding window passages, prioritizing paragraph boundaries (\n\n),
 * then line breaks (\n), then sentence boundaries ([.!?]), and word boundaries.
 */
export function chunkDocumentText(
  text: string,
  options: ChunkOptions = {},
): string[] {
  const cleaned = cleanDocumentText(text);
  if (!cleaned) return [];

  const maxLen = options.maxChunkSize ?? options.chunkSize ?? 800;
  if (cleaned.length <= maxLen) {
    return [cleaned];
  }

  const overlap = Math.min(options.overlap ?? 100, Math.floor(maxLen / 2));
  const minLen = options.minChunkSize ?? Math.max(200, maxLen - 300);

  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < cleaned.length) {
    // If the remaining text from cursor fits within maxLen, take it all and finish
    if (cleaned.length - cursor <= maxLen) {
      const lastChunk = cleaned.slice(cursor).trim();
      if (lastChunk) {
        chunks.push(lastChunk);
      }
      break;
    }

    const windowEnd = Math.min(cleaned.length, cursor + maxLen);
    const windowStart = cursor + minLen;
    const searchSlice = cleaned.slice(windowStart, windowEnd);

    // Look for best breaking point in [windowStart, windowEnd]
    // 1. Paragraph boundary: \n\n
    // 2. Line break: \n
    // 3. Sentence boundary: [.!?]\s+
    // 4. Word boundary: \s+
    let breakOffset = -1;

    // Search for the LAST paragraph boundary \n\n in the slice
    const paraMatches = [...searchSlice.matchAll(/\n\s*\n/g)];
    if (paraMatches.length > 0) {
      const last = paraMatches[paraMatches.length - 1];
      if (last.index !== undefined) {
        breakOffset = windowStart + last.index;
      }
    }

    // If no paragraph boundary, search for single newline
    if (breakOffset === -1) {
      const lineMatches = [...searchSlice.matchAll(/\n/g)];
      if (lineMatches.length > 0) {
        const last = lineMatches[lineMatches.length - 1];
        if (last.index !== undefined) {
          breakOffset = windowStart + last.index;
        }
      }
    }

    // If no newline, search for sentence boundary [.!?]\s+ in window (allowing slight overrun up to 20% or 60 chars)
    if (breakOffset === -1) {
      const sentenceSearchEnd = Math.min(
        cleaned.length,
        windowEnd + Math.min(60, Math.floor(maxLen * 0.2)),
      );
      const sentenceSlice = cleaned.slice(windowStart, sentenceSearchEnd);
      const sentenceMatches = [...sentenceSlice.matchAll(/[.!?]+(?:\s+|$)/g)];
      if (sentenceMatches.length > 0) {
        const last = sentenceMatches[sentenceMatches.length - 1];
        if (last.index !== undefined) {
          breakOffset = windowStart + last.index + last[0].length;
        }
      }
    }

    // If no sentence boundary, search for space
    if (breakOffset === -1) {
      const spaceMatches = [...searchSlice.matchAll(/\s+/g)];
      if (spaceMatches.length > 0) {
        const last = spaceMatches[spaceMatches.length - 1];
        if (last.index !== undefined) {
          breakOffset = windowStart + last.index;
        }
      }
    }

    // Check if a paragraph boundary exists just slightly beyond maxLen (up to 120 chars) to avoid split
    if (breakOffset === -1) {
      const extendedSlice = cleaned.slice(
        windowEnd,
        Math.min(cleaned.length, windowEnd + 120),
      );
      const extPara = extendedSlice.search(/\n\s*\n/);
      if (extPara !== -1) {
        breakOffset = windowEnd + extPara;
      } else {
        breakOffset = windowEnd;
      }
    }

    const chunkContent = cleaned.slice(cursor, breakOffset).trim();
    if (chunkContent) {
      chunks.push(chunkContent);
    }

    // If we reached or passed the end, break
    if (breakOffset >= cleaned.length) {
      break;
    }

    // Calculate overlap start for next chunk
    const targetOverlap = Math.max(cursor + 1, breakOffset - overlap);

    // Look for a clean sentence or word boundary to avoid starting mid-sentence or mid-word
    let nextStart = targetOverlap;
    const searchStart = Math.max(cursor + 1, targetOverlap - 60);
    const searchEnd = breakOffset - 1;
    if (searchEnd > cursor + 1) {
      // Search for sentence boundaries between cursor and breakOffset
      const wideSlice = cleaned.slice(cursor + 1, searchEnd);
      const wideSentMatches = [...wideSlice.matchAll(/(?:[.!?]+\s+|\n+)/g)];
      if (wideSentMatches.length > 0) {
        let bestMatch = wideSentMatches[0];
        let minDiff = Math.abs(cursor + 1 + bestMatch.index! - targetOverlap);
        for (const m of wideSentMatches) {
          const diff = Math.abs(cursor + 1 + m.index! - targetOverlap);
          if (diff < minDiff) {
            minDiff = diff;
            bestMatch = m;
          }
        }
        nextStart = cursor + 1 + bestMatch.index! + bestMatch[0].length;
      } else if (searchEnd > searchStart) {
        // Snap to word boundary near targetOverlap
        const slice = cleaned.slice(searchStart, searchEnd);
        const spaceMatches = [...slice.matchAll(/\s+/g)];
        if (spaceMatches.length > 0) {
          let bestMatch = spaceMatches[0];
          let minDiff = Math.abs(
            searchStart + bestMatch.index! - targetOverlap,
          );
          for (const m of spaceMatches) {
            const diff = Math.abs(searchStart + m.index! - targetOverlap);
            if (diff < minDiff) {
              minDiff = diff;
              bestMatch = m;
            }
          }
          nextStart = searchStart + bestMatch.index! + bestMatch[0].length;
        }
      }
    }

    // Safety checks: ensure forward progress and valid range
    if (nextStart <= cursor) {
      nextStart = cursor + Math.max(1, Math.floor(maxLen / 2));
    }
    if (nextStart >= breakOffset) {
      nextStart = breakOffset;
    }

    cursor = nextStart;
  }

  return chunks;
}

/**
 * Indexes a document into an array of KnowledgeMemoryItems ready for embedding / BM25 search.
 */
export function indexDocumentIntoMemories(
  doc: { name: string; content: string; type?: string },
  options: ChunkOptions = {},
): KnowledgeMemoryItem[] {
  const chunks = chunkDocumentText(doc.content, options);
  if (chunks.length === 0) return [];

  const now = new Date().toISOString();
  const safeSlug = doc.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const total = chunks.length;

  return chunks.map((chunk, i) => ({
    id: `doc-${generateId()}`,
    title: `${doc.name} (Part ${i + 1}/${total})`,
    content: chunk,
    category: "document" as const,
    tags: ["document", safeSlug],
    createdAt: now,
    updatedAt: now,
  }));
}

/**
 * Aggregates document chunk memories back into document overviews for the UI.
 * Extracts document name, calculates total chunks, word counts, and last updated timestamp.
 */
export function groupDocumentMemories(
  memories: KnowledgeMemoryItem[],
): DocumentGroup[] {
  if (!Array.isArray(memories) || memories.length === 0) {
    return [];
  }

  // Filter for document memories only
  const docMemories = memories.filter(
    (m) =>
      m.category === "document" ||
      m.id.startsWith("doc-") ||
      (Array.isArray(m.tags) && m.tags.includes("document")),
  );

  const groups = new Map<string, KnowledgeMemoryItem[]>();

  for (const memory of docMemories) {
    // Memory titles are formatted as: "${doc.name} (Part ${i+1}/${total})" or "${doc.name}"
    const match = memory.title.match(/^(.*?)(?:\s+\(Part\s+\d+\/\d+\))?$/);
    const docName =
      (match && match[1] ? match[1].trim() : memory.title.trim()) ||
      "Untitled Document";

    const list = groups.get(docName) ?? [];
    list.push(memory);
    groups.set(docName, list);
  }

  const result: DocumentGroup[] = [];

  for (const [docName, chunks] of groups.entries()) {
    let totalWords = 0;
    let latestTime = 0;
    let latestIso = "";
    const memoryIds: string[] = [];

    for (const chunk of chunks) {
      memoryIds.push(chunk.id);
      const words = chunk.content.trim().split(/\s+/).filter(Boolean);
      totalWords += words.length;

      const timeStr = chunk.updatedAt || chunk.createdAt;
      if (timeStr) {
        const timeMs = new Date(timeStr).getTime();
        if (!isNaN(timeMs) && timeMs >= latestTime) {
          latestTime = timeMs;
          latestIso = timeStr;
        }
      }
    }

    if (!latestIso) {
      latestIso = new Date().toISOString();
    }

    result.push({
      docName,
      totalChunks: chunks.length,
      totalWords,
      lastUpdated: latestIso,
      memoryIds,
    });
  }

  // Sort by lastUpdated descending (newest first)
  return result.sort((a, b) => {
    const timeA = new Date(a.lastUpdated).getTime();
    const timeB = new Date(b.lastUpdated).getTime();
    if (isNaN(timeA) || isNaN(timeB)) return a.docName.localeCompare(b.docName);
    return timeB - timeA;
  });
}
