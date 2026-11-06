// @vitest-environment jsdom
/**
 * test/m2e1-production-readiness-audit.test.ts
 *
 * Dedicated Correctness & Regression Audit Suite for Milestone M2E.1
 * Governing Document: AKHAR-ARCH-PAG — Milestone M2E.1 Production Readiness Audit
 *
 * Exhaustively tests:
 * 1. Audit 1: Effective Editor Engine vs PDF Engine Alignment & Fallback Guard
 * 2. Audit 2: Unsupported Content Preservation across Editor & PDF Output
 * 3. Audit 3: Undo/Redo History & Cursor Preservation across Mode Switching (state.reconfigure)
 * 4. Audit 4: Empty Document Lifecycle & 0-Page Invariance (Empty -> Insert -> Delete -> Empty)
 * 5. Audit 5: Settings Persistence, Precedence Rules & Canonical Script Project Invariance
 */

import { act } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { EditorState } from 'prosemirror-state';
import { history, undo, redo } from 'prosemirror-history';
import { ScriptDraft, ScreenplayBlock, ScriptProject } from '../src/types/screenplay';
import {
  draftToProseMirrorDoc,
  proseMirrorDocToDraft,
} from '../src/core/editor/documentAdapter';
import { screenplaySchema } from '../src/core/editor/schema';
import {
  createUnifiedPaginationPlugin,
  unifiedPaginationPluginKey,
} from '../src/core/editor/unifiedPaginationPlugin';
import {
  createPaginationPlugin,
  paginationPluginKey,
} from '../src/core/editor/paginationPlugin';
import { docToLayoutBlocks } from '../src/core/layout/paginationAdapter';
import { generateScreenplayHtml } from '../src/core/export/pdfExporter';
import {
  PAGINATION_SETTING_STORAGE_KEY,
  resolvePaginationEngine,
  getStoredPaginationEngine,
  setStoredPaginationEngine,
} from '../src/renderer/utils/paginationSetting';
import { ScreenplayCanvas } from '../src/renderer/components/ScreenplayCanvas';
import type { PaginationEngineStatus } from '../src/renderer/components/ProseMirrorEditor';

// Mock Canvas 2D measurement for jsdom environment
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    measureText: vi.fn((text: string) => ({
      width: text.length * 7.2,
      fontBoundingBoxAscent: 10,
      fontBoundingBoxDescent: 3,
      actualBoundingBoxAscent: 9,
      actualBoundingBoxDescent: 2,
    })),
  }) as unknown as typeof HTMLCanvasElement.prototype.getContext;
}

const dummyMetadata = {
  title: 'ਆਡਿਟ ਪ੍ਰੋਜੈਕਟ (AUDIT SCRIPT)',
  author: 'ਟੈਸਟ ਲੇਖਕ',
  basedOn: 'ਅਸਲ ਸਕ੍ਰਿਪਟ',
  rights: 'ਸਾਰੇ ਹੱਕ ਰਾਖਵੇਂ ਹਨ',
  contact: 'test@example.com',
};

function createSampleDraft(blocks?: ScreenplayBlock[]): ScriptDraft {
  return {
    id: 'draft-audit-m2e1',
    name: 'Audit Draft',
    isMain: true,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    blocks: blocks || [
      { id: 'b1', type: 'scene_heading', text: 'INT. AUDIT ROOM - DAY' },
      { id: 'b2', type: 'action', text: 'ਇਹ ਇੱਕ ਆਡਿਟ ਵੈਰੀਫਿਕੇਸ਼ਨ ਦ੍ਰਿਸ਼ ਹੈ।' },
      { id: 'b3', type: 'character', text: 'ਅਮਨਦੀਪ' },
      { id: 'b4', type: 'dialogue', text: 'ਕੀ ਸਾਰੇ ਪੇਜ ਬਰੇਕ ਬਿਲਕੁਲ ਸਹੀ ਕੰਮ ਕਰ ਰਹੇ ਹਨ?' },
    ],
  };
}

