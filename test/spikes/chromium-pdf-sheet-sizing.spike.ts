/**
 * SPIKE 4: Chromium PDF Sheet Sizing & Margin Invariance
 * File: test/spikes/chromium-pdf-sheet-sizing.spike.ts
 *
 * Objectives:
 * 1. Verify physical page dimensions in Electron Chromium printToPDF (Letter: 612x792pt, A4: 595x842pt).
 * 2. Verify exact page count (5-page test screenplay generates exactly 5 PDF pages).
 * 3. Verify zero trailing blank pages.
 * 4. Verify margin isolation (zero margin bleed, marginType: 'none' delegates geometry to CSS).
 * 5. Validate PDF structure using @cantoo/pdf-lib.
 */

import { describe, it, expect } from 'vitest';
import path from 'path';
import { execFileSync } from 'child_process';

describe('SPIKE 4: Chromium PDF Sheet Sizing & Margin Invariance', () => {
  it('generates exact 5-page Letter and A4 PDFs with verified physical geometry and 0 blank pages', () => {
    const runnerPath = path.resolve(__dirname, 'runners/spike4-runner.cjs');
    const stdout = execFileSync(
      path.resolve(process.cwd(), 'node_modules/.bin/electron'),
      [runnerPath],
      {
        encoding: 'utf8',
        env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' },
      }
    );

    const match = stdout.match(/SPIKE4_RESULTS:([\s\S]*?)END_SPIKE4_RESULTS/);
    expect(match).not.toBeNull();
    const results = JSON.parse(match![1].trim());

    // 1. US Letter Verification
    expect(results.letter.pageCount).toBe(5);
    expect(results.letter.exact5Pages).toBe(true);
    expect(results.letter.zeroTrailingBlankPages).toBe(true);
    expect(results.letter.matchesPhysicalDimensions).toBe(true);

    for (const page of results.letter.pageSizes) {
      expect(page.widthPt).toBe(612);
      expect(page.heightPt).toBe(792);
    }

    // 2. A4 Verification
    expect(results.a4.pageCount).toBe(5);
    expect(results.a4.exact5Pages).toBe(true);
    expect(results.a4.zeroTrailingBlankPages).toBe(true);
    expect(results.a4.matchesPhysicalDimensions).toBe(true);

    for (const page of results.a4.pageSizes) {
      expect(Math.abs(page.widthPt - 595.28)).toBeLessThanOrEqual(1.0);
      expect(Math.abs(page.heightPt - 841.89)).toBeLessThanOrEqual(1.0);
    }
  });
});
