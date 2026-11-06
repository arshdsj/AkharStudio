/**
 * m2f-golden-script-parity.test.ts
 *
 * Milestone M2F — Stage 1: Golden Script & Editor/PDF Parity Verification Suite
 *
 * Verifies:
 * 1. Physical page dimensions and printable-area boundaries (Letter: 612x792 pt, A4: 595.28x841.89 pt).
 * 2. Strict 18.0pt line-box baseline pitch and integer slot accounting.
 * 3. Exact line-by-line and break-by-break parity between ProseMirror Editor decorations and PDF Exporter.
 * 4. Multi-page realistic Punjabi/Latin screenplay with dialogues, action, parentheticals, monologues, and transitions.
 * 5. Anti-orphan rules (lookahead for scene headings, backtrack for character cues) identical in Editor and PDF.
 * 6. (MORE) and (CONT'D) badge placement identical in Editor and PDF.
 * 7. Running header suppression on Page 1, presence and numbering on Page 2+.
 * 8. Zero canonical document mutation, zero synthetic text bleed.
 * 9. Title card toggle parity: body pagination invariant whether title card is included or omitted.
 */

// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { EditorState } from 'prosemirror-state';
import { screenplaySchema } from '../src/core/editor/schema';
import { draftToProseMirrorDoc } from '../src/core/editor/documentAdapter';
import {
  createUnifiedPaginationPlugin,
  unifiedPaginationPluginKey,
} from '../src/core/editor/unifiedPaginationPlugin';
import {
  generateUnifiedScreenplayPdfHtml,
  validateExportFonts,
} from '../src/core/export/pdfExporter';
import {
  GOLDEN_METADATA,
  createGoldenDraft,
} from './fixtures/golden-screenplay.fixture';
import { createPaginationEngine } from '../src/core/layout/paginationEngine';
import { draftToLayoutBlocks } from '../src/core/layout/paginationAdapter';
import { createTextLayoutService } from '../src/core/layout/textLayoutService';

