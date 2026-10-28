/**
 * Client-side Voice Interface & Audio Overview Module
 * Speech-to-Text (Speech Recognition) and Text-to-Speech (Speech Synthesis)
 * with zero external dependencies.
 */

export interface SpeechRecognizerCallbacks {
  onResult: (text: string, isFinal: boolean) => void;
  onError?: (err: string) => void;
  onEnd?: () => void;
}

export interface SpeechRecognizer {
  stop: () => void;
  isListening: () => boolean;
}

export interface AudioBriefingOptions {
  rate?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onBoundary?: (charIndex: number) => void;
  onChunkChange?: (chunkIndex: number, totalChunks: number) => void;
  onError?: (err: string) => void;
}

export interface AudioBriefingController {
  play: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setRate: (rate: number) => void;
  getStatus: () => {
    isPlaying: boolean;
    isPaused: boolean;
    currentChunk: number;
    totalChunks: number;
    cleanedText: string;
    rate: number;
  };
}

// Browser Web Speech Recognition typing subset
interface SpeechRecognitionResultItem {
  transcript: string;
  confidence?: number;
}

interface SpeechRecognitionResultLike {
  readonly length: number;
  [index: number]: SpeechRecognitionResultItem;
  isFinal: boolean;
}

interface SpeechRecognitionResultListLike {
  readonly length: number;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

interface SpeechWindow {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

// Retain active utterance references to prevent Chrome garbage-collection cutoffs
const activeSpeechUtterances = new Set<SpeechSynthesisUtterance>();

/**
 * Checks whether SpeechRecognition or webkitSpeechRecognition is available in the browser.
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  const win = window as unknown as SpeechWindow;
  return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
}

/**
 * Checks whether SpeechSynthesis is available in the browser.
 */
export function isSpeechSynthesisSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    typeof window.speechSynthesis !== "undefined" &&
    typeof SpeechSynthesisUtterance !== "undefined"
  );
}

/**
 * Strips markdown formatting, citations, code blocks, raw URLs, and HTML
 * to produce clean, natural text suitable for Text-to-Speech.
 */
export function cleanMarkdownForSpeech(text: string): string {
  if (!text) return "";

  let cleaned = text;

  // 1. Remove fenced code blocks (```...```)
  cleaned = cleaned.replace(/```[\s\S]*?```/g, " ");

  // 2. Remove inline code backticks (`code` -> code)
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");

  // 3. Remove image tags (![alt](url))
  cleaned = cleaned.replace(/!\[([^\]]*)\]\([^)]*\)/g, " ");

  // 4. Transform links: [anchor](url) -> anchor
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");

  // 5. Remove citations like [1], [2, 3], [1][2], [note]
  cleaned = cleaned.replace(
    /\[(?:\d+|[a-zA-Z\-_]+)(?:,\s*(?:\d+|[a-zA-Z\-_]+))*\]/g,
    " ",
  );

  // 6. Remove raw URLs
  cleaned = cleaned.replace(/https?:\/\/[^\s)]+/g, " ");

  // 7. Remove markdown headers (# Title -> Title)
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, " ");

  // 8. Remove blockquote markers (> quote -> quote)
  cleaned = cleaned.replace(/^>\s+/gm, " ");

  // 9. Remove bullet list markers (*, -, +) at start of lines
  cleaned = cleaned.replace(/^[\s]*[-*+]\s+/gm, " ");

  // 10. Remove bold, italic, strikethrough (**, *, __, _, ~~)
  cleaned = cleaned.replace(/(\*\*|__)(.*?)\1/g, "$2");
  cleaned = cleaned.replace(/(\*|_)(.*?)\1/g, "$2");
  cleaned = cleaned.replace(/~~(.*?)~~/g, "$1");

  // 11. Remove HTML tags (<tag ...>...</tag> or <tag />)
  cleaned = cleaned.replace(/<[^>]+>/g, " ");

  // 12. Remove horizontal rules (---, ***, ___)
  cleaned = cleaned.replace(/^[-*_]{3,}\s*$/gm, " ");

  // 13. Remove table pipes |
  cleaned = cleaned.replace(/\|/g, " ");

  // 14. Collapse multiple spaces and trim
  cleaned = cleaned.replace(/[ \t]+/g, " ");
  cleaned = cleaned.replace(/\n\s*\n+/g, "\n");
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Splits text into natural sentence batches under maxChunkLength (default: 200 chars)
 * to avoid Web Speech API utterance cutoffs in Chrome and Safari.
 */
