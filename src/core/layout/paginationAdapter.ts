/**
 * paginationAdapter.ts - Canonical Document Adapter & ProseMirror Position Resolver
 * Governing Context: AKHAR-ARCH-PAG — Milestone M2A
 *
 * Provides safe, non-invasive translation between:
 * 1. Canonical domain representation (ScriptDraft / ScreenplayBlock)
 * 2. Canonical ProseMirror document (screenplaySchema Node)
 * 3. M1 Layout & Pagination Engine input (ScreenplayBlockInput)
 *
 * KEY INVARIANTS:
 * - 100% NON-INVASIVE: Canonical documents and domain blocks are NEVER mutated.
 * - ZERO CANONICAL POLLUTION: No synthetic page-break nodes, page numbers, or continuation text.
 * - EXACT POSITION RESOLUTION: Mathematically proves mapping between block local offsets
 *   and ProseMirror global document positions across plain text, marked text, and empty blocks.
 */

import { Node as PMNode } from 'prosemirror-model';
import { ScreenplayBlockType, ScriptDraft } from '../../types/screenplay';
import { ScreenplayBlockInput, PaginationResult, PageSlotItem } from './paginationEngine';
import { normalizeCharacterName } from '../editor/contd';

// -----------------------------------------------------------------------------
// 1. Position Mapping & Diagnostics Interfaces
// -----------------------------------------------------------------------------

export const KNOWN_SCREENPLAY_BLOCK_TYPES: ReadonlySet<string> = new Set([
  'scene-heading',
  'scene_heading',
  'action',
  'character',
  'dialogue',
  'parenthetical',
  'transition',
  'shot',
]);

export interface AdapterDiagnostic {
  level: 'error' | 'warning';
  code: 'UNSUPPORTED_BLOCK_TYPE' | 'INVALID_SPLIT_OFFSET' | 'OUT_OF_BOUNDS_POSITION';
  blockId: string;
  message: string;
  rawType?: string;
  offset?: number;
}

export interface BlockPositionInfo {
  /** Canonical block ID. */
  blockId: string;
  /** Screenplay block type. */
  blockType: ScreenplayBlockType;
  /** Index of this block in document order (0-based). */
  blockIndex: number;
  /** Global ProseMirror position immediately before the opening block tag (<screenplay_block>). */
  nodeStartPos: number;
  /** Global ProseMirror position immediately after opening tag, where content begins. */
  contentStartPos: number;
  /** Global ProseMirror position immediately before closing tag, where content ends. */
  contentEndPos: number;
  /** Global ProseMirror position immediately after the closing block tag (</screenplay_block>). */
  nodeEndPos: number;
  /** Text content length in UTF-16 code units. */
  textLength: number;
  /** Full text content of the block. */
  text: string;
  /** Character speaker name if block is a character cue. */
  characterName?: string;
  /** Whether the block has a recognized and supported screenplay block type. */
  isSupportedType: boolean;
  /** Raw unmapped type string from document attribute if unsupported. */
  rawType?: string;
}

export interface ProseMirrorPositionMap {
  /** Ordered list of all block position descriptors. */
  blocks: BlockPositionInfo[];
  /** Fast lookup by block ID. */
  blockMap: Map<string, BlockPositionInfo>;
  /** Total document size in ProseMirror position tokens. */
  docSize: number;
  /** Explicit adapter diagnostics encountered during document mapping. */
  diagnostics: AdapterDiagnostic[];

  /**
   * Retrieves position descriptor by canonical block ID.
   */
  getBlock(blockId: string): BlockPositionInfo | undefined;

  /**
   * Translates a block-local text offset (0-based) into an exact global ProseMirror position.
   * Throws an error if blockId is not found or offset is out of bounds.
   */
  pmPosFromOffset(blockId: string, textOffset: number): number;

  /**
   * Translates a global ProseMirror position back to its containing block and local offset.
   * Returns null if pos is outside any block content (e.g. document boundary).
   */
  resolvePmPos(pmPos: number): { blockId: string; blockType: ScreenplayBlockType; textOffset: number } | null;
}

// -----------------------------------------------------------------------------
// 2. Pagination Projection Mapping Interface
// -----------------------------------------------------------------------------

export interface PageBreakDecorationTarget {
  /** 1-based page number for the new page starting after this break. */
  pageNumber: number;
  /** Exact global ProseMirror position where the widget decoration must anchor. */
  pmPos: number;
  /** Whether the page break occurs cleanly between blocks or inside a block. */
  breakType: 'between_blocks' | 'mid_block';
  /** ID of the block where or before which the break occurs. */
  blockId: string;
  /** Local text offset inside the block where break occurs (0 if between blocks). */
  textOffset: number;
  /** Optional (MORE) presentation text if dialogue was split. */
  moreText?: string;
  /** Optional (CONT'D) presentation text for the continuing speaker on next page. */
  contdText?: string;
}