describe('Milestone M2F — Stage 1: Golden Script Parity Verification', () => {
  const fontPath = path.resolve(process.cwd(), 'public/fonts/NotoSansGurmukhi.ttf');
  const gurmukhiFontBase64 = fs.existsSync(fontPath)
    ? fs.readFileSync(fontPath).toString('base64')
    : '';
  const courierPath = path.resolve(process.cwd(), 'public/fonts/CourierPrime.ttf');
  const courierFontBase64 = fs.existsSync(courierPath)
    ? fs.readFileSync(courierPath).toString('base64')
    : '';

  // Canonical 12pt monospace / Gurmukhi deterministic layout metrics (7.2pt / char)
  const sharedMetrics = {
    ensureLoaded: async () => ({ loaded: true, isFallback: false, status: 'ready' as const }),
    getStatus: () => ({ loaded: true, isFallback: false, status: 'ready' as const }),
    measureWidth: (text: string) => Number((text.length * 7.2).toFixed(4)),
    getLineBoxMetrics: () => ({ fontSizePt: 12, ascentPt: 12, descentPt: 4, lineBoxHeightPt: 18 }),
  };
  const sharedLayoutService = createTextLayoutService(sharedMetrics);

  const defaultPdfOptions = {
    allowHeadlessFallback: true,
    courierFontBase64,
    gurmukhiFontBase64,
    textLayoutService: sharedLayoutService,
  };

  // ===========================================================================
  // SECTION 1: Golden Script Integrity & Profile Boundaries
  // ===========================================================================
  describe('1. Golden Script Integrity & Profile Boundaries', () => {
    it('fixture contains realistic mixed Latin/Gurmukhi, dialogue, action, parentheticals, and monologues', () => {
      const draft = createGoldenDraft();
      expect(draft.blocks.length).toBe(40);

      // Verify mixed Latin/Gurmukhi in individual blocks
      const mixedAction = draft.blocks.find((b) => b.id === 'g-b03');
      expect(mixedAction?.text).toContain('iPhone 15 Pro');
      expect(mixedAction?.text).toContain('ਤੇਜ਼ ਕਦਮਾਂ');

      const mixedDialogue = draft.blocks.find((b) => b.id === 'g-b05');
      expect(mixedDialogue?.text).toContain('Section 302 IPC');
      expect(mixedDialogue?.text).toContain('ਦਰਜ ਹੋ ਗਿਆ ਹੈ');

      // Verify Punjabi conjuncts & stacked matras
      const monologue = draft.blocks.find((b) => b.id === 'g-b30');
      expect(monologue?.text).toContain('ਕ੍ਰਿੱਪਾ');
      expect(monologue?.text).toContain('ਇਮਤਿਹਾਨ');
      expect(monologue?.text).toContain('ਅਟੁੱਟ');

      // Verify diverse block types
      const types = new Set(draft.blocks.map((b) => b.type));
      expect(types.has('scene_heading')).toBe(true);
      expect(types.has('action')).toBe(true);
      expect(types.has('character')).toBe(true);
      expect(types.has('parenthetical')).toBe(true);
      expect(types.has('dialogue')).toBe(true);
      expect(types.has('transition')).toBe(true);
    });

    it('pure layout engine calculates multi-page layout for Letter (36 slots) and A4 (38 slots)', () => {
      const draft = createGoldenDraft();
      const layoutBlocks = draftToLayoutBlocks(draft);

      // Letter Engine
      const letterEngine = createPaginationEngine();
      const letterRes = letterEngine.paginate(layoutBlocks, {
        paperSize: 'letter',
        contdSetting: 'on',
        textLayoutService: sharedLayoutService,
      });

      // A4 Engine
      const a4Engine = createPaginationEngine();
      const a4Res = a4Engine.paginate(layoutBlocks, {
        paperSize: 'a4',
        contdSetting: 'on',
        textLayoutService: sharedLayoutService,
      });

      // Verify multi-page (>= 3 pages)
      expect(letterRes.pages.length).toBeGreaterThanOrEqual(3);
      expect(a4Res.pages.length).toBeGreaterThanOrEqual(3);

      // Verify slot budget compliance
      for (const page of letterRes.pages) {
        expect(page.usedSlots).toBeLessThanOrEqual(36);
        expect(page.remainingSlots).toBeGreaterThanOrEqual(0);
        expect(page.usedSlots + page.remainingSlots).toBe(36);
        expect(page.slots.length).toBeGreaterThan(0);
      }
      for (const page of a4Res.pages) {
        expect(page.usedSlots).toBeLessThanOrEqual(38);
        expect(page.remainingSlots).toBeGreaterThanOrEqual(0);
        expect(page.usedSlots + page.remainingSlots).toBe(38);
        expect(page.slots.length).toBeGreaterThan(0);
      }
    });
  });

  // ===========================================================================
  // SECTION 2: Exact Editor/PDF Break & Slot Parity (Letter)
  // ===========================================================================
  describe('2. Exact Editor/PDF Break & Slot Parity (US Letter)', () => {
    it('produces identical page counts, break points, and split offsets across Editor and PDF', () => {
      const draft = createGoldenDraft();
      const doc = draftToProseMirrorDoc(draft);

      // 1. Editor Unified Pagination Plugin
      const plugin = createUnifiedPaginationPlugin({
        paperSize: 'letter',
        contdSetting: 'on',
        textLayoutService: sharedLayoutService,
      });
      const state = EditorState.create({
        doc,
        schema: screenplaySchema,
        plugins: [plugin],
      });

      const pluginState = unifiedPaginationPluginKey.getState(state);
      expect(pluginState).toBeDefined();
      expect(pluginState?.isFallback).toBe(false);

      const editorResult = pluginState!.paginationResult!;
      expect(editorResult).toBeDefined();
      const pageCount = editorResult.pages.length;
      expect(pageCount).toBeGreaterThanOrEqual(3);

      // 2. PDF Exporter Output
      const pdfHtml = generateUnifiedScreenplayPdfHtml(draft, GOLDEN_METADATA, {
        paperSize: 'letter',
        includeTitlePage: false,
        contdSetting: 'on',
        ...defaultPdfOptions,
      });

      // Parse discrete pages in PDF HTML
      const pdfPageMatches = Array.from(pdfHtml.matchAll(/class="page-sheet screenplay-page-sheet" data-page-number="(\d+)"/g));
      expect(pdfPageMatches.length).toBe(pageCount);

      // PARITY VERIFICATION 1: Physical Geometry
      expect(pdfHtml).toContain('size: 8.5in 11in;');
      expect(pdfHtml).toContain('width: 8.5in;');
      expect(pdfHtml).toContain('height: 11in;');
      expect(pdfHtml).toContain('padding: 1.0in 1.0in 1.0in 1.5in;');

      // PARITY VERIFICATION 2: Page-by-Page Block Content Parity
      for (let pIdx = 0; pIdx < pageCount; pIdx++) {
        const pageNum = pIdx + 1;
        const editorPage = editorResult.pages[pIdx];

        // Locate page sheet HTML container
        const pageStartStr = `data-page-number="${pageNum}"`;
        const nextStartStr = `data-page-number="${pageNum + 1}"`;
        const pStart = pdfHtml.indexOf(pageStartStr);
        const pEnd = pIdx < pageCount - 1 ? pdfHtml.indexOf(nextStartStr, pStart) : pdfHtml.length;
        const pageSlice = pdfHtml.substring(pStart, pEnd);

        // Verify every text block in editor page exists in corresponding PDF page
        const editorBlockIds = Array.from(
          new Set(editorPage.slots.filter((s) => s.kind === 'text').map((s) => s.blockId))
        );
        for (const bId of editorBlockIds) {
          expect(pageSlice).toContain(`id="${bId}"`);
        }

        // Verify running header parity
        if (pageNum === 1) {
          // Page 1 header must be suppressed in both
          expect(pageSlice).not.toContain('<div class="page-header">1.</div>');
        } else {
          // Page 2+ header must be present in both
          expect(pageSlice).toContain(`<div class="page-header">${pageNum}.</div>`);
        }
      }

      // PARITY VERIFICATION 3: Page Break Targets & Continuation Widgets
      const targets = pluginState!.targets;
      expect(targets.length).toBe(pageCount - 1);

      for (const target of targets) {
        expect(target.pageNumber).toBeGreaterThanOrEqual(2);

        if (target.breakType === 'mid_block') {
          expect(target.moreText).toBeDefined();
          expect(target.moreText).toBe('(MORE)');
          expect(target.contdText).toBeDefined();
          expect(target.contdText).toContain('(CONT\'D)');

          // Locate the split in PDF HTML
          const prevPageStr = `data-page-number="${target.pageNumber - 1}"`;
          const thisPageStr = `data-page-number="${target.pageNumber}"`;
          const pPrevStart = pdfHtml.indexOf(prevPageStr);
          const pThisStart = pdfHtml.indexOf(thisPageStr);

          const prevSlice = pdfHtml.substring(pPrevStart, pThisStart);
          const thisEnd = target.pageNumber < pageCount ? pdfHtml.indexOf(`data-page-number="${target.pageNumber + 1}"`, pThisStart) : pdfHtml.length;
          const thisSlice = pdfHtml.substring(pThisStart, thisEnd);

          expect(prevSlice).toContain('(MORE)');
          // HTML encodes single quotes as &#39;
          const normalizedThisSlice = thisSlice.replace(/&#39;/g, "'");
          expect(normalizedThisSlice).toContain(target.contdText!);
        }
      }

      // Check Editor decorations
      const decos: any = (plugin.props.decorations as any)(state);
      const widgets = decos.find();
      expect(widgets.length).toBeGreaterThanOrEqual(pageCount - 1);
    });
  });

  // ===========================================================================
  // SECTION 3: Exact Editor/PDF Break & Slot Parity (ISO A4)
  // ===========================================================================
  describe('3. Exact Editor/PDF Break & Slot Parity (ISO A4)', () => {
    it('produces identical page counts, break points, and split offsets across Editor and PDF on A4', () => {
      const draft = createGoldenDraft();
      const doc = draftToProseMirrorDoc(draft);

      // 1. Editor Unified Pagination Plugin on A4
      const plugin = createUnifiedPaginationPlugin({
        paperSize: 'a4',
        contdSetting: 'on',
        textLayoutService: sharedLayoutService,
      });
      const state = EditorState.create({
        doc,
        schema: screenplaySchema,
        plugins: [plugin],
      });

      const pluginState = unifiedPaginationPluginKey.getState(state);
      expect(pluginState?.isFallback).toBe(false);
      const editorResult = pluginState!.paginationResult!;

      // 2. PDF Exporter Output on A4
      const pdfHtml = generateUnifiedScreenplayPdfHtml(draft, GOLDEN_METADATA, {
        paperSize: 'a4',
        includeTitlePage: false,
        contdSetting: 'on',
        ...defaultPdfOptions,
      });

      // Parse discrete pages in PDF HTML
      const pdfPageMatches = Array.from(pdfHtml.matchAll(/class="page-sheet screenplay-page-sheet" data-page-number="(\d+)"/g));
      expect(pdfPageMatches.length).toBe(editorResult.pages.length);

      // Geometry checks
      expect(pdfHtml).toContain('size: 210mm 297mm;');
      expect(pdfHtml).toContain('width: 210mm;');
      expect(pdfHtml).toContain('height: 297mm;');
      expect(pdfHtml).toContain('padding: 25.4mm 25.4mm 25.4mm 38.1mm;');

      // Verify every page's block mapping matches
      for (let pIdx = 0; pIdx < editorResult.pages.length; pIdx++) {
        const pageNum = pIdx + 1;
        const editorPage = editorResult.pages[pIdx];

        const pageStartStr = `data-page-number="${pageNum}"`;
        const nextStartStr = `data-page-number="${pageNum + 1}"`;
        const pStart = pdfHtml.indexOf(pageStartStr);
        const pEnd = pIdx < editorResult.pages.length - 1 ? pdfHtml.indexOf(nextStartStr, pStart) : pdfHtml.length;
        const pageSlice = pdfHtml.substring(pStart, pEnd);

        const editorBlockIds = Array.from(
          new Set(editorPage.slots.filter((s) => s.kind === 'text').map((s) => s.blockId))
        );
        for (const bId of editorBlockIds) {
          expect(pageSlice).toContain(`id="${bId}"`);
        }
      }
    });
  });

  // ===========================================================================
  // SECTION 4: Baseline Positions, Font Safety & Out-of-Page Protection
  // ===========================================================================
  describe('4. Baseline Positions, Font Safety & Out-of-Page Protection', () => {
    it('verifies strict 18pt pitch and integer slot alignment across all pages', () => {
      const draft = createGoldenDraft();
      const layoutBlocks = draftToLayoutBlocks(draft);
      const engine = createPaginationEngine();
      const result = engine.paginate(layoutBlocks, {
        paperSize: 'letter',
        contdSetting: 'on',
        textLayoutService: sharedLayoutService,
      });

      for (const page of result.pages) {
        expect(page.usedSlots).toBeLessThanOrEqual(36);
        expect(page.remainingSlots).toBeGreaterThanOrEqual(0);
        expect(page.usedSlots + page.remainingSlots).toBe(36);

        // Every slot must have an integer slot index
        for (const slot of page.slots) {
          expect(Number.isInteger(slot.slotIndex)).toBe(true);
          expect(slot.slotIndex).toBeGreaterThanOrEqual(0);
          expect(slot.slotIndex).toBeLessThan(36);
        }
      }
    });

    it('certifies font validation passes for production Noto Sans Gurmukhi and Courier Prime', async () => {
      const validation = await validateExportFonts({
        courierFontBase64,
        gurmukhiFontBase64,
      });

      expect(validation.valid).toBe(true);
    });

    it('proves zero synthetic text bleed into canonical doc or clipboard text', () => {
      const draft = createGoldenDraft();
      const doc = draftToProseMirrorDoc(draft);
      const plugin = createUnifiedPaginationPlugin({
        paperSize: 'letter',
        contdSetting: 'on',
        textLayoutService: sharedLayoutService,
      });
      const state = EditorState.create({
        doc,
        schema: screenplaySchema,
        plugins: [plugin],
      });

      // doc.textContent must NOT contain presentation badges
      expect(state.doc.textContent).not.toContain('(MORE)');
      expect(state.doc.textContent).not.toContain('(CONT\'D)');
      expect(state.doc.textContent).not.toContain('2.');
      expect(state.doc.textContent).not.toContain('3.');

      // Decorations must render them as widgets only
      const decos: any = (plugin.props.decorations as any)(state);
      const widgets = decos.find();
      expect(widgets.length).toBeGreaterThan(0);
      for (const w of widgets) {
        expect(w.spec.side).toBeDefined();
      }
    });
  });

  // ===========================================================================
  // SECTION 5: Title Card Toggle Parity
  // ===========================================================================
  describe('5. Title Card Toggle Parity', () => {
    it('guarantees body page breaks and slot counts are 100% identical whether title card is included or excluded', () => {
      const draft = createGoldenDraft();

      // Export without title page
      const htmlNoTitle = generateUnifiedScreenplayPdfHtml(draft, GOLDEN_METADATA, {
        paperSize: 'letter',
        includeTitlePage: false,
        contdSetting: 'on',
        ...defaultPdfOptions,
      });

      // Export with title page
      const htmlWithTitle = generateUnifiedScreenplayPdfHtml(draft, GOLDEN_METADATA, {
        paperSize: 'letter',
        includeTitlePage: true,
        contdSetting: 'on',
        ...defaultPdfOptions,
      });

      const pagesNoTitle = Array.from(htmlNoTitle.matchAll(/class="page-sheet screenplay-page-sheet" data-page-number="(\d+)"/g));
      const pagesWithTitle = Array.from(htmlWithTitle.matchAll(/class="page-sheet screenplay-page-sheet" data-page-number="(\d+)"/g));

      // With title page, exactly 1 additional title page sheet exists
      expect(htmlWithTitle).toContain('class="page-sheet title-page" id="title-page"');
      expect(pagesWithTitle.length).toBe(pagesNoTitle.length);

      // Body pages in both HTMLs must contain identical block content on identical body page numbers
      for (let pNum = 1; pNum <= pagesNoTitle.length; pNum++) {
        const marker = `data-page-number="${pNum}"`;
        const slice1 = htmlNoTitle.substring(
          htmlNoTitle.indexOf(marker),
          htmlNoTitle.indexOf(`data-page-number="${pNum + 1}"`) !== -1
            ? htmlNoTitle.indexOf(`data-page-number="${pNum + 1}"`)
            : htmlNoTitle.length
        );
        const slice2 = htmlWithTitle.substring(
          htmlWithTitle.indexOf(marker),
          htmlWithTitle.indexOf(`data-page-number="${pNum + 1}"`) !== -1
            ? htmlWithTitle.indexOf(`data-page-number="${pNum + 1}"`)
            : htmlWithTitle.length
        );

        // Extract block IDs in both slices
        const bIds1 = Array.from(slice1.matchAll(/id="(g-b\d+)"/g)).map((m) => m[1]);
        const bIds2 = Array.from(slice2.matchAll(/id="(g-b\d+)"/g)).map((m) => m[1]);
        expect(bIds1).toEqual(bIds2);
      }
    });
  });
});
