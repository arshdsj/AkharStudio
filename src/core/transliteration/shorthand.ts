/**
 * shorthand.ts - Curated Shorthand Mappings for Short Roman Input Patterns
 *
 * Provides high-confidence mappings for commonly typed shorthand Roman inputs
 * (e.g. 'k' -> 'ਕੇ') without indiscriminately expanding every single letter
 * or cluttering the suggestion list.
 */

export interface ShorthandEntry {
  words: string[];
  priorityBonus: number;
}

export const CURATED_SHORTHAND_MAPPINGS: Record<string, ShorthandEntry> = {
  // Single-character high-confidence shorthands
  k: {
    words: ['ਕੇ', 'ਕਿ'],
    priorityBonus: 12_000_000,
  },
  c: {
    words: ['ਚ'],
    priorityBonus: 5_000_000,
  },
  v: {
    words: ['ਵੀ'],
    priorityBonus: 5_000_000,
  },
  n: {
    words: ['ਨੇ'],
    priorityBonus: 5_000_000,
  },

  // 2-letter frequent grammatical particles
  te: {
    words: ['ਤੇ'],
    priorityBonus: 5_000_000,
  },
  di: {
    words: ['ਦੀ'],
    priorityBonus: 5_000_000,
  },
  da: {
    words: ['ਦਾ'],
    priorityBonus: 5_000_000,
  },
  de: {
    words: ['ਦੇ'],
    priorityBonus: 5_000_000,
  },
  nu: {
    words: ['ਨੂੰ'],
    priorityBonus: 5_000_000,
  },
  ne: {
    words: ['ਨੇ'],
    priorityBonus: 5_000_000,
  },
  si: {
    words: ['ਸੀ'],
    priorityBonus: 5_000_000,
  },
  jo: {
    words: ['ਜੋ'],
    priorityBonus: 5_000_000,
  },
  je: {
    words: ['ਜੇ'],
    priorityBonus: 5_000_000,
  },
  vi: {
    words: ['ਵੀ'],
    priorityBonus: 5_000_000,
  },
  na: {
    words: ['ਨਾ'],
    priorityBonus: 5_000_000,
  },
};

/**
 * Get shorthand suggestions for a Roman input (case-insensitive).
 */
export function getShorthandSuggestions(roman: string): { word: string; priorityBonus: number }[] {
  if (!roman) return [];
  const lower = roman.toLowerCase().trim();
  const entry = CURATED_SHORTHAND_MAPPINGS[lower];
  if (!entry) return [];

  return entry.words.map((w, idx) => ({
    word: w,
    priorityBonus: Math.max(1_000_000, entry.priorityBonus - idx * 6_000_000),
  }));
}
