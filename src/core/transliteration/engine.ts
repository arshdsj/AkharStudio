/**
 * engine.ts - Production Offline Phonetic Roman-to-Gurmukhi Transliteration Engine
 * Governing IDs: I18N-02, DEC-005, DEC-006, DEC-008, DEC-027, DEC-028, TM-01, TM-02, TM-14
 */

import { GurmukhiLexicon, UserDictionary, isValidGurmukhiWord } from './lexicon';
import { CustomDictionary } from './customDictionary';

export const EXPLICIT_CONTROL_TOKENS: Record<string, string> = {
  '{ADDAK}': '\u0A71',
  '{A}': '\u0A71',
  '{TIPPI}': '\u0A70',
  '{TP}': '\u0A70',
  '{BINDI}': '\u0A02',
  '{BD}': '\u0A02',
  '{PAIRIN-R}': '\u0A4D\u0A30',
  '{PRR}': '\u0A4D\u0A30',
  '{PAIRIN-H}': '\u0A4D\u0A39',
  '{PRH}': '\u0A4D\u0A39',
  '{DANDA}': '।',
  '{DA}': '।',
  '{DOUBLE-DANDA}': '॥',
  '{DDA}': '॥',
  '{T}': 'ਟ',
  '{TH}': 'ਠ',
  '{D}': 'ਡ',
  '{DH}': 'ਢ',
  '{N}': 'ਣ',
  '{R}': 'ੜ',
  '{L}': 'ਲ਼',
  '{KH-NUKTA}': 'ਖ਼',
  '{GH-NUKTA}': 'ਗ਼',
  '{J-NUKTA}': 'ਜ਼',
  '{PH-NUKTA}': 'ਫ਼',
};

const CONSONANTS: Record<string, string[]> = {
  k: ['ਕ'],
  kh: ['ਖ', 'ਖ਼'],
  g: ['ਗ', 'ਗ਼'],
  gh: ['ਘ'],
  ch: ['ਚ', 'ਛ'],
  chh: ['ਛ'],
  j: ['ਜ', 'ਜ਼'],
  z: ['ਜ਼'],
  jh: ['ਝ'],
  t: ['ਤ', 'ਟ'],
  th: ['ਥ', 'ਠ'],
  d: ['ਦ', 'ਡ', 'ੜ'],
  dh: ['ਧ', 'ਢ'],
  n: ['ਨ', 'ਣ'],
  p: ['ਪ'],
  ph: ['ਫ', 'ਫ਼'],
  f: ['ਫ਼', 'ਫ'],
  b: ['ਬ'],
  bh: ['ਭ'],
  m: ['ਮ'],
  y: ['ਯ'],
  r: ['ਰ', 'ੜ'],
  l: ['ਲ', 'ਲ਼'],
  v: ['ਵ'],
  w: ['ਵ'],
  s: ['ਸ'],
  sh: ['ਸ਼'],
  h: ['ਹ'],
};

const INDEP_VOWELS: Record<string, string[]> = {
  a: ['ਅ', 'ਆ'],
  aa: ['ਆ'],
  i: ['ਇ', 'ਈ'],
  ee: ['ਈ'],
  ii: ['ਈ'],
  u: ['ਉ', 'ਊ'],
  oo: ['ਊ'],
  uu: ['ਊ'],
  e: ['ਏ', 'ਐ'],
  ae: ['ਏ', 'ਐ'],
  ai: ['ਐ'],
  o: ['ਓ', 'ਔ'],
  au: ['ਔ'],
};

const DEP_VOWELS: Record<string, string[]> = {
  a: ['', 'ਾ'],
  aa: ['ਾ'],
  i: ['ਿ', 'ੀ'],
  ee: ['ੀ'],
  ii: ['ੀ'],
  u: ['ੁ', 'ੂ', ''],
  oo: ['ੂ'],
  uu: ['ੂ'],
  e: ['ੇ'],
  ae: ['ੈ', 'ੇ'],
  ai: ['ੈ'],
  o: ['ੋ'],
  au: ['ੌ'],
};

export class GurmukhiTransliterator {
  private lexicon: GurmukhiLexicon;
  private userDict: UserDictionary;
  private customDict: CustomDictionary;

  constructor(
    lexicon?: GurmukhiLexicon,
    userDict?: UserDictionary,
    customDict?: CustomDictionary
  ) {
    this.lexicon = lexicon || new GurmukhiLexicon();
    this.userDict = userDict || new UserDictionary();
    this.customDict = customDict || new CustomDictionary();
  }

  public getCustomDictionary(): CustomDictionary {
    return this.customDict;
  }

  public getUserDictionary(): UserDictionary {
    return this.userDict;
  }

  public getLexicon(): GurmukhiLexicon {
    return this.lexicon;
  }

  /**
   * Record explicit candidate selection to boost future rank (W3, DEC-028)
   */
  recordSelection(candidate: string): void {
    this.userDict.recordSelection(candidate);
  }

  /**
   * Suggest ranked Gurmukhi candidates for a Roman input word (I18N-02, TM-01)
   */
  suggest(romanInput: string, maxCandidates: number = 5): string[] {
    return this.suggestWithDetails(romanInput, maxCandidates).candidates;
  }

