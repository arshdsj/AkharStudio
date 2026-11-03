/**
 * textConverter.ts - Complete Text, Paragraph & Passage Transliteration Engine
 * Governed by: Stage 3 — Roman Punjabi to Gurmukhi Conversion
 *
 * Reuses the application's existing transliteration engine, dictionaries,
 * word-matching mechanisms, and ranking logic.
 */

import { GurmukhiTransliterator } from './engine';
import { defaultTransliterator } from './defaultEngine';

export interface ConvertedToken {
  original: string;
  converted: string;
  suggestions: string[];
  isUncertain: boolean;
  isEnglish: boolean;
  isPunctuationOrSpace: boolean;
}

export interface ConversionResult {
  convertedText: string;
  tokens: ConvertedToken[];
  uncertainCount: number;
}

/**
 * High-confidence Punjabi Roman markers used to reliably distinguish
 * Roman Punjabi from standard English or other Latin scripts.
 */
export const ROMAN_PUNJABI_MARKERS = new Set([
  'reha', 'rehe', 'rehi', 'keha', 'jeha', 'kiddan', 'tusi', 'tussi', 'assi',
  'mera', 'mere', 'meri', 'tera', 'tere', 'teri', 'saada', 'saade', 'saadi',
  'tuade', 'tuadi', 'tuada', 'karda', 'kardi', 'karde', 'hoya', 'hoyi', 'hoye',
  'vadiya', 'vadhiya', 'changa', 'changi', 'change', 'vich', 'naal', 'te',
  'gaya', 'gayi', 'gaye', 'kyun', 'kadon', 'kithe', 'kivein', 'hanji', 'haan',
  'nahi', 've', 'oye', 'kudi', 'kuri', 'munda', 'pind', 'paani', 'gall',
  'bol', 'dekh', 'sunn', 'ditta', 'ditti', 'aakh', 'aaya', 'aayi', 'aaye',
  'rabba', 'rab', 'chalo', 'karo', 'dasso', 'das', 'sunao', 'chal', 'yaar',
  'bhai', 'veer', 'bhaji', 'pra', 'bapu', 'bebe', 'chahe', 'pher', 'fer',
  'jadon', 'aaun', 'aaunda', 'jaaunda', 'karan', 'kare', 'kiti', 'kita',
  'si', 'san', 'dian', 'deyan', 'ch', 'mainu', 'tenu', 'sanu', 'ohnu', 'ihnu',
]);

/**
 * Common English words that should not be blindly transliterated when mixed
 * into Roman Punjabi screenplay passages or dialogue.
 */
export const DISTINCT_ENGLISH_WORDS = new Set([
  'the', 'hospital', 'police', 'station', 'doctor', 'school', 'college',
  'office', 'phone', 'car', 'bus', 'train', 'road', 'camera', 'light',
  'action', 'scene', 'cut', 'fade', 'int', 'ext', 'beat', 'continuous',
  'sir', 'madam', 'ok', 'okay', 'please', 'thanks', 'thank', 'sorry',
  'hello', 'bye', 'welcome', 'coffee', 'tea', 'hotel', 'flight', 'airport',
  'ticket', 'passport', 'mobile', 'internet', 'computer', 'laptop', 'room',
  'gate', 'door', 'window', 'table', 'chair', 'glass', 'bottle', 'cup',
  'captain', 'inspector', 'officer', 'judge', 'court', 'lawyer', 'driver',
]);

/**
 * Detect whether a given text is likely Roman Punjabi.
 * Excludes already-Gurmukhi text and pure English text without Punjabi indicators.
 */
