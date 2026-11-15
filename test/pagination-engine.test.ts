/**
 * pagination-engine.test.ts - Unit & Integration Tests for Pure Pagination Engine (M1C)
 * Governing Context: AKHAR-ARCH-PAG — Milestone M1C
 */

import { describe, it, expect } from 'vitest';
import {
  createPaginationEngine,
  createPageProfile,
  ScreenplayBlockInput,
  buildLineBreakCacheKey,
  LineBreakLRUCache,
} from '../src/core/layout/paginationEngine';
import { createTextLayoutService, LayoutLine } from '../src/core/layout/textLayoutService';
import { IFontMetricsProvider } from '../src/core/layout/fontMetrics';
import { docToLayoutBlocks } from '../src/core/layout/paginationAdapter';
import { screenplaySchema } from '../src/core/editor/schema';

/**
 * Helper to generate synthetic layout lines for testing pure slot accounting.
 */
function createSyntheticLines(count: number, prefix = 'Line'): LayoutLine[] {
  const lines: LayoutLine[] = [];
  let offset = 0;
  for (let i = 0; i < count; i++) {
    const text = `${prefix} ${i + 1}\n`;
    lines.push({
      text,
      sourceStartOffset: offset,
      sourceEndOffset: offset + text.length,
      measuredWidthPt: 200,
      fullWidthPt: 200,
      isOverflow: false,
      breakReason: 'newline',
    });
    offset += text.length;
  }
  return lines;
}

/**
 * Creates a deterministic mock metrics provider for end-to-end tests.
 */
function createMockMetricsProvider(): IFontMetricsProvider {
  return {
    ensureLoaded: async () => ({ loaded: true, isFallback: false, status: 'ready' }),
    getStatus: () => ({ loaded: true, isFallback: false, status: 'ready' }),
    measureWidth: (text) => text.length * 8.0,
    getLineBoxMetrics: (fontSizePt = 12) => ({
      fontSizePt,
      ascentPt: 12,
      descentPt: 4,
      lineBoxHeightPt: 16,
    }),
  };
}

