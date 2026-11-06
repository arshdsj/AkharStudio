/**
 * m2c-pdf-export.spike.ts - Vitest Spike for Real Electron Chromium PDF Export Integration
 * Governing Context: AKHAR-ARCH-PAG — Milestone M2C
 *
 * Executes real Electron runtime to measure and verify:
 * 1. Physical PDF page dimensions in Electron Chromium printToPDF (Letter: 612x792pt, A4: 595x842pt).
 * 2. Exact page count agreement between unified layout engine and generated PDF.
 * 3. Zero trailing blank pages.
 * 4. Noto Sans Gurmukhi complex conjunct and matra rendering in PDF.
 * 5. First-page header suppression and page 2+ running header placement.
 * 6. (MORE) and (CONT'D) continuation label presentation and suppression under contdSetting: 'off'.
 * 7. Verification of discrete .page-sheet architecture.
 */

import { describe, it, expect } from 'vitest';
import path from 'path';
import { execFileSync } from 'child_process';

describe('Milestone M2C: Real Electron Chromium PDF Export Spike', () => {
  it('generates exact Letter (612x792pt) and A4 (595x842pt) PDFs with zero blank pages and verified Gurmukhi text', () => {
    const runnerPath = path.resolve(__dirname, 'runners/m2c-pdf-runner.cjs');
    const electronBin = path.resolve(process.cwd(), 'node_modules/.bin/electron');

    const stdout = execFileSync(electronBin, [runnerPath], {
      encoding: 'utf8',
      env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' },
    });

    const match = stdout.match(/M2C_PDF_RESULTS:([\s\S]*?)END_M2C_PDF_RESULTS/);
    expect(match).not.toBeNull();
    const results = JSON.parse(match![1].trim());

    // 1. Font Decoder Status
    expect(results.fontLoaded).toBe(true);

    // 2. US Letter Verification (with Title Page + contdSetting='on')
    expect(results.letter.pageCount).toBe(3);
    expect(results.letter.exact3Pages).toBe(true);
    expect(results.letter.matchesPhysicalDimensions).toBe(true);
    expect(results.letter.zeroTrailingBlankPages).toBe(true);

    for (const size of results.letter.pageSizes) {
      expect(size.widthPt).toBe(612);
      expect(size.heightPt).toBe(792);
    }

    expect(results.letter.containsTitle).toBe(true);
    expect(results.letter.containsAuthor).toBe(true);
    expect(results.letter.containsSceneHeading).toBe(true);
    expect(results.letter.containsComplexGurmukhi).toBe(true);
    expect(results.letter.containsMore).toBe(true);
    expect(results.letter.containsContd).toBe(true);
    expect(results.letter.containsPageNumber2).toBe(true);

    // 3. ISO A4 Verification (without Title Page + contdSetting='off')
    expect(results.a4.pageCount).toBe(2);
    expect(results.a4.exact2Pages).toBe(true);
    expect(results.a4.matchesPhysicalDimensions).toBe(true);
    expect(results.a4.zeroTrailingBlankPages).toBe(true);

    for (const size of results.a4.pageSizes) {
      expect(Math.abs(size.widthPt - 595.28)).toBeLessThanOrEqual(1.0);
      expect(Math.abs(size.heightPt - 841.89)).toBeLessThanOrEqual(1.0);
    }

    expect(results.a4.containsSceneHeading).toBe(true);
    expect(results.a4.containsMore).toBe(true);
    expect(results.a4.contdSuppressed).toBe(true);
    expect(results.a4.containsPageNumber2).toBe(true);
  });
});