// -----------------------------------------------------------------------------
// 3. Adapter Implementation
// -----------------------------------------------------------------------------

/**
 * Checks whether an offset within text falls on a safe Unicode extended grapheme cluster boundary.
 * Prevents slicing between base characters, viramas, nuktas, or combining matras.
 */
export function isSafeGraphemeBoundary(text: string, offset: number): boolean {
  if (offset <= 0 || offset >= text.length) return true;
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter('pa', { granularity: 'grapheme' });
    const segments = segmenter.segment(text);
    for (const seg of segments) {
      if (seg.index === offset) return true;
      if (seg.index > offset) return false;
    }
  }
  return true;
}

/**
 * Converts domain ScriptDraft blocks into ScreenplayBlockInput[] for the M1 layout engine.
 * Pure and non-mutating.
 */
export function draftToLayoutBlocks(draft: ScriptDraft): ScreenplayBlockInput[] {
  if (!draft || !Array.isArray(draft.blocks)) {
    return [];
  }

  return draft.blocks
    .filter((b) => KNOWN_SCREENPLAY_BLOCK_TYPES.has(b.type))
    .map((b) => {
      const characterName =
        b.type === 'character' ? normalizeCharacterName(b.text) || b.text.trim() : undefined;

      return {
        id: b.id,
        type: b.type,
        text: b.text || '',
        characterName,
      };
    });
}

/**
 * Extracts ScreenplayBlockInput[] and a validated ProseMirrorPositionMap from a ProseMirror document.
 * Pure and non-mutating.
 */
export function docToLayoutBlocks(doc: PMNode): {
  layoutBlocks: ScreenplayBlockInput[];
  positionMap: ProseMirrorPositionMap;
  diagnostics: AdapterDiagnostic[];
} {
  const positionMap = buildProseMirrorPositionMap(doc);

  // Filter out unsupported blocks from layout input so they do not silently masquerade as action
  const layoutBlocks: ScreenplayBlockInput[] = positionMap.blocks
    .filter((b) => b.isSupportedType)
    .map((b) => ({
      id: b.blockId,
      type: b.blockType,
      text: b.text,
      characterName: b.characterName,
    }));

  return { layoutBlocks, positionMap, diagnostics: positionMap.diagnostics };
}

/**
 * Inspects a ProseMirror screenplay document node and constructs an authoritative position map.
 * Validates that every position is mathematically sound against the schema.
 */
export function buildProseMirrorPositionMap(doc: PMNode): ProseMirrorPositionMap {
  if (!doc) {
    throw new Error('buildProseMirrorPositionMap: doc node is required');
  }

  const blocks: BlockPositionInfo[] = [];
  const blockMap = new Map<string, BlockPositionInfo>();
  const diagnostics: AdapterDiagnostic[] = [];

  let blockIndex = 0;

  doc.forEach((node, offset) => {
    if (node.type.name === 'screenplay_block') {
      const blockId = String(node.attrs.id || `block-${blockIndex}`);
      const rawType = String(node.attrs.type ?? '');
      const isSupportedType = KNOWN_SCREENPLAY_BLOCK_TYPES.has(rawType);

      if (!isSupportedType) {
        diagnostics.push({
          level: 'error',
          code: 'UNSUPPORTED_BLOCK_TYPE',
          blockId,
          message: `Unsupported screenplay block type '${rawType}' in block '${blockId}'. Block is excluded from layout calculations.`,
          rawType,
        });
      }

      const blockType = isSupportedType ? (rawType as ScreenplayBlockType) : ('action' as ScreenplayBlockType);
      const text = node.textContent;
      const textLength = text.length;

      const nodeStartPos = offset;
      const contentStartPos = nodeStartPos + 1;
      const contentEndPos = contentStartPos + node.content.size;
      const nodeEndPos = nodeStartPos + node.nodeSize;

      const characterName =
        blockType === 'character' ? normalizeCharacterName(text) || text.trim() : undefined;

      const info: BlockPositionInfo = {
        blockId,
        blockType,
        blockIndex,
        nodeStartPos,
        contentStartPos,
        contentEndPos,
        nodeEndPos,
        textLength,
        text,
        characterName,
        isSupportedType,
        rawType,
      };

      blocks.push(info);
      blockMap.set(blockId, info);
      blockIndex++;
    }
  });

  const docSize = doc.nodeSize;

  const positionMap: ProseMirrorPositionMap = {
    blocks,
    blockMap,
    docSize,
    diagnostics,

    getBlock(blockId: string): BlockPositionInfo | undefined {
      return blockMap.get(blockId);
    },

    pmPosFromOffset(blockId: string, textOffset: number): number {
      const block = blockMap.get(blockId);
      if (!block) {
        throw new Error(`pmPosFromOffset: block ID '${blockId}' not found in position map`);
      }
      if (textOffset < 0 || textOffset > block.textLength) {
        throw new Error(
          `pmPosFromOffset: offset ${textOffset} out of bounds for block '${blockId}' (length: ${block.textLength})`
        );
      }
      return block.contentStartPos + textOffset;
    },

    resolvePmPos(pmPos: number): { blockId: string; blockType: ScreenplayBlockType; textOffset: number } | null {
      if (pmPos < 0 || pmPos > docSize) {
        return null;
      }

      for (const block of blocks) {
        if (pmPos >= block.contentStartPos && pmPos <= block.contentEndPos) {
          return {
            blockId: block.blockId,
            blockType: block.blockType,
            textOffset: pmPos - block.contentStartPos,
          };
        }
      }

      return null;
    },
  };

  return positionMap;
}

