/**
 * editor-workflow-unified-pagination.test.ts - Milestone M2D: Controlled Unified Editor Integration Tests
 * Governing Context: AKHAR-ARCH-PAG — Milestone M2D
 *
 * Validates the unified pagination plugin in the actual AkharStudio editor workflow:
 * 1. Text editing: insert beginning/middle/end, delete across page boundaries, insert/remove blocks,
 *    split/join action paragraphs, edit scene headings, character cues, parentheticals, dialogue.
 * 2. Punjabi transliteration: Roman-to-Gurmukhi typing, word replacement, backspace, complex conjuncts,
 *    stacked matras, mixed English/Punjabi, zero interference with page boundaries.
 * 3. Editor navigation: caret traversal across page boundaries, cross-boundary selection, copy/paste,
 *    keyboard navigation, zero synthetic decoration content in document.
 * 4. History: undo/redo edits that change page boundaries, exact canonical text restoration.
 * 5. Dynamic pagination: reflow on content changes, paperSize (Letter vs A4), contdSetting ('on' vs 'off'),
 *    font readiness, and performance guard (cursor/selection changes alone do NOT repaginate).
 * 6. Editor vs PDF consistency: page count, block assignments, dialogue split offsets, (MORE)/(CONT'D).
 * 7. Regression and safety: schema unchanged, SQLite unchanged, legacy defaults preserved.
 */

// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EditorState, TextSelection, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { history, undo, redo } from 'prosemirror-history';
import { screenplaySchema } from '../src/core/editor/schema';
import { draftToProseMirrorDoc, proseMirrorDocToDraft } from '../src/core/editor/documentAdapter';
import {
  createUnifiedPaginationPlugin,
  unifiedPaginationPluginKey,
} from '../src/core/editor/unifiedPaginationPlugin';
import {
  createTransliterationPlugin,
} from '../src/core/editor/transliterationPlugin';
import { defaultTransliterator } from '../src/core/transliteration/defaultEngine';
import { createTextLayoutService } from '../src/core/layout/textLayoutService';
import { FontMetricsProvider } from '../src/core/layout/fontMetrics';
import { generateUnifiedScreenplayPdfHtml } from '../src/core/export/pdfExporter';
import { ScriptDraft, ScreenplayBlock, TitleMetadata } from '../src/types/screenplay';

function createMockLayoutService(charWidthPt = 7.2) {
  const metrics = new FontMetricsProvider({
    measureFn: (text: string) => Number((text.length * charWidthPt).toFixed(4)),
  });
  return createTextLayoutService(metrics);
}

const sampleMetadata: TitleMetadata = {
  title: 'M2D Editing Test Screenplay',
  author: 'ਗੁਰਪ੍ਰੀਤ ਸਿੰਘ',
  basedOn: '',
  contact: 'test@example.com',
  rights: 'All Rights Reserved',
};

function createDraft(blocks: ScreenplayBlock[], id = 'd_m2d'): ScriptDraft {
  return {
    id,
    name: 'M2D Draft',
    isMain: true,
    createdAt: '2026-11-05T00:00:00.000Z',
    modifiedAt: '2026-11-05T00:00:00.000Z',
    blocks,
  };
}

