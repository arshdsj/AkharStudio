/**
 * m2b1-rendering.spike.ts - Vitest Spike for Real Electron Chromium Visual Geometry & Rendering
 * Governing Context: AKHAR-ARCH-PAG — Milestone M2B.1
 *
 * Executes real Electron runtime to measure:
 * 1. Letter (816px) & A4 (794px) physical sheet dimensions and margins.
 * 2. 18.0pt baseline pitch (24.0px line height).
 * 3. 36px page gap and running header ('2.') placement.
 * 4. Mid-block full-width break breakout inside dialogue (816px breakout, zero clipping).
 * 5. (MORE) centered and CHARACTER (CONT'D) aligned with character cues (542px === 542px).
 * 6. Gurmukhi ink clearance across consecutive lines.
 * 7. Zero horizontal overflow (scrollWidth === clientWidth).
 */

import { describe, it, expect } from 'vitest';
import path from 'path';
import { execFileSync } from 'child_process';

describe('Milestone M2B.1: Real Electron Chromium Visual Rendering & Geometry', () => {
  it('measures exact physical sheet dimensions, baselines, breakouts, and ink clearance in Chromium', () => {
    const runnerPath = path.resolve(__dirname, 'runners/m2b1-rendering-runner.cjs');
    const electronBin = path.resolve(process.cwd(), 'node_modules/.bin/electron');

    const stdout = execFileSync(electronBin, [runnerPath], {
      encoding: 'utf8',
      env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' },
    });

    const match = stdout.match(/M2B1_RENDER_RESULTS:([\s\S]*?)END_M2B1_RENDER_RESULTS/);
    expect(match).not.toBeNull();
    const results = JSON.parse(match![1].trim());

    // 1. Font Identity & Readiness
    expect(results.fontReady).toBe(true);

    // 2. Physical Sheet Dimensions & Margins
    expect(results.letter.matchesLetterWidth).toBe(true);
    expect(results.letter.widthPx).toBe(816);
    expect(results.letter.marginsAccurate).toBe(true);
    expect(results.letter.paddingLeftPx).toBe(144);
    expect(results.letter.paddingRightPx).toBe(96);

    expect(results.a4.matchesA4Width).toBe(true);
    expect(results.a4.widthPx).toBe(794);
    expect(results.a4.marginsAccurate).toBe(true);

    // 3. 18.0pt Baseline Pitch
    expect(results.baselinePitch.pitchExact).toBe(true);
    expect(results.baselinePitch.measuredPitchPx).toBe(24);

    // 4. Page Break Gap & Sheet Representation
    expect(results.gap.gapHeightPx).toBe(36);
    expect(results.gap.isPage2Numbered).toBe(true);
    expect(results.gap.headerText).toBe('2.');

    // 5. Mid-Block Breakout inside Dialogue
    expect(results.midBlockBreak.leftAlignedToPaper).toBe(true);
    expect(results.midBlockBreak.rightAlignedToPaper).toBe(true);
    expect(results.midBlockBreak.fullWidthBreakoutVerified).toBe(true);
    expect(results.midBlockBreak.breakWidthPx).toBe(816);

    // 6. Presentation (MORE) & CHARACTER (CONT'D) Alignment
    expect(results.moreBadge.isCentered).toBe(true);
    expect(results.contdBadge.alignedWithCharacterCue).toBe(true);
    expect(results.contdBadge.contdLeftPx).toBe(results.contdBadge.charCueLeftPx);

    // 7. Horizontal Overflow Safety
    expect(results.overflow.zeroHorizontalOverflow).toBe(true);
    expect(results.overflow.hasHorizontalScrollbar).toBe(false);

    // 8. Gurmukhi Ink Clearance
    expect(results.inkClearance.noCollisionsDetected).toBe(true);
  });
});
