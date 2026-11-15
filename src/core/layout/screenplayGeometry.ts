/**
 * screenplayGeometry.ts - Single Source of Truth for Screenplay Geometry
 *
 * Governing Context: Canonical geometry established per user decision (Option B).
 * Line pitch is derived directly from the live editor CSS (12pt font * 1.4 line-height = 22.4px = 16.8pt).
 * Block margins match existing CSS margins with margin collapsing.
 * Both the editor DOM and the PDF exporter import and use these exact specifications.
 */

import { PaperSize, ScreenplayBlockType } from '../../types/screenplay';

export interface ElementSpacing {
  marginTopPx: number;
  marginBottomPx: number;
  marginTopPt: number;
  marginBottomPt: number;
}

export interface PaperGeometry {
  paperSize: PaperSize;
  widthPx: number;
  heightPx: number;
  widthPt: number;
  heightPt: number;
  widthCss: string;
  heightCss: string;

  marginTopPx: number;
  marginBottomPx: number;
  marginLeftPx: number;
  marginRightPx: number;

  marginTopPt: number;
  marginBottomPt: number;
  marginLeftPt: number;
  marginRightPt: number;

  marginTopCss: string;
  marginBottomCss: string;
  marginLeftCss: string;
  marginRightCss: string;

  printableWidthPx: number;
  printableHeightPx: number;
  printableWidthPt: number;
  printableHeightPt: number;
}

// -----------------------------------------------------------------------------
// 1. Core Typographic Constants (Option B)
// -----------------------------------------------------------------------------

export const FONT_SIZE_PT = 12;
export const FONT_SIZE_PX = 16; // 12pt * (96 / 72) = 16px

/**
 * Canonical line pitch constant.
 * User requested comparison at 16px, 20px, and 22.4px.
 * Default until user chooses visually: 20px.
 */
export const LINE_PITCH_PX = 20.0;
export const LINE_PITCH_PT = LINE_PITCH_PX * (72 / 96); // 15.0pt

/**
 * Shared font stack and rendering directives across Editor DOM, Measurement, and Exporter.
 */
export const CANONICAL_FONT_STACK = '"Courier Prime", "Noto Sans Gurmukhi", monospace';
export const CANONICAL_TEXT_RENDERING = 'optimizeLegibility';
export const CANONICAL_FONT_KERNING = 'normal';
export const CANONICAL_FONT_FEATURE_SETTINGS = '"kern" 1, "liga" 1';
export const CANONICAL_WEBKIT_FONT_SMOOTHING = 'antialiased';

// -----------------------------------------------------------------------------
// 2. Canonical Margins & Page Dimensions (Symmetric 1in Top/Bottom)
// -----------------------------------------------------------------------------

export const MARGIN_TOP_IN = 1.0;
export const MARGIN_BOTTOM_IN = 1.0;
export const MARGIN_LEFT_IN = 1.5;
export const MARGIN_RIGHT_IN = 1.0;

export const MARGIN_TOP_PX = 96.0; // 1.0in * 96
export const MARGIN_BOTTOM_PX = 96.0; // 1.0in * 96
export const MARGIN_LEFT_PX = 144.0; // 1.5in * 96
export const MARGIN_RIGHT_PX = 96.0; // 1.0in * 96

export const MARGIN_TOP_PT = 72.0; // 1.0in * 72
export const MARGIN_BOTTOM_PT = 72.0;
export const MARGIN_LEFT_PT = 108.0;
export const MARGIN_RIGHT_PT = 72.0;

export const PAPER_GEOMETRIES: Record<PaperSize, PaperGeometry> = {
  letter: {
    paperSize: 'letter',
    widthPx: 816.0, // 8.5in * 96
    heightPx: 1056.0, // 11.0in * 96
    widthPt: 612.0, // 8.5in * 72
    heightPt: 792.0, // 11.0in * 72
    widthCss: '8.5in',
    heightCss: '11.0in',

    marginTopPx: MARGIN_TOP_PX,
    marginBottomPx: MARGIN_BOTTOM_PX,
    marginLeftPx: MARGIN_LEFT_PX,
    marginRightPx: MARGIN_RIGHT_PX,

    marginTopPt: MARGIN_TOP_PT,
    marginBottomPt: MARGIN_BOTTOM_PT,
    marginLeftPt: MARGIN_LEFT_PT,
    marginRightPt: MARGIN_RIGHT_PT,

    marginTopCss: '1.0in',
    marginBottomCss: '1.0in',
    marginLeftCss: '1.5in',
    marginRightCss: '1.0in',

    printableWidthPx: 576.0, // 816 - 144 - 96 = 576px (6.0in)
    printableHeightPx: 864.0, // 1056 - 96 - 96 = 864px (9.0in)
    printableWidthPt: 432.0, // 612 - 108 - 72 = 432pt (6.0in)
    printableHeightPt: 648.0, // 792 - 72 - 72 = 648pt (9.0in)
  },

  a4: {
    paperSize: 'a4',
    widthPx: 793.7, // 210mm in px at 96 DPI
    heightPx: 1122.5, // 297mm in px at 96 DPI
    widthPt: 595.28,
    heightPt: 841.89,
    widthCss: '210mm',
    heightCss: '297mm',

    marginTopPx: MARGIN_TOP_PX, // 25.4mm = 1in = 96px
    marginBottomPx: MARGIN_BOTTOM_PX,
    marginLeftPx: 144.0, // 38.1mm = 1.5in = 144px
    marginRightPx: MARGIN_RIGHT_PX,

    marginTopPt: MARGIN_TOP_PT,
    marginBottomPt: MARGIN_BOTTOM_PT,
    marginLeftPt: MARGIN_LEFT_PT,
    marginRightPt: MARGIN_RIGHT_PT,

    marginTopCss: '25.4mm',
    marginBottomCss: '25.4mm',
    marginLeftCss: '38.1mm',
    marginRightCss: '25.4mm',

    printableWidthPx: 553.7, // 793.7 - 144 - 96 = 553.7px (146.5mm)
    printableHeightPx: 930.5, // 1122.5 - 96 - 96 = 930.5px (246.2mm)
    printableWidthPt: 415.28,
    printableHeightPt: 697.89,
  },
};