export function isLikelyRomanPunjabi(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (!trimmed) return false;

  // If text already has substantial Gurmukhi characters, do not flag as Roman Punjabi
  const gurmukhiChars = (trimmed.match(/[\u0A00-\u0A7F]/g) || []).length;
  if (gurmukhiChars > trimmed.length * 0.3) return false;

  const words = trimmed.toLowerCase().match(/\b[a-z]{2,}\b/g) || [];
  if (words.length === 0) return false;

  let markerMatches = 0;
  for (const w of words) {
    if (ROMAN_PUNJABI_MARKERS.has(w)) {
      markerMatches++;
    }
  }

  // If short text (1-3 words) contains at least 1 strong marker
  if (words.length <= 3 && markerMatches >= 1) return true;

  // If longer text has at least 2 markers or >= 15% marker ratio
  if (markerMatches >= 2) return true;
  if (words.length > 3 && markerMatches / words.length >= 0.15) return true;

  return false;
}

export interface ConvertOptions {
  preserveEnglish?: boolean;
}

/**
 * Convert full Roman Punjabi text (multi-line, paragraphs) to Gurmukhi.
 * Preserves line breaks, paragraph spacing, punctuation, numbers, and optionally English words.
 */
export function convertRomanPunjabiToGurmukhi(
  text: string,
  transliterator: GurmukhiTransliterator = defaultTransliterator,
  options: ConvertOptions = { preserveEnglish: true }
): ConversionResult {
  if (!text) {
    return { convertedText: '', tokens: [], uncertainCount: 0 };
  }

  // Tokenize preserving whitespace, newlines, punctuation, numbers, and word tokens
  // Regex splits by:
  // 1. Newlines (\r\n|\r|\n)
  // 2. Spaces/tabs ([ \t]+)
  // 3. Punctuation & symbols ([.,!?;:।॥\-\(\)\[\]"'\/\\]+)
  // 4. Numbers ([0-9]+|[੦-੯]+)
  // 5. Already Gurmukhi words ([\u0A00-\u0A7F]+)
  // 6. Latin words ([a-zA-Z]+)
  const tokenRegex = /(\r\n|\r|\n|[ \t]+|[.,!?;:।॥\-\(\)\[\]"'\/\\]+|[0-9]+|[੦-੯]+|[\u0A00-\u0A7F]+|[a-zA-Z]+|[^\s\w]+)/g;
  const rawTokens = text.match(tokenRegex) || [text];

  const tokens: ConvertedToken[] = [];
  let convertedText = '';
  let uncertainCount = 0;

  for (const raw of rawTokens) {
    // 1. Whitespace, newline, numbers, or already Gurmukhi
    const isWord = /^[a-zA-Z]+$/.test(raw);
    const isPunctOrSpace = !isWord;

    if (isPunctOrSpace) {
      tokens.push({
        original: raw,
        converted: raw,
        suggestions: [raw],
        isUncertain: false,
        isEnglish: false,
        isPunctuationOrSpace: true,
      });
      convertedText += raw;
      continue;
    }

    // 2. Check if English word to be preserved
    const lower = raw.toLowerCase();
    if (options.preserveEnglish && DISTINCT_ENGLISH_WORDS.has(lower)) {
      tokens.push({
        original: raw,
        converted: raw,
        suggestions: [raw, transliterator.suggest(lower, 1)[0] || raw],
        isUncertain: false,
        isEnglish: true,
        isPunctuationOrSpace: false,
      });
      convertedText += raw;
      continue;
    }

    // 3. Transliterate Roman Punjabi word
    const { candidates, details } = transliterator.suggestWithDetails(raw, 5);
    const bestMatch = candidates[0] || raw;

    // Determine uncertainty:
    // If top candidate has 0 lexicon frequency and there are multiple raw candidates, or candidates count == 0
    const topDetail = details[0];
    const isUncertain = !topDetail || (topDetail.lexiconFrequency === 0 && !topDetail.isCustomExactMatch && candidates.length > 1);

    if (isUncertain) {
      uncertainCount++;
    }

    tokens.push({
      original: raw,
      converted: bestMatch,
      suggestions: candidates.length > 0 ? candidates : [raw],
      isUncertain,
      isEnglish: false,
      isPunctuationOrSpace: false,
    });
    convertedText += bestMatch;
  }

  return {
    convertedText,
    tokens,
    uncertainCount,
  };
}
