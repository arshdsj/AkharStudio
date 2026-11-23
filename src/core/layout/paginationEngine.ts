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
import {
  LINE_PITCH_PT,
  ELEMENT_SPACING,
} from './screenplayGeometry';

// -----------------------------------------------------------------------------
// 1. Page Geometry & Profiles
// -----------------------------------------------------------------------------

export const TOLERANCE_PT = 0.375; // 0.5px tolerance in points (0.5 * 72 / 96)

/**
 * Calculates collapsed margin in points between two sequential screenplay blocks.
 * Dropped completely at page top (isPageTop = true).
 * Character cues sit directly above dialogue/parentheticals (0pt margin).
 */
export function calculateCollapsedMarginPt(
  prevType: ScreenplayBlockType | null,
  nextType: ScreenplayBlockType,
  isPageTop: boolean
): number {
  if (isPageTop || prevType === null) {
    return 0.0;
  }
  // Character cue directly above parenthetical or dialogue:
  if (
    (prevType === 'character' || prevType === 'parenthetical') &&
    (nextType === 'dialogue' || nextType === 'parenthetical')
  ) {
    return 0.0;
  }
  const prevBottom = ELEMENT_SPACING[prevType]?.marginBottomPt ?? 12.0;
  const nextTop = ELEMENT_SPACING[nextType]?.marginTopPt ?? 12.0;
  return Math.max(prevBottom, nextTop);
}

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
  /** Certified baseline grid pitch in points (pt). Default: 16.8pt (22.4px). */
  linePitchPt: number;
  /** Running header distance from top edge in points (pt). Default: 36.0pt (0.5in). */
  headerTopPt: number;
  /** Maximum printable integer line slots on this page: floor(printableHeightPt / linePitchPt). */
  slotCapacity: number;
  /** Static unassigned safety buffer in points (pt) at bottom: printableHeightPt - (slotCapacity * linePitchPt). */
  bottomSafetyBufferPt: number;
}

/**
 * Certified page profile specifications matching canonical screenplay geometry (Option B).
 */
