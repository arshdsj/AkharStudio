/**
 * autocomplete.ts - Autocomplete Suggestions for Character, Scene, and Transition
 * Governing IDs: AC-01, AC-02, AC-03, AC-04, DEC-011, DEC-030, T-04
 */

import { EditorState } from 'prosemirror-state';
import { ScreenplayBlockType } from '../../types/screenplay';

export interface SuggestionItem {
  id: string;
  label: string;
  value: string;
  hint?: string;
}

export interface SuggestionState {
  isOpen: boolean;
  type: 'character' | 'scene_prefix' | 'transition';
  items: SuggestionItem[];
  selectedIndex: number;
  blockPos: number;
}

export const SCENE_PREFIXES: SuggestionItem[] = [
  { id: 'int', label: 'INT.', value: 'INT. ' },
  { id: 'ext', label: 'EXT.', value: 'EXT. ' },
  { id: 'ie', label: 'I/E.', value: 'I/E. ' },
];

export const TRANSITION_SUGGESTIONS: SuggestionItem[] = [
  { id: 'cut_to', label: 'CUT TO:', value: 'CUT TO:' },
  { id: 'fade_in', label: 'FADE IN:', value: 'FADE IN:' },
  { id: 'fade_out', label: 'FADE OUT.', value: 'FADE OUT.' },
  { id: 'fade_to', label: 'FADE TO:', value: 'FADE TO:' },
  { id: 'dissolve_to', label: 'DISSOLVE TO:', value: 'DISSOLVE TO:' },
  { id: 'back_to', label: 'BACK TO:', value: 'BACK TO:' },
];

const GURMUKHI_DIGITS = ['੦', '੧', '੨', '੩', '੪', '੫', '੬', '੭', '੮', '੯'];

function parseDigits(str: string): { num: number; isGurmukhi: boolean } | null {
  if (/^[0-9]+$/.test(str)) {
    return { num: parseInt(str, 10), isGurmukhi: false };
  }
  if (/^[੦-੯]+$/.test(str)) {
    let n = 0;
    for (const ch of str) {
      const code = ch.charCodeAt(0) - 0x0a66;
      n = n * 10 + code;
    }
    return { num: n, isGurmukhi: true };
  }
  return null;
}

function formatDigits(num: number, isGurmukhi: boolean): string {
  if (!isGurmukhi) return String(num);
  return String(num)
    .split('')
    .map((d) => GURMUKHI_DIGITS[parseInt(d, 10)] || d)
    .join('');
}

export interface SceneHeadingConvention {
  prefix: string;
  nextNumber: number;
  isGurmukhi: boolean;
  hasConvention: boolean;
  suggestedHeading: string;
}

/**
 * Inspects all existing Scene Headings across the document to learn established conventions:
 * prefix (e.g. "SCENE ", "SC. ", "ਸੀਨ "), numbering pattern, gaps, and highest number + 1.
 */
