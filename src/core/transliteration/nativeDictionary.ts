/**
 * nativeDictionary.ts - Dedicated Curated Native Punjabi Vocabulary Dictionary
 *
 * Implements lightweight offline English-to-Punjabi native vocabulary lookups.
 * Strictly operates on individual English words with genuine native Punjabi equivalents.
 * Authoritative data source: assets/data/akhar_runtime_dictionary.json (2,339 approved headwords).
 * Strictly excludes review-required and quarantined unverified vocabulary.
 * Never performs sentence/phrase translation or contextual/AI translation.
 */

import rawRuntimeDictionary from '../../../assets/data/akhar_runtime_dictionary.json';

export interface RuntimeDictionarySense {
  primary: string;
  part_of_speech: string;
  alternatives: string[];
  entry_id: string;
}

export interface RuntimeDictionaryEntry {
  primary: string;
  part_of_speech: string;
  alternatives: string[];
  entry_id: string;
  additional_senses?: RuntimeDictionarySense[];
}

export interface NativeWordEntry {
  /** Natural, genuine Punjabi equivalent in Gurmukhi script */
  punjabi: string;
  /** Primary part of speech */
  partOfSpeech?: string;
  /** Additional established genuine alternatives, if valid */
  alternatives?: string[];
  /** Additional senses for different grammatical contexts */
  additionalSenses?: RuntimeDictionarySense[];
  /** Entry identifier */
  entryId?: string;
  /** Optional linguistic/etymological notes */
  notes?: string;
}

export interface NativeLookupResult {
  /** The English dictionary headword that matched */
  matchedWord: string;
  /** Primary native Punjabi equivalent */
  punjabi: string;
  /** Part of speech of the primary translation */
  partOfSpeech: string;
  /** Valid genuine alternative equivalents */
  alternatives: string[];
  /** Additional senses if available */
  additionalSenses: RuntimeDictionarySense[];
  /** Entry identifier */
  entryId: string;
  /** Whether the match was exact */
  isExactMatch: boolean;
  /** Levenshtein edit distance from the input word */
  editDistance: number;
}

/**
 * In-memory Map holding the authoritative approved runtime dictionary.
 * 2,339 unique English headwords loaded statically at zero runtime overhead.
 */
export const RUNTIME_DICTIONARY_MAP: Map<string, RuntimeDictionaryEntry> = new Map(
  Object.entries(rawRuntimeDictionary as Record<string, RuntimeDictionaryEntry>)
);

/**
 * Backward-compatible dictionary view for legacy access and tests.
 */
export const NATIVE_PUNJABI_DICTIONARY: Record<string, NativeWordEntry> = new Proxy(
  {} as Record<string, NativeWordEntry>,
  {
    get(_target, prop: string) {
      if (typeof prop !== 'string') return undefined;
      const entry = RUNTIME_DICTIONARY_MAP.get(prop.toLowerCase());
      if (!entry) return undefined;
      return {
        punjabi: entry.primary,
        partOfSpeech: entry.part_of_speech,
        alternatives: entry.alternatives || [],
        additionalSenses: entry.additional_senses || [],
        entryId: entry.entry_id,
      };
    },
    has(_target, prop: string) {
      if (typeof prop !== 'string') return false;
      return RUNTIME_DICTIONARY_MAP.has(prop.toLowerCase());
    },
    ownKeys() {
      return Array.from(RUNTIME_DICTIONARY_MAP.keys());
    },
    getOwnPropertyDescriptor(_target, prop: string) {
      if (typeof prop === 'string' && RUNTIME_DICTIONARY_MAP.has(prop.toLowerCase())) {
        const entry = RUNTIME_DICTIONARY_MAP.get(prop.toLowerCase())!;
        return {
          enumerable: true,
          configurable: true,
          value: {
            punjabi: entry.primary,
            partOfSpeech: entry.part_of_speech,
            alternatives: entry.alternatives || [],
            additionalSenses: entry.additional_senses || [],
            entryId: entry.entry_id,
          },
        };
      }
      return undefined;
    },
  }
);

/**
 * Strict individual-word validator.
 * Returns true ONLY if the input is a single English word (letters only, no spaces, no punctuation,
 * no digits, no sentence or phrase structure).
 */
export function isQualifyingSingleWord(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  // Disallow any whitespace (spaces, tabs, newlines)
  if (/\s/.test(input)) return false;
  // Must consist exclusively of English ASCII letters (at least 1 letter)
  return /^[a-zA-Z]+$/.test(input);
}

/**
 * Fast, memory-efficient Levenshtein string distance algorithm.
 * Operates in O(min(m, n)) space.
 */
