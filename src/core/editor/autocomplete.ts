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
 * Query active suggestions based on current block type and text content
 */
export function getActiveSuggestions(state: EditorState): SuggestionState | null {
  const { $from, empty } = state.selection;
  if ($from.depth < 1) return null;
  // If the user has a range selection (highlighted text), suggestions should not appear
  if (!empty) return null;

  const currentBlock = state.doc.child($from.index(0));
  const currentType = currentBlock.attrs.type as ScreenplayBlockType;
  const blockPos = $from.before(1);
  const rawText = currentBlock.textContent;

  // 1. Character Suggestions (AC-02)
  // Context-aware rules:
  // - Show suggestions ONLY when entering a new character name in an empty field (rawText === '')
  // - Do NOT show suggestions for character names that have already been written or saved
  // - If the user clicks on, revisits, or edits an existing character name, suggestions do not appear
  // - Once a character name has begun being entered (rawText.length > 0), suggestions disappear immediately
  if (currentType === 'character') {
    if (rawText.length > 0) {
      return null;
    }

    const existingNames = extractCharacterNamesMRU(state);
    if (existingNames.length === 0) {
      return null;
    }

    // Find the immediately preceding character in the document before current block
    let previousSpeaker: string | null = null;
    const currentBlockIndex = $from.index(0);
    for (let i = currentBlockIndex - 1; i >= 0; i--) {
      const prevBlock = state.doc.child(i);
      if (prevBlock.attrs.type === 'character') {
        const prevText = prevBlock.textContent.trim().toUpperCase();
        const cleanPrev = prevText.replace(/\s*\([^)]*\)$/, '').trim();
        if (cleanPrev) {
          previousSpeaker = cleanPrev;
          break;
        }
      }
    }

    let filtered = [...existingNames];

    // Rank other characters above the previous speaker (conversational turn-taking)
    // The previous character is still shown, but ranks lower
    if (previousSpeaker && filtered.includes(previousSpeaker) && filtered.length > 1) {
      const others = filtered.filter((n) => n !== previousSpeaker);
      filtered = [...others, previousSpeaker];
    }

    if (filtered.length > 0) {
      return {
        isOpen: true,
        type: 'character',
        items: filtered.map((name) => ({
          id: name,
          label: name,
          value: name,
        })),
        selectedIndex: 0,
        blockPos,
      };
    }

    return null;
  }

  // 2. Scene Prefix Suggestions (AC-03: INT., EXT., I/E. in order)
  if (currentType === 'scene_heading') {
    if (rawText.length === 0) {
      return {
        isOpen: true,
        type: 'scene_prefix',
        items: SCENE_PREFIXES,
        selectedIndex: 0,
        blockPos,
      };
    }
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
