/**
 * textLayoutService.ts - Pure, Deterministic Text Layout & Line-Wrapping Engine
 * Governing Context: AKHAR-ARCH-PAG — Milestone M1B
 *
 * Implements pure text layout and line-wrapping for AkharStudio:
 * 1. Measures text via IFontMetricsProvider (physical point units).
 * 2. Word-aware boundary segmentation via Intl.Segmenter.
 * 3. Unicode Grapheme Cluster preservation (never breaks inside an akshara/cluster).
 * 4. Deterministic long-token handling via configurable overflow policy ('break-word' | 'overflow' | 'clip').
 * 5. 100% exact source preservation: concatenating line texts reproduces original input exactly.
 * 6. Contiguous UTF-16 code unit offset mapping (sourceStartOffset, sourceEndOffset).
 * 7. Explicit newline (\n, \r\n, \r) and tab (\t) handling.
 *
 * INDEPENDENCE:
 * This module is completely decoupled from ProseMirror, React, Electron, DOM, and SQLite.
 * It does NOT calculate screenplay page breaks or pagination metadata.
 */

import { IFontMetricsProvider } from './fontMetrics';

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

export type OverflowPolicy = 'break-word' | 'overflow' | 'clip';

export type LineBreakReason = 'newline' | 'wrap' | 'overflow' | 'end';

export interface LayoutConstraints {
  /** Available printable line width in physical points (pt). Must be > 0. */
  availableWidthPt: number;
  /** Font size in physical points (pt). Defaults to 12pt. */
  fontSizePt?: number;
  /** Whether text should be measured with bold styling. Defaults to false. */
  bold?: boolean;
  /** Whether text should be measured with italic styling. Defaults to false. */
  italic?: boolean;
  /** Explicit tab stop interval in points (pt). Defaults to 4 space widths (or 36.0pt). */
  tabWidthPt?: number;
  /** Policy when an unbreakable word exceeds availableWidthPt. Defaults to 'break-word'. */
  overflowPolicy?: OverflowPolicy;
  /** BCP-47 language tag for Intl.Segmenter. Defaults to 'pa' (Punjabi). */
  locale?: string;
}

export interface ClippedPresentationMetadata {
  /** The grapheme-safe prefix string that fits within availableWidthPt without overflowing. */
  visibleText: string;
  /** UTF-16 code unit count of visibleText. */
  visibleLength: number;
  /** Measured visual advance width in physical points (pt) of visibleText. */
  visibleWidthPt: number;
}

export interface LayoutLine {
  /**
   * Exact text content of this line, including any trailing spaces or trailing newline sequence.
   * Concatenating all lines in reading order reproduces original input exactly.
   */
  text: string;
  /** UTF-16 code unit start offset in the original input string (inclusive). */
  sourceStartOffset: number;
  /** UTF-16 code unit end offset in the original input string (exclusive). */
  sourceEndOffset: number;
  /** Visual advance width in points (pt), excluding trailing soft-wrap whitespace and newlines. */
  measuredWidthPt: number;
  /** Full visual advance width in points (pt), including trailing soft-wrap whitespace. */
  fullWidthPt: number;
  /** Whether this line exceeded availableWidthPt. */
  isOverflow: boolean;
  /** Reason why this line terminated. */
  breakReason: LineBreakReason;
  /**
   * Presentation metadata populated when overflowPolicy is 'clip'.
   * The underlying line.text is NEVER truncated or discarded, guaranteeing 100% exact
   * source reconstruction and unbroken contiguous offsets.
   */
  clippedPresentation?: ClippedPresentationMetadata;
}

export interface TextLayoutDiagnostics {
  hasOverflow: boolean;
  unbreakableTokens: string[];
}

export interface TextLayoutResult {
  /** Ordered list of lines representing the laid-out text. */
  lines: LayoutLine[];
  /** Total number of lines. */
  totalLineCount: number;
  /** Maximum visual width among all lines in physical points (pt). */
  maxLineWidthPt: number;

