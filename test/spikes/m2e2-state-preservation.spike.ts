/**
 * m2e2-state-preservation.spike.ts - Vitest Spike for Milestone M2E.2 Real Electron Workflow
 * Governing Context: AKHAR-ARCH-PAG — Milestone M2E.2
 *
 * Executes real Electron runtime to verify:
 * 1. Live mounted ProseMirror EditorView with mode switching via state.reconfigure.
 * 2. Type text -> Switch mode -> Undo -> Redo.
 * 3. Type Punjabi transliteration candidate into screenplay.
 * 4. Switch mode again (Unified -> Legacy) -> Verify undo/redo intact.
 * 5. Real Chromium printToPDF generation with Courier Prime and Noto Sans Gurmukhi.
 * 6. Capture real visual PNG evidence of editor workflow.
 */

import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';
import { execFileSync } from 'child_process';

describe('Milestone M2E.2: Real Electron Editor State Preservation Spike', () => {
  it('executes real editor text editing, mode switching, undo, redo, transliteration, and PDF export in Electron', () => {
    const runnerPath = path.resolve(__dirname, 'runners/m2e2-state-preservation-runner.cjs');
    const electronBin = path.resolve(process.cwd(), 'node_modules/.bin/electron');

    const stdout = execFileSync(electronBin, [runnerPath], {
      encoding: 'utf8',
      env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' },
    });

    const match = stdout.match(/M2E2_WORKFLOW_RESULTS:([\s\S]*?)END_M2E2_WORKFLOW_RESULTS/);
    expect(match).not.toBeNull();
    const results = JSON.parse(match![1].trim());

    // 1. Font Readiness
    expect(results.fontReady).toBe(true);
    expect(results.initialMode).toBe('legacy');

    // 2. Typing text before mode switch
    expect(results.textInserted).toBe(true);

    // 3. Mode switch: Legacy -> Unified via state.reconfigure
    expect(results.modeSwitchedToUnified).toBe(true);

    // 4. Undo and Redo in reconfigured Unified state
    expect(results.undoWorkedInUnified).toBe(true);
    expect(results.redoWorkedInUnified).toBe(true);

    // 5. Punjabi transliteration candidate commitment
    expect(results.punjabiTransliterationCommitted).toBe(true);

    // 6. Mode switch: Unified -> Legacy via state.reconfigure
    expect(results.modeSwitchedBackToLegacy).toBe(true);

    // 7. Complete undo history preservation across all switches
    expect(results.historyPreservedAcrossAllSwitches).toBe(true);

    // 8. Real Chromium printToPDF export validation
    expect(results.pdfGeneratedSuccessfully).toBe(true);
    expect(results.pdfPageCount).toBeGreaterThan(0);

    // 9. Visual screenshot verification
    const spikesDir = path.resolve(process.cwd(), 'test/spikes');
    const screenshotPng = path.join(spikesDir, 'audit-m2e2-editor-workflow.png');
    expect(fs.existsSync(screenshotPng)).toBe(true);
    expect(fs.statSync(screenshotPng).size).toBeGreaterThan(20000);
  });
});
