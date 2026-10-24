import { describe, expect, it } from 'bun:test';
import { 
  VOICE_PROFILES, 
  chunkTextIntoSentences,
  VoiceProfileKey 
} from '../src/components/VoiceBriefingPlayer';

describe('Voice Briefing Engine - ChatGPT & Perplexity Fidelity', () => {

  describe('Voice Personality Profiles', () => {
    it('should configure "Nova Ember" as deep, confident executive cadence', () => {
      const ember = VOICE_PROFILES['ember'];
      expect(ember).toBeDefined();
      expect(ember.name).toBe('Nova Ember');
      expect(ember.tagline).toContain('Executive');
      expect(ember.pitch).toBeLessThan(1.0); // Deeper pitch
      expect(ember.icon).toBe('flame');
      expect(ember.colors.primary).toContain('amber');
      expect(ember.sampleText).toContain('Nova Ember');
    });

    it('should configure "Nova Breeze" as warm, clear calm narrator', () => {
      const breeze = VOICE_PROFILES['breeze'];
      expect(breeze).toBeDefined();
      expect(breeze.name).toBe('Nova Breeze');
      expect(breeze.tagline).toContain('Calm Narrator');
      expect(breeze.pitch).toBe(1.0); // Natural, clear pitch
      expect(breeze.icon).toBe('wind');
      expect(breeze.colors.primary).toContain('teal');
      expect(breeze.sampleText).toContain('Nova Breeze');
    });

    it('should configure "Nova Pulse" as dynamic, fast technical lead', () => {
      const pulse = VOICE_PROFILES['pulse'];
      expect(pulse).toBeDefined();
      expect(pulse.name).toBe('Nova Pulse');
      expect(pulse.tagline).toContain('Technical Lead');
      expect(pulse.pitch).toBeGreaterThan(1.0); // Crisp, alert
      expect(pulse.baseRate).toBeGreaterThan(1.0); // Faster tempo
      expect(pulse.icon).toBe('zap');
      expect(pulse.colors.primary).toContain('indigo');
      expect(pulse.sampleText).toContain('Nova Pulse');
    });
  });

  describe('Sentence Chunking & Markdown Sanitization', () => {
    it('should strip markdown bold, italic, code markers and headers', () => {
      const markdown = '# Strategic Briefing\n\n**Finding 1**: The *system* operates at sub-50ms latency with `zero-copy` memory.';
      const chunks = chunkTextIntoSentences(markdown);
      expect(chunks.length).toBeGreaterThan(0);
      const fullText = chunks.join(' ');
      expect(fullText).not.toContain('#');
      expect(fullText).not.toContain('**');
      expect(fullText).not.toContain('*');
      expect(fullText).not.toContain('`');
      expect(fullText).toContain('Strategic Briefing');
      expect(fullText).toContain('zero-copy memory');
    });

    it('should strip markdown links and retain anchor text for natural speech', () => {
      const input = 'Refer to [Architecture Documentation](https://nova.ai/docs) for deployment specs.';
      const chunks = chunkTextIntoSentences(input);
      expect(chunks.length).toBe(1);
      expect(chunks[0]).toContain('Architecture Documentation');
      expect(chunks[0]).not.toContain('https://nova.ai/docs');
      expect(chunks[0]).not.toContain('[');
      expect(chunks[0]).not.toContain(']');
    });

    it('should break text into natural sentence clauses for steady utterance streaming', () => {
      const narrative = 'Nova Swarm initialized. Multi-agent debate reached consensus. All verification tests passed successfully!';
      const chunks = chunkTextIntoSentences(narrative);
      expect(chunks.length).toBe(3);
      expect(chunks[0]).toBe('Nova Swarm initialized.');
      expect(chunks[1]).toBe('Multi-agent debate reached consensus.');
      expect(chunks[2]).toBe('All verification tests passed successfully!');
    });

    it('should safely handle empty or whitespace-only strings', () => {
      expect(chunkTextIntoSentences('')).toEqual([]);
      expect(chunkTextIntoSentences('   ')).toEqual([]);
    });
  });

  describe('Audio Visualizer & Control Constraints', () => {
    it('should have 3 distinct personality profiles available for selection', () => {
      const keys = Object.keys(VOICE_PROFILES) as VoiceProfileKey[];
      expect(keys).toEqual(['ember', 'breeze', 'pulse']);
    });
  });
});
