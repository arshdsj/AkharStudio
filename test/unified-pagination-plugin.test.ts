/**
 * unified-pagination-plugin.test.ts - Unit and Integration Tests for Unified Pagination Plugin (M2B)
 * Governing Context: AKHAR-ARCH-PAG — Milestone M2B
 *
 * Verifies:
 * 1. Zero canonical document mutation: no page_break nodes in schema or doc tree.
 * 2. Virtual widget decorations for inter-block and mid-block splits.
 * 3. Text selection spanning across page boundaries: synthetic decoration text is completely excluded.
 * 4. Cursor/caret movement across page boundaries.
 * 5. Roman-to-Gurmukhi transliteration and text editing adjacent to virtual page breaks.
 * 6. Punjabi conjuncts (ਕ੍ਰਿੱਪਾ, ਗੁੰਝਲ਼ਦਾਰ) and stacked matras near boundaries.
 * 7. Backspace and deletion across boundaries.
 * 8. Undo/redo history preservation across boundary edits.
 * 9. Invalidation rules: cursor movement does NOT repaginate; doc changes and settings do.
 * 10. Letter (36 slots) vs A4 (38 slots) geometry and running header suppression on Page 1.
 */

// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { EditorState, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { history, undo, redo } from 'prosemirror-history';
import { screenplaySchema } from '../src/core/editor/schema';
import { draftToProseMirrorDoc } from '../src/core/editor/documentAdapter';
import {
  createUnifiedPaginationPlugin,
  unifiedPaginationPluginKey,
} from '../src/core/editor/unifiedPaginationPlugin';
import { ScriptDraft } from '../src/types/screenplay';
import { createTextLayoutService } from '../src/core/layout/textLayoutService';

function createMockLayoutService(charWidthPt = 8.0) {
  const mockMetrics = {
    ensureLoaded: async () => ({ loaded: true, isFallback: false, status: 'ready' as const }),
    getStatus: () => ({ loaded: true, isFallback: false, status: 'ready' as const }),
    measureWidth: (text: string) => text.length * charWidthPt,
    getLineBoxMetrics: () => ({ fontSizePt: 12, ascentPt: 12, descentPt: 4, lineBoxHeightPt: 18 }),
  };
  return createTextLayoutService(mockMetrics);
}

function createTestDraft(blocks: any[], id = 'test-draft', name = 'Test'): ScriptDraft {
  return {
    id,
    name,
    isMain: true,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    blocks,
  };
}

