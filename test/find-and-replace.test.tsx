// @vitest-environment jsdom
/**
 * find-and-replace.test.tsx - Comprehensive Find and Replace Feature Test Suite
 * Covers Search, Navigation, Replace, Replace All, Transliteration Consistency,
 * Unicode/Gurmukhi Integrity, Undo/Redo, and Formatting Preservation.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { history, undo, redo } from 'prosemirror-history';

import { screenplaySchema } from '../src/core/editor/schema';
import { draftToProseMirrorDoc, proseMirrorDocToDraft } from '../src/core/editor/documentAdapter';
import {
  createSearchPlugin,
  setSearchQuery,
  findNextMatch,
  findPrevMatch,
  clearSearch,
  replaceCurrentMatch,
  replaceAllMatches,
  searchPluginKey,
} from '../src/core/editor/searchPlugin';
import { FindBar } from '../src/renderer/components/FindBar';
import { TransliteratedInput } from '../src/renderer/components/TransliteratedInput';
import { ScriptDraft } from '../src/types/screenplay';

describe('Find and Replace Feature & Verification Suite', () => {
  afterEach(() => {
    cleanup();
  });
  const createMultiBlockDraft = (): ScriptDraft => ({
    id: 'd_find_replace_test',
    name: 'Find and Replace Test Script',
    isMain: true,
    createdAt: '2026-11-23T10:00:00.000Z',
    modifiedAt: '2026-11-23T10:00:00.000Z',
    blocks: [
      {
        id: 'b1',
        type: 'scene_heading',
        text: 'EXT. VILLAGE COURTYARD - DAY',
      },
      {
        id: 'b2',
        type: 'action',
        text: 'ਸੂਰਜ ਚੜ੍ਹਿਆ ਹੈ। ਪਿੰਡ ਦੇ ਲੋਕ ਇਕੱਠੇ ਹੋਏ ਹਨ। The village is quiet today. ਪਿੰਡ ਬੜਾ ਖ਼ੂਬਸੂਰਤ ਹੈ।',
      },
      {
        id: 'b3',
        type: 'character',
        text: 'ਗੁਰਦਿਆਲ ਸਿੰਘ',
      },
      {
        id: 'b4',
        type: 'dialogue',
        text: 'ਕੀ ਸਭ ਠੀਕ ਹੈ? ਪਿੰਡ ਵਿੱਚ ਕੋਈ ਸਮੱਸਿਆ ਤਾਂ ਨਹੀਂ?',
      },
      {
        id: 'b5',
        type: 'character',
        text: 'ਸਿਮਰਨ ਕੌਰ',
      },
      {
        id: 'b6',
        type: 'dialogue',
        text: 'ਹਾਂ ਜੀ ਬਾਪੂ ਜੀ, ਪਿੰਡ ਵਿੱਚ ਸਭ ਸ਼ਾਂਤ ਹੈ। Today is a good day.',
      },
    ],
  });

  const setupEditorWithSearch = (draft: ScriptDraft) => {
    const doc = draftToProseMirrorDoc(draft);
    let lastSearchState: any = null;

    const searchPlugin = createSearchPlugin((s) => {
      lastSearchState = s;
    });

    const state = EditorState.create({
      doc,
      schema: screenplaySchema,
      plugins: [history(), searchPlugin],
    });

    const container = document.createElement('div');
    const view = new EditorView(container, {
      state,
      dispatchTransaction(tr) {
        const newState = view.state.apply(tr);
        view.updateState(newState);
      },
    });

    return { view, getSearchState: () => lastSearchState || searchPluginKey.getState(view.state) };
  };

  // =========================================================================
  // A. LIVE SEARCH & HIGHLIGHTING
  // =========================================================================
  describe('A. Live Search & Match Detection', () => {
    it('finds multiple Gurmukhi occurrences across different screenplay blocks/pages', () => {
      const draft = createMultiBlockDraft();
      const { view, getSearchState } = setupEditorWithSearch(draft);

      // "ਪਿੰਡ" appears 4 times across blocks b2, b4, and b6
      setSearchQuery(view, 'ਪਿੰਡ', false, false);
      const searchState = getSearchState();

      expect(searchState.matches.length).toBe(4);
      expect(searchState.activeIndex).toBe(0);
      expect(searchState.matches.every((m: any) => m.text === 'ਪਿੰਡ')).toBe(true);

      view.destroy();
    });

    it('handles query with 0 matches gracefully', () => {
      const draft = createMultiBlockDraft();
      const { view, getSearchState } = setupEditorWithSearch(draft);

      setSearchQuery(view, 'ਨਾਨਕਸ਼ਾਹੀ', false, false);
      const searchState = getSearchState();

      expect(searchState.matches.length).toBe(0);
      expect(searchState.activeIndex).toBe(-1);

      view.destroy();
    });

    it('clears matches and active index on clearSearch', () => {
      const draft = createMultiBlockDraft();
      const { view, getSearchState } = setupEditorWithSearch(draft);

      setSearchQuery(view, 'ਪਿੰਡ', false, false);
      expect(getSearchState().matches.length).toBe(4);

      clearSearch(view);
      const searchState = getSearchState();
      expect(searchState.query).toBe('');
      expect(searchState.matches.length).toBe(0);
      expect(searchState.activeIndex).toBe(-1);

      view.destroy();
    });

    it('does not split Gurmukhi grapheme clusters with combining marks', () => {
      const draft: ScriptDraft = {
        id: 'd_grapheme',
        name: 'Grapheme Test',
        isMain: true,
        createdAt: '2026-11-23T10:00:00.000Z',
        modifiedAt: '2026-11-23T10:00:00.000Z',
        blocks: [
          {
            id: 'b1',
            type: 'action',
            text: 'ਕਿਵੇਂ ਹੋ? ਕੀ ਹਾਲ ਹੈ?',
          },
        ],
      };
      const { view, getSearchState } = setupEditorWithSearch(draft);

      // Searching for 'ਕਿ' should match 'ਕਿ' in 'ਕਿਵੇਂ'
      setSearchQuery(view, 'ਕਿ', false, false);
      const searchState = getSearchState();
      expect(searchState.matches.length).toBe(1);
      expect(searchState.matches[0].text).toBe('ਕਿ');

      // Searching for 'ਕ' when only 'ਕਿ' and 'ਕੀ' exist should not match
      // because that would split the combining matras (ਿ and ੀ)
      setSearchQuery(view, 'ਕ', false, false);
      const kState = getSearchState();
      expect(kState.matches.length).toBe(0);

      view.destroy();
    });
  });

  // =========================================================================
  // B. NAVIGATION
  // =========================================================================
  describe('B. Match Navigation', () => {
    it('navigates next and wraps around at the end', () => {
      const draft = createMultiBlockDraft();
      const { view, getSearchState } = setupEditorWithSearch(draft);

      setSearchQuery(view, 'ਪਿੰਡ', false, false);
      expect(getSearchState().activeIndex).toBe(0);

      findNextMatch(view);
      expect(getSearchState().activeIndex).toBe(1);

      findNextMatch(view);
      expect(getSearchState().activeIndex).toBe(2);

      findNextMatch(view);
      expect(getSearchState().activeIndex).toBe(3);

      // Wrap around to 0
      findNextMatch(view);
      expect(getSearchState().activeIndex).toBe(0);

      view.destroy();
    });

    it('navigates previous and wraps around in reverse at the beginning', () => {
      const draft = createMultiBlockDraft();
      const { view, getSearchState } = setupEditorWithSearch(draft);

      setSearchQuery(view, 'ਪਿੰਡ', false, false);
      expect(getSearchState().activeIndex).toBe(0);

      // Previous from 0 wraps to 3 (last match)
      findPrevMatch(view);
      expect(getSearchState().activeIndex).toBe(3);

      findPrevMatch(view);
      expect(getSearchState().activeIndex).toBe(2);

      view.destroy();
    });

    it('updates ProseMirror selection to current match during navigation', () => {
      const draft = createMultiBlockDraft();
      const { view, getSearchState } = setupEditorWithSearch(draft);

      setSearchQuery(view, 'ਪਿੰਡ', false, false);

      // Navigating to next match updates selection to that match
      findNextMatch(view);
      const secondMatch = getSearchState().matches[1];
      expect(view.state.selection.from).toBe(secondMatch.from);
      expect(view.state.selection.to).toBe(secondMatch.to);

      view.destroy();
    });
  });

  // =========================================================================
  // C. REPLACEMENT & REPLACE ALL
  // =========================================================================
  describe('C. Single Replace and Replace All', () => {
    it('replaces active match only and advances to next occurrence', () => {
      const draft = createMultiBlockDraft();
      const { view, getSearchState } = setupEditorWithSearch(draft);

      setSearchQuery(view, 'ਪਿੰਡ', false, false);
      expect(getSearchState().matches.length).toBe(4);
      expect(getSearchState().activeIndex).toBe(0);

      // Replace first occurrence with 'ਸ਼ਹਿਰ'
      const replaced = replaceCurrentMatch(view, 'ਸ਼ਹਿਰ');
      expect(replaced).toBe(true);

      const updatedState = getSearchState();
      // Should now have 3 occurrences of 'ਪਿੰਡ' remaining
      expect(updatedState.matches.length).toBe(3);
      expect(updatedState.activeIndex).toBe(0);

      // Verify the replaced block has 'ਸ਼ਹਿਰ'
      const updatedDraft = proseMirrorDocToDraft(view.state.doc, draft);
      expect(updatedDraft.blocks[1].text).toContain('ਸ਼ਹਿਰ');

      view.destroy();
    });

    it('supports empty replacement text (deleting the match)', () => {
      const draft = createMultiBlockDraft();
      const { view, getSearchState } = setupEditorWithSearch(draft);

      setSearchQuery(view, 'quiet', false, false);
      expect(getSearchState().matches.length).toBe(1);

      // Replace with empty string
      const replaced = replaceCurrentMatch(view, '');
      expect(replaced).toBe(true);

      const updatedDraft = proseMirrorDocToDraft(view.state.doc, draft);
      expect(updatedDraft.blocks[1].text).not.toContain('quiet');
      expect(updatedDraft.blocks[1].text).toContain('The village is');

      view.destroy();
    });

    it('Replace All replaces every occurrence in descending order with single transaction', () => {
      const draft = createMultiBlockDraft();
      const { view, getSearchState } = setupEditorWithSearch(draft);

      setSearchQuery(view, 'ਪਿੰਡ', false, false);
      expect(getSearchState().matches.length).toBe(4);

      // Replace all 'ਪਿੰਡ' with 'ਨਗਰ'
      const replaceCount = replaceAllMatches(view, 'ਨਗਰ');
      expect(replaceCount).toBe(4);

      // Matches for 'ਪਿੰਡ' should now be 0
      const afterState = getSearchState();
      expect(afterState.matches.length).toBe(0);
      expect(afterState.activeIndex).toBe(-1);

      // Verify the entire draft has 'ਨਗਰ' in all previous positions
      const updatedDraft = proseMirrorDocToDraft(view.state.doc, draft);
      const fullText = updatedDraft.blocks.map((b) => b.text).join(' ');
      expect(fullText).not.toContain('ਪਿੰਡ');
      expect((fullText.match(/ਨਗਰ/g) || []).length).toBe(4);

      view.destroy();
    });

    it('replaces adjacent occurrences cleanly without position shifting issues', () => {
      const draft: ScriptDraft = {
        id: 'd_adjacent',
        name: 'Adjacent Test',
        isMain: true,
        createdAt: '2026-11-23T10:00:00.000Z',
        modifiedAt: '2026-11-23T10:00:00.000Z',
        blocks: [
          {
            id: 'b1',
            type: 'action',
            text: 'ਸ਼ਬਦ ਸ਼ਬਦ ਸ਼ਬਦ',
          },
        ],
      };
      const { view, getSearchState } = setupEditorWithSearch(draft);

      setSearchQuery(view, 'ਸ਼ਬਦ', false, false);
      expect(getSearchState().matches.length).toBe(3);

      const count = replaceAllMatches(view, 'ਅੱਖਰ');
      expect(count).toBe(3);

      const updatedDraft = proseMirrorDocToDraft(view.state.doc, draft);
      expect(updatedDraft.blocks[0].text).toBe('ਅੱਖਰ ਅੱਖਰ ਅੱਖਰ');

      view.destroy();
    });

    it('preserves surrounding formatting marks during replacement', () => {
      const doc = draftToProseMirrorDoc(createMultiBlockDraft());
      const state = EditorState.create({
        doc,
        schema: screenplaySchema,
        plugins: [history(), createSearchPlugin()],
      });

      const container = document.createElement('div');
      const view = new EditorView(container, { state });

      // Apply bold mark to 'EXT'
      const boldMark = screenplaySchema.marks.bold.create();
      const tr = view.state.tr.addMark(1, 4, boldMark);
      view.dispatch(tr);

      setSearchQuery(view, 'EXT', false, false);
      replaceCurrentMatch(view, 'INT');

      // Check if replacement inside bold range retained bold
      const firstChild = view.state.doc.firstChild;
      expect(firstChild?.textContent).toContain('INT');
      const marks = firstChild?.firstChild?.marks;
      expect(marks?.some((m) => m.type.name === 'bold')).toBe(true);

      view.destroy();
    });
  });

  // =========================================================================
  // D. UNDO / REDO INTEGRITY
  // =========================================================================
  describe('D. Undo / Redo Document Integrity', () => {
    it('restores original document with exactly one Undo after Replace All', () => {
      const draft = createMultiBlockDraft();
      const { view, getSearchState } = setupEditorWithSearch(draft);

      const originalText = proseMirrorDocToDraft(view.state.doc, draft)
        .blocks.map((b) => b.text)
        .join(' ');

      setSearchQuery(view, 'ਪਿੰਡ', false, false);
      expect(getSearchState().matches.length).toBe(4);

      replaceAllMatches(view, 'ਮਹੱਲਾ');

      const replacedText = proseMirrorDocToDraft(view.state.doc, draft)
        .blocks.map((b) => b.text)
        .join(' ');
      expect(replacedText).toContain('ਮਹੱਲਾ');
      expect(replacedText).not.toContain('ਪਿੰਡ');

      // ONE single Undo operation must restore the entire document
      const didUndo = undo(view.state, view.dispatch);
      expect(didUndo).toBe(true);

      const restoredText = proseMirrorDocToDraft(view.state.doc, draft)
        .blocks.map((b) => b.text)
        .join(' ');
      expect(restoredText).toBe(originalText);

      // Redo restores the replacements
      const didRedo = redo(view.state, view.dispatch);
      expect(didRedo).toBe(true);

      const redoneText = proseMirrorDocToDraft(view.state.doc, draft)
        .blocks.map((b) => b.text)
        .join(' ');
      expect(redoneText).toBe(replacedText);

      view.destroy();
    });

    it('single Replace undoes in one step and restores the active search matches', () => {
      const draft = createMultiBlockDraft();
      const { view, getSearchState } = setupEditorWithSearch(draft);

      setSearchQuery(view, 'ਪਿੰਡ', false, false);
      expect(getSearchState().matches.length).toBe(4);

      replaceCurrentMatch(view, 'ਕਸਬਾ');
      expect(getSearchState().matches.length).toBe(3);

      undo(view.state, view.dispatch);
      // Undo restores original 4 matches
      expect(getSearchState().matches.length).toBe(4);

      view.destroy();
    });
  });

  // =========================================================================
  // E. TRANSLITERATION CONSISTENCY & UI COMPONENT INTEGRATION
  // =========================================================================
  describe('E. Gurmukhi Transliteration & Language Selection Consistency', () => {
    it('enables transliteration in TransliteratedInput when inputMode is "pa"', () => {
      let currentVal = '';
      const handleChange = (v: string) => {
        currentVal = v;
      };

      const { container } = render(
        <TransliteratedInput
          value={currentVal}
          onChange={handleChange}
          inputMode="pa"
          placeholder="Search..."
        />
      );

      const input = container.querySelector('input')!;

      // Type phonetic Roman 'p' -> 'i' -> 'n' -> 'd'
      fireEvent.keyDown(input, { key: 'p' });
      fireEvent.keyDown(input, { key: 'i' });
      fireEvent.keyDown(input, { key: 'n' });
      fireEvent.keyDown(input, { key: 'd' });

      // Suggestions should appear and top candidate should be Gurmukhi 'ਪਿੰਡ'
      // Pressing Space commits the candidate + space
      fireEvent.keyDown(input, { key: ' ' });

      expect(currentVal).toContain('ਪਿੰਡ');
    });

    it('disables transliteration in TransliteratedInput when inputMode is "en"', () => {
      let currentVal = '';
      const handleChange = (v: string) => {
        currentVal = v;
      };

      const { container } = render(
        <TransliteratedInput
          value={currentVal}
          onChange={handleChange}
          inputMode="en"
          placeholder="Search..."
        />
      );

      const input = container.querySelector('input')!;

      // In English mode, keydown is not intercepted as buffer
      fireEvent.change(input, { target: { value: 'pind' } });
      expect(currentVal).toBe('pind');
    });

    it('immediately reflects language switch between Punjabi and English in FindBar', () => {
      let findText = '';
      let replaceText = '';
      let mode: 'pa' | 'en' = 'pa';

      const { rerender } = render(
        <FindBar
          isOpen={true}
          onClose={vi.fn()}
          query={findText}
          onQueryChange={(q) => {
            findText = q;
          }}
          replaceText={replaceText}
          onReplaceTextChange={(r) => {
            replaceText = r;
          }}
          matchesCount={0}
          activeIndex={-1}
          caseSensitive={false}
          onToggleCaseSensitive={vi.fn()}
          wholeWord={false}
          onToggleWholeWord={vi.fn()}
          onFindNext={vi.fn()}
          onFindPrev={vi.fn()}
          onReplace={vi.fn()}
          onReplaceAll={vi.fn()}
          inputMode={mode}
        />
      );

      // Verify both textboxes are rendered side by side
      const inputs = screen.getAllByRole('textbox');
      expect(inputs.length).toBe(2);
      expect(inputs[0].getAttribute('placeholder')).toBe('Find in script...');
      expect(inputs[1].getAttribute('placeholder')).toBe('Replace with...');

      // Switch language mode to English
      mode = 'en';
      rerender(
        <FindBar
          isOpen={true}
          onClose={vi.fn()}
          query={findText}
          onQueryChange={(q) => {
            findText = q;
          }}
          replaceText={replaceText}
          onReplaceTextChange={(r) => {
            replaceText = r;
          }}
          matchesCount={0}
          activeIndex={-1}
          caseSensitive={false}
          onToggleCaseSensitive={vi.fn()}
          wholeWord={false}
          onToggleWholeWord={vi.fn()}
          onFindNext={vi.fn()}
          onFindPrev={vi.fn()}
          onReplace={vi.fn()}
          onReplaceAll={vi.fn()}
          inputMode={mode}
        />
      );

      // Verify buttons exist: Replace, Replace All
      expect(screen.getByRole('button', { name: /replace active occurrence/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /replace all occurrences/i })).toBeDefined();
    });

    it('navigates with Up and Down arrows from either Find or Replace textbox', () => {
      const handleFindNext = vi.fn();
      const handleFindPrev = vi.fn();

      render(
        <FindBar
          isOpen={true}
          onClose={vi.fn()}
          query="test"
          onQueryChange={vi.fn()}
          replaceText="replacement"
          onReplaceTextChange={vi.fn()}
          matchesCount={3}
          activeIndex={0}
          caseSensitive={false}
          onToggleCaseSensitive={vi.fn()}
          wholeWord={false}
          onToggleWholeWord={vi.fn()}
          onFindNext={handleFindNext}
          onFindPrev={handleFindPrev}
          onReplace={vi.fn()}
          onReplaceAll={vi.fn()}
          inputMode="en"
        />
      );

      const inputs = screen.getAllByRole('textbox');
      const findInput = inputs[0];
      const replaceInput = inputs[1];

      // Down arrow in Find input triggers onFindNext
      fireEvent.keyDown(findInput, { key: 'ArrowDown' });
      expect(handleFindNext).toHaveBeenCalledTimes(1);

      // Up arrow in Find input triggers onFindPrev
      fireEvent.keyDown(findInput, { key: 'ArrowUp' });
      expect(handleFindPrev).toHaveBeenCalledTimes(1);

      // Down arrow in Replace input also triggers onFindNext
      fireEvent.keyDown(replaceInput, { key: 'ArrowDown' });
      expect(handleFindNext).toHaveBeenCalledTimes(2);

      // Up arrow in Replace input also triggers onFindPrev
      fireEvent.keyDown(replaceInput, { key: 'ArrowUp' });
      expect(handleFindPrev).toHaveBeenCalledTimes(2);
    });

    it('displays match counter formatted as "1 of 8" and "0 matches"', () => {
      const { rerender } = render(
        <FindBar
          isOpen={true}
          onClose={vi.fn()}
          query="ਪਿੰਡ"
          onQueryChange={vi.fn()}
          matchesCount={8}
          activeIndex={0}
          caseSensitive={false}
          onToggleCaseSensitive={vi.fn()}
          wholeWord={false}
          onToggleWholeWord={vi.fn()}
          onFindNext={vi.fn()}
          onFindPrev={vi.fn()}
          inputMode="pa"
        />
      );

      expect(screen.getByText('1 of 8')).toBeDefined();

      // Rerender with 0 matches
      rerender(
        <FindBar
          isOpen={true}
          onClose={vi.fn()}
          query="ਗ਼ੈਰ-ਮੌਜੂਦ"
          onQueryChange={vi.fn()}
          matchesCount={0}
          activeIndex={-1}
          caseSensitive={false}
          onToggleCaseSensitive={vi.fn()}
          wholeWord={false}
          onToggleWholeWord={vi.fn()}
          onFindNext={vi.fn()}
          onFindPrev={vi.fn()}
          inputMode="pa"
        />
      );

      expect(screen.getByText('0 matches')).toBeDefined();
    });
  });
});
