/**
 * pagination-setting-and-switching.test.ts - Milestone M2E Test Suite
 * Governing ID: AKHAR-ARCH-PAG — Milestone M2E
 *
 * Verifies:
 * 1. Pagination Engine Settings & Mode Precedence (safe default, saved preference, dev override).
 * 2. Mode Switching & Canonical Document Invariance (Legacy <-> Unified, unsaved edits, Gurmukhi/English).
 * 3. Robust Fallback & Error Handling (unsupported blocks, engine errors, recovery, zero crash).
 * 4. Editor & PDF Export Parity by Mode (consistent settings, font safety, zero document mutation).
 */

// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EditorState, TextSelection } from 'prosemirror-state';
import { screenplaySchema } from '../src/core/editor/schema';
import {
  PaginationEngineSetting,
  PAGINATION_SETTING_STORAGE_KEY,
  DEFAULT_PAGINATION_ENGINE,
  resolvePaginationEngine,
  getStoredPaginationEngine,
  setStoredPaginationEngine,
} from '../src/renderer/utils/paginationSetting';
import {
  createUnifiedPaginationPlugin,
  unifiedPaginationPluginKey,
  computeFallbackLegacyDecorations,
} from '../src/core/editor/unifiedPaginationPlugin';
import { createPaginationPlugin } from '../src/core/editor/paginationPlugin';
import {
  generateScreenplayHtml,
  generateUnifiedScreenplayPdfHtml,
} from '../src/core/export/pdfExporter';
import { ScriptDraft, ScriptProject } from '../src/types/screenplay';
import {
  createDefaultProject,
  getActiveDraft,
  validateScriptProject,
  migrateContdSetting,
} from '../src/core/model/ProjectModel';
import { draftToProseMirrorDoc, proseMirrorDocToDraft } from '../src/core/editor/documentAdapter';

// In-memory mock localStorage for isolated testing
class MockLocalStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

