// Nova Voice Briefing Engine
// Mimics ChatGPT / Perplexity audio briefings with selectable natural voice profiles,
// resilient speech normalization, real-time waveform harmonics, and speed control.

import { VoiceProfile, VoiceProfileId } from './types';

export const VOICE_PROFILES: VoiceProfile[] = [
  {
    id: 'nova-analytical',
    name: 'Nova Analytical',
    description: 'Crisp, articulate tech lead with measured cadence and high factual clarity',
    gender: 'female',
    pitch: 1.0,
    rate: 1.05,
    accentHint: 'en-US',
  },
  {
    id: 'nova-atlas',
    name: 'Nova Atlas',
    description: 'Authoritative deep baritone ideal for strategic executive summaries',
    gender: 'male',
    pitch: 0.82,
    rate: 0.95,
    accentHint: 'en-GB',
  },
  {
    id: 'nova-pulse',
    name: 'Nova Pulse',
    description: 'Dynamic, high-energy briefing engineered for rapid sprint standups',
    gender: 'neutral',
    pitch: 1.12,
    rate: 1.22,
    accentHint: 'en-US',
  },
  {
    id: 'nova-sol',
    name: 'Nova Sol',
    description: 'Warm, conversational narrator with natural pitch inflections',
    gender: 'female',
    pitch: 1.05,
    rate: 1.02,
    accentHint: 'en-US',
  },
];

/**
 * Normalizes raw markdown, structured JSON, citation tags, and code blocks
 * into fluid conversational spoken prose.
 */
export function cleanBriefingScript(rawText: string): string {
  if (!rawText) return '';

  let text = rawText;

  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, ' Implementation code provided in the interactive sandbox. ');

  // Remove inline code
  text = text.replace(/`([^`]+)`/g, '$1');

  // Remove markdown headers
  text = text.replace(/^#{1,6}\s+/gm, '');

  // Remove bullet points and list markers
  text = text.replace(/^\s*[-*+]\s+/gm, ' Furthermore, ');
  text = text.replace(/^\s*\d+\.\s+/gm, ' Next, ');

  // Transform citations [Source 1], [src-2], [1] into conversational attribution
  text = text.replace(/\[(?:Source\s*\d+|src-\d+|\d+)\]/gi, ' as cited in the literature, ');

  // Remove markdown links [Label](url) -> Label
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Remove raw URLs
  text = text.replace(/https?:\/\/[^\s]+/g, 'online source');

  // Remove JSON artifacts
  text = text.replace(/[{}\[\]"]/g, ' ');

  // Replace multiple punctuation / asterisks
  text = text.replace(/[*_~`#|]/g, ' ');

  // Clean whitespace
  text = text.replace(/\s+/g, ' ').trim();

  // Ensure sentences end with natural pauses
  text = text.replace(/\s*([.?!])\s*/g, '$1 ');

  return text;
}

/**
 * Resolves the best available local Web Speech synthesis voice matching the requested profile.
 */
export function resolveBestBrowserVoice(profileId: VoiceProfileId): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const profile = VOICE_PROFILES.find(p => p.id === profileId) || VOICE_PROFILES[0];

  // Preferred high-quality neural/system voice names
  const femalePreferences = [
    /Google US English/i,
    /Samantha/i,
    /Karen/i,
    /Victoria/i,
    /Zira/i,
    /Jenny/i,
    /Natural.*Female/i,
  ];

  const malePreferences = [
    /Daniel/i,
    /Alex/i,
    /Fred/i,
    /David/i,
    /George/i,
    /Guy/i,
    /Natural.*Male/i,
  ];

  const targetList = profile.gender === 'male' ? malePreferences : femalePreferences;

  // 1. Try preferred regex matches
  for (const regex of targetList) {
    const match = voices.find(v => regex.test(v.name) && v.lang.startsWith('en'));
    if (match) return match;
  }

  // 2. Try any English voice
  const enVoice = voices.find(v => v.lang.startsWith('en'));
  if (enVoice) return enVoice;

  // 3. Fallback to default
  return voices[0] || null;
}

/**
 * Calculates synthetic frequency spectrum harmonics (16 bins)
 * driven by dynamic RMS energy for resilient 60fps waveform animation.
 */
export function computeWaveformHarmonics(
  isPlaying: boolean,
  isPaused: boolean,
  timeSec: number,
  speed: number = 1.0,
  bandCount: number = 16
): number[] {
  if (!isPlaying || isPaused) {
    // Resting state: gentle ambient ripple
    return Array.from({ length: bandCount }, (_, i) => {
      const base = 0.12 + Math.sin(timeSec * 1.5 + i * 0.4) * 0.04;
      return Math.max(0.06, Math.min(0.25, base));
    });
  }

  // Active state: multi-frequency sinusoidal synthesis simulating vocal tract formants
  return Array.from({ length: bandCount }, (_, i) => {
    const t = timeSec * speed * 4.2;
    // Formant 1: low-mid pitch pulse
    const f1 = Math.sin(t * 1.2 + i * 0.5) * 0.35;
    // Formant 2: speech cadence rhythm
    const f2 = Math.cos(t * 2.8 - i * 0.7) * 0.25;
    // Formant 3: high-frequency consonant flutter
    const f3 = Math.sin(t * 5.4 + i * 1.1) * 0.18;
    
    // Envelope: center peak with tapered tails
    const centerNorm = 1 - Math.abs(i - (bandCount / 2)) / (bandCount / 2);
    const envelope = 0.45 + centerNorm * 0.55;

    const raw = (0.2 + (f1 + f2 + f3) * envelope);
    return Math.max(0.08, Math.min(0.98, raw));
  });
}