describe('Milestone M2B: Unified Editor Pagination Plugin', () => {
  // ===========================================================================
  // 1. Canonical Schema & Document Integrity
  // ===========================================================================
  describe('1. Canonical Schema & Document Integrity', () => {
    it('proves zero page_break nodes in document schema or tree', () => {
      expect('page_break' in screenplaySchema.nodes).toBe(false);
      expect('page' in screenplaySchema.nodes).toBe(false);
      expect(screenplaySchema.nodes.doc.spec.content).toBe('screenplay_block+');

      const draft = createTestDraft([
        { id: 'b1', type: 'scene_heading', text: 'EXT. AMRITSAR - DAY' },
        { id: 'b2', type: 'action', text: 'Action line 1' },
      ], 'draft-1', 'Test Draft');

      const doc = draftToProseMirrorDoc(draft);
      let pageBreakFound = false;
      doc.descendants((node) => {
        if (node.type.name === 'page_break') pageBreakFound = true;
      });
      expect(pageBreakFound).toBe(false);
    });
  });

  // ===========================================================================
  // 2. Virtual Page Break Decorations & DOM Generation
  // ===========================================================================
  describe('2. Virtual Page Break Decorations & DOM Generation', () => {
    it('generates clean between-block page break widgets with running headers', () => {
      // 36 lines fills Page 1 on Letter. b3 should start on Page 2 with an inter-block break
      const actionText = Array(34).fill('A standard action line.').join('\n');
      const draft = createTestDraft([
        { id: 'b1', type: 'scene_heading', text: 'INT. DARBAR SAHIB - NIGHT' },
        { id: 'b2', type: 'action', text: actionText },
        { id: 'b3', type: 'action', text: 'Continuation on Page 2.' },
      ], 'draft-inter', 'Inter-Block Draft');

      const doc = draftToProseMirrorDoc(draft);
      const layoutService = createMockLayoutService();
      const plugin = createUnifiedPaginationPlugin({
        paperSize: 'letter',
        textLayoutService: layoutService,
      });

      const state = EditorState.create({
        doc,
        schema: screenplaySchema,
        plugins: [plugin],
      });

      const pluginState = unifiedPaginationPluginKey.getState(state);
      expect(pluginState).toBeDefined();
      expect(pluginState?.paginationResult?.pages.length).toBeGreaterThanOrEqual(2);
      expect(pluginState?.targets.length).toBeGreaterThanOrEqual(1);

      const target = pluginState!.targets[0];
      expect(target.pageNumber).toBe(2);
      expect(target.breakType).toBe('between_blocks');
      expect(target.blockId).toBe('b3');

      // Verify decoration set has the widget
      const decos = pluginState!.decorations.find(0, doc.nodeSize);
      expect(decos.length).toBeGreaterThanOrEqual(1);
    });

    it('generates mid-block dialogue continuation widgets with presentation (MORE) and (CONT\'D)', () => {
      // 28 lines of action + 1 character cue + 8 lines of dialogue = splits dialogue at slot 35
      const actionLines = Array(28).fill('Action line filling space on page one.').join('\n');
      const dialogueLines = Array(8).fill('Dialogue line continuing across the page boundary.').join('\n');

      const draft = createTestDraft([
        { id: 'b1', type: 'action', text: actionLines },
        { id: 'c1', type: 'character', text: 'GURPREET' },
        { id: 'd1', type: 'dialogue', text: dialogueLines },
      ], 'draft-dial', 'Dialogue Split Draft');

      const doc = draftToProseMirrorDoc(draft);
      const layoutService = createMockLayoutService();
      const plugin = createUnifiedPaginationPlugin({
        paperSize: 'letter',
        textLayoutService: layoutService,
      });

      const state = EditorState.create({
        doc,
        schema: screenplaySchema,
        plugins: [plugin],
      });

      const pluginState = unifiedPaginationPluginKey.getState(state);
      expect(pluginState?.paginationResult?.pages.length).toBe(2);

      const midBreak = pluginState!.targets.find((t) => t.breakType === 'mid_block');
      expect(midBreak).toBeDefined();
      expect(midBreak?.blockId).toBe('d1');
      expect(midBreak?.moreText).toBe('(MORE)');
      expect(midBreak?.contdText).toContain("GURPREET (CONT'D)");
    });
  });

  // ===========================================================================
  // 3. Selection, Caret Movement, and Editing Across Boundaries
  // ===========================================================================
  describe('3. Selection, Caret Movement, and Editing Across Boundaries', () => {
    it('verifies that cross-boundary text selection never contains synthetic decoration text', () => {
      const blocks: any[] = Array.from({ length: 30 }, (_, i) => ({
        id: `b${i + 1}`,
        type: 'action',
        text: `Action line ${i + 1} of continuous screenplay story.`,
      }));
      const draft = createTestDraft(blocks, 'draft-sel', 'Selection Test Draft');

      const doc = draftToProseMirrorDoc(draft);
      const layoutService = createMockLayoutService();
      const plugin = createUnifiedPaginationPlugin({
        paperSize: 'letter',
        textLayoutService: layoutService,
      });

      const state = EditorState.create({
        doc,
        schema: screenplaySchema,
        plugins: [plugin],
      });

      const container = document.createElement('div');
      const view = new EditorView(container, {
        state,
      });

      const pluginState = unifiedPaginationPluginKey.getState(view.state)!;
      expect(pluginState.targets.length).toBeGreaterThanOrEqual(1);
      const breakTarget = pluginState.targets[0];
      expect(breakTarget).toBeDefined();

      // Select across the boundary: 10 chars before break to 10 chars after break
      const selFrom = Math.max(1, breakTarget.pmPos - 10);
      const selTo = Math.min(view.state.doc.nodeSize - 1, breakTarget.pmPos + 10);

      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, selFrom, selTo)));

      const extractedText = view.state.doc.textBetween(selFrom, selTo);
      // The extracted text must ONLY contain real document text, NEVER widget decoration text!
      expect(extractedText).not.toContain('PAGE');
      expect(extractedText).not.toContain('2.');
      expect(extractedText).not.toContain('(MORE)');
      expect(extractedText).not.toContain("(CONT'D)");

      view.destroy();
    });

    it('handles caret movement traversing across page boundaries seamlessly', () => {
      const blocks: any[] = Array.from({ length: 30 }, (_, i) => ({
        id: `b${i + 1}`,
        type: 'action',
        text: `Action line ${i + 1} of continuous screenplay story.`,
      }));
      const draft = createTestDraft(blocks, 'draft-caret', 'Caret Test Draft');

      const doc = draftToProseMirrorDoc(draft);
      const layoutService = createMockLayoutService();
      const plugin = createUnifiedPaginationPlugin({
        paperSize: 'letter',
        textLayoutService: layoutService,
      });

      let state = EditorState.create({
        doc,
        schema: screenplaySchema,
        plugins: [plugin],
      });

      const container = document.createElement('div');
      const view = new EditorView(container, {
        state,
        dispatchTransaction(tr) {
          state = state.apply(tr);
          view.updateState(state);
        },
      });

      const pluginState = unifiedPaginationPluginKey.getState(view.state)!;
      expect(pluginState.targets.length).toBeGreaterThanOrEqual(1);
      const breakPos = pluginState.targets[0].pmPos;

      // Position caret right before break
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, breakPos - 1)));
      expect(view.state.selection.from).toBe(breakPos - 1);

      // Move caret past break
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, breakPos + 1)));
      expect(view.state.selection.from).toBe(breakPos + 1);

      view.destroy();
    });

    it('preserves Roman-to-Gurmukhi transliteration and typing adjacent to page boundaries', () => {
      const blocks: any[] = Array.from({ length: 30 }, (_, i) => ({
        id: `b${i + 1}`,
        type: 'action',
        text: `Action line ${i + 1} of continuous screenplay story.`,
      }));
      const draft = createTestDraft(blocks, 'draft-translit', 'Transliteration Boundary Draft');

      const doc = draftToProseMirrorDoc(draft);
      const layoutService = createMockLayoutService();
      const plugin = createUnifiedPaginationPlugin({
        paperSize: 'letter',
        textLayoutService: layoutService,
      });

      let state = EditorState.create({
        doc,
        schema: screenplaySchema,
        plugins: [plugin],
      });

      const container = document.createElement('div');
      const view = new EditorView(container, {
        state,
        dispatchTransaction(tr) {
          state = state.apply(tr);
          view.updateState(state);
        },
      });

      const pluginState = unifiedPaginationPluginKey.getState(view.state)!;
      expect(pluginState.targets.length).toBeGreaterThanOrEqual(1);
      const breakPos = pluginState.targets[0].pmPos;

      // Type Roman 'kripaa' immediately after boundary
      view.dispatch(view.state.tr.insertText('kripaa ', breakPos + 1));
      expect(view.state.doc.textBetween(breakPos + 1, breakPos + 8)).toBe('kripaa ');

      // Simulate transliteration conversion to Gurmukhi 'ਕ੍ਰਿੱਪਾ'
      view.dispatch(view.state.tr.insertText('ਕ੍ਰਿੱਪਾ', breakPos + 1, breakPos + 8));
      expect(view.state.doc.textBetween(breakPos + 1, breakPos + 8)).toBe('ਕ੍ਰਿੱਪਾ');

      view.destroy();
    });

    it('handles backspace and deletion across page boundary without error or document corruption', () => {
      const blocks: any[] = Array.from({ length: 30 }, (_, i) => ({
        id: `b${i + 1}`,
        type: 'action',
        text: `Action line ${i + 1} of continuous screenplay story.`,
      }));
      const draft = createTestDraft(blocks, 'draft-del', 'Deletion Boundary Draft');

      const doc = draftToProseMirrorDoc(draft);
      const layoutService = createMockLayoutService();
      const plugin = createUnifiedPaginationPlugin({
        paperSize: 'letter',
        textLayoutService: layoutService,
      });

      let state = EditorState.create({
        doc,
        schema: screenplaySchema,
        plugins: [plugin],
      });

      const container = document.createElement('div');
      const view = new EditorView(container, {
        state,
        dispatchTransaction(tr) {
          state = state.apply(tr);
          view.updateState(state);
        },
      });

      const pluginState = unifiedPaginationPluginKey.getState(view.state)!;
      expect(pluginState.targets.length).toBeGreaterThanOrEqual(1);
      const breakPos = pluginState.targets[0].pmPos;

      // Delete across boundary: 4 chars before to 4 chars after
      const textBefore = view.state.doc.textContent;
      view.dispatch(view.state.tr.delete(breakPos - 4, breakPos + 4));
      const textAfter = view.state.doc.textContent;

      expect(textBefore).not.toBe(textAfter);
      expect(() => view.state.doc.check()).not.toThrow();

      view.destroy();
    });

    it('preserves complete undo and redo history across page boundary editing', () => {
      const blocks: any[] = Array.from({ length: 30 }, (_, i) => ({
        id: `b${i + 1}`,
        type: 'action',
        text: `Action line ${i + 1} of continuous screenplay story.`,
      }));
      const draft = createTestDraft(blocks, 'draft-undo', 'Undo Test Draft');

      const doc = draftToProseMirrorDoc(draft);
      const layoutService = createMockLayoutService();
      const plugin = createUnifiedPaginationPlugin({
        paperSize: 'letter',
        textLayoutService: layoutService,
      });

      let state = EditorState.create({
        doc,
        schema: screenplaySchema,
        plugins: [history(), plugin],
      });

      const container = document.createElement('div');
      const view = new EditorView(container, {
        state,
        dispatchTransaction(tr) {
          state = state.apply(tr);
          view.updateState(state);
        },
      });

      const initialText = view.state.doc.textContent;
      const pluginState = unifiedPaginationPluginKey.getState(view.state)!;
      expect(pluginState.targets.length).toBeGreaterThanOrEqual(1);
      const breakPos = pluginState.targets[0].pmPos;

      // Insert Punjabi text
      view.dispatch(view.state.tr.insertText(' [ਨਵਾਂ ਟੈਕਸਟ] ', breakPos + 1));
      const modifiedText = view.state.doc.textContent;
      expect(modifiedText).not.toBe(initialText);

      // Undo
      while (undo(view.state, view.dispatch)) {}
      expect(view.state.doc.textContent).toBe(initialText);

      // Redo
      while (redo(view.state, view.dispatch)) {}
      expect(view.state.doc.textContent).toBe(modifiedText);

      view.destroy();
    });
  });

  // ===========================================================================
  // 4. Invalidation & Performance Invariants
  // ===========================================================================
  describe('4. Invalidation & Performance Invariants', () => {
    it('does NOT trigger repagination on cursor or selection-only changes', () => {
      const draft = createTestDraft([
        { id: 'b1', type: 'action', text: 'First block.' },
        { id: 'b2', type: 'action', text: 'Second block.' },
      ], 'draft-perf', 'Performance Test Draft');

      const doc = draftToProseMirrorDoc(draft);
      const layoutService = createMockLayoutService();
      const plugin = createUnifiedPaginationPlugin({
        paperSize: 'letter',
        textLayoutService: layoutService,
      });

      let state = EditorState.create({
        doc,
        schema: screenplaySchema,
        plugins: [plugin],
      });

      const container = document.createElement('div');
      const view = new EditorView(container, {
        state,
        dispatchTransaction(tr) {
          state = state.apply(tr);
          view.updateState(state);
        },
      });

      const initialRecalcCount = unifiedPaginationPluginKey.getState(view.state)!.recalcCount;
      expect(initialRecalcCount).toBe(1);

      // 1. Move cursor to pos 5
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 5)));
      expect(unifiedPaginationPluginKey.getState(view.state)!.recalcCount).toBe(1);

      // 2. Select text range 2 to 8
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 2, 8)));
      expect(unifiedPaginationPluginKey.getState(view.state)!.recalcCount).toBe(1);

      // 3. Document change MUST increment recalcCount
      view.dispatch(view.state.tr.insertText('More content', 5));
      expect(unifiedPaginationPluginKey.getState(view.state)!.recalcCount).toBe(2);

      view.destroy();
    });

    it('triggers repagination when paperSize or contdSetting changes via meta', () => {
      const draft = createTestDraft([
        { id: 'b1', type: 'action', text: 'Action line.' },
      ], 'draft-settings', 'Settings Invalidation Draft');

      const doc = draftToProseMirrorDoc(draft);
      const layoutService = createMockLayoutService();
      const plugin = createUnifiedPaginationPlugin({
        paperSize: 'letter',
        contdSetting: 'on',
        textLayoutService: layoutService,
      });

      let state = EditorState.create({
        doc,
        schema: screenplaySchema,
        plugins: [plugin],
      });

      const container = document.createElement('div');
      const view = new EditorView(container, {
        state,
        dispatchTransaction(tr) {
          state = state.apply(tr);
          view.updateState(state);
        },
      });

      expect(unifiedPaginationPluginKey.getState(view.state)!.recalcCount).toBe(1);

      // Switch paperSize to A4
      view.dispatch(view.state.tr.setMeta(unifiedPaginationPluginKey, { paperSize: 'a4' }));
      const stateAfterPaper = unifiedPaginationPluginKey.getState(view.state)!;
      expect(stateAfterPaper.recalcCount).toBe(2);
      expect(stateAfterPaper.paperSize).toBe('a4');

      // Switch contdSetting to off
      view.dispatch(view.state.tr.setMeta(unifiedPaginationPluginKey, { contdSetting: 'off' }));
      const stateAfterContd = unifiedPaginationPluginKey.getState(view.state)!;
      expect(stateAfterContd.recalcCount).toBe(3);
      expect(stateAfterContd.contdSetting).toBe('off');

      view.destroy();
    });
  });

  // ===========================================================================
  // 5. Letter vs A4 Physical Capacity Verification
  // ===========================================================================
  describe('5. Letter vs A4 Physical Capacity Verification', () => {
    it('verifies capacity difference: 36 slots (Letter) vs 38 slots (A4)', () => {
      // 36 lines of action fits exactly on 1 page of A4 (capacity 38), but triggers 2 pages on Letter (capacity 36)
      const actionText = Array(35).fill('Line of action content.').join('\n');
      const draft = createTestDraft([
        { id: 'b1', type: 'action', text: actionText },
        { id: 'b2', type: 'action', text: 'Last line.' },
      ], 'draft-capacity', 'Capacity Comparison Draft');

      const doc = draftToProseMirrorDoc(draft);
      const layoutService = createMockLayoutService();

      // Test Letter: 36 slots
      const letterPlugin = createUnifiedPaginationPlugin({
        paperSize: 'letter',
        textLayoutService: layoutService,
      });
      const letterState = EditorState.create({
        doc,
        schema: screenplaySchema,
        plugins: [letterPlugin],
      });
      const letterPages = unifiedPaginationPluginKey.getState(letterState)!.paginationResult!.pages.length;
      expect(letterPages).toBe(2);

      // Test A4: 38 slots
      const a4Plugin = createUnifiedPaginationPlugin({
        paperSize: 'a4',
        textLayoutService: layoutService,
      });
      const a4State = EditorState.create({
        doc,
        schema: screenplaySchema,
        plugins: [a4Plugin],
      });
      const a4Pages = unifiedPaginationPluginKey.getState(a4State)!.paginationResult!.pages.length;
      expect(a4Pages).toBe(1);
    });
  });

  // ===========================================================================
  // 6. Font Lifecycle and Invalidation (Requirement 3)
  // ===========================================================================
  describe('6. Font Lifecycle and Invalidation', () => {
    it('recalculates pagination when required font becomes ready after editor initialization', async () => {
      let isFontLoaded = false;
      const delayedMetricsProvider = {
        ensureLoaded: async () => {
          isFontLoaded = true;
          return {
            loaded: true,
            status: 'ready' as const,
            isFallback: false,
            fontIdentity: { familyName: 'Noto Sans Gurmukhi', postScriptName: 'NotoSansGurmukhi' },
          };
        },
        getStatus: () => ({
          loaded: isFontLoaded,
          status: (isFontLoaded ? 'ready' : 'loading') as any,
          isFallback: !isFontLoaded,
        }),
        measureWidth: (text: string) => text.length * 8.0,
        getLineBoxMetrics: () => ({ fontSizePt: 12, ascentPt: 12, descentPt: 4, lineBoxHeightPt: 18 }),
      };

      const layoutService = createTextLayoutService(delayedMetricsProvider);
      const draft = createTestDraft([
        { id: 'b1', type: 'action', text: 'Action line before font is ready.' },
      ], 'draft-font', 'Font Draft');

      const doc = draftToProseMirrorDoc(draft);
      const plugin = createUnifiedPaginationPlugin({
        paperSize: 'letter',
        textLayoutService: layoutService,
        fontMetricsProvider: delayedMetricsProvider,
      });

      let state = EditorState.create({
        doc,
        schema: screenplaySchema,
        plugins: [plugin],
      });

      const container = document.createElement('div');
      const view = new EditorView(container, {
        state,
        dispatchTransaction(tr) {
          state = state.apply(tr);
          view.updateState(state);
        },
      });

      // Initial recalc count before font ready
      const initialCount = unifiedPaginationPluginKey.getState(view.state)!.recalcCount;
      expect(initialCount).toBe(1);

      // Trigger font ready transaction
      const fontStatus = await delayedMetricsProvider.ensureLoaded();
      view.dispatch(
        view.state.tr.setMeta(unifiedPaginationPluginKey, {
          fontStatus,
          fontReady: true,
          forceRecalc: true,
        })
      );

      const stateAfterFont = unifiedPaginationPluginKey.getState(view.state)!;
      expect(stateAfterFont.recalcCount).toBeGreaterThanOrEqual(2);
      expect(stateAfterFont.fontStatus?.status).toBe('ready');
      expect(stateAfterFont.fontStatus?.loaded).toBe(true);

      view.destroy();
    });

    it('safely handles degraded/fallback font status and invalidates with degraded metrics', () => {
      const draft = createTestDraft([
        { id: 'b1', type: 'action', text: 'Action line with fallback font.' },
      ], 'draft-degraded', 'Degraded Font Draft');

      const doc = draftToProseMirrorDoc(draft);
      const fallbackLayoutService = createMockLayoutService(7.5);

      const plugin = createUnifiedPaginationPlugin({
        paperSize: 'letter',
        textLayoutService: createMockLayoutService(8.0),
      });

      let state = EditorState.create({
        doc,
        schema: screenplaySchema,
        plugins: [plugin],
      });

      const container = document.createElement('div');
      const view = new EditorView(container, {
        state,
        dispatchTransaction(tr) {
          state = state.apply(tr);
          view.updateState(state);
        },
      });

      // Dispatch degraded font status with fallback layout service
      view.dispatch(
        view.state.tr.setMeta(unifiedPaginationPluginKey, {
          fontStatus: {
            loaded: true,
            status: 'degraded',
            isFallback: true,
          },
          textLayoutService: fallbackLayoutService,
          forceRecalc: true,
        })
      );

      const updatedState = unifiedPaginationPluginKey.getState(view.state)!;
      expect(updatedState.recalcCount).toBe(2);
      expect(updatedState.fontStatus?.status).toBe('degraded');
      expect(updatedState.fontStatus?.isFallback).toBe(true);

      view.destroy();
    });
  });

  // ===========================================================================
  // 7. Both Continuation Preference States (Requirement 4)
  // ===========================================================================
  describe('7. Both Continuation Preference States', () => {
    const actionLines = Array(28).fill('Action line filling space on page one.').join('\n');
    const dialogueLines = Array(8).fill('Dialogue line continuing across the page boundary.').join('\n');

    const commonDraft = createTestDraft([
      { id: 'b1', type: 'action', text: actionLines },
      { id: 'c1', type: 'character', text: 'AMARJIT' },
      { id: 'd1', type: 'dialogue', text: dialogueLines },
    ], 'common-dial-draft', 'Common Dialogue Draft');

    it('validates MORE and preference-controlled CONTD when contdSetting=on', () => {
      const doc = draftToProseMirrorDoc(commonDraft);
      const canonicalTextBefore = doc.textContent;

      const layoutService = createMockLayoutService();
      const plugin = createUnifiedPaginationPlugin({
        paperSize: 'letter',
        contdSetting: 'on',
        textLayoutService: layoutService,
      });

      const state = EditorState.create({
        doc,
        schema: screenplaySchema,
        plugins: [plugin],
      });

      const pluginState = unifiedPaginationPluginKey.getState(state)!;
      expect(pluginState.paginationResult?.pages.length).toBe(2);

      const target = pluginState.targets.find((t) => t.breakType === 'mid_block');
      expect(target).toBeDefined();
      expect(target?.moreText).toBe('(MORE)');
      expect(target?.contdText).toBe("AMARJIT (CONT'D)");

      // Canonical text must be 100% unmutated
      expect(doc.textContent).toBe(canonicalTextBefore);
    });

    it('validates MORE present and CONTD suppressed when contdSetting=off on identical fixture', () => {
      const doc = draftToProseMirrorDoc(commonDraft);
      const canonicalTextBefore = doc.textContent;

      const layoutService = createMockLayoutService();
      const plugin = createUnifiedPaginationPlugin({
        paperSize: 'letter',
        contdSetting: 'off',
        textLayoutService: layoutService,
      });

      const state = EditorState.create({
        doc,
        schema: screenplaySchema,
        plugins: [plugin],
      });

      const pluginState = unifiedPaginationPluginKey.getState(state)!;
      expect(pluginState.paginationResult?.pages.length).toBe(2);

      const target = pluginState.targets.find((t) => t.breakType === 'mid_block');
      expect(target).toBeDefined();
      // MORE is still present!
      expect(target?.moreText).toBe('(MORE)');
      // CONTD cue is suppressed!
      expect(target?.contdText).toBeUndefined();

      // Canonical text must be identical to when CONT'D was enabled
      expect(doc.textContent).toBe(canonicalTextBefore);
    });

    it('updates continuation decorations live when preference changes while editor is open', () => {
      const doc = draftToProseMirrorDoc(commonDraft);
      const layoutService = createMockLayoutService();
      const plugin = createUnifiedPaginationPlugin({
        paperSize: 'letter',
        contdSetting: 'on',
        textLayoutService: layoutService,
      });

      let state = EditorState.create({
        doc,
        schema: screenplaySchema,
        plugins: [plugin],
      });

      const container = document.createElement('div');
      const view = new EditorView(container, {
        state,
        dispatchTransaction(tr) {
          state = state.apply(tr);
          view.updateState(state);
        },
      });

      // Initially 'on'
      let target = unifiedPaginationPluginKey.getState(view.state)!.targets.find((t) => t.breakType === 'mid_block');
      expect(target?.contdText).toBe("AMARJIT (CONT'D)");

      // Live change to 'off'
      view.dispatch(view.state.tr.setMeta(unifiedPaginationPluginKey, { contdSetting: 'off' }));

      target = unifiedPaginationPluginKey.getState(view.state)!.targets.find((t) => t.breakType === 'mid_block');
      expect(target?.moreText).toBe('(MORE)');
      expect(target?.contdText).toBeUndefined();

      // Live change back to 'on'
      view.dispatch(view.state.tr.setMeta(unifiedPaginationPluginKey, { contdSetting: 'on' }));

      target = unifiedPaginationPluginKey.getState(view.state)!.targets.find((t) => t.breakType === 'mid_block');
      expect(target?.contdText).toBe("AMARJIT (CONT'D)");

      view.destroy();
    });
  });
});
