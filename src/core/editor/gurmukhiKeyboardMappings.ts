/**
 * gurmukhiKeyboardMappings.ts - Authoritative Centralized Punjabi Gurmukhi Keyboard Layout
 *
 * Implements the exact keyboard layout, character assignments, and visual appearance
 * shown in the reference screenshots for Normal and Shift-held states.
 *
 * Provides:
 * - Complete mapping definition keyed by physical event.code
 * - Contextual vowel resolution (independent vs combining/dependent vowel signs)
 * - Safe handling of existing combining marks (no invalid stacking)
 * - Visual row definitions for rendering the virtual keyboard UI
 */

export interface ContextualVowel {
  independent: string;
  dependent: string;
}

export type KeyOutput = string | ContextualVowel;

export function isContextualVowel(output: KeyOutput): output is ContextualVowel {
  return typeof output === 'object' && output !== null && 'independent' in output && 'dependent' in output;
}

export interface KeyDefinition {
  code: string;           // Physical key code (event.code)
  label: string;          // English primary label on top-left of key
  shiftLabel?: string;    // English secondary label (e.g. '!' on '1', '~' on '`')
  normal: KeyOutput;      // Normal output
  shift: KeyOutput;       // Shifted output
  alt?: KeyOutput;        // Output when Ctrl or Alt/Option is held
  displayNormal?: string; // Text rendered on key in normal state (defaults to normal char)
  displayShift?: string;  // Text rendered on key in shift state (defaults to shift char)
  displayAlt?: string;    // Text rendered on key in Ctrl/Alt state (defaults to alt char)
  isSpecial?: boolean;    // Functional keys (Backspace, Tab, Enter, etc.)
  widthClass?: string;    // Custom Tailwind width or flex class
}

/**
 * Checks whether a character is a Gurmukhi consonant.
 * Covers:
 * - Primary consonants: ਕ-ਙ, ਚ-ਞ, ਟ-ਣ, ਤ-ਨ, ਪ-ਮ, ਯ-ਹ, ੜ (U+0A15..U+0A39, U+0A5C)
 * - Nukta consonants: ਸ਼, ਖ਼, ਗ਼, ਜ਼, ਫ਼, ਲ਼ (U+0A33, U+0A36, U+0A59..U+0A5B, U+0A5E)
 */
export function isGurmukhiConsonant(char: string): boolean {
  if (!char) return false;
  const cp = char.codePointAt(0);
  if (!cp) return false;
  const isBaseConsonant =
    cp >= 0x0a15 && cp <= 0x0a39 && cp !== 0x0a29 && cp !== 0x0a31 && cp !== 0x0a34 && cp !== 0x0a37;
  const isExtendedConsonant =
    (cp >= 0x0a59 && cp <= 0x0a5c) || cp === 0x0a5e || cp === 0x0a33 || cp === 0x0a36;
  return isBaseConsonant || isExtendedConsonant;
}

/**
 * Checks whether a character is a Gurmukhi combining vowel sign (matra).
 * U+0A3E (ਾ), U+0A3F (ਿ), U+0A40 (ੀ), U+0A41 (ੁ), U+0A42 (ੂ),
 * U+0A47 (ੇ), U+0A48 (ੈ), U+0A4B (ੋ), U+0A4C (ੌ)
 */
export function isGurmukhiDependentVowel(char: string): boolean {
  if (!char) return false;
  const cp = char.codePointAt(0);
  return (
    cp === 0x0a3e ||
    cp === 0x0a3f ||
    cp === 0x0a40 ||
    cp === 0x0a41 ||
    cp === 0x0a42 ||
    cp === 0x0a47 ||
    cp === 0x0a48 ||
    cp === 0x0a4b ||
    cp === 0x0a4c
  );
}