// -----------------------------------------------------------------------------
// 3. Element Spacing Rules (Canonical CSS Margins)
// -----------------------------------------------------------------------------

export const ELEMENT_SPACING: Record<ScreenplayBlockType, ElementSpacing> = {
  scene_heading: {
    marginTopPx: 2 * LINE_PITCH_PX,
    marginBottomPx: LINE_PITCH_PX,
    marginTopPt: 2 * LINE_PITCH_PT,
    marginBottomPt: LINE_PITCH_PT,
  },
  action: {
    marginTopPx: 0.0,
    marginBottomPx: LINE_PITCH_PX,
    marginTopPt: 0.0,
    marginBottomPt: LINE_PITCH_PT,
  },
  character: {
    marginTopPx: LINE_PITCH_PX,
    marginBottomPx: 0.0,
    marginTopPt: LINE_PITCH_PT,
    marginBottomPt: 0.0,
  },
  parenthetical: {
    marginTopPx: 0.0,
    marginBottomPx: 0.0,
    marginTopPt: 0.0,
    marginBottomPt: 0.0,
  },
  dialogue: {
    marginTopPx: 0.0,
    marginBottomPx: LINE_PITCH_PX,
    marginTopPt: 0.0,
    marginBottomPt: LINE_PITCH_PT,
  },
  transition: {
    marginTopPx: LINE_PITCH_PX,
    marginBottomPx: LINE_PITCH_PX,
    marginTopPt: LINE_PITCH_PT,
    marginBottomPt: LINE_PITCH_PT,
  },
  shot: {
    marginTopPx: LINE_PITCH_PX,
    marginBottomPx: LINE_PITCH_PX,
    marginTopPt: LINE_PITCH_PT,
    marginBottomPt: LINE_PITCH_PT,
  },
};

/**
 * Calculates collapsed vertical margin between two sequential screenplay blocks.
 * In CSS, adjacent vertical margins collapse to Math.max(bottom1, top2).
 * Character cues sit directly above dialogue/parentheticals (0px margin).
 */
export function calculateCollapsedMarginPx(
  prevType: ScreenplayBlockType | null,
  nextType: ScreenplayBlockType,
  isPageTop: boolean
): number {
  if (isPageTop || prevType === null) {
    // Spacing dropped completely at page top for all elements including scene headings
    return 0.0;
  }
  // Character cue directly above parenthetical or dialogue:
  if (
    (prevType === 'character' || prevType === 'parenthetical') &&
    (nextType === 'dialogue' || nextType === 'parenthetical')
  ) {
    return 0.0;
  }
  const prevBottom = ELEMENT_SPACING[prevType]?.marginBottomPx || 0.0;
  const nextTop = ELEMENT_SPACING[nextType]?.marginTopPx || 0.0;
  return Math.max(prevBottom, nextTop);
}

// -----------------------------------------------------------------------------
// 4. Authoritative Block Style Specifications (Generates CSS values without !important)
// -----------------------------------------------------------------------------

export interface BlockStyleSpecification {
  fontSizePx: number;
  linePitchPx: number;
  marginTopPx: number;
  marginBottomPx: number;
  marginLeftPx: number;
  maxWidthPx?: number;
  fontWeight?: string;
  textTransform?: string;
}