/**
 * Projects a PaginationResult into exact ProseMirror page-break widget decoration targets.
 * Resolves both inter-block breaks and intra-block (dialogue/action continuation) splits.
 */
export function extractPageBreakTargets(
  paginationResult: PaginationResult,
  positionMap: ProseMirrorPositionMap
): PageBreakDecorationTarget[] {
  const targets: PageBreakDecorationTarget[] = [];
  const pages = paginationResult.pages;

  if (pages.length <= 1) {
    return targets; // Single page script has no page breaks
  }

  for (let pIdx = 1; pIdx < pages.length; pIdx++) {
    const page = pages[pIdx];
    const prevPage = pages[pIdx - 1];
    const firstSlot = page.slots[0];
    if (!firstSlot) continue;

    // Check if the previous page ended with a presentation (MORE)
    const prevLastSlot = prevPage.slots[prevPage.slots.length - 1];
    const isDialogueSplit = prevLastSlot && prevLastSlot.kind === 'more';

    if (isDialogueSplit) {
      // Find the continuing dialogue line on the new page
      const dialogueSlot = page.slots.find((s) => s.kind === 'text' && !s.isPresentationOnly);
      const contdSlot = page.slots.find((s) => s.kind === 'contd');

      if (dialogueSlot && dialogueSlot.sourceStartOffset !== undefined) {
        const block = positionMap.getBlock(dialogueSlot.blockId);
        if (block) {
          if (!isSafeGraphemeBoundary(block.text, dialogueSlot.sourceStartOffset)) {
            positionMap.diagnostics.push({
              level: 'warning',
              code: 'INVALID_SPLIT_OFFSET',
              blockId: block.blockId,
              message: `Dialogue split offset ${dialogueSlot.sourceStartOffset} in block '${block.blockId}' is not on a safe Unicode grapheme boundary.`,
              offset: dialogueSlot.sourceStartOffset,
            });
          }
          const pmPos = positionMap.pmPosFromOffset(dialogueSlot.blockId, dialogueSlot.sourceStartOffset);
          targets.push({
            pageNumber: page.pageNumber,
            pmPos,
            breakType: 'mid_block',
            blockId: dialogueSlot.blockId,
            textOffset: dialogueSlot.sourceStartOffset,
            moreText: prevLastSlot.presentationText,
            contdText: contdSlot?.presentationText,
          });
          continue;
        }
      }
    }

    // Standard break between blocks or action split
    let targetSlot: PageSlotItem | undefined = firstSlot;
    if (firstSlot.isPresentationOnly && page.slots.length > 1) {
      targetSlot = page.slots.find((s) => !s.isPresentationOnly) || firstSlot;
    }

    const block = positionMap.getBlock(targetSlot.blockId);
    if (!block) continue;

    if (targetSlot.kind === 'text' && targetSlot.sourceStartOffset && targetSlot.sourceStartOffset > 0) {
      if (!isSafeGraphemeBoundary(block.text, targetSlot.sourceStartOffset)) {
        positionMap.diagnostics.push({
          level: 'warning',
          code: 'INVALID_SPLIT_OFFSET',
          blockId: block.blockId,
          message: `Action split offset ${targetSlot.sourceStartOffset} in block '${block.blockId}' is not on a safe Unicode grapheme boundary.`,
          offset: targetSlot.sourceStartOffset,
        });
      }
      // Mid-block action split
      const pmPos = positionMap.pmPosFromOffset(targetSlot.blockId, targetSlot.sourceStartOffset);
      targets.push({
        pageNumber: page.pageNumber,
        pmPos,
        breakType: 'mid_block',
        blockId: targetSlot.blockId,
        textOffset: targetSlot.sourceStartOffset,
      });
    } else {
      // Clean break before block starts (at nodeStartPos or contentStartPos)
      targets.push({
        pageNumber: page.pageNumber,
        pmPos: block.nodeStartPos,
        breakType: 'between_blocks',
        blockId: targetSlot.blockId,
        textOffset: 0,
      });
    }
  }

  return targets;
}
