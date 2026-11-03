import { describe, it, expect, beforeEach } from 'vitest';
import { defaultTransliterator } from '../src/core/transliteration/defaultEngine';
import { GurmukhiTransliterator } from '../src/core/transliteration/engine';

describe('Stage 4: Transliteration Corrections & Typo-Tolerant Suggestions', () => {
  let engine: GurmukhiTransliterator;

  beforeEach(() => {
    engine = defaultTransliterator;
  });

  describe('4.A: Transliteration Engine Corrections ("reha" -> "ਰਿਹਾ")', () => {
    it('transliterates "reha" to "ਰਿਹਾ" at Rank 1', () => {
      const suggestions = engine.suggest('reha', 5);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toBe('ਰਿਹਾ');
    });

    it('transliterates related verbal forms "rehe" -> "ਰਹੇ" and "rehi" -> "ਰਹੀ" at Rank 1', () => {
      const reheSuggestions = engine.suggest('rehe', 5);
      expect(reheSuggestions[0]).toBe('ਰਹੇ');

      const rehiSuggestions = engine.suggest('rehi', 5);
      expect(rehiSuggestions[0]).toBe('ਰਹੀ');
    });

    it('transliterates similar haha patterns "keha" -> "ਕਿਹਾ" and "jeha" -> "ਜਿਹਾ" at Rank 1', () => {
      const kehaSuggestions = engine.suggest('keha', 5);
      expect(kehaSuggestions[0]).toBe('ਕਿਹਾ');

      const jehaSuggestions = engine.suggest('jeha', 5);
      expect(jehaSuggestions[0]).toBe('ਜਿਹਾ');
    });

    it('does not emit malformed unicode sequences like Sihari on Haha without base', () => {
      const details = engine.suggestWithDetails('reha', 5);
      for (const cand of details.candidates) {
        expect(cand).not.toContain('ਹਿਾ');
      }
    });
  });

  describe('4.B: Typo-Tolerant Suggestions ("vadiya" vs "vadhiya")', () => {
    it('preserves exact phonetic transliteration for "vadiya" at Rank 1', () => {
      const suggestions = engine.suggest('vadiya', 5);
      expect(suggestions.length).toBeGreaterThan(1);
      // Rank 1 must be the exact phonetic transliteration: 'ਵਦਿਆ'
      expect(suggestions[0]).toBe('ਵਦਿਆ');
    });

    it('offers high-probability phonetic alternative "ਵਧੀਆ" prominently in suggestions list', () => {
      const suggestions = engine.suggest('vadiya', 5);
      expect(suggestions).toContain('ਵਧੀਆ');
      // Prominently offered at Rank 2
      expect(suggestions.indexOf('ਵਧੀਆ')).toBe(1);
    });

    it('marks exact match as non-fuzzy and phonetic alternative as fuzzy in details', () => {
      const { details } = engine.suggestWithDetails('vadiya', 5);
      const exactMatch = details.find((d) => d.word === 'ਵਦਿਆ');
      const fuzzyMatch = details.find((d) => d.word === 'ਵਧੀਆ');

      expect(exactMatch).toBeDefined();
      expect(exactMatch?.isFuzzy).toBe(false);

      expect(fuzzyMatch).toBeDefined();
      expect(fuzzyMatch?.isFuzzy).toBe(true);
      expect(fuzzyMatch?.lexiconFrequency).toBeGreaterThan(0);
    });

    it('allows typing "vadhiya" to directly get "ਵਧੀਆ" at Rank 1', () => {
      const suggestions = engine.suggest('vadhiya', 5);
      expect(suggestions[0]).toBe('ਵਧੀਆ');
    });
  });

  describe('Performance and Sub-millisecond Latency', () => {
    it('executes suggestions within sub-millisecond latency (< 1ms per query)', () => {
      const start = performance.now();
      const testWords = ['reha', 'vadiya', 'vadhiya', 'keha', 'rehe', 'rehi', 'kiddan', 'tusi', 'mera', 'tere'];
      for (let i = 0; i < 100; i++) {
        engine.suggest(testWords[i % testWords.length], 5);
      }
      const totalElapsed = performance.now() - start;
      const perQuery = totalElapsed / 100;
      expect(perQuery).toBeLessThan(1.0);
    });
  });
});