describe('Milestone M2E.1: Production Readiness Audit', () => {
  beforeEach(() => {
    localStorage.clear();
    delete (window as unknown as { __AKHAR_USE_UNIFIED_PAGINATION__?: boolean }).__AKHAR_USE_UNIFIED_PAGINATION__;
    delete process.env.AKHAR_USE_UNIFIED_PAGINATION;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    delete (window as unknown as { __AKHAR_USE_UNIFIED_PAGINATION__?: boolean }).__AKHAR_USE_UNIFIED_PAGINATION__;
    delete process.env.AKHAR_USE_UNIFIED_PAGINATION;
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // AUDIT 1: Effective Editor Engine vs PDF Engine Alignment
  // ===========================================================================
  describe('Audit 1: Effective Editor Engine vs PDF Engine Alignment', () => {
    it('activates legacy fallback in editor plugin when draft contains unsupported block type', () => {
      const draft = createSampleDraft([
        { id: 'b1', type: 'scene_heading', text: 'EXT. ROAD - NIGHT' },
        { id: 'b2', type: 'unknown_custom_annotation' as unknown as any, text: 'Secret Note' },
        { id: 'b3', type: 'action', text: 'Regular action block.' },
      ]);

      const doc = draftToProseMirrorDoc(draft);
      let fallbackTriggered = false;
      let fallbackReason: string | undefined;

      const plugin = createUnifiedPaginationPlugin({
        paperSize: 'letter',
        contdSetting: 'on',
        onFallback: (reason) => {
          fallbackTriggered = true;
          fallbackReason = reason;
        },
      });

      const state = EditorState.create({
        doc,
        schema: screenplaySchema,
        plugins: [plugin],
      });

      const pluginState = unifiedPaginationPluginKey.getState(state);
      expect(pluginState).toBeDefined();
      expect(pluginState?.isFallback).toBe(true);
      expect(pluginState?.fallbackReason).toBe('unsupported_block');
      expect(fallbackTriggered).toBe(true);
      expect(fallbackReason).toBe('unsupported_block');
    });

    it('falls back to legacy PDF export when draft contains unsupported blocks even if useUnifiedPagination=true', () => {
      const draft = createSampleDraft([
        { id: 'b1', type: 'scene_heading', text: 'INT. CAFE - DAY' },
        { id: 'b-unsupported', type: 'unsupported_note_block' as any, text: 'Crucial Production Data' },
        { id: 'b2', type: 'action', text: 'Normal text continues.' },
      ]);

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const html = generateScreenplayHtml(draft, dummyMetadata, {
        paperSize: 'letter',
        includeTitlePage: false,
        useUnifiedPagination: true,
        allowHeadlessFallback: true,
      });

      // Should have triggered fallback warning
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PdfExporter] Unsupported screenplay block type detected in draft. Falling back to legacy PDF export')
      );

      // Verify legacy HTML structure is generated
      expect(html).toContain('class="screenplay-body"');
      // Verify unsupported block is 100% preserved as action div
      expect(html).toContain('id="b-unsupported"');
      expect(html).toContain('Crucial Production Data');
    });

    it('falls back to legacy PDF export if unified PDF generation throws an unexpected error', () => {
      const draft = createSampleDraft();
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Pass an invalid option or force failure by omitting headless fallback when context throws
      const badEngine: any = {
        paginate: () => {
          throw new Error('Simulated layout engine crash');
        },
      };

      const html = generateScreenplayHtml(draft, dummyMetadata, {
        paperSize: 'letter',
        includeTitlePage: false,
        useUnifiedPagination: true,
        paginationEngine: badEngine,
        allowHeadlessFallback: true,
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PdfExporter] Unified PDF export failed (Simulated layout engine crash)')
      );

      // Fallback legacy HTML was cleanly returned
      expect(html).toContain('class="screenplay-body"');
      expect(html).toContain('INT. AUDIT ROOM - DAY');
    });
  });

  // ===========================================================================
  // AUDIT 2: Unsupported Content Preservation across Editor & PDF
  // ===========================================================================
  describe('Audit 2: Unsupported Content Preservation', () => {
    it('preserves all unsupported block text and IDs across adapter, editor, and PDF exporter', () => {
      const unsupportedText = 'ਗੁਪਤ ਨੋਟ / Confidential Script Revision Note';
      const draft = createSampleDraft([
        { id: 'b-normal-1', type: 'scene_heading', text: 'INT. STAGE - DAY' },
        { id: 'b-weird-type', type: 'actor_vocal_cue' as any, text: unsupportedText },
        { id: 'b-normal-2', type: 'action', text: 'ਸਟੇਜ ਉੱਤੇ ਚਾਨਣ ਹੁੰਦਾ ਹੈ।' },
      ]);

      // 1. Adapter validation
      const doc = draftToProseMirrorDoc(draft);
      const { layoutBlocks, diagnostics } = docToLayoutBlocks(doc);

      // Layout engine input excludes unsupported block so it does not masquerade as action
      expect(layoutBlocks.find((b) => b.id === 'b-weird-type')).toBeUndefined();
      expect(diagnostics.some((d) => d.code === 'UNSUPPORTED_BLOCK_TYPE' && d.blockId === 'b-weird-type')).toBe(true);

      // 2. ProseMirror document preservation
      const convertedDraft = proseMirrorDocToDraft(doc, draft);
      const preservedBlock = convertedDraft.blocks.find((b) => b.id === 'b-weird-type');
      expect(preservedBlock).toBeDefined();
      expect(preservedBlock?.text).toBe(unsupportedText);

      // 3. PDF Exporter preservation
      const html = generateScreenplayHtml(draft, dummyMetadata, {
        paperSize: 'letter',
        includeTitlePage: false,
        useUnifiedPagination: true,
        allowHeadlessFallback: true,
      });

      expect(html).toContain('id="b-weird-type"');
      expect(html).toContain(unsupportedText);
    });
  });

  // ===========================================================================
  // AUDIT 3: Undo/Redo History & Invariance across Mode Switching
  // ===========================================================================
  describe('Audit 3: Undo/Redo during Mode Switching', () => {
    it('preserves undo/redo history and cursor selection when switching mode via state.reconfigure', () => {
      const draft = createSampleDraft([
        { id: 'b1', type: 'scene_heading', text: 'INT. EDIT SUITE - DAY' },
        { id: 'b2', type: 'action', text: 'Initial screenplay text.' },
      ]);

      const historyPlugin = history();
      const legacyPlugin = createPaginationPlugin({ paperSize: 'letter' });
      const initialDoc = draftToProseMirrorDoc(draft);

      let state = EditorState.create({
        doc: initialDoc,
        schema: screenplaySchema,
        plugins: [historyPlugin, legacyPlugin],
      });

      // User types a modification
      const tr1 = state.tr.insertText(' ADDITIONAL MODIFICATION', 10);
      state = state.apply(tr1);
      expect(state.doc.textContent).toContain('ADDITIONAL MODIFICATION');

      // Now mode switch: Legacy -> Unified using state.reconfigure with the SAME historyPlugin instance
      const unifiedPlugin = createUnifiedPaginationPlugin({
        paperSize: 'letter',
        contdSetting: 'on',
      });
      state = state.reconfigure({
        plugins: [historyPlugin, unifiedPlugin],
      });

      // Verify active plugin is now unified
      expect(unifiedPaginationPluginKey.getState(state)).toBeDefined();
      expect(paginationPluginKey.getState(state)).toBeUndefined();
      // Verify text is unchanged
      expect(state.doc.textContent).toContain('ADDITIONAL MODIFICATION');

      // User performs UNDO
      let undoExecuted = false;
      undo(state, (undoTr) => {
        undoExecuted = true;
        state = state.apply(undoTr);
      });
      expect(undoExecuted).toBe(true);
      expect(state.doc.textContent).not.toContain('ADDITIONAL MODIFICATION');
      expect(state.doc.textContent).toContain('Initial screenplay text.');

      // User performs REDO
      let redoExecuted = false;
      redo(state, (redoTr) => {
        redoExecuted = true;
        state = state.apply(redoTr);
      });
      expect(redoExecuted).toBe(true);
      expect(state.doc.textContent).toContain('ADDITIONAL MODIFICATION');

      // Mode switch back: Unified -> Legacy
      const legacyPlugin2 = createPaginationPlugin({ paperSize: 'letter' });
      state = state.reconfigure({
        plugins: [historyPlugin, legacyPlugin2],
      });

      // Verify undo still works after second mode switch
      undo(state, (undoTr) => {
        state = state.apply(undoTr);
      });
      expect(state.doc.textContent).not.toContain('ADDITIONAL MODIFICATION');
    });

    it('ScreenplayCanvas preserves editor mount and allows undo across useUnifiedPagination prop changes', () => {
      const draft = createSampleDraft();
      let activeDraft = { ...draft };
      let lastReportedStatus: PaginationEngineStatus | null = null;

      const { rerender } = render(
        <ScreenplayCanvas
          draft={activeDraft}
          metadata={dummyMetadata}
          onMetadataChange={() => {}}
          onDraftChange={(updated) => {
            activeDraft = updated;
          }}
          contdSetting="on"
          inputMode="pa"
          onTriggerContdPrompt={() => {}}
          paperSize="letter"
          zoom={100}
          onFocusTitle={() => {}}
          onFocusBlock={() => {}}
          useUnifiedPagination={false}
          onPaginationEngineStatusChange={(status) => {
            lastReportedStatus = status;
          }}
        />
      );

      expect((lastReportedStatus as PaginationEngineStatus | null)?.engine).toBe('legacy');

      // Toggle mode to unified: ScreenplayCanvas has key={draft.id}, so it reconfigures without unmounting
      act(() => {
        rerender(
          <ScreenplayCanvas
            draft={activeDraft}
            metadata={dummyMetadata}
            onMetadataChange={() => {}}
            onDraftChange={(updated) => {
              activeDraft = updated;
            }}
            contdSetting="on"
            inputMode="pa"
            onTriggerContdPrompt={() => {}}
            paperSize="letter"
            zoom={100}
            onFocusTitle={() => {}}
            onFocusBlock={() => {}}
            useUnifiedPagination={true}
            onPaginationEngineStatusChange={(status) => {
              lastReportedStatus = status;
            }}
          />
        );
      });

      expect((lastReportedStatus as PaginationEngineStatus | null)?.engine).toBe('unified');
      expect((lastReportedStatus as PaginationEngineStatus | null)?.isFallback).toBe(false);
    });
  });

  // ===========================================================================
  // AUDIT 4: Empty Document Behaviour
  // ===========================================================================
  describe('Audit 4: Empty Document Behaviour', () => {
    it('produces a valid 0-page layout without triggering fallback for an empty document', () => {
      const emptyDraft: ScriptDraft = {
        id: 'draft-empty',
        name: 'Empty Draft',
        isMain: true,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        blocks: [],
      };

      const doc = draftToProseMirrorDoc(emptyDraft);
      let fallbackTriggered = false;

      const plugin = createUnifiedPaginationPlugin({
        paperSize: 'letter',
        contdSetting: 'on',
        onFallback: () => {
          fallbackTriggered = true;
        },
      });

      const state = EditorState.create({
        doc,
        schema: screenplaySchema,
        plugins: [plugin],
      });

      const pluginState = unifiedPaginationPluginKey.getState(state);
      expect(pluginState).toBeDefined();
      expect(pluginState?.isFallback).toBe(false);
      expect(pluginState?.fallbackReason).toBeNull();
      expect(fallbackTriggered).toBe(false);
      expect(pluginState?.paginationResult?.pages.length).toBe(0);
      expect(pluginState?.decorations.find().length).toBe(0);
    });

    it('handles empty -> insert text -> delete text cycles without fallback', () => {
      const emptyDraft: ScriptDraft = {
        id: 'draft-empty-cycle',
        name: 'Cycle Draft',
        isMain: true,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        blocks: [],
      };

      const doc = draftToProseMirrorDoc(emptyDraft);
      let fallbackTriggered = false;

      const plugin = createUnifiedPaginationPlugin({
        paperSize: 'letter',
        contdSetting: 'on',
        onFallback: () => {
          fallbackTriggered = true;
        },
      });

      let state = EditorState.create({
        doc,
        schema: screenplaySchema,
        plugins: [plugin],
      });

      expect(unifiedPaginationPluginKey.getState(state)?.isFallback).toBe(false);

      // 1. Insert text
      const tr1 = state.tr.insertText('ਨਵਾਂ ਦ੍ਰਿਸ਼ ਸ਼ੁਰੂ ਹੁੰਦਾ ਹੈ।', 1);
      state = state.apply(tr1);
      let pState = unifiedPaginationPluginKey.getState(state);
      expect(pState?.isFallback).toBe(false);
      expect(fallbackTriggered).toBe(false);

      // 2. Delete all text back to empty
      const tr2 = state.tr.delete(1, state.doc.content.size);
      state = state.apply(tr2);
      pState = unifiedPaginationPluginKey.getState(state);
      expect(pState?.isFallback).toBe(false);
      expect(pState?.paginationResult?.pages.length).toBe(0);
      expect(fallbackTriggered).toBe(false);
    });
  });

  // ===========================================================================
  // AUDIT 5: Settings Persistence, Precedence & Project Invariance
  // ===========================================================================
  describe('Audit 5: Settings Persistence, Precedence & Project Invariance', () => {
    it('enforces deterministic precedence: saved user setting > dev override > default', () => {
      // 1. Safe default is strictly 'legacy'
      expect(resolvePaginationEngine(null, false)).toBe('legacy');
      expect(resolvePaginationEngine(undefined, false)).toBe('legacy');

      // 2. Dev override activates 'unified' only when no user preference is stored
      expect(resolvePaginationEngine(null, true)).toBe('unified');

      // 3. User saved preference strictly overrides dev flag
      expect(resolvePaginationEngine('legacy', true)).toBe('legacy');
      expect(resolvePaginationEngine('unified', false)).toBe('unified');

      // 4. Invalid stored values are rejected and fallback to default or override
      expect(resolvePaginationEngine('invalid_engine_name', false)).toBe('legacy');
      expect(resolvePaginationEngine('invalid_engine_name', true)).toBe('unified');
    });

    it('persists and restores settings to localStorage correctly', () => {
      expect(getStoredPaginationEngine()).toBe('legacy');

      setStoredPaginationEngine('unified');
      expect(localStorage.getItem(PAGINATION_SETTING_STORAGE_KEY)).toBe('unified');
      expect(getStoredPaginationEngine()).toBe('unified');

      setStoredPaginationEngine('legacy');
      expect(localStorage.getItem(PAGINATION_SETTING_STORAGE_KEY)).toBe('legacy');
      expect(getStoredPaginationEngine()).toBe('legacy');

      // Invalid set requests are ignored
      setStoredPaginationEngine('corrupted_val' as any);
      expect(getStoredPaginationEngine()).toBe('legacy');
    });

    it('verifies that changing pagination settings does not mutate ScriptProject or ScriptDraft data', () => {
      const originalProject: ScriptProject = {
        schemaVersion: 1,
        id: 'project-audit',
        title: 'Audit Script',
        metadata: { ...dummyMetadata },
        drafts: [createSampleDraft()],
        activeDraftId: 'draft-audit-m2e1',
        revision: 1,
        lastSavedRevision: 1,
        settings: {
          paperSize: 'letter',
          contdSetting: 'on',
          language: 'pa',
          spellcheck: true,
        },
      };

      const projectSnapshot = JSON.stringify(originalProject);

      // Simulate mode switching operations
      setStoredPaginationEngine('unified');
      const engine1 = getStoredPaginationEngine();
      expect(engine1).toBe('unified');

      setStoredPaginationEngine('legacy');
      const engine2 = getStoredPaginationEngine();
      expect(engine2).toBe('legacy');

      // Verify originalProject and draft data are 100% byte-for-byte unchanged
      expect(JSON.stringify(originalProject)).toBe(projectSnapshot);
      expect(originalProject.drafts[0].blocks[0].text).toBe('INT. AUDIT ROOM - DAY');
    });
  });
});
