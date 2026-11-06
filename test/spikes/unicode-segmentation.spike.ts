/**
 * SPIKE 2: Unicode Segmentation and Safe Wrapping
 * File: test/spikes/unicode-segmentation.spike.ts
 *
 * Objective:
 * Establish safe text boundaries for Punjabi screenplay layout and editing.
 * Tests Intl.Segmenter('pa') grapheme vs word boundaries, UTF-16 offsets,
 * conjunct integrity, 100 representative Punjabi screenplay sentences,
 * long tokens, English/Punjabi mixed text, and surrogate pair safety.
 */

import { describe, it, expect } from 'vitest';

export interface SegmentInfo {
  segment: string;
  index: number;
  length: number;
  codePoints: string[];
}

export function segmentGraphemes(text: string): SegmentInfo[] {
  const segmenter = new Intl.Segmenter('pa', { granularity: 'grapheme' });
  return Array.from(segmenter.segment(text)).map((s) => ({
    segment: s.segment,
    index: s.index,
    length: s.segment.length,
    codePoints: Array.from(s.segment).map(
      (c) => 'U+' + c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')
    ),
  }));
}

export function segmentWords(text: string): { segment: string; index: number; isWordLike: boolean }[] {
  const segmenter = new Intl.Segmenter('pa', { granularity: 'word' });
  return Array.from(segmenter.segment(text)).map((s) => ({
    segment: s.segment,
    index: s.index,
    isWordLike: Boolean(s.isWordLike),
  }));
}

/**
 * Validates that a break at `offset` does not bisect:
 * 1. Surrogate pairs
 * 2. Dependent vowel signs (U+0A3E..U+0A4C)
 * 3. Virama (U+0A4D)
 * 4. Modifiers / Nasal signs (U+0A01, U+0A02, U+0A70, U+0A71)
 * 5. Nukta (U+0A3C)
 */
export function isSafeBoundary(text: string, offset: number): boolean {
  if (offset <= 0 || offset >= text.length) return true;

  // 1. Surrogate pair check
  const prevCode = text.charCodeAt(offset - 1);
  const nextCode = text.charCodeAt(offset);
  if (prevCode >= 0xd800 && prevCode <= 0xdbff && nextCode >= 0xdc00 && nextCode <= 0xdfff) {
    return false; // Splits surrogate pair!
  }

  // 2. Combining mark / modifier at offset check (character immediately after break must not be a combining mark)
  const combiningRanges = [
    [0x0a01, 0x0a03], // Adak bindi, Bindi
    [0x0a3c, 0x0a3c], // Nukta
    [0x0a3e, 0x0a4d], // Matras and Virama
    [0x0a70, 0x0a71], // Tippi, Addak
    [0x0a75, 0x0a75], // Yakash
  ];

  for (const [start, end] of combiningRanges) {
    if (nextCode >= start && nextCode <= end) {
      return false; // Separates combining mark from base consonant!
    }
  }

  return true;
}

