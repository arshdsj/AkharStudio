/**
 * paginationEngine.ts - Pure, Deterministic Screenplay Pagination Engine
 * Governing Context: AKHAR-ARCH-PAG — Milestone M1C
 *
 * Implements pure mathematical slot-grid pagination for AkharStudio:
 * 1. Physical page profiles: US Letter (36 slots) and A4 (38 slots) at certified 18.0pt baseline pitch.
 * 2. Strict physical dimensions in points (pt) matching M0 empirical verification.
 * 3. Element placement rules and integer slot accounting (Scene Heading, Action, Character, Parenthetical, Dialogue, Transition, Shot).
 * 4. Anti-orphan protection: never isolate character cues, parentheticals, or scene headings at page bottoms.
 * 5. Dialogue continuation splitting with presentation-only (MORE) and (CONT'D) metadata.
 * 6. 100% source text preservation: canonical document is NEVER mutated.
 * 7. Guaranteed invariants: no empty pages, no trailing blank pages, deterministic output.
 */

import { ScreenplayBlockType, PaperSize, ContdSetting } from '../../types/screenplay';
import { LayoutLine, ITextLayoutService, LayoutConstraints } from './textLayoutService';
import { normalizeCharacterName } from '../editor/contd';

// -----------------------------------------------------------------------------
// 1. Page Geometry & Profiles
// -----------------------------------------------------------------------------

export interface PageProfile {
  /** Paper standard identifier. */
  paperSize: PaperSize | 'custom';
  /** Total physical sheet width in points (pt). */
  widthPt: number;
  /** Total physical sheet height in points (pt). */
  heightPt: number;
  /** Top margin in points (pt). Printable content starts below this. */
  marginTopPt: number;
  /** Right margin in points (pt). */
  marginRightPt: number;
  /** Bottom margin in points (pt). Printable content stops above this. */
  marginBottomPt: number;
  /** Left gutter margin in points (pt) for 3-hole binding. */
  marginLeftPt: number;
  /** Printable width in points (pt): widthPt - marginLeftPt - marginRightPt. */
  printableWidthPt: number;
  /** Printable height in points (pt): heightPt - marginTopPt - marginBottomPt. */
  printableHeightPt: number;
  /** Certified baseline grid pitch in points (pt). Default: 18.0pt. */
  linePitchPt: number;
  /** Running header distance from top edge in points (pt). Default: 36.0pt (0.5in). */
  headerTopPt: number;
  /** Maximum printable integer line slots on this page: floor(printableHeightPt / linePitchPt). */
  slotCapacity: number;
  /** Static unassigned safety buffer in points (pt) at bottom: printableHeightPt - (slotCapacity * linePitchPt). */
  bottomSafetyBufferPt: number;
}

/**
 * Certified page profile specifications established in M0 Technical Audit.
 */
export const PAGE_PROFILES: Record<PaperSize, PageProfile> = {
  /**
   * US Letter: 8.5 x 11.0 in (612 x 792 pt).
   * Printable: 6.0 x 9.0 in (432 x 648 pt).
   * Exact capacity: 648 / 18.0 = 36 slots.
   */
  letter: {
    paperSize: 'letter',
    widthPt: 612.0,
    heightPt: 792.0,
    marginTopPt: 72.0, // 1.0 in
    marginRightPt: 72.0, // 1.0 in
    marginBottomPt: 72.0, // 1.0 in
    marginLeftPt: 108.0, // 1.5 in binding gutter
    printableWidthPt: 432.0, // 612 - 108 - 72
    printableHeightPt: 648.0, // 792 - 72 - 72
    linePitchPt: 18.0,
    headerTopPt: 36.0, // 0.5 in from sheet top
    slotCapacity: 36,
    bottomSafetyBufferPt: 0.0,
  },

  /**
   * ISO A4: 210 x 297 mm (595.28 x 841.89 pt).
   * Printable: 146.5 x 246.2 mm (415.28 x 697.89 pt).
   * Exact capacity: floor(697.89 / 18.0) = 38 slots (684.0 pt).
   * Bottom safety buffer: 697.89 - 684.0 = 13.89 pt.
   */
  a4: {
    paperSize: 'a4',
    widthPt: 595.28,
    heightPt: 841.89,
    marginTopPt: 72.0,
    marginRightPt: 72.0,
    marginBottomPt: 72.0,
    marginLeftPt: 108.0,
    printableWidthPt: 415.28,
    printableHeightPt: 697.89,
    linePitchPt: 18.0,
    headerTopPt: 36.0,
    slotCapacity: 38,
    bottomSafetyBufferPt: 13.89,
  },
};

