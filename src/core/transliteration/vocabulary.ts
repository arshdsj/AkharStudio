/**
 * vocabulary.ts - Curated English Loanwords and Offline English-to-Punjabi Word Suggestion Adapter
 *
 * Implements:
 * 1. Established Gurmukhi spellings for frequently used English loanwords (Phase 3).
 * 2. Integration with the authoritative native dictionary in `./nativeDictionary` (Phase 3 Runtime).
 * 3. Support for loanword-only, loanword-first, and native-first ordering strategies.
 *
 * All native English-to-Punjabi equivalents are loaded exclusively from `./nativeDictionary`.
 * Duplication of native dictionary entries in this file has been eliminated.
 */

import {
  lookupNativeWord,
  isQualifyingSingleWord,
} from './nativeDictionary';

export interface VocabularyMatch {
  /** Established loanword transliteration in Gurmukhi (e.g., 'ਫੋਨ' for 'phone') */
  loanword?: string;
  /** Ordering strategy */
  strategy?: 'loanword-first' | 'native-first' | 'loanword-only' | 'native-only';
}

/**
 * Curated offline loanword repository.
 * Keys are lowercased English / Roman words.
 */
export const CURATED_VOCABULARY: Record<string, VocabularyMatch> = {
  // Required Phase 3 loanwords:
  phone: {
    loanword: 'ਫੋਨ',
    strategy: 'loanword-only',
  },
  mobile: {
    loanword: 'ਮੋਬਾਈਲ',
    strategy: 'loanword-only',
  },
  tyre: {
    loanword: 'ਟਾਇਰ',
    strategy: 'loanword-only',
  },
  tire: {
    loanword: 'ਟਾਇਰ',
    strategy: 'loanword-only',
  },
  motor: {
    loanword: 'ਮੋਟਰ',
    strategy: 'loanword-only',
  },
  cycle: {
    loanword: 'ਸਾਈਕਲ',
    strategy: 'loanword-first',
  },
  // Approved Release Policy: 'table' is strictly loanword-only ('ਟੇਬਲ').
  // Review-required translation 'ਮੇਜ਼' is quarantined from production.
  table: {
    loanword: 'ਟੇਬਲ',
    strategy: 'loanword-only',
  },
  cover: {
    loanword: 'ਕਵਰ',
    strategy: 'loanword-first',
  },
  case: {
    loanword: 'ਕੇਸ',
    strategy: 'loanword-only',
  },
  pack: {
    loanword: 'ਪੈਕ',
    strategy: 'loanword-only',
  },
  doctor: {
    loanword: 'ਡਾਕਟਰ',
    strategy: 'loanword-only',
  },
  hospital: {
    loanword: 'ਹਸਪਤਾਲ',
    strategy: 'loanword-only',
  },
  school: {
    loanword: 'ਸਕੂਲ',
    strategy: 'loanword-only',
  },
  bus: {
    loanword: 'ਬੱਸ',
    strategy: 'loanword-only',
  },
  ticket: {
    loanword: 'ਟਿਕਟ',
    strategy: 'loanword-only',
  },
  cup: {
    loanword: 'ਕੱਪ',
    strategy: 'loanword-only',
  },
  glass: {
    loanword: 'ਗਲਾਸ',
    strategy: 'loanword-only',
  },
  bank: {
    loanword: 'ਬੈਂਕ',
    strategy: 'loanword-only',
  },
  bill: {
    loanword: 'ਬਿੱਲ',
    strategy: 'loanword-only',
  },
  class: {
    loanword: 'ਕਲਾਸ',
    strategy: 'loanword-only',
  },
  party: {
    loanword: 'ਪਾਰਟੀ',
    strategy: 'loanword-only',
  },
  police: {
    loanword: 'ਪੁਲਿਸ',
    strategy: 'loanword-only',
  },
  number: {
    loanword: 'ਨੰਬਰ',
    strategy: 'loanword-only',
  },
  record: {
    loanword: 'ਰਿਕਾਰਡ',
    strategy: 'loanword-only',
  },
  film: {
    loanword: 'ਫਿਲਮ',
    strategy: 'loanword-only',
  },
  check: {
    loanword: 'ਚੈੱਕ',
    strategy: 'loanword-only',
  },
  card: {
    loanword: 'ਕਾਰਡ',
    strategy: 'loanword-only',
  },
  bag: {
    loanword: 'ਬੈਗ',
    strategy: 'loanword-only',
  },
  line: {
    loanword: 'ਲਾਈਨ',
    strategy: 'loanword-only',
  },
  car: {
    loanword: 'ਕਾਰ',
    strategy: 'loanword-only',
  },
  photo: {
    loanword: 'ਫੋਟੋ',
    strategy: 'loanword-only',
  },
  fan: {
    loanword: 'ਫੈਨ',
    strategy: 'loanword-only',
  },
  road: {
    loanword: 'ਰੋਡ',
    strategy: 'loanword-only',
  },
  time: {
    loanword: 'ਟਾਈਮ',
    strategy: 'loanword-first',
  },
  train: {
    loanword: 'ਟਰੇਨ',
    strategy: 'loanword-first',
  },
  pen: {
    loanword: 'ਪੈੱਨ',
    strategy: 'loanword-first',
  },
  bed: {
    loanword: 'ਬੈੱਡ',
    strategy: 'loanword-first',
  },
  room: {
    loanword: 'ਰੂਮ',
    strategy: 'loanword-first',
  },
  gate: {
    loanword: 'ਗੇਟ',
    strategy: 'loanword-first',
  },
  office: {
    loanword: 'ਆਫਿਸ',
    strategy: 'native-first',
  },

  // Approved Phase 3 additions:
  computer: {
    loanword: 'ਕੰਪਿਊਟਰ',
    strategy: 'loanword-only',
  },
  internet: {
    loanword: 'ਇੰਟਰਨੈੱਟ',
    strategy: 'loanword-only',
  },
};

