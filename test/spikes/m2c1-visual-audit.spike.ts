/**
 * m2c1-visual-audit.spike.ts - Vitest Spike for Milestone M2C.1 Visual Quality Audit
 * Governing Context: AKHAR-ARCH-PAG — Milestone M2C.1
 *
 * Executes real Electron runtime to verify:
 * 1. A4 physical dimensions within established tolerance (+-1.0pt / +-0.35mm).
 * 2. Letter physical dimensions (612.0 x 792.0pt).
 * 3. 18.0pt (24px) baseline pitch and ink clearance across Punjabi text.
 * 4. Screenplay margins and element alignment (Character 2.2in, CONT'D 2.2in, Dialogue 1.0in, Parenthetical 1.6in).
 * 5. (MORE) marker centered within dialogue column.
 * 6. Anti-orphan rule: Scene Heading pushed to page 2 when insufficient follow slots remain.
 * 7. Unicode text extraction & rendering of Gurmukhi conjuncts, Siari/Bihari, and bilingual English.
 * 8. Zero trailing blank pages or accidental page spillovers.
 * 9. Generation and preservation of real PNG visual screenshot evidence.
 */

import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';
import { execFileSync } from 'child_process';

describe('Milestone M2C.1: Final PDF Quality & Visual Audit Spike', () => {
  it('passes comprehensive visual layout, typography, anti-orphan, and physical dimension checks in real Electron runtime', () => {
    const runnerPath = path.resolve(__dirname, 'runners/m2c1-visual-audit-runner.cjs');
    const electronBin = path.resolve(process.cwd(), 'node_modules/.bin/electron');

    const stdout = execFileSync(electronBin, [runnerPath], {
      encoding: 'utf8',
      env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' },
    });

    const match = stdout.match(/M2C1_AUDIT_RESULTS:([\s\S]*?)END_M2C1_AUDIT_RESULTS/);
    expect(match).not.toBeNull();
    const results = JSON.parse(match![1].trim());

    // 1. Font Decoder Status
    expect(results.fontLoaded).toBe(true);

    // 2. DOM Visual Layout & Geometry Measurements
    const dom = results.domLetterMeasurements;
    expect(dom.sheetWidthPx).toBe(816);
    expect(dom.sheetHeightPx).toBe(1056);
    expect(dom.sheetDimensionsExact).toBe(true);
    expect(dom.strict18ptPitchVerified).toBe(true);
    for (const h of dom.lineHeights) {
      expect(h).toBe(24);
    }
    for (const p of dom.pitchesPx) {
      expect(p).toBe(24);
    }

    // Element Alignment & Indentation
    expect(dom.characterCueLeftIn).toBe(2.2);
    expect(dom.contdMarkerLeftIn).toBe(2.2);
    expect(dom.characterAndContdAligned).toBe(true);
    expect(dom.parentheticalLeftIn).toBe(1.6);
    expect(dom.parentheticalWidthIn).toBe(3.0);
    expect(dom.dialogueLeftIn).toBe(1.0);
    expect(dom.dialogueWidthIn).toBe(3.5);
    expect(dom.moreLeftIn).toBe(1.0);
    expect(dom.moreWidthIn).toBe(3.5);
    expect(dom.moreInsideDialogueBounds).toBe(true);

    // Anti-Orphan Rule & Running Header
    expect(dom.sh2Page).toBe(2);
    expect(dom.antiOrphanRuleActive).toBe(true);
    expect(dom.headerTopFromSheetPt).toBe(36);
    expect(dom.headerPlacementVerified).toBe(true);
    expect(dom.page1ZeroOverflow).toBe(true);
    expect(dom.page2ZeroOverflow).toBe(true);

    // 3. US Letter PDF Metrics
    const letter = results.pdfLetterMetrics;
    expect(letter.pageCount).toBe(2);
    expect(letter.exact2Pages).toBe(true);
    expect(letter.dimensionsExact).toBe(true);
    expect(letter.zeroTrailingBlankPages).toBe(true);

    for (const sz of letter.pageSizes) {
      expect(sz.widthPt).toBe(612.0);
      expect(sz.heightPt).toBe(792.0);
    }

    // Linguistic Edge Cases in PDF Stream
    expect(letter.hasConjunctKripa).toBe(true);
    expect(letter.hasConjunctGunjhal).toBe(true);
    expect(letter.hasConjunctSampuran).toBe(true);
    expect(letter.hasConjunctTrishna).toBe(true);
    expect(letter.hasConjunctSri).toBe(true);
    expect(letter.hasConjunctUllu).toBe(true);
    expect(letter.hasSiariItihasik).toBe(true);
    expect(letter.hasSiariVidyarthi).toBe(true);
    expect(letter.hasBihariDiwali).toBe(true);
    expect(letter.hasMukaddama).toBe(true);
    expect(letter.hasKavita).toBe(true);
    expect(letter.hasGambhirta).toBe(true);
    expect(letter.hasMixedBilingualOffice).toBe(true);
    expect(letter.hasMoreMarker).toBe(true);
    expect(letter.hasContdMarker).toBe(true);
    expect(letter.hasRunningHeader2).toBe(true);
    expect(letter.hasAntiOrphanSceneHeading2).toBe(true);

    // 4. ISO A4 PDF Metrics
    const a4 = results.pdfA4Metrics;
    expect(a4.pageCount).toBe(2);
    expect(a4.exact2Pages).toBe(true);
    expect(a4.matchesA4DimensionsWithinTolerance).toBe(true);
    expect(a4.zeroTrailingBlankPages).toBe(true);

    for (const sz of a4.pageSizes) {
      expect(Math.abs(sz.widthPt - 595.28)).toBeLessThanOrEqual(1.0);
      expect(Math.abs(sz.heightPt - 841.89)).toBeLessThanOrEqual(1.0);
    }

    expect(a4.hasSceneHeading1).toBe(true);
    expect(a4.hasConjuncts).toBe(true);
    expect(a4.hasMoreMarker).toBe(true);
    expect(a4.hasContdMarker).toBe(true);
    expect(a4.hasRunningHeader2).toBe(true);
    expect(a4.hasAntiOrphanSceneHeading2).toBe(true);

    // 5. Visual PNG Artifacts
    const spikesDir = path.resolve(process.cwd(), 'test/spikes');
    const p1Png = path.join(spikesDir, 'audit-letter-page1.png');
    const p2Png = path.join(spikesDir, 'audit-letter-page2.png');
    expect(fs.existsSync(p1Png)).toBe(true);
    expect(fs.statSync(p1Png).size).toBeGreaterThan(10000);
    expect(fs.existsSync(p2Png)).toBe(true);
    expect(fs.statSync(p2Png).size).toBeGreaterThan(10000);
  });
});