// 100 Representative Punjabi Screenplay Sentences Corpus
export const PUNJABI_SCREENPLAY_CORPUS_100: string[] = [
  // 1-10: Scene Headings (Standard & Non-Standard)
  "EXT. ਪਿੰਡ ਦੀ ਸੱਥ - ਦੁਪਹਿਰ",
  "INT. ਹਵੇਲੀ ਦਾ ਵਿਹੜਾ - ਰਾਤ",
  "EXT. ਖੇਤਾਂ ਵਾਲਾ ਕੱਚਾ ਰਸਤਾ - ਸਵੇਰ",
  "INT. ਪ੍ਰਿੰਸੀਪਲ ਦਾ ਦਫ਼ਤਰ - ਦਿਨ",
  "EXT. ਅੰਮ੍ਰਿਤਸਰ ਰੇਲਵੇ ਸਟੇਸ਼ਨ - ਸ਼ਾਮ",
  "INT. ਗੁਰਦਿਆਲ ਸਿੰਘ ਦਾ ਕਮਰਾ - ਰਾਤ",
  "EXT. ਨਹਿਰ ਦਾ ਪੁਲ - ਸੁਵੱਖਤੇ",
  "INT. ਪੁਰਾਣੀ ਧਰਮਸ਼ਾਲਾ - ਦੁਪਹਿਰ",
  "EXT. ਬੱਸ ਅੱਡਾ ਮੋਗਾ - ਸ਼ਾਮ ਢਲੇ",
  "INT. ਡਾਕਟਰ ਦੀ ਕਲੀਨਿਕ - ਦਿਨ",

  // 11-20: Short Dialogue Cues & Responses
  "ਕਿੱਥੇ ਰਹਿ ਗਿਆ ਮੁੰਡਾ?",
  "ਮੈਂ ਉਹਨੂੰ ਦਸ ਵਾਰ ਕਿਹਾ ਸੀ।",
  "ਬਾਪੂ ਜੀ, ਫ਼ਿਕਰ ਨਾ ਕਰੋ।",
  "ਉਹ ਆਪਣੀ ਪੁਰਾਣੀ ਜੀਪ 'ਚ ਗਿਆ ਏ।",
  "ਉਨ੍ਹਾਂ ਦਾ ਕੋਈ ਭਰੋਸਾ ਨਹੀਂ।",
  "ਜ਼ਿੰਦਗੀ 'ਚ ਕਦੇ ਕੋਈ ਕੰਮ ਵੇਲੇ ਸਿਰ ਕੀਤਾ ਏ ਉਹਨੇ?",
  "ਚਾਚਾ ਜੀ, ਉਹ ਹੁਣੇ ਆਉਂਦਾ ਹੀ ਹੋਣਾ।",
  "ਕੀ ਗੱਲ ਹੋ ਗਈ, ਏਨਾ ਗੁੱਸਾ ਕਿਉਂ ਕਰਦੇ ਓ?",
  "ਚੱਲ ਛੱਡ ਪਰ੍ਹਾਂ, ਚਾਹ ਪੀ ਪਹਿਲਾਂ।",
  "ਨਹੀਂ, ਮੈਂ ਹੁਣੇ ਜਾ ਕੇ ਦੇਖਦਾ ਹਾਂ।",

  // 21-35: Complex Punjabi Conjuncts & Ligatures
  "ਉਸ ਦੇ ਮਨ ਵਿੱਚ ਇੱਕ ਅਜੀਬ ਤ੍ਰਿਸ਼ਨਾ ਜਾਗ ਪਈ ਸੀ।",
  "ਗੁਰੂ ਦੀ ਕ੍ਰਿਪਾ ਅਤੇ ਕ੍ਰਿੱਪਾ ਨਾਲ ਸਭ ਕੰਮ ਸੰਪੂਰਨ ਹੋ ਗਏ।",
  "ਸਾਰੇ ਨਵੇਂ ਪ੍ਰੋਗਰਾਮਾਂ ਦੀ ਸੂਚੀ ਕੰਪਿਊਟਰ 'ਤੇ ਦਰਜ ਕਰੋ।",
  "ਪਿੰਡ ਦੇ ਪਿੱਪਲ ਹੇਠ ਬਜ਼ੁਰਗ ਚੌਪਾਲ ਲਾਈ ਬੈਠੇ ਸਨ।",
  "ਉੱਲੂ ਵਾਂਗ ਰਾਤ ਭਰ ਜਾਗਣ ਦੀ ਆਦਤ ਬਹੁਤ ਮਾੜੀ ਹੈ।",
  "ਕਿਉਂਕਿ ਉਸ ਨੇ ਵੇਲੇ ਸਿਰ ਸੱਚ ਨਹੀਂ ਬੋਲਿਆ, ਇਸ ਲਈ ਸਭ ਉਲਝ ਗਿਆ।",
  "ਇਹ ਮਸਲਾ ਬਹੁਤ ਗੁੰਝਲ਼ਦਾਰ ਅਤੇ ਪੇਚੀਦਾ ਬਣ ਚੁੱਕਾ ਹੈ।",
  "ਸ੍ਰੀ ਅੰਮ੍ਰਿਤਸਰ ਸਾਹਿਬ ਦੀ ਪਵਿੱਤਰ ਧਰਤੀ ਨੂੰ ਪ੍ਰਣਾਮ।",
  "ਮੇਰੇ ਹੱਥ 'ਚ ਫੜੀ ਕਿਤਾਬ ਹੇਠਾਂ ਡਿੱਗ ਪਈ।",
  "ਉਸ ਨੇ ਬੜੇ ਪ੍ਰੇਮ ਅਤੇ ਸ਼ਰਧਾ ਨਾਲ ਬਾਣੀ ਸੁਣੀ।",
  "ਵੱਡੇ ਭਰਾ ਨੇ ਛੋਟੇ ਨੂੰ ਗਲ਼ ਨਾਲ ਲਾ ਲਿਆ।",
  "ਬੱਚਿਆਂ ਦੀਆਂ ਕਿਲਕਾਰੀਆਂ ਨਾਲ ਵਿਹੜਾ ਗੂੰਜ ਉੱਠਿਆ।",
  "ਹਵਾ ਦਾ ਇੱਕ ਤੇਜ਼ ਬੁੱਲਾ ਆਇਆ ਤੇ ਦੀਵਾ ਬੁਝ ਗਿਆ।",
  "ਕਮਰੇ ਵਿੱਚ ਮੱਧਮ ਰੌਸ਼ਨੀ ਅਤੇ ਗਹਿਰੀ ਚੁੱਪ ਪਸਰੀ ਹੋਈ ਸੀ।",
  "ਉਸ ਦੀਆਂ ਅੱਖਾਂ ਵਿੱਚੋਂ ਹੰਝੂ ਵਹਿ ਤੁਰੇ।",

  // 36-50: Mixed English & Punjabi Code-Switching
  "ਮੈਂ ਕੱਲ੍ਹ ਹੀ ਉਸ ਦਾ Appointment Letter ਚੈੱਕ ਕੀਤਾ ਸੀ।",
  "ਜੀਪ ਦਾ Engine ਅਚਾਨਕ Highway ਉੱਤੇ Stop ਹੋ ਗਿਆ।",
  "ਡਾਇਰੈਕਟਰ ਸਾਹਿਬ ਨੇ ਕਿਹਾ ਕਿ Scene 4 ਬਹੁਤ Emotional ਹੈ।",
  "ਕੱਲ੍ਹ ਮੇਰਾ Final Exam ਹੈ, ਇਸ ਲਈ ਮੈਂ Busy ਹਾਂ।",
  "ਉਹ ਕਹਿੰਦਾ ਸੀ ਕਿ Meeting ਸ਼ਾਮ 5:30 PM ਵਜੇ ਸ਼ੁਰੂ ਹੋਵੇਗੀ।",
  "Script ਦੇ ਵਿੱਚ Dialogue Delivery ਬਹੁਤ Natural ਹੋਣੀ ਚਾਹੀਦੀ ਹੈ।",
  "ਸਾਨੂੰ ਇੱਕ ਨਵਾਂ Project Bundle ਮਿਲਿਆ ਹੈ।",
  "ਕਿਰਪਾ ਕਰਕੇ PDF File Download ਕਰ ਲਓ।",
  "Actor ਨੇ Character ਦੀ Body Language ਨੂੰ ਬੜੀ ਖ਼ੂਬਸੂਰਤੀ ਨਾਲ ਨਿਭਾਇਆ।",
  "Camera Angle ਬਿਲਕੁਲ Wide Shot ਉੱਤੇ Set ਕਰੋ।",
  "Production House ਵੱਲੋਂ ਸਾਰੀ Payment Clear ਹੋ ਚੁੱਕੀ ਹੈ।",
  "Sound Recording ਬਿਲਕੁਲ Studio Quality ਦੀ ਹੋਣੀ ਚਾਹੀਦੀ ਹੈ।",
  "Screenplay ਵਿੱਚ ਹਰੇਕ Scene ਦੀ ਆਪਣੀ ਇੱਕ Rhythm ਹੁੰਦੀ ਹੈ।",
  "ਸਾਨੂੰ Background Music ਵਿੱਚ ਢੋਲਕ ਅਤੇ ਰਬਾਬ ਚਾਹੀਦੀ ਹੈ।",
  "Editor ਨੇ Timeline ਉੱਤੇ ਸਾਰੇ Cuts ਲਗਾ ਦਿੱਤੇ ਹਨ।",

  // 51-65: Numbers, Currencies, and Punctuated Text
  "ਕੁੱਲ ਮਿਲਾ ਕੇ 120 ਪੰਨਿਆਂ ਦੀ ਸਕ੍ਰਿਪਟ ਤਿਆਰ ਹੋ ਗਈ ਹੈ।",
  "ਉਸ ਕੋਲ ਸਿਰਫ਼ ₹500 ਰੁਪਏ ਬਚੇ ਸਨ, ਜਿਸ ਨਾਲ ਉਸ ਨੇ ਤੇਲ ਪਵਾਇਆ।",
  "ਮਿਤੀ: 24 ਨਵੰਬਰ 2026, ਸਮਾਂ: ਸਵੇਰੇ 10:15 ਵਜੇ।",
  "ਪਿੰਡ ਦੀ ਆਬਾਦੀ ਲਗਭਗ 4,500 ਲੋਕਾਂ ਦੀ ਹੈ।",
  "ਸਕੂਲ ਵਿੱਚ 1st ਤੋਂ 10th ਜਮਾਤ ਤੱਕ ਦੇ 850 ਵਿਦਿਆਰਥੀ ਪੜ੍ਹਦੇ ਹਨ।",
  "ਕੀਮਤ: $100 ਡਾਲਰ ਪ੍ਰਤੀ ਦਿਨ (ਬਜਟ ਅਨੁਸਾਰ)।",
  "ਗੱਡੀ ਦਾ ਨੰਬਰ PB-02-AB-1234 ਨੋਟ ਕਰ ਲਵੋ।",
  "ਉਸ ਦੇ 3 ਮੁੰਡੇ ਅਤੇ 2 ਧੀਆਂ ਸਨ, ਜੋ ਸਾਰੇ ਵਿਦੇਸ਼ ਰਹਿੰਦੇ ਹਨ।",
  "ਫ਼ੋਨ ਨੰਬਰ: +91-98765-43210 ਉੱਤੇ ਸੰਪਰਕ ਕਰੋ।",
  "ਲੰਬਾਈ 10.5 ਫੁੱਟ ਅਤੇ ਚੌੜਾਈ 8.2 ਫੁੱਟ ਮਾਪੀ ਗਈ।",
  "20ਵੀਂ ਸਦੀ ਦੇ ਸ਼ੁਰੂ ਵਿੱਚ ਪੰਜਾਬ ਵਿੱਚ ਵੱਡੇ ਬਦਲਾਅ ਆਏ।",
  "ਸਾਲ 1947 ਦੀ ਵੰਡ ਦਾ ਦਰਦ ਕਦੇ ਭੁਲਾਇਆ ਨਹੀਂ ਜਾ ਸਕਦਾ।",
  "ਕਮਰੇ ਦਾ ਤਾਪਮਾਨ 18.5°C ਤੱਕ ਡਿੱਗ ਚੁੱਕਾ ਸੀ।",
  "ਹਿੱਸਾ 1/3 ਉਸ ਦਾ ਅਤੇ ਬਾਕੀ 2/3 ਉਸ ਦੇ ਭਰਾ ਦਾ ਸੀ।",
  "ਸਫ਼ਾ ਨੰਬਰ 45 ਉੱਤੇ ਦਿੱਤੀ ਗਈ ਹਦਾਇਤ ਧਿਆਨ ਨਾਲ ਪੜ੍ਹੋ।",

  // 66-80: Long Unbroken Tokens & Whitespace Edge Cases
  "ਪਿੰਡਵਾਲਿਆਂਨੇਰਲਮਿਲਕੇਸਾਰਾਕੰਮਖ਼ਤਮਕਰਦਿੱਤਾ।", // Long unbroken Gurmukhi word
  "SupercalifragilisticexpialidociousScreenplayWritingSystem2026", // Long Roman token
  "ਸੂਰਜ       ਸਿਰ      'ਤੇ     ਚੜ੍ਹਿਆ      ਹੋਇਆ     ਹੈ।", // Multiple consecutive spaces
  "ਚੁੱਪ... ਬਿਲਕੁਲ ਚੁੱਪ! ਕੋਈ ਵੀ ਆਪਣੀ ਥਾਂ ਤੋਂ ਨਹੀਂ ਹਿੱਲੇਗਾ।", // Ellipsis and exclamations
  "ਕੀ??? ਤੂੰ ਸੱਚ ਕਹਿ ਰਿਹਾ ਏਂ?! ਮੈਨੂੰ ਯਕੀਨ ਨਹੀਂ ਆਉਂਦਾ!", // Punctuation cluster
  "ਉਸਨੇ-ਕਿਹਾ-ਸੀ-ਕਿ-ਉਹ-ਕੱਲ੍ਹ-ਆਵੇਗਾ।", // Hyphenated continuous token
  "www.akharstudio.com/punjabi-screenplay-editor-v1-3-1", // URL token
  "harpreet_singh.screenwriter@punjabifilms.co.in", // Email token
  "ਗੁਰਮੁਖੀ_ਸਕ੍ਰਿਪਟ_ਰਾਈਟਿੰਗ_ਸਟੂਡੀਓ_ਪੰਜਾਬੀ_ਸਿਨੇਮਾ_2026", // Underscore joined token
  "ੴਸਤਿਗੁਰਪ੍ਰਸਾਦਿ॥", // Sacred continuous invocation
  "   ਅੱਗੇ ਵੱਧ ਕੇ ਉਸ ਨੇ ਦਰਵਾਜ਼ਾ ਖੜਕਾਇਆ।   ", // Leading and trailing whitespace
  "\t\tਕਮਰੇ ਦੇ ਅੰਦਰ ਘੁੱਪ ਹਨੇਰਾ ਸੀ।\n\n", // Tab and newline combinations
  "ਹਾਂ ਜੀ! ਬਿਲਕੁਲ... ਪਰ ਠਹਿਰੋ; ਗੱਲ ਸੁਣੋ: ਇਹ ਠੀਕ ਨਹੀਂ।", // Semicolons and colons
  "“ਤੂੰ ਕੌਣ ਹੁੰਦਾ ਏਂ ਮੈਨੂੰ ਰੋਕਣ ਵਾਲਾ?” ਉਸ ਨੇ ਗਰਜ ਕੇ ਪੁੱਛਿਆ।", // Smart quotes
  "‘ਮੈਂ ਤੇਰਾ ਭਰਾ ਹਾਂ,’ ਉਸ ਨੇ ਨਿਮਰਤਾ ਨਾਲ ਜਵਾਬ ਦਿੱਤਾ।", // Single smart quotes

  // 81-100: Dramatic Screenplay Monologues & Extended Paragraphs
  "ਸੁਣ ਓਏ ਸ਼ੇਰਾ! ਇਹ ਜ਼ਮੀਨ ਸਿਰਫ਼ ਮਿੱਟੀ ਦਾ ਟੁਕੜਾ ਨਹੀਂ, ਸਾਡੇ ਵੱਡ-ਵਡੇਰਿਆਂ ਦਾ ਖ਼ੂਨ-ਪਸੀਨਾ ਏ। ਜਦੋਂ ਮੇਰੇ ਬਾਪੂ ਨੇ ਇਸ ਧਰਤੀ 'ਤੇ ਪਹਿਲਾ ਹਲ਼ ਚਲਾਇਆ ਸੀ, ਤਾਂ ਉਸ ਦੇ ਪੈਰਾਂ 'ਚ ਛਾਲੇ ਪੈ ਗਏ ਸਨ। ਅਸੀਂ ਇਸ ਮਿੱਟੀ ਨੂੰ ਵੇਚ ਕੇ ਸ਼ਹਿਰਾਂ 'ਚ ਕੋਠੀਆਂ ਨਹੀਂ ਪਾਉਣੀਆਂ।",
  "ਜੇ ਤੈਨੂੰ ਲੱਗਦਾ ਏ ਕਿ ਤੂੰ ਪੈਸੇ ਦੇ ਜ਼ੋਰ 'ਤੇ ਸਭ ਕੁਝ ਖ਼ਰੀਦ ਸਕਦਾ ਏਂ, ਤਾਂ ਇਹ ਤੇਰੀ ਸਭ ਤੋਂ ਵੱਡੀ ਭੁੱਲ ਏ। ਇੱਜ਼ਤ, ਅਣਖ ਅਤੇ ਜ਼ਮੀਰ ਕਦੇ ਬਾਜ਼ਾਰਾਂ 'ਚ ਨਹੀਂ ਵਿਕਦੇ। ਜਿਸ ਦਿਨ ਤੈਨੂੰ ਇਸ ਗੱਲ ਦਾ ਅਹਿਸਾਸ ਹੋਵੇਗਾ, ਉਸ ਦਿਨ ਬਹੁਤ ਦੇਰ ਹੋ ਚੁੱਕੀ ਹੋਵੇਗੀ।",
  "ਰਾਤ ਦੇ ਬਾਰਾਂ ਵੱਜ ਚੁੱਕੇ ਸਨ ਪਰ ਹਵੇਲੀ ਦੀ ਵੱਡੀ ਲਾਲਟੈਣ ਅਜੇ ਵੀ ਬਲ਼ ਰਹੀ ਸੀ। ਬਾਹਰ ਕੁੱਤੇ ਰੋ ਰਹੇ ਸਨ ਅਤੇ ਦੂਰ ਕਿਸੇ ਖੂਹ 'ਤੇ ਟਿੰਡਾਂ ਦੀ ਆਵਾਜ਼ ਆ ਰਹੀ ਸੀ। ਹਰਪ੍ਰੀਤ ਬੰਦੂਕ ਸਾਫ਼ ਕਰਦਾ ਹੋਇਆ ਕਿਸੇ ਡੂੰਘੀ ਸੋਚ ਵਿੱਚ ਡੁੱਬਿਆ ਹੋਇਆ ਸੀ।",
  "ਉਹ ਜਾਣਦਾ ਸੀ ਕਿ ਕੱਲ੍ਹ ਸਵੇਰ ਦਾ ਸੂਰਜ ਉਸ ਲਈ ਨਵੀਂ ਜ਼ਿੰਦਗੀ ਜਾਂ ਮੌਤ ਦਾ ਸੁਨੇਹਾ ਲੈ ਕੇ ਆਵੇਗਾ। ਪਰ ਉਸ ਦੇ ਚਿਹਰੇ 'ਤੇ ਡਰ ਦੀ ਕੋਈ ਲਕੀਰ ਨਹੀਂ ਸੀ, ਸਿਰਫ਼ ਇੱਕ ਅਟੱਲ ਫ਼ੈਸਲਾ ਸੀ ਜੋ ਉਸ ਨੇ ਆਪਣੇ ਆਪ ਨਾਲ ਕੀਤਾ ਹੋਇਆ ਸੀ।",
  "ਮਾਂ ਜੀ ਨੇ ਰੋਂਦੇ ਹੋਏ ਉਸ ਦੇ ਸਿਰ 'ਤੇ ਹੱਥ ਰੱਖਿਆ ਅਤੇ ਕਿਹਾ, 'ਪੁੱਤਰਾ, ਜੰਗਾਂ ਕਦੇ ਕਿਸੇ ਮਸਲੇ ਦਾ ਹੱਲ ਨਹੀਂ ਹੁੰਦੀਆਂ। ਜਿੱਤ ਜਿਸ ਦੀ ਮਰਜ਼ੀ ਹੋਵੇ, ਅੰਤ ਵਿੱਚ ਮਾਵਾਂ ਦੀਆਂ ਗੋਦੀਆਂ ਹੀ ਸੁੰਨੀਆਂ ਹੁੰਦੀਆਂ ਨੇ।' ਪਰ ਉਸ ਦੇ ਕੰਨਾਂ ਵਿੱਚ ਤਾਂ ਬਦਲੇ ਦੀ ਅੱਗ ਬਲ਼ ਰਹੀ ਸੀ।",
  "ਪਿੰਡ ਦੀ ਸਰਪੰਚੀ ਕੋਈ ਫੁੱਲਾਂ ਦੀ ਸੇਜ ਨਹੀਂ ਹੁੰਦੀ। ਹਰ ਇੱਕ ਦੇ ਦੁੱਖ-ਸੁੱਖ ਵਿੱਚ ਖੜ੍ਹਨਾ ਪੈਂਦਾ ਏ, ਆਪਣੀ ਨਿੱਜੀ ਦੁਸ਼ਮਣੀ ਭੁਲਾ ਕੇ ਨਿਆਂ ਕਰਨਾ ਪੈਂਦਾ ਏ। ਜੇ ਤੂੰ ਇਹ ਬੋਝ ਚੁੱਕਣ ਲਈ ਤਿਆਰ ਏਂ, ਤਾਂ ਹੀ ਚੋਣਾਂ ਵਿੱਚ ਪੈਰ ਰੱਖੀਂ, ਵਰਨਾ ਪਿੱਛੇ ਹਟ ਜਾ।",
  "ਅਦਾਲਤ ਦੇ ਕਮਰੇ ਵਿੱਚ ਸੰਨਾਟਾ ਛਾਇਆ ਹੋਇਆ ਸੀ। ਜੱਜ ਸਾਹਿਬ ਨੇ ਆਪਣਾ ਚਸ਼ਮਾ ਉਤਾਰਿਆ, ਫਾਈਲ ਬੰਦ ਕੀਤੀ ਅਤੇ ਫ਼ੈਸਲਾ ਸੁਣਾਉਣ ਤੋਂ ਪਹਿਲਾਂ ਦੋਵਾਂ ਧਿਰਾਂ ਵੱਲ ਬੜੀ ਗੰਭੀਰਤਾ ਨਾਲ ਦੇਖਿਆ। ਹਰ ਕਿਸੇ ਦਾ ਸਾਹ ਰੁਕਿਆ ਹੋਇਆ ਸੀ।",
  "ਬਰਸਾਤ ਦਾ ਮੌਸਮ ਸ਼ੁਰੂ ਹੋ ਚੁੱਕਾ ਸੀ। ਸਤਲੁਜ ਦਰਿਆ ਦਾ ਪਾਣੀ ਖ਼ਤਰੇ ਦੇ ਨਿਸ਼ਾਨ ਤੋਂ ਉੱਪਰ ਵਹਿ ਰਿਹਾ ਸੀ। ਬੰਨ੍ਹ ਟੁੱਟਣ ਦੀ ਖ਼ਬਰ ਸੁਣਦਿਆਂ ਹੀ ਸਾਰੇ ਪਿੰਡ ਵਿੱਚ ਹਫੜਾ-ਦਫੜੀ ਮੱਚ ਗਈ। ਲੋਕ ਆਪਣੇ ਡੰਗਰ-ਵੱਛੇ ਲੈ ਕੇ ਉੱਚੀਆਂ ਥਾਵਾਂ ਵੱਲ ਭੱਜਣ ਲੱਗੇ।",
  "ਉਸ ਪੁਰਾਣੀ ਸੰਦੂਕੜੀ ਵਿੱਚੋਂ ਨਿਕਲੀ ਇੱਕ ਪੀਲੀ ਪੈ ਚੁੱਕੀ ਚਿੱਠੀ ਨੇ ਸਾਰੇ ਰਾਜ਼ ਖੋਲ੍ਹ ਦਿੱਤੇ ਸਨ। ਉਹ ਚਿੱਠੀ ਜੋ ਚਾਲੀ ਸਾਲ ਪਹਿਲਾਂ ਲਿਖੀ ਗਈ ਸੀ, ਪਰ ਕਦੇ ਆਪਣੀ ਮੰਜ਼ਿਲ ਤੱਕ ਨਹੀਂ ਪਹੁੰਚ ਸਕੀ ਸੀ। ਉਸ ਵਿੱਚ ਦਰਜ ਹਰ ਇੱਕ ਸ਼ਬਦ ਸੱਚਾਈ ਦੀ ਗਵਾਹੀ ਭਰ ਰਿਹਾ ਸੀ।",
  "ਸ਼ਹਿਰ ਦੀ ਚਕਾਚੌਂਧ ਨੇ ਉਸ ਨੂੰ ਭਾਵੇਂ ਬਹੁਤ ਕੁਝ ਦਿੱਤਾ ਸੀ—ਵੱਡੀ ਕਾਰ, ਆਲੀਸ਼ਾਨ ਬੰਗਲਾ, ਸਮਾਜ ਵਿੱਚ ਰੁਤਬਾ—ਪਰ ਉਸ ਨੇ ਆਪਣੇ ਪਿੰਡ ਦੀ ਮਿੱਟੀ ਦੀ ਮਹਿਕ, ਮੱਕੀ ਦੀ ਰੋਟੀ ਤੇ ਸਰ੍ਹੋਂ ਦਾ ਸਾਗ ਹਮੇਸ਼ਾ ਲਈ ਗੁਆ ਲਿਆ ਸੀ।",
  "ਬਚਪਨ ਦੇ ਉਹ ਸੁਨਹਿਰੀ ਦਿਨ ਜਦੋਂ ਸਕੂਲੋਂ ਭੱਜ ਕੇ ਨਹਿਰ 'ਚ ਛਾਲਾਂ ਮਾਰਨੀਆਂ, ਬੇਰੀਆਂ ਤੋਂ ਢੀਮਾਂ ਮਾਰ ਕੇ ਬੇਰ ਤੋੜਨੇ ਅਤੇ ਸ਼ਾਮ ਨੂੰ ਬੇਬੇ ਦੀਆਂ ਝਿੜਕਾਂ ਖਾ ਕੇ ਵੀ ਬੇਪਰਵਾਹ ਸੌਂ ਜਾਣਾ—ਕਾਸ਼ ਉਹ ਦਿਨ ਕਦੇ ਵਾਪਸ ਆ ਸਕਦੇ!",
  "ਸਟੇਜ ਉੱਤੇ ਜਦੋਂ ਢੱਡ-ਸਾਰੰਗੀ ਦੀ ਤਾਨ ਛਿੜੀ, ਤਾਂ ਸਾਰਾ ਪੰਡਾਲ ਝੂਮ ਉੱਠਿਆ। ਢਾਡੀ ਸਿੰਘਾਂ ਨੇ ਜਦੋਂ ਹਰੀ ਸਿੰਘ ਨਲਵੇ ਦੀ ਬਹਾਦਰੀ ਦਾ ਪ੍ਰਸੰਗ ਸੁਣਾਇਆ, ਤਾਂ ਨੌਜਵਾਨਾਂ ਦੀਆਂ ਡੌਲ਼ਿਆਂ ਫ਼ਰਕਣ ਲੱਗ ਪਈਆਂ।",
  "ਹਸਪਤਾਲ ਦੇ ਆਈਸੀਯੂ (ICU) ਵਾਰਡ ਦੇ ਬਾਹਰ ਲੱਗੀ ਲਾਲ ਬੱਤੀ ਬੁਝਦਿਆਂ ਹੀ ਡਾਕਟਰ ਬਾਹਰ ਆਇਆ। ਉਸ ਦੇ ਚਿਹਰੇ ਦੀ ਮੁਸਕਰਾਹਟ ਨੇ ਪਰਿਵਾਰ ਦੇ ਸਾਰੇ ਹੰਝੂ ਖ਼ੁਸ਼ੀ ਵਿੱਚ ਬਦਲ ਦਿੱਤੇ। ਅਪਰੇਸ਼ਨ ਪੂਰੀ ਤਰ੍ਹਾਂ ਕਾਮਯਾਬ ਰਿਹਾ ਸੀ।",
  "ਇਹ ਕਹਾਣੀ ਸਿਰਫ਼ ਇੱਕ ਪਾਤਰ ਦੀ ਨਹੀਂ, ਬਲਕਿ ਪੰਜਾਬ ਦੇ ਹਰ ਉਸ ਨੌਜਵਾਨ ਦੀ ਦਾਸਤਾਨ ਹੈ ਜੋ ਵਿਦੇਸ਼ਾਂ ਦੀ ਚਮਕ-ਦਮਕ ਪਿੱਛੇ ਆਪਣੀ ਹੋਂਦ ਅਤੇ ਸੱਭਿਆਚਾਰ ਨੂੰ ਭੁੱਲਦਾ ਜਾ ਰਿਹਾ ਹੈ। ਸਾਨੂੰ ਆਪਣੀਆਂ ਜੜ੍ਹਾਂ ਨਾਲ ਜੁੜੇ ਰਹਿਣਾ ਪਵੇਗਾ।",
  "ਮੈਦਾਨ ਵਿੱਚ ਖ਼ੂਨ-ਖ਼ਰਾਬਾ ਖ਼ਤਮ ਹੋ ਚੁੱਕਾ ਸੀ। ਚਾਰੇ ਪਾਸੇ ਧੂੰਆਂ ਅਤੇ ਬਾਰੂਦ ਦੀ ਬਦਬੂ ਫੈਲੀ ਹੋਈ ਸੀ। ਇੱਕ ਜ਼ਖ਼ਮੀ ਸਿਪਾਹੀ ਨੇ ਆਪਣੀ ਆਖ਼ਰੀ ਹਿਚਕੀ ਲੈਂਦਿਆਂ ਤਿਰੰਗੇ ਝੰਡੇ ਨੂੰ ਛਾਤੀ ਨਾਲ ਘੁੱਟ ਲਿਆ। ਸ਼ਹੀਦੀ ਉਸ ਦਾ ਮੁਕੱਦਰ ਬਣ ਚੁੱਕੀ ਸੀ।",
  "ਫ਼ਿਲਮ ਦੇ ਆਖ਼ਰੀ ਸੀਨ ਵਿੱਚ ਹੀਰੋ ਅਤੇ ਵਿਲੇਨ ਆਹਮੋ-ਸਾਹਮਣੇ ਖੜ੍ਹੇ ਹਨ। ਮੀਂਹ ਲਗਾਤਾਰ ਪੈ ਰਿਹਾ ਹੈ। ਬਿਜਲੀ ਦੀ ਚਮਕ ਵਿੱਚ ਦੋਵਾਂ ਦੀਆਂ ਅੱਖਾਂ ਵਿੱਚੋਂ ਅੰਗਿਆਰੇ ਵਰ੍ਹ ਰਹੇ ਹਨ। ਅਚਾਨਕ ਗੋਲ਼ੀ ਚੱਲਣ ਦੀ ਆਵਾਜ਼ ਆਉਂਦੀ ਹੈ ਅਤੇ ਸਕ੍ਰੀਨ ਬਲੈਕ (Black) ਹੋ ਜਾਂਦੀ ਹੈ।",
  "ਸੰਗੀਤਕਾਰ ਨੇ ਹਾਰਮੋਨੀਅਮ ਉੱਤੇ ਸੁਰ ਛੇੜੀ ਅਤੇ ਗਾਇਕ ਨੇ ਉੱਚੀ ਹੇਕ ਲਾਈ। ਉਸ ਆਵਾਜ਼ ਵਿੱਚ ਪੰਜਾਬ ਦੇ ਦਰਿਆਵਾਂ ਦੀ ਰਵਾਨਗੀ ਅਤੇ ਖੇਤਾਂ ਦੀ ਹਰਿਆਵਲ ਸਾਫ਼ ਸੁਣਾਈ ਦੇ ਰਹੀ ਸੀ। ਸਰੋਤੇ ਮੰਤਰ-ਮੁਗਧ ਹੋ ਕੇ ਬੈਠੇ ਰਹੇ।",
  "ਵਿਆਹ ਵਾਲੇ ਘਰ ਵਿੱਚ ਜਾਗੋ ਕੱਢਣ ਦੀ ਤਿਆਰੀ ਚੱਲ ਰਹੀ ਸੀ। ਕੁੜੀਆਂ ਨੇ ਸਿਰਾਂ 'ਤੇ ਜਾਗੋ ਚੁੱਕੀ ਅਤੇ ਪਿੰਡ ਦੀਆਂ ਗਲੀਆਂ ਵਿੱਚ ਗਿੱਧੇ ਦੀ ਧਮਾਲ ਪੈ ਗਈ। ਹਾਸੇ, ਮਜ਼ਾਕ ਅਤੇ ਬੋਲੀਆਂ ਨਾਲ ਸਾਰਾ ਮਾਹੌਲ ਰੰਗੀਨ ਹੋ ਗਿਆ।",
  "ਜਦੋਂ ਸੂਰਜ ਪੱਛਮ ਵੱਲ ਢਲ਼ਦਾ ਹੈ, ਤਾਂ ਪੰਛੀ ਆਪਣੇ ਆਲ੍ਹਣਿਆਂ ਵੱਲ ਪਰਤਦੇ ਹਨ। ਕਿਸਾਨ ਆਪਣੇ ਬਲਦਾਂ ਨੂੰ ਹਿੱਕ ਕੇ ਘਰ ਵੱਲ ਤੁਰ ਪੈਂਦਾ ਹੈ। ਇਹ ਦਿਨ ਦੇ ਅੰਤ ਦਾ ਨਹੀਂ, ਸਗੋਂ ਆਉਣ ਵਾਲੇ ਕੱਲ੍ਹ ਦੀ ਨਵੀਂ ਉਮੀਦ ਦਾ ਪ੍ਰਤੀਕ ਹੈ।",
  "ਜੀਵਨ ਇੱਕ ਨਿਰੰਤਰ ਯਾਤਰਾ ਹੈ ਜਿੱਥੇ ਸੁੱਖ ਅਤੇ ਦੁੱਖ ਇੱਕੋ ਸਿੱਕੇ ਦੇ ਦੋ ਪਾਸੇ ਹਨ। ਜਿਸ ਇਨਸਾਨ ਨੇ ਇਸ ਸੱਚ ਨੂੰ ਸਵੀਕਾਰ ਕਰ ਲਿਆ, ਉਸ ਨੂੰ ਕਦੇ ਵੀ ਕੋਈ ਮੁਸ਼ਕਲ ਝੁਕਾ ਨਹੀਂ ਸਕਦੀ। ਅੰਤ ਵਿੱਚ ਸੱਚ ਦੀ ਹੀ ਜਿੱਤ ਹੁੰਦੀ ਹੈ।"
];