export function getLevenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let s1 = a;
  let s2 = b;
  if (s1.length > s2.length) {
    s1 = b;
    s2 = a;
  }

  const m = s1.length;
  const n = s2.length;
  const prevRow = new Array(m + 1);
  const currRow = new Array(m + 1);

  for (let i = 0; i <= m; i++) {
    prevRow[i] = i;
  }

  for (let j = 1; j <= n; j++) {
    currRow[0] = j;
    const bChar = s2.charCodeAt(j - 1);

    for (let i = 1; i <= m; i++) {
      const cost = s1.charCodeAt(i - 1) === bChar ? 0 : 1;
      currRow[i] = Math.min(
        prevRow[i] + 1,       // deletion
        currRow[i - 1] + 1,   // insertion
        prevRow[i - 1] + cost // substitution
      );
    }

    for (let i = 0; i <= m; i++) {
      prevRow[i] = currRow[i];
    }
  }

  return prevRow[m];
}

export interface LookupOptions {
  /** Whether to allow conservative typo matching when exact match is not found. Defaults to false. */
  enableTypoTolerance?: boolean;
}

/**
 * Look up a genuine native Punjabi equivalent for an individual English word.
 *
 * 1. Validates that the input is strictly an individual word (no spaces, phrases or sentences).
 * 2. Checks exact dictionary lookup first in constant time O(1) via Map.
 * 3. If no exact match and typo tolerance is explicitly enabled (opt-in):
 *    - Short words (< 5 characters) strictly require exact matches to prevent false positives.
 *    - Words >= 5 characters apply conservative edit-distance thresholds (distance <= 1 for 5-7 chars,
 *      distance <= 2 for >= 8 chars).
 *    - First letter must match.
 *    - Returns null when confidence is insufficient.
 */
export function lookupNativeWord(
  input: string,
  options: LookupOptions = { enableTypoTolerance: false }
): NativeLookupResult | null {
  if (!isQualifyingSingleWord(input)) {
    return null;
  }

  const lower = input.toLowerCase();

  // 1. Constant-time exact dictionary lookup via Map
  const exactEntry = RUNTIME_DICTIONARY_MAP.get(lower);
  if (exactEntry) {
    return {
      matchedWord: lower,
      punjabi: exactEntry.primary,
      partOfSpeech: exactEntry.part_of_speech,
      alternatives: exactEntry.alternatives || [],
      additionalSenses: exactEntry.additional_senses || [],
      entryId: exactEntry.entry_id,
      isExactMatch: true,
      editDistance: 0,
    };
  }

  // 2. Conservative typo tolerance (strictly opt-in)
  if (options.enableTypoTolerance) {
    // Short words (< 5 characters, e.g. 'fear', 'love', 'hope', 'true') require exact matches
    if (lower.length < 5) {
      return null;
    }

    const maxDistance = lower.length >= 8 ? 2 : 1;
    let bestKey: string | null = null;
    let bestDistance = maxDistance + 1;
    let bestEntry: RuntimeDictionaryEntry | null = null;

    for (const [key, entry] of RUNTIME_DICTIONARY_MAP.entries()) {
      // Short dictionary headwords (< 5 characters, e.g. 'fear', 'love') strictly require exact matches
      if (key.length < 5) {
        continue;
      }

      // Fast length filter: length difference cannot exceed maxDistance
      if (Math.abs(key.length - lower.length) > maxDistance) {
        continue;
      }

      // Conservative initial filter: first letter must match to avoid spurious false positives
      if (key[0] !== lower[0]) {
        continue;
      }

      const dist = getLevenshteinDistance(lower, key);
      if (dist <= maxDistance && dist < bestDistance) {
        bestDistance = dist;
        bestKey = key;
        bestEntry = entry;
      }
    }

    if (bestKey && bestEntry) {
      return {
        matchedWord: bestKey,
        punjabi: bestEntry.primary,
        partOfSpeech: bestEntry.part_of_speech,
        alternatives: bestEntry.alternatives || [],
        additionalSenses: bestEntry.additional_senses || [],
        entryId: bestEntry.entry_id,
        isExactMatch: false,
        editDistance: bestDistance,
      };
    }
  }

  return null;
}

/**
 * Returns raw runtime dictionary entry if present.
 */
export function getRuntimeDictionaryEntry(headword: string): RuntimeDictionaryEntry | undefined {
  if (!headword || typeof headword !== 'string') return undefined;
  return RUNTIME_DICTIONARY_MAP.get(headword.toLowerCase());
}

/**
 * Returns total count of approved headwords in the runtime dictionary.
 */
export function getRuntimeDictionarySize(): number {
  return RUNTIME_DICTIONARY_MAP.size;
}
