// @vitest-environment jsdom
/**
 * editor-intelligence-and-fixes.test.tsx
 * Comprehensive automated regression and feature test suite for:
 * 1. Transliteration Popup Shift + Enter (literal commit without trailing space, no candidate selected, popup closed).
 * 2. Scene Heading Transliteration Bypass (automatic transliteration disabled inside scene headings).
 * 3. Find and Replace Auto-Navigation (auto-select first match on query entry/change, match navigation, wrap-around).
 * 4. Intelligent Scene Number Suggestions (learn prefix conventions, gap detection, highest + 1, clean replacement).
 * 5. Intelligent Character Suggestions Based on Active Scene (active participants priority, dialogue turn recency ranking, fallback to global, scene reset).
 * 6. Virtual Keyboard Undo/Redo Pill Positioning (pinned properly above keyboard without double offset).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { EditorState, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';

import { screenplaySchema } from '../src/core/editor/schema';
import { draftToProseMirrorDoc } from '../src/core/editor/documentAdapter';
import { defaultTransliterator } from '../src/core/transliteration/defaultEngine';
import {
  createTransliterationPlugin,
  transliterationPluginKey,
} from '../src/core/editor/transliterationPlugin';
import {
  createSearchPlugin,
  setSearchQuery,
  findNextMatch,
  findPrevMatch,
  searchPluginKey,
} from '../src/core/editor/searchPlugin';
import {
  getActiveSuggestions,
  detectSceneHeadingConvention,
  getActiveSceneCharacterSuggestions,
} from '../src/core/editor/autocomplete';
import { TransliteratedInput } from '../src/renderer/components/TransliteratedInput';
import { UndoRedoPill } from '../src/renderer/components/UndoRedoPill';
import { ScriptDraft } from '../src/types/screenplay';

describe('Editor Intelligence, Transliteration, Search Navigation & UI Fixes', () => {
  afterEach(() => {
    cleanup();
  });

  // =========================================================================
  // 1. TRANSLITERATION POPUP: SHIFT + ENTER
  // =========================================================================
  describe('1. Transliteration Popup: Shift + Enter', () => {
    it('commits literal Roman buffer without trailing space on Shift+Enter in ProseMirror editor', () => {
      const draft: ScriptDraft = {
        id: 'd1',
        name: 'Test Draft',
        isMain: true,
        createdAt: '2026-11-23T00:00:00Z',
        modifiedAt: '2026-11-23T00:00:00Z',
        blocks: [
          { id: 'b1', type: 'action', text: '' },
        ],
      };

      const doc = draftToProseMirrorDoc(draft);
      let state = EditorState.create({
        doc,
        schema: screenplaySchema,
        plugins: [createTransliterationPlugin(defaultTransliterator, () => {}, () => 'pa')],
      });

      const container = document.createElement('div');
      document.body.appendChild(container);
      const view = new EditorView(container, {
        state,
        dispatchTransaction(tr) {
          state = state.apply(tr);
          view.updateState(state);
        },
      });

      // Place caret at position 1 (inside action block)
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 1)));

      // Type "k" then "a"
      const kEvent = new KeyboardEvent('keydown', { key: 'k', bubbles: true, cancelable: true });
      view.someProp('handleKeyDown', (f) => f(view, kEvent));

      const aEvent = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
      view.someProp('handleKeyDown', (f) => f(view, aEvent));

      let pluginState = transliterationPluginKey.getState(view.state);
      expect(pluginState?.isActive).toBe(true);
      expect(pluginState?.romanBuffer).toBe('ka');
      expect(pluginState?.candidates.length).toBeGreaterThan(0);

      // Now press Shift + Enter
      const shiftEnterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });
      const handled = view.someProp('handleKeyDown', (f) => f(view, shiftEnterEvent));
      expect(handled).toBe(true);

      // Plugin state should be reset
      pluginState = transliterationPluginKey.getState(view.state);
      expect(pluginState?.isActive).toBe(false);
      expect(pluginState?.romanBuffer).toBe('');

      // Document text should be exactly "ka" (literal text, NOT Gurmukhi "ਕਾ", and NO trailing space)
      const actionText = view.state.doc.child(0).textContent;
      expect(actionText).toBe('ka');

      view.destroy();
      container.remove();
    });

    it('commits literal Roman buffer without trailing space on Shift+Enter in TransliteratedInput', () => {
      const handleChange = vi.fn();
      render(
        <TransliteratedInput
          value=""
          onChange={handleChange}
          inputMode="pa"
          placeholder="Test input"
        />
      );

      const input = screen.getByPlaceholderText('Test input') as HTMLInputElement;

      // Type "k" and "i"
      fireEvent.keyDown(input, { key: 'k' });
      fireEvent.keyDown(input, { key: 'i' });

      // Press Shift + Enter
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });

      // Should commit "ki" without any trailing space
      expect(handleChange).toHaveBeenCalledWith('ki');
    });
  });

  // =========================================================================
  // 2. DISABLE AUTOMATIC GURMUKHI TRANSLITERATION IN SCENE HEADINGS
  // =========================================================================
  describe('2. Scene Heading Transliteration Bypass', () => {
    it('bypasses Gurmukhi transliteration in scene_heading blocks and preserves it in action blocks', () => {
      const draft: ScriptDraft = {
        id: 'd2',
        name: 'Scene Heading Test',
        isMain: true,
        createdAt: '2026-11-23T00:00:00Z',
        modifiedAt: '2026-11-23T00:00:00Z',
        blocks: [
          { id: 'b1', type: 'scene_heading', text: '' },
          { id: 'b2', type: 'action', text: '' },
        ],
      };

      const doc = draftToProseMirrorDoc(draft);
      let state = EditorState.create({
        doc,
        schema: screenplaySchema,
        plugins: [createTransliterationPlugin(defaultTransliterator, () => {}, () => 'pa')],
      });

      const container = document.createElement('div');
      document.body.appendChild(container);
      const view = new EditorView(container, {
        state,
        dispatchTransaction(tr) {
          state = state.apply(tr);
          view.updateState(state);
        },
      });

      // 1. In scene_heading block: caret at 1
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 1)));

      const sEvent = new KeyboardEvent('keydown', { key: 's', bubbles: true, cancelable: true });
      const handledInHeading = view.someProp('handleKeyDown', (f) => f(view, sEvent));

      // In scene heading, transliteration returns false so regular text handling takes over
      expect(Boolean(handledInHeading)).toBe(false);
      let pluginState = transliterationPluginKey.getState(view.state);
      expect(pluginState?.isActive).toBe(false);

      // 2. Move caret into action block (block 1)
      const actionPos = view.state.doc.child(0).nodeSize + 1; // start of second block
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, actionPos)));

      const handledInAction = view.someProp('handleKeyDown', (f) => f(view, sEvent));
      // In action block, transliteration intercepts the letter key
      expect(handledInAction).toBe(true);
      pluginState = transliterationPluginKey.getState(view.state);
      expect(pluginState?.isActive).toBe(true);
      expect(pluginState?.romanBuffer).toBe('s');

      view.destroy();
      container.remove();
    });
  });

  // =========================================================================
  // 3. FIND AND REPLACE: AUTOMATIC EDITOR NAVIGATION
  // =========================================================================
  describe('3. Find and Replace: Automatic Editor Navigation', () => {
    it('automatically activates the first match and synchronizes editor selection on query entry', () => {
      const draft: ScriptDraft = {
        id: 'd3',
        name: 'Find Navigation Test',
        isMain: true,
        createdAt: '2026-11-23T00:00:00Z',
        modifiedAt: '2026-11-23T00:00:00Z',
        blocks: [
          { id: 'b1', type: 'scene_heading', text: 'SCENE 1 - EXT. PARK - DAY' },
          { id: 'b2', type: 'action', text: 'ਪਿੰਡ ਵਿੱਚ ਬੜੀ ਸ਼ਾਂਤੀ ਹੈ। ਪਿੰਡ ਬਹੁਤ ਸੋਹਣਾ ਹੈ।' },
        ],
      };

      const doc = draftToProseMirrorDoc(draft);
      let state = EditorState.create({
        doc,
        schema: screenplaySchema,
        plugins: [createSearchPlugin()],
      });

      const container = document.createElement('div');
      document.body.appendChild(container);
      const view = new EditorView(container, {
        state,
        dispatchTransaction(tr) {
          state = state.apply(tr);
          view.updateState(state);
        },
      });

      // Execute search for "ਪਿੰਡ"
      setSearchQuery(view, 'ਪਿੰਡ');

      const searchState = searchPluginKey.getState(view.state);
      expect(searchState?.matches.length).toBe(2);
      expect(searchState?.activeIndex).toBe(0);

      // Editor selection must be synchronized with match[0]
      const sel = view.state.selection;
      expect(sel.from).toBe(searchState!.matches[0].from);
      expect(sel.to).toBe(searchState!.matches[0].to);

      // Next match navigation
      findNextMatch(view);
      const afterNext = searchPluginKey.getState(view.state);
      expect(afterNext?.activeIndex).toBe(1);
      expect(view.state.selection.from).toBe(afterNext!.matches[1].from);

      // Navigation wraps around
      findNextMatch(view);
      const afterWrap = searchPluginKey.getState(view.state);
      expect(afterWrap?.activeIndex).toBe(0);
      expect(view.state.selection.from).toBe(afterWrap!.matches[0].from);

      // Previous match navigation wraps around backwards
      findPrevMatch(view);
      const afterPrev = searchPluginKey.getState(view.state);
      expect(afterPrev?.activeIndex).toBe(1);

      view.destroy();
      container.remove();
    });
  });

  // =========================================================================
  // 4. INTELLIGENT SCENE NUMBER SUGGESTIONS
  // =========================================================================
  describe('4. Intelligent Scene Number Suggestions', () => {
    it('detects established English SCENE convention and suggests next number', () => {
      const draft: ScriptDraft = {
        id: 'd4',
        name: 'Scene Numbers Test',
        isMain: true,
        createdAt: '2026-11-23T00:00:00Z',
        modifiedAt: '2026-11-23T00:00:00Z',
        blocks: [
          { id: 'b1', type: 'scene_heading', text: 'SCENE 1' },
          { id: 'b2', type: 'scene_heading', text: 'SCENE 2' },
          { id: 'b3', type: 'scene_heading', text: 'SCENE' },
        ],
      };

      const doc = draftToProseMirrorDoc(draft);
      const convention = detectSceneHeadingConvention(doc);

      expect(convention.hasConvention).toBe(true);
      expect(convention.prefix.trim()).toBe('SCENE');
      expect(convention.nextNumber).toBe(3);
      expect(convention.suggestedHeading).toBe('SCENE 3');

      // Test autocomplete for block 3 (SCENE)
      const state = EditorState.create({
        doc,
        schema: screenplaySchema,
      });

      // Set selection in block 3:
      const block3Start = doc.child(0).nodeSize + doc.child(1).nodeSize + 1;
      const stateWithSel = state.apply(
        state.tr.setSelection(TextSelection.create(state.doc, block3Start + 5))
      );

      const suggestions = getActiveSuggestions(stateWithSel);
      expect(suggestions).not.toBeNull();
      expect(suggestions?.items[0].label).toBe('SCENE 3');
      expect(suggestions?.items[0].value).toBe('SCENE 3 ');
    });

    it('detects Gurmukhi numbering convention (ਸੀਨ 1, ਸੀਨ 2 -> ਸੀਨ 3)', () => {
      const draft: ScriptDraft = {
        id: 'd5',
        name: 'Punjabi Scene Test',
        isMain: true,
        createdAt: '2026-11-23T00:00:00Z',
        modifiedAt: '2026-11-23T00:00:00Z',
        blocks: [
          { id: 'b1', type: 'scene_heading', text: 'ਸੀਨ 1 - ਘਰ' },
          { id: 'b2', type: 'scene_heading', text: 'ਸੀਨ 2 - ਬਾਹਰ' },
          { id: 'b3', type: 'scene_heading', text: 'ਸੀਨ' },
        ],
      };

      const doc = draftToProseMirrorDoc(draft);
      const convention = detectSceneHeadingConvention(doc);

      expect(convention.hasConvention).toBe(true);
      expect(convention.prefix.trim()).toBe('ਸੀਨ');
      expect(convention.nextNumber).toBe(3);
      expect(convention.suggestedHeading).toBe('ਸੀਨ 3');

      const state = EditorState.create({
        doc,
        schema: screenplaySchema,
      });

      const block3Start = doc.child(0).nodeSize + doc.child(1).nodeSize + 1;
      const stateWithSel = state.apply(
        state.tr.setSelection(TextSelection.create(state.doc, block3Start + 3))
      );

      const suggestions = getActiveSuggestions(stateWithSel);
      expect(suggestions).not.toBeNull();
      expect(suggestions?.items[0].label).toBe('ਸੀਨ 3');
      expect(suggestions?.items[0].value).toBe('ਸੀਨ 3 ');
    });

    it('handles numbering gaps by suggesting highest existing number + 1', () => {
      const draft: ScriptDraft = {
        id: 'd6',
        name: 'Gaps Test',
        isMain: true,
        createdAt: '2026-11-23T00:00:00Z',
        modifiedAt: '2026-11-23T00:00:00Z',
        blocks: [
          { id: 'b1', type: 'scene_heading', text: 'SC. 1' },
          { id: 'b2', type: 'scene_heading', text: 'SC. 4' },
          { id: 'b3', type: 'scene_heading', text: 'SC.' },
        ],
      };

      const doc = draftToProseMirrorDoc(draft);
      const convention = detectSceneHeadingConvention(doc);

      expect(convention.hasConvention).toBe(true);
      expect(convention.nextNumber).toBe(5);
      expect(convention.suggestedHeading).toBe('SC. 5');
    });
  });

  // =========================================================================
  // 5. INTELLIGENT CHARACTER SUGGESTIONS BASED ON ACTIVE SCENE
  // =========================================================================
  describe('5. Intelligent Character Suggestions Based on Active Scene', () => {
    it('ranks dialogue partner as #1 when Character A just spoke in a 2-character scene', () => {
      const draft: ScriptDraft = {
        id: 'd7',
        name: 'Active Scene Characters',
        isMain: true,
        createdAt: '2026-11-23T00:00:00Z',
        modifiedAt: '2026-11-23T00:00:00Z',
        blocks: [
          { id: 'b0', type: 'scene_heading', text: 'SCENE 1' },
          { id: 'b1', type: 'character', text: 'NARAD' },
          { id: 'b2', type: 'dialogue', text: 'Hello.' },
          { id: 'b3', type: 'character', text: 'STRANGER' },
          { id: 'b4', type: 'dialogue', text: 'Hi.' },
          { id: 'b5', type: 'character', text: 'NARAD' },
          { id: 'b6', type: 'dialogue', text: 'How are you?' },
          { id: 'b7', type: 'character', text: '' }, // New turn: NARAD just spoke
        ],
      };

      const doc = draftToProseMirrorDoc(draft);
      const state = EditorState.create({
        doc,
        schema: screenplaySchema,
      });

      // Current block index is 7 (the empty character block)
      const suggestions = getActiveSceneCharacterSuggestions(state, 7);

      // STRANGER should be #1, NARAD should be #2
      expect(suggestions[0]).toBe('STRANGER');
      expect(suggestions[1]).toBe('NARAD');
    });

    it('ranks 3 active participants by descending turn recency with last speaker at the end', () => {
      const draft: ScriptDraft = {
        id: 'd8',
        name: 'Three Characters',
        isMain: true,
        createdAt: '2026-11-23T00:00:00Z',
        modifiedAt: '2026-11-23T00:00:00Z',
        blocks: [
          { id: 'b0', type: 'scene_heading', text: 'SCENE 1' },
          { id: 'b1', type: 'character', text: 'ALICE' },
          { id: 'b2', type: 'dialogue', text: 'A' },
          { id: 'b3', type: 'character', text: 'BOB' },
          { id: 'b4', type: 'dialogue', text: 'B' },
          { id: 'b5', type: 'character', text: 'CHARLIE' },
          { id: 'b6', type: 'dialogue', text: 'C' },
          { id: 'b7', type: 'character', text: '' }, // Turn after CHARLIE
        ],
      };

      const doc = draftToProseMirrorDoc(draft);
      const state = EditorState.create({
        doc,
        schema: screenplaySchema,
      });

      const suggestions = getActiveSceneCharacterSuggestions(state, 7);

      // Prior turn recency: BOB spoke right before CHARLIE, ALICE spoke before BOB.
      // Last speaker CHARLIE goes to the end of the active group.
      // Expected order: BOB (#1), ALICE (#2), CHARLIE (#3).
      expect(suggestions[0]).toBe('BOB');
      expect(suggestions[1]).toBe('ALICE');
      expect(suggestions[2]).toBe('CHARLIE');
    });

    it('places non-active scene characters after active scene participants', () => {
      const draft: ScriptDraft = {
        id: 'd9',
        name: 'Scene Fallback Characters',
        isMain: true,
        createdAt: '2026-11-23T00:00:00Z',
        modifiedAt: '2026-11-23T00:00:00Z',
        blocks: [
          { id: 'b0', type: 'scene_heading', text: 'SCENE 1' },
          { id: 'b1', type: 'character', text: 'OLD_KING' },
          { id: 'b2', type: 'dialogue', text: 'Farewell.' },
          { id: 'b3', type: 'scene_heading', text: 'SCENE 2' },
          { id: 'b4', type: 'character', text: 'GUARD_1' },
          { id: 'b5', type: 'dialogue', text: 'Who goes there?' },
          { id: 'b6', type: 'character', text: 'GUARD_2' },
          { id: 'b7', type: 'dialogue', text: 'Friend.' },
          { id: 'b8', type: 'character', text: '' }, // New character block in Scene 2
        ],
      };

      const doc = draftToProseMirrorDoc(draft);
      const state = EditorState.create({
        doc,
        schema: screenplaySchema,
      });

      const suggestions = getActiveSceneCharacterSuggestions(state, 8);

      // In Scene 2: GUARD_2 just spoke, GUARD_1 spoke before.
      // Active participants: GUARD_1 (#1), GUARD_2 (#2).
      // Fallback: OLD_KING (#3) from Scene 1.
      expect(suggestions[0]).toBe('GUARD_1');
      expect(suggestions[1]).toBe('GUARD_2');
      expect(suggestions[2]).toBe('OLD_KING');
    });

    it('resets active scene recency across scene boundaries', () => {
      const draft: ScriptDraft = {
        id: 'd10',
        name: 'Scene Boundary Reset',
        isMain: true,
        createdAt: '2026-11-23T00:00:00Z',
        modifiedAt: '2026-11-23T00:00:00Z',
        blocks: [
          { id: 'b0', type: 'scene_heading', text: 'SCENE 1' },
          { id: 'b1', type: 'character', text: 'ROMEO' },
          { id: 'b2', type: 'dialogue', text: 'Juliet!' },
          { id: 'b3', type: 'character', text: 'JULIET' },
          { id: 'b4', type: 'dialogue', text: 'Romeo!' },
          { id: 'b5', type: 'scene_heading', text: 'SCENE 2' },
          { id: 'b6', type: 'character', text: '' }, // Immediately after new scene heading
        ],
      };

      const doc = draftToProseMirrorDoc(draft);
      const state = EditorState.create({
        doc,
        schema: screenplaySchema,
      });

      const suggestions = getActiveSceneCharacterSuggestions(state, 6);

      // At the start of Scene 2, no one has spoken yet in Scene 2.
      // Active scene recency is reset; global characters are returned.
      expect(suggestions).toContain('ROMEO');
      expect(suggestions).toContain('JULIET');
    });
  });

  // =========================================================================
  // 6. VIRTUAL KEYBOARD UNDO/REDO BUTTON POSITIONING
  // =========================================================================
  describe('6. Virtual Keyboard Undo/Redo Button Positioning', () => {
    it('remains pinned at bottom: 22px without double offset when virtual keyboard opens', () => {
      const onUndo = vi.fn();
      const onRedo = vi.fn();

      const { container, rerender } = render(
        <UndoRedoPill
          canUndo={true}
          canRedo={false}
          onUndo={onUndo}
          onRedo={onRedo}
          isKeyboardOpen={false}
          keyboardHeight={300}
        />
      );

      const pill = container.querySelector('.undo-redo-pill') as HTMLElement;
      expect(pill).not.toBeNull();
      expect(pill.style.bottom).toBe('22px');

      // Toggling keyboard open must maintain bottom: 22px because container is already docked
      rerender(
        <UndoRedoPill
          canUndo={true}
          canRedo={false}
          onUndo={onUndo}
          onRedo={onRedo}
          isKeyboardOpen={true}
          keyboardHeight={300}
        />
      );

      expect(pill.style.bottom).toBe('22px');
    });
  });
});