export const SCREENPLAY_BLOCK_STYLES: Record<ScreenplayBlockType, BlockStyleSpecification> = {
  scene_heading: {
    fontSizePx: FONT_SIZE_PX,
    linePitchPx: LINE_PITCH_PX,
    marginTopPx: 2 * LINE_PITCH_PX, // 40px
    marginBottomPx: LINE_PITCH_PX,   // 20px
    marginLeftPx: 0.0,
    maxWidthPx: 576.0, // 6.0in * 96
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  action: {
    fontSizePx: FONT_SIZE_PX,
    linePitchPx: LINE_PITCH_PX,
    marginTopPx: 0.0,
    marginBottomPx: LINE_PITCH_PX, // 20px
    marginLeftPx: 0.0,
    maxWidthPx: 576.0, // 6.0in * 96
  },
  character: {
    fontSizePx: FONT_SIZE_PX,
    linePitchPx: LINE_PITCH_PX,
    marginTopPx: LINE_PITCH_PX, // 20px
    marginBottomPx: 0.0,
    marginLeftPx: 211.2, // 2.2in * 96
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  parenthetical: {
    fontSizePx: FONT_SIZE_PX,
    linePitchPx: LINE_PITCH_PX,
    marginTopPx: 0.0,
    marginBottomPx: 0.0,
    marginLeftPx: 153.6, // 1.6in * 96
    maxWidthPx: 211.2,   // 2.2in * 96
  },
  dialogue: {
    fontSizePx: FONT_SIZE_PX,
    linePitchPx: LINE_PITCH_PX,
    marginTopPx: 0.0,
    marginBottomPx: LINE_PITCH_PX, // 20px
    marginLeftPx: 96.0,  // 1.0in * 96
    maxWidthPx: 336.0,   // 3.5in * 96
  },
  transition: {
    fontSizePx: FONT_SIZE_PX,
    linePitchPx: LINE_PITCH_PX,
    marginTopPx: LINE_PITCH_PX, // 20px
    marginBottomPx: LINE_PITCH_PX, // 20px
    marginLeftPx: 384.0, // 4.0in * 96
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  shot: {
    fontSizePx: FONT_SIZE_PX,
    linePitchPx: LINE_PITCH_PX,
    marginTopPx: LINE_PITCH_PX, // 20px
    marginBottomPx: LINE_PITCH_PX, // 20px
    marginLeftPx: 0.0,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
};

/**
 * Generates clean CSS declarations derived directly from screenplayGeometry.ts.
 */
export function generateBlockCssRules(): string {
  const cssClassMap: Record<ScreenplayBlockType, string> = {
    scene_heading: 'block-scene-heading',
    action: 'block-action',
    character: 'block-character',
    parenthetical: 'block-parenthetical',
    dialogue: 'block-dialogue',
    transition: 'block-transition',
    shot: 'block-shot',
  };

  const rules: string[] = [];
  (Object.keys(SCREENPLAY_BLOCK_STYLES) as ScreenplayBlockType[]).forEach((type) => {
    const spec = SCREENPLAY_BLOCK_STYLES[type];
    const className = cssClassMap[type];
    const declarations: string[] = [
      `  font-size: ${spec.fontSizePx}px;`,
      `  line-height: var(--screenplay-line-pitch, ${spec.linePitchPx}px);`,
      `  margin-top: ${spec.marginTopPx}px;`,
      `  margin-bottom: ${spec.marginBottomPx}px;`,
    ];
    if (spec.marginLeftPx > 0) {
      declarations.push(`  margin-left: ${(spec.marginLeftPx / 96).toFixed(1)}in;`);
    }
    if (spec.maxWidthPx) {
      declarations.push(`  max-width: ${(spec.maxWidthPx / 96).toFixed(1)}in;`);
    }
    if (spec.fontWeight) {
      declarations.push(`  font-weight: ${spec.fontWeight};`);
    }
    if (spec.textTransform) {
      declarations.push(`  text-transform: ${spec.textTransform};`);
    }
    declarations.push('  overflow: visible;');
    rules.push(`.ProseMirror .${className} {\n${declarations.join('\n')}\n}`);
  });

  return rules.join('\n\n');
}

/**
 * Calculates printable width for different screenplay block types.
 */
export function getElementPrintableWidthPx(type: ScreenplayBlockType, printableWidthPx: number): number {
  switch (type) {
    case 'character':
      // Left margin: 2.2in (211.2px). Printable width = printableWidthPx - 211.2px
      return Math.max(130.0, printableWidthPx - 211.2);
    case 'parenthetical':
      // Left margin: 1.6in (153.6px). Max width: 2.2in (211.2px)
      return Math.min(211.2, Math.max(130.0, printableWidthPx - 153.6));
    case 'dialogue':
      // Left margin: 1.0in (96.0px). Max width: 3.5in (336.0px)
      return Math.min(336.0, Math.max(130.0, printableWidthPx - 96.0));
    case 'transition':
      // Left margin: 4.0in (384.0px)
      return Math.max(100.0, printableWidthPx - 384.0);
    case 'scene_heading':
    case 'action':
    case 'shot':
    default:
      return printableWidthPx;
  }
}