export const PAGE_PROFILES: Record<PaperSize, PageProfile> = {
  letter: {
    paperSize: 'letter',
    widthPt: 612.0,
    heightPt: 792.0,
    marginTopPt: 72.0, // 1.0 in
    marginRightPt: 72.0, // 1.0 in
    marginBottomPt: 72.0, // 1.0 in
    marginLeftPt: 108.0, // 1.5 in binding gutter
    printableWidthPt: 432.0, // 612 - 108 - 72 = 432pt
    printableHeightPt: 648.0, // 792 - 72 - 72 = 648pt (864px)
    linePitchPt: LINE_PITCH_PT, // 12.0pt (16px)
    headerTopPt: 36.0, // 0.5 in from sheet top
    slotCapacity: Math.floor(648.0 / LINE_PITCH_PT), // 54 slots
    bottomSafetyBufferPt: Number((648.0 - Math.floor(648.0 / LINE_PITCH_PT) * LINE_PITCH_PT).toFixed(4)),
  },

  a4: {
    paperSize: 'a4',
    widthPt: 595.28,
    heightPt: 841.89,
    marginTopPt: 72.0,
    marginRightPt: 72.0,
    marginBottomPt: 72.0,
    marginLeftPt: 108.0,
    printableWidthPt: 415.28,
    printableHeightPt: 697.89, // 930.5px
    linePitchPt: LINE_PITCH_PT, // 12.0pt
    headerTopPt: 36.0,
    slotCapacity: Math.floor(697.89 / LINE_PITCH_PT), // 58 slots
    bottomSafetyBufferPt: Number((697.89 - Math.floor(697.89 / LINE_PITCH_PT) * LINE_PITCH_PT).toFixed(4)),
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

export interface TextMarkRun {
  /** 0-based character start offset within block textContent */
  start: number;
  /** 0-based character end offset within block textContent */
  end: number;
  /** Whether bold/strong mark is present */
  bold: boolean;
  /** Whether italic/em mark is present */
  italic: boolean;
  /** Whether underline mark is present */
  underline?: boolean;
}

export interface ScreenplayBlockInput {
  id: string;
  type: ScreenplayBlockType;
  text: string;
  /** Pre-calculated lines from TextLayoutService. If omitted, engine will lay them out using textLayoutService option. */
  lines?: LayoutLine[];
  /** Optional character name override (if type is 'character' or 'dialogue'). */
  characterName?: string;
  /** Optional explicit bold styling flag affecting line measurement */
  bold?: boolean;
  /** Optional explicit italic styling flag affecting line measurement */
  italic?: boolean;
  /** Optional array of mark runs representing mixed inline styling */
  markRuns?: TextMarkRun[];
  /** Canonical hash string representing all mark runs in this block */
  marksHash?: string;
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
  fontGeneration?: number;
  fontFamily?: string;
  fontSizePt?: number;
}

export interface IPaginationEngine {
  paginate(blocks: ScreenplayBlockInput[], options?: PaginationOptions): PaginationResult;
  clearCache(): void;
  invalidateFonts(): void;
  getCacheSize(): number;
  setFontGeneration(gen: number): void;
}

// -----------------------------------------------------------------------------
// 3.5 Bounded LRU Line-Break Cache & Key Builder
// -----------------------------------------------------------------------------

export interface LineBreakCacheKeyInputs {
  text: string;
  bold: boolean;
  italic?: boolean;
  fontFamily: string;
  fontSizePt: number;
  linePitchPt: number;
  availableWidthPt: number;
  fontGeneration: number;
  marksHash?: string;
}

export function buildLineBreakCacheKey(params: LineBreakCacheKeyInputs): string {
  const b = params.bold ? 'B1' : 'B0';
  const i = params.italic ? 'I1' : 'I0';
  const m = params.marksHash && params.marksHash !== '0' ? `m=${params.marksHash}` : 'm=0';
  const fam = params.fontFamily.replace(/\s+/g, '');
  const size = params.fontSizePt.toFixed(1);
  const pitch = params.linePitchPt.toFixed(1);
  const width = params.availableWidthPt.toFixed(2);
  const gen = params.fontGeneration;
  return `g=${gen}|f=${fam}|s=${size}|p=${pitch}|w=${width}|${b}|${i}|${m}|t=${params.text}`;
}

export class LineBreakLRUCache {
  private cache = new Map<string, LayoutLine[]>();
  private readonly maxSize: number;

  constructor(maxSize = 5000) {
    this.maxSize = maxSize;
  }

  public get(key: string): LayoutLine[] | undefined {
    const lines = this.cache.get(key);
    if (lines !== undefined) {
      this.cache.delete(key);
      this.cache.set(key, lines);
    }
    return lines;
  }

  public set(key: string, lines: LayoutLine[]): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) {
        this.cache.delete(oldest);
      }
    }
    this.cache.set(key, lines);
  }

  public clear(): void {
    this.cache.clear();
  }

  public get size(): number {
    return this.cache.size;
  }

  public has(key: string): boolean {
    return this.cache.has(key);
  }
}

// -----------------------------------------------------------------------------
// 4. Pure Pagination Engine Implementation
// -----------------------------------------------------------------------------

export class PaginationEngine implements IPaginationEngine {
  /** Bounded LRU cache of measured lines */
  private lineCache = new LineBreakLRUCache(5000);
  private fontGeneration = 0;
  private lastGeometryHash = '';

  /** Updates font-loaded generation number and invalidates line cache */
  public setFontGeneration(gen: number): void {
    if (this.fontGeneration !== gen) {
      this.fontGeneration = gen;
      this.lineCache.clear();
    }
  }

  /** Increments font generation and invalidates line cache (e.g. on font ready) */
  public invalidateFonts(): void {
    this.fontGeneration++;
    this.lineCache.clear();
  }

  /** Clears the block line measurement cache explicitly */
  public clearCache(): void {
    this.lineCache.clear();
  }

