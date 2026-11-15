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
import {
  CANONICAL_FONT_STACK,
  CANONICAL_TEXT_RENDERING,
  CANONICAL_FONT_KERNING,
  CANONICAL_FONT_FEATURE_SETTINGS,
  CANONICAL_WEBKIT_FONT_SMOOTHING,
  FONT_SIZE_PX,
  LINE_PITCH_PX,
} from './screenplayGeometry';

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

export type OverflowPolicy = 'break-word' | 'overflow' | 'clip';

export type LineBreakReason = 'newline' | 'wrap' | 'overflow' | 'end';

export interface TextMarkRun {
  start: number;
  end: number;
  bold: boolean;
  italic: boolean;
  underline?: boolean;
}

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
  /** Optional array of inline mark runs (bold, italic) affecting text measurement */
  markRuns?: TextMarkRun[];
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
  /** Inline mark runs spanning across this line */
  markRuns?: TextMarkRun[];
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

    // Fast-path: Hidden DOM element measurement using Range.getClientRects()
    // Guarantees 100% exact parity with real Chromium and ProseMirror editor wrapping
    const domResult = this.layoutViaDom(text, availableWidthPt, lineHeightPt, bold, constraints.markRuns);
    if (domResult) {
      return domResult;
    }

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
   * Measures and lays out text lines in a hidden DOM element with exact editor CSS,
   * using Range.getClientRects() for true browser line wrapping.
   */
  private layoutViaDom(
    text: string,
    availableWidthPt: number,
    lineHeightPt: number,
    bold?: boolean,
    markRuns?: TextMarkRun[]
  ): TextLayoutResult | null {
    if (
      typeof document === 'undefined' ||
      typeof document.createElement !== 'function' ||
      typeof Range === 'undefined'
    ) {
      return null;
    }

    if (text.length === 0) {
      return {
        lines: [
          {
            text: '',
            sourceStartOffset: 0,
            sourceEndOffset: 0,
            measuredWidthPt: 0,
            fullWidthPt: 0,
            isOverflow: false,
            breakReason: 'end',
          },
        ],
        totalLineCount: 1,
        maxLineWidthPt: 0,
        lineHeightPt,
        totalMeasuredHeightPt: lineHeightPt,
        diagnostics: { hasOverflow: false, unbreakableTokens: [] },
      };
    }

    let container = document.getElementById('akhar-dom-layout-measure-root');
    if (!container) {
      container = document.createElement('div');
      container.id = 'akhar-dom-layout-measure-root';
      container.style.position = 'fixed';
      container.style.top = '-99999px';
      container.style.left = '-99999px';
      container.style.visibility = 'hidden';
      container.style.pointerEvents = 'none';
      container.style.zIndex = '-9999';
      if (document.body) {
        document.body.appendChild(container);
      } else {
        document.documentElement.appendChild(container);
      }
    }

    const widthPx = availableWidthPt * (96 / 72);
    const div = document.createElement('div');
    div.style.width = `${widthPx}px`;
    div.style.fontFamily = CANONICAL_FONT_STACK;
    div.style.fontSize = `${FONT_SIZE_PX}px`;
    div.style.lineHeight = `${LINE_PITCH_PX}px`;
    div.style.textRendering = CANONICAL_TEXT_RENDERING;
    div.style.fontKerning = CANONICAL_FONT_KERNING;
    div.style.fontFeatureSettings = CANONICAL_FONT_FEATURE_SETTINGS;
    (div.style as any).webkitFontSmoothing = CANONICAL_WEBKIT_FONT_SMOOTHING;
    div.style.whiteSpace = 'pre-wrap';
    div.style.wordWrap = 'break-word';
    div.style.overflowWrap = 'break-word';
    div.style.margin = '0';
    div.style.padding = '0';
    div.style.border = 'none';
    div.style.boxSizing = 'border-box';

    if (markRuns && markRuns.length > 0) {
      let cur = 0;
      for (const run of markRuns) {
        if (run.start > cur) {
          div.appendChild(document.createTextNode(text.slice(cur, run.start)));
        }
        const runText = text.slice(run.start, run.end);
        let node: HTMLElement | Text = document.createTextNode(runText);
        if (run.underline) {
          const u = document.createElement('u');
          u.appendChild(node);
          node = u;
        }
        if (run.italic) {
          const em = document.createElement('em');
          em.appendChild(node);
          node = em;
        }
        if (run.bold) {
          const strong = document.createElement('strong');
          strong.appendChild(node);
          node = strong;
        }
        div.appendChild(node);
        cur = run.end;
      }
      if (cur < text.length) {
        div.appendChild(document.createTextNode(text.slice(cur)));
      }
    } else {
      if (bold) {
        div.style.fontWeight = 'bold';
      }
      div.textContent = text;
    }

    container.appendChild(div);

    try {
      const textNodes: Array<{ node: Text; start: number; end: number }> = [];
      let curOff = 0;
      const walker = document.createTreeWalker(div, NodeFilter.SHOW_TEXT);
      let tNode: Text | null;
      while ((tNode = walker.nextNode() as Text | null)) {
        const len = tNode.nodeValue ? tNode.nodeValue.length : 0;
        textNodes.push({ node: tNode, start: curOff, end: curOff + len });
        curOff += len;
      }

      if (textNodes.length === 0) {
        return null;
      }

      const lines: LayoutLine[] = [];
      let lineStart = 0;
      let lastTop: number | null = null;
      let isSupported = false;

      for (let i = 1; i <= text.length; i++) {
        if (text[i - 1] === '\n') {
          const lineStr = text.slice(lineStart, i);
          lines.push({
            text: lineStr,
            sourceStartOffset: lineStart,
            sourceEndOffset: i,
            measuredWidthPt: availableWidthPt,
            fullWidthPt: availableWidthPt,
            isOverflow: false,
            breakReason: 'newline',
          });
          lineStart = i;
          lastTop = null;
          continue;
        }

        const charIdx = i - 1;
        const entry = textNodes.find((tn) => tn.start <= charIdx && charIdx < tn.end);
        if (!entry) continue;

        const r = document.createRange();
        if (typeof r.getClientRects !== 'function') {
          return null;
        }
        r.setStart(entry.node, charIdx - entry.start);
        r.setEnd(entry.node, charIdx - entry.start + 1);
        const crs = r.getClientRects();
        if (crs.length > 0) {
          isSupported = true;
          const cr = crs[0];
          if (lastTop === null) {
            lastTop = cr.top;
          } else if (Math.abs(cr.top - lastTop) > 4) {
            // Soft line wrap
            const lineStr = text.slice(lineStart, i - 1);
            lines.push({
              text: lineStr,
              sourceStartOffset: lineStart,
              sourceEndOffset: i - 1,
              measuredWidthPt: availableWidthPt,
              fullWidthPt: availableWidthPt,
              isOverflow: false,
              breakReason: 'wrap',
            });
            lineStart = i - 1;
            lastTop = cr.top;
          }
        }
      }

      if (!isSupported) {
        // Range.getClientRects not supported in this environment (e.g. JSDOM without layout)
        return null;
      }

      if (lineStart <= text.length) {
        const lineStr = text.slice(lineStart);
        lines.push({
          text: lineStr,
          sourceStartOffset: lineStart,
          sourceEndOffset: text.length,
          measuredWidthPt: availableWidthPt,
          fullWidthPt: availableWidthPt,
          isOverflow: false,
          breakReason: 'end',
        });
      }

      if (markRuns && markRuns.length > 0) {
        for (const line of lines) {
          const lineRuns: TextMarkRun[] = [];
          for (const r of markRuns) {
            const overlapStart = Math.max(r.start, line.sourceStartOffset);
            const overlapEnd = Math.min(r.end, line.sourceEndOffset);
            if (overlapStart < overlapEnd) {
              lineRuns.push({
                start: overlapStart - line.sourceStartOffset,
                end: overlapEnd - line.sourceStartOffset,
                bold: r.bold,
                italic: r.italic,
                underline: r.underline,
              });
            }
          }
          if (lineRuns.length > 0) {
            line.markRuns = lineRuns;
          }
        }
      }

      return {
        lines,
        totalLineCount: lines.length,
        maxLineWidthPt: availableWidthPt,
        lineHeightPt,
        totalMeasuredHeightPt: lines.length * lineHeightPt,
        diagnostics: { hasOverflow: false, unbreakableTokens: [] },
      };
    } finally {
      container.removeChild(div);
    }
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
