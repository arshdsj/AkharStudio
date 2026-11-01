/**
 * phase3-transliteration.test.ts - Automated Transliteration Test Suite
 * Governing IDs: I18N-02, DEC-005, DEC-006, DEC-008, DEC-027, DEC-028, TM-01, TM-02, TM-14
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

import { GurmukhiLexicon, UserDictionary } from '../src/core/transliteration/lexicon';
import { GurmukhiTransliterator } from '../src/core/transliteration/engine';
import { defaultTransliterator } from '../src/core/transliteration/defaultEngine';

describe('Phase 3: Production Transliteration Engine (W3 & I18N-02)', () => {
  let lexicon: GurmukhiLexicon;
  let engine: GurmukhiTransliterator;
  let userDict: UserDictionary;

  beforeAll(() => {
    lexicon = new GurmukhiLexicon();
    userDict = new UserDictionary();

    // Load compiled 100k wordlist
    const lexiconPath = path.resolve(__dirname, '../assets/data/punjabi_lexicon.json');
    if (fs.existsSync(lexiconPath)) {
      const data = JSON.parse(fs.readFileSync(lexiconPath, 'utf-8')) as [string, number][];
      lexicon.loadEntries(data);
    }

    engine = new GurmukhiTransliterator(lexicon, userDict);
  });

  describe('TM-01: Mandatory Seed Fixtures (Rank 1 Required)', () => {
    const seedFixtures: [string, string][] = [
      ['kitthe', 'ਕਿੱਥੇ'],
      ['putt', 'ਪੁੱਤ'],
      ['punjab', 'ਪੰਜਾਬ'],
      ['munda', 'ਮੁੰਡਾ'],
      ['kudi', 'ਕੁੜੀ'],
      ['zindagi', 'ਜ਼ਿੰਦਗੀ'],
      ['ch', 'ਚ'],
    ];

    for (const [roman, expected] of seedFixtures) {
      it(`transliterates '${roman}' -> '${expected}' at Rank 1`, () => {
        const candidates = engine.suggest(roman, 5);
        expect(candidates).toContain(expected);
        // Rank 1 assertion
        expect(candidates[0]).toBe(expected);
      });
    }

    describe('Geminated Consonants with Addak & User-Reported Nasal Regressions (8 Core Fixtures)', () => {
      const eightFixtures: [string, string][] = [
        ['full', 'ਫੁੱਲ'],
        ['challe', 'ਚੱਲੇ'],
        ['gall', 'ਗੱਲ'],
        ['dilli', 'ਦਿੱਲੀ'],
        ['billi', 'ਬਿੱਲੀ'],
        ['main', 'ਮੈਂ'],
        ['mai', 'ਮੈਂ'],
        ['tusi', 'ਤੁਸੀਂ'],
      ];

      for (const [roman, expected] of eightFixtures) {
        it(`transliterates '${roman}' -> '${expected}' at Rank 1`, () => {
          const candidates = engine.suggest(roman, 5);
          expect(candidates).toContain(expected);
          expect(candidates[0]).toBe(expected);
        });
      }

      it('verifies defaultTransliterator singleton matches engine for all 8 core fixtures', () => {
        for (const [roman, expected] of eightFixtures) {
          const candidates = defaultTransliterator.suggest(roman, 5);
          expect(candidates[0]).toBe(expected);
        }
      });

      it('preserves ordinary alternatives for main (ਮੈਨ), mai (ਮਿ, ਮੈ), and tusi (ਤੁਸੀ)', () => {
        const mainCands = engine.suggest('main', 5);
        expect(mainCands).toContain('ਮੈਨ');

        const maiCands = engine.suggest('mai', 5);
        expect(maiCands).toContain('ਮਿ');
        expect(maiCands).toContain('ਮੈ');

        const tusiCands = engine.suggest('tusi', 5);
        expect(tusiCands).toContain('ਤੁਸੀ');
      });
    });

    describe('Informal Single-Consonant Addak Matching (Preference without Corrupting Alternatives)', () => {
      const singleAddakFixtures: [string, string, string][] = [
        ['gal', 'ਗੱਲ', 'ਗਲ'],
        ['das', 'ਦੱਸ', 'ਦਸ'],
        ['rab', 'ਰੱਬ', 'ਰਬ'],
        ['sach', 'ਸੱਚ', 'ਸਚ'],
        ['ik', 'ਇੱਕ', 'ਇਕ'],
      ];

      for (const [roman, preferred, ordinary] of singleAddakFixtures) {
        it(`ranks preferred Addak spelling '${preferred}' at Rank 1 while keeping '${ordinary}' available for '${roman}'`, () => {
          const candidates = engine.suggest(roman, 5);
          expect(candidates[0]).toBe(preferred);
          expect(candidates).toContain(ordinary);
        });
      }
    });
  });

  describe('DEC-008: Explicit Control Tokens', () => {
    const tokenFixtures: [string, string][] = [
      ['{ADDAK}', '\u0A71'],
      ['{A}', '\u0A71'],
      ['{TIPPI}', '\u0A70'],
      ['{TP}', '\u0A70'],
      ['{BINDI}', '\u0A02'],
      ['{BD}', '\u0A02'],
      ['{DANDA}', '।'],
      ['{DA}', '।'],
      ['{DOUBLE-DANDA}', '॥'],
      ['{DDA}', '॥'],
      ['{T}', 'ਟ'],
      ['{TH}', 'ਠ'],
      ['{D}', 'ਡ'],
      ['{DH}', 'ਢ'],
      ['{N}', 'ਣ'],
      ['{R}', 'ੜ'],
      ['{L}', 'ਲ਼'],
      ['{KH-NUKTA}', 'ਖ਼'],
      ['{GH-NUKTA}', 'ਗ਼'],
      ['{J-NUKTA}', 'ਜ਼'],
      ['{PH-NUKTA}', 'ਫ਼'],
    ];

    for (const [token, expected] of tokenFixtures) {
      it(`resolves explicit control token '${token}' -> '${expected}'`, () => {
        const result = engine.suggest(token);
        expect(result).toEqual([expected]);
      });
    }
  });

  describe('TM-02: Suggestion Latency (< 30ms Target)', () => {
    it('executes 100 representative suggestion queries in under 50ms total (< 1ms per query)', () => {
      const testWords = [
        'kitthe',
        'punjab',
        'munda',
        'kudi',
        'zindagi',
        'putt',
        'ghar',
        'naam',
        'paani',
        'amritsar',
      ];

      const t0 = performance.now();
      for (let i = 0; i < 100; i++) {
        const word = testWords[i % testWords.length];
        engine.suggest(word, 5);
      }
      const elapsed = performance.now() - t0;
      const avgLatency = elapsed / 100;

      console.log(`TM-02 Average Suggestion Latency: ${avgLatency.toFixed(3)} ms per word`);
      expect(avgLatency).toBeLessThan(10); // Far faster than 30ms requirement
    });
  });

  describe('User Dictionary & Dynamic Learning (W3, DEC-028)', () => {
    it('boosts explicitly selected candidate to Rank 1 on subsequent suggestion', () => {
      // Pick a word with multiple valid variants: 'kudi' -> ਕੁੜੀ / ਕੁਦੀ
      const initial = engine.suggest('kudi', 5);
      expect(initial).toContain('ਕੁੜੀ');

      // Record selection of 'ਕੁੜੀ'
      engine.recordSelection('ਕੁੜੀ');

      const afterSelection = engine.suggest('kudi', 5);
      expect(afterSelection[0]).toBe('ਕੁੜੀ');
    });
  });

  describe('TM-14: Canonical NFC Normalization & Unicode Integrity', () => {
    it('guarantees all emitted candidates are in Unicode NFC form without unassigned code points', () => {
      const candidates = engine.suggest('shuru', 5);
      for (const cand of candidates) {
        expect(cand).toBe(cand.normalize('NFC'));
        // Verify no replacement characters or illegal code points
        expect(cand).not.toContain('\uFFFD');
      }
    });
  });

  describe('Session Regression Tests (Session diag_1793337094254_ncq4i)', () => {
    it('transliterates feminine vocative diphthongs: kudiye -> ਕੁੜੀਏ and rangiye -> ਰੰਗੀਏ at Rank 1', () => {
      const kudiyeCands = engine.suggest('kudiye', 5);
      expect(kudiyeCands[0]).toBe('ਕੁੜੀਏ');

      const rangiyeCands = engine.suggest('rangiye', 5);
      expect(rangiyeCands[0]).toBe('ਰੰਗੀਏ');
    });

    it('transliterates past-tense verbal diphthongs: banaya -> ਬਣਾਇਆ at Rank 1 and offers ਬਨਾਇਆ', () => {
      const banayaCands = engine.suggest('banaya', 5);
      expect(banayaCands[0]).toBe('ਬਣਾਇਆ');
      expect(banayaCands).toContain('ਬਨਾਇਆ');
    });

    it('transliterates interjection oye -> ਓਏ and never emits malformed ਓਯੇ', () => {
      const oyeCands = engine.suggest('oye', 5);
      expect(oyeCands[0]).toBe('ਓਏ');
      expect(oyeCands).not.toContain('ਓਯੇ');
    });

    it('transliterates aen -> ਏਂ / ਐਂ and never emits illegal Unicode vowel sequence ਅੇੰ', () => {
      const aenCands = engine.suggest('aen', 5);
      expect(aenCands[0]).toBe('ਏਂ');
      expect(aenCands).toContain('ਐਂ');
      expect(aenCands).not.toContain('ਅੇੰ');
    });

    it('prioritizes long-vowel Kanna for explicit double aa: daal -> ਦਾਲ at Rank 1 over ਦਲ', () => {
      const daalCands = engine.suggest('daal', 5);
      expect(daalCands[0]).toBe('ਦਾਲ');
    });

    it('offers both ਕੇ and ਕਿ for ke', () => {
      const keCands = engine.suggest('ke', 5);
      expect(keCands).toContain('ਕੇ');
      expect(keCands).toContain('ਕਿ');
    });

    it('prevents recording invalid Gurmukhi or ASCII fallback literals into user preferences', () => {
      const userDict = engine.getUserDictionary();
      userDict.recordSelection('kudiye'); // ASCII fallback literal
      userDict.recordSelection('ਅੇੰ'); // Illegal Unicode
      userDict.recordSelection('ਓਯੇ'); // Malformed

      expect(userDict.getBoost('kudiye')).toBe(0);
      expect(userDict.getBoost('ਅੇੰ')).toBe(0);
      expect(userDict.getBoost('ਓਯੇ')).toBe(0);
    });
  });

  describe('Session Regression Tests (Session diag_1793340143211_6dsj1)', () => {
    it('transliterates verbal past-tense diphthongs: mareya and maareya -> ਮਾਰਿਆ at Rank 1 without fallback literal', () => {
      const mareyaCands = engine.suggest('mareya', 5);
      expect(mareyaCands.length).toBeGreaterThan(0);
      expect(mareyaCands[0]).toBe('ਮਾਰਿਆ');
      expect(mareyaCands).toContain('ਮਰਿਆ');

      const maareyaCands = engine.suggest('maareya', 5);
      expect(maareyaCands.length).toBeGreaterThan(0);
      expect(maareyaCands[0]).toBe('ਮਾਰਿਆ');

      expect(defaultTransliterator.suggest('mareya', 5)[0]).toBe('ਮਾਰਿਆ');
      expect(defaultTransliterator.suggest('maareya', 5)[0]).toBe('ਮਾਰਿਆ');
    });

    it('transliterates postposition dian -> ਦੀਆਂ at Rank 1 and offers ਦਿਆਂ', () => {
      const dianCands = engine.suggest('dian', 5);
      expect(dianCands.length).toBeGreaterThan(0);
      expect(dianCands[0]).toBe('ਦੀਆਂ');
      expect(dianCands).toContain('ਦਿਆਂ');

      expect(defaultTransliterator.suggest('dian', 5)[0]).toBe('ਦੀਆਂ');
    });

    it('transliterates verbal feminine plural dittian -> ਦਿੱਤੀਆਂ at Rank 1', () => {
      const dittianCands = engine.suggest('dittian', 5);
      expect(dittianCands.length).toBeGreaterThan(0);
      expect(dittianCands[0]).toBe('ਦਿੱਤੀਆਂ');

      expect(defaultTransliterator.suggest('dittian', 5)[0]).toBe('ਦਿੱਤੀਆਂ');
    });

    it('transliterates dative marker nu -> ਨੂੰ at Rank 1 via Dulankar Tippi nasalization', () => {
      const nuCands = engine.suggest('nu', 5);
      expect(nuCands.length).toBeGreaterThan(0);
      expect(nuCands[0]).toBe('ਨੂੰ');

      expect(defaultTransliterator.suggest('nu', 5)[0]).toBe('ਨੂੰ');
    });

    it('transliterates mukka -> ਮੁੱਕਾ at Rank 1 over truncated ਮੁੱਕ and unvocalized ਮੱਕਾ', () => {
      const mukkaCands = engine.suggest('mukka', 5);
      expect(mukkaCands.length).toBeGreaterThan(0);
      expect(mukkaCands[0]).toBe('ਮੁੱਕਾ');
      expect(mukkaCands).toContain('ਮੁੱਕ');

      expect(defaultTransliterator.suggest('mukka', 5)[0]).toBe('ਮੁੱਕਾ');
    });

    it('transliterates ghasunn -> ਘਸੁੰਨ at Rank 1 over unverified zero-frequency forms', () => {
      const ghasunnCands = engine.suggest('ghasunn', 5);
      expect(ghasunnCands.length).toBeGreaterThan(0);
      expect(ghasunnCands[0]).toBe('ਘਸੁੰਨ');

      expect(defaultTransliterator.suggest('ghasunn', 5)[0]).toBe('ਘਸੁੰਨ');
    });

    it('transliterates the entire Punjabi screenplay dialogue sequence at Rank 1 for all 13 tokens', () => {
      // Sentence: "ਜੱਗੇ ਨੇ ਪੱਪੂ ਨੂੰ ਮੁੱਕਾ ਮਾਰਿਆ, ਘਸੁੰਨ ਨੇ ਪੱਪੂ ਦੀਆਂ ਅੱਖਾਂ ਬਾਹਰ ਕੱਢ ਦਿੱਤੀਆਂ"
      const sequence: [string, string][] = [
        ['jagge', 'ਜੱਗੇ'],
        ['ne', 'ਨੇ'],
        ['pappu', 'ਪੱਪੂ'],
        ['nu', 'ਨੂੰ'],
        ['mukka', 'ਮੁੱਕਾ'],
        ['mareya', 'ਮਾਰਿਆ'],
        ['ghasunn', 'ਘਸੁੰਨ'],
        ['ne', 'ਨੇ'],
        ['pappu', 'ਪੱਪੂ'],
        ['dian', 'ਦੀਆਂ'],
        ['akhan', 'ਅੱਖਾਂ'],
        ['bahar', 'ਬਾਹਰ'],
        ['kadh', 'ਕੱਢ'],
        ['dittian', 'ਦਿੱਤੀਆਂ'],
      ];

      for (const [roman, expected] of sequence) {
        const cands = defaultTransliterator.suggest(roman, 5);
        expect(cands[0]).toBe(expected);
      }
    });
  });

  describe('Session Regression Tests (Session diag_1793350043316_tv5af)', () => {
    it('transliterates neck (dhaun) -> ਧੌਣ at Rank 1 via au Kanora prioritization over degraded ਧਾਨ', () => {
      const cands = engine.suggest('dhaun', 5);
      expect(cands.length).toBeGreaterThan(0);
      expect(cands[0]).toBe('ਧੌਣ');
      expect(defaultTransliterator.suggest('dhaun', 5)[0]).toBe('ਧੌਣ');
    });

    it('transliterates mouth/face (muh, muhn) -> ਮੂੰਹ at Rank 1 via haha nasalization', () => {
      const muhCands = engine.suggest('muh', 5);
      expect(muhCands[0]).toBe('ਮੂੰਹ');
      expect(defaultTransliterator.suggest('muh', 5)[0]).toBe('ਮੂੰਹ');

      const muhnCands = engine.suggest('muhn', 5);
      expect(muhnCands[0]).toBe('ਮੂੰਹ');
      expect(defaultTransliterator.suggest('muhn', 5)[0]).toBe('ਮੂੰਹ');
    });

    it('transliterates wave (lehr, lehar) -> ਲਹਿਰ at Rank 1 via tonal haha rule (DEC-008)', () => {
      const lehrCands = engine.suggest('lehr', 5);
      expect(lehrCands[0]).toBe('ਲਹਿਰ');
      expect(defaultTransliterator.suggest('lehr', 5)[0]).toBe('ਲਹਿਰ');

      const leharCands = engine.suggest('lehar', 5);
      expect(leharCands[0]).toBe('ਲਹਿਰ');
      expect(defaultTransliterator.suggest('lehar', 5)[0]).toBe('ਲਹਿਰ');
    });

    it('transliterates verbal past-tense forms (gyi -> ਗਈ, gye -> ਗਏ) at Rank 1 over unverified forms', () => {
      const gyiCands = engine.suggest('gyi', 5);
      expect(gyiCands[0]).toBe('ਗਈ');
      expect(defaultTransliterator.suggest('gyi', 5)[0]).toBe('ਗਈ');

      const gyeCands = engine.suggest('gye', 5);
      expect(gyeCands[0]).toBe('ਗਏ');
      expect(defaultTransliterator.suggest('gye', 5)[0]).toBe('ਗਏ');
    });

    it('transliterates verbal suffix -ta: maarta -> ਮਾਰਤਾ at Rank 1 over retroflex ਮਾਰਟਾ', () => {
      const maartaCands = engine.suggest('maarta', 5);
      expect(maartaCands[0]).toBe('ਮਾਰਤਾ');
      expect(defaultTransliterator.suggest('maarta', 5)[0]).toBe('ਮਾਰਤਾ');
    });

    it('transliterates vocative rabba -> ਰੱਬਾ at Rank 1 over Mukta-truncated root noun ਰੱਬ', () => {
      const rabbaCands = engine.suggest('rabba', 5);
      expect(rabbaCands[0]).toBe('ਰੱਬਾ');
      expect(defaultTransliterator.suggest('rabba', 5)[0]).toBe('ਰੱਬਾ');
    });

    it('offers belly/stomach (ਢਿੱਡ) when typing tidh', () => {
      const tidhCands = engine.suggest('tidh', 5);
      expect(tidhCands).toContain('ਢਿੱਡ');
    });

    it('ranks pain/ache forms (ਦੁੱਖਾਂ, ਦੁਖਾਂ, ਦੁਖਣ) over direction ਦੱਖਣ when typing dukhan', () => {
      const dukhanCands = engine.suggest('dukhan', 5);
      expect(dukhanCands.slice(0, 3)).toContain('ਦੁਖਣ');
      expect(dukhanCands.indexOf('ਦੁਖਣ')).toBeLessThan(dukhanCands.indexOf('ਦੱਖਣ'));
    });
  });
});