/**
 * Resolves whether a key's output should be an independent character or
 * a combining dependent vowel sign based on the editor's caret context.
 *
 * Rules:
 * 1. At start of document/block or after space, punctuation, English letter, or independent vowel:
 *    -> Insert independent vowel (e.g. ਏ, ਐ, ਆ, ਇ, ਈ, ਉ, ਊ, ਓ, ਔ)
 * 2. After a bare Gurmukhi consonant (including with nukta or subjoined form):
 *    -> Insert dependent combining vowel sign (e.g. ੇ, ੈ, ਾ, ਿ, ੀ, ੁ, ੂ, ੋ, ੌ)
 * 3. After an existing dependent vowel sign (e.g. kanna ਾ, hora ੋ, bihari ੀ, etc.):
 *    -> The consonant already has a vowel sign. In Punjabi typing conventions and orthography,
 *       the user is typing a vowel sequence / diphthong (e.g. ਪਾ + ਉ -> ਪਾਉਂਦਾ, ਪਾ + ਏ -> ਪਾਏ,
 *       ਪਾ + ਓ -> ਪਾਓ, ਹੋ + ਏ -> ਹੋਏ, ਕੋ + ਈ -> ਕੋਈ, ਸੂ + ਈ -> ਸੂਈ).
 *       Therefore, insert the INDEPENDENT vowel (replaceLength: 0) without replacing existing characters.
 */
export function resolveContextualInput(
  output: KeyOutput,
  textBeforeCaret: string
): { textToInsert: string; replaceLength: number } {
  if (typeof output === 'string') {
    return { textToInsert: output, replaceLength: 0 };
  }

  // output is ContextualVowel { independent, dependent }
  if (!textBeforeCaret || textBeforeCaret.length === 0) {
    return { textToInsert: output.independent, replaceLength: 0 };
  }

  const lastChar = textBeforeCaret.slice(-1);

  // If preceded by an existing dependent vowel sign, append the independent vowel (e.g. ਪਾ + ਉ -> ਪਾਉ)
  // This preserves the existing syllable and builds correct diphthongs without unintentional replacement
  if (isGurmukhiDependentVowel(lastChar)) {
    return { textToInsert: output.independent, replaceLength: 0 };
  }

  // If preceded by Nukta (U+0A3C), check if consonant precedes the Nukta
  if (lastChar === '\u0A3C') {
    const charBeforeNukta = textBeforeCaret.length >= 2 ? textBeforeCaret.slice(-2, -1) : '';
    if (isGurmukhiConsonant(charBeforeNukta)) {
      return { textToInsert: output.dependent, replaceLength: 0 };
    }
    return { textToInsert: output.independent, replaceLength: 0 };
  }

  // If preceded by a consonant, attach dependent vowel sign
  if (isGurmukhiConsonant(lastChar)) {
    return { textToInsert: output.dependent, replaceLength: 0 };
  }

  // Any other context (space, punctuation, numbers, independent vowels, nasal marks) -> independent vowel
  return { textToInsert: output.independent, replaceLength: 0 };
}

// =========================================================================
// 5-Row Keyboard Definition (Authoritative Screenshot Source of Truth)
// =========================================================================

export const ROW1_KEYS: KeyDefinition[] = [
  { code: 'Backquote', label: '`', shiftLabel: '~', normal: '`', shift: '~' },
  { code: 'Digit1', label: '1', shiftLabel: '!', normal: '੧', shift: '!' },
  { code: 'Digit2', label: '2', shiftLabel: '@', normal: '੨', shift: '@' },
  { code: 'Digit3', label: '3', shiftLabel: '#', normal: '੩', shift: '#' },
  { code: 'Digit4', label: '4', shiftLabel: '$', normal: '੪', shift: '$' },
  { code: 'Digit5', label: '5', shiftLabel: '%', normal: '੫', shift: '%' },
  { code: 'Digit6', label: '6', shiftLabel: '^', normal: '੬', shift: '^' },
  { code: 'Digit7', label: '7', shiftLabel: '&', normal: '੭', shift: '&' },
  { code: 'Digit8', label: '8', shiftLabel: '*', normal: '੮', shift: '*' },
  { code: 'Digit9', label: '9', shiftLabel: '(', normal: '੯', shift: '(' },
  { code: 'Digit0', label: '0', shiftLabel: ')', normal: '੦', shift: ')' },
  { code: 'Minus', label: '-', shiftLabel: '_', normal: '-', shift: '_' },
  { code: 'Equal', label: '=', shiftLabel: '+', normal: '=', shift: '+' },
  {
    code: 'Backspace',
    label: 'Backspace',
    normal: '',
    shift: '',
    isSpecial: true,
    widthClass: 'flex-[1.5] min-w-[70px]',
  },
];