  /**
   * Suggest candidates with detailed scoring breakdown for diagnostics & transparency
   */
  suggestWithDetails(
    romanInput: string,
    maxCandidates: number = 5
  ): {
    candidates: string[];
    rawCandidatesCount: number;
    details: {
      word: string;
      lexiconFrequency: number;
      userBoost: number;
      isCustomExactMatch: boolean;
      totalScore: number;
      rank: number;
    }[];
  } {
    const roman = romanInput.trim();
    if (!roman) return { candidates: [], rawCandidatesCount: 0, details: [] };

    // 1. Explicit Control Tokens ({ADDAK}, {TIPPI}, {DANDA}, etc.)
    const upper = roman.toUpperCase();
    if (EXPLICIT_CONTROL_TOKENS[upper]) {
      const tokenResult = EXPLICIT_CONTROL_TOKENS[upper];
      return {
        candidates: [tokenResult],
        rawCandidatesCount: 1,
        details: [
          {
            word: tokenResult,
            lexiconFrequency: 1_000_000_000,
            userBoost: 0,
            isCustomExactMatch: false,
            totalScore: 1_000_000_000,
            rank: 1,
          },
        ],
      };
    }

    const lower = roman.toLowerCase();

    // 2. Exact match from Custom Dictionary (Rank 1+)
    const customMatches = this.customDict ? this.customDict.getExactMatches(lower) : [];

    // 3. Core single-character morphemes & fixed interjections (restored in v1.2)
    if (lower === 'ch') {
      const base = ['ਚ', 'ਛ'];
      const candidates = Array.from(new Set([...customMatches, ...base])).slice(0, maxCandidates);
      return {
        candidates,
        rawCandidatesCount: candidates.length,
        details: candidates.map((w, idx) => ({
          word: w,
          lexiconFrequency: this.lexicon.getFrequency(w),
          userBoost: this.userDict.getBoost(w),
          isCustomExactMatch: customMatches.includes(w),
          totalScore: this.lexicon.getFrequency(w) + this.userDict.getBoost(w) + (customMatches.includes(w) ? 2_000_000_000 : 0),
          rank: idx + 1,
        })),
      };
    }

    if (lower === 'oye') {
      const base = ['ਓਏ', 'ਓਏਂ'];
      const candidates = Array.from(new Set([...customMatches, ...base])).slice(0, maxCandidates);
      return {
        candidates,
        rawCandidatesCount: candidates.length,
        details: candidates.map((w, idx) => ({
          word: w,
          lexiconFrequency: this.lexicon.getFrequency(w),
          userBoost: this.userDict.getBoost(w),
          isCustomExactMatch: customMatches.includes(w),
          totalScore: this.lexicon.getFrequency(w) + this.userDict.getBoost(w) + (customMatches.includes(w) ? 2_000_000_000 : 0),
          rank: idx + 1,
        })),
      };
    }

    if (lower === 'aen') {
      const base = ['ਏਂ', 'ਐਂ'];
      const candidates = Array.from(new Set([...customMatches, ...base])).slice(0, maxCandidates);
      return {
        candidates,
        rawCandidatesCount: candidates.length,
        details: candidates.map((w, idx) => ({
          word: w,
          lexiconFrequency: this.lexicon.getFrequency(w),
          userBoost: this.userDict.getBoost(w),
          isCustomExactMatch: customMatches.includes(w),
          totalScore: this.lexicon.getFrequency(w) + this.userDict.getBoost(w) + (customMatches.includes(w) ? 2_000_000_000 : 0),
          rank: idx + 1,
        })),
      };
    }

    if (lower === 'ke') {
      const base = ['ਕੇ', 'ਕਿ', 'ਕੇਂ'];
      const candidates = Array.from(new Set([...customMatches, ...base])).slice(0, maxCandidates);
      return {
        candidates,
        rawCandidatesCount: candidates.length,
        details: candidates.map((w, idx) => ({
          word: w,
          lexiconFrequency: this.lexicon.getFrequency(w),
          userBoost: this.userDict.getBoost(w),
          isCustomExactMatch: customMatches.includes(w),
          totalScore: this.lexicon.getFrequency(w) + this.userDict.getBoost(w) + (customMatches.includes(w) ? 2_000_000_000 : 0),
          rank: idx + 1,
        })),
      };
    }

    // 4. Generate candidate expansions
    const candidates = this.generateCandidates(lower);

    // 5. Score and rank candidates using the frequency trie + user dictionary
    const scored: { word: string; score: number; freq: number; userBoost: number }[] = [];
    const seen = new Set<string>();

    for (const raw of candidates) {
      // Enforce NFC canonical normalization (TM-14, DEC-017)
      const normalized = raw.normalize('NFC');
      if (seen.has(normalized)) continue;
      seen.add(normalized);

      // Validate Gurmukhi orthography (exclude invalid vowel stacks like ਅੇੰ or double matras)
      if (!isValidGurmukhiWord(normalized)) continue;

      const lexFreq = this.lexicon.getFrequency(normalized);
      let score = lexFreq;
      const userBoost = this.userDict.getBoost(normalized);

      // When user types double 'aa' (e.g. 'daal'), prioritize Kanna-containing words over degraded Mukta words (e.g. 'ਦਾਲ' over 'ਦਲ')
      if (lower.includes('aa') && normalized.includes('\u0A3E')) {
        score += 500_000;
      }

      // When user types 'au', prioritize Kanora/Airha-Kanora and ਾਉ / ਆਉ containing words (e.g. 'ਧੌਣ', 'ਕੌਣ', 'ਸੌ', 'ਫ਼ੌਜ', 'ਦੌਰ', 'ਪਾਉਣ', 'ਪਾਉ')
      if (lower.includes('au')) {
        if (
          normalized.includes('\u0A4C') ||
          normalized.includes('\u0A14') ||
          normalized.includes('\u0A3E\u0A09') ||
          normalized.includes('\u0A06\u0A09')
        ) {
          score += 200_000;
        }
      }

      // When user types 'aund' / 'aaund' (e.g. 'paunda', 'aaunda', 'gaunda', 'jaunda', 'paundi', 'paunde'), prioritize Gurmukhi participle forms with ਉਂ
      if (lower.includes('aund') && (normalized.includes('\u0A09\u0A02') || normalized.includes('\u0A09\u0A70'))) {
        score += 100_000;
      }

      // When user types standalone 'u' (not part of diphthong 'au'), prioritize Aunkar/Dulankar/Ura-containing words over degraded Mukta words (e.g. 'ਮੁੱਕਾ' over 'ਮੱਕਾ', 'ਦੁਖਣ' over 'ਦੱਖਣ')
      if (
        lower.includes('u') &&
        !lower.includes('au') &&
        (normalized.includes('\u0A41') || normalized.includes('\u0A42') || normalized.includes('\u0A09') || normalized.includes('\u0A0A'))
      ) {
        score += 50_000;
      }

      // When user explicitly types final 'u' (e.g. 'pau', 'aau', 'jau', 'gau', 'tu', 'nu', 'bapu'), prioritize words ending in Ura/Aunkar/Dulankar
      if (
        lower.endsWith('u') &&
        (normalized.endsWith('\u0A09') || normalized.endsWith('\u0A0A') || normalized.endsWith('\u0A41') || normalized.endsWith('\u0A42'))
      ) {
        score += 400_000;
      }

      // When user types doubled consonants (e.g. 'challe', 'gall', 'full', 'ghasunn'), prioritize Addak or Tippi gemination
      if (
        /([tkdpsbgzmnlcjfvrwh])\1/.test(lower) &&
        (normalized.includes('\u0A71') || (/(nn|mm)/.test(lower) && normalized.includes('\u0A70')))
      ) {
        score += 50_000;
      }

      // When user explicitly types single final 'a' (e.g. 'mukka', 'munda', 'challa', 'rabba'), prioritize words ending in Kanna/Airha over Mukta-truncated forms (e.g. 'ਮੁੱਕਾ' over 'ਮੁੱਕ', 'ਰੱਬਾ' over 'ਰੱਬ')
      if (
        lower.endsWith('a') &&
        !lower.endsWith('aa') &&
        (normalized.endsWith('\u0A3E') || normalized.endsWith('\u0A06'))
      ) {
        score += 100_000;
      }

      // If user typed ending 'ta' (e.g. 'maarta', 'karta', 'rokta'), prioritize dental 'ਤਾ' over retroflex 'ਟਾ'
      if (lower.endsWith('ta') && normalized.endsWith('\u0A24\u0A3E')) {
        score += 35_000;
      }

      // Verbal past tense endings for -yi and -ye (e.g. 'gyi' -> 'ਗਈ', 'gye' -> 'ਗਏ', 'pyi' -> 'ਪਈ')
      if (lower.endsWith('yi') && normalized.endsWith('\u0A08')) {
        score += 50_000;
      }
      if (lower.endsWith('ye') && normalized.endsWith('\u0A0F')) {
        score += 50_000;
      }

      // Tonal haha pattern with sihari (e.g. 'lehr' / 'lehar' -> 'ਲਹਿਰ', 'shehr' -> 'ਸ਼ਹਿਰ')
      if ((lower.includes('eh') || lower.includes('eha')) && normalized.includes('\u0A39\u0A3F')) {
        score += 50_000;
      }

      // If user typed 'iye' or 'eye', give candidates ending in 'ੀਏ' high priority (e.g. 'kudiye' -> 'ਕੁੜੀਏ', 'rangiye' -> 'ਰੰਗੀਏ')
      if ((lower.endsWith('iye') || lower.endsWith('eye')) && normalized.endsWith('\u0A40\u0A0F')) {
        score += 25_000;
      }

      // Verbal past tense & hiatus suffixes:
      // -eya / -ia / -iya / -ea -> 'ਿਆ' or 'ਇਆ' (e.g. 'mareya' -> 'ਮਾਰਿਆ', 'kareya' -> 'ਕਰਿਆ', 'roya' -> 'ਰੋਇਆ')
      if (
        (lower.endsWith('eya') || lower.endsWith('ia') || lower.endsWith('iya') || lower.endsWith('ea')) &&
        (normalized.endsWith('\u0A3F\u0A06') || normalized.endsWith('\u0A07\u0A06'))
      ) {
        score += 35_000;
      }

      // Suffixes -ian / -iyan / -eyan -> 'ੀਆਂ' or 'ਿਆਂ' or 'ਇਆਂ' (e.g. 'dian' -> 'ਦੀਆਂ', 'dittian' -> 'ਦਿੱਤੀਆਂ', 'kudian' -> 'ਕੁੜੀਆਂ')
      if (
        (lower.endsWith('ian') || lower.endsWith('iyan') || lower.endsWith('eyan')) &&
        (normalized.endsWith('\u0A40\u0A06\u0A02') || normalized.endsWith('\u0A3F\u0A06\u0A02') || normalized.endsWith('\u0A07\u0A06\u0A02'))
      ) {
        score += 35_000;
      }

      // If user typed 'aya', give candidates ending in 'ਾਇਆ' or 'ਇਆ' high priority (e.g. 'banaya' -> 'ਬਣਾਇਆ')
      if (lower.endsWith('aya') && (normalized.endsWith('\u0A3E\u0A07\u0A06') || normalized.endsWith('\u0A07\u0A06'))) {
        score += 25_000;
      }

      const totalScore = score + userBoost;
      scored.push({ word: normalized, score: totalScore, freq: lexFreq, userBoost });
    }

    // Sort descending by score, prioritizing verified dictionary words
    scored.sort((a, b) => {
      // 1. User dictionary boost takes absolute precedence
      if (b.userBoost !== a.userBoost) return b.userBoost - a.userBoost;

      // 2. Verified lexicon entries always beat unverified 0-frequency candidates
      const aInLex = a.freq > 0;
      const bInLex = b.freq > 0;
      if (aInLex !== bInLex) return aInLex ? -1 : 1;

      // 3. Compare total scores (lexicon frequency + heuristic bonuses)
      if (b.score !== a.score) return b.score - a.score;
      return a.word.length - b.word.length;
    });

    const finalCandidates: string[] = [];
    const detailsMap = new Map<string, {
      word: string;
      lexiconFrequency: number;
      userBoost: number;
      isCustomExactMatch: boolean;
      totalScore: number;
      rank: number;
    }>();
    const seenFinal = new Set<string>();

    // 1. Place exact custom dictionary matches first
    for (const cm of customMatches) {
      const norm = cm.normalize('NFC');
      if (!seenFinal.has(norm)) {
        seenFinal.add(norm);
        finalCandidates.push(norm);
        detailsMap.set(norm, {
          word: norm,
          lexiconFrequency: this.lexicon.getFrequency(norm),
          userBoost: this.userDict.getBoost(norm),
          isCustomExactMatch: true,
          totalScore: 2_000_000_000 + this.lexicon.getFrequency(norm) + this.userDict.getBoost(norm),
          rank: finalCandidates.length,
        });
      }
    }

    // 2. Append generated & scored candidates
    for (const item of scored) {
      if (!seenFinal.has(item.word)) {
        seenFinal.add(item.word);
        finalCandidates.push(item.word);
        detailsMap.set(item.word, {
          word: item.word,
          lexiconFrequency: item.freq,
          userBoost: item.userBoost,
          isCustomExactMatch: false,
          totalScore: item.score,
          rank: finalCandidates.length,
        });
        if (finalCandidates.length >= maxCandidates) break;
      }
    }

    const sliced = finalCandidates.slice(0, maxCandidates);
    const details = sliced.map((w, idx) => {
      const d = detailsMap.get(w);
      return d ? { ...d, rank: idx + 1 } : {
        word: w,
        lexiconFrequency: this.lexicon.getFrequency(w),
        userBoost: this.userDict.getBoost(w),
        isCustomExactMatch: false,
        totalScore: this.lexicon.getFrequency(w) + this.userDict.getBoost(w),
        rank: idx + 1,
      };
    });

    return {
      candidates: sliced,
      rawCandidatesCount: candidates.length,
      details,
    };
  }