export interface VocabularyCandidate {
  word: string;
  isLoanword: boolean;
  isTranslation: boolean;
  scoreBonus: number;
}

/**
 * Get vocabulary suggestions for a Roman input word.
 *
 * Strict boundaries:
 * - Operates exclusively on individual English words (no spaces, phrases, or sentences).
 * - Distinguishes native Punjabi vocabulary translations from loanword transliterations.
 * - Delegates all native Punjabi lookups to `nativeDictionary.ts`.
 */
export function getVocabularySuggestions(roman: string): VocabularyCandidate[] {
  if (!roman || typeof roman !== 'string') return [];

  // Reject multi-word phrases, sentences, punctuation, or spaces
  if (!isQualifyingSingleWord(roman)) return [];

  const lower = roman.toLowerCase();
  const results: VocabularyCandidate[] = [];

  // 1. Check dedicated native Punjabi vocabulary dictionary (exact match default)
  const nativeMatch = lookupNativeWord(lower, { enableTypoTolerance: false });

  // 2. Check loanword registry
  const loanwordEntry = CURATED_VOCABULARY[lower];

  // Pure loanword entry (e.g. 'phone' -> 'ਫੋਨ', 'mobile' -> 'ਮੋਬਾਈਲ', 'table' -> 'ਟੇਬਲ', 'computer' -> 'ਕੰਪਿਊਟਰ'):
  // Must NOT produce a native vocabulary translation.
  if (loanwordEntry && loanwordEntry.strategy === 'loanword-only') {
    if (loanwordEntry.loanword) {
      results.push({
        word: loanwordEntry.loanword,
        isLoanword: true,
        isTranslation: false,
        scoreBonus: 8_000_000,
      });
    }
    return results;
  }

  // Dual loanword & native vocabulary word (e.g. 'cycle' -> 'ਸਾਈਕਲ' and 'ਚੱਕਰ', 'cover' -> 'ਕਵਰ' and 'ਢੱਕਣਾ'):
  if (loanwordEntry?.loanword && nativeMatch) {
    const loanwordBonus = 50_000_000;
    const nativeBonus = 40_000_000;
    const strategy = loanwordEntry.strategy || 'loanword-first';

    const addLoanword = () => {
      if (loanwordEntry.loanword) {
        results.push({
          word: loanwordEntry.loanword,
          isLoanword: true,
          isTranslation: false,
          scoreBonus: strategy === 'loanword-first' ? loanwordBonus : nativeBonus,
        });
      }
    };

    const addNative = () => {
      const bonus = strategy === 'native-first' ? loanwordBonus : nativeBonus;
      results.push({
        word: nativeMatch.punjabi,
        isLoanword: false,
        isTranslation: true,
        scoreBonus: bonus,
      });

      // Additional senses
      if (nativeMatch.additionalSenses && nativeMatch.additionalSenses.length > 0) {
        for (const sense of nativeMatch.additionalSenses) {
          if (sense.primary !== nativeMatch.punjabi && !results.some((r) => r.word === sense.primary)) {
            results.push({
              word: sense.primary,
              isLoanword: false,
              isTranslation: true,
              scoreBonus: bonus - 5_000_000,
            });
          }
        }
      }

      // Alternatives
      for (const alt of nativeMatch.alternatives) {
        if (!results.some((r) => r.word === alt)) {
          results.push({
            word: alt,
            isLoanword: false,
            isTranslation: true,
            scoreBonus: bonus - 10_000_000,
          });
        }
      }
    };

    if (strategy === 'native-first') {
      addNative();
      addLoanword();
    } else {
      addLoanword();
      addNative();
    }
    return results;
  }

  // Native dictionary match
  if (nativeMatch) {
    const scoreBonus = nativeMatch.isExactMatch ? 50_000_000 : 45_000_000;
    results.push({
      word: nativeMatch.punjabi,
      isLoanword: false,
      isTranslation: true,
      scoreBonus,
    });

    // Additional senses (e.g. ache -> noun: ਪੀੜ, verb: ਪੀੜ ਕਰਨਾ)
    if (nativeMatch.additionalSenses && nativeMatch.additionalSenses.length > 0) {
      for (const sense of nativeMatch.additionalSenses) {
        if (sense.primary !== nativeMatch.punjabi && !results.some((r) => r.word === sense.primary)) {
          results.push({
            word: sense.primary,
            isLoanword: false,
            isTranslation: true,
            scoreBonus: scoreBonus - 10_000_000,
          });
        }
      }
    }

    // Alternative translations (e.g. disappointed -> ਮਾਯੂਸ, ਉਦਾਸ)
    for (const alt of nativeMatch.alternatives) {
      if (!results.some((r) => r.word === alt)) {
        results.push({
          word: alt,
          isLoanword: false,
          isTranslation: true,
          scoreBonus: scoreBonus - 20_000_000,
        });
      }
    }
    return results;
  }

  // Fallback in CURATED_VOCABULARY if present
  if (loanwordEntry?.loanword) {
    results.push({
      word: loanwordEntry.loanword,
      isLoanword: true,
      isTranslation: false,
      scoreBonus: 50_000_000,
    });
  }

  return results;
}
