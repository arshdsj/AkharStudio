import { describe, it, expect } from 'vitest';
import {
  KEY_CODE_MAP,
  resolveContextualInput,
  isGurmukhiConsonant,
  isGurmukhiDependentVowel,
  ROW1_KEYS,
  ROW2_KEYS,
  ROW3_KEYS,
  ROW4_KEYS,
  ROW5_KEYS,
} from '../src/core/editor/gurmukhiKeyboardMappings';

describe('Gurmukhi Keyboard Mappings and Contextual Vowels', () => {
  describe('Consonant and Dependent Vowel Detection', () => {
    it('accurately identifies base Gurmukhi consonants', () => {
      expect(isGurmukhiConsonant('ਕ')).toBe(true);
      expect(isGurmukhiConsonant('ਬ')).toBe(true);
      expect(isGurmukhiConsonant('ਸ')).toBe(true);
      expect(isGurmukhiConsonant('ਹ')).toBe(true);
      expect(isGurmukhiConsonant('ੜ')).toBe(true);
      expect(isGurmukhiConsonant('ਧ')).toBe(true);
      expect(isGurmukhiConsonant('ਣ')).toBe(true);

      // Six additional Nukta consonants
      expect(isGurmukhiConsonant('ਸ਼')).toBe(true);
      expect(isGurmukhiConsonant('ਗ਼')).toBe(true);
      expect(isGurmukhiConsonant('ਜ਼')).toBe(true);
      expect(isGurmukhiConsonant('ਖ਼')).toBe(true);
      expect(isGurmukhiConsonant('ਲ਼')).toBe(true);
      expect(isGurmukhiConsonant('ਫ਼')).toBe(true);
    });

    it('accurately rejects non-consonants', () => {
      expect(isGurmukhiConsonant(' ')).toBe(false);
      expect(isGurmukhiConsonant('।')).toBe(false);
      expect(isGurmukhiConsonant('.')).toBe(false);
      expect(isGurmukhiConsonant('ਏ')).toBe(false);
      expect(isGurmukhiConsonant('ਅ')).toBe(false);
      expect(isGurmukhiConsonant('a')).toBe(false);
      expect(isGurmukhiConsonant('1')).toBe(false);
    });

    it('accurately identifies dependent vowel marks (matras)', () => {
      expect(isGurmukhiDependentVowel('ੇ')).toBe(true);
      expect(isGurmukhiDependentVowel('ੈ')).toBe(true);
      expect(isGurmukhiDependentVowel('ਾ')).toBe(true);
      expect(isGurmukhiDependentVowel('ਿ')).toBe(true);
      expect(isGurmukhiDependentVowel('ੀ')).toBe(true);
      expect(isGurmukhiDependentVowel('ੁ')).toBe(true);
      expect(isGurmukhiDependentVowel('ੂ')).toBe(true);
      expect(isGurmukhiDependentVowel('ੋ')).toBe(true);
      expect(isGurmukhiDependentVowel('ੌ')).toBe(true);

      expect(isGurmukhiDependentVowel(' ')).toBe(false);
      expect(isGurmukhiDependentVowel('ਬ')).toBe(false);
      expect(isGurmukhiDependentVowel('ਏ')).toBe(false);
    });
  });

  describe('Context-Aware Vowel Handling', () => {
    const shiftE = KEY_CODE_MAP.get('KeyE')!.shift;
    const shiftA = KEY_CODE_MAP.get('KeyA')!.shift;
    const normalI = KEY_CODE_MAP.get('KeyI')!.normal;
    const shiftI = KEY_CODE_MAP.get('KeyI')!.shift;
    const normalU = KEY_CODE_MAP.get('KeyU')!.normal;
    const shiftU = KEY_CODE_MAP.get('KeyU')!.shift;
    const normalO = KEY_CODE_MAP.get('KeyO')!.normal;
    const shiftO = KEY_CODE_MAP.get('KeyO')!.shift;

    it('Shift + E in an empty editor -> ਏ (independent)', () => {
      const res = resolveContextualInput(shiftE, '');
      expect(res.textToInsert).toBe('ਏ');
      expect(res.replaceLength).toBe(0);
    });

    it('ਬ followed by Shift + E -> ਬੇ (combining mark after consonant)', () => {
      const res = resolveContextualInput(shiftE, 'ਬ');
      expect(res.textToInsert).toBe('ੇ');
      expect(res.replaceLength).toBe(0);
    });

    it('ਬ followed by Space and Shift + E -> ਬ ਏ (independent after space)', () => {
      const res = resolveContextualInput(shiftE, 'ਬ ');
      expect(res.textToInsert).toBe('ਏ');
      expect(res.replaceLength).toBe(0);
    });

    it('punctuation followed by Shift + E -> independent vowel', () => {
      expect(resolveContextualInput(shiftE, '।').textToInsert).toBe('ਏ');
      expect(resolveContextualInput(shiftE, ',').textToInsert).toBe('ਏ');
      expect(resolveContextualInput(shiftE, '-').textToInsert).toBe('ਏ');
    });

    it('independent vowel followed by Shift + E -> independent vowel', () => {
      expect(resolveContextualInput(shiftE, 'ਆ').textToInsert).toBe('ਏ');
    });

    it('handles consonant with Nukta (ਸ + ਼ -> ਸ਼ + Shift+E -> ਸ਼ੇ)', () => {
      const res = resolveContextualInput(shiftE, 'ਸ\u0A3C');
      expect(res.textToInsert).toBe('ੇ');
      expect(res.replaceLength).toBe(0);
    });

    it('safely appends independent vowels after dependent vowels for correct Punjabi diphthongs without replacing', () => {
      // ਪ has ਾ (ਪਾ). User presses KeyU (u) -> appends ਉ to produce ਪਾਉ (as in ਪਾਉਂਦਾ)
      const resPau = resolveContextualInput(normalU, 'ਪਾ');
      expect(resPau.textToInsert).toBe('ਉ');
      expect(resPau.replaceLength).toBe(0);

      // ਬ has ੇ (ਬੇ). User presses Shift+E -> appends ਏ (independent) without replacing
      const res1 = resolveContextualInput(shiftE, 'ਬੇ');
      expect(res1.textToInsert).toBe('ਏ');
      expect(res1.replaceLength).toBe(0);

      // ਹੋ has ੋ (ਹੋ). User presses Shift+E -> appends ਏ to produce ਹੋਏ
      const resHoe = resolveContextualInput(shiftE, 'ਹੋ');
      expect(resHoe.textToInsert).toBe('ਏ');
      expect(resHoe.replaceLength).toBe(0);

      // ਕੋ has ੋ (ਕੋ). User presses Shift+I -> appends ਈ to produce ਕੋਈ
      const resKoi = resolveContextualInput(shiftI, 'ਕੋ');
      expect(resKoi.textToInsert).toBe('ਈ');
      expect(resKoi.replaceLength).toBe(0);
    });

    it('applies equivalent contextual logic to other vowel keys', () => {
      // KeyA Shift (ਆ / ਾ)
      expect(resolveContextualInput(shiftA, '').textToInsert).toBe('ਆ');
      expect(resolveContextualInput(shiftA, 'ਕ').textToInsert).toBe('ਾ');
      expect(resolveContextualInput(shiftA, 'ਕ ').textToInsert).toBe('ਆ');

      // KeyI Normal (ਇ / ਿ)
      expect(resolveContextualInput(normalI, '').textToInsert).toBe('ਇ');
      expect(resolveContextualInput(normalI, 'ਕ').textToInsert).toBe('ਿ');

      // KeyI Shift (ਈ / ੀ)
      expect(resolveContextualInput(shiftI, '').textToInsert).toBe('ਈ');
      expect(resolveContextualInput(shiftI, 'ਕ').textToInsert).toBe('ੀ');

      // KeyU Normal (ਉ / ੁ)
      expect(resolveContextualInput(normalU, '').textToInsert).toBe('ਉ');
      expect(resolveContextualInput(normalU, 'ਕ').textToInsert).toBe('ੁ');

      // KeyU Shift (ਊ / ੂ)
      expect(resolveContextualInput(shiftU, '').textToInsert).toBe('ਊ');
      expect(resolveContextualInput(shiftU, 'ਕ').textToInsert).toBe('ੂ');

      // KeyO Normal (ਓ / ੋ)
      expect(resolveContextualInput(normalO, '').textToInsert).toBe('ਓ');
      expect(resolveContextualInput(normalO, 'ਕ').textToInsert).toBe('ੋ');

      // KeyO Shift (ਔ / ੌ)
      expect(resolveContextualInput(shiftO, '').textToInsert).toBe('ਔ');
      expect(resolveContextualInput(shiftO, 'ਕ').textToInsert).toBe('ੌ');
    });
  });

  describe('Key Mappings Verification Across Keyboard Rows', () => {
    it('has all 5 rows populated with matching key counts', () => {
      expect(ROW1_KEYS.length).toBe(14);
      expect(ROW2_KEYS.length).toBe(14);
      expect(ROW3_KEYS.length).toBe(13);
      expect(ROW4_KEYS.length).toBe(13);
      expect(ROW5_KEYS.length).toBe(7);
    });

    it('verifies Row 1 Gurmukhi digits and shift symbols', () => {
      expect(KEY_CODE_MAP.get('Digit1')?.normal).toBe('੧');
      expect(KEY_CODE_MAP.get('Digit1')?.shift).toBe('!');
      expect(KEY_CODE_MAP.get('Digit2')?.normal).toBe('੨');
      expect(KEY_CODE_MAP.get('Digit2')?.shift).toBe('@');
      expect(KEY_CODE_MAP.get('Digit3')?.normal).toBe('੩');
      expect(KEY_CODE_MAP.get('Digit3')?.shift).toBe('#');
      expect(KEY_CODE_MAP.get('Digit4')?.normal).toBe('੪');
      expect(KEY_CODE_MAP.get('Digit4')?.shift).toBe('$');
      expect(KEY_CODE_MAP.get('Digit5')?.normal).toBe('੫');
      expect(KEY_CODE_MAP.get('Digit5')?.shift).toBe('%');
      expect(KEY_CODE_MAP.get('Digit6')?.normal).toBe('੬');
      expect(KEY_CODE_MAP.get('Digit6')?.shift).toBe('^');
      expect(KEY_CODE_MAP.get('Digit7')?.normal).toBe('੭');
      expect(KEY_CODE_MAP.get('Digit7')?.shift).toBe('&');
      expect(KEY_CODE_MAP.get('Digit8')?.normal).toBe('੮');
      expect(KEY_CODE_MAP.get('Digit8')?.shift).toBe('*');
      expect(KEY_CODE_MAP.get('Digit9')?.normal).toBe('੯');
      expect(KEY_CODE_MAP.get('Digit9')?.shift).toBe('(');
      expect(KEY_CODE_MAP.get('Digit0')?.normal).toBe('੦');
      expect(KEY_CODE_MAP.get('Digit0')?.shift).toBe(')');
    });

    it('verifies Row 2 consonants and vowel signs', () => {
      expect(KEY_CODE_MAP.get('KeyQ')?.normal).toBe('ੲ');
      expect(KEY_CODE_MAP.get('KeyQ')?.shift).toBe('ੳ');
      expect(KEY_CODE_MAP.get('KeyW')?.normal).toBe('ੱ');
      expect(KEY_CODE_MAP.get('KeyW')?.shift).toBe('ਥ');
      expect(KEY_CODE_MAP.get('KeyR')?.normal).toBe('ਰ');
      expect(KEY_CODE_MAP.get('KeyR')?.shift).toBe('ੜ');
      expect(KEY_CODE_MAP.get('KeyT')?.normal).toBe('ਤ');
      expect(KEY_CODE_MAP.get('KeyT')?.shift).toBe('ਟ');
      expect(KEY_CODE_MAP.get('KeyY')?.normal).toBe('ਯ');
      expect(KEY_CODE_MAP.get('KeyP')?.normal).toBe('ਪ');
      expect(KEY_CODE_MAP.get('KeyP')?.shift).toBe('ਫ');
      expect(KEY_CODE_MAP.get('BracketLeft')?.normal).toBe('।');
      expect(KEY_CODE_MAP.get('BracketLeft')?.shift).toBe('॥');
    });

    it('verifies Row 3 consonants, diacritics, and signs', () => {
      expect(KEY_CODE_MAP.get('KeyA')?.normal).toBe('ਅ');
      expect(KEY_CODE_MAP.get('KeyS')?.normal).toBe('ਸ');
      expect(KEY_CODE_MAP.get('KeyS')?.shift).toBe('ਠ');
      expect(KEY_CODE_MAP.get('KeyD')?.normal).toBe('ਦ');
      expect(KEY_CODE_MAP.get('KeyD')?.shift).toBe('ਧ');
      expect(KEY_CODE_MAP.get('KeyF')?.normal).toBe('ੰ'); // Tippi
      expect(KEY_CODE_MAP.get('KeyF')?.shift).toBe('ਂ'); // Bindi
      expect(KEY_CODE_MAP.get('KeyG')?.normal).toBe('ਗ');
      expect(KEY_CODE_MAP.get('KeyG')?.shift).toBe('ਘ');
      expect(KEY_CODE_MAP.get('KeyH')?.normal).toBe('ਹ');
      expect(KEY_CODE_MAP.get('KeyJ')?.normal).toBe('ਜ');
      expect(KEY_CODE_MAP.get('KeyJ')?.shift).toBe('ਝ');
      expect(KEY_CODE_MAP.get('KeyK')?.normal).toBe('ਕ');
      expect(KEY_CODE_MAP.get('KeyK')?.shift).toBe('ਖ');
      expect(KEY_CODE_MAP.get('KeyL')?.normal).toBe('ਲ');
      expect(KEY_CODE_MAP.get('KeyL')?.shift).toBe('\u0A4D'); // Halant
    });

    it('verifies the six additional Gurmukhi characters via alt mappings', () => {
      expect(KEY_CODE_MAP.get('KeyS')?.alt).toBe('ਸ਼');
      expect(KEY_CODE_MAP.get('KeyG')?.alt).toBe('ਗ਼');
      expect(KEY_CODE_MAP.get('KeyJ')?.alt).toBe('ਜ਼');
      expect(KEY_CODE_MAP.get('KeyK')?.alt).toBe('ਖ਼');
      expect(KEY_CODE_MAP.get('KeyL')?.alt).toBe('ਲ਼');
      expect(KEY_CODE_MAP.get('KeyP')?.alt).toBe('ਫ਼');
    });

    it('verifies Row 4 consonants, Nukta, and Ek Onkar', () => {
      expect(KEY_CODE_MAP.get('KeyZ')?.normal).toBe('ਡ');
      expect(KEY_CODE_MAP.get('KeyZ')?.shift).toBe('ਢ');
      expect(KEY_CODE_MAP.get('KeyX')?.normal).toBe('\u0A3C'); // Nukta
      expect(KEY_CODE_MAP.get('KeyX')?.shift).toBe('ਣ');
      expect(KEY_CODE_MAP.get('KeyC')?.normal).toBe('ਚ');
      expect(KEY_CODE_MAP.get('KeyC')?.shift).toBe('ਛ');
      expect(KEY_CODE_MAP.get('KeyV')?.normal).toBe('ਵ');
      expect(KEY_CODE_MAP.get('KeyV')?.shift).toBe('ਙ');
      expect(KEY_CODE_MAP.get('KeyB')?.normal).toBe('ਬ');
      expect(KEY_CODE_MAP.get('KeyB')?.shift).toBe('ਭ');
      expect(KEY_CODE_MAP.get('KeyN')?.normal).toBe('ਨ');
      expect(KEY_CODE_MAP.get('KeyN')?.shift).toBe('ਞ');
      expect(KEY_CODE_MAP.get('KeyM')?.normal).toBe('ਮ');
      expect(KEY_CODE_MAP.get('KeyM')?.shift).toBe('ੴ'); // Ek Onkar
    });
  });
});