describe('SPIKE 2: Unicode Segmentation and Safe Wrapping', () => {
  it('correctly analyzes the 7-code-unit sequence of ਕ੍ਰਿੱਪਾ', () => {
    const word = 'ਕ੍ਰਿੱਪਾ';
    expect(word.length).toBe(7);

    // Exact UTF-16 code units
    const expectedUnits = [
      0x0a15, // KA
      0x0a4d, // VIRAMA
      0x0a30, // RA
      0x0a3f, // SIHARI
      0x0a71, // ADDAK
      0x0a2a, // PA
      0x0a3e, // AA
    ];
    for (let i = 0; i < word.length; i++) {
      expect(word.charCodeAt(i)).toBe(expectedUnits[i]);
    }

    // Grapheme clusters
    const graphemes = segmentGraphemes(word);
    expect(graphemes.length).toBe(3);
    expect(graphemes[0].segment).toBe('ਕ੍');
    expect(graphemes[0].index).toBe(0);
    expect(graphemes[1].segment).toBe('ਰਿੱ');
    expect(graphemes[1].index).toBe(2);
    expect(graphemes[2].segment).toBe('ਪਾ');
    expect(graphemes[2].index).toBe(5);

    // Word segment
    const words = segmentWords(word);
    expect(words.length).toBe(1);
    expect(words[0].segment).toBe('ਕ੍ਰਿੱਪਾ');
    expect(words[0].index).toBe(0);
    expect(words[0].isWordLike).toBe(true);
  });

  it('proves that grapheme clusters and word segments are distinct and not interchangeable', () => {
    const word = 'ਕ੍ਰਿੱਪਾ';
    const gList = segmentGraphemes(word);
    const wList = segmentWords(word);

    // Graphemes break down into 3 sub-word clusters
    expect(gList.length).not.toBe(wList.length);
    expect(gList.length).toBe(3);
    expect(wList.length).toBe(1);

    // An orthographic split at grapheme index 2 would bisect the akshara ਕ੍ਰਿੱ
    // Word boundary at 0 and 7 preserves the complete orthographic unit
    expect(wList[0].segment.length).toBe(7);
  });

  it('safely segments all 100 representative Punjabi screenplay sentences without breaking Unicode rules', () => {
    expect(PUNJABI_SCREENPLAY_CORPUS_100.length).toBe(100);

    let totalWords = 0;
    let totalGraphemes = 0;
    let unsafeSplits = 0;

    for (let sIdx = 0; sIdx < PUNJABI_SCREENPLAY_CORPUS_100.length; sIdx++) {
      const sentence = PUNJABI_SCREENPLAY_CORPUS_100[sIdx];
      const words = segmentWords(sentence);
      const graphemes = segmentGraphemes(sentence);

      totalWords += words.length;
      totalGraphemes += graphemes.length;

      // Assert that every word boundary is a safe boundary
      for (const w of words) {
        if (!isSafeBoundary(sentence, w.index)) {
          unsafeSplits++;
        }
      }

      // Assert that every grapheme boundary is a safe boundary (does not bisect surrogate or combining mark)
      for (const g of graphemes) {
        if (!isSafeBoundary(sentence, g.index)) {
          unsafeSplits++;
        }
      }
    }

    expect(totalWords).toBeGreaterThan(1000);
    expect(totalGraphemes).toBeGreaterThan(4000);
    expect(unsafeSplits).toBe(0);
  });

  it('handles long unbroken tokens without crashing or generating unsafe split offsets', () => {
    const longToken = 'ਪਿੰਡਵਾਲਿਆਂਨੇਰਲਮਿਲਕੇਸਾਰਾਕੰਮਖ਼ਤਮਕਰਦਿੱਤਾਕੋਈਭੀਮਗਰੋਂਨਹੀਂਬੋਲਿਆ';
    const graphemes = segmentGraphemes(longToken);

    // Verify all grapheme boundaries are strictly safe
    for (const g of graphemes) {
      expect(isSafeBoundary(longToken, g.index)).toBe(true);
      // Character immediately following boundary must never be Virama (0x0A4D) or Addak (0x0A71)
      if (g.index < longToken.length) {
        const nextChar = longToken.charAt(g.index);
        expect(nextChar).not.toBe('\u0A4D');
        expect(nextChar).not.toBe('\u0A71');
      }
    }
  });

  it('handles mixed English and Gurmukhi sentences with code-switching seamlessly', () => {
    const mixed = 'Doctor ਨੇ ਕਿਹਾ ਕਿ Scene 4 ਬਹੁਤ Emotional ਹੈ ਅਤੇ ₹500 ਦੀ Medicine ਲਿਖੀ।';
    const words = segmentWords(mixed);
    const wordTokens = words.filter((w) => w.isWordLike).map((w) => w.segment);

    expect(wordTokens).toContain('Doctor');
    expect(wordTokens).toContain('ਨੇ');
    expect(wordTokens).toContain('ਕਿਹਾ');
    expect(wordTokens).toContain('Scene');
    expect(wordTokens).toContain('4');
    expect(wordTokens).toContain('Emotional');
    expect(wordTokens).toContain('500');
    expect(wordTokens).toContain('Medicine');

    for (const w of words) {
      expect(isSafeBoundary(mixed, w.index)).toBe(true);
    }
  });

  it('safely handles surrogate pairs without bisection', () => {
    // Emoji surrogate pair: 🎭 (U+1F3AD = \uD83C\uDFAD) inside Gurmukhi text
    const textWithSurrogate = 'ਨਾਟਕ 🎭 ਸ਼ੁਰੂ ਹੋਇਆ।';
    const graphemes = segmentGraphemes(textWithSurrogate);

    // Verify emoji is treated as a single cluster
    const emojiCluster = graphemes.find((g) => g.segment === '🎭');
    expect(emojiCluster).toBeDefined();
    expect(emojiCluster!.length).toBe(2); // 2 UTF-16 code units

    // Verify boundary before and after emoji is safe
    expect(isSafeBoundary(textWithSurrogate, emojiCluster!.index)).toBe(true);
    expect(isSafeBoundary(textWithSurrogate, emojiCluster!.index + 2)).toBe(true);
    // Boundary between the surrogate pair must be UNSAFE
    expect(isSafeBoundary(textWithSurrogate, emojiCluster!.index + 1)).toBe(false);
  });
});