export function splitIntoSpeechChunks(
  text: string,
  maxChunkLength: number = 200,
): string[] {
  if (!text || !text.trim()) return [];

  // Split into raw sentences using punctuation delimiters while preserving them
  const rawSentences = text
    .split(/(?<=[.?!;:\n])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of rawSentences) {
    if (sentence.length > maxChunkLength) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }

      // Break long sentences by clauses (commas)
      const clauses = sentence
        .split(/(?<=[,])\s+/)
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      for (const clause of clauses) {
        if (clause.length > maxChunkLength) {
          // Break by words as last resort
          const words = clause.split(/\s+/);
          let wordChunk = "";
          for (const word of words) {
            if ((wordChunk + " " + word).trim().length <= maxChunkLength) {
              wordChunk = (wordChunk + " " + word).trim();
            } else {
              if (wordChunk) chunks.push(wordChunk);
              wordChunk = word;
            }
          }
          if (wordChunk) chunks.push(wordChunk);
        } else {
          if ((currentChunk + " " + clause).trim().length <= maxChunkLength) {
            currentChunk = currentChunk ? `${currentChunk} ${clause}` : clause;
          } else {
            if (currentChunk) chunks.push(currentChunk);
            currentChunk = clause;
          }
        }
      }
    } else {
      if ((currentChunk + " " + sentence).trim().length <= maxChunkLength) {
        currentChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
      } else {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = sentence;
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Creates and starts standard speech recognizer with continuous listening.
 * Returns a controller with a clean stop function.
 */
export function createSpeechRecognizer(
  callbacks: SpeechRecognizerCallbacks,
): SpeechRecognizer {
  if (!isSpeechRecognitionSupported()) {
    callbacks.onError?.("Speech recognition is not supported in this browser.");
    return {
      stop: () => {},
      isListening: () => false,
    };
  }

  const win = window as unknown as SpeechWindow;
  const SpeechCtor = win.SpeechRecognition || win.webkitSpeechRecognition;

  if (!SpeechCtor) {
    callbacks.onError?.("Speech recognition constructor unavailable.");
    return {
      stop: () => {},
      isListening: () => false,
    };
  }

  let listening = true;
  let recognition: SpeechRecognitionInstance | null = null;

  try {
    recognition = new SpeechCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      if (!listening) return;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const transcript = res[0]?.transcript || "";
        if (transcript) {
          callbacks.onResult(transcript, Boolean(res.isFinal));
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      const errorMsg = event.error || "Unknown speech recognition error";
      // Ignore user-aborted or standard no-speech events from reporting fatal errors
      if (errorMsg !== "aborted" && errorMsg !== "no-speech") {
        callbacks.onError?.(errorMsg);
      }
    };

    recognition.onend = () => {
      listening = false;
      callbacks.onEnd?.();
    };

    recognition.start();
  } catch (err: unknown) {
    listening = false;
    const msg = err instanceof Error ? err.message : String(err);
    callbacks.onError?.(msg);
  }

  return {
    stop: () => {
      if (!listening && !recognition) return;
      listening = false;
      try {
        recognition?.stop();
      } catch {
        // Ignored
      }
      callbacks.onEnd?.();
    },
    isListening: () => listening,
  };
}

/**
 * Creates an audio overview briefing from markdown text.
 * Cleans tags, chunks sentences, and provides play/pause/resume/stop/setRate controls.
 */
export function createAudioBriefing(
  text: string,
  options?: AudioBriefingOptions,
): AudioBriefingController {
  const cleanedText = cleanMarkdownForSpeech(text);
  const chunks = splitIntoSpeechChunks(cleanedText);

  let currentChunkIndex = 0;
  let currentRate = options?.rate ?? 1.0;
  let isPlaying = false;
  let isPaused = false;
  let isStopped = false;

  const speakChunk = (index: number) => {
    if (isStopped || index >= chunks.length) {
      isPlaying = false;
      isPaused = false;
      options?.onEnd?.();
      return;
    }

    currentChunkIndex = index;
    options?.onChunkChange?.(index, chunks.length);

    if (!isSpeechSynthesisSupported()) {
      options?.onError?.("Speech synthesis not supported in this browser.");
      isPlaying = false;
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      utterance.rate = currentRate;

      utterance.onboundary = (e) => {
        options?.onBoundary?.(e.charIndex);
      };

      utterance.onend = () => {
        activeSpeechUtterances.delete(utterance);
        if (!isStopped && !isPaused) {
          speakChunk(index + 1);
        }
      };

      utterance.onerror = (e) => {
        activeSpeechUtterances.delete(utterance);
        // Canceled or interrupted occurs on pause / stop
        if (e.error === "canceled" || e.error === "interrupted") return;
        options?.onError?.(e.error || "Speech synthesis error");
        if (!isStopped) {
          speakChunk(index + 1);
        }
      };

      activeSpeechUtterances.add(utterance);
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      options?.onError?.(msg);
      isPlaying = false;
    }
  };

  return {
    play: () => {
      if (!isSpeechSynthesisSupported()) {
        options?.onError?.("Speech synthesis not supported in this browser.");
        return;
      }

      if (isPlaying && isPaused) {
        isPaused = false;
        window.speechSynthesis.resume();
        return;
      }

      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignored
      }

      isStopped = false;
      isPaused = false;
      isPlaying = true;
      currentChunkIndex = 0;

      options?.onStart?.();

      if (chunks.length === 0) {
        isPlaying = false;
        options?.onEnd?.();
        return;
      }

      speakChunk(0);
    },

    pause: () => {
      if (!isSpeechSynthesisSupported()) return;
      if (isPlaying && !isPaused) {
        isPaused = true;
        try {
          window.speechSynthesis.pause();
        } catch {
          // Ignored
        }
      }
    },

    resume: () => {
      if (!isSpeechSynthesisSupported()) return;
      if (isPlaying && isPaused) {
        isPaused = false;
        try {
          window.speechSynthesis.resume();
        } catch {
          // Ignored
        }
      }
    },

    stop: () => {
      isStopped = true;
      isPlaying = false;
      isPaused = false;
      activeSpeechUtterances.clear();
      if (isSpeechSynthesisSupported()) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // Ignored
        }
      }
      options?.onEnd?.();
    },

    setRate: (rate: number) => {
      currentRate = rate;
      // If currently playing, restart current chunk at new rate
      if (isPlaying && !isPaused && isSpeechSynthesisSupported()) {
        try {
          window.speechSynthesis.cancel();
          speakChunk(currentChunkIndex);
        } catch {
          // Ignored
        }
      }
    },

    getStatus: () => ({
      isPlaying,
      isPaused,
      currentChunk: currentChunkIndex,
      totalChunks: chunks.length,
      cleanedText,
      rate: currentRate,
    }),
  };
}
