/**
 * phase2-editor-core.test.ts - Automated test suite for Phase 2 (Package W2)
 * Verifies: T-02, T-03, T-04, T-05, T-06, MODEL-01, MODEL-03, EDIT-01..05,
 * AC-01..04, CONT-01, CONT-02, DEC-011, DEC-030
 */

import { describe, it, expect } from 'vitest';
import { EditorState, Selection } from 'prosemirror-state';
import { history, undo, redo } from 'prosemirror-history';

import { screenplaySchema } from '../src/core/editor/schema';
import {
  handleScreenplayEnter,
  handleScreenplayTab,
  handleScreenplayBackspace,
  setBlockType,
  SCREENPLAY_ENTER_TRANSITIONS,
} from '../src/core/editor/commands';
import {
  draftToProseMirrorDoc,
  proseMirrorDocToDraft,
} from '../src/core/editor/documentAdapter';
import {
  extractCharacterNamesMRU,
  getActiveSuggestions,
  SCENE_PREFIXES,
  TRANSITION_SUGGESTIONS,
} from '../src/core/editor/autocomplete';
import {
  analyzeContdEligibleBlocks,
  normalizeCharacterName,
  hasContdSuffix,
  getCharacterDisplayText,
} from '../src/core/editor/contd';
import { ELEMENT_PICKER_OPTIONS } from '../src/renderer/components/ElementPicker';
import { ScriptDraft, ScreenplayBlockType } from '../src/types/screenplay';
import { generateId } from '../src/core/model/ProjectModel';