/**
 * Validates a page profile, ensuring physical dimensions are mathematically sound.
 */
export function validatePageProfile(profile: PageProfile): void {
  if (!profile || typeof profile !== 'object') {
    throw new Error('validatePageProfile: profile must be a valid object');
  }
  const { widthPt, heightPt, marginTopPt, marginBottomPt, marginLeftPt, marginRightPt, linePitchPt } = profile;

  if (!Number.isFinite(widthPt) || widthPt <= 0) {
    throw new Error(`validatePageProfile: invalid widthPt (${widthPt})`);
  }
  if (!Number.isFinite(heightPt) || heightPt <= 0) {
    throw new Error(`validatePageProfile: invalid heightPt (${heightPt})`);
  }
  if (!Number.isFinite(linePitchPt) || linePitchPt <= 0) {
    throw new Error(`validatePageProfile: invalid linePitchPt (${linePitchPt})`);
  }

  const printableW = widthPt - marginLeftPt - marginRightPt;
  const printableH = heightPt - marginTopPt - marginBottomPt;

  if (printableW <= 0) {
    throw new Error(`validatePageProfile: printable width is non-positive (${printableW}pt). Margins exceed sheet width.`);
  }
  if (printableH <= 0) {
    throw new Error(`validatePageProfile: printable height is non-positive (${printableH}pt). Margins exceed sheet height.`);
  }

  const expectedSlots = Math.floor(printableH / linePitchPt);
  if (expectedSlots <= 0) {
    throw new Error(`validatePageProfile: line pitch (${linePitchPt}pt) exceeds printable height (${printableH}pt). 0 slots possible.`);
  }
}

/**
 * Creates or clones a PageProfile, deriving all calculated geometry and capacity.
 */
export function createPageProfile(
  paperSize: PaperSize,
  overrides?: Partial<Omit<PageProfile, 'printableWidthPt' | 'printableHeightPt' | 'slotCapacity' | 'bottomSafetyBufferPt'>>
): PageProfile {
  const base = PAGE_PROFILES[paperSize];
  if (!base) {
    throw new Error(`createPageProfile: unknown paperSize '${paperSize}'. Must be 'letter' or 'a4'.`);
  }

  const widthPt = overrides?.widthPt ?? base.widthPt;
  const heightPt = overrides?.heightPt ?? base.heightPt;
  const marginTopPt = overrides?.marginTopPt ?? base.marginTopPt;
  const marginRightPt = overrides?.marginRightPt ?? base.marginRightPt;
  const marginBottomPt = overrides?.marginBottomPt ?? base.marginBottomPt;
  const marginLeftPt = overrides?.marginLeftPt ?? base.marginLeftPt;
  const linePitchPt = overrides?.linePitchPt ?? base.linePitchPt;
  const headerTopPt = overrides?.headerTopPt ?? base.headerTopPt;

  const printableWidthPt = Number((widthPt - marginLeftPt - marginRightPt).toFixed(4));
  const printableHeightPt = Number((heightPt - marginTopPt - marginBottomPt).toFixed(4));
  const slotCapacity = Math.floor(printableHeightPt / linePitchPt);
  const bottomSafetyBufferPt = Number((printableHeightPt - slotCapacity * linePitchPt).toFixed(4));

  const profile: PageProfile = {
    paperSize: overrides?.paperSize ?? base.paperSize,
    widthPt,
    heightPt,
    marginTopPt,
    marginRightPt,
    marginBottomPt,
    marginLeftPt,
    printableWidthPt,
    printableHeightPt,
    linePitchPt,
    headerTopPt,
    slotCapacity,
    bottomSafetyBufferPt,
  };

  validatePageProfile(profile);
  return profile;
}

// -----------------------------------------------------------------------------
// 2. Element Spacing Rules
// -----------------------------------------------------------------------------