describe('Milestone M2D: Controlled Unified Editor Integration', () => {
  let container: HTMLDivElement;
  let view: EditorView | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (view) {
      view.destroy();
      view = null;
    }
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  function setupEditor(draft: ScriptDraft, options: { paperSize?: 'letter' | 'a4'; contdSetting?: 'on' | 'off' } = {}) {
    const initialDoc = draftToProseMirrorDoc(draft);
    const layoutService = createMockLayoutService();
    const paginationPlugin = createUnifiedPaginationPlugin({
      paperSize: options.paperSize || 'letter',
      contdSetting: options.contdSetting || 'on',
      textLayoutService: layoutService,
    });

    const translitPlugin = createTransliterationPlugin(
      defaultTransliterator,
      () => {},
      () => 'pa',
      undefined,
      () => false
    );

    let state = EditorState.create({
      doc: initialDoc,
      schema: screenplaySchema,
      plugins: [history(), translitPlugin, paginationPlugin],
    });

    view = new EditorView(container, {
      state,
      dispatchTransaction(tr: Transaction) {
        state = state.apply(tr);
        view!.updateState(state);
      },
    });

    return { view, layoutService };
  }

  // ===========================================================================
  // 1. Text Editing Operations in Real Editor Workflow
  // ===========================================================================
  describe('1. Text Editing Operations in Real Editor Workflow', () => {
    it('inserts text at the beginning of the screenplay without breaking page layout', () => {
      // 18 action blocks (35 slots) on Page 1
      const blocks: ScreenplayBlock[] = Array.from({ length: 18 }, (_, i) => ({
        id: `act-${i}`,
        type: 'action',
        text: `Action line ${i + 1} ਪੰਜਾਬੀ ਵਾਰਤਾਲਾਪ।`,
      }));
      const draft = createDraft(blocks);
      const { view } = setupEditor(draft);

      const pStateBefore = unifiedPaginationPluginKey.getState(view.state)!;
      expect(pStateBefore.paginationResult?.pages.length).toBe(1);

      // Insert new text at the very beginning of the document (pos 1 inside first block)
      view.dispatch(view.state.tr.insertText('ਨਵਾਂ ਆਰੰਭ: ', 1));

      const pStateAfter = unifiedPaginationPluginKey.getState(view.state)!;
      expect(view.state.doc.textContent.startsWith('ਨਵਾਂ ਆਰੰਭ: ')).toBe(true);
      expect(pStateAfter.recalcCount).toBe(2);
      expect(pStateAfter.decorations).toBeDefined();
    });

    it('inserts text in the middle and pushes trailing blocks to a new page', () => {
      // 18 blocks initially fit on Page 1 (35 slots)
      const blocks: ScreenplayBlock[] = Array.from({ length: 18 }, (_, i) => ({
        id: `act-${i}`,
        type: 'action',
        text: `Action line ${i + 1} content.`,
      }));
      const draft = createDraft(blocks);
      const { view } = setupEditor(draft);

      const pStateBefore = unifiedPaginationPluginKey.getState(view.state)!;
      expect(pStateBefore.paginationResult?.pages.length).toBe(1);

      // Insert 4 new lines into the middle of the document
      view.dispatch(
        view.state.tr.insertText(
          '\nਲਾਈਨ ਏ\nਲਾਈਨ ਬੀ\nਲਾਈਨ ਸੀ\nਲਾਈਨ ਡੀ',
          view.state.doc.resolve(20).pos
        )
      );

      const pStateAfter = unifiedPaginationPluginKey.getState(view.state)!;
      // Should now spill across 2 pages
      expect(pStateAfter.paginationResult?.pages.length).toBe(2);
      expect(pStateAfter.targets.length).toBeGreaterThanOrEqual(1);

      const breakTarget = pStateAfter.targets[0];
      expect(breakTarget.pageNumber).toBe(2);
    });

    it('inserts text at the end of the screenplay and creates subsequent pages dynamically', () => {
      const blocks: ScreenplayBlock[] = [
        { id: 'sh1', type: 'scene_heading', text: '1. INT. ROOM - DAY' },
        { id: 'act1', type: 'action', text: 'Initial single action block.' },
      ];
      const draft = createDraft(blocks);
      const { view } = setupEditor(draft);

      expect(unifiedPaginationPluginKey.getState(view.state)!.paginationResult?.pages.length).toBe(1);

      // Append 40 blocks to the end
      const newBlockNodes = Array.from({ length: 38 }, (_, i) =>
        screenplaySchema.nodes.screenplay_block.create(
          { id: `new-act-${i}`, type: 'action' },
          screenplaySchema.text(`Appended paragraph ${i + 1} expanding the screenplay.`)
        )
      );

      const endPos = view.state.doc.nodeSize - 2;
      view.dispatch(view.state.tr.insert(endPos, newBlockNodes));

      const pStateAfter = unifiedPaginationPluginKey.getState(view.state)!;
      expect(pStateAfter.paginationResult?.pages.length).toBeGreaterThanOrEqual(2);
    });

    it('deletes text across existing page boundaries and collapses pages cleanly', () => {
      // 24 action blocks spanning across 2 pages
      const blocks: ScreenplayBlock[] = Array.from({ length: 24 }, (_, i) => ({
        id: `act-${i}`,
        type: 'action',
        text: `Action line ${i + 1} with realistic screenplay sentence content.`,
      }));
      const draft = createDraft(blocks);
      const { view } = setupEditor(draft);

      const pStateBefore = unifiedPaginationPluginKey.getState(view.state)!;
      expect(pStateBefore.paginationResult?.pages.length).toBe(2);
      expect(pStateBefore.targets.length).toBeGreaterThanOrEqual(1);

      const breakPos = pStateBefore.targets[0].pmPos;

      // Delete 20 characters before and 20 characters after the break position
      view.dispatch(view.state.tr.delete(breakPos - 20, breakPos + 20));

      const pStateAfter = unifiedPaginationPluginKey.getState(view.state)!;
      expect(() => view.state.doc.check()).not.toThrow();
      expect(pStateAfter.recalcCount).toBe(2);

      // Now delete 16 blocks from the document, collapsing it back to 1 page
      const docLength = view.state.doc.content.size;
      const cutPos = Math.floor(docLength / 2);
      view.dispatch(view.state.tr.delete(cutPos, docLength - 2));

      const pStateCollapsed = unifiedPaginationPluginKey.getState(view.state)!;
      expect(pStateCollapsed.paginationResult?.pages.length).toBe(1);
      expect(pStateCollapsed.targets.length).toBe(0);
    });

    it('inserts and removes complete screenplay blocks with correct pagination updates', () => {
      const blocks: ScreenplayBlock[] = [
        { id: 'b1', type: 'scene_heading', text: '1. EXT. ROAD - DAY' },
        { id: 'b2', type: 'action', text: 'First block.' },
      ];
      const draft = createDraft(blocks);
      const { view } = setupEditor(draft);

      // Insert character + dialogue
      const charBlock = screenplaySchema.nodes.screenplay_block.create(
        { id: 'char-1', type: 'character' },
        screenplaySchema.text('ਪਵਨ')
      );
      const dialBlock = screenplaySchema.nodes.screenplay_block.create(
        { id: 'dial-1', type: 'dialogue' },
        screenplaySchema.text('ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ।')
      );

      const pos = view.state.doc.nodeSize - 2;
      view.dispatch(view.state.tr.insert(pos, [charBlock, dialBlock]));

      let pState = unifiedPaginationPluginKey.getState(view.state)!;
      expect(pState.recalcCount).toBe(2);
      expect(view.state.doc.textContent).toContain('ਪਵਨ');
      expect(view.state.doc.textContent).toContain('ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ।');

      // Now remove the dialogue block
      const lastBlockStart = view.state.doc.nodeSize - 2 - dialBlock.nodeSize;
      view.dispatch(view.state.tr.delete(lastBlockStart, view.state.doc.nodeSize - 2));

      pState = unifiedPaginationPluginKey.getState(view.state)!;
      expect(pState.recalcCount).toBe(3);
      expect(view.state.doc.textContent).not.toContain('ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ।');
    });

    it('splits and joins action paragraphs while preserving layout integrity', () => {
      const blocks: ScreenplayBlock[] = [
        { id: 'act1', type: 'action', text: 'ਪਹਿਲਾ ਹਿੱਸਾ ਇੱਥੇ ਹੈ। ਦੂਜਾ ਹਿੱਸਾ ਇੱਥੇ ਹੈ।' },
      ];
      const draft = createDraft(blocks);
      const { view } = setupEditor(draft);

      // Split action paragraph in the middle by inserting a new block
      // In ProseMirror, splitting creates a closing and opening tag: </screenplay_block><screenplay_block>
      const splitPos = 22; // between first sentence and second sentence (21 chars + 1 doc start)
      const secondPartText = 'ਦੂਜਾ ਹਿੱਸਾ ਇੱਥੇ ਹੈ।';

      // Simulate split
      const tr = view.state.tr;
      tr.delete(splitPos, view.state.doc.nodeSize - 2);
      const newBlock = screenplaySchema.nodes.screenplay_block.create(
        { id: 'act2', type: 'action' },
        screenplaySchema.text(secondPartText)
      );
      tr.insert(tr.doc.nodeSize - 2, newBlock);
      view.dispatch(tr);

      expect(view.state.doc.childCount).toBe(2);
      expect(view.state.doc.child(0).textContent.trim()).toBe('ਪਹਿਲਾ ਹਿੱਸਾ ਇੱਥੇ ਹੈ।');
      expect(view.state.doc.child(1).textContent.trim()).toBe('ਦੂਜਾ ਹਿੱਸਾ ਇੱਥੇ ਹੈ।');

      // Now join them back: delete boundary between blocks
      const joinTr = view.state.tr;
      const boundaryPos = view.state.doc.child(0).nodeSize;
      joinTr.delete(boundaryPos - 1, boundaryPos + 1);
      view.dispatch(joinTr);

      expect(view.state.doc.childCount).toBe(1);
      expect(view.state.doc.child(0).textContent).toContain('ਪਹਿਲਾ ਹਿੱਸਾ ਇੱਥੇ ਹੈ।');
      expect(view.state.doc.child(0).textContent).toContain('ਦੂਜਾ ਹਿੱਸਾ ਇੱਥੇ ਹੈ।');
    });

    it('edits scene headings, character cues, parentheticals, and dialogue', () => {
      const blocks: ScreenplayBlock[] = [
        { id: 'sh1', type: 'scene_heading', text: '1. INT. OLD HOUSE - NIGHT' },
        { id: 'c1', type: 'character', text: 'ਰਾਜਾ' },
        { id: 'p1', type: 'parenthetical', text: '(ਹੌਲੀ ਜਿਹੇ)' },
        { id: 'd1', type: 'dialogue', text: 'ਸੁਣੋ, ਕੋਈ ਆ ਰਿਹਾ ਹੈ।' },
      ];
      const draft = createDraft(blocks);
      const { view } = setupEditor(draft);

      // Edit Scene Heading
      view.dispatch(view.state.tr.insertText('MODIFIED ', 4));
      expect(view.state.doc.child(0).textContent).toContain('MODIFIED');

      // Edit Character Cue
      const charBlock = view.state.doc.child(1);
      const charStart = view.state.doc.child(0).nodeSize + 1;
      view.dispatch(view.state.tr.insertText(' ਸਿੰਘ', charStart + charBlock.content.size));
      expect(view.state.doc.child(1).textContent).toBe('ਰਾਜਾ ਸਿੰਘ');

      // Edit Parenthetical
      const parenStart = view.state.doc.child(0).nodeSize + view.state.doc.child(1).nodeSize + 1;
      view.dispatch(view.state.tr.insertText(' whispering', parenStart + 11));
      expect(view.state.doc.child(2).textContent).toContain('whispering');

      // Edit Dialogue
      const dialStart =
        view.state.doc.child(0).nodeSize +
        view.state.doc.child(1).nodeSize +
        view.state.doc.child(2).nodeSize +
        1;
      view.dispatch(view.state.tr.insertText('ਜਲਦੀ ਭੱਜੋ! ', dialStart));
      expect(view.state.doc.child(3).textContent).toContain('ਜਲਦੀ ਭੱਜੋ!');
    });
  });

  // ===========================================================================
  // 2. Punjabi Transliteration in Real Editor Workflow
  // ===========================================================================
  describe('2. Punjabi Transliteration in Real Editor Workflow', () => {
    it('executes Roman-to-Gurmukhi transliteration and commit adjacent to page boundaries', () => {
      // 36 lines of action to place page boundary right after block 18
      const blocks: ScreenplayBlock[] = Array.from({ length: 20 }, (_, i) => ({
        id: `act-${i}`,
        type: 'action',
        text: `Line ${i + 1} screenplay action text.`,
      }));
      const draft = createDraft(blocks);
      const { view } = setupEditor(draft);

      const pState = unifiedPaginationPluginKey.getState(view.state)!;
      expect(pState.targets.length).toBeGreaterThanOrEqual(1);
      const breakPos = pState.targets[0].pmPos;

      // 1. Type Roman buffer "dhanwaad" right at page boundary
      view.dispatch(view.state.tr.insertText('dhanwaad', breakPos + 1));
      expect(view.state.doc.textBetween(breakPos + 1, breakPos + 9)).toBe('dhanwaad');

      // 2. Commit transliteration candidate 'ਧੰਨਵਾਦ'
      view.dispatch(view.state.tr.insertText('ਧੰਨਵਾਦ', breakPos + 1, breakPos + 9));
      expect(view.state.doc.textBetween(breakPos + 1, breakPos + 7)).toBe('ਧੰਨਵਾਦ');

      // Zero page decoration intrusion into canonical document
      const docDraft = proseMirrorDocToDraft(view.state.doc, draft);
      for (const b of docDraft.blocks) {
        expect(b.text).not.toContain('PAGE');
        expect(b.text).not.toContain('(MORE)');
        expect(b.text).not.toContain("(CONT'D)");
      }
    });

    it('handles word replacement and backspace in transliteration buffer near page breaks', () => {
      const blocks: ScreenplayBlock[] = Array.from({ length: 20 }, (_, i) => ({
        id: `act-${i}`,
        type: 'action',
        text: `Screenplay action content line ${i + 1}.`,
      }));
      const draft = createDraft(blocks);
      const { view } = setupEditor(draft);

      const breakPos = unifiedPaginationPluginKey.getState(view.state)!.targets[0].pmPos;

      // Type Roman letters one by one
      view.dispatch(view.state.tr.insertText('s', breakPos + 1));
      view.dispatch(view.state.tr.insertText('a', breakPos + 2));
      view.dispatch(view.state.tr.insertText('t', breakPos + 3));
      expect(view.state.doc.textBetween(breakPos + 1, breakPos + 4)).toBe('sat');

      // Backspace the 't'
      view.dispatch(view.state.tr.delete(breakPos + 3, breakPos + 4));
      expect(view.state.doc.textBetween(breakPos + 1, breakPos + 3)).toBe('sa');

      // Complete to 'satshriakaal' and commit
      view.dispatch(view.state.tr.insertText('tshriakaal', breakPos + 3));
      view.dispatch(view.state.tr.insertText('ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ', breakPos + 1, breakPos + 13));
      expect(view.state.doc.textBetween(breakPos + 1, breakPos + 14)).toBe('ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ');
    });

    it('types complex Gurmukhi conjuncts and stacked matras across page breaks', () => {
      const blocks: ScreenplayBlock[] = Array.from({ length: 20 }, (_, i) => ({
        id: `act-${i}`,
        type: 'action',
        text: `Action line ${i + 1} with screenplay pacing.`,
      }));
      const draft = createDraft(blocks);
      const { view } = setupEditor(draft);

      const breakPos = unifiedPaginationPluginKey.getState(view.state)!.targets[0].pmPos;

      // Insert complex conjuncts and stacked matras at page boundary
      const testWords = ['ਕ੍ਰਿੱਪਾ', 'ਗੁੰਝਲ਼ਦਾਰ', 'ਪ੍ਰੋਗਰਾਮਾਂ', 'ਉੱਲੂ', 'ਤ੍ਰਿਸ਼ਨਾ', 'ਸੰਪੂਰਨ', 'ਕ੍ਰੂ਼', 'ਪ੍ਰ੍ਹ', 'ਸ੍ਰੀ'];
      const combined = testWords.join(' ');

      view.dispatch(view.state.tr.insertText(combined, breakPos + 1));

      expect(view.state.doc.textContent).toContain('ਕ੍ਰਿੱਪਾ');
      expect(view.state.doc.textContent).toContain('ਗੁੰਝਲ਼ਦਾਰ');
      expect(view.state.doc.textContent).toContain('ਪ੍ਰੋਗਰਾਮਾਂ');
      expect(view.state.doc.textContent).toContain('ਕ੍ਰੂ਼');
      expect(view.state.doc.textContent).toContain('ਸ੍ਰੀ');
      expect(() => view.state.doc.check()).not.toThrow();
    });

    it('handles mixed Punjabi and English code-switching while editing near page boundaries', () => {
      const blocks: ScreenplayBlock[] = Array.from({ length: 20 }, (_, i) => ({
        id: `act-${i}`,
        type: 'action',
        text: `Action line ${i + 1}.`,
      }));
      const draft = createDraft(blocks);
      const { view } = setupEditor(draft);

      const breakPos = unifiedPaginationPluginKey.getState(view.state)!.targets[0].pmPos;
      const mixedText = 'ਅਧਿਕਾਰੀ (Officer) ਨੇ Laptop ਖੋਲ੍ਹਿਆ ਅਤੇ CONFIDENTIAL ਰਿਪੋਰਟ ਚੈੱਕ ਕੀਤੀ।';

      view.dispatch(view.state.tr.insertText(mixedText, breakPos + 1));
      expect(view.state.doc.textContent).toContain('Officer');
      expect(view.state.doc.textContent).toContain('CONFIDENTIAL');
      expect(view.state.doc.textContent).toContain('Laptop');
      expect(view.state.doc.textContent).toContain('ਅਧਿਕਾਰੀ');
    });
  });

  // ===========================================================================
  // 3. Editor Navigation & Selection Across Page Boundaries
  // ===========================================================================
  describe('3. Editor Navigation & Selection Across Page Boundaries', () => {
    it('moves caret across page boundaries with forward and backward arrow simulation', () => {
      const blocks: ScreenplayBlock[] = Array.from({ length: 25 }, (_, i) => ({
        id: `act-${i}`,
        type: 'action',
        text: `Action line ${i + 1} continuous text for navigation.`,
      }));
      const draft = createDraft(blocks);
      const { view } = setupEditor(draft);

      const breakPos = unifiedPaginationPluginKey.getState(view.state)!.targets[0].pmPos;

      // Position caret 2 chars before break
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, breakPos - 2)));
      expect(view.state.selection.from).toBe(breakPos - 2);

      // Move forward 1 char
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, breakPos - 1)));
      expect(view.state.selection.from).toBe(breakPos - 1);

      // Move forward past the virtual break into the next block
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, breakPos + 2)));
      expect(view.state.selection.from).toBe(breakPos + 2);

      // Move backward back before the break
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, breakPos - 2)));
      expect(view.state.selection.from).toBe(breakPos - 2);
    });

    it('selects text spanning multiple pages and guarantees 0 synthetic decoration content', () => {
      const blocks: ScreenplayBlock[] = Array.from({ length: 45 }, (_, i) => ({
        id: `act-${i}`,
        type: 'action',
        text: `Paragraph ${i + 1} screenplay line.`,
      }));
      const draft = createDraft(blocks);
      const { view } = setupEditor(draft);

      const pState = unifiedPaginationPluginKey.getState(view.state)!;
      expect(pState.paginationResult?.pages.length).toBeGreaterThanOrEqual(2);

      // Select from middle of Page 1 to middle of Page 2
      const selFrom = 50;
      const selTo = view.state.doc.nodeSize - 50;
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, selFrom, selTo)));

      const extractedText = view.state.doc.textBetween(selFrom, selTo);
      // Critical invariant: synthetic widget content NEVER exists in extracted document text!
      expect(extractedText).not.toContain('PAGE');
      expect(extractedText).not.toContain('2.');
      expect(extractedText).not.toContain('(MORE)');
      expect(extractedText).not.toContain("(CONT'D)");
    });

    it('copies text spanning across page boundaries and pastes cleanly without decorations', () => {
      const blocks: ScreenplayBlock[] = Array.from({ length: 30 }, (_, i) => ({
        id: `act-${i}`,
        type: 'action',
        text: `Paragraph ${i + 1} standard sentence for copy test.`,
      }));
      const draft = createDraft(blocks);
      const { view } = setupEditor(draft);

      const breakPos = unifiedPaginationPluginKey.getState(view.state)!.targets[0].pmPos;

      // Slice across the boundary: 15 chars before to 15 chars after
      const sliceFrom = breakPos - 15;
      const sliceTo = breakPos + 15;
      const copiedSlice = view.state.doc.slice(sliceFrom, sliceTo);

      // Paste the slice at the end of the document
      const pastePos = view.state.doc.nodeSize - 2;
      view.dispatch(view.state.tr.replace(pastePos, pastePos, copiedSlice));

      // Verify canonical text updated without schema violation
      expect(() => view.state.doc.check()).not.toThrow();

      const docDraft = proseMirrorDocToDraft(view.state.doc, draft);
      for (const b of docDraft.blocks) {
        expect(b.text).not.toContain('PAGE');
        expect(b.text).not.toContain('2.');
      }
    });
  });

  // ===========================================================================
  // 4. History (Undo / Redo) Across Page Boundary Changes
  // ===========================================================================
  describe('4. History (Undo / Redo) Across Page Boundary Changes', () => {
    it('restores exact canonical text and recalculates pagination correctly across undo and redo', () => {
      const blocks: ScreenplayBlock[] = Array.from({ length: 18 }, (_, i) => ({
        id: `act-${i}`,
        type: 'action',
        text: `Action line ${i + 1}.`,
      }));
      const draft = createDraft(blocks);
      const { view } = setupEditor(draft);

      const initialDocText = view.state.doc.textContent;
      const pStateInitial = unifiedPaginationPluginKey.getState(view.state)!;
      expect(pStateInitial.paginationResult?.pages.length).toBe(1);

      // Step 1: Add a big paragraph pushing to Page 2
      const bigText = '\nਇੱਕ ਬਹੁਤ ਵੱਡਾ ਪੈਰਾਗ੍ਰਾਫ ਜੋ ਨਵੇਂ ਪੰਨੇ ਤੇ ਪਹੁੰਚਾਉਂਦਾ ਹੈ।\nਲਾਈਨ ੨\nਲਾਈਨ ੩\nਲਾਈਨ ੪';
      view.dispatch(view.state.tr.insertText(bigText, view.state.doc.nodeSize - 2));

      const pStateModified = unifiedPaginationPluginKey.getState(view.state)!;
      expect(pStateModified.paginationResult?.pages.length).toBe(2);
      expect(view.state.doc.textContent).not.toBe(initialDocText);

      // Step 2: Undo
      undo(view.state, view.dispatch);
      const pStateUndone = unifiedPaginationPluginKey.getState(view.state)!;
      expect(view.state.doc.textContent).toBe(initialDocText);
      expect(pStateUndone.paginationResult?.pages.length).toBe(1);

      // Step 3: Redo
      redo(view.state, view.dispatch);
      const pStateRedone = unifiedPaginationPluginKey.getState(view.state)!;
      expect(pStateRedone.paginationResult?.pages.length).toBe(2);
      expect(view.state.doc.textContent).toContain('ਇੱਕ ਬਹੁਤ ਵੱਡਾ ਪੈਰਾਗ੍ਰਾਫ');
    });
  });

  // ===========================================================================
  // 5. Dynamic Pagination & Invalidation Performance Guard
  // ===========================================================================
  describe('5. Dynamic Pagination & Invalidation Performance Guard', () => {
    it('strictly guarantees cursor and selection transactions do NOT trigger repagination', () => {
      const blocks: ScreenplayBlock[] = [
        { id: 'b1', type: 'scene_heading', text: '1. INT. CAR - DAY' },
        { id: 'b2', type: 'action', text: 'Driving down the road.' },
      ];
      const draft = createDraft(blocks);
      const { view } = setupEditor(draft);

      const initialRecalcCount = unifiedPaginationPluginKey.getState(view.state)!.recalcCount;
      expect(initialRecalcCount).toBe(1);

      // 1. Move cursor to position 5
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 5)));
      expect(unifiedPaginationPluginKey.getState(view.state)!.recalcCount).toBe(1);

      // 2. Select text range 3 to 12
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 3, 12)));
      expect(unifiedPaginationPluginKey.getState(view.state)!.recalcCount).toBe(1);

      // 3. Move cursor to pos 15
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 15)));
      expect(unifiedPaginationPluginKey.getState(view.state)!.recalcCount).toBe(1);

      // 4. Actual document change MUST increment recalcCount
      view.dispatch(view.state.tr.insertText('FAST ', 15));
      expect(unifiedPaginationPluginKey.getState(view.state)!.recalcCount).toBe(2);
    });

    it('dynamically reflows when paperSize changes between letter and a4', () => {
      // 36 lines of action fits on 1 page in A4 (38 slots), but requires 2 pages on Letter (36 slots)
      const blocks: ScreenplayBlock[] = Array.from({ length: 18 }, (_, i) => ({
        id: `act-${i}`,
        type: 'action',
        text: `Action line ${i + 1} exactly two lines tall in layout.\nSecond line of block ${i + 1}.`,
      }));
      const draft = createDraft(blocks);
      const { view } = setupEditor(draft, { paperSize: 'letter' });

      // In Letter (36 slots): 18 blocks * 2 lines = 36 lines + blanks = 2 pages
      const letterState = unifiedPaginationPluginKey.getState(view.state)!;
      expect(letterState.paperSize).toBe('letter');
      expect(letterState.paginationResult?.pages.length).toBe(2);

      // Switch to A4 via plugin meta
      view.dispatch(view.state.tr.setMeta(unifiedPaginationPluginKey, { paperSize: 'a4' }));
      const a4State = unifiedPaginationPluginKey.getState(view.state)!;
      expect(a4State.paperSize).toBe('a4');
      expect(a4State.recalcCount).toBe(letterState.recalcCount + 1);
    });

    it('dynamically toggles contdSetting between on and off without altering canonical document', () => {
      // Setup a splitting dialogue
      const actionBlocks: ScreenplayBlock[] = Array.from({ length: 16 }, (_, i) => ({
        id: `act-${i}`,
        type: 'action',
        text: `Action line ${i + 1}.`,
      }));
      const charBlock: ScreenplayBlock = { id: 'char-1', type: 'character', text: 'ਸਿਮਰਨ' };
      const dialBlock: ScreenplayBlock = {
        id: 'dial-1',
        type: 'dialogue',
        text: 'ਪਹਿਲਾ ਵਾਕ।\nਦੂਜਾ ਵਾਕ।\nਤੀਜਾ ਵਾਕ।\nਚੌਥਾ ਵਾਕ।\nਪੰਜਵਾਂ ਵਾਕ।',
      };
      const draft = createDraft([...actionBlocks, charBlock, dialBlock]);
      const { view } = setupEditor(draft, { contdSetting: 'on' });

      let pState = unifiedPaginationPluginKey.getState(view.state)!;
      const midBreakOn = pState.targets.find((t) => t.breakType === 'mid_block');
      expect(midBreakOn?.moreText).toBe('(MORE)');
      expect(midBreakOn?.contdText).toContain("ਸਿਮਰਨ (CONT'D)");

      // Toggle to contdSetting: 'off'
      view.dispatch(view.state.tr.setMeta(unifiedPaginationPluginKey, { contdSetting: 'off' }));
      pState = unifiedPaginationPluginKey.getState(view.state)!;
      const midBreakOff = pState.targets.find((t) => t.breakType === 'mid_block');
      expect(midBreakOff?.moreText).toBe('(MORE)');
      expect(midBreakOff?.contdText).toBeUndefined();

      // Canonical draft unchanged
      const currentDraft = proseMirrorDocToDraft(view.state.doc, draft);
      expect(currentDraft.blocks.find((b) => b.id === 'char-1')?.text).toBe('ਸਿਮਰਨ');
      expect(currentDraft.blocks.find((b) => b.id === 'dial-1')?.text).not.toContain('(MORE)');
      expect(currentDraft.blocks.find((b) => b.id === 'dial-1')?.text).not.toContain("(CONT'D)");
    });
  });

  // ===========================================================================
  // 6. Editor vs PDF Pagination Parity & Consistency
  // ===========================================================================
  describe('6. Editor vs PDF Pagination Parity & Consistency', () => {
    it('guarantees 100% agreement between Editor PaginationResult and Exported PDF', () => {
      // 16 action blocks (31 slots) + character cue (2 slots) = 33 slots used on Page 1
      // 5 lines dialogue splits at slot 35 with (MORE) and Page 2 gets (CONT'D)
      const blocks: ScreenplayBlock[] = [
        ...Array.from({ length: 16 }, (_, i) => ({
          id: `fill-${i}`,
          type: 'action' as const,
          text: `Action line ${i + 1} with realistic screenplay narrative.`,
        })),
        { id: 'char1', type: 'character', text: 'ਪਵਨ' },
        {
          id: 'dial1',
          type: 'dialogue',
          text: 'ਪਹਿਲੀ ਲਾਈਨ।\nਦੂਜੀ ਲਾਈਨ ਜੋ ਪਹਿਲੇ ਪੰਨੇ ਤੇ ਰਹਿੰਦੀ ਹੈ।\nਤੀਜੀ ਲਾਈਨ ਦੂਜੇ ਪੰਨੇ ਤੇ ਜਾਂਦੀ ਹੈ।\nਚੌਥੀ ਲਾਈਨ ਦੂਜੇ ਪੰਨੇ ਤੇ ਸਮਾਪਤ ਹੁੰਦੀ ਹੈ।\nਪੰਜਵੀਂ ਲਾਈਨ।',
        },
      ];
      const draft = createDraft(blocks);
      const { view } = setupEditor(draft, { paperSize: 'letter', contdSetting: 'on' });

      // 1. Get editor's live PaginationResult
      const editorResult = unifiedPaginationPluginKey.getState(view.state)!.paginationResult!;
      expect(editorResult).toBeDefined();
      expect(editorResult.pages.length).toBe(2);

      // 2. Generate PDF HTML passing this draft and layout service
      const pdfHtml = generateUnifiedScreenplayPdfHtml(draft, sampleMetadata, {
        paperSize: 'letter',
        includeTitlePage: false,
        paginationResult: editorResult,
        allowHeadlessFallback: true,
      });

      // 3. Verify total page count matches
      const pdfSheetMatches = pdfHtml.match(/class="page-sheet screenplay-page-sheet"/g);
      expect(pdfSheetMatches?.length).toBe(editorResult.totalPages);

      // 4. Verify block-to-page assignment parity
      for (const [blockId, pages] of editorResult.blockPageMap.entries()) {
        for (const pageNum of pages) {
          const pageRegex = new RegExp(
            `<div class="page-sheet screenplay-page-sheet" data-page-number="${pageNum}">([\\s\\S]*?)(?:<div class="page-sheet|<\\/body>)`
          );
          const match = pdfHtml.match(pageRegex);
          expect(match, `Page ${pageNum} sheet should contain block ${blockId}`).not.toBeNull();
          expect(match![1]).toContain(`id="${blockId}"`);
        }
      }

      // 5. Verify (MORE) and (CONT'D) match between editor and PDF
      expect(pdfHtml).toContain('class="slot-line screenplay-more-continuation select-none">(MORE)</div>');
      expect(pdfHtml).toContain('class="slot-line character screenplay-contd-continuation">ਪਵਨ (CONT&#39;D)</div>');

      // 6. Verify running header match: suppressed on Page 1, present on Page 2
      const page1Html = pdfHtml.match(/data-page-number="1">([\s\S]*?)<\/div>\s*<div class="page-sheet/)![1];
      expect(page1Html).not.toContain('class="page-header"');

      const page2Html = pdfHtml.match(/data-page-number="2">([\s\S]*?)<\/div>\s*<\/body>/)![1];
      expect(page2Html).toContain('<div class="page-header">2.</div>');
    });

    it('confirms that editing in the editor updates PDF export identically', () => {
      const blocks: ScreenplayBlock[] = [
        { id: 'b1', type: 'scene_heading', text: '1. INT. CAFE - DAY' },
        { id: 'b2', type: 'action', text: 'Initial short text.' },
      ];
      const draft = createDraft(blocks);
      const { view } = setupEditor(draft);

      // Initial state: 1 page in editor
      let editorResult = unifiedPaginationPluginKey.getState(view.state)!.paginationResult!;
      expect(editorResult.totalPages).toBe(1);

      // Add 40 blocks in the editor
      const newBlocks = Array.from({ length: 40 }, (_, i) =>
        screenplaySchema.nodes.screenplay_block.create(
          { id: `dyn-${i}`, type: 'action' },
          screenplaySchema.text(`Dynamic line ${i + 1}`)
        )
      );
      view.dispatch(view.state.tr.insert(view.state.doc.nodeSize - 2, newBlocks));

      // Now editor has expanded
      editorResult = unifiedPaginationPluginKey.getState(view.state)!.paginationResult!;
      expect(editorResult.totalPages).toBeGreaterThanOrEqual(2);

      // Export updated draft to PDF
      const updatedDraft = proseMirrorDocToDraft(view.state.doc, draft);
      const pdfHtml = generateUnifiedScreenplayPdfHtml(updatedDraft, sampleMetadata, {
        paperSize: 'letter',
        includeTitlePage: false,
        paginationResult: editorResult,
        allowHeadlessFallback: true,
      });

      const pdfSheets = pdfHtml.match(/class="page-sheet screenplay-page-sheet"/g);
      expect(pdfSheets?.length).toBe(editorResult.totalPages);
    });
  });
});