  /** Returns current number of entries stored in the line-break cache */
  public getCacheSize(): number {
    return this.lineCache.size;
  }
  /**
   * Paginates an ordered sequence of screenplay blocks across physical pages.
   * Pure, deterministic, and preserves canonical text 100%.
   */
  public paginate(blocks: ScreenplayBlockInput[], options?: PaginationOptions): PaginationResult {
    if (!Array.isArray(blocks)) {
      throw new Error(`PaginationEngine.paginate: expected array of blocks, received ${typeof blocks}`);
    }

    // Resolve profile
    const profile = options?.profile ?? createPageProfile(options?.paperSize ?? 'a4');
    validatePageProfile(profile);

    const spacing = options?.spacingRules ?? DEFAULT_SPACING_RULES;
    const moreText = options?.moreText ?? '(MORE)';
    const contdSuffix = options?.contdSuffix ?? " (CONT'D)";
    const includeFirstPageHeader = options?.includeFirstPageHeader ?? false;
    const contdSetting = options?.contdSetting ?? 'on';

    // Clear cache if font generation or geometry changed
    if (options?.fontGeneration !== undefined && options.fontGeneration !== this.fontGeneration) {
      this.fontGeneration = options.fontGeneration;
      this.lineCache.clear();
    }

    const geometryHash = `${profile.paperSize}:${profile.printableWidthPt.toFixed(2)}:${profile.printableHeightPt.toFixed(2)}:${profile.linePitchPt.toFixed(2)}`;
    if (this.lastGeometryHash && this.lastGeometryHash !== geometryHash) {
      this.lineCache.clear();
    }
    this.lastGeometryHash = geometryHash;

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
    const preparedBlocks = this.prepareBlocks(blocks, profile, options?.textLayoutService, options);

    if (preparedBlocks.length === 0) {
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

    // Step 2: Page allocation loop (Continuous Measured Block Height Model per DEC-014 / Option B)
    const pages: ScreenplayPage[] = [];
    const blockPageMap = new Map<string, Set<number>>();
    let currentSlots: PageSlotItem[] = [];
    let currentHeightPt = 0.0;
    let prevBlockType: ScreenplayBlockType | null = null;
    let prevBlockTypeBeforeCue: ScreenplayBlockType | null = null;

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
        remainingSlots: Math.max(0, profile.slotCapacity - currentSlots.length),
        isFinalPage: false,
        hasHeader,
        headerText: hasHeader ? `${pageNumber}.` : undefined,
      });
      currentSlots = [];
      currentHeightPt = 0.0;
      prevBlockType = null;
    };

    let dialogueSplitsCount = 0;
    let orphanPreventedCount = 0;
    let hasOverflow = false;
    const unfittedBlockIds: string[] = [];

    let currentSpeakerName = '';

    for (let bIdx = 0; bIdx < preparedBlocks.length; bIdx++) {
      const block = preparedBlocks[bIdx];
      const nextBlock = preparedBlocks[bIdx + 1];
      const isTop = currentSlots.length === 0;
      let marginAbovePt = calculateCollapsedMarginPt(prevBlockType, block.type, isTop);

      // 1. Scene Heading & Shot Protection (Anti-Orphan)
      if (block.type === 'scene_heading' || block.type === 'shot') {
        currentSpeakerName = '';
        const minFollow = block.type === 'scene_heading' ? spacing.sceneHeading.minLinesFollow : spacing.shot.minLinesFollow;
        const nextMarginPt = nextBlock ? calculateCollapsedMarginPt('scene_heading', nextBlock.type, false) : 0.0;
        const minNextLines = nextBlock ? Math.min(minFollow, Math.max(1, nextBlock.lines.length)) : 0;
        const headingLinesCount = Math.max(1, block.lines.length);
        const neededPt = marginAbovePt + headingLinesCount * profile.linePitchPt + nextMarginPt + minNextLines * profile.linePitchPt;

        if (currentSlots.length > 0 && currentHeightPt + neededPt > profile.printableHeightPt + TOLERANCE_PT) {
          orphanPreventedCount++;
          finalizeCurrentPage();
          marginAbovePt = calculateCollapsedMarginPt(null, block.type, true);
        }

        if (marginAbovePt > 0) {
          currentSlots.push({
            blockId: block.id,
            blockType: block.type,
            slotIndex: currentSlots.length,
            kind: 'blank_line',
            presentationText: '',
            isPresentationOnly: true,
          });
          currentHeightPt += marginAbovePt;
        }

        for (const line of block.lines) {
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
          currentHeightPt += profile.linePitchPt;
        }
        recordBlockPage(block.id, pages.length + 1);
        prevBlockType = block.type;
        continue;
      }

      // 2. Character Cue Protection (Anti-Orphan)
      if (block.type === 'character') {
        currentSpeakerName = block.characterName || normalizeCharacterName(block.text) || block.text.trim();
        const cueLinesCount = block.lines.length;

        // Check for orphaned character cue: must have non-empty spoken dialogue following it
        let hasSpokenDialogueFollow = false;
        for (let j = bIdx + 1; j < preparedBlocks.length; j++) {
          const subsequent = preparedBlocks[j];
          if (subsequent.type === 'parenthetical') {
            continue; // Parenthetical can precede dialogue
          }
          if (subsequent.type === 'dialogue') {
            if (subsequent.lines.length > 0 && subsequent.text.trim().length > 0) {
              hasSpokenDialogueFollow = true;
            }
            break;
          }
          // Any other screenplay block type breaks the speech sequence
          break;
        }

        // Do not paginate or export orphaned character cues without spoken dialogue (e.g. while user is typing trailing cue)
        if (!hasSpokenDialogueFollow) {
          recordBlockPage(block.id, currentSlots.length > 0 ? pages.length + 1 : Math.max(1, pages.length));
          prevBlockType = block.type;
          continue;
        }

        if (cueLinesCount > 0) {
          let minFollowLines = 1;
          if (nextBlock && nextBlock.type === 'parenthetical') {
            minFollowLines = 2; // Parenthetical + at least 1 dialogue line
          } else if (nextBlock && nextBlock.type === 'dialogue') {
            minFollowLines = 1;
          }
          const nextMarginPt = 0.0;
          const neededPt = marginAbovePt + cueLinesCount * profile.linePitchPt + nextMarginPt + minFollowLines * profile.linePitchPt;

          if (currentSlots.length > 0 && currentHeightPt + neededPt > profile.printableHeightPt + TOLERANCE_PT) {
            orphanPreventedCount++;
            finalizeCurrentPage();
            marginAbovePt = 0.0;
          }

          if (marginAbovePt > 0) {
            currentSlots.push({
              blockId: block.id,
              blockType: block.type,
              slotIndex: currentSlots.length,
              kind: 'blank_line',
              presentationText: '',
              isPresentationOnly: true,
            });
            currentHeightPt += marginAbovePt;
          }

          prevBlockTypeBeforeCue = prevBlockType;
          for (const line of block.lines) {
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
            currentHeightPt += profile.linePitchPt;
          }
        } else {
          // Empty character block (0 lines) - must not trigger premature page break if space is free
          const neededPt = marginAbovePt;
          if (currentSlots.length > 0 && currentHeightPt + neededPt > profile.printableHeightPt + TOLERANCE_PT) {
            finalizeCurrentPage();
            marginAbovePt = 0.0;
          }
          if (marginAbovePt > 0) {
            currentSlots.push({
              blockId: block.id,
              blockType: block.type,
              slotIndex: currentSlots.length,
              kind: 'blank_line',
              presentationText: '',
              isPresentationOnly: true,
            });
            currentHeightPt += marginAbovePt;
          }
        }
        recordBlockPage(block.id, pages.length + 1);
        prevBlockType = block.type;
        continue;
      }

      // 3. Parenthetical Protection (Anti-Orphan)
      if (block.type === 'parenthetical') {
        const parenLinesCount = Math.max(1, block.lines.length);
        const neededPt = marginAbovePt + parenLinesCount * profile.linePitchPt + 1 * profile.linePitchPt;

        if (currentSlots.length > 0 && currentHeightPt + neededPt > profile.printableHeightPt + TOLERANCE_PT) {
          orphanPreventedCount++;
          const lastSlot = currentSlots[currentSlots.length - 1];
          if (lastSlot && lastSlot.blockType === 'character') {
            const poppedCue = currentSlots.pop()!;
            currentHeightPt -= profile.linePitchPt;
            if (
              currentSlots.length > 0 &&
              currentSlots[currentSlots.length - 1].kind === 'blank_line' &&
              currentSlots[currentSlots.length - 1].blockId === poppedCue.blockId
            ) {
              currentSlots.pop();
              const cueMargin = calculateCollapsedMarginPt(prevBlockTypeBeforeCue, 'character', false);
              currentHeightPt -= cueMargin;
            }
            finalizeCurrentPage();
            currentSlots.push({ ...poppedCue, slotIndex: currentSlots.length });
            currentHeightPt += profile.linePitchPt;
            recordBlockPage(poppedCue.blockId, pages.length + 1);
            marginAbovePt = 0.0;
          } else {
            finalizeCurrentPage();
            marginAbovePt = 0.0;
          }
        }

        if (marginAbovePt > 0) {
          currentSlots.push({
            blockId: block.id,
            blockType: block.type,
            slotIndex: currentSlots.length,
            kind: 'blank_line',
            presentationText: '',
            isPresentationOnly: true,
          });
          currentHeightPt += marginAbovePt;
        }

        for (const line of block.lines) {
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
          currentHeightPt += profile.linePitchPt;
        }
        recordBlockPage(block.id, pages.length + 1);
        prevBlockType = block.type;
        continue;
      }

      // 4. Dialogue Placement & Continuation Splitting
      if (block.type === 'dialogue') {
        const blockLines = block.lines;
        if (blockLines.length === 0) {
          recordBlockPage(block.id, pages.length + 1);
          prevBlockType = block.type;
          continue;
        }

        let dLineIdx = 0;
        while (dLineIdx < blockLines.length) {
          const isCurrentTop = currentSlots.length === 0;
          const currentMarginPt = dLineIdx === 0 ? calculateCollapsedMarginPt(prevBlockType, 'dialogue', isCurrentTop) : 0.0;
          const remainingLinesCount = blockLines.length - dLineIdx;
          const fullNeededPt = currentMarginPt + remainingLinesCount * profile.linePitchPt;

          if (currentHeightPt + fullNeededPt <= profile.printableHeightPt + TOLERANCE_PT) {
            if (currentMarginPt > 0) {
              currentSlots.push({
                blockId: block.id,
                blockType: block.type,
                slotIndex: currentSlots.length,
                kind: 'blank_line',
                presentationText: '',
                isPresentationOnly: true,
              });
              currentHeightPt += currentMarginPt;
            }
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
              currentHeightPt += profile.linePitchPt;
              recordBlockPage(block.id, pages.length + 1);
              dLineIdx++;
            }
          } else {
            const availHeightPt = (profile.printableHeightPt + TOLERANCE_PT) - (currentHeightPt + currentMarginPt);
            const linesAvail = Math.floor(availHeightPt / profile.linePitchPt);
            const minSplitBefore = spacing.dialogue.minSplitBefore; // 2
            const minSplitAfter = spacing.dialogue.minSplitAfter; // 2
            const includeMore =
              contdSetting === 'more_only' ||
              contdSetting === 'both' ||
              contdSetting === 'all' ||
              contdSetting === 'on' ||
              contdSetting === 'off';

            const includeContdWithSuffix =
              contdSetting === 'contd_only' ||
              contdSetting === 'both' ||
              contdSetting === 'all' ||
              contdSetting === 'on';

            const includeContdReprintName =
              contdSetting === 'reprint_name';

            const neededForMore = includeMore ? 1 : 0;
            const linesToTake = linesAvail - neededForMore;
            const canSplit = linesToTake >= minSplitBefore && (remainingLinesCount - linesToTake) >= minSplitAfter;

            if (canSplit) {
              if (currentMarginPt > 0) {
                currentSlots.push({
                  blockId: block.id,
                  blockType: block.type,
                  slotIndex: currentSlots.length,
                  kind: 'blank_line',
                  presentationText: '',
                  isPresentationOnly: true,
                });
                currentHeightPt += currentMarginPt;
              }
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
                currentHeightPt += profile.linePitchPt;
                recordBlockPage(block.id, pages.length + 1);
                dLineIdx++;
              }
              if (includeMore) {
                // (MORE)
                currentSlots.push({
                  blockId: `${block.id}-more`,
                  blockType: block.type,
                  slotIndex: currentSlots.length,
                  kind: 'more',
                  presentationText: moreText,
                  isPresentationOnly: true,
                });
                currentHeightPt += profile.linePitchPt;
              }
              dialogueSplitsCount++;
              finalizeCurrentPage();

              // Top of next page: (CONT'D) cue or reprinted speaker name
              if (includeContdWithSuffix) {
                const contdSpeaker = currentSpeakerName || 'CHARACTER';
                currentSlots.push({
                  blockId: `${block.id}-contd`,
                  blockType: 'character',
                  slotIndex: currentSlots.length,
                  kind: 'contd',
                  presentationText: `${contdSpeaker}${contdSuffix}`,
                  isPresentationOnly: true,
                });
                currentHeightPt += profile.linePitchPt;
              } else if (includeContdReprintName) {
                const contdSpeaker = currentSpeakerName || 'CHARACTER';
                currentSlots.push({
                  blockId: `${block.id}-contd`,
                  blockType: 'character',
                  slotIndex: currentSlots.length,
                  kind: 'contd',
                  presentationText: contdSpeaker,
                  isPresentationOnly: true,
                });
                currentHeightPt += profile.linePitchPt;
              }
            } else {
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
                for (const item of itemsToMove) {
                  currentSlots.push({
                    ...item,
                    slotIndex: currentSlots.length,
                  });
                  currentHeightPt += profile.linePitchPt;
                  recordBlockPage(item.blockId, pages.length + 1);
                }
              } else {
                finalizeCurrentPage();
              }
            }
          }
        }
        prevBlockType = block.type;
        continue;
      }

      // 5. Action, Transition, and Other Standard Blocks
      {
        const blockLines = block.lines;
        if (blockLines.length === 0) {
          recordBlockPage(block.id, pages.length + 1);
          prevBlockType = block.type;
          continue;
        }

        let lIdx = 0;
        while (lIdx < blockLines.length) {
          const isCurrentTop = currentSlots.length === 0;
          const currentMarginPt = lIdx === 0 ? calculateCollapsedMarginPt(prevBlockType, block.type, isCurrentTop) : 0.0;
          const remainingLinesCount = blockLines.length - lIdx;
          const fullNeededPt = currentMarginPt + remainingLinesCount * profile.linePitchPt;

          if (currentHeightPt + fullNeededPt <= profile.printableHeightPt + TOLERANCE_PT) {
            if (currentMarginPt > 0) {
              currentSlots.push({
                blockId: block.id,
                blockType: block.type,
                slotIndex: currentSlots.length,
                kind: 'blank_line',
                presentationText: '',
                isPresentationOnly: true,
              });
              currentHeightPt += currentMarginPt;
            }
            while (lIdx < blockLines.length) {
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
              currentHeightPt += profile.linePitchPt;
              recordBlockPage(block.id, pages.length + 1);
              lIdx++;
            }
          } else {
            const availHeightPt = (profile.printableHeightPt + TOLERANCE_PT) - (currentHeightPt + currentMarginPt);
            const linesAvail = Math.floor(availHeightPt / profile.linePitchPt);

            if (linesAvail >= 1 && (remainingLinesCount - linesAvail) >= 1) {
              if (currentMarginPt > 0) {
                currentSlots.push({
                  blockId: block.id,
                  blockType: block.type,
                  slotIndex: currentSlots.length,
                  kind: 'blank_line',
                  presentationText: '',
                  isPresentationOnly: true,
                });
                currentHeightPt += currentMarginPt;
              }
              for (let i = 0; i < linesAvail; i++) {
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
                currentHeightPt += profile.linePitchPt;
                recordBlockPage(block.id, pages.length + 1);
                lIdx++;
              }
              finalizeCurrentPage();
            } else {
              if (currentSlots.length > 0) {
                finalizeCurrentPage();
              } else {
                // Must place at least 1 line to prevent infinite loop
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
                currentHeightPt += profile.linePitchPt;
                recordBlockPage(block.id, pages.length + 1);
                lIdx++;
              }
            }
          }
        }
        prevBlockType = block.type;
        continue;
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

    // Reconstruct finalBlockPageMap from actual slots on finalized pages
    // so any items popped and moved during orphan prevention reflect their true pages
    const finalBlockPageMap = new Map<string, number[]>();
    for (const page of pages) {
      for (const slot of page.slots) {
        if (!slot.blockId) continue;
        const rawBlockId = slot.blockId.replace(/-(more|contd)$/, '');
        let arr = finalBlockPageMap.get(rawBlockId);
        if (!arr) {
          arr = [];
          finalBlockPageMap.set(rawBlockId, arr);
        }
        if (!arr.includes(page.pageNumber)) {
          arr.push(page.pageNumber);
        }
      }
    }
    // Also ensure any 0-line empty blocks are retained
    for (const [id, set] of blockPageMap.entries()) {
      if (!finalBlockPageMap.has(id)) {
        finalBlockPageMap.set(id, Array.from(set));
      }
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
    layoutService?: ITextLayoutService,
    options?: PaginationOptions
  ): { id: string; type: ScreenplayBlockType; text: string; lines: LayoutLine[]; characterName?: string }[] {
    const defaultFontFamily = options?.fontFamily ?? 'Courier Prime, Noto Sans Gurmukhi, monospace';
    const defaultFontSizePt = options?.fontSizePt ?? 12;
    const linePitchPt = profile.linePitchPt;

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

      const isBold = b.bold ?? (b.type === 'scene_heading' || b.type === 'character' || b.type === 'shot');
      const isItalic = b.italic ?? false;

      // Compute element printable width based on screenplay margins
      const availableWidthPt = this.getElementPrintableWidth(b.type, profile.printableWidthPt);
      const constraints: LayoutConstraints = {
        availableWidthPt,
        fontSizePt: defaultFontSizePt,
        bold: isBold,
        italic: isItalic,
        markRuns: b.markRuns,
      };

      if (b.text.length === 0) {
        return {
          id: b.id,
          type: b.type,
          text: b.text,
          lines: [],
          characterName: b.characterName,
        };
      }

      const cacheKey = buildLineBreakCacheKey({
        text: b.text,
        bold: isBold,
        italic: isItalic,
        fontFamily: defaultFontFamily,
        fontSizePt: defaultFontSizePt,
        linePitchPt,
        availableWidthPt,
        fontGeneration: this.fontGeneration,
        marksHash: b.marksHash,
      });

      let lines = this.lineCache.get(cacheKey);
      if (!lines) {
        const result = layoutService.layoutText(b.text, constraints);
        lines = result.lines;
        this.lineCache.set(cacheKey, lines);
      }

      return {
        id: b.id,
        type: b.type,
        text: b.text,
        lines,
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
        // Centered across full printable width of screenplay writing area
        return printableWidthPt;
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
}

// -----------------------------------------------------------------------------
// Factory
// -----------------------------------------------------------------------------

export function createPaginationEngine(): IPaginationEngine {
  return new PaginationEngine();
}
