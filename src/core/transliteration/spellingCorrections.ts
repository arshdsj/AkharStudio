/**
 * spellingCorrections.ts - Curated Punjabi Spelling Corrections and Prioritisations
 *
 * Implements a maintainable, data-driven linguistic correction and prioritisation layer
 * that prioritises linguistically correct, commonly accepted Punjabi spellings over
 * purely phonetic alternatives without breaking existing transliteration rules.
 */

export interface SpellingCorrectionRule {
  /** Preferred suggestions in order of linguistic priority */
  preferred?: string[];
  /** Suggestions that should be explicitly excluded from normal results */
  excluded?: string[];
  /** Priority score adjustments for specific candidates */
  scoreAdjustments?: Record<string, number>;
}

/**
 * Curated spelling rules keyed by lowercased Roman input.
 */
export const CURATED_SPELLING_RULES: Record<string, SpellingCorrectionRule> = {
  // sun: Roman Punjabi phonetic imperative 'ਸੁਣ' (listen) / past 'ਸਨ'
  sun: {
    preferred: ['ਸੁਣ', 'ਸਨ'],
    scoreAdjustments: {
      'ਸੁਣ': 2_000_000,
    },
  },

  // dhyaan: Sanskrit loanword ध्यान -> ਧਿਆਨ (exclude invalid ਧਯਾਨ)
  dhyaan: {
    preferred: ['ਧਿਆਨ'],
    excluded: ['ਧਯਾਨ', 'ਧਯਾੰ', 'ਧਯਾਂ'],
    scoreAdjustments: {
      'ਧਿਆਨ': 5_000_000,
    },
  },
  dhyan: {
    preferred: ['ਧਿਆਨ'],
    excluded: ['ਧਯਾਨ', 'ਧਯਾੰ', 'ਧਯਾਂ'],
    scoreAdjustments: {
      'ਧਿਆਨ': 5_000_000,
    },
  },

  // eh: Demonstrative pronoun "this" -> prioritize ਇਹ over ਏਹ
  eh: {
    preferred: ['ਇਹ', 'ਏਹ'],
    scoreAdjustments: {
      'ਇਹ': 5_000_000,
      'ਏਹ': 3_000_000,
    },
  },

  // walh: Subjoined Haha (Pairin Haha) forms ਵੱਲ੍ਹ, ਵਲ੍ਹ, ਵਾਲ੍ਹ
  // Strictly exclude malformed full-Haha combinations: ਵਲਹ, ਵਲੱਹ, ਵੱਲਹ
  walh: {
    preferred: ['ਵੱਲ੍ਹ', 'ਵਲ੍ਹ', 'ਵਾਲ੍ਹ'],
    excluded: ['ਵਲਹ', 'ਵਲੱਹ', 'ਵੱਲਹ', 'ਵਲ਼ਹ', 'ਵਾਲਹ'],
    scoreAdjustments: {
      'ਵੱਲ੍ਹ': 5_000_000,
      'ਵਲ੍ਹ': 4_000_000,
      'ਵਾਲ੍ਹ': 3_000_000,
    },
  },
  vallh: {
    preferred: ['ਵੱਲ੍ਹ', 'ਵਲ੍ਹ', 'ਵਾਲ੍ਹ'],
    excluded: ['ਵਲਹ', 'ਵਲੱਹ', 'ਵੱਲਹ', 'ਵਲ਼ਹ', 'ਵਾਲਹ'],
    scoreAdjustments: {
      'ਵੱਲ੍ਹ': 5_000_000,
      'ਵਲ੍ਹ': 4_000_000,
      'ਵਾਲ੍ਹ': 3_000_000,
    },
  },
  valh: {
    preferred: ['ਵੱਲ੍ਹ', 'ਵਲ੍ਹ', 'ਵਾਲ੍ਹ'],
    excluded: ['ਵਲਹ', 'ਵਲੱਹ', 'ਵੱਲਹ', 'ਵਲ਼ਹ', 'ਵਾਲਹ'],
    scoreAdjustments: {
      'ਵੱਲ੍ਹ': 5_000_000,
      'ਵਲ੍ਹ': 4_000_000,
      'ਵਾਲ੍ਹ': 3_000_000,
    },
  },

  // dardi: Verbal feminine participle of ਡਰਨਾ (to fear) -> prioritize ਡਰਦੀ over ਦਰਦੀ
  dardi: {
    preferred: ['ਡਰਦੀ'],
    scoreAdjustments: {
      'ਡਰਦੀ': 4_000_000,
      'ਦਰਦੀ': -500_000,
    },
  },

  // darda: Verbal masculine participle of ਡਰਨਾ (to fear) -> prioritize ਡਰਦਾ
  darda: {
    preferred: ['ਡਰਦਾ'],
    scoreAdjustments: {
      'ਡਰਦਾ': 4_000_000,
    },
  },

  // dard: Noun for pain (Persian loanword ਦਰਦ) -> prioritize ਦਰਦ
  dard: {
    preferred: ['ਦਰਦ'],
    scoreAdjustments: {
      'ਦਰਦ': 4_000_000,
    },
  },

  // lendi / laindi: Verbal feminine participle of ਲੈਣਾ -> ਲੈਂਦੀ
  lendi: {
    preferred: ['ਲੈਂਦੀ'],
    scoreAdjustments: {
      'ਲੈਂਦੀ': 5_000_000,
    },
  },
  laindi: {
    preferred: ['ਲੈਂਦੀ'],
    scoreAdjustments: {
      'ਲੈਂਦੀ': 5_000_000,
    },
  },
  lenda: {
    preferred: ['ਲੈਂਦਾ'],
    scoreAdjustments: {
      'ਲੈਂਦਾ': 5_000_000,
    },
  },
  lainda: {
    preferred: ['ਲੈਂਦਾ'],
    scoreAdjustments: {
      'ਲੈਂਦਾ': 5_000_000,
    },
  },
  lende: {
    preferred: ['ਲੈਂਦੇ'],
    scoreAdjustments: {
      'ਲੈਂਦੇ': 5_000_000,
    },
  },
  lainde: {
    preferred: ['ਲੈਂਦੇ'],
    scoreAdjustments: {
      'ਲੈਂਦੇ': 5_000_000,
    },
  },
};

/**
 * Global hard exclusions for malformed spellings that should never be suggested
 * regardless of Roman input.
 */
export const GLOBAL_MALFORMED_EXCLUSIONS = new Set<string>([
  'ਓਯੇ',
  'ਵਲਹ',
  'ਵਲੱਹ',
  'ਵੱਲਹ',
  'ਧਯਾਨ',
]);

/**
 * Get spelling correction rule for a Roman input (case-insensitive).
 */
export function getSpellingRule(roman: string): SpellingCorrectionRule | undefined {
  if (!roman) return undefined;
  return CURATED_SPELLING_RULES[roman.toLowerCase().trim()];
}

/**
 * Check if a Gurmukhi candidate is excluded for a given Roman input.
 */
export function isExcludedSpelling(roman: string, candidate: string): boolean {
  if (GLOBAL_MALFORMED_EXCLUSIONS.has(candidate)) {
    // Only exclude globally malformed if it's strictly malformed (like ਓਯੇ or ਧਯਾਨ)
    if (candidate === 'ਓਯੇ' || candidate === 'ਧਯਾਨ') return true;
    if (candidate.startsWith('ਵਲ') && roman.toLowerCase().includes('walh')) return true;
  }
  const rule = getSpellingRule(roman);
  if (rule?.excluded && rule.excluded.includes(candidate)) {
    return true;
  }
  return false;
}
