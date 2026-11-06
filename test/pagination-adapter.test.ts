/**
 * pagination-adapter.test.ts - Unit Tests for Canonical Document Adapter & Position Resolver (M2A)
 * Governing Context: AKHAR-ARCH-PAG — Milestone M2A
 */

import { describe, it, expect } from 'vitest';
import { draftToProseMirrorDoc } from '../src/core/editor/documentAdapter';
import {
  draftToLayoutBlocks,
  docToLayoutBlocks,
  buildProseMirrorPositionMap,
  extractPageBreakTargets,
  isSafeGraphemeBoundary,
} from '../src/core/layout/paginationAdapter';
import { ScriptDraft, ScreenplayBlock } from '../src/types/screenplay';
import { createPaginationEngine } from '../src/core/layout/paginationEngine';
import { createTextLayoutService } from '../src/core/layout/textLayoutService';

describe('Milestone M2A: Canonical Document Adapter & Position Resolver', () => {
  // ===========================================================================
  // 1. Domain Draft to Layout Blocks Conversion
  // ===========================================================================
  describe('1. draftToLayoutBlocks', () => {
    it('1.1 converts ScriptDraft blocks to ScreenplayBlockInput preserving IDs, types, and text without mutation', () => {
      const draft: ScriptDraft = {
        id: 'draft-1',
        name: 'Draft 1',
        isMain: true,
        createdAt: '2026-11-05T00:00:00Z',
        modifiedAt: '2026-11-05T00:00:00Z',
        blocks: [
          { id: 'b1', type: 'scene_heading', text: 'EXT. AMRITSAR - DAY' },
          { id: 'b2', type: 'action', text: 'Surjit walks along the platform.' },
          { id: 'b3', type: 'character', text: 'SURJIT' },
          { id: 'b4', type: 'dialogue', text: 'Is anyone here?' },
        ],
      };

      const layoutBlocks = draftToLayoutBlocks(draft);

      expect(layoutBlocks.length).toBe(4);
      expect(layoutBlocks[0]).toEqual({
        id: 'b1',
        type: 'scene_heading',
        text: 'EXT. AMRITSAR - DAY',
        characterName: undefined,
      });
      expect(layoutBlocks[2]).toEqual({
        id: 'b3',
        type: 'character',
        text: 'SURJIT',
        characterName: 'SURJIT',
      });

      // INVARIANT: draft.blocks is not mutated in any way
      expect(draft.blocks.length).toBe(4);
      expect(draft.blocks[0].id).toBe('b1');
    });

    it('1.2 handles empty draft gracefully returning empty array', () => {
      const emptyDraft: ScriptDraft = {
        id: 'd-empty',
        name: 'Empty',
        isMain: true,
        createdAt: '',
        modifiedAt: '',
        blocks: [],
      };
      expect(draftToLayoutBlocks(emptyDraft)).toEqual([]);
    });
  });

  // ===========================================================================
  // 2. ProseMirror Document Position Mapping
  // ===========================================================================
  describe('2. ProseMirror Position Mapping & Structural Resolution', () => {
    it('2.1 accurately maps positions for plain text blocks in real ProseMirror document', () => {
      const draft: ScriptDraft = {
        id: 'd1',
        name: 'D1',
        isMain: true,
        createdAt: '',
        modifiedAt: '',
        blocks: [
          { id: 'b1', type: 'scene_heading', text: 'INT. ROOM - NIGHT' },
          { id: 'b2', type: 'action', text: 'Surjit sits in silence.' },
        ],
      };

      const doc = draftToProseMirrorDoc(draft);
      const positionMap = buildProseMirrorPositionMap(doc);

      expect(positionMap.blocks.length).toBe(2);

      const b1 = positionMap.getBlock('b1')!;
      expect(b1).toBeDefined();
      expect(b1.nodeStartPos).toBe(0);
      expect(b1.contentStartPos).toBe(1);
      expect(b1.textLength).toBe(17);
      expect(b1.contentEndPos).toBe(18);
      expect(b1.nodeEndPos).toBe(19);

      // Verify node at position
      const node1 = doc.nodeAt(b1.nodeStartPos);
      expect(node1?.type.name).toBe('screenplay_block');
      expect(node1?.attrs.id).toBe('b1');
      expect(node1?.textContent).toBe('INT. ROOM - NIGHT');

      const b2 = positionMap.getBlock('b2')!;
      expect(b2).toBeDefined();
      expect(b2.nodeStartPos).toBe(19);
      expect(b2.contentStartPos).toBe(20);
      expect(b2.textLength).toBe(23);
      expect(b2.contentEndPos).toBe(43);
      expect(b2.nodeEndPos).toBe(44);

      // Verify reverse PM position resolution
      const resolved = positionMap.resolvePmPos(25);
      expect(resolved).toEqual({
        blockId: 'b2',
        blockType: 'action',
        textOffset: 5,
      });

      // Verify doc.resolve alignment
      const $pos = doc.resolve(25);
      expect($pos.parent.attrs.id).toBe('b2');
      expect($pos.parentOffset).toBe(5);
    });

    it('2.2 proves exact position mapping across multiple inline marks (bold, italic, color, highlight)', () => {
      const draft: ScriptDraft = {
        id: 'd-marks',
        name: 'Marks',
        isMain: true,
        createdAt: '',
        modifiedAt: '',
        blocks: [
          {
            id: 'b-formatted',
            type: 'action',
            text: 'Normal Bold Italic Colored.',
            formats: [
              { from: 7, to: 11, type: 'bold' },
              { from: 12, to: 18, type: 'italic' },
              { from: 19, to: 26, type: 'color', color: '#ff0000' },
            ],
          },
        ],
      };

      const doc = draftToProseMirrorDoc(draft);
      const positionMap = buildProseMirrorPositionMap(doc);
      const b = positionMap.getBlock('b-formatted')!;

      expect(b.text).toBe('Normal Bold Italic Colored.');
      expect(b.textLength).toBe(27);
      expect(b.contentEndPos - b.contentStartPos).toBe(27);

      // In ProseMirror, marks do not add position tokens; text content size strictly equals text length
      for (let offset = 0; offset <= b.textLength; offset++) {
        const pmPos = positionMap.pmPosFromOffset('b-formatted', offset);
        expect(pmPos).toBe(b.contentStartPos + offset);

        const $resolved = doc.resolve(pmPos);
        expect($resolved.parent.attrs.id).toBe('b-formatted');
        expect($resolved.parentOffset).toBe(offset);
      }
    });

    it('2.3 accurately maps positions for complex Gurmukhi conjuncts and mixed Punjabi/English text', () => {
      const text = 'ਡਾਇਰੈਕਟਰ ਨੇ ਕਿਹਾ ਕਿ Scene 4 ਵਿੱਚ ਕ੍ਰਿੱਪਾ ਹੋਵੇਗੀ।';
      const draft: ScriptDraft = {
        id: 'd-pa',
        name: 'Pa',
        isMain: true,
        createdAt: '',
        modifiedAt: '',
        blocks: [{ id: 'b-pa', type: 'action', text }],
      };

      const doc = draftToProseMirrorDoc(draft);
      const positionMap = buildProseMirrorPositionMap(doc);
      const b = positionMap.getBlock('b-pa')!;

      expect(b.text).toBe(text);
      expect(b.textLength).toBe(text.length);

      // Verify that every single character offset maps 1:1 to ProseMirror doc position
      for (let offset = 0; offset <= text.length; offset++) {
        const pmPos = positionMap.pmPosFromOffset('b-pa', offset);
        const resolved = positionMap.resolvePmPos(pmPos);
        expect(resolved?.textOffset).toBe(offset);
        expect(resolved?.blockId).toBe('b-pa');
      }
    });

    it('2.4 accurately maps empty blocks where contentStartPos equals contentEndPos', () => {
      const draft: ScriptDraft = {
        id: 'd-empty-block',
        name: 'EmptyBlock',
        isMain: true,
        createdAt: '',
        modifiedAt: '',
        blocks: [
          { id: 'b-empty', type: 'action', text: '' },
          { id: 'b-next', type: 'action', text: 'Text follows.' },
        ],
      };

      const doc = draftToProseMirrorDoc(draft);
      const positionMap = buildProseMirrorPositionMap(doc);

      const bEmpty = positionMap.getBlock('b-empty')!;
      expect(bEmpty.textLength).toBe(0);
      expect(bEmpty.nodeStartPos).toBe(0);
      expect(bEmpty.contentStartPos).toBe(1);
      expect(bEmpty.contentEndPos).toBe(1);
      expect(bEmpty.nodeEndPos).toBe(2);

      // Offset 0 must return contentStartPos
      expect(positionMap.pmPosFromOffset('b-empty', 0)).toBe(1);
      // Offset > 0 must throw out-of-bounds error
      expect(() => positionMap.pmPosFromOffset('b-empty', 1)).toThrow('out of bounds');

      const bNext = positionMap.getBlock('b-next')!;
      expect(bNext.nodeStartPos).toBe(2);
      expect(bNext.contentStartPos).toBe(3);
    });

    it('2.5 tracks position shifts under ProseMirror insertions and deletions before split points', () => {
      const draft: ScriptDraft = {
        id: 'd-tr',
        name: 'Transaction',
        isMain: true,
        createdAt: '',
        modifiedAt: '',
        blocks: [
          { id: 'b1', type: 'action', text: 'First block.' },
          { id: 'b2', type: 'action', text: 'Second block.' },
        ],
      };

      const doc = draftToProseMirrorDoc(draft);
      const initialMap = buildProseMirrorPositionMap(doc);
      const b2Initial = initialMap.getBlock('b2')!;

      const splitOffsetInB2 = 7;
      const initialPmPos = initialMap.pmPosFromOffset('b2', splitOffsetInB2);

      // Simulate insertion in b1: insert 10 characters at pos 5
      // Create new doc with modified text in b1
      const modifiedDraft: ScriptDraft = {
        ...draft,
        blocks: [
          { id: 'b1', type: 'action', text: 'First [INSERTION] block.' },
          { id: 'b2', type: 'action', text: 'Second block.' },
        ],
      };
      const modifiedDoc = draftToProseMirrorDoc(modifiedDraft);
      const updatedMap = buildProseMirrorPositionMap(modifiedDoc);
      const b2Updated = updatedMap.getBlock('b2')!;

      const updatedPmPos = updatedMap.pmPosFromOffset('b2', splitOffsetInB2);

      // The shift in PM position must exactly equal the insertion length (12 characters)
      const insertionDelta = 'First [INSERTION] block.'.length - 'First block.'.length;
      expect(updatedPmPos - initialPmPos).toBe(insertionDelta);
      expect(b2Updated.nodeStartPos - b2Initial.nodeStartPos).toBe(insertionDelta);
    });
  });

  // ===========================================================================
  // 3. Page Break Decoration Targets Extraction
  // ===========================================================================
  describe('3. extractPageBreakTargets', () => {
    const engine = createPaginationEngine();

    it('3.1 extracts exact clean between-block page break targets', () => {
      // Create 37 single-line blocks to force break between block 36 and 37 on 36-slot Letter
      const blocks: ScreenplayBlock[] = [];
      for (let i = 0; i < 37; i++) {
        blocks.push({ id: `b-${i}`, type: 'action', text: `Action line ${i + 1}` });
      }

      const draft: ScriptDraft = {
        id: 'd-multi',
        name: 'Multi',
        isMain: true,
        createdAt: '',
        modifiedAt: '',
        blocks,
      };

      const doc = draftToProseMirrorDoc(draft);
      const { layoutBlocks, positionMap } = docToLayoutBlocks(doc);

      const mockMetrics = {
        ensureLoaded: async () => ({ loaded: true, isFallback: false, status: 'ready' as const }),
        getStatus: () => ({ loaded: true, isFallback: false, status: 'ready' as const }),
        measureWidth: (text: string) => text.length * 8.0,
        getLineBoxMetrics: () => ({ fontSizePt: 12, ascentPt: 12, descentPt: 4, lineBoxHeightPt: 16 }),
      };
      const layoutService = createTextLayoutService(mockMetrics);

      const result = engine.paginate(layoutBlocks, { paperSize: 'letter', textLayoutService: layoutService });

      expect(result.pages.length).toBeGreaterThan(1);

      const targets = extractPageBreakTargets(result, positionMap);
      expect(targets.length).toBeGreaterThan(0);

      const firstBreak = targets[0];
      expect(firstBreak.pageNumber).toBe(2);
      expect(firstBreak.breakType).toBe('between_blocks');
      expect(firstBreak.textOffset).toBe(0);

      // Verify target PM position points to the start of the block
      const targetBlock = positionMap.getBlock(firstBreak.blockId)!;
      expect(firstBreak.pmPos).toBe(targetBlock.nodeStartPos);
    });

    it('3.2 extracts mid-block dialogue continuation split targets with (MORE) and (CONT\'D)', () => {
      // 28-line action block fills slots 0..27 on page 1
      // Character cue takes slot 29 (slot 28 is blank line above). Remaining slots = 6.
      // 8-line dialogue block splits: 5 lines + (MORE) on page 1, 3 lines on page 2.
      const blocks: ScreenplayBlock[] = [
        {
          id: 'filler',
          type: 'action',
          text: Array.from({ length: 28 }, (_, i) => `Filler line ${i + 1}`).join('\n'),
        },
        { id: 'char1', type: 'character', text: 'SURJIT' },
        {
          id: 'dial1',
          type: 'dialogue',
          text: Array.from({ length: 8 }, (_, i) => `Dialogue line ${i + 1}`).join('\n'),
        },
      ];

      const draft: ScriptDraft = {
        id: 'd-split',
        name: 'Split',
        isMain: true,
        createdAt: '',
        modifiedAt: '',
        blocks,
      };

      const doc = draftToProseMirrorDoc(draft);
      const { layoutBlocks, positionMap } = docToLayoutBlocks(doc);

      const mockMetrics = {
        ensureLoaded: async () => ({ loaded: true, isFallback: false, status: 'ready' as const }),
        getStatus: () => ({ loaded: true, isFallback: false, status: 'ready' as const }),
        measureWidth: (text: string) => text.length * 8.0,
        getLineBoxMetrics: () => ({ fontSizePt: 12, ascentPt: 12, descentPt: 4, lineBoxHeightPt: 16 }),
      };
      const layoutService = createTextLayoutService(mockMetrics);

      const result = engine.paginate(layoutBlocks, { paperSize: 'letter', textLayoutService: layoutService });

      expect(result.pages.length).toBe(2);
      expect(result.diagnostics.dialogueSplitsCount).toBe(1);

      const targets = extractPageBreakTargets(result, positionMap);
      expect(targets.length).toBe(1);

      const splitTarget = targets[0];
      expect(splitTarget.pageNumber).toBe(2);
      expect(splitTarget.breakType).toBe('mid_block');
      expect(splitTarget.blockId).toBe('dial1');
      expect(splitTarget.moreText).toBe('(MORE)');
      expect(splitTarget.contdText).toContain("SURJIT (CONT'D)");
      expect(splitTarget.textOffset).toBeGreaterThan(0);

      // Verify that the mid-block pmPos points directly inside dial1's content range
      const dialBlock = positionMap.getBlock('dial1')!;
      expect(splitTarget.pmPos).toBeGreaterThan(dialBlock.contentStartPos);
      expect(splitTarget.pmPos).toBeLessThanOrEqual(dialBlock.contentEndPos);
    });

    it('3.3 produces explicit diagnostics for unknown block types and does not silently convert to action', () => {
      const draft: any = {
        id: 'draft-unknown',
        name: 'Draft with Unknown Blocks',
        blocks: [
          { id: 'b1', type: 'scene_heading', text: 'INT. OFFICE - DAY' },
          { id: 'b2', type: 'custom_musical_number', text: 'Dance routine in the rain' },
          { id: 'b3', type: 'action', text: 'Standard action follows.' },
        ],
      };

      const doc = draftToProseMirrorDoc(draft);
      const { layoutBlocks, diagnostics } = docToLayoutBlocks(doc);

      // Diagnostic must be explicitly recorded
      expect(diagnostics.length).toBeGreaterThan(0);
      const diag = diagnostics.find((d) => d.code === 'UNSUPPORTED_BLOCK_TYPE');
      expect(diag).toBeDefined();
      expect(diag?.blockId).toBe('b2');
      expect(diag?.rawType).toBe('custom_musical_number');

      // b2 must NOT be silently included as 'action' in layoutBlocks!
      expect(layoutBlocks.find((b) => b.id === 'b2')).toBeUndefined();
      expect(layoutBlocks.length).toBe(2);
    });

    it('3.4 verifies split offsets against Unicode extended grapheme boundaries', () => {
      // Test isSafeGraphemeBoundary with complex Gurmukhi conjunct
      // 'ਕ੍ਰਿੱਪਾ' = ਕ + ੍ਰ + ਿ + ੱ + ਪ + ਾ
      const text = 'ਕ੍ਰਿੱਪਾ ਕਰਕੇ';
      // Valid boundary: index 0 (start), index 7 (space), index 12 (end)
      // Invalid boundary: index 1 (between ਕ and ੍ਰ) or index 2 (inside conjunct)
      const isBoundaryAt0 = isSafeGraphemeBoundary(text, 0);
      const isBoundaryAtEnd = isSafeGraphemeBoundary(text, text.length);
      expect(isBoundaryAt0).toBe(true);
      expect(isBoundaryAtEnd).toBe(true);

      // Verify that splitting between base and virama/subjoined rakar is unsafe
      const isBoundaryAt1 = isSafeGraphemeBoundary(text, 1);
      expect(isBoundaryAt1).toBe(false);
    });
  });
});
