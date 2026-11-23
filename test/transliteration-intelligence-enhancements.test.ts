/**
 * transliteration-intelligence-enhancements.test.ts
 *
 * Automated verification for Akhar Studio Transliteration Intelligence Improvements:
 * - Phase 2: Transliteration accuracy & spelling priorities (dhyaan, eh, walh, dardi, darda, dard, lendi, laindi)
 * - Phase 3: English loanwords (Phone, Mobile, Tyre, Motor, Cycle, Table, Cover, Case, Pack)
 * - Phase 4: Personalised suggestion ranking (gradual learning, persistence, reset, isolation)
 * - Phase 5: Native Punjabi vocabulary discovery (table -> ਟੇਬਲ & ਮੇਜ਼)
 * - Phase 6: Short Roman input patterns (k -> ਕੇ)
 * - Phase 7: English-to-Punjabi word translations (disappointed -> ਨਿਰਾਸ਼, attention -> ਧਿਆਨ)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { defaultTransliterator } from '../src/core/transliteration/defaultEngine';
import { GurmukhiTransliterator } from '../src/core/transliteration/engine';
import { PersonalizationEngine } from '../src/core/transliteration/personalization';
import { GurmukhiLexicon, UserDictionary } from '../src/core/transliteration/lexicon';

describe('Transliteration Intelligence & Spelling Priorities', () => {
  let engine: GurmukhiTransliterator;

  const mockStorage: Record<string, string> = {};

  beforeEach(() => {
    for (const key in mockStorage) {
      delete mockStorage[key];
    }
    if (typeof globalThis.localStorage === 'undefined') {
      (globalThis as any).localStorage = {
        getItem: (k: string) => mockStorage[k] || null,
        setItem: (k: string, v: string) => {
          mockStorage[k] = v;
        },
        removeItem: (k: string) => {
          delete mockStorage[k];
        },
        clear: () => {
          for (const key in mockStorage) delete mockStorage[key];
        },
      };
    } else {
      localStorage.clear();
    }

    engine = defaultTransliterator;
    engine.getPersonalization().reset();
    engine.getUserDictionary().reset();
  });

  describe('Phase 2: Spelling Priorities & Accuracy', () => {
    it('dhyaan: prioritises ਧਿਆਨ and excludes ਧਯਾਨ from normal suggestions', () => {
      const suggestions = engine.suggest('dhyaan', 5);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toBe('ਧਿਆਨ');
      expect(suggestions).not.toContain('ਧਯਾਨ');
      expect(suggestions).not.toContain('ਧਯਾੰ');
      expect(suggestions).not.toContain('ਧਯਾਂ');
    });

    it('dhyan: also prioritises ਧਿਆਨ and excludes ਧਯਾਨ', () => {
      const suggestions = engine.suggest('dhyan', 5);
      expect(suggestions[0]).toBe('ਧਿਆਨ');
      expect(suggestions).not.toContain('ਧਯਾਨ');
    });

    it('eh: prioritises ਇਹ over ਏਹ', () => {
      const suggestions = engine.suggest('eh', 5);
      expect(suggestions).toContain('ਇਹ');
      expect(suggestions).toContain('ਏਹ');
      expect(suggestions[0]).toBe('ਇਹ');
      const idxIh = suggestions.indexOf('ਇਹ');
      const idxEh = suggestions.indexOf('ਏਹ');
      expect(idxIh).toBeLessThan(idxEh);
    });

    it('walh: includes ਵੱਲ੍ਹ, ਵਲ੍ਹ, ਵਾਲ੍ਹ and excludes malformed combinations', () => {
      const suggestions = engine.suggest('walh', 5);
      expect(suggestions).toContain('ਵੱਲ੍ਹ');
      expect(suggestions).toContain('ਵਲ੍ਹ');
      expect(suggestions).toContain('ਵਾਲ੍ਹ');

      // Invalid combinations must never be suggested
      expect(suggestions).not.toContain('ਵਲਹ');
      expect(suggestions).not.toContain('ਵਲੱਹ');
      expect(suggestions).not.toContain('ਵੱਲਹ');
      expect(suggestions).not.toContain('ਵਲ਼ਹ');
      expect(suggestions).not.toContain('ਵਾਲਹ');
    });

    it('dardi: prioritises ਡਰਦੀ over ਦਰਦੀ', () => {
      const suggestions = engine.suggest('dardi', 5);
      expect(suggestions[0]).toBe('ਡਰਦੀ');
      const idxDardi = suggestions.indexOf('ਡਰਦੀ');
      const idxDaradi = suggestions.indexOf('ਦਰਦੀ');
      if (idxDaradi !== -1) {
        expect(idxDardi).toBeLessThan(idxDaradi);
      }
    });

    it('darda: prioritises ਡਰਦਾ', () => {
      const suggestions = engine.suggest('darda', 5);
      expect(suggestions[0]).toBe('ਡਰਦਾ');
    });

    it('dard: prioritises ਦਰਦ', () => {
      const suggestions = engine.suggest('dard', 5);
      expect(suggestions[0]).toBe('ਦਰਦ');
    });

    it('distinguishes between dardi, darda, and dard based on Roman input', () => {
      expect(engine.suggest('dardi', 3)[0]).toBe('ਡਰਦੀ');
      expect(engine.suggest('darda', 3)[0]).toBe('ਡਰਦਾ');
      expect(engine.suggest('dard', 3)[0]).toBe('ਦਰਦ');
    });

    it('lendi: produces and prioritises ਲੈਂਦੀ', () => {
      const suggestions = engine.suggest('lendi', 5);
      expect(suggestions).toContain('ਲੈਂਦੀ');
      expect(suggestions[0]).toBe('ਲੈਂਦੀ');
    });

    it('laindi: produces and prioritises ਲੈਂਦੀ', () => {
      const suggestions = engine.suggest('laindi', 5);
      expect(suggestions).toContain('ਲੈਂਦੀ');
      expect(suggestions[0]).toBe('ਲੈਂਦੀ');
    });
  });

  describe('Phase 3: Common English Loanwords in Punjabi', () => {
    const loanwords: [string, string][] = [
      ['phone', 'ਫੋਨ'],
      ['mobile', 'ਮੋਬਾਈਲ'],
      ['tyre', 'ਟਾਇਰ'],
      ['motor', 'ਮੋਟਰ'],
      ['cycle', 'ਸਾਈਕਲ'],
      ['table', 'ਟੇਬਲ'],
      ['cover', 'ਕਵਰ'],
      ['case', 'ਕੇਸ'],
      ['pack', 'ਪੈਕ'],
    ];

    for (const [roman, expectedGurmukhi] of loanwords) {
      it(`recognises loanword '${roman}' -> '${expectedGurmukhi}' at Rank 1`, () => {
        const suggestions = engine.suggest(roman, 5);
        expect(suggestions.length).toBeGreaterThan(0);
        expect(suggestions[0]).toBe(expectedGurmukhi);
      });

      it(`handles case-insensitive Roman input for '${roman}'`, () => {
        const capitalized = roman.charAt(0).toUpperCase() + roman.slice(1);
        const upper = roman.toUpperCase();
        expect(engine.suggest(capitalized, 5)[0]).toBe(expectedGurmukhi);
        expect(engine.suggest(upper, 5)[0]).toBe(expectedGurmukhi);
      });
    }
  });

  describe('Phase 5 & 7: Native Punjabi Vocabulary & Word Translations', () => {
    it('table: strictly offers loanword ਟੇਬਲ without unapproved review-required translation ਮੇਜ਼', () => {
      const suggestions = engine.suggest('table', 5);
      expect(suggestions).toContain('ਟੇਬਲ');
      expect(suggestions).not.toContain('ਮੇਜ਼');
      expect(suggestions[0]).toBe('ਟੇਬਲ');
    });

    it('disappointed: produces native translation ਨਿਰਾਸ਼', () => {
      const suggestions = engine.suggest('disappointed', 5);
      expect(suggestions).toContain('ਨਿਰਾਸ਼');
      expect(suggestions[0]).toBe('ਨਿਰਾਸ਼');
    });

    it('courage: produces native translation ਹਿੰਮਤ', () => {
      const suggestions = engine.suggest('courage', 5);
      expect(suggestions).toContain('ਹਿੰਮਤ');
      expect(suggestions[0]).toBe('ਹਿੰਮਤ');
    });

    it('coexists with transliteration candidates without interference (cycle -> ਸਾਈਕਲ and ਚੱਕਰ)', () => {
      const { details } = engine.suggestWithDetails('cycle', 5);
      const loanwordCand = details.find((d) => d.word === 'ਸਾਈਕਲ');
      const nativeCand = details.find((d) => d.word === 'ਚੱਕਰ');

      expect(loanwordCand).toBeDefined();
      expect(loanwordCand?.isLoanword).toBe(true);

      expect(nativeCand).toBeDefined();
      expect(nativeCand?.isTranslation).toBe(true);
    });
  });

  describe('Phase 6: Short Roman Input Patterns (Shorthand)', () => {
    it('k: includes ਕੇ as a preferred candidate', () => {
      const suggestions = engine.suggest('k', 5);
      expect(suggestions).toContain('ਕੇ');
      expect(suggestions[0]).toBe('ਕੇ');
    });

    it('does not produce excessive unrelated suggestions for single character', () => {
      const suggestions = engine.suggest('k', 5);
      expect(suggestions.length).toBeLessThanOrEqual(5);
      for (const cand of suggestions) {
        expect(['ਕੇ', 'ਕਿ', 'ਕ', 'ਖ਼', 'ਕਹ']).toContain(cand);
      }
    });

    it('recognises high-confidence shorthands like c -> ਚ, v -> ਵੀ, te -> ਤੇ, di -> ਦੀ', () => {
      expect(engine.suggest('c', 5)).toContain('ਚ');
      expect(engine.suggest('v', 5)).toContain('ਵੀ');
      expect(engine.suggest('te', 5)).toContain('ਤੇ');
      expect(engine.suggest('di', 5)).toContain('ਦੀ');
    });
  });

  describe('Phase 4: Personalised Suggestion Ranking', () => {
    let customEngine: GurmukhiTransliterator;
    let personalization: PersonalizationEngine;

    beforeEach(() => {
      const lexicon = new GurmukhiLexicon();
      // Word A (ਵਰ) has baseline frequency 80,000
      lexicon.insert('ਵਰ', 80_000);
      // Word B (ਵੜ) has baseline frequency 30,000 (50,000 lead for ਵਰ)
      lexicon.insert('ਵੜ', 30_000);

      personalization = new PersonalizationEngine();
      personalization.reset();

      customEngine = new GurmukhiTransliterator(
        lexicon,
        new UserDictionary(),
        undefined,
        personalization
      );
    });

    it('repeated selection gradually elevates a lower-ranked word without single-click disruption', () => {
      // Initially, baseline rank has ਵਰ at Rank 1, ਵੜ at Rank 2
      const initial = customEngine.suggest('var', 5);
      expect(initial[0]).toBe('ਵਰ');
      expect(initial).toContain('ਵੜ');

      // 1st selection of ਵੜ gives modest boost (~40k), not enough to flip a 50k lead
      customEngine.recordSelection('ਵੜ', 'var');
      const after1 = customEngine.suggest('var', 5);
      expect(after1[0]).toBe('ਵਰ');

      // Repeated selection (3 times) scales boost to ~75k, gradually elevating ਵੜ to Rank 1
      customEngine.recordSelection('ਵੜ', 'var');
      customEngine.recordSelection('ਵੜ', 'var');
      const after3 = customEngine.suggest('var', 5);
      expect(after3[0]).toBe('ਵੜ');
    });

    it('one selection does not cause an extreme erratic jump against large frequency differences', () => {
      const p = new PersonalizationEngine();
      p.reset();

      // 1 selection gives modest boost (~35,000)
      p.recordSelection('ਗਲ', 'gal');
      const boost1 = p.getBoost('ਗਲ', 'gal');
      expect(boost1).toBeGreaterThan(20_000);
      expect(boost1).toBeLessThan(50_000);

      // 5 selections scale logarithmically rather than linearly
      for (let i = 0; i < 4; i++) {
        p.recordSelection('ਗਲ', 'gal');
      }
      const boost5 = p.getBoost('ਗਲ', 'gal');
      expect(boost5).toBeGreaterThan(boost1);
      expect(boost5).toBeLessThan(120_000);
    });

    it('preferences persist across engine / storage reloads', () => {
      const p1 = new PersonalizationEngine();
      p1.reset();
      p1.recordSelection('ਮੇਜ਼', 'table');
      const boostP1 = p1.getBoost('ਮੇਜ਼', 'table');

      // Create new instance simulating application restart
      const p2 = new PersonalizationEngine();
      expect(p2.getBoost('ਮੇਜ਼', 'table')).toBe(boostP1);
    });

    it('resetting preferences clears all personal learning data', () => {
      const p = new PersonalizationEngine();
      p.recordSelection('ਮੇਜ਼', 'table');
      expect(p.getBoost('ਮੇਜ਼', 'table')).toBeGreaterThan(0);

      p.reset();
      expect(p.getBoost('ਮੇਜ਼', 'table')).toBe(0);
    });

    it('hard spelling corrections cannot be overridden by user learning', () => {
      const p = new PersonalizationEngine();
      p.recordSelection('ਧਯਾਨ', 'dhyaan'); // Malformed/excluded spelling
      expect(p.getBoost('ਧਯਾਨ', 'dhyaan')).toBe(0);

      const suggestions = defaultTransliterator.suggest('dhyaan', 5);
      expect(suggestions).not.toContain('ਧਯਾਨ');
    });

    it('different Roman inputs do not incorrectly share preferences', () => {
      const p = new PersonalizationEngine();
      p.reset();
      p.recordSelection('ਇਹ', 'eh');

      expect(p.getBoost('ਇਹ', 'eh')).toBeGreaterThan(0);
      // Different roman inputs must have 0 boost
      expect(p.getBoost('ਇਹ', 'mera')).toBe(0);
      expect(p.getBoost('ਇਹ', 'kudi')).toBe(0);
      expect(p.getBoost('ਇਹ', 'table')).toBe(0);
    });
  });
});