describe('Milestone M1C: Pure Pagination Engine', () => {
  const engine = createPaginationEngine();

  // ===========================================================================
  // SECTION 1: PAGE GEOMETRY & CAPACITIES
  // ===========================================================================
  describe('1. Page Geometry & Profiles', () => {
    it('1.1 verifies US Letter physical geometry and exact 43-slot capacity', () => {
      const profile = createPageProfile('letter');
      expect(profile.paperSize).toBe('letter');
      expect(profile.widthPt).toBe(612.0);
      expect(profile.heightPt).toBe(792.0);
      expect(profile.marginTopPt).toBe(72.0);
      expect(profile.marginBottomPt).toBe(72.0);
      expect(profile.marginLeftPt).toBe(108.0);
      expect(profile.marginRightPt).toBe(72.0);
      expect(profile.printableWidthPt).toBe(432.0);
      expect(profile.printableHeightPt).toBe(648.0);
      expect(profile.linePitchPt).toBe(15.0);
      expect(profile.slotCapacity).toBe(43);
      expect(profile.bottomSafetyBufferPt).toBe(3.0);
      expect(profile.headerTopPt).toBe(36.0);
    });

    it('1.2 verifies ISO A4 physical geometry and exact 46-slot capacity with 7.89pt safety buffer', () => {
      const profile = createPageProfile('a4');
      expect(profile.paperSize).toBe('a4');
      expect(profile.widthPt).toBe(595.28);
      expect(profile.heightPt).toBe(841.89);
      expect(profile.marginTopPt).toBe(72.0);
      expect(profile.marginBottomPt).toBe(72.0);
      expect(profile.marginLeftPt).toBe(108.0);
      expect(profile.marginRightPt).toBe(72.0);
      expect(profile.printableWidthPt).toBe(415.28);
      expect(profile.printableHeightPt).toBe(697.89);
      expect(profile.linePitchPt).toBe(15.0);
      expect(profile.slotCapacity).toBe(46);
      expect(profile.bottomSafetyBufferPt).toBe(7.89);
      expect(profile.headerTopPt).toBe(36.0);
    });

    it('1.3 confirms that running page header consumes zero printable line slots', () => {
      const letter = createPageProfile('letter');
      const a4 = createPageProfile('a4');
      // Slot capacity is strictly floor(printableHeight / linePitch)
      expect(letter.slotCapacity).toBe(Math.floor(letter.printableHeightPt / letter.linePitchPt));
      expect(a4.slotCapacity).toBe(Math.floor(a4.printableHeightPt / a4.linePitchPt));
      // Header at 36pt sits completely within the 72pt top margin
      expect(letter.headerTopPt).toBeLessThan(letter.marginTopPt);
      expect(a4.headerTopPt).toBeLessThan(a4.marginTopPt);
    });

    it('1.4 rejects invalid geometry profiles with clear descriptive errors', () => {
      expect(() => createPageProfile('letter', { widthPt: 0 })).toThrow('invalid widthPt');
      expect(() => createPageProfile('letter', { heightPt: -500 })).toThrow('invalid heightPt');
      expect(() => createPageProfile('letter', { linePitchPt: 0 })).toThrow('invalid linePitchPt');
      // Margins exceeding page dimensions
      expect(() => createPageProfile('letter', { marginLeftPt: 350, marginRightPt: 300 })).toThrow('printable width is non-positive');
      expect(() => createPageProfile('letter', { marginTopPt: 400, marginBottomPt: 400 })).toThrow('printable height is non-positive');
      expect(() => createPageProfile('letter', { linePitchPt: 700 })).toThrow('exceeds printable height');
    });
  });

  // ===========================================================================
  // SECTION 2: BASIC PAGINATION BEHAVIOR
  // ===========================================================================
  describe('2. Basic Pagination Scenarios', () => {
    it('2.1 handles empty document by returning 0 pages and 0 slots used', () => {
      const res = engine.paginate([]);
      expect(res.pages.length).toBe(0);
      expect(res.totalPages).toBe(0);
      expect(res.totalUsedSlots).toBe(0);
      expect(res.diagnostics.pageCount).toBe(0);
    });

    it('2.2 paginates a single short block onto exactly 1 page', () => {
      const blocks: ScreenplayBlockInput[] = [
        {
          id: 'b1',
          type: 'action',
          text: 'Surjit looks out the window.',
          lines: createSyntheticLines(2, 'Action'),
        },
      ];

      const res = engine.paginate(blocks);
      expect(res.pages.length).toBe(1);
      expect(res.pages[0].pageNumber).toBe(1);
      expect(res.pages[0].usedSlots).toBe(2);
      expect(res.pages[0].remainingSlots).toBe(41); // 43 - 2
      expect(res.pages[0].isFinalPage).toBe(true);
      expect(res.pages[0].hasHeader).toBe(false); // First page suppresses header
    });

    it('2.3 paginates exactly one full page (43 slots on Letter) without creating a second page', () => {
      const blocks: ScreenplayBlockInput[] = [
        {
          id: 'b1',
          type: 'action',
          text: '43-line action block',
          lines: createSyntheticLines(43, 'FullPageLine'),
        },
      ];

      const res = engine.paginate(blocks, { paperSize: 'letter' });
      expect(res.pages.length).toBe(1);
      expect(res.pages[0].usedSlots).toBe(43);
      expect(res.pages[0].remainingSlots).toBe(0);
      expect(res.pages[0].isFinalPage).toBe(true);
      expect(res.totalPages).toBe(1);
    });

    it('2.4 breaks onto page 2 when document exceeds capacity by exactly 1 slot', () => {
      const blocks: ScreenplayBlockInput[] = [
        {
          id: 'b1',
          type: 'action',
          text: '44-line action block',
          lines: createSyntheticLines(44, 'OverLine'),
        },
      ];

      const res = engine.paginate(blocks, { paperSize: 'letter' });
      expect(res.pages.length).toBe(2);
      expect(res.pages[0].usedSlots).toBe(43);
      expect(res.pages[0].isFinalPage).toBe(false);
      expect(res.pages[1].usedSlots).toBe(1);
      expect(res.pages[1].isFinalPage).toBe(true);
      expect(res.pages[1].hasHeader).toBe(true);
      expect(res.pages[1].headerText).toBe('2.');
      expect(res.totalUsedSlots).toBe(44);
    });

    it('2.5 never generates an empty trailing blank page', () => {
      const blocks: ScreenplayBlockInput[] = [
        { id: 'b1', type: 'action', text: 'Page 1 text', lines: createSyntheticLines(43) },
        { id: 'b2', type: 'action', text: 'Page 2 text', lines: createSyntheticLines(43) },
      ];

      const res = engine.paginate(blocks, { paperSize: 'letter' });
      // Exactly 86 slots spanning exactly 2 pages
      expect(res.pages.length).toBe(2);
      expect(res.pages[0].usedSlots).toBe(43);
      expect(res.pages[1].usedSlots).toBe(43);
      expect(res.pages[1].isFinalPage).toBe(true);
    });
  });

  // ===========================================================================
  // SECTION 3: BLOCK TYPES & SPACING RULES
  // ===========================================================================
  describe('3. Screenplay Block Types & Placement Rules', () => {
    it('3.1 inserts 1 blank line slot before action paragraphs, suppressed at page top', () => {
      const blocks: ScreenplayBlockInput[] = [
        { id: 'a1', type: 'action', text: 'Action 1', lines: createSyntheticLines(2, 'A1') },
        { id: 'a2', type: 'action', text: 'Action 2', lines: createSyntheticLines(3, 'A2') },
      ];

      const res = engine.paginate(blocks, { paperSize: 'letter' });
      expect(res.pages.length).toBe(1);
      const slots = res.pages[0].slots;

      // Slot 0, 1: Action 1
      expect(slots[0].kind).toBe('text');
      expect(slots[1].kind).toBe('text');
      // Slot 2: Blank line between action blocks
      expect(slots[2].kind).toBe('blank_line');
      // Slot 3, 4, 5: Action 2
      expect(slots[3].kind).toBe('text');
      expect(slots[4].kind).toBe('text');
      expect(slots[5].kind).toBe('text');

      expect(res.pages[0].usedSlots).toBe(6);
    });

    it('3.2 protects scene headings from being stranded at the bottom of a page (Anti-Orphan)', () => {
      // Fill page 1 up to slot 39 (39 slots used, 4 remaining on 43-slot Letter page)
      const blocks: ScreenplayBlockInput[] = [
        { id: 'filler', type: 'action', text: 'Filler', lines: createSyntheticLines(39, 'Filler') },
        { id: 'sc1', type: 'scene_heading', text: 'EXT. VILLAGE - DAY', lines: createSyntheticLines(1, 'Scene') },
        { id: 'a1', type: 'action', text: 'Action follows', lines: createSyntheticLines(3, 'Follow') },
      ];

      const res = engine.paginate(blocks, { paperSize: 'letter' });
      expect(res.pages.length).toBe(2);

      // Page 1 should only contain the 39 filler lines; scene heading moved to page 2!
      expect(res.pages[0].usedSlots).toBe(39);
      expect(res.pages[0].slots[38].blockId).toBe('filler');

      // Page 2 starts with Scene Heading (with blank lines preserved)
      expect(res.pages[1].slots.some((s) => s.blockId === 'sc1' && s.kind === 'text')).toBe(true);
      expect(res.diagnostics.orphanPreventedCount).toBeGreaterThan(0);
    });

    it('3.3 protects character cue from being stranded on the last slot without dialogue', () => {
      // Fill page 1 up to slot 41 (41 slots used, 2 remaining on 43-slot Letter page)
      const blocks: ScreenplayBlockInput[] = [
        { id: 'filler', type: 'action', text: 'Filler', lines: createSyntheticLines(41, 'Filler') },
        { id: 'c1', type: 'character', text: 'SURJIT', lines: createSyntheticLines(1, 'Character') },
        { id: 'd1', type: 'dialogue', text: 'Hello there.', lines: createSyntheticLines(2, 'Dialogue') },
      ];

      const res = engine.paginate(blocks, { paperSize: 'letter' });
      expect(res.pages.length).toBe(2);

      // Page 1 should have filler (and not character cue alone)
      expect(res.pages[0].usedSlots).toBe(41);
      // Page 2 should have Character on slot 0 followed by Dialogue
      expect(res.pages[1].slots[0].blockId).toBe('c1');
      expect(res.pages[1].slots[0].kind).toBe('text');
      expect(res.pages[1].slots[1].blockId).toBe('d1');
      expect(res.pages[1].slots[2].blockId).toBe('d1');
    });

    it('3.4 protects parenthetical and character cue together when nearing page bottom', () => {
      // Fill page 1 up to slot 39 (4 slots remaining)
      // Character (1) + Parenthetical (1) + Dialogue (2) + blank requires 5 slots!
      const blocks: ScreenplayBlockInput[] = [
        { id: 'filler', type: 'action', text: 'Filler', lines: createSyntheticLines(39, 'Filler') },
        { id: 'c1', type: 'character', text: 'SURJIT', lines: createSyntheticLines(1, 'Cue') },
        { id: 'p1', type: 'parenthetical', text: '(whispering)', lines: createSyntheticLines(1, 'Paren') },
        { id: 'd1', type: 'dialogue', text: 'Be very quiet.', lines: createSyntheticLines(2, 'Dial') },
      ];

      const res = engine.paginate(blocks, { paperSize: 'letter' });
      expect(res.pages.length).toBe(2);
      expect(res.pages[0].usedSlots).toBe(39);
      // Character and Parenthetical must both move to page 2 together!
      expect(res.pages[1].slots[0].blockId).toBe('c1');
      expect(res.pages[1].slots[1].blockId).toBe('p1');
      expect(res.pages[1].slots[2].blockId).toBe('d1');
    });

    it('3.5 gracefully handles an oversized block exceeding total page capacity', () => {
      // 70-line action block on 43-slot Letter page
      const blocks: ScreenplayBlockInput[] = [
        { id: 'huge', type: 'action', text: 'Huge block', lines: createSyntheticLines(70, 'Huge') },
      ];

      const res = engine.paginate(blocks, { paperSize: 'letter' });
      expect(res.pages.length).toBe(2);
      expect(res.pages[0].usedSlots).toBe(43);
      expect(res.pages[1].usedSlots).toBe(27); // 70 - 43 = 27
      expect(res.totalUsedSlots).toBe(70);
    });
  });

  // ===========================================================================
  // SECTION 4: DIALOGUE CONTINUATION & (MORE) / (CONT'D)
  // ===========================================================================
  describe('4. Dialogue Continuation & Presentation Markers', () => {
    it('4.1 splits a long dialogue block across a page boundary with (MORE) and (CONT\'D)', () => {
      // 36 filler lines, leaving 7 slots on page 1 (Letter capacity 43)
      // Character cue = 1 slot (slot 37, with 1 blank above at slot 36). Used = 38 slots.
      // Remaining on page 1 = 5 slots.
      // Dialogue has 6 lines.
      // Can split: 4 dialogue lines on page 1 + 1 slot (MORE) = 5 slots (fills page 1).
      // Page 2: slot 0 is SURJIT (CONT'D), followed by remaining 2 dialogue lines!
      const blocks: ScreenplayBlockInput[] = [
        { id: 'filler', type: 'action', text: 'Filler', lines: createSyntheticLines(36, 'Filler') },
        { id: 'c1', type: 'character', text: 'SURJIT', characterName: 'SURJIT', lines: createSyntheticLines(1, 'SURJIT') },
        { id: 'd1', type: 'dialogue', text: 'Speech', lines: createSyntheticLines(6, 'SpeechLine') },
      ];

      const res = engine.paginate(blocks, { paperSize: 'letter' });
      expect(res.pages.length).toBe(2);

      const p1Slots = res.pages[0].slots;
      expect(p1Slots.length).toBe(43);

      // Check the end of page 1
      const lastSlotP1 = p1Slots[42];
      expect(lastSlotP1.kind).toBe('more');
      expect(lastSlotP1.presentationText).toBe('(MORE)');
      expect(lastSlotP1.isPresentationOnly).toBe(true);

      // Check the beginning of page 2
      const p2Slots = res.pages[1].slots;
      const firstSlotP2 = p2Slots[0];
      expect(firstSlotP2.kind).toBe('contd');
      expect(firstSlotP2.presentationText).toBe("SURJIT (CONT'D)");
      expect(firstSlotP2.isPresentationOnly).toBe(true);

      // Remaining dialogue lines resume on page 2
      expect(p2Slots[1].blockId).toBe('d1');
      expect(p2Slots[1].kind).toBe('text');
      expect(res.diagnostics.dialogueSplitsCount).toBe(1);
    });

    it('4.2 never inserts (MORE) or (CONT\'D) into the canonical screenplay text', () => {
      const blocks: ScreenplayBlockInput[] = [
        { id: 'filler', type: 'action', text: 'Filler', lines: createSyntheticLines(29, 'Filler') },
        { id: 'c1', type: 'character', text: 'SURJIT', lines: createSyntheticLines(1, 'SURJIT') },
        { id: 'd1', type: 'dialogue', text: 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\n', lines: createSyntheticLines(6, 'Line') },
      ];

      const res = engine.paginate(blocks, { paperSize: 'letter' });

      // Gather all text from non-presentation slots
      const allText = res.pages
        .flatMap((p) => p.slots)
        .filter((s) => !s.isPresentationOnly && s.line)
        .map((s) => s.line!.text)
        .join('');

      // Presentation markers must NOT be in the gathered text
      expect(allText).not.toContain('(MORE)');
      expect(allText).not.toContain("(CONT'D)");

      // Original block texts remain intact
      expect(blocks[1].text).toBe('SURJIT');
      expect(blocks[2].text).toContain('Line 1');
    });

    it('4.3 pushes entire dialogue to next page if fewer than 2 dialogue lines would fit on current page', () => {
      // Fill page 1 up to slot 40 (3 slots remaining on 43-slot page).
      // Needs blank (1) + cue (1) + min 2 dialogue + 1 MORE = 5 slots.
      // So character cue + dialogue must both move to page 2!
      const blocks: ScreenplayBlockInput[] = [
        { id: 'filler', type: 'action', text: 'Filler', lines: createSyntheticLines(40, 'Filler') },
        { id: 'c1', type: 'character', text: 'SURJIT', lines: createSyntheticLines(1, 'SURJIT') },
        { id: 'd1', type: 'dialogue', text: 'Speech', lines: createSyntheticLines(4, 'Speech') },
      ];

      const res = engine.paginate(blocks, { paperSize: 'letter' });
      expect(res.pages.length).toBe(2);
      expect(res.pages[0].usedSlots).toBe(40);
      expect(res.pages[1].slots[0].blockId).toBe('c1');
      expect(res.pages[1].slots[1].blockId).toBe('d1');
      expect(res.diagnostics.dialogueSplitsCount).toBe(0);
      expect(res.diagnostics.orphanPreventedCount).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // SECTION 5: INVARIANTS & INTEGRITY
  // ===========================================================================
  describe('5. Invariants & Source Integrity', () => {
    it('5.1 guarantees exact source line reconstruction without dropping or duplicating lines', () => {
      const sourceLines = createSyntheticLines(75, 'Source');
      const blocks: ScreenplayBlockInput[] = [
        { id: 'b1', type: 'action', text: 'Text 1', lines: sourceLines.slice(0, 30) },
        { id: 'b2', type: 'action', text: 'Text 2', lines: sourceLines.slice(30, 60) },
        { id: 'b3', type: 'action', text: 'Text 3', lines: sourceLines.slice(60, 75) },
      ];

      const res = engine.paginate(blocks, { paperSize: 'letter' });

      // Collect all source lines from the paginated slots
      const paginatedLines = res.pages
        .flatMap((p) => p.slots)
        .filter((s) => !s.isPresentationOnly && s.kind === 'text')
        .map((s) => s.line!);

      expect(paginatedLines.length).toBe(sourceLines.length);

      for (let i = 0; i < sourceLines.length; i++) {
        expect(paginatedLines[i].text).toBe(sourceLines[i].text);
        expect(paginatedLines[i].sourceStartOffset).toBe(sourceLines[i].sourceStartOffset);
        expect(paginatedLines[i].sourceEndOffset).toBe(sourceLines[i].sourceEndOffset);
      }
    });

    it('5.2 guarantees strict determinism over repeated executions with identical input', () => {
      const blocks: ScreenplayBlockInput[] = [
        { id: 'sc1', type: 'scene_heading', text: 'INT. HOUSE - NIGHT', lines: createSyntheticLines(1, 'Scene') },
        { id: 'act1', type: 'action', text: 'Description', lines: createSyntheticLines(15, 'Action') },
        { id: 'c1', type: 'character', text: 'SURJIT', lines: createSyntheticLines(1, 'Cue') },
        { id: 'd1', type: 'dialogue', text: 'Dialogue', lines: createSyntheticLines(8, 'Dial') },
        { id: 'act2', type: 'action', text: 'Action 2', lines: createSyntheticLines(20, 'Action2') },
      ];

      const r1 = engine.paginate(blocks, { paperSize: 'letter' });
      const r2 = engine.paginate(blocks, { paperSize: 'letter' });

      expect(r1.totalPages).toBe(r2.totalPages);
      expect(r1.totalUsedSlots).toBe(r2.totalUsedSlots);
      expect(r1.pages.length).toBe(r2.pages.length);

      for (let p = 0; p < r1.pages.length; p++) {
        expect(r1.pages[p].usedSlots).toBe(r2.pages[p].usedSlots);
        expect(r1.pages[p].slots.length).toBe(r2.pages[p].slots.length);
        for (let s = 0; s < r1.pages[p].slots.length; s++) {
          expect(r1.pages[p].slots[s].kind).toBe(r2.pages[p].slots[s].kind);
          expect(r1.pages[p].slots[s].blockId).toBe(r2.pages[p].slots[s].blockId);
        }
      }
    });

    it('5.3 accurately builds blockPageMap tracking which pages each block spans', () => {
      const blocks: ScreenplayBlockInput[] = [
        { id: 'block_page1', type: 'action', text: 'B1', lines: createSyntheticLines(10) },
        { id: 'block_spans', type: 'action', text: 'Spanning', lines: createSyntheticLines(50) },
      ];

      const res = engine.paginate(blocks, { paperSize: 'letter' });
      expect(res.pages.length).toBe(2);

      const map = res.blockPageMap;
      expect(map.get('block_page1')).toEqual([1]);
      expect(map.get('block_spans')).toEqual([1, 2]);
    });

    it('5.4 integrates end-to-end with M1B TextLayoutService laying out real Gurmukhi text', () => {
      const mockMetrics = createMockMetricsProvider();
      const layoutService = createTextLayoutService(mockMetrics);

      const screenplay: ScreenplayBlockInput[] = [
        {
          id: 'sc1',
          type: 'scene_heading',
          text: 'EXT. AMRITSAR RAILWAY STATION - NIGHT',
        },
        {
          id: 'act1',
          type: 'action',
          text: 'ਸੁਰਜੀਤ ਪਲੇਟਫਾਰਮ ਉੱਤੇ ਤੇਜ਼ੀ ਨਾਲ ਤੁਰ ਰਿਹਾ ਹੈ। ਉਸਦੇ ਹੱਥ ਵਿੱਚ ਇੱਕ ਪੁਰਾਣਾ ਲੱਕੜ ਦਾ ਬਕਸਾ ਹੈ। ਬਾਹਰ ਭਾਰੀ ਮੀਂਹ ਪੈ ਰਿਹਾ ਹੈ।',
        },
        {
          id: 'char1',
          type: 'character',
          text: 'ਸੁਰਜੀਤ',
        },
        {
          id: 'dial1',
          type: 'dialogue',
          text: 'ਕੀ ਕੋਈ ਇੱਥੇ ਹੈ? ਮੈਨੂੰ ਗੁਰੂ ਦੀ ਅਪਾਰ ਕ੍ਰਿੱਪਾ ਦੀ ਲੋੜ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਮੇਰੀ ਮਦਦ ਕਰੋ।',
        },
      ];

      const res = engine.paginate(screenplay, {
        paperSize: 'a4',
        textLayoutService: layoutService,
      });

      expect(res.pages.length).toBe(1);
      expect(res.pages[0].profile.slotCapacity).toBe(46); // A4 has 46 slots in 20px geometry
      expect(res.pages[0].usedSlots).toBeGreaterThan(0);
      expect(res.pages[0].isFinalPage).toBe(true);

      // Verify block types in slots
      const slotTypes = res.pages[0].slots.map((s) => s.blockType);
      expect(slotTypes).toContain('scene_heading');
      expect(slotTypes).toContain('action');
      expect(slotTypes).toContain('character');
      expect(slotTypes).toContain('dialogue');
    });
  });

  describe('6. Bounded LRU Line-Break Cache & Key Generation', () => {
    it('6.1 includes all 7 parameters affecting line-wrapping in cache key', () => {
      const keyPlain = buildLineBreakCacheKey({
        text: 'ਹੈਲੋ ਦੁਨੀਆ',
        bold: false,
        italic: false,
        fontFamily: 'Noto Sans Gurmukhi',
        fontSizePt: 12.0,
        linePitchPt: 15.0,
        availableWidthPt: 432.0,
        fontGeneration: 0,
      });

      expect(keyPlain).toContain('g=0');
      expect(keyPlain).toContain('f=NotoSansGurmukhi');
      expect(keyPlain).toContain('s=12.0');
      expect(keyPlain).toContain('p=15.0');
      expect(keyPlain).toContain('w=432.00');
      expect(keyPlain).toContain('B0');
      expect(keyPlain).toContain('I0');
      expect(keyPlain).toContain('t=ਹੈਲੋ ਦੁਨੀਆ');
    });

    it('6.2 generates different cache keys for bold runs vs plain text', () => {
      const keyPlain = buildLineBreakCacheKey({
        text: 'ਮੇਰਾ ਸਕ੍ਰਿਪਟ ਟੈਕਸਟ',
        bold: false,
        fontFamily: 'Courier Prime',
        fontSizePt: 12.0,
        linePitchPt: 15.0,
        availableWidthPt: 432.0,
        fontGeneration: 0,
      });

      const keyBold = buildLineBreakCacheKey({
        text: 'ਮੇਰਾ ਸਕ੍ਰਿਪਟ ਟੈਕਸਟ',
        bold: true,
        fontFamily: 'Courier Prime',
        fontSizePt: 12.0,
        linePitchPt: 15.0,
        availableWidthPt: 432.0,
        fontGeneration: 0,
      });

      expect(keyPlain).not.toBe(keyBold);
      expect(keyPlain).toContain('B0');
      expect(keyBold).toContain('B1');
    });

    it('6.3 documents with the same text but different widths do not share entries', () => {
      const keyAction = buildLineBreakCacheKey({
        text: 'ਇਹ ਇੱਕ ਲੰਮੀ ਕਹਾਣੀ ਹੈ ਜੋ ਦੋਵੇਂ ਥਾਈਂ ਵਰਤੀ ਗਈ ਹੈ।',
        bold: false,
        fontFamily: 'Noto Sans Gurmukhi',
        fontSizePt: 12.0,
        linePitchPt: 15.0,
        availableWidthPt: 432.0, // Action: 6.0in
        fontGeneration: 1,
      });

      const keyDialogue = buildLineBreakCacheKey({
        text: 'ਇਹ ਇੱਕ ਲੰਮੀ ਕਹਾਣੀ ਹੈ ਜੋ ਦੋਵੇਂ ਥਾਈਂ ਵਰਤੀ ਗਈ ਹੈ।',
        bold: false,
        fontFamily: 'Noto Sans Gurmukhi',
        fontSizePt: 12.0,
        linePitchPt: 15.0,
        availableWidthPt: 252.0, // Dialogue: 3.5in
        fontGeneration: 1,
      });

      expect(keyAction).not.toBe(keyDialogue);
      expect(keyAction).toContain('w=432.00');
      expect(keyDialogue).toContain('w=252.00');
    });

    it('6.4 LRU bounds cache size and evicts oldest items', () => {
      const lru = new LineBreakLRUCache(3);
      const dummyLines = (tag: string): LayoutLine[] => [
        {
          text: tag,
          sourceStartOffset: 0,
          sourceEndOffset: tag.length,
          measuredWidthPt: 100,
          fullWidthPt: 100,
          isOverflow: false,
          breakReason: 'newline',
        },
      ];

      lru.set('key1', dummyLines('1'));
      lru.set('key2', dummyLines('2'));
      lru.set('key3', dummyLines('3'));
      expect(lru.size).toBe(3);

      // Access key1 to make it most recently used: order becomes key2 (oldest), key3, key1
      expect(lru.get('key1')?.[0].text).toBe('1');

      // Insert 4th key: should evict key2
      lru.set('key4', dummyLines('4'));
      expect(lru.size).toBe(3);
      expect(lru.has('key2')).toBe(false);
      expect(lru.has('key1')).toBe(true);
      expect(lru.has('key3')).toBe(true);
      expect(lru.has('key4')).toBe(true);
    });

    it('6.5 cache invalidates completely when fonts load (invalidateFonts)', () => {
      const engine = createPaginationEngine();
      const mockMetrics = createMockMetricsProvider();
      const layoutService = createTextLayoutService(mockMetrics);

      const screenplay: ScreenplayBlockInput[] = [
        { id: 'b1', type: 'action', text: 'ਪਹਿਲੀ ਲਾਈਨ ਜੋ ਕੈਸ਼ ਵਿੱਚ ਜਾਵੇਗੀ।' },
        { id: 'b2', type: 'dialogue', text: 'ਦੂਜੀ ਲਾਈਨ ਜੋ ਕੈਸ਼ ਵਿੱਚ ਜਾਵੇਗੀ।' },
      ];

      // 1. Initial paginate populates cache
      engine.paginate(screenplay, { textLayoutService: layoutService });
      expect(engine.getCacheSize()).toBeGreaterThan(0);
      const sizeBefore = engine.getCacheSize();

      // 2. Invalidate fonts (generation incremented)
      engine.invalidateFonts();
      expect(engine.getCacheSize()).toBe(0);

      // 3. Re-measuring under new generation repopulates with new generation keys
      engine.paginate(screenplay, { textLayoutService: layoutService });
      expect(engine.getCacheSize()).toBe(sizeBefore);
    });

    it('6.6 cache clears when physical geometry changes', () => {
      const engine = createPaginationEngine();
      const mockMetrics = createMockMetricsProvider();
      const layoutService = createTextLayoutService(mockMetrics);

      const screenplay: ScreenplayBlockInput[] = [
        { id: 'b1', type: 'action', text: 'ਪਹਿਲੀ ਲਾਈਨ' },
      ];

      engine.paginate(screenplay, { paperSize: 'letter', textLayoutService: layoutService });
      expect(engine.getCacheSize()).toBe(1);

      // Switch paper profile to A4 -> geometry changed -> cache clears
      engine.paginate(screenplay, { paperSize: 'a4', textLayoutService: layoutService });
      expect(engine.getCacheSize()).toBe(1); // cleared and recomputed 1 item for A4
    });

    it('6.7 supports all 5 ContdSetting options correctly', () => {
      const engine = createPaginationEngine();
      const createSplittingDialogue = (): ScreenplayBlockInput[] => [
        { id: 'filler', type: 'action', text: 'Filler', lines: createSyntheticLines(36, 'Filler') },
        { id: 'c1', type: 'character', text: 'ਮਨਪਰੀਤ', characterName: 'ਮਨਪਰੀਤ', lines: createSyntheticLines(1, 'ਮਨਪਰੀਤ') },
        { id: 'd1', type: 'dialogue', text: 'Speech', lines: createSyntheticLines(8, 'SpeechLine') },
      ];

      // Option 1: 'none' -> 0 more, 0 contd cues
      const resNone = engine.paginate(createSplittingDialogue(), {
        paperSize: 'letter',
        contdSetting: 'none',
      });
      expect(resNone.pages.length).toBe(2);
      const moreSlotsNone = resNone.pages[0].slots.filter((s) => s.kind === 'more');
      const contdSlotsNone = resNone.pages[1].slots.filter((s) => s.kind === 'contd');
      expect(moreSlotsNone.length).toBe(0);
      expect(contdSlotsNone.length).toBe(0);

      // Option 2: 'more_only' -> 1 more on page 0, 0 contd cues on page 1
      const resMore = engine.paginate(createSplittingDialogue(), {
        paperSize: 'letter',
        contdSetting: 'more_only',
      });
      expect(resMore.pages.length).toBe(2);
      const moreSlotsMore = resMore.pages[0].slots.filter((s) => s.kind === 'more');
      const contdSlotsMore = resMore.pages[1].slots.filter((s) => s.kind === 'contd');
      expect(moreSlotsMore.length).toBe(1);
      expect(moreSlotsMore[0].presentationText).toBe('(MORE)');
      expect(contdSlotsMore.length).toBe(0);

      // Option 3: 'contd_only' -> 0 more on page 0, 1 CHARACTER (CONT'D) on page 1
      const resContd = engine.paginate(createSplittingDialogue(), {
        paperSize: 'letter',
        contdSetting: 'contd_only',
      });
      expect(resContd.pages.length).toBe(2);
      const moreSlotsContd = resContd.pages[0].slots.filter((s) => s.kind === 'more');
      const contdSlotsContd = resContd.pages[1].slots.filter((s) => s.kind === 'contd');
      expect(moreSlotsContd.length).toBe(0);
      expect(contdSlotsContd.length).toBe(1);
      expect(contdSlotsContd[0].presentationText).toBe("ਮਨਪਰੀਤ (CONT'D)");

      // Option 4: 'both' -> 1 more on page 0, 1 CHARACTER (CONT'D) on page 1
      const resBoth = engine.paginate(createSplittingDialogue(), {
        paperSize: 'letter',
        contdSetting: 'both',
      });
      expect(resBoth.pages.length).toBe(2);
      const moreSlotsBoth = resBoth.pages[0].slots.filter((s) => s.kind === 'more');
      const contdSlotsBoth = resBoth.pages[1].slots.filter((s) => s.kind === 'contd');
      expect(moreSlotsBoth.length).toBe(1);
      expect(moreSlotsBoth[0].presentationText).toBe('(MORE)');
      expect(contdSlotsBoth.length).toBe(1);
      expect(contdSlotsBoth[0].presentationText).toBe("ਮਨਪਰੀਤ (CONT'D)");

      // Option 5: 'reprint_name' -> 0 more on page 0, 1 CHARACTER (raw name without (CONT'D)) on page 1
      const resReprint = engine.paginate(createSplittingDialogue(), {
        paperSize: 'letter',
        contdSetting: 'reprint_name',
      });
      expect(resReprint.pages.length).toBe(2);
      const moreSlotsReprint = resReprint.pages[0].slots.filter((s) => s.kind === 'more');
      const contdSlotsReprint = resReprint.pages[1].slots.filter((s) => s.kind === 'contd');
      expect(moreSlotsReprint.length).toBe(0);
      expect(contdSlotsReprint.length).toBe(1);
      expect(contdSlotsReprint[0].presentationText).toBe('ਮਨਪਰੀਤ');
    });

    it('6.8 identical text with one bold word produces a distinct marksHash and does not hit the plain-text cache entry', () => {
      const mockMetrics = createMockMetricsProvider();
      let layoutCallCount = 0;
      const layoutService = createTextLayoutService({
        ...mockMetrics,
        measureWidth: (text) => text.length * 8.0,
      });

      const origLayout = layoutService.layoutText.bind(layoutService);
      layoutService.layoutText = (text, constraints) => {
        layoutCallCount++;
        return origLayout(text, constraints);
      };

      const engine = createPaginationEngine();

      // ProseMirror doc 1: All plain text
      const plainDoc = screenplaySchema.node('doc', null, [
        screenplaySchema.node('screenplay_block', { id: 'b1', type: 'action' }, [
          screenplaySchema.text('ਇਹ ਇੱਕ ਸਕ੍ਰਿਪਟ ਲਾਈਨ ਹੈ।'),
        ]),
      ]);

      // ProseMirror doc 2: Same text, but one word ("ਸਕ੍ਰਿਪਟ") is bold
      const mixedDoc = screenplaySchema.node('doc', null, [
        screenplaySchema.node('screenplay_block', { id: 'b2', type: 'action' }, [
          screenplaySchema.text('ਇਹ ਇੱਕ '),
          screenplaySchema.text('ਸਕ੍ਰਿਪਟ', [screenplaySchema.marks.bold.create()]),
          screenplaySchema.text(' ਲਾਈਨ ਹੈ।'),
        ]),
      ]);

      const blocksPlain = docToLayoutBlocks(plainDoc).layoutBlocks;
      const blocksMixed = docToLayoutBlocks(mixedDoc).layoutBlocks;

      expect(blocksPlain[0].text).toBe(blocksMixed[0].text);
      expect(blocksPlain[0].marksHash).toBe('0');
      expect(blocksMixed[0].marksHash).toBe('7-14:B');
      expect(blocksPlain[0].marksHash).not.toBe(blocksMixed[0].marksHash);

      // 1. Paginate plain text -> exactly 1 layout service invocation
      engine.paginate(blocksPlain, { textLayoutService: layoutService });
      expect(layoutCallCount).toBe(1);

      // Re-paginating same plain text hits cache (0 additional layout calls)
      engine.paginate(blocksPlain, { textLayoutService: layoutService });
      expect(layoutCallCount).toBe(1);

      // 2. Paginate mixed text -> must NOT hit plain-text cache entry, layoutCallCount must increment to 2
      engine.paginate(blocksMixed, { textLayoutService: layoutService });
      expect(layoutCallCount).toBe(2);

      // Re-paginating same mixed text hits mixed cache entry (0 additional layout calls)
      engine.paginate(blocksMixed, { textLayoutService: layoutService });
      expect(layoutCallCount).toBe(2);
    });
  });
});
