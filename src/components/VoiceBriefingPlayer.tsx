'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Sliders, 
  Sparkles, 
  Flame, 
  Wind, 
  Zap, 
  ChevronDown, 
  Check, 
  Radio, 
  Headphones,
  AlertCircle
} from 'lucide-react';
import { sound } from '@/lib/sound';
import { prepareBriefingText, chunkUtteranceText } from '@/lib/voice-engine';

export type VoiceProfileKey = 'ember' | 'breeze' | 'pulse';

export interface VoiceProfileConfig {
  id: VoiceProfileKey;
  name: string;
  tagline: string;
  description: string;
  gender: 'male' | 'female' | 'dynamic';
  pitch: number;
  baseRate: number;
  icon: 'flame' | 'wind' | 'zap';
  colors: {
    primary: string;
    text: string;
    bg: string;
    border: string;
    ring: string;
    gradient: string;
    barColor: string;
    glow: string;
  };
  sampleText: string;
  voiceKeywords: string[];
}

export const VOICE_PROFILES: Record<VoiceProfileKey, VoiceProfileConfig> = {
  ember: {
    id: 'ember',
    name: 'Nova Ember',
    tagline: 'Deep, Confident & Executive',
    description: 'Executive briefing cadence with an authoritative, grounded presence.',
    gender: 'male',
    pitch: 0.88,
    baseRate: 1.0,
    icon: 'flame',
    colors: {
      primary: 'amber-400',
      text: 'text-amber-300',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      ring: 'ring-amber-500/40',
      gradient: 'from-amber-500 to-orange-400',
      barColor: '#f59e0b',
      glow: 'rgba(245, 158, 11, 0.25)',
    },
    sampleText: 'Welcome. I am Nova Ember, your executive intelligence briefing partner.',
    voiceKeywords: [
      'daniel', 'alex', 'david', 'aaron', 'arthur', 'oliver', 'guy', 'male', 'natural', 'george', 'fred'
    ],
  },
  breeze: {
    id: 'breeze',
    name: 'Nova Breeze',
    tagline: 'Warm, Clear & Calm Narrator',
    description: 'Smooth, natural cadence optimized for deep research comprehension and citations.',
    gender: 'female',
    pitch: 1.0,
    baseRate: 0.98,
    icon: 'wind',
    colors: {
      primary: 'teal-400',
      text: 'text-teal-300',
      bg: 'bg-teal-500/10',
      border: 'border-teal-500/30',
      ring: 'ring-teal-500/40',
      gradient: 'from-teal-400 to-emerald-400',
      barColor: '#14b8a6',
      glow: 'rgba(20, 184, 166, 0.25)',
    },
    sampleText: 'Greetings. I am Nova Breeze. Ready to walk through key findings and verified evidence.',
    voiceKeywords: [
      'samantha', 'victoria', 'karen', 'serena', 'moira', 'jenny', 'zira', 'female', 'google uk english female'
    ],
  },
  pulse: {
    id: 'pulse',
    name: 'Nova Pulse',
    tagline: 'Dynamic, Fast & Technical Lead',
    description: 'Crisp, articulate tempo tailored for rapid architecture deliberation and milestone plans.',
    gender: 'dynamic',
    pitch: 1.12,
    baseRate: 1.15,
    icon: 'zap',
    colors: {
      primary: 'indigo-400',
      text: 'text-indigo-300',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/30',
      ring: 'ring-indigo-500/40',
      gradient: 'from-indigo-400 to-cyan-400',
      barColor: '#818cf8',
      glow: 'rgba(129, 140, 248, 0.25)',
    },
    sampleText: 'Nova Pulse online. Let us break down technical trade-offs, constraints, and metrics.',
    voiceKeywords: [
      'rishi', 'junior', 'google us english', 'evan', 'eddy', 'standard', 'alva'
    ],
  },
};