export function detectSceneHeadingConvention(doc: any): SceneHeadingConvention {
  let highestNum = 0;
  const numbersFound: number[] = [];
  const prefixCounts = new Map<string, number>();
  let gurmukhiCount = 0;
  let asciiCount = 0;

  doc.descendants((node: any) => {
    if (node.type?.name === 'screenplay_block' && node.attrs?.type === 'scene_heading') {
      const text = node.textContent.trim();
      if (!text) return;

      const match =
        text.match(/^((?:SCENE|SC\.|SC|SCN|ਸੀਨ|ਸੀਨ\.)[\s\-_#]*?)([\d੦-੯]+)/i) ||
        text.match(/^([\d੦-੯]+)[\.\s\-:]+/);

      if (match) {
        let prefixStr = '';
        let numStr = '';

        if (match.length >= 3 && match[2]) {
          prefixStr = match[1];
          numStr = match[2];
        } else if (match[1]) {
          prefixStr = '';
          numStr = match[1];
        }

        const parsed = parseDigits(numStr);
        if (parsed) {
          numbersFound.push(parsed.num);
          if (parsed.num > highestNum) {
            highestNum = parsed.num;
          }
          if (parsed.isGurmukhi) gurmukhiCount++;
          else asciiCount++;

          const normPrefix = prefixStr ? prefixStr : '';
          prefixCounts.set(normPrefix, (prefixCounts.get(normPrefix) || 0) + 1);
        }
      }
    }
  });

  let bestPrefix = 'SCENE ';
  let maxCount = 0;
  for (const [p, c] of prefixCounts.entries()) {
    if (c > maxCount && p.length > 0) {
      maxCount = c;
      bestPrefix = p;
    }
  }

  // Ensure prefix ends with proper space or punctuation
  if (!bestPrefix.endsWith(' ') && !bestPrefix.endsWith('.') && !bestPrefix.endsWith('-')) {
    bestPrefix += ' ';
  }

  const isGurmukhi = gurmukhiCount > asciiCount;
  const nextNum = highestNum > 0 ? highestNum + 1 : 1;
  const formattedNum = formatDigits(nextNum, isGurmukhi);
  const hasConvention = numbersFound.length > 0;
  const suggestedHeading = `${bestPrefix}${formattedNum}`;

  return {
    prefix: bestPrefix,
    nextNumber: nextNum,
    isGurmukhi,
    hasConvention,
    suggestedHeading,
  };
}

/**
 * Extract existing character names from document in Most Recently Used (MRU) order (AC-02)
 */
export function extractCharacterNamesMRU(state: EditorState): string[] {
  const names: string[] = [];
  const seen = new Set<string>();

  // Iterate backwards from caret to prioritize recently used characters
  state.doc.descendants((node) => {
    if (node.type.name === 'screenplay_block' && node.attrs.type === 'character') {
      const text = node.textContent.trim().toUpperCase();
      // Remove any trailing (CONT'D) or extensions for name extraction
      const cleanName = text.replace(/\s*\([^)]*\)$/, '').trim();
      if (cleanName && !seen.has(cleanName)) {
        seen.add(cleanName);
        names.unshift(cleanName); // MRU order
      }
    }
  });

  return names;
}

/**
 * Extract characters participating in the active scene (demarcated by nearest preceding scene heading)
 * and dynamically rank them by dialogue recency:
 * - If Character A just spoke: Character B is #1, Character A is #2.
 * - If 3+ characters: rank by descending turn recency with the last speaker placed at the end.
 * - Characters not in the active scene follow, ranked by global MRU.
 * - Resets on scene boundary.
 */
export function getActiveSceneCharacterSuggestions(
  state: EditorState,
  currentBlockIndex: number
): string[] {
  let sceneStartIndex = 0;
  for (let i = currentBlockIndex - 1; i >= 0; i--) {
    const block = state.doc.child(i);
    if (block.attrs.type === 'scene_heading') {
      sceneStartIndex = i + 1;
      break;
    }
  }

  const activeTurns: string[] = [];
  for (let i = sceneStartIndex; i < currentBlockIndex; i++) {
    const block = state.doc.child(i);
    if (block.attrs.type === 'character') {
      const text = block.textContent.trim().toUpperCase();
      const clean = text.replace(/\s*\([^)]*\)$/, '').trim();
      if (clean) {
        activeTurns.push(clean);
      }
    }
  }

  const globalCharacters = extractCharacterNamesMRU(state);

  if (activeTurns.length === 0) {
    // Scene boundary reset: no characters have spoken yet in this active scene
    return globalCharacters;
  }

  const lastSpeaker = activeTurns[activeTurns.length - 1];

  const activeRecency: string[] = [];
  const seenActive = new Set<string>();

  for (let i = activeTurns.length - 1; i >= 0; i--) {
    const name = activeTurns[i];
    if (!seenActive.has(name)) {
      seenActive.add(name);
      activeRecency.push(name);
    }
  }

  const otherParticipants = activeRecency.filter((n) => n !== lastSpeaker);
  const activeRanked = [...otherParticipants, lastSpeaker];
  const remainingGlobal = globalCharacters.filter((n) => !seenActive.has(n));

  return [...activeRanked, ...remainingGlobal];
}

/**
 * Query active suggestions based on current block type and text content
 */
export function getActiveSuggestions(state: EditorState): SuggestionState | null {
  const { $from, empty } = state.selection;
  if ($from.depth < 1) return null;
  // If the user has a range selection (highlighted text), suggestions should not appear
  if (!empty) return null;

  const currentBlockIndex = $from.index(0);
  const currentBlock = state.doc.child(currentBlockIndex);
  const currentType = currentBlock.attrs.type as ScreenplayBlockType;
  const blockPos = $from.before(1);
  const rawText = currentBlock.textContent;

  // 1. Character Suggestions (AC-02 & Intelligent Active-Scene Recency)
  if (currentType === 'character') {
    if (rawText.length > 0) {
      return null;
    }

    const suggestions = getActiveSceneCharacterSuggestions(state, currentBlockIndex);
    if (suggestions.length === 0) {
      return null;
    }

    return {
      isOpen: true,
      type: 'character',
      items: suggestions.map((name) => ({
        id: name,
        label: name,
        value: name,
      })),
      selectedIndex: 0,
      blockPos,
    };
  }

  // 2. Intelligent Scene Heading & Number Suggestions
  if (currentType === 'scene_heading') {
    const convention = detectSceneHeadingConvention(state.doc);
    const trimmed = rawText.trim();

    if (rawText.length === 0) {
      const items: SuggestionItem[] = [];
      if (convention.hasConvention) {
        items.push({
          id: 'next_scene',
          label: convention.suggestedHeading,
          value: convention.suggestedHeading + ' ',
          hint: 'Next Scene',
        });
      }
      items.push(...SCENE_PREFIXES);
      return {
        isOpen: true,
        type: 'scene_prefix',
        items,
        selectedIndex: 0,
        blockPos,
      };
    }

    const upper = trimmed.toUpperCase();
    const suggestions: SuggestionItem[] = [];

    const isMatchingConvention =
      convention.hasConvention &&
      (convention.suggestedHeading.toUpperCase().startsWith(upper) ||
        convention.prefix.trim().toUpperCase().startsWith(upper) ||
        upper.startsWith(convention.prefix.trim().toUpperCase()));

    const isGenericSceneKeyword =
      !convention.hasConvention &&
      (/^SC(ENE)?$/i.test(upper) || /^SC\.$/i.test(upper) || /^ਸੀ(ਨ)?$/.test(trimmed));

    if (isMatchingConvention) {
      suggestions.push({
        id: 'next_scene',
        label: convention.suggestedHeading,
        value: convention.suggestedHeading + ' ',
        hint: 'Next Scene',
      });
    } else if (isGenericSceneKeyword) {
      const genericPrefix = /^ਸੀ/.test(trimmed) ? 'ਸੀਨ ' : 'SCENE ';
      const suggested = `${genericPrefix}1`;
      suggestions.push({
        id: 'next_scene',
        label: suggested,
        value: suggested + ' ',
        hint: 'Scene 1',
      });
    }

    for (const p of SCENE_PREFIXES) {
      if (p.label.toUpperCase().startsWith(upper) && !suggestions.some((s) => s.value === p.value)) {
        suggestions.push(p);
      }
    }

    if (suggestions.length > 0) {
      return {
        isOpen: true,
        type: 'scene_prefix',
        items: suggestions,
        selectedIndex: 0,
        blockPos,
      };
    }

    return null;
  }

  // 3. Transition Suggestions (AC-04)
  if (currentType === 'transition') {
    if (rawText.length === 0) {
      return {
        isOpen: true,
        type: 'transition',
        items: TRANSITION_SUGGESTIONS,
        selectedIndex: 0,
        blockPos,
      };
    }
  }

  return null;
}