export const ROW2_KEYS: KeyDefinition[] = [
  { code: 'Tab', label: 'Tab', normal: '', shift: '', isSpecial: true, widthClass: 'flex-[1.3] min-w-[60px]' },
  { code: 'KeyQ', label: 'q', normal: 'ੲ', shift: 'ੳ' },
  { code: 'KeyW', label: 'w', normal: '\u0A71', shift: 'ਥ' }, // Normal: Adhak (ੱ), Shift: Tha (ਥ)
  {
    code: 'KeyE',
    label: 'e',
    normal: { independent: 'ਐ', dependent: '\u0A48' },
    shift: { independent: 'ਏ', dependent: '\u0A47' },
    displayNormal: 'ਐ',
    displayShift: 'ਏ',
  },
  { code: 'KeyR', label: 'r', normal: 'ਰ', shift: 'ੜ' },
  { code: 'KeyT', label: 't', normal: 'ਤ', shift: 'ਟ' },
  { code: 'KeyY', label: 'y', normal: 'ਯ', shift: '\u0A01' }, // Normal: Ya, Shift: Adak Bindi (ਁ)
  {
    code: 'KeyU',
    label: 'u',
    normal: { independent: 'ਉ', dependent: '\u0A41' },
    shift: { independent: 'ਊ', dependent: '\u0A42' },
    displayNormal: 'ਉ',
    displayShift: 'ਊ',
  },
  {
    code: 'KeyI',
    label: 'i',
    normal: { independent: 'ਇ', dependent: '\u0A3F' },
    shift: { independent: 'ਈ', dependent: '\u0A40' },
    displayNormal: 'ਇ',
    displayShift: 'ਈ',
  },
  {
    code: 'KeyO',
    label: 'o',
    normal: { independent: 'ਓ', dependent: '\u0A4B' },
    shift: { independent: 'ਔ', dependent: '\u0A4C' },
    displayNormal: 'ਓ',
    displayShift: 'ਔ',
  },
  { code: 'KeyP', label: 'p', normal: 'ਪ', shift: 'ਫ', alt: 'ਫ਼', displayAlt: 'ਫ਼' },
  { code: 'BracketLeft', label: '[', shiftLabel: '{', normal: '।', shift: '॥' },
  { code: 'BracketRight', label: ']', shiftLabel: '}', normal: ']', shift: '}' },
  { code: 'Backslash', label: '\\', shiftLabel: '|', normal: '\\', shift: '|', widthClass: 'flex-[1.2]' },
];

export const ROW3_KEYS: KeyDefinition[] = [
  {
    code: 'CapsLock',
    label: 'Caps Lock',
    normal: '',
    shift: '',
    isSpecial: true,
    widthClass: 'flex-[1.6] min-w-[70px]',
  },
  {
    code: 'KeyA',
    label: 'a',
    normal: 'ਅ',
    shift: { independent: 'ਆ', dependent: '\u0A3E' },
    displayNormal: 'ਅ',
    displayShift: 'ਆ',
  },
  { code: 'KeyS', label: 's', normal: 'ਸ', shift: 'ਠ', alt: 'ਸ਼', displayAlt: 'ਸ਼' },
  { code: 'KeyD', label: 'd', normal: 'ਦ', shift: 'ਧ' },
  { code: 'KeyF', label: 'f', normal: '\u0A70', shift: '\u0A02' }, // Normal: Tippi (ੰ), Shift: Bindi (ਂ)
  { code: 'KeyG', label: 'g', normal: 'ਗ', shift: 'ਘ', alt: 'ਗ਼', displayAlt: 'ਗ਼' },
  { code: 'KeyH', label: 'h', normal: 'ਹ', shift: ':' }, // Shift H is colon :
  { code: 'KeyJ', label: 'j', normal: 'ਜ', shift: 'ਝ', alt: 'ਜ਼', displayAlt: 'ਜ਼' },
  { code: 'KeyK', label: 'k', normal: 'ਕ', shift: 'ਖ', alt: 'ਖ਼', displayAlt: 'ਖ਼' },
  { code: 'KeyL', label: 'l', normal: 'ਲ', shift: '\u0A4D', alt: 'ਲ਼', displayAlt: 'ਲ਼' }, // Shift L is Halant (੍), Alt is Lla (ਲ਼)
  { code: 'Semicolon', label: ';', shiftLabel: ':', normal: ';', shift: ':' },
  { code: 'Quote', label: "'", shiftLabel: '"', normal: "'", shift: '"' },
  {
    code: 'Enter',
    label: 'Enter',
    normal: '',
    shift: '',
    isSpecial: true,
    widthClass: 'flex-[1.8] min-w-[75px]',
  },
];