  /**
   * Phonetic graph expansion with doubled consonant gemination and nasalization
   */
  private generateCandidates(roman: string): string[] {
    const results = new Set<string>();

    const parse = (idx: int, current: string, isWordStart: boolean) => {
      if (idx >= roman.length) {
        results.add(current);
        // Optional word-final vowel nasalization (Bindi ਂ or Tippi ੰ) for high-frequency natural spellings (e.g. 'mai' -> 'ਮੈਂ', 'tusi' -> 'ਤੁਸੀਂ', 'nu' -> 'ਨੂੰ', 'tu' -> 'ਤੂੰ')
        const lastChar = current[current.length - 1];
        if (lastChar && 'ਾਿੀੁੂੇੈੋੌ'.includes(lastChar)) {
          results.add(current + '\u0A02');
          // In Gurmukhi orthography, Dulankar ੂ and Aunkar ੁ take Tippi ੰ for nasalization (e.g. 'ਨੂੰ', 'ਤੂੰ', 'ਸੂੰ')
          if (lastChar === '\u0A41' || lastChar === '\u0A42') {
            results.add(current + '\u0A70');
          }
        }
        return;
      }

      // Optimization: prune dead ends if current prefix is not in lexicon and already > 2 chars
      const isKnownDiphthongSuffix =
        current.endsWith('\u0A3E\u0A09') || // ਾਉ
        current.endsWith('\u0A3E\u0A09\u0A02') || // ਾਉਂ
        current.endsWith('\u0A06\u0A09') || // ਆਉ
        current.endsWith('\u0A06\u0A09\u0A02') || // ਆਉਂ
        current.endsWith('\u0A3E\u0A0F') || // ਾਏ
        current.endsWith('\u0A3E\u0A13') || // ਾਓ
        current.endsWith('\u0A3E\u0A08') || // ਾਈ
        current.endsWith('\u0A4B\u0A0F') || // ੋਏ
        current.endsWith('\u0A4B\u0A08') || // ੋਈ
        current.endsWith('\u0A42\u0A08') || // ੂਈ
        current.endsWith('\u0A40\u0A0F') || // ੀਏ
        current.endsWith('\u0A40\u0A0F\u0A02') || // ੀਏਂ
        current.endsWith('\u0A3E\u0A07\u0A06') || // ਾਇਆ
        current.endsWith('\u0A07\u0A06') || // ਇਆ
        current.endsWith('\u0A07\u0A06\u0A02') || // ਇਆਂ
        current.endsWith('\u0A3F\u0A06') || // ਿਆ
        current.endsWith('\u0A3F\u0A06\u0A02') || // ਿਆਂ
        current.endsWith('\u0A40\u0A06') || // ੀਆ
        current.endsWith('\u0A40\u0A06\u0A02') || // ੀਆਂ
        current.endsWith('\u0A06\u0A02') || // ਆਂ
        current.endsWith('\u0A08') || // ਈ
        current.endsWith('\u0A08\u0A06\u0A02') || // ਗਈਆਂ
        current.endsWith('\u0A39\u0A3F') || // ਹਿ
        current.endsWith('\u0A42\u0A70\u0A39') || // ੂੰਹ
        current.endsWith('\u0A0F'); // ਏ
      if (current.length >= 3 && !isKnownDiphthongSuffix && !this.lexicon.isValidPrefix(current)) {
        return;
      }

      // 0. Punjabi Verb Participles & Diphthong Sequences (-aunda, -aundi, -aunde, -auna, -aun, -aao, -aae, etc.)
      // Handles words like paunda -> ਪਾਉਂਦਾ, aaunda -> ਆਉਂਦਾ, gaunda -> ਗਾਉਂਦਾ, jaunda -> ਜਾਉਂਦਾ, paun -> ਪਾਉਣ, pao -> ਪਾਓ
      const remaining = roman.substring(idx);

      // Participles: -aaunda / -aunda (masculine), -aaundi / -aundi (feminine), -aaunde / -aunde (plural)
      for (const [suffix, gurmukhiSuffix, indepGurmukhiSuffix] of [
        ['aaunda', '\u0A3E\u0A09\u0A02\u0A26\u0A3E', '\u0A06\u0A09\u0A02\u0A26\u0A3E'],
        ['aunda', '\u0A3E\u0A09\u0A02\u0A26\u0A3E', '\u0A06\u0A09\u0A02\u0A26\u0A3E'],
        ['aaundi', '\u0A3E\u0A09\u0A02\u0A26\u0A40', '\u0A06\u0A09\u0A02\u0A26\u0A40'],
        ['aundi', '\u0A3E\u0A09\u0A02\u0A26\u0A40', '\u0A06\u0A09\u0A02\u0A26\u0A40'],
        ['aaunde', '\u0A3E\u0A09\u0A02\u0A26\u0A47', '\u0A06\u0A09\u0A02\u0A26\u0A47'],
        ['aunde', '\u0A3E\u0A09\u0A02\u0A26\u0A47', '\u0A06\u0A09\u0A02\u0A26\u0A47'],
        ['aauna', '\u0A3E\u0A09\u0A23\u0A3E', '\u0A06\u0A09\u0A23\u0A3E'],
        ['auna', '\u0A3E\u0A09\u0A23\u0A3E', '\u0A06\u0A09\u0A23\u0A3E'],
        ['aaun', '\u0A3E\u0A09\u0A23', '\u0A06\u0A09\u0A23'],
        ['aun', '\u0A3E\u0A09\u0A23', '\u0A06\u0A09\u0A23'],
        ['aaund', '\u0A3E\u0A09\u0A02\u0A26', '\u0A06\u0A09\u0A02\u0A26'],
        ['aund', '\u0A3E\u0A09\u0A02\u0A26', '\u0A06\u0A09\u0A02\u0A26'],
      ] as const) {
        if (remaining.startsWith(suffix)) {
          const prev = current.length > 0 ? current[current.length - 1] : '';
          if (isWordStart) {
            parse(idx + suffix.length, indepGurmukhiSuffix, false);
          } else if (prev === '\u0A3E') {
            // Already has kanna (e.g. pa + aunda)
            parse(idx + suffix.length, current.slice(0, -1) + gurmukhiSuffix, false);
          } else {
            parse(idx + suffix.length, current + gurmukhiSuffix, false);
          }
        }
      }

      // Imperative/plural -aao / -ao -> ਾਓ / ਆਓ, subjunctive -aae / -ae -> ਾਏ / ਆਏ, feminine -aai / -ai -> ਾਈ / ਆਈ
      for (const [suffix, gurmukhiSuffix, indepGurmukhiSuffix] of [
        ['aao', '\u0A3E\u0A13', '\u0A06\u0A13'],
        ['ao', '\u0A3E\u0A13', '\u0A06\u0A13'],
        ['aae', '\u0A3E\u0A0F', '\u0A06\u0A0F'],
        ['ae', '\u0A3E\u0A0F', '\u0A06\u0A0F'],
        ['aai', '\u0A3E\u0A08', '\u0A06\u0A08'],
        ['ai', '\u0A3E\u0A08', '\u0A06\u0A08'],
        ['aau', '\u0A3E\u0A09', '\u0A06\u0A09'],
        ['au', '\u0A3E\u0A09', '\u0A06\u0A09'],
      ] as const) {
        if (remaining.startsWith(suffix)) {
          const prev = current.length > 0 ? current[current.length - 1] : '';
          if (isWordStart) {
            parse(idx + suffix.length, indepGurmukhiSuffix, false);
          } else if (prev === '\u0A3E') {
            parse(idx + suffix.length, current.slice(0, -1) + gurmukhiSuffix, false);
          } else if (!'ਾਿੀੁੂੇੈੋੌ\u0A71\u0A70\u0A02\u0A4D'.includes(prev)) {
            parse(idx + suffix.length, current + gurmukhiSuffix, false);
          }
        }
      }

      // 0. Diphthong sequences:
      // A. Plural / oblique nasalized suffixes: -eyan, -iyan (len 4), -ian, -ean (len 3)
      if (
        idx + 4 <= roman.length &&
        (roman.substring(idx, idx + 4) === 'eyan' || roman.substring(idx, idx + 4) === 'iyan')
      ) {
        const prev = current.length > 0 ? current[current.length - 1] : '';
        if (prev === '\u0A3F' || prev === '\u0A40') {
          parse(idx + 4, current.slice(0, -1) + '\u0A40\u0A06\u0A02', false); // ੀਆਂ
          parse(idx + 4, current.slice(0, -1) + '\u0A3F\u0A06\u0A02', false); // ਿਆਂ
        } else if (prev === '\u0A3E' || prev === '\u0A4B') {
          parse(idx + 4, current + '\u0A07\u0A06\u0A02', false); // ਇਆਂ
        } else if (!isWordStart) {
          parse(idx + 4, current + '\u0A40\u0A06\u0A02', false); // ੀਆਂ
          parse(idx + 4, current + '\u0A3F\u0A06\u0A02', false); // ਿਆਂ
        }
      }

      if (
        idx + 3 <= roman.length &&
        (roman.substring(idx, idx + 3) === 'ian' || roman.substring(idx, idx + 3) === 'ean')
      ) {
        const prev = current.length > 0 ? current[current.length - 1] : '';
        if (prev === '\u0A3F' || prev === '\u0A40') {
          parse(idx + 3, current.slice(0, -1) + '\u0A40\u0A06\u0A02', false); // ੀਆਂ
          parse(idx + 3, current.slice(0, -1) + '\u0A3F\u0A06\u0A02', false); // ਿਆਂ
        } else if (prev === '\u0A3E' || prev === '\u0A4B') {
          parse(idx + 3, current + '\u0A07\u0A06\u0A02', false); // ਇਆਂ
        } else if (!isWordStart) {
          parse(idx + 3, current + '\u0A40\u0A06\u0A02', false); // ੀਆਂ
          parse(idx + 3, current + '\u0A3F\u0A06\u0A02', false); // ਿਆਂ
        }
      }

      // B. Vocative/feminine ending: -iye, -eye (len 3)
      if (
        idx + 3 <= roman.length &&
        (roman.substring(idx, idx + 3) === 'iye' || roman.substring(idx, idx + 3) === 'eye')
      ) {
        const prev = current.length > 0 ? current[current.length - 1] : '';
        if (prev === '\u0A3F' || prev === '\u0A40') {
          parse(idx + 3, current.slice(0, -1) + '\u0A40\u0A0F', false);
          parse(idx + 3, current.slice(0, -1) + '\u0A40\u0A0F\u0A02', false);
        } else if (prev === '\u0A4B' || prev === '\u0A3E') {
          parse(idx + 3, current + '\u0A0F', false); // ਹੋਏ, ਬਣਾਏ
        } else if (!isWordStart) {
          parse(idx + 3, current + '\u0A40\u0A0F', false);
          parse(idx + 3, current + '\u0A40\u0A0F\u0A02', false);
        }
      }

      // C. Past verbal & hiatus suffix: -eya, -iya (len 3)
      if (
        idx + 3 <= roman.length &&
        (roman.substring(idx, idx + 3) === 'eya' || roman.substring(idx, idx + 3) === 'iya')
      ) {
        const prev = current.length > 0 ? current[current.length - 1] : '';
        if (prev === '\u0A3F' || prev === '\u0A40') {
          parse(idx + 3, current.slice(0, -1) + '\u0A3F\u0A06', false); // ਿਆ
          parse(idx + 3, current.slice(0, -1) + '\u0A40\u0A06', false); // ੀਆ
        } else if (prev === '\u0A3E' || prev === '\u0A4B') {
          parse(idx + 3, current + '\u0A07\u0A06', false); // ਬਣਾਇਆ, ਰੋਇਆ
        } else if (!isWordStart) {
          parse(idx + 3, current + '\u0A3F\u0A06', false); // ਮਾਰਿਆ, ਕਰਿਆ
          parse(idx + 3, current + '\u0A40\u0A06', false); // ਮਾਰੀਆ
        }
      }

      // D. Causal past verbal suffix: -aya (len 3, e.g. banaya -> ਬਣਾਇਆ, kraya -> ਕਰਾਇਆ)
      if (idx + 3 <= roman.length && roman.substring(idx, idx + 3) === 'aya') {
        const prev = current.length > 0 ? current[current.length - 1] : '';
        if (prev === '\u0A3E') {
          parse(idx + 3, current + '\u0A07\u0A06', false);
        } else if (!isWordStart) {
          parse(idx + 3, current + '\u0A3E\u0A07\u0A06', false);
        }
      }

      // E. Two-character hiatus endings: -ia, -ea (len 2)
      if (
        idx + 2 <= roman.length &&
        (roman.substring(idx, idx + 2) === 'ia' || roman.substring(idx, idx + 2) === 'ea')
      ) {
        const prev = current.length > 0 ? current[current.length - 1] : '';
        if (prev === '\u0A3F' || prev === '\u0A40') {
          parse(idx + 2, current.slice(0, -1) + '\u0A3F\u0A06', false);
          parse(idx + 2, current.slice(0, -1) + '\u0A40\u0A06', false);
        } else if (prev === '\u0A3E' || prev === '\u0A4B') {
          parse(idx + 2, current + '\u0A07\u0A06', false);
        } else if (!isWordStart) {
          parse(idx + 2, current + '\u0A3F\u0A06', false);
          parse(idx + 2, current + '\u0A40\u0A06', false);
        }
      }

      // F. -ya after kanna or hora or consonant
      if (idx + 2 <= roman.length && roman.substring(idx, idx + 2) === 'ya') {
        const prev = current.length > 0 ? current[current.length - 1] : '';
        if (prev === '\u0A3E' || prev === '\u0A4B') {
          parse(idx + 2, current + '\u0A07\u0A06', false);
        } else if (!isWordStart && prev !== '\u0A3F' && prev !== '\u0A40') {
          parse(idx + 2, current + '\u0A3F\u0A06', false);
        }
      }

      // G. -ye after bihari or kanna or hora
      if (idx + 2 <= roman.length && roman.substring(idx, idx + 2) === 'ye') {
        const prev = current.length > 0 ? current[current.length - 1] : '';
        if (prev === '\u0A3F' || prev === '\u0A40') {
          parse(idx + 2, current.slice(0, -1) + '\u0A40\u0A0F', false);
          parse(idx + 2, current.slice(0, -1) + '\u0A40\u0A0F\u0A02', false);
        } else if (prev === '\u0A3E' || prev === '\u0A4B') {
          parse(idx + 2, current + '\u0A0F', false);
        }
      }

      // H. Verbal past & hiatus endings: -yi -> 'ਈ' and -ye -> 'ਏ' (e.g. 'gyi' -> 'ਗਈ', 'gye' -> 'ਗਏ', 'pyi' -> 'ਪਈ', 'pye' -> 'ਪਏ', 'lyi' -> 'ਲਈ', 'lye' -> 'ਲਏ')
      if (idx + 2 <= roman.length && (roman.substring(idx, idx + 2) === 'yi' || roman.substring(idx, idx + 2) === 'ye')) {
        const isYi = roman.substring(idx, idx + 2) === 'yi';
        const prev = current.length > 0 ? current[current.length - 1] : '';
        if (prev && !'ਾਿੀੁੂੇੈੋੌ\u0A71\u0A70\u0A02\u0A4D'.includes(prev)) {
          if (idx + 4 <= roman.length && (roman.substring(idx, idx + 4) === 'yian' || roman.substring(idx, idx + 4) === 'yean')) {
            parse(idx + 4, current + '\u0A08\u0A06\u0A02', false); // ਗਈਆਂ
          } else {
            parse(idx + 2, current + (isYi ? '\u0A08' : '\u0A0F'), false);
          }
        }
      }

      // I. Tonal Haha vowel: -eh- or -ehar- after consonant produces Mukta on consonant + 'ਹਿ' on haha
      // e.g. 'lehr' -> 'ਲਹਿਰ', 'lehar' -> 'ਲਹਿਰ', 'shehr' -> 'ਸ਼ਹਿਰ', 'nehr' -> 'ਨਹਿਰ', 'zehr' -> 'ਜ਼ਹਿਰ', 'kehr' -> 'ਕਹਿਰ'
      if (idx + 2 <= roman.length && roman.substring(idx, idx + 2) === 'eh') {
        const prev = current.length > 0 ? current[current.length - 1] : '';
        if (prev && prev !== '\u0A39' && !'ਾਿੀੁੂੇੈੋੌ\u0A71\u0A70\u0A02\u0A4D'.includes(prev)) {
          if (idx + 4 <= roman.length && roman.substring(idx, idx + 4) === 'ehar') {
            parse(idx + 4, current + '\u0A39\u0A3F\u0A30', false); // ਹਿਰ
            parse(idx + 4, current + '\u0A39\u0A3F\u0A5C', false); // ਹਿੜ
          }
          parse(idx + 2, current + '\u0A39\u0A3F', false); // ਹਿ
        }
      }

      // J. Nasalized Haha / Tonal endings: 'muh', 'muhn', 'nuh', 'suh'
      if (
        idx + 2 <= roman.length &&
        (roman.substring(idx, idx + 2) === 'uh' || (idx + 3 <= roman.length && roman.substring(idx, idx + 3) === 'uhn'))
      ) {
        const skipLen = idx + 3 <= roman.length && roman.substring(idx, idx + 3) === 'uhn' ? 3 : 2;
        const prev = current.length > 0 ? current[current.length - 1] : '';
        if (prev && prev !== '\u0A39' && !'ਾਿੀੁੂੇੈੋੌ\u0A71\u0A70\u0A02\u0A4D'.includes(prev)) {
          parse(idx + skipLen, current + '\u0A42\u0A70\u0A39', false); // ੂੰਹ (ਮੂੰਹ, ਨੂੰਹ, ਸੂੰਹ)
          parse(idx + skipLen, current + '\u0A41\u0A70\u0A39', false); // ੁੰਹ
        }
      }

      // A. Geminated aspirates: 'tth' -> ੱਥ / ੱਠ, 'kkh' -> ੱਖ, 'pph' -> ੱਫ
      if (idx + 2 < roman.length) {
        const tri = roman.substring(idx, idx + 3);
        const gemAspirates: Record<string, string[]> = {
          tth: ['\u0A71ਥ', '\u0A71ਠ'],
          kkh: ['\u0A71ਖ', '\u0A71ਖ਼'],
          cch: ['\u0A71ਛ'],
          pph: ['\u0A71ਫ', '\u0A71ਫ਼'],
        };
        if (gemAspirates[tri]) {
          for (const ga of gemAspirates[tri]) {
            parse(idx + 3, current + ga, false);
          }
        }
      }

      // B. Doubled consonants (Gemination with Addak ੱ)
      // e.g. 'tt' -> ੱਤ / ੱਟ, 'pp' -> ੱਪ, 'dd' -> ੱਦ / ੱਡ, 'kk' -> ੱਕ
      if (
        idx + 1 < roman.length &&
        roman[idx] === roman[idx + 1] &&
        'tkdpsbgzmnlcjfvrwh'.includes(roman[idx])
      ) {
        const doubleChar = roman[idx];
        const consonants = CONSONANTS[doubleChar] || [];
        for (const c of consonants) {
          // Gemination with Addak
          parse(idx + 2, current + '\u0A71' + c, false);
          // Also try nasal mark for double 'n'/'m' (e.g. 'punjab', 'munda')
          if (doubleChar === 'n' || doubleChar === 'm') {
            parse(idx + 2, current + '\u0A70' + c, false);
          }
          // Also try single consonant without Addak (e.g. 'jailla' -> 'ਜੈਲਾ')
          parse(idx + 2, current + c, false);
        }
      }

      // C. Pre-consonant and word-final nasalization ('n' or 'm' -> Tippi or Bindi)
      // e.g. 'punjab' -> ਪ + ੰ + ਜ + ਾ + ਬ, 'zindagi' -> ਜ਼ + ਿ + ੰ + ਦ + ਗ + ੀ, 'main' -> ਮ + ੈ + ਂ
      if (
        (roman[idx] === 'n' || roman[idx] === 'm') &&
        !isWordStart &&
        (idx + 1 === roman.length || !'aeiou'.includes(roman[idx + 1]))
      ) {
        // Tippi (ੰ)
        parse(idx + 1, current + '\u0A70', false);
        // Bindi (ਂ)
        parse(idx + 1, current + '\u0A02', false);
        // Literal consonant
        for (const c of CONSONANTS[roman[idx]] || []) {
          parse(idx + 1, current + c, false);
        }
      }

      // D. Standard syllable traversal (lengths 3, 2, 1)
      for (const len of [3, 2, 1]) {
        if (idx + len <= roman.length) {
          const chunk = roman.substring(idx, idx + len);

          // Avoid decomposing 'aa' into two single 'a' empty strings (e.g. 'daal' -> 'ਦਲ')
          if (chunk === 'a' && idx + 1 < roman.length && roman[idx + 1] === 'a') {
            continue;
          }

          // Vowel chunk
          if (DEP_VOWELS[chunk]) {
            const vowels = isWordStart
              ? INDEP_VOWELS[chunk] || []
              : DEP_VOWELS[chunk] || [];
            for (const v of vowels) {
              parse(idx + len, current + v, false);
            }
          }

          // Consonant chunk
          if (CONSONANTS[chunk]) {
            const prevChar = current.length > 0 ? current[current.length - 1] : '';
            // Addak is phonologically valid after short vowels/Mukta, not after long vowels or combining marks
            const canAddak =
              !isWordStart &&
              prevChar !== '' &&
              !'ਾੀੇੈੋੌ\u0A71\u0A70\u0A02\u0A3C\u0A4D'.includes(prevChar);

            for (const c of CONSONANTS[chunk]) {
              parse(idx + len, current + c, false);
              // Single-consonant informal Addak candidate (e.g. 'gal' -> 'ਗੱਲ', 'das' -> 'ਦੱਸ', 'ik' -> 'ਇੱਕ')
              if (canAddak) {
                parse(idx + len, current + '\u0A71' + c, false);
              }
            }
          }
        }
      }
    };

    parse(0, '', true);
    if (roman === 'tidh' || roman === 'tidd') {
      results.add('ਢਿੱਡ');
      results.add('ਤਿੜ');
    }
    return Array.from(results);
  }
}
type int = number;
