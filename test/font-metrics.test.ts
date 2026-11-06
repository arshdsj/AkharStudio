/**
 * font-metrics.test.ts - Unit and Integration Tests for Font Metrics Module (M1A)
 * Governing Context: AKHAR-ARCH-PAG — Milestone M1A
 */

import { describe, it, expect, vi } from 'vitest';
import path from 'path';
import fs from 'fs';
import { execFileSync } from 'child_process';

import {
  FontMetricsProvider,
  EXPECTED_NOTO_SANS_GURMUKHI,
  parseTrueTypeMetadata,
  computeBufferSha256,
  validateFontBuffer,
  pointsToPixels,
  pixelsToPoints,
  FontFaceSetLike,
} from '../src/core/layout/fontMetrics';

const GURMUKHI_FONT_PATH = path.resolve(process.cwd(), 'public/fonts/NotoSansGurmukhi.ttf');

describe('Milestone M1A: Font Metrics Module', () => {
  // ---------------------------------------------------------------------------
  // 1. Static Font Identity & OpenType Header Parsing
  // ---------------------------------------------------------------------------
  it('1. correctly parses TrueType metadata from production NotoSansGurmukhi.ttf', () => {
    const buf = fs.readFileSync(GURMUKHI_FONT_PATH);
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

    const identity = parseTrueTypeMetadata(ab);
    expect(identity).not.toBeNull();
    expect(identity!.family).toBe('Noto Sans Gurmukhi');
    expect(identity!.postscriptName).toBe('NotoSansGurmukhi-Regular');
    expect(identity!.version).toContain('2.004');
    expect(identity!.unitsPerEm).toBe(1000);
    expect(identity!.yMin).toBe(-398);
    expect(identity!.yMax).toBe(995);
  });

  // ---------------------------------------------------------------------------
  // 2. SHA-256 Calculation
  // ---------------------------------------------------------------------------
  it('2. calculates exact SHA-256 hash for production font', async () => {
    const buf = fs.readFileSync(GURMUKHI_FONT_PATH);
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

    const hash = await computeBufferSha256(ab);
    expect(hash).toBe('b9b7f20c34d4ab2cda743f4619d08aed9fc05c5f0bb0d39030fcf2bc986dfa0a');
  });

  // ---------------------------------------------------------------------------
  // 3. Font Hash Mismatch
  // ---------------------------------------------------------------------------
  it('3. detects font hash mismatch when expected hash does not match binary', async () => {
    const buf = fs.readFileSync(GURMUKHI_FONT_PATH);
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

    const tamperedExpected = {
      ...EXPECTED_NOTO_SANS_GURMUKHI,
      sha256: '0000000000000000000000000000000000000000000000000000000000000000',
    };

    const result = await validateFontBuffer(ab, tamperedExpected);
    expect(result.valid).toBe(false);
    expect(result.mismatches).toBeDefined();
    expect(result.mismatches!.some((m) => m.includes('sha256'))).toBe(true);
    expect(result.error).toContain('Font identity validation failed');
  });

  // ---------------------------------------------------------------------------
  // 4. Missing / Corrupt Font Buffer
  // ---------------------------------------------------------------------------
  it('4. handles empty or corrupted font buffer gracefully without crashing', async () => {
    const emptyAb = new ArrayBuffer(0);
    const resultEmpty = await validateFontBuffer(emptyAb);
    expect(resultEmpty.valid).toBe(false);
    expect(resultEmpty.error).toContain('missing or empty');

    const corruptAb = new Uint8Array([1, 2, 3, 4, 5]).buffer;
    const resultCorrupt = await validateFontBuffer(corruptAb);
    expect(resultCorrupt.valid).toBe(false);
    expect(resultCorrupt.error).toContain('corrupt or invalid');
  });

  // ---------------------------------------------------------------------------
  // 5. Successful Font Loading
  // ---------------------------------------------------------------------------
  it('5. reports ready status upon successful font loading', async () => {
    const mockFontsTarget: FontFaceSetLike = {
      check: vi.fn(() => true),
      load: vi.fn(() => Promise.resolve([])),
      ready: Promise.resolve(),
    };

    const provider = new FontMetricsProvider({
      fontsTarget: mockFontsTarget,
      measureFn: (text) => text.length * 7.2,
    });

    const status = await provider.ensureLoaded();
    expect(status.status).toBe('ready');
    expect(status.loaded).toBe(true);
    expect(status.isFallback).toBe(false);
    expect(mockFontsTarget.check).toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // 6. Font Loading Timeout
  // ---------------------------------------------------------------------------
  it('6. handles font loading timeout cleanly without hanging', async () => {
    let cancelReject: () => void = () => {};
    const mockHangingFonts: FontFaceSetLike = {
      check: vi.fn(() => false),
      load: vi.fn(() => new Promise<unknown[]>((_, rej) => { cancelReject = rej; })),
      ready: new Promise((_, rej) => { cancelReject = rej; }),
    };

    const provider = new FontMetricsProvider({
      fontsTarget: mockHangingFonts,
    });

    const status = await provider.ensureLoaded(50); // 50ms timeout
    expect(status.status).toBe('failed');
    expect(status.loaded).toBe(false);
    expect(status.error).toContain('timed out');
    cancelReject();
  });

  // ---------------------------------------------------------------------------
  // 7. Font Unavailable After Loading
  // ---------------------------------------------------------------------------
  it('7. reports failed status when document.fonts.check returns false after loading', async () => {
    const mockUnavailableFonts: FontFaceSetLike = {
      check: vi.fn(() => false), // check fails
      load: vi.fn(() => Promise.resolve([])),
      ready: Promise.resolve(),
    };

    const provider = new FontMetricsProvider({
      fontsTarget: mockUnavailableFonts,
    });

    const status = await provider.ensureLoaded(500);
    expect(status.status).toBe('failed');
    expect(status.loaded).toBe(false);
    expect(status.error).toContain('not available in document.fonts');
  });

  // ---------------------------------------------------------------------------
  // 8. Fallback / Degraded Status Detection
  // ---------------------------------------------------------------------------
  it('8. detects font fallback condition and sets degraded status', async () => {
    // Mock canvas context where measurement of target font matches fallback font
    const mockCtx = {
      font: '',
      measureText: vi.fn(() => ({
        width: 120.0, // Same width regardless of font
        actualBoundingBoxAscent: 10,
        actualBoundingBoxDescent: 3,
      })),
    } as unknown as CanvasRenderingContext2D;

    const mockFonts: FontFaceSetLike = {
      check: vi.fn(() => true),
      load: vi.fn(() => Promise.resolve([])),
      ready: Promise.resolve(),
    };

    const provider = new FontMetricsProvider({
      canvasContext: mockCtx,
      fontsTarget: mockFonts,
    });

    const status = await provider.ensureLoaded();
    expect(status.status).toBe('degraded');
    expect(status.isFallback).toBe(true);
    expect(status.error).toContain('fallback font');
  });

  // ---------------------------------------------------------------------------
  // 9. Point-to-Pixel Conversion
  // ---------------------------------------------------------------------------
  it('9. converts points and pixels accurately with 96/72 standard ratio', () => {
    expect(pointsToPixels(72)).toBe(96);
    expect(pixelsToPoints(96)).toBe(72);

    expect(pointsToPixels(12)).toBe(16);
    expect(pixelsToPoints(16)).toBe(12);

    expect(pointsToPixels(18)).toBe(24);
    expect(pixelsToPoints(24)).toBe(18);

    expect(pointsToPixels(0)).toBe(0);
    expect(pixelsToPoints(0)).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // 10. Width Measurement for Punjabi Strings
  // ---------------------------------------------------------------------------
  it('10. measures advance width for complex Punjabi strings', () => {
    const mockMeasure = (text: string) => {
      // Simulate advance widths: ~7.5pt per Gurmukhi akshara
      return text.length * 7.5;
    };

    const provider = new FontMetricsProvider({
      measureFn: mockMeasure,
    });

    const w1 = provider.measureWidth('ਕ੍ਰਿੱਪਾ', 12);
    expect(w1).toBeGreaterThan(0);
    expect(Number.isFinite(w1)).toBe(true);

    const w2 = provider.measureWidth('ਗੁੰਝਲ਼ਦਾਰ', 12);
    expect(w2).toBeGreaterThan(w1);
  });

  // ---------------------------------------------------------------------------
  // 11. Width Measurement for Mixed Punjabi & English Strings
  // ---------------------------------------------------------------------------
  it('11. measures advance width for mixed Punjabi and English code-switching strings', () => {
    const provider = new FontMetricsProvider({
      measureFn: (text) => text.length * 6.5,
    });

    const mixed = 'Doctor ਨੇ ਕਿਹਾ ਕਿ Scene 4 ਬਹੁਤ Emotional ਹੈ';
    const width = provider.measureWidth(mixed, 12);
    expect(width).toBeGreaterThan(0);
    expect(Number.isFinite(width)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 12. Empty String Handling
  // ---------------------------------------------------------------------------
  it('12. returns exactly 0 width for empty strings without invoking canvas', () => {
    const spy = vi.fn();
    const provider = new FontMetricsProvider({
      measureFn: spy,
    });

    const width = provider.measureWidth('');
    expect(width).toBe(0);
    expect(spy).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // 13. Invalid Font Size Handling
  // ---------------------------------------------------------------------------
  it('13. rejects invalid or non-positive font sizes with clear errors', () => {
    const provider = new FontMetricsProvider({
      measureFn: () => 10,
    });

    expect(() => provider.measureWidth('ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ', 0)).toThrow('invalid fontSizePt');
    expect(() => provider.measureWidth('ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ', -12)).toThrow('invalid fontSizePt');
    expect(() => provider.measureWidth('ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ', NaN)).toThrow('invalid fontSizePt');
    expect(() => provider.getLineBoxMetrics(0)).toThrow('invalid fontSizePt');
  });

  // ---------------------------------------------------------------------------
  // 14. Missing Canvas Context Handling
  // ---------------------------------------------------------------------------
  it('14. throws a descriptive error when no canvas context or measureFn is available', () => {
    const provider = new FontMetricsProvider({
      canvasContext: undefined,
      measureFn: undefined,
    });

    // When running in headless environment without DOM document.createElement
    expect(() => {
      // In Node environment, createElement is undefined unless JSDOM is attached
      if (typeof document === 'undefined') {
        provider.measureWidth('ਟੈਸਟ');
      } else {
        // If JSDOM is present, temporarily mock getContext to return null
        const origCreate = document.createElement;
        try {
          document.createElement = vi.fn(() => ({
            getContext: () => null,
          })) as any;
          provider.measureWidth('ਟੈਸਟ');
        } finally {
          document.createElement = origCreate;
        }
      }
    }).toThrow('Canvas 2D context unavailable');
  });

  // ---------------------------------------------------------------------------
  // 15. Missing actualBoundingBox Metrics Handling
  // ---------------------------------------------------------------------------
  it('15. gracefully falls back when actualBoundingBox metrics are not provided by canvas', () => {
    const mockCtx = {
      font: '',
      measureText: vi.fn(() => ({
        width: 40,
        // actualBoundingBox properties omitted
      })),
    } as unknown as CanvasRenderingContext2D;

    const provider = new FontMetricsProvider({
      canvasContext: mockCtx,
    });

    const metrics = provider.getLineBoxMetrics(12);
    expect(metrics.fontSizePt).toBe(12);
    expect(metrics.ascentPt).toBeGreaterThan(0);
    expect(metrics.descentPt).toBeGreaterThan(0);
    expect(metrics.lineBoxHeightPt).toBe(metrics.ascentPt + metrics.descentPt);
    expect(metrics.actualAscentPt).toBeUndefined();
    expect(metrics.actualDescentPt).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // 16. Finite Number Invariance
  // ---------------------------------------------------------------------------
  it('16. strictly guarantees that successful measurements never return NaN or Infinity', () => {
    const provider = new FontMetricsProvider({
      measureFn: (text) => text.length * 8.1234,
    });

    const testStrings = [
      ' ',
      'ਕ',
      'ਕ੍ਰਿੱਪਾ',
      'ਉੱਲੂ',
      '12345',
      'Ext. Amritsar - Night',
      'ੴਸਤਿਗੁਰਪ੍ਰਸਾਦਿ॥',
      'A very long screenplay paragraph containing multiple sentences that spans several lines of dialogue.',
    ];

    for (const str of testStrings) {
      const w = provider.measureWidth(str, 12);
      expect(Number.isFinite(w)).toBe(true);
      expect(Number.isNaN(w)).toBe(false);
      expect(w).toBeGreaterThanOrEqual(0);
    }
  });

  // ---------------------------------------------------------------------------
  // 17. Real Electron Chromium Smoke Test with Actual Production Font Asset
  // ---------------------------------------------------------------------------
  it('17. verifies real Chromium font measurement against actual production TrueType asset', () => {
    const runnerPath = path.resolve(__dirname, 'font-metrics-smoke.cjs');
    const stdout = execFileSync(
      path.resolve(process.cwd(), 'node_modules/.bin/electron'),
      [runnerPath],
      { encoding: 'utf8' }
    );

    const match = stdout.match(/M1A_SMOKE:([\s\S]*?)END_M1A_SMOKE/);
    expect(match).not.toBeNull();
    const result = JSON.parse(match![1].trim());

    expect(result.loaded).toBe(true);
    expect(result.width1Pt).toBeGreaterThan(15);
    expect(result.width2Pt).toBeGreaterThan(15);
    expect(result.hasAscent).toBe(true);
  });
});
