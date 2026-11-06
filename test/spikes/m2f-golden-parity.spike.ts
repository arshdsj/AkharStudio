/**
 * m2f-golden-parity.spike.ts
 *
 * Vitest Spike for Milestone M2F — Stage 1: Golden Script Parity Audit
 *
 * Executes real Electron runtime to verify:
 * 1. Physical page dimensions & printable-area boundaries (Letter 816x1056px).
 * 2. Strict 18.0pt (24px) baseline pitch and line heights across both Editor and PDF.
 * 3. 100% parity between ProseMirror Editor and Chromium PDF page counts and splits.
 * 4. Alignment of Character cues and (CONT'D) continuation badges.
 * 5. (MORE) and (CONT'D) badge presence on identical pages in Editor and PDF.
 * 6. Zero clipping, overlapping, or horizontal/vertical overflow across all pages.
 * 7. Real screenshot capture of Page 1 and Page 2 for visual audit.
 */

import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';
import { execFileSync } from 'child_process';

describe('Milestone M2F — Stage 1: Golden Script Parity Spike in Real Electron', () => {
  it('passes comprehensive visual layout, baseline pitch, and editor/PDF parity in real Electron runtime', () => {
    const runnerPath = path.resolve(__dirname, 'runners/m2f-golden-parity-runner.cjs');
    const electronBin = path.resolve(process.cwd(), 'node_modules/.bin/electron');

    const stdout = execFileSync(electronBin, [runnerPath], {
      encoding: 'utf8',
      env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' },
      timeout: 30000,
    });

    const match = stdout.match(/M2F_PARITY_RESULTS:([\s\S]*?)END_M2F_PARITY_RESULTS/);
    expect(match).not.toBeNull();
    const results = JSON.parse(match![1].trim());

    // 1. Font Readiness in Chromium
    expect(results.fontReady).toBe(true);

    // 2. Editor vs PDF Page Counts & Break Parity
    expect(results.editorPageCount).toBeGreaterThanOrEqual(3);
    expect(results.pdfPageCount).toBe(results.editorPageCount);
    expect(results.pageCountsMatch).toBe(true);
    expect(results.targetsCount).toBe(results.editorPageCount - 1);

    // 3. Physical Geometry (US Letter: 8.5in x 11.0in @ 96 DPI = 816px x 1056px)
    expect(results.sheetWidthPx).toBe(816);
    expect(results.sheetHeightPx).toBe(1056);
    expect(results.sheetDimensionsExact).toBe(true);

    // 4. Margins & Padding (1.5in left = 144px, 1.0in others = 96px)
    expect(results.paddingLeftPx).toBe(144);
    expect(results.paddingRightPx).toBe(96);
    expect(results.paddingTopPx).toBe(96);
    expect(results.paddingBottomPx).toBe(96);
    expect(results.marginsExact).toBe(true);

    // 5. 18.0pt (24px) Strict Baseline Pitch
    expect(results.pitchExact).toBe(true);

    // 6. Continuation Badges & Anti-Orphan Breaks
    expect(results.targetsCount).toBe(results.editorPageCount - 1);
    if (results.moreCount > 0) {
      expect(results.contdCount).toBeGreaterThan(0);
      expect(results.charAndContdAligned).toBe(true);
    }

    // 7. Zero Out-of-Page Content, Zero Clipping, Zero Overflow
    expect(results.zeroOverflowAcrossAllPages).toBe(true);
    for (const check of results.sheetOverflowChecks) {
      expect(check.hasHorizOverflow).toBe(false);
      expect(check.hasVertOverflow).toBe(false);
    }

    // 8. Screenshot verification & copy to artifacts directory
    const screenshot1Src = path.resolve(__dirname, 'audit-m2f-golden-page1.png');
    const screenshot2Src = path.resolve(__dirname, 'audit-m2f-golden-page2.png');
    expect(fs.existsSync(screenshot1Src)).toBe(true);
    expect(fs.existsSync(screenshot2Src)).toBe(true);

    const artifactDir = '/Users/arshdsj/.gemini/antigravity/brain/ada636de-b786-41c8-99e2-f3134f3042ea';
    if (fs.existsSync(artifactDir)) {
      fs.copyFileSync(screenshot1Src, path.join(artifactDir, 'audit-m2f-golden-page1.png'));
      fs.copyFileSync(screenshot2Src, path.join(artifactDir, 'audit-m2f-golden-page2.png'));
    }
  });
});