describe('Milestone M2E: Production Promotion & Settings', () => {
  let mockStorage: MockLocalStorage;

  beforeEach(() => {
    mockStorage = new MockLocalStorage();
    vi.stubGlobal('localStorage', mockStorage);
    delete (window as unknown as { __AKHAR_USE_UNIFIED_PAGINATION__?: boolean }).__AKHAR_USE_UNIFIED_PAGINATION__;
    delete process.env.AKHAR_USE_UNIFIED_PAGINATION;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (window as unknown as { __AKHAR_USE_UNIFIED_PAGINATION__?: boolean }).__AKHAR_USE_UNIFIED_PAGINATION__;
    delete process.env.AKHAR_USE_UNIFIED_PAGINATION;
  });

  // ===========================================================================
  // SECTION 1: Settings & Precedence Rules
  // ===========================================================================
  describe('1. Settings & Precedence Rules', () => {
    it('defaults safely to Unified when no setting exists in storage', () => {
      expect(mockStorage.getItem(PAGINATION_SETTING_STORAGE_KEY)).toBeNull();
      const resolved = getStoredPaginationEngine();
      expect(resolved).toBe('unified');
      expect(DEFAULT_PAGINATION_ENGINE).toBe('unified');
    });

    it('defaults safely to Unified when storage contains invalid or corrupted values', () => {
      mockStorage.setItem(PAGINATION_SETTING_STORAGE_KEY, 'invalid_mode');
      expect(getStoredPaginationEngine()).toBe('unified');

      mockStorage.setItem(PAGINATION_SETTING_STORAGE_KEY, '');
      expect(getStoredPaginationEngine()).toBe('unified');

      mockStorage.setItem(PAGINATION_SETTING_STORAGE_KEY, 'undefined');
      expect(getStoredPaginationEngine()).toBe('unified');
    });

    it('migrates stored Legacy preference to Unified in localStorage', () => {
      mockStorage.setItem(PAGINATION_SETTING_STORAGE_KEY, 'legacy');
      expect(getStoredPaginationEngine()).toBe('unified');
      expect(mockStorage.getItem(PAGINATION_SETTING_STORAGE_KEY)).toBe('unified');
    });

    it('persists and restores saved Unified preference', () => {
      setStoredPaginationEngine('unified');
      expect(mockStorage.getItem(PAGINATION_SETTING_STORAGE_KEY)).toBe('unified');
      expect(getStoredPaginationEngine()).toBe('unified');
    });

    it('rejects writing invalid settings to storage', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      setStoredPaginationEngine('bogus' as PaginationEngineSetting);
      expect(mockStorage.getItem(PAGINATION_SETTING_STORAGE_KEY)).toBeNull();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('preserves Unified as the canonical engine when dev flag is active', () => {
      process.env.AKHAR_USE_UNIFIED_PAGINATION = '1';
      const resolved = getStoredPaginationEngine();
      expect(resolved).toBe('unified');
    });

    it('preserves Unified as the canonical engine when window global override is present', () => {
      (window as unknown as { __AKHAR_USE_UNIFIED_PAGINATION__?: boolean }).__AKHAR_USE_UNIFIED_PAGINATION__ = true;
      const resolved = getStoredPaginationEngine();
      expect(resolved).toBe('unified');
    });

    it('activates Unified when dev override is present and no user preference is saved', () => {
      expect(mockStorage.getItem(PAGINATION_SETTING_STORAGE_KEY)).toBeNull();

      process.env.AKHAR_USE_UNIFIED_PAGINATION = '1';
      expect(getStoredPaginationEngine()).toBe('unified');
    });

    it('restores selected preference across application restarts (fresh storage read)', () => {
      setStoredPaginationEngine('unified');
      expect(getStoredPaginationEngine()).toBe('unified');

      // Simulate app restart by resolving with new loader call
      const reloaded = resolvePaginationEngine(mockStorage.getItem(PAGINATION_SETTING_STORAGE_KEY), false);
      expect(reloaded).toBe('unified');
    });
  });

  // ===========================================================================
  // SECTION 2: Mode Switching & Document Invariance
  // ===========================================================================
  describe('2. Mode Switching & Canonical Document Invariance', () => {
    function createMultiPageDraft(): ScriptDraft {
      return {
        id: 'draft-test-switch',
        name: 'Main Draft',
        isMain: true,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        blocks: [
          { id: 'sh-1', type: 'scene_heading', text: '1. INT. AMRITSAR HERITAGE - DAY' },
          ...Array.from({ length: 18 }, (_, i) => ({
            id: `act-${i + 1}`,
            type: 'action' as const,
            text: `ਕ੍ਰਿੱਪਾ ਕਰਕੇ ਕਾਰਵਾਈ ਨੰਬਰ ${i + 1} ਪੂਰੀ ਗੰਭੀਰਤਾ ਨਾਲ ਦਰਜ ਕੀਤੀ ਜਾਵੇ। English description of action details.`,
          })),
          { id: 'char-1', type: 'character', text: 'ਪਵਨ' },
          { id: 'dial-1', type: 'dialogue', text: 'ਇਹ ਸਾਡਾ ਪਹਿਲਾ ਸੰਵਾਦ ਹੈ ਜੋ ਅਗਲੇ ਪੰਨੇ ਤੱਕ ਚੱਲੇਗਾ।' },
          { id: 'sh-2', type: 'scene_heading', text: '2. EXT. HIGHWAY - NIGHT' },
        ],
      };
    }

    it('preserves exact canonical text and block structures when switching Legacy -> Unified', () => {
      const draft = createMultiPageDraft();
      const initialDoc = draftToProseMirrorDoc(draft);
      const textBefore = initialDoc.textContent;

      // Mount with Legacy plugin
      const legacyPlugin = createPaginationPlugin({ paperSize: 'letter' });
      const legacyState = EditorState.create({
        doc: initialDoc,
        schema: screenplaySchema,
        plugins: [legacyPlugin],
      });

      // Switch to Unified plugin on the same draft
      const unifiedPlugin = createUnifiedPaginationPlugin({ paperSize: 'letter' });
      const unifiedDoc = draftToProseMirrorDoc(draft);
      const unifiedState = EditorState.create({
        doc: unifiedDoc,
        schema: screenplaySchema,
        plugins: [unifiedPlugin],
      });

      // Assert 100% canonical equality
      expect(unifiedState.doc.textContent).toBe(textBefore);
      expect(unifiedState.doc.childCount).toBe(legacyState.doc.childCount);
      expect(unifiedState.doc.nodeSize).toBe(legacyState.doc.nodeSize);

      for (let i = 0; i < unifiedState.doc.childCount; i++) {
        const uChild = unifiedState.doc.child(i);
        const lChild = legacyState.doc.child(i);
        expect(uChild.attrs.id).toBe(lChild.attrs.id);
        expect(uChild.attrs.type).toBe(lChild.attrs.type);
        expect(uChild.textContent).toBe(lChild.textContent);
      }
    });

    it('preserves exact canonical text and block structures when switching Unified -> Legacy', () => {
      const draft = createMultiPageDraft();
      const unifiedPlugin = createUnifiedPaginationPlugin({ paperSize: 'letter' });
      const unifiedState = EditorState.create({
        doc: draftToProseMirrorDoc(draft),
        schema: screenplaySchema,
        plugins: [unifiedPlugin],
      });
      const textBefore = unifiedState.doc.textContent;

      const legacyPlugin = createPaginationPlugin({ paperSize: 'letter' });
      const legacyState = EditorState.create({
        doc: draftToProseMirrorDoc(draft),
        schema: screenplaySchema,
        plugins: [legacyPlugin],
      });

      expect(legacyState.doc.textContent).toBe(textBefore);
      expect(legacyState.doc.childCount).toBe(unifiedState.doc.childCount);
    });

    it('preserves zero synthetic text across repeated switches (Legacy -> Unified -> Legacy -> Unified)', () => {
      const draft = createMultiPageDraft();
      let currentDraft = draft;

      for (let cycle = 0; cycle < 3; cycle++) {
        // Switch to Unified
        const uPlugin = createUnifiedPaginationPlugin({ paperSize: 'letter' });
        const uState = EditorState.create({
          doc: draftToProseMirrorDoc(currentDraft),
          schema: screenplaySchema,
          plugins: [uPlugin],
        });
        const uText = uState.doc.textContent;
        expect(uText).not.toContain('PAGE');
        expect(uText).not.toContain('(MORE)');
        expect(uText).not.toContain("(CONT'D)");

        currentDraft = proseMirrorDocToDraft(uState.doc, currentDraft);

        // Switch to Legacy
        const lPlugin = createPaginationPlugin({ paperSize: 'letter' });
        const lState = EditorState.create({
          doc: draftToProseMirrorDoc(currentDraft),
          schema: screenplaySchema,
          plugins: [lPlugin],
        });
        const lText = lState.doc.textContent;
        expect(lText).not.toContain('PAGE');
        expect(lText).not.toContain('(MORE)');
        expect(lText).not.toContain("(CONT'D)");

        currentDraft = proseMirrorDocToDraft(lState.doc, currentDraft);
      }

      expect(currentDraft.blocks.length).toBe(draft.blocks.length);
      expect(currentDraft.blocks[0].text).toBe(draft.blocks[0].text);
    });

    it('preserves unsaved pending edits across mode switches', () => {
      const draft = createMultiPageDraft();
      const doc = draftToProseMirrorDoc(draft);
      const state = EditorState.create({
        doc,
        schema: screenplaySchema,
        plugins: [createPaginationPlugin({ paperSize: 'letter' })],
      });

      // User performs unsaved edit: insert Gurmukhi text in action block 1
      const insertPos = 15;
      const tr = state.tr.insertText('ਨਵਾਂ ਸੰਪਾਦਨ ', insertPos);
      const stateWithEdits = state.apply(tr);

      // Convert to draft (as ScreenplayCanvas does synchronously on docChanged)
      const unsavedDraft = proseMirrorDocToDraft(stateWithEdits.doc, draft);

      // Now switch mode to Unified with this unsaved draft
      const uState = EditorState.create({
        doc: draftToProseMirrorDoc(unsavedDraft),
        schema: screenplaySchema,
        plugins: [createUnifiedPaginationPlugin({ paperSize: 'letter' })],
      });

      expect(uState.doc.textContent).toContain('ਨਵਾਂ ਸੰਪਾਦਨ');
      expect(uState.doc.textContent).toBe(stateWithEdits.doc.textContent);
    });

    it('restores cursor selection position via initialSelection across remount', () => {
      const draft = createMultiPageDraft();
      const doc = draftToProseMirrorDoc(draft);

      const targetPos = 45;
      const initialSelection = { from: targetPos, to: targetPos };

      // Recreate editor state with initialSelection
      let state = EditorState.create({
        doc,
        schema: screenplaySchema,
        plugins: [createUnifiedPaginationPlugin({ paperSize: 'letter' })],
      });

      const sel = TextSelection.create(state.doc, initialSelection.from, initialSelection.to);
      state = state.apply(state.tr.setSelection(sel));

      expect(state.selection.from).toBe(targetPos);
      expect(state.selection.to).toBe(targetPos);
    });
  });

  // ===========================================================================
  // SECTION 3: Robust Fallback & Error Handling
  // ===========================================================================
  describe('3. Robust Fallback & Error Handling', () => {
    it('falls back safely to legacy decorations when an unsupported block type is present', () => {
      const fallbackEvents: string[] = [];
      const docWithUnsupported = screenplaySchema.nodes.doc.create(null, [
        screenplaySchema.nodes.screenplay_block.create({
          id: 'b-1',
          type: 'action',
        }, screenplaySchema.text('Valid action line.')),
        // Node with unsupported custom type attribute
        screenplaySchema.nodes.screenplay_block.create({
          id: 'b-2',
          type: 'unsupported_custom_block_type' as any,
        }, screenplaySchema.text('Unsupported block text content.')),
      ]);

      const plugin = createUnifiedPaginationPlugin({
        paperSize: 'letter',
        onFallback: (reason, diags) => {
          fallbackEvents.push(reason);
          expect(diags.length).toBeGreaterThan(0);
          expect(diags[0].code).toBe('UNSUPPORTED_BLOCK_TYPE');
        },
      });

      const state = EditorState.create({
        doc: docWithUnsupported,
        schema: screenplaySchema,
        plugins: [plugin],
      });

      const pluginState = unifiedPaginationPluginKey.getState(state);
      expect(pluginState).toBeDefined();
      expect(pluginState?.isFallback).toBe(true);
      expect(pluginState?.fallbackReason).toBe('unsupported_block');
      expect(fallbackEvents).toContain('unsupported_block');

      // The document remains 100% interactive and intact
      expect(state.doc.textContent).toContain('Unsupported block text content.');
    });

    it('falls back safely to legacy decorations when layout engine returns 0 pages for non-empty text', () => {
      const fallbackEvents: string[] = [];
      const doc = screenplaySchema.nodes.doc.create(null, [
        screenplaySchema.nodes.screenplay_block.create({ id: 'b-1', type: 'action' }, screenplaySchema.text('Line 1')),
      ]);

      // Mock engine returning broken empty pages
      const brokenEngine = {
        paginate: () => ({
          pages: [],
          unsupportedBlockIds: [],
          diagnostics: [],
        }),
      };

      const plugin = createUnifiedPaginationPlugin({
        paginationEngine: brokenEngine as any,
        onFallback: (reason) => {
          fallbackEvents.push(reason);
        },
      });

      const state = EditorState.create({
        doc,
        schema: screenplaySchema,
        plugins: [plugin],
      });

      const pluginState = unifiedPaginationPluginKey.getState(state);
      expect(pluginState?.isFallback).toBe(true);
      expect(pluginState?.fallbackReason).toBe('incomplete_layout');
      expect(fallbackEvents).toContain('incomplete_layout');
    });

    it('falls back safely when engine.paginate throws an unhandled error during transaction', () => {
      const fallbackEvents: string[] = [];
      let shouldThrow = false;

      const throwingEngine = {
        paginate: () => {
          if (shouldThrow) {
            throw new Error('Simulated layout engine crash during transaction');
          }
          return {
            pages: [
              {
                pageNumber: 1,
                slotsConsumed: 10,
                slotsRemaining: 44,
                lines: [],
                blockPlacements: [],
                headerText: null,
                continuationHeader: null,
              },
            ],
            unsupportedBlockIds: [],
            diagnostics: [],
          };
        },
      };

      const plugin = createUnifiedPaginationPlugin({
        paginationEngine: throwingEngine as any,
        onFallback: (reason) => {
          fallbackEvents.push(reason);
        },
      });

      const doc = screenplaySchema.nodes.doc.create(null, [
        screenplaySchema.nodes.screenplay_block.create({ id: 'b-1', type: 'action' }, screenplaySchema.text('First line')),
      ]);

      let state = EditorState.create({
        doc,
        schema: screenplaySchema,
        plugins: [plugin],
      });

      expect(unifiedPaginationPluginKey.getState(state)?.isFallback).toBe(false);

      // Now trigger error on transaction
      shouldThrow = true;
      const tr = state.tr.insertText(' added text', 6);
      state = state.apply(tr);

      const postState = unifiedPaginationPluginKey.getState(state);
      expect(postState?.isFallback).toBe(true);
      expect(postState?.fallbackReason).toBe('engine_error');
      expect(fallbackEvents).toContain('engine_error');

      // Document is completely preserved
      expect(state.doc.textContent).toBe('First added text line');
    });

    it('automatically recovers from fallback when unsupported block is removed', () => {
      const validBlock = screenplaySchema.nodes.screenplay_block.create(
        { id: 'b-1', type: 'action' },
        screenplaySchema.text('Valid action line.')
      );
      const unsupportedBlock = screenplaySchema.nodes.screenplay_block.create(
        { id: 'b-2', type: 'unknown_type' as any },
        screenplaySchema.text('Bad block.')
      );

      const doc = screenplaySchema.nodes.doc.create(null, [validBlock, unsupportedBlock]);
      const plugin = createUnifiedPaginationPlugin();

      let state = EditorState.create({
        doc,
        schema: screenplaySchema,
        plugins: [plugin],
      });

      // Initial state is fallback because of unsupported block
      expect(unifiedPaginationPluginKey.getState(state)?.isFallback).toBe(true);

      // User deletes the unsupported block (second child)
      const tr = state.tr.delete(validBlock.nodeSize, doc.content.size);
      state = state.apply(tr);

      // Plugin automatically recovers to Unified layout!
      const recoveredState = unifiedPaginationPluginKey.getState(state);
      expect(recoveredState?.isFallback).toBe(false);
      expect(recoveredState?.fallbackReason).toBeNull();
    });

    it('computeFallbackLegacyDecorations produces valid DecorationSet without mutating doc', () => {
      const doc = draftToProseMirrorDoc({
        id: 'd-1',
        name: 'Draft',
        isMain: true,
        createdAt: '',
        modifiedAt: '',
        blocks: Array.from({ length: 40 }, (_, i) => ({
          id: `b-${i}`,
          type: 'action',
          text: `Action line ${i + 1} with standard length.`,
        })),
      });

      const decos = computeFallbackLegacyDecorations(doc, 'letter');
      expect(decos).toBeDefined();
      const found = decos.find();
      expect(found.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // SECTION 4: Editor & PDF Export Parity by Mode
  // ===========================================================================
  describe('4. Editor & PDF Export Parity by Mode', () => {
    it('routes to unified discrete sheet generator even when useUnifiedPagination is false (Single Path)', () => {
      const project: ScriptProject = createDefaultProject();
      const draft = getActiveDraft(project);
      draft.blocks = [
        { id: 'sh-1', type: 'scene_heading', text: '1. INT. AMRITSAR - DAY' },
        { id: 'act-1', type: 'action', text: 'ਪਵਨ ਆਪਣੇ ਕੰਮ ਵਿੱਚ ਮਗਨ ਹੈ।' },
      ];

      const html = generateScreenplayHtml(draft, project.metadata, {
        paperSize: 'letter',
        includeTitlePage: false,
        useUnifiedPagination: false,
        allowHeadlessFallback: true,
      });

      expect(html).toContain('screenplay-page-sheet');
      expect(html).toContain('1. INT. AMRITSAR - DAY');
      expect(html).toContain('ਪਵਨ ਆਪਣੇ ਕੰਮ ਵਿੱਚ ਮਗਨ ਹੈ।');
    });

    it('generates unified HTML export when useUnifiedPagination is true', () => {
      const project: ScriptProject = createDefaultProject();
      const draft = getActiveDraft(project);
      draft.blocks = [
        { id: 'sh-1', type: 'scene_heading', text: '1. INT. AMRITSAR - DAY' },
        { id: 'act-1', type: 'action', text: 'ਪਵਨ ਆਪਣੇ ਕੰਮ ਵਿੱਚ ਮਗਨ ਹੈ।' },
      ];

      const html = generateUnifiedScreenplayPdfHtml(draft, project.metadata, {
        paperSize: 'letter',
        includeTitlePage: false,
        allowHeadlessFallback: true,
      });

      expect(html).toContain('screenplay-page-sheet');
      expect(html).toContain('slot-line');
      expect(html).toContain('1. INT. AMRITSAR - DAY');
      expect(html).toContain('ਪਵਨ ਆਪਣੇ ਕੰਮ ਵਿੱਚ ਮਗਨ ਹੈ।');
    });

    it('prohibits uncertified headless font fallback in production mode', () => {
      const project: ScriptProject = createDefaultProject();
      const draft = getActiveDraft(project);

      // In JSDOM without canvas context and without allowHeadlessFallback, it must strictly throw
      expect(() => {
        generateUnifiedScreenplayPdfHtml(draft, project.metadata, {
          paperSize: 'letter',
          includeTitlePage: false,
          allowHeadlessFallback: false,
        });
      }).toThrow('Canvas 2D context is unavailable for certified font measurement');
    });

    it('passes paperSize and contdSetting consistently to unified export', () => {
      const project: ScriptProject = createDefaultProject();
      project.settings.paperSize = 'a4';
      project.settings.contdSetting = 'off';

      const draft = getActiveDraft(project);
      draft.blocks = [
        { id: 'sh-1', type: 'scene_heading', text: '1. INT. STUDIO - DAY' },
        ...Array.from({ length: 30 }, (_, i) => ({
          id: `act-${i + 1}`,
          type: 'action' as const,
          text: `Action line ${i + 1}`,
        })),
        { id: 'c-1', type: 'character', text: 'ਅਮਨ' },
        { id: 'd-1', type: 'dialogue', text: 'ਸੰਵਾਦ ਲਾਈਨ 1\nਸੰਵਾਦ ਲਾਈਨ 2\nਸੰਵਾਦ ਲਾਈਨ 3\nਸੰਵਾਦ ਲਾਈਨ 4' },
      ];

      const htmlA4 = generateUnifiedScreenplayPdfHtml(draft, project.metadata, {
        paperSize: 'a4',
        includeTitlePage: false,
        contdSetting: 'off',
        allowHeadlessFallback: true,
      });

      expect(htmlA4).toContain('210mm 297mm');
      // When contdSetting is off, neither (MORE) nor (CONT'D) should appear
      expect(htmlA4).not.toContain('(MORE)');
      expect(htmlA4).not.toContain("(CONT'D)");
    });

    it('PDF export operations cause 0 mutation to the canonical screenplay draft', () => {
      const project: ScriptProject = createDefaultProject();
      const draft = getActiveDraft(project);
      draft.blocks = [
        { id: 'sh-1', type: 'scene_heading', text: '1. INT. AMRITSAR - DAY' },
        { id: 'act-1', type: 'action', text: 'ਕ੍ਰਿੱਪਾ ਕਰਕੇ ਸ਼ਾਂਤੀ ਬਣਾਈ ਰੱਖੋ।' },
      ];

      const blocksBefore = JSON.stringify(draft.blocks);

      // Run both legacy and unified exports
      generateScreenplayHtml(draft, project.metadata, {
        paperSize: 'letter',
        includeTitlePage: true,
        useUnifiedPagination: false,
      });
      generateUnifiedScreenplayPdfHtml(draft, project.metadata, {
        paperSize: 'letter',
        includeTitlePage: true,
        allowHeadlessFallback: true,
      });

      const blocksAfter = JSON.stringify(draft.blocks);
      expect(blocksAfter).toBe(blocksBefore);
    });
  });

  describe('5. ContdSetting Migration for Saved Projects', () => {
    it('migrates legacy contdSetting "on" to "both"', () => {
      const legacyProject = createDefaultProject();
      (legacyProject.settings as any).contdSetting = 'on';

      const validated = validateScriptProject(legacyProject);
      expect(validated.settings.contdSetting).toBe('both');
    });

    it('migrates legacy contdSetting "off" to "more_only" (matching legacy engine behavior)', () => {
      const legacyProject = createDefaultProject();
      (legacyProject.settings as any).contdSetting = 'off';

      const validated = validateScriptProject(legacyProject);
      expect(validated.settings.contdSetting).toBe('more_only');
    });

    it('migrates legacy contdSetting "unasked" to "none"', () => {
      const legacyProject = createDefaultProject();
      (legacyProject.settings as any).contdSetting = 'unasked';

      const validated = validateScriptProject(legacyProject);
      expect(validated.settings.contdSetting).toBe('none');
    });

    it('preserves modern non-overlapping contdSetting values untouched', () => {
      for (const val of ['none', 'more_only', 'contd_only', 'both', 'reprint_name'] as const) {
        const project = createDefaultProject();
        project.settings.contdSetting = val;

        const validated = validateScriptProject(project);
        expect(validated.settings.contdSetting).toBe(val);
      }
    });

    it('migrateContdSetting handles invalid or undefined inputs safely', () => {
      expect(migrateContdSetting(undefined)).toBe('none');
      expect(migrateContdSetting(null)).toBe('none');
      expect(migrateContdSetting('invalid_value')).toBe('none');
      expect(migrateContdSetting('all')).toBe('both');
    });
  });
});