describe('Phase 2: Screenplay Block Editor Core (Package W2)', () => {
  // Helper to create an EditorState from an array of blocks
  function createTestState(
    blocks: { type: ScreenplayBlockType; text: string; id?: string }[],
    caretBlockIndex: number = 0,
    caretOffset: number = 0
  ): EditorState {
    const draft: ScriptDraft = {
      id: 'test_draft',
      name: 'Test Draft',
      isMain: true,
      createdAt: '',
      modifiedAt: '',
      blocks: blocks.map((b) => ({
        id: b.id || generateId(),
        type: b.type,
        text: b.text,
      })),
    };

    const doc = draftToProseMirrorDoc(draft);
    let state = EditorState.create({
      doc,
      schema: screenplaySchema,
      plugins: [history()],
    });

    // Set selection inside block
    let pos = 0;
    for (let i = 0; i < caretBlockIndex; i++) {
      pos += doc.child(i).nodeSize;
    }
    // + 1 enters the block
    const targetPos = Math.min(pos + 1 + caretOffset, doc.content.size);
    state = state.apply(state.tr.setSelection(Selection.near(state.doc.resolve(targetPos))));

    return state;
  }

  describe('T-02 & EDIT-05: Mod+1–7 Block Type Conversions', () => {
    it('converts block types correctly using setBlockType commands without text loss', () => {
      let state = createTestState([{ type: 'action', text: 'ਗੁਰਪ੍ਰੀਤ ਹਵੇਲੀ ਵੱਲ ਵੇਖਦਾ ਹੈ।' }]);

      // Mod+1 -> scene_heading
      setBlockType('scene_heading')(state, (tr) => {
        state = state.apply(tr);
      });
      expect(state.doc.child(0).attrs.type).toBe('scene_heading');
      expect(state.doc.child(0).textContent).toBe('ਗੁਰਪ੍ਰੀਤ ਹਵੇਲੀ ਵੱਲ ਵੇਖਦਾ ਹੈ।');

      // Mod+3 -> character
      setBlockType('character')(state, (tr) => {
        state = state.apply(tr);
      });
      expect(state.doc.child(0).attrs.type).toBe('character');
      expect(state.doc.child(0).textContent).toBe('ਗੁਰਪ੍ਰੀਤ ਹਵੇਲੀ ਵੱਲ ਵੇਖਦਾ ਹੈ।');

      // Mod+5 -> dialogue
      setBlockType('dialogue')(state, (tr) => {
        state = state.apply(tr);
      });
      expect(state.doc.child(0).attrs.type).toBe('dialogue');

      // Mod+6 -> shot
      setBlockType('shot')(state, (tr) => {
        state = state.apply(tr);
      });
      expect(state.doc.child(0).attrs.type).toBe('shot');

      // Mod+7 -> transition
      setBlockType('transition')(state, (tr) => {
        state = state.apply(tr);
      });
      expect(state.doc.child(0).attrs.type).toBe('transition');

      // Mod+4 -> parenthetical
      setBlockType('parenthetical')(state, (tr) => {
        state = state.apply(tr);
      });
      expect(state.doc.child(0).attrs.type).toBe('parenthetical');

      // Mod+2 -> action
      setBlockType('action')(state, (tr) => {
        state = state.apply(tr);
      });
      expect(state.doc.child(0).attrs.type).toBe('action');
    });
  });

  describe('T-03 & EDIT-02: Screenplay Enter Transitions for All 7 Types', () => {
    it('verifies exact Enter transition sequence for all 7 types', () => {
      expect(SCREENPLAY_ENTER_TRANSITIONS.scene_heading).toBe('action');
      expect(SCREENPLAY_ENTER_TRANSITIONS.action).toBe('action');
      expect(SCREENPLAY_ENTER_TRANSITIONS.character).toBe('dialogue');
      expect(SCREENPLAY_ENTER_TRANSITIONS.parenthetical).toBe('dialogue');
      expect(SCREENPLAY_ENTER_TRANSITIONS.dialogue).toBe('character');
      expect(SCREENPLAY_ENTER_TRANSITIONS.transition).toBe('scene_heading');
      expect(SCREENPLAY_ENTER_TRANSITIONS.shot).toBe('action');
    });

    it('Dialogue Enter at end creates Character block', () => {
      let state = createTestState([{ type: 'dialogue', text: 'ਸਾਗ ਬਣਾਇਆ ਕਿ ਦਾਲ' }], 0, 16);

      handleScreenplayEnter(state, (tr) => {
        state = state.apply(tr);
      });

      expect(state.doc.childCount).toBe(2);
      expect(state.doc.child(0).attrs.type).toBe('dialogue');
      expect(state.doc.child(1).attrs.type).toBe('character');
      expect(state.doc.child(1).textContent).toBe('');
    });

    it('Character Enter at end creates Dialogue block', () => {
      let state = createTestState([{ type: 'character', text: 'AMARJIT' }], 0, 7);

      handleScreenplayEnter(state, (tr) => {
        state = state.apply(tr);
      });

      expect(state.doc.childCount).toBe(2);
      expect(state.doc.child(0).attrs.type).toBe('character');
      expect(state.doc.child(1).attrs.type).toBe('dialogue');
      expect(state.doc.child(1).textContent).toBe('');
    });

    it('Scene Heading Enter at end creates Action block', () => {
      let state = createTestState([{ type: 'scene_heading', text: 'EXT. VILLAGE - DAY' }], 0, 18);

      handleScreenplayEnter(state, (tr) => {
        state = state.apply(tr);
      });

      expect(state.doc.childCount).toBe(2);
      expect(state.doc.child(0).attrs.type).toBe('scene_heading');
      expect(state.doc.child(1).attrs.type).toBe('action');
    });

    it('Transition Enter at end creates Scene Heading block', () => {
      let state = createTestState([{ type: 'transition', text: 'CUT TO:' }], 0, 7);

      handleScreenplayEnter(state, (tr) => {
        state = state.apply(tr);
      });

      expect(state.doc.childCount).toBe(2);
      expect(state.doc.child(0).attrs.type).toBe('transition');
      expect(state.doc.child(1).attrs.type).toBe('scene_heading');
    });

    it('Empty Dialogue on Enter converts to Action block', () => {
      let state = createTestState([{ type: 'dialogue', text: '' }], 0, 0);

      handleScreenplayEnter(state, (tr) => {
        state = state.apply(tr);
      });

      expect(state.doc.childCount).toBe(1);
      expect(state.doc.child(0).attrs.type).toBe('action');
    });

    it('Enter in middle of a block splits text between current and following type', () => {
      let state = createTestState([{ type: 'character', text: 'JASPREET SINGH' }], 0, 8); // caret after "JASPREET"

      handleScreenplayEnter(state, (tr) => {
        state = state.apply(tr);
      });

      expect(state.doc.childCount).toBe(2);
      expect(state.doc.child(0).attrs.type).toBe('character');
      expect(state.doc.child(0).textContent).toBe('JASPREET');
      expect(state.doc.child(1).attrs.type).toBe('dialogue');
      expect(state.doc.child(1).textContent).toBe(' SINGH');
    });
  });

  describe('EDIT-03 & EDIT-04: Tab Key Element Cycling & Picker Options', () => {
    it('verifies horizontal element picker has exactly 7 items with S, A, C, P, D, SH, T badges', () => {
      expect(ELEMENT_PICKER_OPTIONS).toHaveLength(7);
      const badges = ELEMENT_PICKER_OPTIONS.map((o) => o.badge);
      expect(badges).toEqual(['S', 'A', 'C', 'P', 'D', 'SH', 'T']);
    });

    it('Tab on empty Action cycles block to Character', () => {
      let state = createTestState([{ type: 'action', text: '' }], 0, 0);

      handleScreenplayTab(state, (tr) => {
        state = state.apply(tr);
      });

      expect(state.doc.child(0).attrs.type).toBe('character');

      // Further Tab cycles to Parenthetical
      handleScreenplayTab(state, (tr) => {
        state = state.apply(tr);
      });
      expect(state.doc.child(0).attrs.type).toBe('parenthetical');

      // Further Tab cycles to Dialogue
      handleScreenplayTab(state, (tr) => {
        state = state.apply(tr);
      });
      expect(state.doc.child(0).attrs.type).toBe('dialogue');
    });

    it('Tab on non-empty text does not change element type', () => {
      let state = createTestState([{ type: 'action', text: 'Some action here' }], 0, 4);

      const handled = handleScreenplayTab(state, (tr) => {
        state = state.apply(tr);
      });

      expect(handled).toBe(false);
      expect(state.doc.child(0).attrs.type).toBe('action');
    });
  });

  describe('EDIT-05: Backspace Boundary Behavior and Merge', () => {
    it('Backspace at start of empty block deletes it and focuses previous block', () => {
      let state = createTestState(
        [
          { type: 'character', text: 'HARPREET' },
          { type: 'dialogue', text: '' },
        ],
        1,
        0 // Caret at start of empty dialogue
      );

      handleScreenplayBackspace(state, (tr) => {
        state = state.apply(tr);
      });

      expect(state.doc.childCount).toBe(1);
      expect(state.doc.child(0).attrs.type).toBe('character');
    });

    it('Backspace at start of non-empty block merges text into previous block', () => {
      let state = createTestState(
        [
          { type: 'action', text: 'He steps outside. ' },
          { type: 'action', text: 'The rain begins.' },
        ],
        1,
        0 // Caret at start of second block
      );

      handleScreenplayBackspace(state, (tr) => {
        state = state.apply(tr);
      });

      expect(state.doc.childCount).toBe(1);
      expect(state.doc.child(0).textContent).toBe('He steps outside. The rain begins.');
    });
  });

  describe('T-04 & AC-01..04: Contextual Autocomplete Suggestions', () => {
    it('AC-02: Character cue extracts existing character names in MRU order', () => {
      const state = createTestState([
        { type: 'character', text: 'AMARJIT' },
        { type: 'dialogue', text: 'Hello.' },
        { type: 'character', text: 'HARPREET' },
        { type: 'dialogue', text: 'Hi.' },
        { type: 'character', text: 'GURPREET' },
        { type: 'dialogue', text: 'Welcome.' },
      ]);

      const mruNames = extractCharacterNamesMRU(state);
      // GURPREET was used last, then HARPREET, then AMARJIT
      expect(mruNames).toEqual(['GURPREET', 'HARPREET', 'AMARJIT']);
    });

    it('AC-02: Next character suggestion ranks previous speaker lower than conversational partner', () => {
      // JAILLA speaks, then BANTO speaks, then new empty character line
      const state = createTestState(
        [
          { type: 'character', text: 'JAILLA' },
          { type: 'dialogue', text: 'ਸਾਗ ਬਣਾਇਆ ਕਿ ਦਾਲ' },
          { type: 'character', text: 'BANTO' },
          { type: 'dialogue', text: 'ਦਾਲ ਬਣਾਈ ਆ' },
          { type: 'character', text: '' },
        ],
        4, // Caret in 5th block (empty character block)
        0
      );

      const suggestions = getActiveSuggestions(state);
      expect(suggestions).not.toBeNull();
      expect(suggestions?.type).toBe('character');
      const itemValues = suggestions?.items.map((i) => i.value);
      // JAILLA should rank #1, BANTO should rank lower
      expect(itemValues?.[0]).toBe('JAILLA');
      expect(itemValues).toContain('BANTO');
    });

    it('AC-03: Scene heading suggests INT., EXT., I/E. in order', () => {
      const state = createTestState([{ type: 'scene_heading', text: '' }], 0, 0);
      const suggestions = getActiveSuggestions(state);

      expect(suggestions).not.toBeNull();
      expect(suggestions?.type).toBe('scene_prefix');
      expect(suggestions?.items).toEqual(SCENE_PREFIXES);
    });

    it('AC-04: Transition suggests CUT TO:, FADE IN:, etc.', () => {
      const state = createTestState([{ type: 'transition', text: '' }], 0, 0);
      const suggestions = getActiveSuggestions(state);

      expect(suggestions).not.toBeNull();
      expect(suggestions?.type).toBe('transition');
      expect(suggestions?.items).toEqual(TRANSITION_SUGGESTIONS);
    });
  });

  describe('T-05, T-06, CONT-01, CONT-02: Automatic (CONT\'D) Handling', () => {
    it('normalizes character names and strips extensions', () => {
      expect(normalizeCharacterName('JASPREET (V.O.)')).toBe('JASPREET');
      expect(normalizeCharacterName('AMARJIT (CONT\'D)')).toBe('AMARJIT');
      expect(normalizeCharacterName('ਗੁਰਪ੍ਰੀਤ')).toBe('ਗੁਰਪ੍ਰੀਤ');
    });

    it('CONT-02: identifies repeated speaker in same scene as eligible for CONT\'D', () => {
      const state = createTestState([
        { type: 'scene_heading', text: 'INT. LIVING ROOM - DAY' },
        { type: 'character', text: 'JASPREET' },
        { type: 'dialogue', text: 'I am leaving now.' },
        { type: 'action', text: 'She grabs her coat and pauses at the door.' },
        { type: 'character', text: 'JASPREET' },
        { type: 'dialogue', text: 'Don\'t wait up for me.' },
      ]);

      const analyses = analyzeContdEligibleBlocks(state.doc);
      expect(analyses).toHaveLength(2);
      expect(analyses[0].characterName).toBe('JASPREET');
      expect(analyses[0].isEligible).toBe(false); // First occurrence

      expect(analyses[1].characterName).toBe('JASPREET');
      expect(analyses[1].isEligible).toBe(true); // Repeated consecutive speaker in same scene
    });

    it('CONT-02: resets eligibility when scene heading intervenes', () => {
      const state = createTestState([
        { type: 'scene_heading', text: 'INT. LIVING ROOM - DAY' },
        { type: 'character', text: 'JASPREET' },
        { type: 'dialogue', text: 'See you.' },
        { type: 'scene_heading', text: 'EXT. STREET - CONTINUOUS' },
        { type: 'character', text: 'JASPREET' },
        { type: 'dialogue', text: 'It is cold out here.' },
      ]);

      const analyses = analyzeContdEligibleBlocks(state.doc);
      expect(analyses).toHaveLength(2);
      expect(analyses[0].isEligible).toBe(false);
      expect(analyses[1].isEligible).toBe(false); // New scene resets CONT'D
    });

    it('T-05 & PAGE-02: displays (CONT\'D) non-destructively without altering source', () => {
      const rawText = 'JASPREET';
      const displayText = getCharacterDisplayText(rawText, true, 'on');
      expect(displayText).toBe('JASPREET (CONT\'D)');
      expect(rawText).toBe('JASPREET'); // Source text remains clean
    });

    it('T-06: does not add duplicate suffix if (CONT\'D) was already typed manually', () => {
      const manualText = 'JASPREET (CONT\'D)';
      expect(hasContdSuffix(manualText)).toBe(true);

      const displayText = getCharacterDisplayText(manualText, true, 'on');
      expect(displayText).toBe('JASPREET (CONT\'D)'); // Not JASPREET (CONT'D) (CONT'D)
    });
  });

  describe('MODEL-01 & MODEL-03: Transactional Document Invariants & Round-trip', () => {
    it('converts ScriptDraft to ProseMirror and back preserving block IDs and Unicode text', () => {
      const originalDraft: ScriptDraft = {
        id: 'draft_main',
        name: 'Master Draft',
        isMain: true,
        createdAt: '2026-10-29T22:00:00Z',
        modifiedAt: '2026-10-29T22:00:00Z',
        blocks: [
          { id: 'b1', type: 'scene_heading', text: 'INT. ਹਰਿਮੰਦਰ ਸਾਹਿਬ - ਸਵੇਰ' },
          { id: 'b2', type: 'character', text: 'ਬਾਬਾ ਜੀ' },
          { id: 'b3', type: 'dialogue', text: 'ਵਾਹਿਗੁਰੂ ਜੀ ਕਾ ਖ਼ਾਲਸਾ, ਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫ਼ਤਹਿ।' },
        ],
      };

      const pmDoc = draftToProseMirrorDoc(originalDraft);
      expect(pmDoc.childCount).toBe(3);

      const roundTripDraft = proseMirrorDocToDraft(pmDoc, originalDraft);
      expect(roundTripDraft.blocks).toHaveLength(3);
      expect(roundTripDraft.blocks[0].id).toBe('b1');
      expect(roundTripDraft.blocks[0].type).toBe('scene_heading');
      expect(roundTripDraft.blocks[0].text).toBe('INT. ਹਰਿਮੰਦਰ ਸਾਹਿਬ - ਸਵੇਰ');

      expect(roundTripDraft.blocks[1].id).toBe('b2');
      expect(roundTripDraft.blocks[1].type).toBe('character');

      expect(roundTripDraft.blocks[2].id).toBe('b3');
      expect(roundTripDraft.blocks[2].type).toBe('dialogue');
      expect(roundTripDraft.blocks[2].text).toBe('ਵਾਹਿਗੁਰੂ ਜੀ ਕਾ ਖ਼ਾਲਸਾ, ਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫ਼ਤਹਿ।');
    });

    it('supports ProseMirror History Undo and Redo transactions cleanly', () => {
      let state = createTestState([{ type: 'action', text: 'Original text.' }]);

      // Make an edit
      const tr = state.tr.insertText(' New additions.', state.doc.content.size - 1);
      state = state.apply(tr);
      expect(state.doc.child(0).textContent).toBe('Original text. New additions.');

      // Undo
      undo(state, (undoTr) => {
        state = state.apply(undoTr);
      });
      expect(state.doc.child(0).textContent).toBe('Original text.');

      // Redo
      redo(state, (redoTr) => {
        state = state.apply(redoTr);
      });
      expect(state.doc.child(0).textContent).toBe('Original text. New additions.');
    });
  });
});
