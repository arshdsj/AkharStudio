/**
 * character-suggestions.test.ts
 * @vitest-environment jsdom
 *
 * Verifies Character Name Suggestion Behavior:
 * 1. Suggestions appear ONLY when the user navigates to an empty character-name field.
 * 2. Do NOT show suggestions for character names that have already been written or saved.
 * 3. If the user clicks on, revisits, or edits an existing character name, suggestions should NOT appear.
 * 4. Once a character name has begun being entered, suggestions disappear immediately.
 * 5. Suggestion popup is automatically dismissed on modal open, blur, or navigation away.
 */

import { describe, it, expect } from 'vitest';
import { EditorState, TextSelection } from 'prosemirror-state';
import { screenplaySchema } from '../src/core/editor/schema';
import { getActiveSuggestions, extractCharacterNamesMRU } from '../src/core/editor/autocomplete';
import { ScreenplayBlockType } from '../src/types/screenplay';

function createTestState(
  blocks: { type: ScreenplayBlockType; text: string }[],
  caretBlockIndex: number,
  caretOffset = 0,
  selectionTo?: { blockIndex: number; offset: number }
): EditorState {
  const nodeBlocks = blocks.map((b) =>
    screenplaySchema.nodes.screenplay_block.create(
      { type: b.type, id: `block-${Math.random().toString(36).substring(2, 7)}` },
      b.text ? screenplaySchema.text(b.text) : undefined
    )
  );

  const doc = screenplaySchema.nodes.doc.create(null, nodeBlocks);

  // Compute position of caret
  let pos = 1;
  let targetFrom = 1;
  let targetTo = 1;

  for (let i = 0; i < blocks.length; i++) {
    if (i === caretBlockIndex) {
      targetFrom = pos + caretOffset;
      targetTo = targetFrom;
    }
    if (selectionTo && i === selectionTo.blockIndex) {
      targetTo = pos + selectionTo.offset;
    }
    pos += blocks[i].text.length + 2;
  }

  const selection = TextSelection.create(doc, targetFrom, targetTo);
  return EditorState.create({ doc, selection, schema: screenplaySchema });
}