export interface ElementSpacingRules {
  sceneHeading: { blankAbove: number; minLinesFollow: number };
  action: { blankAbove: number; minLinesBeforeSplit: number; minLinesAfterSplit: number };
  character: { blankAbove: number; minDialogueFollow: number };
  parenthetical: { blankAbove: number };
  dialogue: { blankAbove: number; minSplitBefore: number; minSplitAfter: number };
  transition: { blankAbove: number };
  shot: { blankAbove: number; minLinesFollow: number };
}

export const DEFAULT_SPACING_RULES: ElementSpacingRules = {
  sceneHeading: { blankAbove: 1, minLinesFollow: 2 },
  action: { blankAbove: 1, minLinesBeforeSplit: 1, minLinesAfterSplit: 1 },
  character: { blankAbove: 1, minDialogueFollow: 1 },
  parenthetical: { blankAbove: 0 },
  dialogue: { blankAbove: 0, minSplitBefore: 2, minSplitAfter: 2 },
  transition: { blankAbove: 1 },
  shot: { blankAbove: 1, minLinesFollow: 2 },
};

// -----------------------------------------------------------------------------
// 3. Pagination Data Model
// -----------------------------------------------------------------------------

export type SlotItemKind = 'text' | 'blank_line' | 'more' | 'contd';

export interface PageSlotItem {
  /** Identifier of the source screenplay block. Synthetic items use `${sourceBlockId}-more` or similar. */
  blockId: string;
  /** Type of the screenplay block. */
  blockType: ScreenplayBlockType;
  /** 0-based index of this slot on the current page (0 to slotCapacity - 1). */
  slotIndex: number;
  /** Kind of item occupying this slot. */
  kind: SlotItemKind;
  /** Underlying text layout line (populated for 'text' kind). */
  line?: LayoutLine;
  /** UTF-16 code unit start offset in the original input block text (for 'text' kind). */
  sourceStartOffset?: number;
  /** UTF-16 code unit end offset in the original input block text (for 'text' kind). */
  sourceEndOffset?: number;
  /** Display/presentation text (e.g. for '(MORE)', 'CHARACTER (CONT'D)', or blank line). */
  presentationText?: string;
  /** True for synthetic pagination items like (MORE), (CONT'D), running headers. */
  isPresentationOnly: boolean;
}

export interface ScreenplayPage {
  /** 0-based page index. */
  pageIndex: number;
  /** 1-based display page number. */
  pageNumber: number;
  /** Page geometry profile applied to this page. */
  profile: PageProfile;
  /** Ordered list of slot items occupying this page. */
  slots: PageSlotItem[];
  /** Number of slots used (slots.length). */
  usedSlots: number;
  /** Number of empty slots remaining (slotCapacity - usedSlots). */
  remainingSlots: number;
  /** Whether this is the final page in the document. */
  isFinalPage: boolean;
  /** Whether a running header is active on this page (suppressed on page 1). */
  hasHeader: boolean;
  /** Header display text (e.g. '2.'). */
  headerText?: string;
}

export interface PaginationDiagnostics {
  hasOverflow: boolean;
  unfittedBlockIds: string[];
  pageCount: number;
  totalUsedSlots: number;
  dialogueSplitsCount: number;
  orphanPreventedCount: number;
}

export interface PaginationResult {
  pages: ScreenplayPage[];
  totalPages: number;
  totalUsedSlots: number;
  diagnostics: PaginationDiagnostics;
  blockPageMap: Map<string, number[]>;
}

export interface ScreenplayBlockInput {
  id: string;
  type: ScreenplayBlockType;
  text: string;
  /** Pre-calculated lines from TextLayoutService. If omitted, engine will lay them out using textLayoutService option. */
  lines?: LayoutLine[];
  /** Optional character name override (if type is 'character' or 'dialogue'). */
  characterName?: string;
}

export interface PaginationOptions {
  profile?: PageProfile;
  paperSize?: PaperSize;
  spacingRules?: ElementSpacingRules;
  textLayoutService?: ITextLayoutService;
  moreText?: string;
  contdSuffix?: string;
  includeFirstPageHeader?: boolean;
  contdSetting?: ContdSetting;
}

