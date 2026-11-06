/**
 * m2d-editor-workflow.spike.ts - Vitest Spike for Milestone M2D Real Editor Workflow Integration
 * Governing Context: AKHAR-ARCH-PAG — Milestone M2D
 *
 * Executes real Electron runtime to verify:
 * 1. Live mounted ProseMirror EditorView with unified pagination plugin.
 * 2. Punjabi transliteration and typing across virtual page boundaries.
 * 3. Text selection spanning across page boundaries (0 synthetic text in selection).
 * 4. Caret navigation without repagination (invalidation guard).
 * 5. Undo and redo history preserving exact canonical screenplay text.
 * 6. Dynamic reflow on paperSize (Letter vs A4) and block insertions.
 * 7. 100% parity between Editor PaginationResult and Chromium printToPDF.
 * 8. Generation and preservation of real visual screenshot evidence.
 */

import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';
import { execFileSync } from 'child_process';

describe('Milestone M2D: Real Electron Editor Workflow Spike', () => {
  it('executes real editor text editing, transliteration, caret traversal, undo/redo, and PDF parity in Electron', () => {
    const runnerPath = path.resolve(__dirname, 'runners/m2d-editor-workflow-runner.cjs');
    const electronBin = path.resolve(process.cwd(), 'node_modules/.bin/electron');

    const stdout = execFileSync(electronBin, [runnerPath], {
      encoding: 'utf8',
      env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' },
    });

    const match = stdout.match(/M2D_WORKFLOW_RESULTS:([\s\S]*?)END_M2D_WORKFLOW_RESULTS/);
    expect(match).not.toBeNull();
    const results = JSON.parse(match![1].trim());

    // 1. Production Font Readiness
    expect(results.fontReady).toBe(true);

    // 2. Initial Document Pagination
    expect(results.initialPageCount).toBe(2);
    expect(results.recalcCountInitial).toBe(1);

    // 3. Punjabi Transliteration & Typing
    expect(results.transliterationCommitted).toBe(true);

    // 4. Selection Cleanliness (0 synthetic content)
    expect(results.selectionSpanningClean).toBe(true);

    // 5. Invalidation Performance Guard
    expect(results.cursorMoveNoRepaginate).toBe(true);

    // 6. Block Insertion & Dynamic Reflow
    expect(results.blockInserted).toBe(true);

    // 7. Undo & Redo History Integrity
    expect(results.undoRestoredExactText).toBe(true);
    expect(results.redoRestoredModifiedText).toBe(true);

    // 8. Dynamic Paper Size Reflow
    expect(results.paperSizeA4Reflowed).toBe(true);

    // 9. Editor vs PDF Exporter Parity
    expect(results.pdfParityVerified).toBe(true);
    expect(results.finalPageCount).toBe(2);

    // 10. Screenshot Evidence Verification
    const spikesDir = path.resolve(process.cwd(), 'test/spikes');
    const p1Png = path.join(spikesDir, 'audit-m2d-editor-page1.png');
    const p2Png = path.join(spikesDir, 'audit-m2d-editor-page2.png');

    expect(fs.existsSync(p1Png)).toBe(true);
    expect(fs.statSync(p1Png).size).toBeGreaterThan(20000);

    expect(fs.existsSync(p2Png)).toBe(true);
    expect(fs.statSync(p2Png).size).toBeGreaterThan(20000);
  });
});