export const ROW4_KEYS: KeyDefinition[] = [
  {
    code: 'ShiftLeft',
    label: 'Shift',
    normal: '',
    shift: '',
    isSpecial: true,
    widthClass: 'flex-[1.3] min-w-[60px]',
  },
  { code: 'IntlBackslash', label: '\\', shiftLabel: '|', normal: '\\', shift: '|' },
  { code: 'KeyZ', label: 'z', normal: 'ਡ', shift: 'ਢ' },
  { code: 'KeyX', label: 'x', normal: '\u0A3C', shift: 'ਣ' }, // Normal: Nukta (਼), Shift: Nna (ਣ)
  { code: 'KeyC', label: 'c', normal: 'ਚ', shift: 'ਛ' },
  { code: 'KeyV', label: 'v', normal: 'ਵ', shift: 'ਙ' }, // Normal: Va, Shift: Nga (ਙ)
  { code: 'KeyB', label: 'b', normal: 'ਬ', shift: 'ਭ' },
  { code: 'KeyN', label: 'n', normal: 'ਨ', shift: 'ਞ' }, // Normal: Na, Shift: Nya (ਞ)
  { code: 'KeyM', label: 'm', normal: 'ਮ', shift: 'ੴ' }, // Shift: Ek Onkar (ੴ)
  { code: 'Comma', label: ',', shiftLabel: '<', normal: ',', shift: '<' },
  { code: 'Period', label: '.', shiftLabel: '>', normal: '.', shift: '>' },
  { code: 'Slash', label: '/', shiftLabel: '?', normal: '/', shift: '?' },
  {
    code: 'ShiftRight',
    label: 'Shift',
    normal: '',
    shift: '',
    isSpecial: true,
    widthClass: 'flex-[2.1] min-w-[80px]',
  },
];

export const ROW5_KEYS: KeyDefinition[] = [
  { code: 'ControlLeft', label: 'Ctrl', normal: '', shift: '', isSpecial: true, widthClass: 'flex-[1.3]' },
  { code: 'Emoji', label: 'Emoji', normal: '', shift: '', isSpecial: true, widthClass: 'flex-[1.3]' },
  { code: 'AltLeft', label: 'Alt', normal: '', shift: '', isSpecial: true, widthClass: 'flex-[1.3]' },
  {
    code: 'Space',
    label: 'Space',
    normal: ' ',
    shift: ' ',
    isSpecial: true,
    widthClass: 'flex-[5.2] min-w-[180px]',
  },
  { code: 'AltRight', label: 'AltGr', normal: '', shift: '', isSpecial: true, widthClass: 'flex-[1.3]' },
  { code: 'Escape', label: 'Esc', normal: '', shift: '', isSpecial: true, widthClass: 'flex-[1.3]' },
  { code: 'ControlRight', label: 'Ctrl', normal: '', shift: '', isSpecial: true, widthClass: 'flex-[1.3]' },
];

export const KEYBOARD_ROWS = [ROW1_KEYS, ROW2_KEYS, ROW3_KEYS, ROW4_KEYS, ROW5_KEYS];

// Map from event.code to KeyDefinition for fast lookup
export const KEY_CODE_MAP = new Map<string, KeyDefinition>();
for (const row of KEYBOARD_ROWS) {
  for (const key of row) {
    KEY_CODE_MAP.set(key.code, key);
  }
}