export interface IPaginationEngine {
  paginate(blocks: ScreenplayBlockInput[], options?: PaginationOptions): PaginationResult;
}

// -----------------------------------------------------------------------------
// 4. Pure Pagination Engine Implementation
// -----------------------------------------------------------------------------

export class PaginationEngine implements IPaginationEngine {
  /**
   * Paginates an ordered sequence of screenplay blocks across physical pages.
   * Pure, deterministic, and preserves canonical text 100%.
   */
  public paginate(blocks: ScreenplayBlockInput[], options?: PaginationOptions): PaginationResult {
    if (!Array.isArray(blocks)) {
      throw new Error(`PaginationEngine.paginate: expected array of blocks, received ${typeof blocks}`);
    }

    // Resolve profile
    const profile = options?.profile ?? createPageProfile(options?.paperSize ?? 'letter');
    validatePageProfile(profile);

    const spacing = options?.spacingRules ?? DEFAULT_SPACING_RULES;
    const moreText = options?.moreText ?? '(MORE)';
    const contdSuffix = options?.contdSuffix ?? " (CONT'D)";
    const includeFirstPageHeader = options?.includeFirstPageHeader ?? false;
    const contdSetting = options?.contdSetting ?? 'on';

    // Fast-path: completely empty document
    if (blocks.length === 0) {
      return {
        pages: [],
        totalPages: 0,
        totalUsedSlots: 0,
        diagnostics: {
          hasOverflow: false,
          unfittedBlockIds: [],
          pageCount: 0,
          totalUsedSlots: 0,
          dialogueSplitsCount: 0,
          orphanPreventedCount: 0,
        },
        blockPageMap: new Map<string, number[]>(),
      };
    }

    // Step 1: Pre-resolve block lines
    const preparedBlocks = this.prepareBlocks(blocks, profile, options?.textLayoutService);

    // Filter out completely empty blocks that produce 0 lines, unless all blocks are empty
    const nonTrivialBlocks = preparedBlocks.filter((b) => b.lines.length > 0);
    if (nonTrivialBlocks.length === 0) {
      return {
        pages: [],
        totalPages: 0,
        totalUsedSlots: 0,
        diagnostics: {
          hasOverflow: false,
          unfittedBlockIds: [],
          pageCount: 0,
          totalUsedSlots: 0,
          dialogueSplitsCount: 0,
          orphanPreventedCount: 0,
        },
        blockPageMap: new Map<string, number[]>(),
      };
    }

    // Step 2: Page allocation loop
    const pages: ScreenplayPage[] = [];
    const blockPageMap = new Map<string, Set<number>>();
    let currentSlots: PageSlotItem[] = [];

    const recordBlockPage = (blockId: string, pageNum: number): void => {
      let set = blockPageMap.get(blockId);
      if (!set) {
        set = new Set<number>();
        blockPageMap.set(blockId, set);
      }
      set.add(pageNum);
    };

    const finalizeCurrentPage = (): void => {
      if (currentSlots.length === 0) return;
      const pageIndex = pages.length;
      const pageNumber = pageIndex + 1;
      const hasHeader = pageNumber > 1 || includeFirstPageHeader;

      pages.push({
        pageIndex,
        pageNumber,
        profile,
        slots: [...currentSlots],
        usedSlots: currentSlots.length,
        remainingSlots: profile.slotCapacity - currentSlots.length,
        isFinalPage: false,
        hasHeader,
        headerText: hasHeader ? `${pageNumber}.` : undefined,
      });
      currentSlots = [];
    };

    let dialogueSplitsCount = 0;
    let orphanPreventedCount = 0;
    let hasOverflow = false;
    const unfittedBlockIds: string[] = [];

    let currentSpeakerName = '';

    for (let bIdx = 0; bIdx < nonTrivialBlocks.length; bIdx++) {
      const block = nonTrivialBlocks[bIdx];
      const nextBlock = nonTrivialBlocks[bIdx + 1];

      if (block.type === 'character') {
        currentSpeakerName = block.characterName || normalizeCharacterName(block.text) || block.text.trim();
      } else if (block.type === 'scene_heading') {
        currentSpeakerName = '';
      }

      // 1. Spacing Above: Blank line slot before block (if required and not at page top)
      const blankAbove = this.getBlankAboveCount(block.type, spacing);
      if (blankAbove > 0 && currentSlots.length > 0) {
        if (currentSlots.length + 1 > profile.slotCapacity) {
          finalizeCurrentPage();
          // Blank line is suppressed at page top!
        } else {
          currentSlots.push({
            blockId: block.id,
            blockType: block.type,
            slotIndex: currentSlots.length,
            kind: 'blank_line',
            presentationText: '',
            isPresentationOnly: true,
          });
        }
      }

      const remainingOnPage = profile.slotCapacity - currentSlots.length;

      // 2. Anti-Orphan: Scene Heading Protection
      if (block.type === 'scene_heading' || block.type === 'shot') {
        const minFollow = block.type === 'scene_heading' ? spacing.sceneHeading.minLinesFollow : spacing.shot.minLinesFollow;
        // Need: 1 heading line + 1 blank line below (or next content line) + minFollow lines
        const neededSlots = 1 + minFollow;
        if (currentSlots.length > 0 && remainingOnPage < neededSlots) {
          // Push heading to slot 0 of next page
          orphanPreventedCount++;
          // Remove preceding blank line slot if one was just added for this block
          if (currentSlots.length > 0 && currentSlots[currentSlots.length - 1].kind === 'blank_line' && currentSlots[currentSlots.length - 1].blockId === block.id) {
            currentSlots.pop();
          }
          finalizeCurrentPage();
        }
      }

      // 3. Anti-Orphan: Character Cue Protection (ARCH-04)
      if (block.type === 'character') {
        // A character cue must have at least 1 dialogue line (or 2 if dialogue split) following it on the same page
        const minDialogueLines = nextBlock && nextBlock.type === 'parenthetical' ? 2 : 1;
        if (currentSlots.length > 0 && remainingOnPage < 1 + minDialogueLines) {
          orphanPreventedCount++;
          if (currentSlots.length > 0 && currentSlots[currentSlots.length - 1].kind === 'blank_line' && currentSlots[currentSlots.length - 1].blockId === block.id) {
            currentSlots.pop();
          }
          finalizeCurrentPage();
        }
      }

      // 4. Anti-Orphan: Parenthetical Protection
      if (block.type === 'parenthetical') {
        // Parenthetical must be followed by at least 1 dialogue line
        if (currentSlots.length > 0 && remainingOnPage < 2) {
          orphanPreventedCount++;
          // If preceding slot was the character cue on this page, backtrack character cue to next page!
          const lastSlot = currentSlots[currentSlots.length - 1];
          if (lastSlot && lastSlot.blockType === 'character') {
            const poppedCue = currentSlots.pop()!;
            // Also pop preceding blank line if any
            if (currentSlots.length > 0 && currentSlots[currentSlots.length - 1].kind === 'blank_line' && currentSlots[currentSlots.length - 1].blockId === poppedCue.blockId) {
              currentSlots.pop();
            }
            finalizeCurrentPage();
            // Re-place character cue on slot 0 of new page
            currentSlots.push({
              ...poppedCue,
              slotIndex: currentSlots.length,
            });
            recordBlockPage(poppedCue.blockId, pages.length + 1);
          } else {
            finalizeCurrentPage();
          }
        }
      }

      // 5. Block Line Placement & Dialogue Splitting
      const blockLines = block.lines;

      if (block.type === 'dialogue') {
        // Evaluate dialogue placement with splitting
        let dLineIdx = 0;

        while (dLineIdx < blockLines.length) {
          const available = profile.slotCapacity - currentSlots.length;
          const remainingLinesCount = blockLines.length - dLineIdx;

          if (remainingLinesCount <= available) {
            // All remaining dialogue lines fit on current page!
            while (dLineIdx < blockLines.length) {
              const line = blockLines[dLineIdx];
              currentSlots.push({
                blockId: block.id,
                blockType: block.type,
                slotIndex: currentSlots.length,
                kind: 'text',
                line,
                sourceStartOffset: line.sourceStartOffset,
                sourceEndOffset: line.sourceEndOffset,
                isPresentationOnly: false,
              });
              recordBlockPage(block.id, pages.length + 1);
              dLineIdx++;
            }
          } else {
            // Dialogue exceeds remaining slots on current page!
            const minSplitBefore = spacing.dialogue.minSplitBefore; // default: 2 lines
            const minSplitAfter = spacing.dialogue.minSplitAfter; // default: 2 lines

            // We need at least (minSplitBefore + 1 slot for (MORE)) to fit on current page
            const canSplitOnCurrentPage = available >= minSplitBefore + 1 && remainingLinesCount - (available - 1) >= minSplitAfter;

            if (canSplitOnCurrentPage) {
              // Split dialogue!
              const linesToTake = available - 1; // reserve 1 slot for (MORE)
              for (let i = 0; i < linesToTake; i++) {
                const line = blockLines[dLineIdx];
                currentSlots.push({
                  blockId: block.id,
                  blockType: block.type,
                  slotIndex: currentSlots.length,
                  kind: 'text',
                  line,
                  sourceStartOffset: line.sourceStartOffset,
                  sourceEndOffset: line.sourceEndOffset,
                  isPresentationOnly: false,
                });
                recordBlockPage(block.id, pages.length + 1);
                dLineIdx++;
              }

              // Inject presentation (MORE) on the last slot
              currentSlots.push({
                blockId: `${block.id}-more`,
                blockType: block.type,
                slotIndex: currentSlots.length,
                kind: 'more',
                presentationText: moreText,
                isPresentationOnly: true,
              });

              dialogueSplitsCount++;
              finalizeCurrentPage();

              // Top of next page: inject presentation CHARACTER (CONT'D) if contdSetting is active
              if (contdSetting !== 'off') {
                const contdSpeaker = currentSpeakerName || 'CHARACTER';
                currentSlots.push({
                  blockId: `${block.id}-contd`,
                  blockType: 'character',
                  slotIndex: currentSlots.length,
                  kind: 'contd',
                  presentationText: `${contdSpeaker}${contdSuffix}`,
                  isPresentationOnly: true,
                });
              }
            } else {
              // Cannot split dialogue safely on current page!
              // Backtrack: if Character (and Parenthetical) were just placed on this page, push them to next page
              if (currentSlots.length > 0) {
                const itemsToMove: PageSlotItem[] = [];
                while (
                  currentSlots.length > 0 &&
                  (currentSlots[currentSlots.length - 1].blockType === 'parenthetical' ||
                    currentSlots[currentSlots.length - 1].blockType === 'character' ||
                    currentSlots[currentSlots.length - 1].kind === 'blank_line')
                ) {
                  const item = currentSlots.pop()!;
                  if (item.kind !== 'blank_line') {
                    itemsToMove.unshift(item);
                  }
                }

                orphanPreventedCount++;
                finalizeCurrentPage();

                // Re-add moved cue/parenthetical at top of new page
                for (const item of itemsToMove) {
                  currentSlots.push({
                    ...item,
                    slotIndex: currentSlots.length,
                  });
                  recordBlockPage(item.blockId, pages.length + 1);
                }
              } else {
                finalizeCurrentPage();
              }
            }
          }
        }
      } else {
        // Standard block placement (Action, Scene Heading, Character, Parenthetical, Transition, Shot)
        let lIdx = 0;
        while (lIdx < blockLines.length) {
          if (currentSlots.length >= profile.slotCapacity) {
            finalizeCurrentPage();
          }

          const line = blockLines[lIdx];
          currentSlots.push({
            blockId: block.id,
            blockType: block.type,
            slotIndex: currentSlots.length,
            kind: 'text',
            line,
            sourceStartOffset: line.sourceStartOffset,
            sourceEndOffset: line.sourceEndOffset,
            isPresentationOnly: false,
          });
          recordBlockPage(block.id, pages.length + 1);
          lIdx++;
        }
      }
    }

    // Finalize the last page
    if (currentSlots.length > 0) {
      finalizeCurrentPage();
    }

    // Set isFinalPage on the last page
    if (pages.length > 0) {
      pages[pages.length - 1].isFinalPage = true;
    }

    // Convert Set map to Array map
    const finalBlockPageMap = new Map<string, number[]>();
    for (const [id, set] of blockPageMap.entries()) {
      finalBlockPageMap.set(id, Array.from(set).sort((a, b) => a - b));
    }

    let totalUsedSlots = 0;
    for (const p of pages) {
      totalUsedSlots += p.usedSlots;
    }

    return {
      pages,
      totalPages: pages.length,
      totalUsedSlots,
      diagnostics: {
        hasOverflow,
        unfittedBlockIds,
        pageCount: pages.length,
        totalUsedSlots,
        dialogueSplitsCount,
        orphanPreventedCount,
      },
      blockPageMap: finalBlockPageMap,
    };
  }

