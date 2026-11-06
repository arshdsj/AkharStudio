/**
 * pagination-engine.test.ts - Unit & Integration Tests for Pure Pagination Engine (M1C)
 * Governing Context: AKHAR-ARCH-PAG — Milestone M1C
 */

import { describe, it, expect } from 'vitest';
import {
  createPaginationEngine,
  createPageProfile,
  ScreenplayBlockInput,
} from '../src/core/layout/paginationEngine';
import { createTextLayoutService, LayoutLine } from '../src/core/layout/textLayoutService';
import { IFontMetricsProvider } from '../src/core/layout/fontMetrics';

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
    it('1.1 verifies US Letter physical geometry and exact 36-slot capacity', () => {
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
      expect(profile.linePitchPt).toBe(18.0);
      expect(profile.slotCapacity).toBe(36);
      expect(profile.bottomSafetyBufferPt).toBe(0.0);
      expect(profile.headerTopPt).toBe(36.0);
    });

    it('1.2 verifies ISO A4 physical geometry and exact 38-slot capacity with 13.89pt safety buffer', () => {
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
      expect(profile.linePitchPt).toBe(18.0);
      expect(profile.slotCapacity).toBe(38);
      expect(profile.bottomSafetyBufferPt).toBe(13.89);
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
      expect(res.pages[0].remainingSlots).toBe(34); // 36 - 2
      expect(res.pages[0].isFinalPage).toBe(true);
      expect(res.pages[0].hasHeader).toBe(false); // First page suppresses header
    });

    it('2.3 paginates exactly one full page (36 slots on Letter) without creating a second page', () => {
      const blocks: ScreenplayBlockInput[] = [
        {
          id: 'b1',
          type: 'action',
          text: '36-line action block',
          lines: createSyntheticLines(36, 'FullPageLine'),
        },
      ];

      const res = engine.paginate(blocks, { paperSize: 'letter' });
      expect(res.pages.length).toBe(1);
      expect(res.pages[0].usedSlots).toBe(36);
      expect(res.pages[0].remainingSlots).toBe(0);
      expect(res.pages[0].isFinalPage).toBe(true);
      expect(res.totalPages).toBe(1);
    });

    it('2.4 breaks onto page 2 when document exceeds capacity by exactly 1 slot', () => {
      const blocks: ScreenplayBlockInput[] = [
        {
          id: 'b1',
          type: 'action',
          text: '37-line action block',
          lines: createSyntheticLines(37, 'OverLine'),
        },
      ];

      const res = engine.paginate(blocks, { paperSize: 'letter' });
      expect(res.pages.length).toBe(2);
      expect(res.pages[0].usedSlots).toBe(36);
      expect(res.pages[0].isFinalPage).toBe(false);
      expect(res.pages[1].usedSlots).toBe(1);
      expect(res.pages[1].isFinalPage).toBe(true);
      expect(res.pages[1].hasHeader).toBe(true);
      expect(res.pages[1].headerText).toBe('2.');
      expect(res.totalUsedSlots).toBe(37);
    });

    it('2.5 never generates an empty trailing blank page', () => {
      const blocks: ScreenplayBlockInput[] = [
        { id: 'b1', type: 'action', text: 'Page 1 text', lines: createSyntheticLines(36) },
        { id: 'b2', type: 'action', text: 'Page 2 text', lines: createSyntheticLines(36) },
      ];

      const res = engine.paginate(blocks, { paperSize: 'letter' });
      // Exactly 72 slots spanning exactly 2 pages
      expect(res.pages.length).toBe(2);
      expect(res.pages[0].usedSlots).toBe(36);
      expect(res.pages[1].usedSlots).toBe(36);
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
      // Fill page 1 up to slot 34 (34 slots used, 2 remaining on 36-slot Letter page)
      const blocks: ScreenplayBlockInput[] = [
        { id: 'filler', type: 'action', text: 'Filler', lines: createSyntheticLines(34, 'Filler') },
        { id: 'sc1', type: 'scene_heading', text: 'EXT. VILLAGE - DAY', lines: createSyntheticLines(1, 'Scene') },
        { id: 'a1', type: 'action', text: 'Action follows', lines: createSyntheticLines(3, 'Follow') },
      ];

      const res = engine.paginate(blocks, { paperSize: 'letter' });
      expect(res.pages.length).toBe(2);

      // Page 1 should only contain the 34 filler lines; scene heading moved to page 2!
      expect(res.pages[0].usedSlots).toBe(34);
      expect(res.pages[0].slots[33].blockId).toBe('filler');

      // Page 2 starts with Scene Heading on slot 0 (blank line above suppressed at top of page)
      expect(res.pages[1].slots[0].blockId).toBe('sc1');
      expect(res.pages[1].slots[0].kind).toBe('text');
      expect(res.diagnostics.orphanPreventedCount).toBeGreaterThan(0);
    });

    it('3.3 protects character cue from being stranded on the last slot without dialogue', () => {
      // Fill page 1 up to slot 35 (35 slots used, exactly 1 remaining on 36-slot Letter page)
      const blocks: ScreenplayBlockInput[] = [
        { id: 'filler', type: 'action', text: 'Filler', lines: createSyntheticLines(35, 'Filler') },
        { id: 'c1', type: 'character', text: 'SURJIT', lines: createSyntheticLines(1, 'Character') },
        { id: 'd1', type: 'dialogue', text: 'Hello there.', lines: createSyntheticLines(2, 'Dialogue') },
      ];

      const res = engine.paginate(blocks, { paperSize: 'letter' });
      expect(res.pages.length).toBe(2);

      // Page 1 should have filler (and not character cue alone)
      expect(res.pages[0].usedSlots).toBe(35);
      // Page 2 should have Character on slot 0 followed by Dialogue
      expect(res.pages[1].slots[0].blockId).toBe('c1');
      expect(res.pages[1].slots[0].kind).toBe('text');
      expect(res.pages[1].slots[1].blockId).toBe('d1');
      expect(res.pages[1].slots[2].blockId).toBe('d1');
    });

    it('3.4 protects parenthetical and character cue together when nearing page bottom', () => {
      // Fill page 1 up to slot 34 (2 slots remaining)
      // Character (1) + Parenthetical (1) + Dialogue (2) requires 4 slots!
      const blocks: ScreenplayBlockInput[] = [
        { id: 'filler', type: 'action', text: 'Filler', lines: createSyntheticLines(34, 'Filler') },
        { id: 'c1', type: 'character', text: 'SURJIT', lines: createSyntheticLines(1, 'Cue') },
        { id: 'p1', type: 'parenthetical', text: '(whispering)', lines: createSyntheticLines(1, 'Paren') },
        { id: 'd1', type: 'dialogue', text: 'Be very quiet.', lines: createSyntheticLines(2, 'Dial') },
      ];

      const res = engine.paginate(blocks, { paperSize: 'letter' });
      expect(res.pages.length).toBe(2);
      expect(res.pages[0].usedSlots).toBe(34);
      // Character and Parenthetical must both move to page 2 together!
      expect(res.pages[1].slots[0].blockId).toBe('c1');
      expect(res.pages[1].slots[1].blockId).toBe('p1');
      expect(res.pages[1].slots[2].blockId).toBe('d1');
    });

    it('3.5 gracefully handles an oversized block exceeding total page capacity', () => {
      // 50-line action block on 36-slot Letter page
      const blocks: ScreenplayBlockInput[] = [
        { id: 'huge', type: 'action', text: 'Huge block', lines: createSyntheticLines(50, 'Huge') },
      ];

      const res = engine.paginate(blocks, { paperSize: 'letter' });
      expect(res.pages.length).toBe(2);
      expect(res.pages[0].usedSlots).toBe(36);
      expect(res.pages[1].usedSlots).toBe(14); // 50 - 36 = 14
      expect(res.totalUsedSlots).toBe(50);
    });
  });

  // ===========================================================================
  // SECTION 4: DIALOGUE CONTINUATION & (MORE) / (CONT'D)
  // ===========================================================================
  describe('4. Dialogue Continuation & Presentation Markers', () => {
    it('4.1 splits a long dialogue block across a page boundary with (MORE) and (CONT\'D)', () => {
      // 30 filler lines, leaving 6 slots on page 1 (Letter capacity 36)
      // Character cue = 1 slot (slot 31, with 1 blank above at slot 30). Used = 32 slots.
      // Remaining on page 1 = 4 slots.
      // Dialogue has 6 lines.
      // Can split: 3 dialogue lines on page 1 + 1 slot (MORE) = 4 slots (fills page 1).
      // Page 2: slot 0 is SURJIT (CONT'D), followed by remaining 3 dialogue lines!
      const blocks: ScreenplayBlockInput[] = [
        { id: 'filler', type: 'action', text: 'Filler', lines: createSyntheticLines(29, 'Filler') },
        { id: 'c1', type: 'character', text: 'SURJIT', characterName: 'SURJIT', lines: createSyntheticLines(1, 'SURJIT') },
        { id: 'd1', type: 'dialogue', text: 'Speech', lines: createSyntheticLines(6, 'SpeechLine') },
      ];

      const res = engine.paginate(blocks, { paperSize: 'letter' });
      expect(res.pages.length).toBe(2);

      const p1Slots = res.pages[0].slots;
      expect(p1Slots.length).toBe(36);

      // Check the end of page 1
      const lastSlotP1 = p1Slots[35];
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
      // Fill page 1 up to slot 34 (2 slots remaining).
      // A character cue takes 1 slot, leaving only 1 slot.
      // Minimum dialogue before split is 2 lines (+1 slot for MORE = 3 slots).
      // So character cue + dialogue must both move to page 2!
      const blocks: ScreenplayBlockInput[] = [
        { id: 'filler', type: 'action', text: 'Filler', lines: createSyntheticLines(34, 'Filler') },
        { id: 'c1', type: 'character', text: 'SURJIT', lines: createSyntheticLines(1, 'SURJIT') },
        { id: 'd1', type: 'dialogue', text: 'Speech', lines: createSyntheticLines(4, 'Speech') },
      ];

      const res = engine.paginate(blocks, { paperSize: 'letter' });
      expect(res.pages.length).toBe(2);
      expect(res.pages[0].usedSlots).toBe(34);
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
        { id: 'block_spans', type: 'action', text: 'Spanning', lines: createSyntheticLines(35) },
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
      expect(res.pages[0].profile.slotCapacity).toBe(38); // A4 has 38 slots
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
});