  /**
   * Informational typographic line-box height in physical points (pt) derived from font metrics (ascent + descent).
   *
   * ARCHITECTURAL BOUNDARY:
   * This is an unpaginated single-block line-box height estimate. It does NOT establish
   * authoritative screenplay page geometry, vertical page margins, page-split positions,
   * or the 18pt baseline grid pitch.
   * Authoritative page geometry and vertical slot allocations (38 slots for A4, 36 slots
   * for Letter, 18pt baseline grid) belong strictly to Milestone M1C Pagination Engine.
   */
  lineHeightPt: number;

  /**
   * Total unpaginated height of all lines in physical points (pt): totalLineCount * lineHeightPt.
   * NOTE: This is solely a continuous block height estimate and does NOT represent final
   * paginated page height or element-specific vertical leadings.
   */
  totalMeasuredHeightPt: number;

  /** Diagnostics regarding overflow or special layout conditions. */
  diagnostics: TextLayoutDiagnostics;
}

export interface ITextLayoutService {
  layoutText(text: string, constraints: LayoutConstraints): TextLayoutResult;
}

// -----------------------------------------------------------------------------
// Internal Helper Structures
// -----------------------------------------------------------------------------

interface ParagraphSegment {
  content: string;
  newline: string;
  startOffset: number;
  endOffset: number;
}

// -----------------------------------------------------------------------------
// Text Layout Service Implementation
// -----------------------------------------------------------------------------

export class TextLayoutService implements ITextLayoutService {
  constructor(private readonly fontMetrics: IFontMetricsProvider) {
    if (!fontMetrics) {
      throw new Error('TextLayoutService: a valid IFontMetricsProvider must be supplied');
    }
  }

  /**
   * Formats and wraps text within available width constraints.
   * Preserves exact source characters and contiguous UTF-16 offsets.
   */
  public layoutText(text: string, constraints: LayoutConstraints): TextLayoutResult {
    if (typeof text !== 'string') {
      throw new Error(`layoutText: expected string text, received ${typeof text}`);
    }
    if (!constraints || typeof constraints !== 'object') {
      throw new Error('layoutText: layout constraints object is required');
    }

    const {
      availableWidthPt,
      fontSizePt = 12,
      bold = false,
      italic = false,
      tabWidthPt,
      overflowPolicy = 'break-word',
      locale = 'pa',
    } = constraints;

    if (!Number.isFinite(availableWidthPt) || availableWidthPt <= 0 || Number.isNaN(availableWidthPt)) {
      throw new Error(`layoutText: availableWidthPt must be a positive finite number, received ${availableWidthPt}`);
    }
    if (!Number.isFinite(fontSizePt) || fontSizePt <= 0 || Number.isNaN(fontSizePt)) {
      throw new Error(`layoutText: fontSizePt must be a positive finite number, received ${fontSizePt}`);
    }

    // Resolve line box height from metrics
    const lineBox = this.fontMetrics.getLineBoxMetrics(fontSizePt);
    const lineHeightPt = lineBox.lineBoxHeightPt;

    // Resolve tab stop in points
    const spaceWidth = this.fontMetrics.measureWidth(' ', fontSizePt, bold, italic);
    const resolvedTabStopPt = tabWidthPt && tabWidthPt > 0 ? tabWidthPt : Math.max(36.0, spaceWidth * 4);

    // Measurement helper incorporating tab stops
    const measure = (str: string): number => {
      return this.measureStringWithTabs(str, fontSizePt, bold, italic, resolvedTabStopPt);
    };

    // 1. Handle completely empty input
    if (text.length === 0) {
      const singleEmptyLine: LayoutLine = {
        text: '',
        sourceStartOffset: 0,
        sourceEndOffset: 0,
        measuredWidthPt: 0,
        fullWidthPt: 0,
        isOverflow: false,
        breakReason: 'end',
      };
      return {
        lines: [singleEmptyLine],
        totalLineCount: 1,
        maxLineWidthPt: 0,
        lineHeightPt,
        totalMeasuredHeightPt: lineHeightPt,
        diagnostics: {
          hasOverflow: false,
          unbreakableTokens: [],
        },
      };
    }

    // 2. Split into hard paragraphs by newline sequences (\r\n, \n, \r)
    const paragraphs = this.splitIntoParagraphs(text);

    const allLines: LayoutLine[] = [];
    const diagnostics: TextLayoutDiagnostics = {
      hasOverflow: false,
      unbreakableTokens: [],
    };

    let globalOffset = 0;

    for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
      const para = paragraphs[pIdx];
      const isLastParagraph = pIdx === paragraphs.length - 1;

      // Layout paragraph content
      const paraLines = this.layoutSingleParagraph(
        para.content,
        para.newline,
        globalOffset,
        measure,
        availableWidthPt,
        overflowPolicy,
        locale,
        isLastParagraph,
        diagnostics
      );

      for (const line of paraLines) {
        allLines.push(line);
      }

      globalOffset = para.endOffset;
    }