/**
 * Splits text into clean, markdown-free sentences suitable for streaming utterance synthesis.
 * Uses natural sentence boundary delimiters for fluid clause-by-clause playback.
 */
export function chunkTextIntoSentences(text: string): string[] {
  if (!text) return [];
  const prepared = prepareBriefingText(text);
  if (!prepared) return [];
  const matches = prepared.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g);
  if (!matches) return [prepared];
  return matches.map(s => s.trim()).filter(s => s.length > 0);
}

/**
 * Heuristically finds the closest matching system voice based on profile preferences.
 */
function selectBestVoice(voices: SpeechSynthesisVoice[], profile: VoiceProfileConfig): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  const englishVoices = voices.filter(v => v.lang.toLowerCase().startsWith('en'));
  const pool = englishVoices.length > 0 ? englishVoices : voices;

  // 1. Try keyword match
  for (const kw of profile.voiceKeywords) {
    const match = pool.find(v => v.name.toLowerCase().includes(kw));
    if (match) return match;
  }

  // 2. Gender heuristics
  if (profile.gender === 'female') {
    const female = pool.find(v => /female|woman/i.test(v.name));
    if (female) return female;
  } else if (profile.gender === 'male') {
    const male = pool.find(v => /male|man/i.test(v.name));
    if (male) return male;
  }

  // 3. System default or first available
  return pool.find(v => v.default) || pool[0] || voices[0] || null;
}

export interface VoiceBriefingPlayerProps {
  title?: string;
  subtitle?: string;
  text?: string;
  rawBriefingText?: string;
  defaultProfile?: VoiceProfileKey;
  autoPlay?: boolean;
  className?: string;
  variant?: 'card' | 'inline' | 'compact';
  compact?: boolean;
  onStateChange?: (state: 'idle' | 'playing' | 'paused') => void;
  onClose?: () => void;
}

