/**
 * Nova Autonomous Studio - Voice Briefing Engine
 * 
 * Provides robust text preparation, sanitization, and utterance chunking
 * to prevent browser SpeechSynthesis bugs (silent truncation, 15s timeout,
 * utterance garbage collection, missing punctuation pauses).
 */

export interface VoiceBriefingOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
  maxChunkLength?: number;
}

export interface VoiceSessionState {
  isPlaying: boolean;
  isPaused: boolean;
  currentChunkIndex: number;
  totalChunks: number;
  progressPercent: number;
}

/**
 * Prepares raw input or structured report text into a clean, conversational
 * script suitable for speech synthesis. Strips markdown syntax, technical symbols,
 * URLs, citation markers, and expands common abbreviations.
 */
export function prepareBriefingText(
  input: 
    | string 
    | {
        title?: string;
        executiveSummary?: string;
        keyFindings?: Array<{ point: string; description?: string }>;
        recommendation?: string;
      }
    | null
    | undefined
): string {
  if (!input) return '';

  let raw = '';
  if (typeof input === 'string') {
    raw = input;
  } else {
    const parts: string[] = [];
    if (input.title) {
      parts.push(`${input.title}.`);
    }
    if (input.executiveSummary) {
      parts.push(`Executive Summary: ${input.executiveSummary}`);
    }
    if (input.keyFindings && Array.isArray(input.keyFindings) && input.keyFindings.length > 0) {
      const findingsList = input.keyFindings
        .map((f, i) => `Finding ${i + 1}: ${f.point}. ${f.description || ''}`)
        .join(' ');
      parts.push(`Key Findings: ${findingsList}`);
    }
    if (input.recommendation) {
      parts.push(`Strategic Recommendation: ${input.recommendation}`);
    }
    raw = parts.join(' ');
  }

  // 1. Strip Markdown Headers (# Heading)
  let cleaned = raw.replace(/^#{1,6}\s+/gm, '');

  // 2. Strip Markdown Links [text](url) -> text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // 3. Strip Code Blocks (```code```) and Inline Code (`code`)
  cleaned = cleaned.replace(/```[\s\S]*?```/g, 'code snippet omitted');
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');

  // 4. Strip Bold & Italic (*text*, **text**, _text_, __text__)
  cleaned = cleaned.replace(/(\*\*|__)(.*?)\1/g, '$2');
  cleaned = cleaned.replace(/(\*|_)(.*?)\1/g, '$2');

  // 5. Strip Citation Brackets like [1], [Source 2], [src-1]
  cleaned = cleaned.replace(/\[(?:Source\s*)?\w+(?:-\w+)?\]/gi, '');

  // 6. Expand common abbreviations and technical tokens for natural cadence
  const expansions: [RegExp, string][] = [
    [/\be\.g\.,?\s*/gi, 'for example, '],
    [/\bi\.e\.,?\s*/gi, 'that is, '],
    [/\bvs\.?\s*/gi, 'versus '],
    [/\betc\.?\s*/gi, 'and so forth. '],
    [/\bp95\b/gi, 'p 95 percentile'],
    [/\bp99\b/gi, 'p 99 percentile'],
    [/\bp50\b/gi, 'median p 50'],
    [/\bAPI\b/g, 'A P I'],
    [/\bMCP\b/g, 'M C P'],
    [/\bUI\b/g, 'U I'],
    [/\bDAG\b/g, 'D A G'],
  ];

  for (const [pattern, replacement] of expansions) {
    cleaned = cleaned.replace(pattern, replacement);
  }

  // 7. Strip HTML / XML tags if any
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');

  // 8. Clean up bullet points & decorative list marks
  cleaned = cleaned.replace(/^\s*[-*•]\s+/gm, '');

  // 9. Normalize multiple punctuation and spacing
  cleaned = cleaned.replace(/\s{2,}/g, ' ');
  cleaned = cleaned.replace(/([.?!])\1+/g, '$1');

  return cleaned.trim();
}

/**
 * Splits text into natural sentence / clause chunks that do not exceed maxChunkLength.
 * Chromium SpeechSynthesis silently halts after ~200-300 characters or ~15 seconds.
 * Utterance chunking is critical for production reliability.
 */
export function chunkUtteranceText(text: string, maxChunkLength: number = 180): string[] {
  if (!text || typeof text !== 'string') return [];
  const trimmed = text.trim();
  if (trimmed.length === 0) return [];

  if (trimmed.length <= maxChunkLength) {
    return [trimmed];
  }

  // Split on primary sentence boundaries (keep the delimiter with positive lookbehind)
  const sentencePattern = /([.?!]+(?:\s+|$))/;
  const rawParts = trimmed.split(sentencePattern);

  // Re-stitch sentences with their trailing punctuation
  const sentences: string[] = [];
  for (let i = 0; i < rawParts.length; i += 2) {
    const textPart = rawParts[i] || '';
    const punctPart = rawParts[i + 1] || '';
    const sentence = (textPart + punctPart).trim();
    if (sentence.length > 0) {
      sentences.push(sentence);
    }
  }

  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    // If the sentence itself fits within the remaining space in currentChunk
    if (currentChunk.length === 0) {
      if (sentence.length <= maxChunkLength) {
        currentChunk = sentence;
      } else {
        // Sentence is longer than maxChunkLength: split by secondary clause boundaries (, ; : -)
        const subChunks = splitLongSentence(sentence, maxChunkLength);
        for (const sub of subChunks) {
          chunks.push(sub);
        }
      }
    } else if (currentChunk.length + 1 + sentence.length <= maxChunkLength) {
      currentChunk += ' ' + sentence;
    } else {
      chunks.push(currentChunk.trim());
      if (sentence.length <= maxChunkLength) {
        currentChunk = sentence;
      } else {
        currentChunk = '';
        const subChunks = splitLongSentence(sentence, maxChunkLength);
        for (const sub of subChunks) {
          chunks.push(sub);
        }
      }
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(c => c.length > 0);
}

/**
 * Helper to split a sentence longer than maxChunkLength into clause or word boundaries
 */
function splitLongSentence(sentence: string, maxChunkLength: number): string[] {
  // Try splitting by clause markers: comma, semicolon, colon, em-dash
  const clausePattern = /([,;:\-—]\s+)/;
  const parts = sentence.split(clausePattern);

  const stitchedClauses: string[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    const textPart = parts[i] || '';
    const punctPart = parts[i + 1] || '';
    const clause = (textPart + punctPart).trim();
    if (clause.length > 0) {
      stitchedClauses.push(clause);
    }
  }

  const result: string[] = [];
  let buf = '';

  for (const clause of stitchedClauses) {
    if (buf.length === 0) {
      if (clause.length <= maxChunkLength) {
        buf = clause;
      } else {
        // Fallback: split by words
        const words = clause.split(/\s+/);
        let wordBuf = '';
        for (const word of words) {
          if (wordBuf.length === 0) {
            wordBuf = word.slice(0, maxChunkLength);
          } else if (wordBuf.length + 1 + word.length <= maxChunkLength) {
            wordBuf += ' ' + word;
          } else {
            result.push(wordBuf.trim());
            wordBuf = word.slice(0, maxChunkLength);
          }
        }
        if (wordBuf.trim().length > 0) {
          buf = wordBuf.trim();
        }
      }
    } else if (buf.length + 1 + clause.length <= maxChunkLength) {
      buf += ' ' + clause;
    } else {
      result.push(buf.trim());
      buf = clause.length <= maxChunkLength ? clause : '';
      if (clause.length > maxChunkLength) {
        const words = clause.split(/\s+/);
        let wordBuf = '';
        for (const word of words) {
          if (wordBuf.length === 0) {
            wordBuf = word.slice(0, maxChunkLength);
          } else if (wordBuf.length + 1 + word.length <= maxChunkLength) {
            wordBuf += ' ' + word;
          } else {
            result.push(wordBuf.trim());
            wordBuf = word.slice(0, maxChunkLength);
          }
        }
        if (wordBuf.trim().length > 0) {
          buf = wordBuf.trim();
        }
      }
    }
  }

  if (buf.trim().length > 0) {
    result.push(buf.trim());
  }

  return result;
}

/**
 * Global registry anchor to prevent Chromium garbage collection of
 * active SpeechSynthesisUtterance objects mid-speech.
 */
declare global {
  interface Window {
    __novaSpeechRegistry?: SpeechSynthesisUtterance[];
  }
}

/**
 * Safe Browser Voice Briefing Player with chunk queueing, GC anchoring,
 * pause/resume, and safe cleanup on component unmount.
 */
export class VoiceBriefingPlayer {
  private chunks: string[] = [];
  private currentIndex: number = 0;
  private isPlaying: boolean = false;
  private isCancelled: boolean = false;
  private options: VoiceBriefingOptions;
  private onStateChange?: (state: VoiceSessionState) => void;

  constructor(chunks: string[], options?: VoiceBriefingOptions, onStateChange?: (state: VoiceSessionState) => void) {
    this.chunks = chunks;
    this.options = {
      rate: 1.05,
      pitch: 1.0,
      volume: 1.0,
      lang: 'en-US',
      ...options,
    };
    this.onStateChange = onStateChange;
  }

  public isAvailable(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  }

  public play(): void {
    if (!this.isAvailable() || this.chunks.length === 0) {
      this.notify(false, false);
      return;
    }

    this.isCancelled = false;
    this.isPlaying = true;

    // Reset synthesizer queue
    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    // Initialize GC registry
    if (typeof window !== 'undefined') {
      window.__novaSpeechRegistry = [];
    }

    this.speakCurrentChunk();
  }

  public stop(): void {
    this.isCancelled = true;
    this.isPlaying = false;
    this.currentIndex = 0;

    if (this.isAvailable()) {
      window.speechSynthesis.cancel();
      if (window.__novaSpeechRegistry) {
        window.__novaSpeechRegistry = [];
      }
    }

    this.notify(false, false);
  }

  private speakCurrentChunk(): void {
    if (this.isCancelled || !this.isPlaying || this.currentIndex >= this.chunks.length) {
      this.isPlaying = false;
      this.notify(false, false);
      return;
    }

    const chunkText = this.chunks[this.currentIndex];
    const utterance = new SpeechSynthesisUtterance(chunkText);
    utterance.rate = this.options.rate || 1.05;
    utterance.pitch = this.options.pitch || 1.0;
    utterance.volume = this.options.volume || 1.0;
    utterance.lang = this.options.lang || 'en-US';

    // Retain reference to prevent GC bug in Chromium
    if (typeof window !== 'undefined' && window.__novaSpeechRegistry) {
      window.__novaSpeechRegistry.push(utterance);
    }

    utterance.onend = () => {
      if (this.isCancelled) return;
      this.currentIndex++;
      this.notify(true, false);
      if (this.currentIndex < this.chunks.length) {
        this.speakCurrentChunk();
      } else {
        this.isPlaying = false;
        this.notify(false, false);
      }
    };

    utterance.onerror = (e) => {
      // Ignore user-initiated cancellation errors
      if (e.error === 'canceled' || e.error === 'interrupted') return;
      this.isPlaying = false;
      this.notify(false, false);
    };

    this.notify(true, false);
    window.speechSynthesis.speak(utterance);
  }

  private notify(playing: boolean, paused: boolean): void {
    if (this.onStateChange) {
      const total = this.chunks.length;
      const progress = total > 0 ? Math.min(100, Math.round((this.currentIndex / total) * 100)) : 0;
      this.onStateChange({
        isPlaying: playing,
        isPaused: paused,
        currentChunkIndex: this.currentIndex,
        totalChunks: total,
        progressPercent: progress,
      });
    }
  }
}