  /**
   * Prepares and lays out input blocks.
   * If a block already has lines, uses them. Otherwise, uses textLayoutService.
   */
  private prepareBlocks(
    blocks: ScreenplayBlockInput[],
    profile: PageProfile,
    layoutService?: ITextLayoutService
  ): { id: string; type: ScreenplayBlockType; text: string; lines: LayoutLine[]; characterName?: string }[] {
    return blocks.map((b) => {
      if (b.lines && b.lines.length > 0) {
        return {
          id: b.id,
          type: b.type,
          text: b.text,
          lines: b.lines,
          characterName: b.characterName,
        };
      }

      if (!layoutService) {
        // Fallback synthetic single line if no layout service provided
        const singleLine: LayoutLine = {
          text: b.text,
          sourceStartOffset: 0,
          sourceEndOffset: b.text.length,
          measuredWidthPt: profile.printableWidthPt,
          fullWidthPt: profile.printableWidthPt,
          isOverflow: false,
          breakReason: 'end',
        };
        return {
          id: b.id,
          type: b.type,
          text: b.text,
          lines: b.text.length > 0 ? [singleLine] : [],
          characterName: b.characterName,
        };
      }

      // Compute element printable width based on screenplay margins
      const availableWidthPt = this.getElementPrintableWidth(b.type, profile.printableWidthPt);
      const constraints: LayoutConstraints = {
        availableWidthPt,
        fontSizePt: 12,
        bold: b.type === 'scene_heading' || b.type === 'character' || b.type === 'shot',
      };

      const result = layoutService.layoutText(b.text, constraints);
      return {
        id: b.id,
        type: b.type,
        text: b.text,
        lines: b.text.length > 0 ? result.lines : [],
        characterName: b.characterName,
      };
    });
  }

