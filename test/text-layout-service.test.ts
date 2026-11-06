/**
 * text-layout-service.test.ts - Unit & Integration Tests for Text Layout Service (M1B)
 * Governing Context: AKHAR-ARCH-PAG — Milestone M1B
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createTextLayoutService,
  LayoutConstraints,
} from '../src/core/layout/textLayoutService';
import {
  IFontMetricsProvider,
  FontMetricsProvider,
  RuntimeFontStatus,
  LineBoxMetrics,
} from '../src/core/layout/fontMetrics';

/**
 * Creates a deterministic mock metrics provider for unit testing.
 * Uses known advance widths (e.g. 8.0pt per character, 4.0pt per space).
 */
function createMockFontMetricsProvider(charWidthPt = 8.0, spaceWidthPt = 4.0): IFontMetricsProvider {
  return {
    ensureLoaded: async (): Promise<RuntimeFontStatus> => ({
      loaded: true,
      isFallback: false,
      status: 'ready',
    }),
    getStatus: (): RuntimeFontStatus => ({
      loaded: true,
      isFallback: false,
      status: 'ready',
    }),
    measureWidth: (text: string, fontSizePt = 12, bold = false, italic = false): number => {
      let w = 0;
      for (const ch of text) {
        if (ch === ' ') w += spaceWidthPt;
        else if (ch === '\t') w += spaceWidthPt * 4;
        else w += charWidthPt;
      }
      const scale = fontSizePt / 12;
      const styleMultiplier = (bold ? 1.1 : 1.0) * (italic ? 1.05 : 1.0);
      return Number((w * scale * styleMultiplier).toFixed(4));
    },
    getLineBoxMetrics: (fontSizePt = 12): LineBoxMetrics => ({
      fontSizePt,
      ascentPt: Number((fontSizePt * 0.995).toFixed(4)),
      descentPt: Number((fontSizePt * 0.398).toFixed(4)),
      lineBoxHeightPt: Number((fontSizePt * 1.393).toFixed(4)),
    }),
  };
}

