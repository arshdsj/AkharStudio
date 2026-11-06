/**
 * m2f-stage3.spike.ts
 *
 * Vitest Spike for Milestone M2F — Stage 3 Final Electron Visual & PDF Verification
 *
 * Executes real Electron runtime to verify:
 * 1. Physical PDF generation via Chromium printToPDF for Letter and A4.
 * 2. Distinction between HTML generation duration vs complete Chromium printToPDF duration.
 * 3. Exact 1:1 page count parity between Editor and generated PDF binary.
 * 4. Zero trailing blank pages in PDF binary.
 * 5. Font readiness in Chromium before PDF generation.
 * 6. Screenshot capture for final visual audit evidence.
 */

import { describe, it, expect } from 'vitest';
import path from 'path';
import { execFileSync } from 'child_process';

describe('Milestone M2F — Stage 3: Real Electron Visual & PDF Export Verification', () => {
  it('generates certified Letter and A4 PDFs with 100% editor parity and captures visual evidence', () => {
    const runnerPath = path.resolve(__dirname, 'runners/m2f-stage3-runner.cjs');
    const electronBin = path.resolve(process.cwd(), 'node_modules/.bin/electron');

    const stdout = execFileSync(electronBin, [runnerPath], {
      encoding: 'utf8',
      env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' },
      timeout: 60000,
    });

    const match = stdout.match(/M2F_STAGE3_RESULTS:([\s\S]*?)END_M2F_STAGE3_RESULTS/);
    expect(match).not.toBeNull();
    const results = JSON.parse(match![1].trim());

    // 1. Font Readiness in Chromium
    expect(results.fontReady).toBe(true);

    // 2. Editor Page Count & Targets
    expect(results.editorPageCount).toBeGreaterThanOrEqual(3);
    expect(results.targetsCount).toBe(results.editorPageCount - 1);

    // 3. US Letter PDF Verification (with Title Page)
    expect(results.letter.pageCountParity).toBe(true);
    expect(results.letter.pageCount).toBe(results.editorPageCount + 1);
    expect(results.letter.allPagesMatchDimensions).toBe(true);
    for (const size of results.letter.pageSizes) {
      expect(size.widthPt).toBe(612);
      expect(size.heightPt).toBe(792);
    }
    // Verify timing metrics
    expect(results.letter.htmlDurationMs).toBeGreaterThan(0);
    expect(results.letter.printToPdfDurationMs).toBeGreaterThan(0);
    expect(results.letter.totalExportTimeMs).toBeGreaterThan(results.letter.htmlDurationMs);

    // 4. ISO A4 PDF Verification (without Title Page)
    expect(results.a4.pageCountParity).toBe(true);
    expect(results.a4.pageCount).toBe(results.editorPageCount);
    expect(results.a4.allPagesMatchDimensions).toBe(true);
    for (const size of results.a4.pageSizes) {
      expect(Math.abs(size.widthPt - 595.28)).toBeLessThanOrEqual(1.0);
      expect(Math.abs(size.heightPt - 841.89)).toBeLessThanOrEqual(1.0);
    }
    // Verify timing metrics
    expect(results.a4.htmlDurationMs).toBeGreaterThan(0);
    expect(results.a4.printToPdfDurationMs).toBeGreaterThan(0);
    expect(results.a4.totalExportTimeMs).toBeGreaterThan(results.a4.htmlDurationMs);

    // 5. Visual Screenshot
    expect(results.screenshotCaptured).toBe(true);
  });
});