export function VoiceBriefingPlayer({
  title = 'Voice Intelligence Briefing',
  subtitle,
  text,
  rawBriefingText,
  defaultProfile = 'breeze',
  autoPlay = false,
  className = '',
  variant = 'card',
  compact = false,
  onStateChange,
  onClose,
}: VoiceBriefingPlayerProps) {
  const briefingContent = text || rawBriefingText || '';
  const [profileKey, setProfileKey] = useState<VoiceProfileKey>(defaultProfile);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number>(0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isVoiceDropdownOpen, setIsVoiceDropdownOpen] = useState<boolean>(false);
  const [auditioningProfile, setAuditioningProfile] = useState<VoiceProfileKey | null>(null);
  const [isToneFallbackActive, setIsToneFallbackActive] = useState<boolean>(false);

  // Dynamic waveform bars
  const NUM_BARS = 22;
  const [barHeights, setBarHeights] = useState<number[]>(() =>
    Array.from({ length: NUM_BARS }, () => 18)
  );

  const sentences = useMemo(() => chunkTextIntoSentences(briefingContent), [briefingContent]);
  const activeProfile = VOICE_PROFILES[profileKey];

  // Refs to prevent state capture in async callbacks
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  const currentSentenceRef = useRef(currentSentenceIndex);
  currentSentenceRef.current = currentSentenceIndex;
  const speedRef = useRef(playbackSpeed);
  speedRef.current = playbackSpeed;
  const profileKeyRef = useRef(profileKey);
  profileKeyRef.current = profileKey;
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;
  const voicesRef = useRef(voices);
  voicesRef.current = voices;
  const sentencesRef = useRef(sentences);
  sentencesRef.current = sentences;

  const animationFrameRef = useRef<number | null>(null);
  const fallbackAudioCtxRef = useRef<AudioContext | null>(null);

  // Synchronize voices on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsToneFallbackActive(true);
      return;
    }

    const updateVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        setVoices(v);
        voicesRef.current = v;
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Notify parent of state change
  useEffect(() => {
    if (onStateChange) {
      if (isPlaying) onStateChange('playing');
      else if (isPaused) onStateChange('paused');
      else onStateChange('idle');
    }
  }, [isPlaying, isPaused, onStateChange]);

  // Clean unmount - absolutely guarantee runaway speech is killed
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (fallbackAudioCtxRef.current) {
        try {
          fallbackAudioCtxRef.current.close();
        } catch {}
      }
    };
  }, []);

  // Procedural waveform visualizer engine
  useEffect(() => {
    if (!isPlaying) {
      // Settle down to gentle baseline
      const timer = setTimeout(() => {
        setBarHeights(Array.from({ length: NUM_BARS }, () => 18));
      }, 150);
      return () => clearTimeout(timer);
    }

    let lastTick = performance.now();
    const animateWaveform = (now: number) => {
      if (now - lastTick > 45) { // ~22 FPS bar fluctuation for silky organic feel
        lastTick = now;
        const center = (NUM_BARS - 1) / 2;
        const newHeights = Array.from({ length: NUM_BARS }, (_, idx) => {
          const distFromCenter = Math.abs(idx - center);
          // Bell curve distribution: higher in the middle
          const envelope = Math.max(0.3, 1 - (distFromCenter / (center + 1.5)) * 0.7);
          const jitter = 0.35 + Math.random() * 0.65;
          return Math.min(100, Math.max(16, Math.round(envelope * jitter * 100)));
        });
        setBarHeights(newHeights);
      }
      animationFrameRef.current = requestAnimationFrame(animateWaveform);
    };

    animationFrameRef.current = requestAnimationFrame(animateWaveform);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying]);

  // Web Audio API Fallback Tone Generator
  const playFallbackToneBriefing = useCallback((onEnd: () => void) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        onEnd();
        return;
      }
      const ctx = new AudioCtx();
      fallbackAudioCtxRef.current = ctx;

      const chords = [
        [523.25, 659.25, 783.99], // C5
        [587.33, 739.99, 880.00], // D5
        [659.25, 830.61, 987.77], // E5
        [523.25, 659.25, 783.99]  // C5 cadence
      ];

      let step = 0;
      const interval = setInterval(() => {
        if (!isPlayingRef.current || step >= chords.length) {
          clearInterval(interval);
          setTimeout(() => {
            try { ctx.close(); } catch {}
            onEnd();
          }, 400);
          return;
        }

        const chord = chords[step];
        chord.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          gain.gain.setValueAtTime(0.025, ctx.currentTime + i * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.05);
          osc.stop(ctx.currentTime + 0.38);
        });

        setCurrentSentenceIndex(prev => Math.min(sentencesRef.current.length - 1, prev + 1));
        step++;
      }, 500);
    } catch {
      onEnd();
    }
  }, []);

  // Utterance playback logic
  const speakSentence = useCallback((index: number) => {
    const list = sentencesRef.current;
    if (index >= list.length) {
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentSentenceIndex(0);
      sound.playSuccess();
      return;
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      // Trigger Web Audio fallback
      setIsToneFallbackActive(true);
      playFallbackToneBriefing(() => {
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentSentenceIndex(0);
      });
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const currentText = list[index];
      const utterance = new SpeechSynthesisUtterance(currentText);

      const profile = VOICE_PROFILES[profileKeyRef.current];
      const matchedVoice = selectBestVoice(voicesRef.current, profile);
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
      utterance.pitch = profile.pitch;
      utterance.rate = speedRef.current * profile.baseRate;
      utterance.volume = isMutedRef.current ? 0 : 1;

      utterance.onend = () => {
        if (!isPausedRef.current && isPlayingRef.current) {
          const nextIdx = index + 1;
          setCurrentSentenceIndex(nextIdx);
          speakSentence(nextIdx);
        }
      };

      utterance.onerror = (e) => {
        // If canceled or interrupted by user, ignore
        if (e.error === 'canceled' || e.error === 'interrupted') return;
        console.warn('SpeechSynthesis error:', e.error);
        setIsToneFallbackActive(true);
        // Fallback to tone if speech API fails
        playFallbackToneBriefing(() => {
          setIsPlaying(false);
          setIsPaused(false);
          setCurrentSentenceIndex(0);
        });
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('SpeechSynthesis speak failed:', err);
      setIsToneFallbackActive(true);
      playFallbackToneBriefing(() => {
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentSentenceIndex(0);
      });
    }
  }, [playFallbackToneBriefing]);

  const handlePlay = useCallback(() => {
    sound.tap();
    if (isPaused) {
      setIsPaused(false);
      setIsPlaying(true);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      } else {
        speakSentence(currentSentenceIndex);
      }
    } else {
      setIsPlaying(true);
      setIsPaused(false);
      speakSentence(currentSentenceIndex);
    }
  }, [isPaused, currentSentenceIndex, speakSentence]);

  const handlePause = useCallback(() => {
    sound.tap();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
    setIsPlaying(false);
    setIsPaused(true);
  }, []);

  const handleReplay = useCallback(() => {
    sound.tap();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setCurrentSentenceIndex(0);
    setIsPaused(false);
    setIsPlaying(true);
    setTimeout(() => {
      speakSentence(0);
    }, 60);
  }, [speakSentence]);

  const handleStop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentSentenceIndex(0);
  }, []);

  const handleSpeedToggle = (newSpeed: number) => {
    sound.tap();
    setPlaybackSpeed(newSpeed);
    speedRef.current = newSpeed;
    if (isPlaying) {
      // Re-trigger current sentence with updated speed
      speakSentence(currentSentenceIndex);
    }
  };

  const handleMuteToggle = () => {
    sound.tap();
    setIsMuted(prev => !prev);
    isMutedRef.current = !isMuted;
  };

  const handleSelectProfile = (key: VoiceProfileKey) => {
    sound.tap();
    setProfileKey(key);
    profileKeyRef.current = key;
    setIsVoiceDropdownOpen(false);
    if (isPlaying) {
      // Seamlessly switch to new voice persona on current sentence
      speakSentence(currentSentenceIndex);
    }
  };

  const handleAuditionProfile = (key: VoiceProfileKey, e: React.MouseEvent) => {
    e.stopPropagation();
    sound.tap();
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    setAuditioningProfile(key);

    const profile = VOICE_PROFILES[key];
    const utterance = new SpeechSynthesisUtterance(profile.sampleText);
    const matchedVoice = selectBestVoice(voicesRef.current, profile);
    if (matchedVoice) utterance.voice = matchedVoice;
    utterance.pitch = profile.pitch;
    utterance.rate = profile.baseRate;

    utterance.onend = () => setAuditioningProfile(null);
    utterance.onerror = () => setAuditioningProfile(null);

    window.speechSynthesis.speak(utterance);
  };

  const handleSeekSentence = (targetIdx: number) => {
    sound.tap();
    const clamped = Math.max(0, Math.min(sentences.length - 1, targetIdx));
    setCurrentSentenceIndex(clamped);
    if (isPlaying) {
      speakSentence(clamped);
    }
  };

  // Autoplay trigger
  useEffect(() => {
    if (autoPlay && sentences.length > 0 && !isPlaying && !isPaused) {
      handlePlay();
    }
  }, [autoPlay, handlePlay, isPaused, isPlaying, sentences.length]);

  const progressFraction = sentences.length > 0
    ? Math.min(1, (currentSentenceIndex + 1) / sentences.length)
    : 0;

  // Approximate remaining time (assuming ~140 wpm at 1.0x)
  const remainingWords = useMemo(() => {
    return sentences.slice(currentSentenceIndex).reduce((acc, s) => acc + s.split(' ').length, 0);
  }, [sentences, currentSentenceIndex]);

  const estimatedSecondsLeft = Math.max(2, Math.round((remainingWords / (145 * playbackSpeed)) * 60));
  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const renderVoiceIcon = (iconName: 'flame' | 'wind' | 'zap', className = 'w-4 h-4') => {
    switch (iconName) {
      case 'flame': return <Flame className={className} />;
      case 'wind': return <Wind className={className} />;
      case 'zap': return <Zap className={className} />;
    }
  };

  return (
    <div className={`relative w-full rounded-xl border border-slate-700/80 bg-slate-950/80 backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-300 ${className}`}>
      {/* Ambient background glow matching active voice persona */}
      <div 
        className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-20 transition-all duration-500"
        style={{ backgroundColor: activeProfile.colors.barColor }}
      />

      {/* Main Bar Content */}
      <div className="p-4 flex flex-col gap-3">
        {/* Top row: Title, Voice Personality Pill, Telemetry, Close */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg border ${activeProfile.colors.bg} ${activeProfile.colors.border} ${activeProfile.colors.text}`}>
              <Headphones className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-100 leading-tight">
                  {title}
                </span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                  Speech Synthesizer
                </span>
              </div>
              {subtitle && (
                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Voice Persona Dropdown Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsVoiceDropdownOpen(prev => !prev)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${activeProfile.colors.bg} ${activeProfile.colors.border} ${activeProfile.colors.text} hover:brightness-110`}
                title="Change Voice Profile"
              >
                {renderVoiceIcon(activeProfile.icon, 'w-3.5 h-3.5')}
                <span className="font-semibold">{activeProfile.name}</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isVoiceDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Voice Persona Selection Dropdown */}
              {isVoiceDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsVoiceDropdownOpen(false)} 
                  />
                  <div className="absolute right-0 top-full mt-2 w-72 p-2 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl z-50 space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-2 py-1 border-b border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Voice Personalities
                      </span>
                      <span className="text-[10px] font-mono text-teal-400">Natural Models</span>
                    </div>

                    {(Object.keys(VOICE_PROFILES) as VoiceProfileKey[]).map(key => {
                      const profile = VOICE_PROFILES[key];
                      const isSelected = profileKey === key;
                      const isAuditioning = auditioningProfile === key;

                      return (
                        <div
                          key={key}
                          onClick={() => handleSelectProfile(key)}
                          className={`p-2.5 rounded-lg border transition cursor-pointer flex items-start justify-between gap-2 ${
                            isSelected
                              ? `${profile.colors.bg} ${profile.colors.border} text-slate-100`
                              : 'border-slate-800 bg-slate-950/60 hover:bg-slate-800/60 text-slate-300'
                          }`}
                        >
                          <div className="flex items-start gap-2 min-w-0">
                            <div className={`mt-0.5 p-1 rounded ${profile.colors.text}`}>
                              {renderVoiceIcon(profile.icon, 'w-3.5 h-3.5')}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold">{profile.name}</span>
                                {isSelected && (
                                  <span className="text-[9.5px] px-1 py-0.2 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 font-mono">
                                    Active
                                  </span>
                                )}
                              </div>
                              <p className="text-[10.5px] text-slate-400 line-clamp-1 mt-0.5">
                                {profile.tagline}
                              </p>
                            </div>
                          </div>

                          {/* Preview Audition Button */}
                          <button
                            type="button"
                            onClick={(e) => handleAuditionProfile(key, e)}
                            className={`p-1.5 rounded-md text-[10px] border transition flex items-center gap-1 ${
                              isAuditioning
                                ? 'bg-teal-500 text-slate-950 font-bold border-teal-400 animate-pulse'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                            }`}
                            title="Audition voice sample"
                          >
                            <Play className="w-2.5 h-2.5 fill-current" />
                            <span>Sample</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Close button if provided */}
            {onClose && (
              <button
                onClick={() => { handleStop(); onClose(); }}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                title="Close voice briefing bar"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Center Row: Pulsing Ring + Play/Pause Controls + Waveform + Speed */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-3">
            {/* Play/Pause Button with Pulsing Ripple Ring */}
            <div className="relative flex items-center justify-center">
              {isPlaying && (
                <>
                  <span 
                    className="absolute -inset-1.5 rounded-full animate-ping opacity-75 pointer-events-none"
                    style={{ backgroundColor: activeProfile.colors.barColor }}
                  />
                  <span 
                    className="absolute -inset-3 rounded-full animate-pulse opacity-40 pointer-events-none"
                    style={{ backgroundColor: activeProfile.colors.barColor }}
                  />
                </>
              )}

              <button
                type="button"
                onClick={isPlaying ? handlePause : handlePlay}
                className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
                  isPlaying
                    ? `bg-gradient-to-tr ${activeProfile.colors.gradient} text-slate-950 font-bold ring-2 ${activeProfile.colors.ring}`
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
                }`}
                title={isPlaying ? 'Pause briefing' : 'Play briefing'}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>
            </div>

            {/* Replay Button */}
            <button
              type="button"
              onClick={handleReplay}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition"
              title="Restart from beginning"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Mute/Unmute */}
            <button
              type="button"
              onClick={handleMuteToggle}
              className={`p-2 rounded-lg border transition ${
                isMuted
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
              title={isMuted ? 'Unmute' : 'Mute audio'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Dancing Audio Frequency Waveform Visualizer */}
          <div className="flex-1 min-w-[140px] max-w-sm flex items-center gap-1 h-8 px-3 rounded-lg bg-slate-900/70 border border-slate-800/80">
            {barHeights.map((height, idx) => {
              const isPast = idx / NUM_BARS <= progressFraction;
              return (
                <div
                  key={idx}
                  className="flex-1 rounded-full transition-all duration-100 ease-out"
                  style={{
                    height: `${height}%`,
                    backgroundColor: isPast || isPlaying ? activeProfile.colors.barColor : '#475569',
                    opacity: isPlaying ? 0.95 : isPast ? 0.6 : 0.3,
                  }}
                />
              );
            })}
          </div>

          {/* Speed Toggles */}
          <div className="flex items-center gap-1 bg-slate-900/80 rounded-lg p-1 border border-slate-800">
            {[1.0, 1.25, 1.5].map(spd => (
              <button
                key={spd}
                type="button"
                onClick={() => handleSpeedToggle(spd)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                  playbackSpeed === spd
                    ? `${activeProfile.colors.bg} ${activeProfile.colors.text} font-bold border ${activeProfile.colors.border}`
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Live Subtitle Transcript & Progress Scrubber */}
        <div className="space-y-1.5 pt-1 border-t border-slate-800/60">
          <div className="flex items-center justify-between text-[10.5px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              <span>Clause {Math.min(sentences.length, currentSentenceIndex + 1)} / {sentences.length}</span>
            </span>
            <span>~{formatTime(estimatedSecondsLeft)} remaining</span>
          </div>

          {/* Clickable Progress Bar */}
          <div 
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickFraction = (e.clientX - rect.left) / rect.width;
              const targetIdx = Math.floor(clickFraction * sentences.length);
              handleSeekSentence(targetIdx);
            }}
            className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden cursor-pointer group"
            title="Click to seek"
          >
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${progressFraction * 100}%`,
                backgroundColor: activeProfile.colors.barColor,
              }}
            />
          </div>

          {/* Spoken sentence snippet */}
          <p className="text-xs text-slate-300 italic line-clamp-1 leading-snug">
            &ldquo;{sentences[currentSentenceIndex] || 'Select play to begin voice briefing'}&rdquo;
          </p>
        </div>

        {/* Fallback tone notification if Web Speech is unavailable */}
        {isToneFallbackActive && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            <span>Tone synthesizer fallback active (Web Speech API restricted in this environment).</span>
          </div>
        )}
      </div>
    </div>
  );
}