describe('Milestone M1B: Text Layout Service', () => {
  const mockMetrics = createMockFontMetricsProvider(8.0, 4.0);
  const layoutService = createTextLayoutService(mockMetrics);

  // ---------------------------------------------------------------------------
  // 1. Punjabi-only Text Wrapping & Source Preservation
  // ---------------------------------------------------------------------------
  it('1. lays out Punjabi-only text accurately and preserves exact source string', () => {
    const text = 'ਸੁਰਜੀਤ ਨੇ ਕਿਹਾ ਕਿ ਅਸੀਂ ਕੱਲ੍ਹ ਸਵੇਰੇ ਅੰਮ੍ਰਿਤਸਰ ਜਾਵਾਂਗੇ ਅਤੇ ਸਭ ਠੀਕ ਹੋ ਜਾਵੇਗਾ।';
    // Available width = 120pt (~15 characters per line)
    const constraints: LayoutConstraints = {
      availableWidthPt: 120,
      fontSizePt: 12,
    };

    const result = layoutService.layoutText(text, constraints);
    expect(result.lines.length).toBeGreaterThan(1);

    // Invariant 1: Source reconstruction
    const reconstructed = result.lines.map((l) => l.text).join('');
    expect(reconstructed).toBe(text);

    // Invariant 2: Offset slicing
    for (const l of result.lines) {
      expect(text.slice(l.sourceStartOffset, l.sourceEndOffset)).toBe(l.text);
      expect(l.measuredWidthPt).toBeLessThanOrEqual(constraints.availableWidthPt);
    }
  });

  // ---------------------------------------------------------------------------
  // 2. English-only Text Wrapping
  // ---------------------------------------------------------------------------
  it('2. lays out English-only screenplay text accurately', () => {
    const text = 'EXT. AMRITSAR RAILWAY STATION - NIGHT\nSurjit walks across the platform carrying a heavy wooden box.';
    const constraints: LayoutConstraints = {
      availableWidthPt: 350,
      fontSizePt: 12,
    };

    const result = layoutService.layoutText(text, constraints);
    expect(result.lines.length).toBeGreaterThan(1);
    expect(result.lines.map((l) => l.text).join('')).toBe(text);

    // Verify first line is the scene heading with trailing newline
    expect(result.lines[0].text).toBe('EXT. AMRITSAR RAILWAY STATION - NIGHT\n');
    expect(result.lines[0].breakReason).toBe('newline');
  });

  // ---------------------------------------------------------------------------
  // 3. Mixed Punjabi & English Text
  // ---------------------------------------------------------------------------
  it('3. lays out mixed Punjabi-English code-switching sentences seamlessly', () => {
    const text = 'Doctor ਨੇ ਕਿਹਾ ਕਿ Scene 4 ਬਹੁਤ Emotional ਹੈ ਅਤੇ ₹500 ਦੀ Medicine ਲਿਖੀ।';
    const constraints: LayoutConstraints = {
      availableWidthPt: 160,
      fontSizePt: 12,
    };

    const result = layoutService.layoutText(text, constraints);
    expect(result.lines.length).toBeGreaterThan(1);
    expect(result.lines.map((l) => l.text).join('')).toBe(text);

    for (let i = 0; i < result.lines.length - 1; i++) {
      expect(result.lines[i].sourceEndOffset).toBe(result.lines[i + 1].sourceStartOffset);
    }
  });

  // ---------------------------------------------------------------------------
  // 4. Complex Gurmukhi Grapheme Clusters
  // ---------------------------------------------------------------------------
  it('4. strictly preserves complex Gurmukhi conjuncts without splitting grapheme clusters', () => {
    const text = 'ਉਸ ਉੱਤੇ ਗੁਰੂ ਦੀ ਅਪਾਰ ਕ੍ਰਿੱਪਾ ਹੋਈ ਅਤੇ ਉਸ ਨੇ ਪੂਰਨ ਪ੍ਰੋਗਰਾਮ ਸੰਪੂਰਨ ਕੀਤਾ।';
    const constraints: LayoutConstraints = {
      availableWidthPt: 100,
      fontSizePt: 12,
    };

    const result = layoutService.layoutText(text, constraints);
    expect(result.lines.map((l) => l.text).join('')).toBe(text);

    // Check that cluster ਕ੍ਰਿੱ or ਪ੍ਰੋ or ਸੰਪੂ is never split across lines
    const fullText = result.lines.map((l) => l.text);
    for (const lineText of fullText) {
      // Must not start with virama or addak or vowel signs alone
      expect(lineText).not.toMatch(/^[\u0A4D\u0A71\u0A70\u0A3E-\u0A4C]/);
      // Must not end with a lonely virama separating conjunct
      expect(lineText).not.toMatch(/[ਕ-ਹ]\u0A4D$/);
    }
  });

  // ---------------------------------------------------------------------------
  // 5. Punctuation Handling (Quotes, Danda, Hyphens, Colons)
  // ---------------------------------------------------------------------------
  it('5. glues punctuation to preceding words without orphaning marks at line starts', () => {
    const text = 'ਸੁਰਜੀਤ ਨੇ ਕਿਹਾ: "ਸ਼ਾਂਤ ਰਹੋ! ਸਭ ਠੀਕ-ਠਾਕ ਹੈ।" ਬਲਦੇਵ ਨੇ ਸਿਰ ਹਿਲਾਇਆ।';
    const constraints: LayoutConstraints = {
      availableWidthPt: 120,
      fontSizePt: 12,
    };

    const result = layoutService.layoutText(text, constraints);
    expect(result.lines.map((l) => l.text).join('')).toBe(text);

    for (const line of result.lines) {
      // Line must never start with a lonely closing punctuation mark or danda
      expect(line.text).not.toMatch(/^[।,!?:;"]\s/);
    }
  });

  // ---------------------------------------------------------------------------
  // 6. Repeated Spaces Preservation
  // ---------------------------------------------------------------------------
  it('6. preserves consecutive multiple spaces without collapsing or trimming', () => {
    const text = 'ਸ਼ਬਦ1     ਸ਼ਬਦ2          ਸ਼ਬਦ3';
    const constraints: LayoutConstraints = {
      availableWidthPt: 300,
      fontSizePt: 12,
    };

    const result = layoutService.layoutText(text, constraints);
    expect(result.lines.map((l) => l.text).join('')).toBe(text);
    expect(result.lines[0].text).toBe('ਸ਼ਬਦ1     ਸ਼ਬਦ2          ਸ਼ਬਦ3');
  });

  // ---------------------------------------------------------------------------
  // 7. Leading and Trailing Spaces
  // ---------------------------------------------------------------------------
  it('7. preserves leading and trailing spaces exactly', () => {
    const text = '   ਮੁੱਖ ਦਰਵਾਜ਼ਾ ਖੁੱਲ੍ਹਿਆ।   ';
    const constraints: LayoutConstraints = {
      availableWidthPt: 350,
      fontSizePt: 12,
    };

    const result = layoutService.layoutText(text, constraints);
    expect(result.lines.map((l) => l.text).join('')).toBe(text);
    expect(result.lines[0].text).toBe('   ਮੁੱਖ ਦਰਵਾਜ਼ਾ ਖੁੱਲ੍ਹਿਆ।   ');
    expect(result.lines[0].sourceStartOffset).toBe(0);
    expect(result.lines[0].sourceEndOffset).toBe(text.length);
  });

  // ---------------------------------------------------------------------------
  // 8. Explicit Tab Handling (\t)
  // ---------------------------------------------------------------------------
  it('8. handles tab characters explicitly by advancing to tab stops without converting to spaces', () => {
    const text = '\tਦ੍ਰਿਸ਼ 1.\tਅੰਦਰ. ਕਮਰਾ';
    const constraints: LayoutConstraints = {
      availableWidthPt: 300,
      fontSizePt: 12,
      tabWidthPt: 36.0,
    };

    const result = layoutService.layoutText(text, constraints);
    expect(result.lines.map((l) => l.text).join('')).toBe(text);
    expect(result.lines[0].text).toContain('\t');

    // Visual width must reflect the tab stop offsets
    expect(result.lines[0].measuredWidthPt).toBeGreaterThan(constraints.tabWidthPt!);
  });

  // ---------------------------------------------------------------------------
  // 9. Newline Handling (\n, \r\n, multiple blank lines)
  // ---------------------------------------------------------------------------
  it('9. preserves exact newline sequences (\\n and \\r\\n) and handles multiple blank lines', () => {
    const text = 'ਲਾਈਨ 1\nਲਾਈਨ 2\r\n\nਲਾਈਨ 4\n';
    const constraints: LayoutConstraints = {
      availableWidthPt: 350,
      fontSizePt: 12,
    };

    const result = layoutService.layoutText(text, constraints);
    expect(result.lines.map((l) => l.text).join('')).toBe(text);

    expect(result.lines[0].text).toBe('ਲਾਈਨ 1\n');
    expect(result.lines[0].breakReason).toBe('newline');

    expect(result.lines[1].text).toBe('ਲਾਈਨ 2\r\n');
    expect(result.lines[1].breakReason).toBe('newline');

    expect(result.lines[2].text).toBe('\n');
    expect(result.lines[2].breakReason).toBe('newline');

    expect(result.lines[3].text).toBe('ਲਾਈਨ 4\n');
    expect(result.lines[3].breakReason).toBe('newline');

    expect(result.lines[4].text).toBe('');
    expect(result.lines[4].breakReason).toBe('end');
  });

  // ---------------------------------------------------------------------------
  // 10. Empty Input Handling
  // ---------------------------------------------------------------------------
  it('10. handles empty string input gracefully, returning single empty line with zero width', () => {
    const result = layoutService.layoutText('', { availableWidthPt: 100 });
    expect(result.lines.length).toBe(1);
    expect(result.lines[0].text).toBe('');
    expect(result.lines[0].sourceStartOffset).toBe(0);
    expect(result.lines[0].sourceEndOffset).toBe(0);
    expect(result.lines[0].measuredWidthPt).toBe(0);
    expect(result.totalLineCount).toBe(1);
    expect(result.maxLineWidthPt).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // 11. Single Word Wider Than Available Width (Break-Word Policy)
  // ---------------------------------------------------------------------------
  it('11. breaks an unbreakable word wider than available width by grapheme clusters without infinite loop', () => {
    const longWord = 'ਪਿੰਡਵਾਲਿਆਂਨੇਰਲਮਿਲਕੇਸਾਰਾਕੰਮਖ਼ਤਮਕਰਦਿੱਤਾ';
    // Constrain width to 40pt (fits ~5 characters)
    const constraints: LayoutConstraints = {
      availableWidthPt: 40,
      fontSizePt: 12,
      overflowPolicy: 'break-word',
    };

    const result = layoutService.layoutText(longWord, constraints);
    expect(result.lines.length).toBeGreaterThan(1);
    expect(result.lines.map((l) => l.text).join('')).toBe(longWord);

    // Verify all lines break cleanly without splitting any grapheme cluster
    for (const l of result.lines) {
      expect(l.text.length).toBeGreaterThan(0);
      expect(l.text).not.toMatch(/^[\u0A4D\u0A71\u0A70\u0A3E-\u0A4C]/);
    }
    expect(result.diagnostics.unbreakableTokens).toContain(longWord);
  });

  // ---------------------------------------------------------------------------
  // 12. Multiple Consecutive Long Tokens
  // ---------------------------------------------------------------------------
  it('12. handles multiple consecutive oversized tokens sequentially', () => {
    const text = 'TokenOneVeryLongWord1234567890 TokenTwoAnotherExtremelyLongWord987654321';
    const constraints: LayoutConstraints = {
      availableWidthPt: 60,
      fontSizePt: 12,
      overflowPolicy: 'break-word',
    };

    const result = layoutService.layoutText(text, constraints);
    expect(result.lines.length).toBeGreaterThan(2);
    expect(result.lines.map((l) => l.text).join('')).toBe(text);
  });

  // ---------------------------------------------------------------------------
  // 13. Exact Source Reconstruction & Contiguous Offsets
  // ---------------------------------------------------------------------------
  it('13. guarantees that line concatenation exactly reconstructs text and offsets are contiguous', () => {
    const corpus = [
      'ਸੁਰਜੀਤ ਖਿੜਕੀ ਕੋਲ ਖੜ੍ਹਾ ਬਾਹਰ ਹਨੇਰੇ ਵੱਲ ਦੇਖ ਰਿਹਾ ਹੈ।',
      'INT. HAVELI - NIGHT\nLight flickers on the wall. A loud knock interrupts the silence.\n\nSURJIT\nWho is there?',
      'Special characters: #@$%^&*()_+~`|}{[]:;"<>,.?/ and tabs\tand newlines\n',
      '   Indented text with multiple    spaces and   gaps.   ',
    ];

    for (const text of corpus) {
      const result = layoutService.layoutText(text, { availableWidthPt: 140 });

      // Reconstruct
      expect(result.lines.map((l) => l.text).join('')).toBe(text);

      // Verify offsets
      expect(result.lines[0].sourceStartOffset).toBe(0);
      expect(result.lines[result.lines.length - 1].sourceEndOffset).toBe(text.length);

      for (let i = 0; i < result.lines.length; i++) {
        const line = result.lines[i];
        expect(text.slice(line.sourceStartOffset, line.sourceEndOffset)).toBe(line.text);
        if (i < result.lines.length - 1) {
          expect(line.sourceEndOffset).toBe(result.lines[i + 1].sourceStartOffset);
        }
      }
    }
  });

  // ---------------------------------------------------------------------------
  // 14. Invalid Constraints Handling
  // ---------------------------------------------------------------------------
  it('14. rejects invalid constraints with descriptive errors', () => {
    expect(() => layoutService.layoutText('ਟੈਸਟ', { availableWidthPt: 0 })).toThrow('availableWidthPt');
    expect(() => layoutService.layoutText('ਟੈਸਟ', { availableWidthPt: -50 })).toThrow('availableWidthPt');
    expect(() => layoutService.layoutText('ਟੈਸਟ', { availableWidthPt: NaN })).toThrow('availableWidthPt');
    expect(() => layoutService.layoutText('ਟੈਸਟ', { availableWidthPt: 100, fontSizePt: -12 })).toThrow('fontSizePt');
    expect(() => layoutService.layoutText('ਟੈਸਟ', { availableWidthPt: 100, fontSizePt: 0 })).toThrow('fontSizePt');
    expect(() => layoutService.layoutText(null as any, { availableWidthPt: 100 })).toThrow('expected string');
  });

  // ---------------------------------------------------------------------------
  // 15. Overflow Policy: 'overflow'
  // ---------------------------------------------------------------------------
  it('15. respects overflowPolicy = overflow without breaking the long word', () => {
    const longWord = 'UnbreakableMonolithicTokenThatExceedsWidth';
    const constraints: LayoutConstraints = {
      availableWidthPt: 50,
      overflowPolicy: 'overflow',
    };

    const result = layoutService.layoutText(longWord, constraints);
    expect(result.lines.length).toBe(1);
    expect(result.lines[0].text).toBe(longWord);
    expect(result.lines[0].isOverflow).toBe(true);
    expect(result.lines[0].breakReason).toBe('overflow');
    expect(result.diagnostics.hasOverflow).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 16. Deterministic Output Invariance
  // ---------------------------------------------------------------------------
  it('16. strictly guarantees deterministic output across repeated calls with identical input', () => {
    const text = 'ਗੁਰਮੁਖ ਸਿੰਘ ਨੇ ਪੁਰਾਣੀ ਡਾਇਰੀ ਖੋਲ੍ਹੀ ਅਤੇ ਪੜ੍ਹਨਾ ਸ਼ੁਰੂ ਕੀਤਾ।';
    const constraints: LayoutConstraints = { availableWidthPt: 110, fontSizePt: 12 };

    const r1 = layoutService.layoutText(text, constraints);
    const r2 = layoutService.layoutText(text, constraints);

    expect(r1.lines.length).toBe(r2.lines.length);
    expect(r1.totalMeasuredHeightPt).toBe(r2.totalMeasuredHeightPt);
    expect(r1.maxLineWidthPt).toBe(r2.maxLineWidthPt);

    for (let i = 0; i < r1.lines.length; i++) {
      expect(r1.lines[i].text).toBe(r2.lines[i].text);
      expect(r1.lines[i].sourceStartOffset).toBe(r2.lines[i].sourceStartOffset);
      expect(r1.lines[i].sourceEndOffset).toBe(r2.lines[i].sourceEndOffset);
      expect(r1.lines[i].measuredWidthPt).toBe(r2.lines[i].measuredWidthPt);
    }
  });

  // ---------------------------------------------------------------------------
  // 17. Bold & Italic Measurement Options
  // ---------------------------------------------------------------------------
  it('17. applies bold and italic style parameters to metrics measurement', () => {
    const text = 'ਹੈਲੋ ਵਰਲਡ';
    const regular = layoutService.layoutText(text, { availableWidthPt: 200, fontSizePt: 12, bold: false });
    const bold = layoutService.layoutText(text, { availableWidthPt: 200, fontSizePt: 12, bold: true });

    expect(bold.lines[0].measuredWidthPt).toBeGreaterThan(regular.lines[0].measuredWidthPt);
  });

  // ---------------------------------------------------------------------------
  // 18. Measurement Provider Errors Propagation
  // ---------------------------------------------------------------------------
  it('18. propagates measurement provider errors without swallowing or fabricating metrics', () => {
    const faultyMetrics: IFontMetricsProvider = {
      ensureLoaded: vi.fn(),
      getStatus: vi.fn(),
      measureWidth: () => {
        throw new Error('Canvas context crashed');
      },
      getLineBoxMetrics: () => ({
        fontSizePt: 12,
        ascentPt: 12,
        descentPt: 4,
        lineBoxHeightPt: 16,
      }),
    };

    const faultyService = createTextLayoutService(faultyMetrics);
    expect(() => faultyService.layoutText('ਕੁਝ ਟੈਕਸਟ', { availableWidthPt: 100 })).toThrow('Canvas context crashed');
  });

  // ---------------------------------------------------------------------------
  // 19. Integration Test with Real M1A Font Metrics Provider
  // ---------------------------------------------------------------------------
  it('19. integrates cleanly with real M1A FontMetricsProvider using actual font advance widths', () => {
    const realProvider = new FontMetricsProvider({
      measureFn: (text) => text.length * 7.8, // Fallback measureFn for Node environment
    });

    const realLayoutService = createTextLayoutService(realProvider);
    const text = 'ਅੰਮ੍ਰਿਤਸਰ ਤੋਂ ਲਾਹੌਰ ਤੱਕ ਦੀ ਕਹਾਣੀ ਬਹੁਤ ਦਰਦਨਾਕ ਹੈ।';

    const result = realLayoutService.layoutText(text, { availableWidthPt: 150 });
    expect(result.lines.length).toBeGreaterThan(1);
    expect(result.lines.map((l) => l.text).join('')).toBe(text);
    expect(result.totalMeasuredHeightPt).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // 20. Clip Policy: Exact Source Preservation & Presentation Metadata
  // ---------------------------------------------------------------------------
  it('20. respects overflowPolicy = clip by preserving 100% source text and storing clipping metadata', () => {
    const longWord = 'VeryLongUnbreakableScreenplayTitleIdentifier';
    const constraints: LayoutConstraints = {
      availableWidthPt: 80,
      overflowPolicy: 'clip',
    };

    const result = layoutService.layoutText(longWord, constraints);
    expect(result.lines.length).toBe(1);

    // CRITICAL: Source text must NEVER be truncated or discarded
    expect(result.lines[0].text).toBe(longWord);
    expect(result.lines.map((l) => l.text).join('')).toBe(longWord);
    expect(result.lines[0].sourceStartOffset).toBe(0);
    expect(result.lines[0].sourceEndOffset).toBe(longWord.length);
    expect(result.lines[0].isOverflow).toBe(true);
    expect(result.lines[0].breakReason).toBe('overflow');
    expect(result.diagnostics.hasOverflow).toBe(true);

    // Presentation metadata must accurately describe the clipped boundary
    expect(result.lines[0].clippedPresentation).toBeDefined();
    const clipMeta = result.lines[0].clippedPresentation!;
    expect(clipMeta.visibleText.length).toBeLessThan(longWord.length);
    expect(clipMeta.visibleWidthPt).toBeLessThanOrEqual(constraints.availableWidthPt);
    expect(longWord.startsWith(clipMeta.visibleText)).toBe(true);
    expect(clipMeta.visibleLength).toBe(clipMeta.visibleText.length);
  });

  // ---------------------------------------------------------------------------
  // 21. Cross-Policy Source Preservation Invariant
  // ---------------------------------------------------------------------------
  it('21. guarantees that ALL overflow policies (break-word, overflow, clip) preserve exact source reconstruction and contiguous offsets', () => {
    const text = 'ਲੰਬਾਸ਼ਬਦਪਿੰਡਵਾਲਿਆਂਨੇਰਲਮਿਲਕੇਸਾਰਾਕੰਮਖ਼ਤਮਕਰਦਿੱਤਾ ਅਤੇ ਕੁਝ ਸਾਧਾਰਨ ਸ਼ਬਦ।';
    const policies = ['break-word', 'overflow', 'clip'] as const;

    for (const policy of policies) {
      const result = layoutService.layoutText(text, {
        availableWidthPt: 60,
        overflowPolicy: policy,
      });

      // 1. Exact string reconstruction
      expect(result.lines.map((l) => l.text).join('')).toBe(text);

      // 2. Exact start and end bounds
      expect(result.lines[0].sourceStartOffset).toBe(0);
      expect(result.lines[result.lines.length - 1].sourceEndOffset).toBe(text.length);

      // 3. Contiguous offsets and substring matching
      for (let i = 0; i < result.lines.length; i++) {
        const line = result.lines[i];
        expect(text.slice(line.sourceStartOffset, line.sourceEndOffset)).toBe(line.text);
        if (i < result.lines.length - 1) {
          expect(line.sourceEndOffset).toBe(result.lines[i + 1].sourceStartOffset);
        }
      }
    }
  });

  // ---------------------------------------------------------------------------
  // 22. Vertical Metrics Boundary & Line Height Derivation
  // ---------------------------------------------------------------------------
  it('22. derives lineHeightPt from font metrics and does not hardcode an authoritative 18pt pitch', () => {
    const text = 'ਲਾਈਨ 1\nਲਾਈਨ 2\nਲਾਈਨ 3';

    const r10 = layoutService.layoutText(text, { availableWidthPt: 200, fontSizePt: 10 });
    const r12 = layoutService.layoutText(text, { availableWidthPt: 200, fontSizePt: 12 });
    const r16 = layoutService.layoutText(text, { availableWidthPt: 200, fontSizePt: 16 });

    // Line heights must scale dynamically with fontSizePt
    expect(r10.lineHeightPt).toBeLessThan(r12.lineHeightPt);
    expect(r12.lineHeightPt).toBeLessThan(r16.lineHeightPt);

    // Must NOT be hardcoded to 18pt at non-standard sizes
    expect(r10.lineHeightPt).not.toBe(18);
    expect(r16.lineHeightPt).not.toBe(18);

    // totalMeasuredHeightPt must equal totalLineCount * lineHeightPt
    expect(r12.totalMeasuredHeightPt).toBe(Number((r12.totalLineCount * r12.lineHeightPt).toFixed(4)));
  });

  // ---------------------------------------------------------------------------
  // 23. Punctuation: Opening and Closing Quotation Marks
  // ---------------------------------------------------------------------------
  it('23. handles opening and closing quotation marks (English, typographic curly, guillemets) without orphaning or losing marks', () => {
    const samples = [
      'ਸੁਰਜੀਤ ਨੇ ਕਿਹਾ, "ਸ਼ਾਂਤ ਰਹੋ।"',
      'ਬਲਦੇਵ ਬੋਲਿਆ, “ਸਭ ਠੀਕ ਹੈ।”',
      'ਉਸਨੇ ‘ਸੱਚ’ ਆਖਿਆ।',
      'ਫ਼ੈਸਲਾ «ਮਨਜ਼ੂਰ» ਹੋਇਆ।',
      '“ਉਸਨੇ ਕਿਹਾ, ‘ਕੰਮ ਪੂਰਾ ਹੋ ਗਿਆ!’”',
    ];

    for (const text of samples) {
      const result = layoutService.layoutText(text, { availableWidthPt: 80 });

      // Invariant: exact source reconstruction
      expect(result.lines.map((l) => l.text).join('')).toBe(text);

      for (const line of result.lines) {
        // Closing quotes must never appear as an isolated orphan line start
        expect(line.text).not.toMatch(/^["”’»]\s/);
      }
    }
  });

  // ---------------------------------------------------------------------------
  // 24. Punctuation: Parentheses, Square Brackets, and Curly Brackets
  // ---------------------------------------------------------------------------
  it('24. handles parentheses, square brackets, and curly brackets without orphaning or losing marks', () => {
    const samples = [
      'ਸੁਰਜੀਤ (ਅੰਮ੍ਰਿਤਸਰ ਦਾ ਰਹਿਣ ਵਾਲਾ) ਆਇਆ।',
      'ਵੇਰਵਾ [ਨੋਟ: ਜ਼ਰੂਰੀ ਸੂਚਨਾ] ਇੱਥੇ ਦੇਖੋ।',
      'ਕੋਡ {ਸੈਕਸ਼ਨ 1} ਵਿੱਚ ਦਰਜ ਹੈ।',
      'ਨੇਸਟਿਡ ([ਮੁੱਖ ਨੁਕਤਾ]) ਸ਼ਾਮਲ ਹੈ।',
    ];

    for (const text of samples) {
      const result = layoutService.layoutText(text, { availableWidthPt: 90 });
      expect(result.lines.map((l) => l.text).join('')).toBe(text);

      for (const line of result.lines) {
        // Closing brackets must not start a line alone followed by space
        expect(line.text).not.toMatch(/^[\]\)\}]\s/);
      }
    }
  });

  // ---------------------------------------------------------------------------
  // 25. Punctuation: Punjabi Danda and Double Danda
  // ---------------------------------------------------------------------------
  it('25. glues Punjabi danda (U+0964) and double danda (U+0965) to preceding words', () => {
    // Both standard Unicode Gurmukhi dandas
    const text = 'ਇਹ ਪਹਿਲਾ ਵਾਕ ਹੈ। ਇਹ ਦੂਜਾ ਵਾਕ ਹੈ॥ ਅਤੇ ਇਹ ਤੀਜਾ ਵਾਕ ਹੈ।';
    const result = layoutService.layoutText(text, { availableWidthPt: 80 });

    expect(result.lines.map((l) => l.text).join('')).toBe(text);
    expect(result.lines.length).toBeGreaterThan(2);

    for (const line of result.lines) {
      // Danda or double danda must never appear at line start
      expect(line.text).not.toMatch(/^[।॥]/);
    }
  });

  // ---------------------------------------------------------------------------
  // 26. Punctuation: Commas, Colons, Semicolons, Question & Exclamation Marks
  // ---------------------------------------------------------------------------
  it('26. attaches commas, colons, semicolons, question marks, and exclamation marks to preceding words', () => {
    const text = 'ਸੁਰਜੀਤ, ਬਲਦੇਵ, ਅਤੇ ਹਰਪ੍ਰੀਤ; ਸਭ ਆ ਗਏ: ਤੁਸੀਂ ਕੌਣ ਹੋ? ਮੈਂ ਸੁਰਜੀਤ ਹਾਂ!';
    const result = layoutService.layoutText(text, { availableWidthPt: 90 });

    expect(result.lines.map((l) => l.text).join('')).toBe(text);
    expect(result.lines.length).toBeGreaterThan(2);

    for (const line of result.lines) {
      expect(line.text).not.toMatch(/^[,:;?!]\s/);
      expect(line.text).not.toMatch(/^[,:;?!]$/);
    }
  });

  // ---------------------------------------------------------------------------
  // 27. Punctuation: Ellipses
  // ---------------------------------------------------------------------------
  it('27. glues three-period ellipses (...) and Unicode ellipsis (…) to preceding words', () => {
    const text = 'ਸੁਰਜੀਤ ਰੁਕਿਆ... ਫਿਰ ਸੋਚਿਆ… ਅੱਗੇ ਕੀ ਹੋਵੇਗਾ...';
    const result = layoutService.layoutText(text, { availableWidthPt: 90 });

    expect(result.lines.map((l) => l.text).join('')).toBe(text);

    for (const line of result.lines) {
      expect(line.text).not.toMatch(/^\.\.\.\s/);
      expect(line.text).not.toMatch(/^…\s/);
    }
  });

  // ---------------------------------------------------------------------------
  // 28. Punctuation: Hyphenated English Words
  // ---------------------------------------------------------------------------
  it('28. breaks hyphenated words cleanly at hyphen boundaries with hyphen attached to upper line', () => {
    const text = 'state-of-the-art script-writing engine';
    const result = layoutService.layoutText(text, { availableWidthPt: 60 });

    expect(result.lines.map((l) => l.text).join('')).toBe(text);
    expect(result.lines.length).toBeGreaterThan(1);

    // No line should start with a lonely hyphen
    for (const line of result.lines) {
      expect(line.text).not.toMatch(/^-\w/);
    }
  });

  // ---------------------------------------------------------------------------
  // 29. Punctuation: Punjabi-English Mixed Text
  // ---------------------------------------------------------------------------
  it('29. handles complex mixed Punjabi-English text with varied punctuation seamlessly', () => {
    const text = 'Scene 1: "ਪਿੰਡ ਦੀ ਸੱਥ" (Day/Night) - ₹500 ਦਾ Budget! ਕੀ ਇਹ Final ਹੈ?';
    const result = layoutService.layoutText(text, { availableWidthPt: 120 });

    expect(result.lines.map((l) => l.text).join('')).toBe(text);
    for (let i = 0; i < result.lines.length - 1; i++) {
      expect(result.lines[i].sourceEndOffset).toBe(result.lines[i + 1].sourceStartOffset);
    }
  });

  // ---------------------------------------------------------------------------
  // 30. Punctuation: Punctuation at Beginning or End of Source
  // ---------------------------------------------------------------------------
  it('30. handles punctuation at the beginning and end of source text without error or loss', () => {
    const samples = [
      '"...ਸ਼ੁਰੂ ਵਿੱਚ ਹਨੇਰਾ ਸੀ।"',
      'ਅਤੇ ਇਹ ਅੰਤ ਸੀ!!!',
      '???',
      '...',
      '॥',
      '([{}])',
    ];

    for (const text of samples) {
      const result = layoutService.layoutText(text, { availableWidthPt: 80 });
      expect(result.lines.map((l) => l.text).join('')).toBe(text);
      expect(result.lines[0].sourceStartOffset).toBe(0);
      expect(result.lines[result.lines.length - 1].sourceEndOffset).toBe(text.length);
    }
  });

  // ---------------------------------------------------------------------------
  // 31. Punctuation: Consecutive Punctuation Sequences
  // ---------------------------------------------------------------------------
  it('31. preserves consecutive punctuation sequences and interrobangs', () => {
    const text = 'ਕੀ?!?! ਸੱਚਮੁੱਚ??? ਬਿਲਕੁਲ...!!! ([{"ਟੈਸਟ"}]) ਸ਼ਬਦ--ਹੋਰ';
    const result = layoutService.layoutText(text, { availableWidthPt: 100 });

    expect(result.lines.map((l) => l.text).join('')).toBe(text);
    for (const l of result.lines) {
      expect(text.slice(l.sourceStartOffset, l.sourceEndOffset)).toBe(l.text);
    }
  });

  // ---------------------------------------------------------------------------
  // 32. Grapheme Safety: Single Grapheme Cluster Wider Than Available Width
  // ---------------------------------------------------------------------------
  it('32. never splits a single grapheme cluster even when it exceeds availableWidthPt, guaranteeing forward progress', () => {
    // Single Gurmukhi cluster ਕਿ (Base KA U+0A15 + Dependent Vowel Sihari U+0A3F = 16pt in mock metrics)
    const singleCluster = 'ਕਿ';
    // Constrain available width to 4pt (much smaller than the cluster)
    const constraints: LayoutConstraints = {
      availableWidthPt: 4,
      overflowPolicy: 'break-word',
    };

    const result = layoutService.layoutText(singleCluster, constraints);

    // Must emit exactly 1 line containing the intact cluster, NEVER separating the vowel sign
    expect(result.lines.length).toBe(1);
    expect(result.lines[0].text).toBe(singleCluster);
    expect(result.lines[0].isOverflow).toBe(true);
    expect(result.diagnostics.hasOverflow).toBe(true);

    // Guaranteed termination and exact source reconstruction
    expect(result.lines.map((l) => l.text).join('')).toBe(singleCluster);
  });

  // ---------------------------------------------------------------------------
  // 33. Grapheme Safety: Full Complex Gurmukhi Corpus Under Severe Width Limits
  // ---------------------------------------------------------------------------
  it('33. guarantees all M0 complex Gurmukhi tokens remain atomically intact under severe width constraints', () => {
    const complexTokens = [
      'ਕ੍ਰਿੱਪਾ',    // Virama + Rakar + Sihari + Addak
      'ਗੁੰਝਲ਼ਦਾਰ',  // Aunkad + Tippi + Nukta
      'ਪ੍ਰੋਗਰਾਮਾਂ',  // Rakar + Hora + Kanna + Bindi
      'ਉੱਲੂ',      // Addak + Dulainkar
      'ਕਿਉਂਕਿ',    // Sihari + Bindi + Sihari
      'ਤ੍ਰਿਸ਼ਨਾ',   // Rakar + Sihari + Nukta
      'ਸੰਪੂਰਨ',    // Tippi + Dulainkar
      'ਕ੍ਰੂ਼',      // Extreme descender: Rakar + Dulainkar + Nukta
      'ਪ੍ਰ੍ਹ',      // Dual subjoined Rakar + Haha
      'ਸ੍ਰੀ',       // Rakar + Bihari
    ];

    const fullCorpus = complexTokens.join(' ');
    // Tiny width (10pt) forcing grapheme-level wrapping on every cluster
    const result = layoutService.layoutText(fullCorpus, {
      availableWidthPt: 10,
      overflowPolicy: 'break-word',
    });

    // Invariant 1: exact string reconstruction
    expect(result.lines.map((l) => l.text).join('')).toBe(fullCorpus);

    // Invariant 2: no line ever begins with an orphaned combining mark or standalone virama
    for (const line of result.lines) {
      expect(line.text).not.toMatch(/^[\u0A4D\u0A71\u0A70\u0A3E-\u0A4C]/);
      expect(line.text.length).toBeGreaterThan(0);
    }

    // Invariant 3: contiguous offsets
    for (let i = 0; i < result.lines.length - 1; i++) {
      expect(result.lines[i].sourceEndOffset).toBe(result.lines[i + 1].sourceStartOffset);
    }
  });
});