    // Compute aggregate summary metrics
    let maxLineWidthPt = 0;
    for (const l of allLines) {
      if (l.measuredWidthPt > maxLineWidthPt) {
        maxLineWidthPt = l.measuredWidthPt;
      }
    }

    return {
      lines: allLines,
      totalLineCount: allLines.length,
      maxLineWidthPt: Number(maxLineWidthPt.toFixed(4)),
      lineHeightPt: Number(lineHeightPt.toFixed(4)),
      totalMeasuredHeightPt: Number((allLines.length * lineHeightPt).toFixed(4)),
      diagnostics,
    };
  }

  /**
   * Splits input text into paragraphs, preserving exact newline character sequences.
   */
  private splitIntoParagraphs(text: string): ParagraphSegment[] {
    const paras: ParagraphSegment[] = [];
    let start = 0;
    const len = text.length;
    let i = 0;

    while (i < len) {
      if (text[i] === '\r' && i + 1 < len && text[i + 1] === '\n') {
        paras.push({
          content: text.slice(start, i),
          newline: '\r\n',
          startOffset: start,
          endOffset: i + 2,
        });
        start = i + 2;
        i += 2;
      } else if (text[i] === '\n' || text[i] === '\r') {
        const nl = text[i];
        paras.push({
          content: text.slice(start, i),
          newline: nl,
          startOffset: start,
          endOffset: i + 1,
        });
        start = i + 1;
        i += 1;
      } else {
        i++;
      }
    }

    if (start < len || paras.length > 0) {
      paras.push({
        content: text.slice(start, len),
        newline: '',
        startOffset: start,
        endOffset: len,
      });
    }

    return paras;
  }

  /**
   * Lays out a single paragraph of text (without internal newlines).
   */
  private layoutSingleParagraph(
    content: string,
    newline: string,
    startOffset: number,
    measure: (s: string) => number,
    availableWidthPt: number,
    overflowPolicy: OverflowPolicy,
    locale: string,
    isLastParagraph: boolean,
    diagnostics: TextLayoutDiagnostics
  ): LayoutLine[] {
    const lines: LayoutLine[] = [];
    let currentOffset = startOffset;

    // Helper to commit a line
    const commitLine = (
      lineChunks: string[],
      reason: LineBreakReason,
      isOverflow = false,
      appendNewline = '',
      clippedPresentation?: ClippedPresentationMetadata
    ): void => {
      const rawText = lineChunks.join('') + appendNewline;
      const lineStart = currentOffset;
      const lineEnd = lineStart + rawText.length;
      currentOffset = lineEnd;

      // Extract printable portion (excluding trailing spaces and newlines)
      const match = rawText.match(/^(.*?)(\s*)$/s);
      const visibleText = match ? match[1] : rawText;

      const measuredWidth = visibleText.length > 0 ? measure(visibleText) : 0;
      const fullWidth = rawText.length > 0 ? measure(rawText) : 0;

      const lineIsOverflow = isOverflow || measuredWidth > availableWidthPt;

      if (lineIsOverflow) {
        diagnostics.hasOverflow = true;
      }

      const line: LayoutLine = {
        text: rawText,
        sourceStartOffset: lineStart,
        sourceEndOffset: lineEnd,
        measuredWidthPt: Number(measuredWidth.toFixed(4)),
        fullWidthPt: Number(fullWidth.toFixed(4)),
        isOverflow: lineIsOverflow,
        breakReason: reason,
      };

      if (clippedPresentation) {
        line.clippedPresentation = clippedPresentation;
      }

      lines.push(line);
    };

    // If paragraph has empty content, emit a single line with the newline
    if (content.length === 0) {
      commitLine([], newline ? 'newline' : (isLastParagraph ? 'end' : 'newline'), false, newline);
      return lines;
    }

    // Tokenize paragraph content into layout chunks
    const chunks = this.tokenizeIntoChunks(content, locale);

    const getVisibleWidth = (chunkList: string[]): number => {
      const joined = chunkList.join('');
      const match = joined.match(/^(.*?)(\s*)$/s);
      const visible = match ? match[1] : joined;
      return visible.length > 0 ? measure(visible) : 0;
    };

    let currentLineChunks: string[] = [];

    for (let cIdx = 0; cIdx < chunks.length; cIdx++) {
      const chunk = chunks[cIdx];
      const candidateChunks = [...currentLineChunks, chunk];
      const candidateWidth = getVisibleWidth(candidateChunks);

      if (candidateWidth <= availableWidthPt || currentLineChunks.length === 0) {
        if (candidateWidth <= availableWidthPt) {
          // Fits on current line
          currentLineChunks.push(chunk);
        } else {
          // Chunk does not fit even on a fresh empty line!
          diagnostics.unbreakableTokens.push(chunk.trim());

          if (overflowPolicy === 'break-word') {
            // Break chunk by Unicode Grapheme Clusters
            this.breakChunkByGraphemes(
              chunk,
              locale,
              measure,
              availableWidthPt,
              commitLine,
              (remainingChunk) => {
                currentLineChunks = [remainingChunk];
              }
            );
          } else if (overflowPolicy === 'overflow') {
            // Force entire chunk onto this line as an overflow line
            commitLine([chunk], 'overflow', true);
            currentLineChunks = [];
          } else {
            // 'clip' policy: place as many graphemes as fit and clip remainder
            this.clipChunkByGraphemes(chunk, locale, measure, availableWidthPt, commitLine);
            currentLineChunks = [];
          }
        }
      } else {
        // Chunk does not fit on current non-empty line; wrap and re-evaluate on fresh line
        commitLine(currentLineChunks, 'wrap', false);
        currentLineChunks = [];
        cIdx--;
      }
    }

    // Commit any remaining chunks on the last line of this paragraph
    if (currentLineChunks.length > 0) {
      const finalReason = newline ? 'newline' : (isLastParagraph ? 'end' : 'wrap');
      commitLine(currentLineChunks, finalReason, false, newline);
    } else if (newline) {
      commitLine([], 'newline', false, newline);
    }

    return lines;
  }

  /**
   * Tokenizes paragraph content into atomic layout chunks.
   * Glues trailing punctuation and whitespace to words, allowing breaks after hyphens or whitespace.
   */
  private tokenizeIntoChunks(text: string, locale: string): string[] {
    const chunks: string[] = [];
    const seg = new Intl.Segmenter(locale, { granularity: 'word' });
    const segments = Array.from(seg.segment(text));

    let currentChunk = '';

    for (let i = 0; i < segments.length; i++) {
      const str = segments[i].segment;
      const hasSpace = /[\s\u00A0]/.test(str);
      const hasHyphen = str === '-' || str === '—' || str === '–';

      currentChunk += str;

      if (hasSpace || hasHyphen || i === segments.length - 1) {
        // Lookahead: attach immediately following non-whitespace punctuation
        const next = segments[i + 1];
        if (next && !next.isWordLike && !/[\s\u00A0]/.test(next.segment) && !hasSpace) {
          continue;
        }
        chunks.push(currentChunk);
        currentChunk = '';
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * Breaks an oversized token using Unicode Grapheme Clusters under 'break-word'.
   * Never splits a grapheme cluster. Guarantees forward progress on every line,
   * even when a single grapheme cluster exceeds availableWidthPt.
   */
  private breakChunkByGraphemes(
    chunk: string,
    locale: string,
    measure: (s: string) => number,
    availableWidthPt: number,
    commitLine: (
      chunks: string[],
      reason: LineBreakReason,
      isOverflow?: boolean,
      appendNewline?: string,
      clippedPresentation?: ClippedPresentationMetadata
    ) => void,
    onRemaining: (remainingChunk: string) => void
  ): void {
    const match = chunk.match(/^(.*?)(\s+)$/s);
    const core = match ? match[1] : chunk;
    const trailing = match ? match[2] : '';

    const seg = new Intl.Segmenter(locale, { granularity: 'grapheme' });
    const graphemes = Array.from(seg.segment(core)).map((s) => s.segment);

    let curGraphemes: string[] = [];

    for (let gIdx = 0; gIdx < graphemes.length; gIdx++) {
      const g = graphemes[gIdx];
      const testList = [...curGraphemes, g];
      const testWidth = measure(testList.join(''));

      if (testWidth <= availableWidthPt || curGraphemes.length === 0) {
        curGraphemes.push(g);
      } else {
        // Commit current grapheme line (marked as overflow if curGraphemes width exceeds availableWidthPt)
        const curWidth = measure(curGraphemes.join(''));
        commitLine([curGraphemes.join('')], 'wrap', curWidth > availableWidthPt);
        curGraphemes = [g];
      }
    }

    if (curGraphemes.length > 0) {
      // Remaining graphemes plus any trailing whitespace
      onRemaining(curGraphemes.join('') + trailing);
    } else if (trailing.length > 0) {
      onRemaining(trailing);
    }
  }

  /**
   * Calculates presentation clipping metadata for an oversized token under 'clip' policy.
   * CRITICAL INVARIANT: The complete chunk is preserved in the LayoutLine, ensuring
   * 100% exact source reconstruction and contiguous offsets. Clipping is strictly
   * represented as presentation metadata.
   */
  private clipChunkByGraphemes(
    chunk: string,
    locale: string,
    measure: (s: string) => number,
    availableWidthPt: number,
    commitLine: (
      chunks: string[],
      reason: LineBreakReason,
      isOverflow?: boolean,
      appendNewline?: string,
      clippedPresentation?: ClippedPresentationMetadata
    ) => void
  ): void {
    const seg = new Intl.Segmenter(locale, { granularity: 'grapheme' });
    const graphemes = Array.from(seg.segment(chunk)).map((s) => s.segment);
    const fitted: string[] = [];

    for (const g of graphemes) {
      const testList = [...fitted, g];
      if (measure(testList.join('')) <= availableWidthPt || fitted.length === 0) {
        fitted.push(g);
      } else {
        break;
      }
    }

    const visibleText = fitted.join('');
    const visibleWidthPt = Number(measure(visibleText).toFixed(4));

    const clippedPresentation: ClippedPresentationMetadata = {
      visibleText,
      visibleLength: visibleText.length,
      visibleWidthPt,
    };

    // Commit the ENTIRE chunk so source text is 100% preserved!
    commitLine([chunk], 'overflow', true, '', clippedPresentation);
  }

  /**
   * Measures visual advance width of text, calculating physical positions across tab stops.
   */
  private measureStringWithTabs(
    text: string,
    fontSizePt: number,
    bold: boolean,
    italic: boolean,
    tabStopPt: number
  ): number {
    if (!text.includes('\t')) {
      return this.fontMetrics.measureWidth(text, fontSizePt, bold, italic);
    }

    const parts = text.split('\t');
    let x = 0;

    for (let i = 0; i < parts.length; i++) {
      if (parts[i].length > 0) {
        x += this.fontMetrics.measureWidth(parts[i], fontSizePt, bold, italic);
      }
      if (i < parts.length - 1) {
        // Advance x to the next tab stop multiple
        x = (Math.floor(x / tabStopPt) + 1) * tabStopPt;
      }
    }

    return Number(x.toFixed(4));
  }
}

// -----------------------------------------------------------------------------
// Factory
// -----------------------------------------------------------------------------

export function createTextLayoutService(fontMetrics: IFontMetricsProvider): ITextLayoutService {
  return new TextLayoutService(fontMetrics);
}