describe('Character Name Suggestion Behavior Fix', () => {
  it('1. Shows suggestions when navigating to a completely empty character field', () => {
    const state = createTestState(
      [
        { type: 'character', text: 'ਕਥਾਵਾਚਕ' },
        { type: 'dialogue', text: 'ਸ਼ਹਿਰ ਦੇ ਡਰੋਨ ਸ਼ੌਟ ਤੇ ਅਸੀਂ ਕਥਾਵਾਚਕ ਨੂੰ ਕਹਿੰਦੇ ਸੁਣਦੇ ਹਾਂ' },
        { type: 'character', text: 'ਕੈਲਾ' },
        { type: 'dialogue', text: 'ਕੀ ਗੱਲ ਹੋਈ?' },
        { type: 'character', text: '' }, // empty character block
      ],
      4, // 5th block (empty)
      0
    );

    const suggestions = getActiveSuggestions(state);
    expect(suggestions).not.toBeNull();
    expect(suggestions?.type).toBe('character');
    expect(suggestions?.items.length).toBe(2);
    // Conversational ranking: previous speaker is ਕੈਲਾ, so ਕਥਾਵਾਚਕ is ranked first
    expect(suggestions?.items[0].value).toBe('ਕਥਾਵਾਚਕ');
    expect(suggestions?.items[1].value).toBe('ਕੈਲਾ');
  });

  it('2. Does NOT show suggestions for character names that have already been written or saved', () => {
    // Both English and Punjabi character names already in place
    const state = createTestState(
      [
        { type: 'character', text: 'ਕਥਾਵਾਚਕ' }, // existing saved character name
        { type: 'dialogue', text: 'ਜੋ ਕੁਝ ਵੀ ਹੁੰਦਾ ਹੈ, ਉਹ ਹੁੰਦਾ ਹੀ ਹੈ।' },
        { type: 'character', text: 'GEJA' }, // existing English character name
        { type: 'dialogue', text: 'Let us begin.' },
      ],
      0, // cursor inside block 0 ('ਕਥਾਵਾਚਕ')
      2
    );

    const suggestions = getActiveSuggestions(state);
    expect(suggestions).toBeNull();
  });

  it('3. Does NOT show suggestions when user clicks on, revisits, or edits an existing character name', () => {
    // Scenario from screenshot: user navigates to existing character cue "ਕਥਾਵਾਚਕ"
    const state = createTestState(
      [
        { type: 'character', text: 'ਕਥਾਵਾਚਕ' },
        { type: 'dialogue', text: 'ਜੋ ਕੁਝ ਵੀ ਹੁੰਦਾ ਹੈ...' },
        { type: 'character', text: 'ਕੈਲਾ' },
      ],
      0, // clicking on 'ਕਥਾਵਾਚਕ'
      0
    );

    const suggestions = getActiveSuggestions(state);
    expect(suggestions).toBeNull();

    // Revisiting 'ਕੈਲਾ'
    const stateKaila = createTestState(
      [
        { type: 'character', text: 'ਕਥਾਵਾਚਕ' },
        { type: 'dialogue', text: 'ਜੋ ਕੁਝ ਵੀ ਹੁੰਦਾ ਹੈ...' },
        { type: 'character', text: 'ਕੈਲਾ' },
      ],
      2, // clicking on 'ਕੈਲਾ'
      2
    );

    expect(getActiveSuggestions(stateKaila)).toBeNull();
  });

  it('4. Once typing begins (even a single character), suggestions disappear immediately', () => {
    // User types 'ਕ' into the character block
    const stateTypedGurmukhi = createTestState(
      [
        { type: 'character', text: 'ਕਥਾਵਾਚਕ' },
        { type: 'dialogue', text: 'ਕੁਝ ਕਹਿਣਾ ਚਾਹੁੰਦੇ ਹੋ?' },
        { type: 'character', text: 'ਕ' }, // 1 letter typed
      ],
      2,
      1
    );

    expect(getActiveSuggestions(stateTypedGurmukhi)).toBeNull();

    // User types 'G' into the character block
    const stateTypedEnglish = createTestState(
      [
        { type: 'character', text: 'GEJA' },
        { type: 'dialogue', text: 'Hello' },
        { type: 'character', text: 'G' }, // 1 letter typed
      ],
      2,
      1
    );

    expect(getActiveSuggestions(stateTypedEnglish)).toBeNull();
  });

  it('5. Suggestions reappear if user deletes all typed characters, returning to empty field', () => {
    const stateEmptyAgain = createTestState(
      [
        { type: 'character', text: 'GEJA' },
        { type: 'dialogue', text: 'Hello' },
        { type: 'character', text: '' }, // backspaced back to empty
      ],
      2,
      0
    );

    const suggestions = getActiveSuggestions(stateEmptyAgain);
    expect(suggestions).not.toBeNull();
    expect(suggestions?.items[0].value).toBe('GEJA');
  });

  it('6. Does NOT show suggestions when there is an active range selection (highlighted text)', () => {
    const state = createTestState(
      [
        { type: 'character', text: 'GEJA' },
        { type: 'dialogue', text: 'Hello' },
        { type: 'character', text: '' },
      ],
      0,
      0,
      { blockIndex: 1, offset: 5 } // Selecting from block 0 to block 1
    );

    expect(state.selection.empty).toBe(false);
    expect(getActiveSuggestions(state)).toBeNull();
  });

  it('7. Does NOT show suggestions if no characters exist in the script yet', () => {
    // First scene, first character ever in a new project
    const state = createTestState(
      [
        { type: 'scene_heading', text: 'INT. COFFEE SHOP - DAY' },
        { type: 'action', text: 'Sunlight streams through the window.' },
        { type: 'character', text: '' }, // empty, but no characters have been introduced
      ],
      2,
      0
    );

    expect(extractCharacterNamesMRU(state)).toEqual([]);
    expect(getActiveSuggestions(state)).toBeNull();
  });
});