  /**
   * Resolves printable width for different screenplay block types.
   */
  private getElementPrintableWidth(type: ScreenplayBlockType, printableWidthPt: number): number {
    switch (type) {
      case 'character':
        // Left margin: 2.2in (158.4pt). Printable width: 432 - 158.4 = 273.6pt
        return Math.max(100.0, printableWidthPt - 158.4);
      case 'parenthetical':
        // Left margin: 1.6in (115.2pt). Max width: 3.0in (216.0pt)
        return Math.min(216.0, Math.max(100.0, printableWidthPt - 115.2));
      case 'dialogue':
        // Left margin: 1.0in (72.0pt). Max width: 3.5in (252.0pt)
        return Math.min(252.0, Math.max(100.0, printableWidthPt - 72.0));
      case 'transition':
        // Left margin: 4.5in (324.0pt)
        return Math.max(80.0, printableWidthPt - 324.0);
      case 'scene_heading':
      case 'action':
      case 'shot':
      default:
        return printableWidthPt;
    }
  }

  /**
   * Returns how many blank line slots precede this element type.
   */
  private getBlankAboveCount(type: ScreenplayBlockType, spacing: ElementSpacingRules): number {
    switch (type) {
      case 'scene_heading':
        return spacing.sceneHeading.blankAbove;
      case 'action':
        return spacing.action.blankAbove;
      case 'character':
        return spacing.character.blankAbove;
      case 'parenthetical':
        return spacing.parenthetical.blankAbove;
      case 'dialogue':
        return spacing.dialogue.blankAbove;
      case 'transition':
        return spacing.transition.blankAbove;
      case 'shot':
        return spacing.shot.blankAbove;
      default:
        return 1;
    }
  }
}

// -----------------------------------------------------------------------------
// Factory
// -----------------------------------------------------------------------------

export function createPaginationEngine(): IPaginationEngine {
  return new PaginationEngine();
}
